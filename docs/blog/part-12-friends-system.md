# Part 12: 친구 시스템 및 즐겨찾기 구현

## 1. 친구 시스템 설계

랜덤 매칭으로 좋은 대화를 나눈 사람을 다시 만나고 싶을 때가 있다. 그래서 **친구 추가 기능**이 필요했다. 검색해보니 친구 시스템을 설계할 때 두 가지 방식이 있었다:

1. **양방향 친구 관계** (Facebook 방식): 양쪽이 모두 동의해야 친구 관계 성립
2. **단방향 친구 관계** (Twitter 팔로우 방식): 한쪽이 추가하면 바로 친구 목록에 표시

Beyond Meet은 **단방향 친구 관계**를 선택했다. 이유는:
- 영상 통화 후 바로 친구 추가하면 즉시 목록에 표시
- 상대방의 수락을 기다릴 필요 없음
- 상대방도 나를 친구로 추가하면 자연스럽게 양방향 관계 형성

### 1.1 데이터베이스 스키마 설계

Prisma 스키마에 `Friendship`과 `BlockList` 모델을 추가했다.

```prisma
// backend/prisma/schema.prisma
model Friendship {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  friendId  String   @map("friend_id")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user   User @relation("UserFriendships", fields: [userId], references: [id])
  friend User @relation("FriendOf", fields: [friendId], references: [id])

  @@unique([userId, friendId]) // 중복 친구 추가 방지
  @@index([userId, createdAt(sort: Desc)]) // 친구 목록 조회 최적화
  @@index([friendId, userId]) // 역방향 조회 최적화
  @@map("friendships")
}

model BlockList {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  blockedUserId String   @map("blocked_user_id")
  createdAt     DateTime @default(now()) @map("created_at")

  // Relations
  user        User @relation("BlockedBy", fields: [userId], references: [id])
  blockedUser User @relation("Blocking", fields: [blockedUserId], references: [id])

  @@unique([userId, blockedUserId]) // 중복 차단 방지
  @@map("block_list")
}
```

**설계 포인트**:
- `@@unique([userId, friendId])`: 같은 사람을 중복으로 친구 추가하는 것 방지
- `@@index([userId, createdAt(sort: Desc)])`: 친구 목록을 최근 추가순으로 조회할 때 빠른 검색
- `@@index([friendId, userId])`: 역방향 조회 (누가 나를 친구로 추가했는지 찾을 때)

## 2. 백엔드 API 구현

### 2.1 친구 목록 조회

```typescript
// backend/src/controllers/friends-controller.ts
export const getFriends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    // 자신이 추가한 친구만 조회 (단방향)
    const friendships = await prisma.friendship.findMany({
      where: {
        userId: userId,
      },
      include: {
        friend: {
          select: {
            id: true,
            nickname: true,
            profilePhotos: true,
            onlineStatus: true, // 실시간 온라인 상태
            lastActive: true,
          },
        },
      },
    });

    // 친구 정보만 추출
    const friends = friendships.map((friendship) => friendship.friend);

    res.status(200).json({
      success: true,
      data: {
        friends: friends,
        total: friends.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

**왜 `onlineStatus`를 포함?**
- 친구 목록에서 현재 온라인인 친구를 바로 확인 가능
- Socket.io와 연동하여 실시간으로 업데이트 (뒤에서 설명)

### 2.2 친구 추가 (트랜잭션 사용)

친구 추가 시 여러 검증이 필요했다:
1. 자기 자신을 친구로 추가하는지 확인
2. 이미 친구인지 확인
3. 차단된 사용자인지 확인

이 모든 검증을 **트랜잭션**으로 원자적으로 처리했다.

```typescript
// backend/src/controllers/friends-controller.ts
export const addFriend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.params;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    if (userId === friendId) {
      throw new AppError(400, 'CANNOT_ADD_SELF', '자기 자신을 친구로 추가할 수 없습니다');
    }

    // 트랜잭션으로 모든 체크와 생성을 원자적으로 처리
    const friendship = await prisma.$transaction(async (tx) => {
      // 이미 친구인지 확인
      const existingFriendship = await tx.friendship.findFirst({
        where: { userId, friendId },
      });

      if (existingFriendship) {
        throw new AppError(400, 'ALREADY_FRIENDS', '이미 친구로 추가한 사용자입니다');
      }

      // 차단 여부 확인 (양방향)
      const isBlocked = await tx.blockList.findFirst({
        where: {
          OR: [
            { userId, blockedUserId: friendId }, // 내가 차단한 경우
            { userId: friendId, blockedUserId: userId }, // 상대방이 나를 차단한 경우
          ],
        },
      });

      if (isBlocked) {
        throw new AppError(403, 'USER_BLOCKED', '차단된 사용자입니다');
      }

      // 친구 추가
      return await tx.friendship.create({
        data: { userId, friendId },
        include: {
          friend: {
            select: {
              id: true,
              nickname: true,
              profilePhotos: true,
              onlineStatus: true,
            },
          },
        },
      });
    });

    res.status(201).json({
      success: true,
      data: friendship.friend,
    });
  } catch (error) {
    next(error);
  }
};
```

**트랜잭션을 사용한 이유**:
- 여러 DB 쿼리를 하나의 원자적 단위로 실행
- 중간에 에러 발생 시 모든 변경사항 롤백
- 동시성 문제 방지 (두 명이 동시에 같은 사람을 친구 추가하는 경우)

### 2.3 사용자 차단 (친구 관계 자동 삭제)

차단 기능도 트랜잭션으로 구현했다. 차단하면 **기존 친구 관계가 자동으로 삭제**되어야 한다.

```typescript
// backend/src/controllers/friends-controller.ts
export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { blockedUserId } = req.params;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    if (userId === blockedUserId) {
      throw new AppError(400, 'CANNOT_BLOCK_SELF', '자기 자신을 차단할 수 없습니다');
    }

    // 트랜잭션으로 차단 생성 + 친구 관계 삭제를 원자적으로 처리
    await prisma.$transaction(async (tx) => {
      // 이미 차단했는지 확인
      const existingBlock = await tx.blockList.findFirst({
        where: { userId, blockedUserId },
      });

      if (existingBlock) {
        throw new AppError(400, 'ALREADY_BLOCKED', '이미 차단한 사용자입니다');
      }

      // 차단 추가
      await tx.blockList.create({
        data: { userId, blockedUserId },
      });

      // 양방향 친구 관계 모두 삭제 (deleteMany로 한번에)
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId: blockedUserId },
            { userId: blockedUserId, friendId: userId },
          ],
        },
      });
    });

    res.status(201).json({
      success: true,
      data: { blocked: true },
    });
  } catch (error) {
    next(error);
  }
};
```

**양방향 친구 관계 삭제**:
- 내가 친구로 추가한 관계: `{ userId, friendId: blockedUserId }`
- 상대방이 나를 친구로 추가한 관계: `{ userId: blockedUserId, friendId: userId }`
- 두 관계 모두 삭제하여 완전히 단절

## 3. React Native에서 친구 목록 구현

### 3.1 React Query Hook

친구 목록을 React Query로 관리하여 자동 캐싱과 무효화를 구현했다.

```typescript
// mobile/src/hooks/useFriends.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as friendsApi from '../services/friendsApi';
import { queryKeys } from '../constants/queryKeys';

export const useFriends = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.friends.list(userId || ''),
    queryFn: () => friendsApi.getFriends(),
    enabled: !!userId, // userId가 있을 때만 실행
    select: data => data.friends, // friends 배열만 반환
  });
};

export const useAddFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, friendId }: { userId: string; friendId: string }) =>
      friendsApi.addFriend(friendId),
    onSuccess: (_, variables) => {
      // 친구 목록 쿼리 무효화하여 재조회
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.list(variables.userId),
      });
    },
  });
};

export const useRemoveFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, friendId }: { userId: string; friendId: string }) =>
      friendsApi.removeFriend(friendId),
    onSuccess: (_, variables) => {
      // 서버에서 최신 친구 목록을 다시 가져옴
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.list(variables.userId),
      });
    },
  });
};
```

**React Query의 장점**:
- 자동 캐싱: 한 번 조회한 친구 목록은 메모리에 캐시
- 자동 무효화: 친구 추가/삭제 후 `invalidateQueries`로 자동 재조회
- 로딩/에러 상태 자동 관리

### 3.2 친구 목록 화면 (실시간 온라인 상태)

친구 목록 화면에서 가장 중요한 기능은 **실시간 온라인 상태 표시**다. Socket.io로 친구의 온라인 상태를 실시간으로 받아온다.

```typescript
// mobile/src/screens/friends/FriendsScreen.tsx
import { useFriends, useRemoveFriend } from '../../hooks/useFriends';
import { useFriendStatusSync } from '../../hooks/useFriendStatusSync';
import { useSocket, useSocketEvent } from '../../hooks/useSocket';
import * as socketService from '../../services/socketService';

const FriendsScreen = () => {
  const { data: user } = useMyProfile();
  const socket = useSocket();
  const [callingFriendId, setCallingFriendId] = useState<string | null>(null);

  // React Query로 친구 목록 조회
  const { data: friends = [], isLoading, refetch } = useFriends(user?.id);

  // 친구 온라인 상태 실시간 동기화
  useFriendStatusSync(user?.id);

  // 통화가 수락됨 - VideoCall 화면으로 이동
  useSocketEvent('call:accepted', (data) => {
    setCallingFriendId(null);
    navigation.navigate('VideoCall', {
      sessionId: data.session.id,
      channelName: data.session.channelName,
      token: data.token,
      uid: data.uid,
    });
  });

  // 통화가 거절됨
  useSocketEvent('call:rejected', (data) => {
    setCallingFriendId(null);
    Toast.show({
      type: 'info',
      text1: '통화 거절',
      text2: '상대방이 통화를 거절했습니다.',
    });
  });

  const handleCallFriend = (friend: User) => {
    if (!socket.isConnected()) {
      Toast.show({
        type: 'error',
        text1: '연결 오류',
        text2: '서버와 연결되지 않았습니다.',
      });
      return;
    }

    setCallingFriendId(friend.id);
    socketService.requestDirectCall(friend.id);

    Toast.show({
      type: 'info',
      text1: '통화 요청',
      text2: `${friend.nickname}님에게 통화를 요청했습니다.`,
    });
  };

  const renderFriend = ({ item }: { item: User }) => {
    const isCalling = callingFriendId === item.id;
    const isDisabled = item.onlineStatus !== 'ONLINE' || isCalling;

    return (
      <View style={styles.friendCard}>
        <Avatar
          source={item.profilePhotos?.[0]}
          name={item.nickname}
          size="medium"
          online={item.onlineStatus === 'ONLINE'}
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.nickname}</Text>
          <View style={styles.friendStatusContainer}>
            <Icon
              name="circle"
              size={10}
              color={item.onlineStatus === 'ONLINE' ? colors.online : colors.textTertiary}
            />
            <Text style={styles.friendStatus}>
              {item.onlineStatus === 'ONLINE' ? '온라인' : '오프라인'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleCallFriend(item)}
          disabled={isDisabled}
        >
          {isCalling ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <Icon name="phone" size={24} color={colors.success} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <FlatList
      data={friends}
      keyExtractor={item => item.id}
      renderItem={renderFriend}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
    />
  );
};
```

### 3.3 실시간 친구 상태 동기화 Hook

친구의 온라인 상태가 바뀔 때마다 React Query 캐시를 업데이트하는 커스텀 Hook을 만들었다.

```typescript
// mobile/src/hooks/useFriendStatusSync.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from './useSocket';
import { queryKeys } from '../constants/queryKeys';

export const useFriendStatusSync = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  // Socket.io 이벤트: 친구 상태 변경
  useSocketEvent('friend:status-changed', (data: { userId: string; status: string }) => {
    if (!userId) return;

    // React Query 캐시에서 친구 목록을 찾아서 해당 친구의 상태만 업데이트
    queryClient.setQueryData(
      queryKeys.friends.list(userId),
      (oldData: any) => {
        if (!oldData?.friends) return oldData;

        return {
          ...oldData,
          friends: oldData.friends.map((friend: any) =>
            friend.id === data.userId
              ? { ...friend, onlineStatus: data.status }
              : friend
          ),
        };
      }
    );
  });
};
```

**왜 전체 재조회가 아닌 부분 업데이트?**
- 전체 재조회: 서버에 HTTP 요청 → 네트워크 비용 발생
- 부분 업데이트: Socket.io로 받은 데이터만 캐시에 반영 → 즉시 UI 업데이트

찾아봤더니 React Query의 `setQueryData`로 캐시를 직접 수정할 수 있었다. 이 방식이 **낙관적 업데이트(Optimistic Update)**보다 안전하다고 판단했다. Socket.io에서 받은 데이터는 서버가 이미 검증한 상태이기 때문이다.

## 4. 직접 통화 요청 (DIRECT 매칭)

친구 목록에서 특정 친구에게 직접 통화를 걸 수 있는 기능을 추가했다. 기존의 랜덤 매칭(`RANDOM`)과 구분하기 위해 `DIRECT` 매칭 타입을 만들었다.

```typescript
// backend/src/sockets/match-handler.ts
socket.on('match:request', async (data: { receiverId?: string }) => {
  try {
    const userId = socket.userId;
    const { receiverId } = data;

    if (receiverId) {
      // DIRECT 매칭: 특정 친구에게 통화 요청
      const receiverSocket = Array.from(io.sockets.sockets.values()).find(
        (s: any) => s.userId === receiverId
      );

      if (!receiverSocket) {
        socket.emit('match:failed', {
          reason: '상대방이 오프라인입니다.',
        });
        return;
      }

      // 매칭 세션 생성
      const session = await createMatchSession(userId, receiverId, 'DIRECT');

      // Agora 토큰 생성
      const { token, uid } = generateAgoraToken(session.channelName);

      // 수신자에게 통화 요청 알림
      receiverSocket.emit('call:incoming', {
        session: {
          id: session.id,
          channelName: session.channelName,
        },
        caller: {
          id: userId,
          nickname: socket.userEmail, // 실제로는 User 정보 조회
        },
      });

      // 발신자에게 요청 전송 완료 알림
      socket.emit('call:requested', {
        sessionId: session.id,
        receiverId,
      });
    } else {
      // RANDOM 매칭: 기존 랜덤 매칭 로직
      // ... (Part 8 참고)
    }
  } catch (error) {
    socket.emit('match:failed', {
      reason: '매칭 요청 처리 중 오류가 발생했습니다.',
    });
  }
});
```

**DIRECT vs RANDOM 매칭**:
- `DIRECT`: receiverId가 있으면 특정 사용자에게 직접 요청
- `RANDOM`: receiverId가 없으면 대기열에 추가하여 랜덤 매칭

## 5. 테스트 및 검증

### 5.1 친구 추가/삭제 흐름

1. **영상 통화 후 친구 추가**: VideoCallScreen에서 통화 종료 후 "친구 추가" 버튼 클릭
2. **친구 목록 확인**: FriendsScreen에서 추가된 친구 확인
3. **온라인 상태 실시간 업데이트**: 친구가 로그인하면 "온라인" 표시로 즉시 변경
4. **친구 삭제**: X 버튼 클릭 → 확인 모달 → 삭제 완료

### 5.2 직접 통화 요청 흐름

1. **친구 목록에서 전화 아이콘 클릭**: `socketService.requestDirectCall(friendId)` 호출
2. **서버에서 receiverId 확인**: 해당 친구가 온라인인지 확인
3. **친구에게 `call:incoming` 이벤트 전송**: 친구 화면에 통화 수락/거절 모달 표시
4. **친구가 수락**: `call:accepted` 이벤트 → 양쪽 모두 VideoCallScreen으로 이동
5. **친구가 거절**: `call:rejected` 이벤트 → Toast 메시지 표시

### 5.3 차단 기능 테스트

1. **사용자 A가 사용자 B를 차단**
2. **기존 친구 관계 자동 삭제**: A의 친구 목록에서 B 제거, B의 친구 목록에서도 A 제거
3. **B가 A에게 통화 요청 시도**: 서버에서 차단 확인 → `USER_BLOCKED` 에러 반환
4. **A가 B를 친구 추가 시도**: `USER_BLOCKED` 에러 반환

## 6. 트러블슈팅

### 6.1 친구 온라인 상태가 업데이트되지 않음

**문제**: Socket.io로 `friend:status-changed` 이벤트를 받았지만 UI가 업데이트되지 않음.

**원인**: React Query 캐시 키가 정확히 일치하지 않음. `queryKeys.friends.list(userId)`에서 `userId`가 `undefined`인 경우.

**해결**:
```typescript
// useFriendStatusSync Hook에서 userId 체크 추가
useSocketEvent('friend:status-changed', (data) => {
  if (!userId) return; // userId가 없으면 무시

  queryClient.setQueryData(
    queryKeys.friends.list(userId),
    // ...
  );
});
```

### 6.2 동시에 두 사람이 같은 사람을 친구 추가

**문제**: Race condition으로 중복 친구 추가 발생 가능.

**원인**: `findFirst` 체크와 `create` 사이에 시간차가 있음.

**해결**: Prisma 트랜잭션 + `@@unique` 제약 조건
```prisma
model Friendship {
  @@unique([userId, friendId]) // DB 레벨에서 중복 방지
}
```

트랜잭션으로 감싸도 DB의 unique 제약 조건이 최종 방어선 역할을 한다.

### 6.3 차단 후 친구 관계가 남아있음

**문제**: 차단했는데 친구 목록에 여전히 표시됨.

**원인**: 차단 시 단방향 친구 관계만 삭제하고 양방향을 삭제하지 않음.

**해결**:
```typescript
await tx.friendship.deleteMany({
  where: {
    OR: [
      { userId, friendId: blockedUserId }, // 내가 추가한 친구
      { userId: blockedUserId, friendId: userId }, // 상대방이 추가한 친구
    ],
  },
});
```

`deleteMany`로 양방향 관계를 한 번에 삭제하여 해결.

## 7. 정리

친구 시스템과 직접 통화 기능을 구현했다. 주요 구현 내용:

1. **단방향 친구 관계**: 한쪽이 추가하면 바로 친구 목록에 표시
2. **Prisma 트랜잭션**: 친구 추가/차단 시 여러 DB 작업을 원자적으로 처리
3. **실시간 온라인 상태**: Socket.io로 친구의 온라인/오프라인 상태를 실시간 업데이트
4. **React Query 캐시 업데이트**: `setQueryData`로 Socket.io 이벤트를 캐시에 직접 반영
5. **DIRECT 매칭**: 친구에게 직접 통화 요청 기능 (RANDOM 매칭과 분리)
6. **차단 기능**: 차단 시 양방향 친구 관계 자동 삭제

다음 Part에서는 **관리자 대시보드**를 구현해보겠다.
