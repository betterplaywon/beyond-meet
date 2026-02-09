# 영상 데이팅 앱 만들기 #12 - 친구 시스템과 직접 통화 기능

> **이전 글 요약**: Part 11에서 Supabase Storage로 프로필 사진 업로드를 구현했다. Multer로 파일을 받아 메모리에서 바로 Supabase로 전송하고, Magic Number 검증으로 보안을 강화했다.

랜덤 매칭으로 좋은 대화를 나눈 사람을 다시 만나고 싶을 때가 있다. 그래서 **친구 추가 기능**이 필요했다. 친구를 추가하고, 친구에게 직접 영상 통화를 걸 수 있는 시스템을 구현하기로 했다.

---

## 친구 시스템 설계

### 단방향 vs 양방향 친구 관계

친구 시스템을 설계할 때 두 가지 방식을 고민했다.

1. **양방향 친구 관계** (Facebook 방식): 양쪽이 모두 동의해야 친구 관계 성립
2. **단방향 친구 관계** (Twitter 팔로우 방식): 한쪽이 추가하면 바로 친구 목록에 표시

Beyond Meet은 **단방향 친구 관계**를 선택했다. 영상 통화 후 바로 친구 추가하면 즉시 목록에 표시되고, 상대방의 수락을 기다릴 필요가 없다. 상대방도 나를 친구로 추가하면 자연스럽게 양방향 관계가 형성된다.

### 데이터베이스 스키마

Prisma 스키마에 `Friendship`과 `BlockList` 모델을 추가했다.

```prisma
// backend/prisma/schema.prisma
model Friendship {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  friendId  String   @map("friend_id")
  createdAt DateTime @default(now()) @map("created_at")

  user   User @relation("UserFriendships", fields: [userId], references: [id])
  friend User @relation("FriendOf", fields: [friendId], references: [id])

  @@unique([userId, friendId]) // 중복 친구 추가 방지
  @@index([userId, createdAt(sort: Desc)]) // 친구 목록 조회 최적화
  @@map("friendships")
}

model BlockList {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  blockedUserId String   @map("blocked_user_id")
  createdAt     DateTime @default(now()) @map("created_at")

  user        User @relation("BlockedBy", fields: [userId], references: [id])
  blockedUser User @relation("Blocking", fields: [blockedUserId], references: [id])

  @@unique([userId, blockedUserId]) // 중복 차단 방지
  @@map("block_list")
}
```

`@@unique([userId, friendId])` 제약 조건으로 같은 사람을 중복으로 친구 추가하는 것을 방지하고, `@@index([userId, createdAt(sort: Desc)])`로 친구 목록을 최근 추가순으로 조회할 때 빠른 검색이 가능하도록 했다.

---

## 백엔드 API 구현

### 친구 추가 (트랜잭션 사용)

친구 추가 시 여러 검증이 필요했다. 자기 자신을 친구로 추가하는지, 이미 친구인지, 차단된 사용자인지 확인해야 한다. 이 모든 검증을 **트랜잭션**으로 원자적으로 처리했다.

```typescript
// backend/src/controllers/friends-controller.ts
export const addFriend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.params;

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
            { userId, blockedUserId: friendId },
            { userId: friendId, blockedUserId: userId },
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

트랜잭션을 사용한 이유는 여러 DB 쿼리를 하나의 원자적 단위로 실행하고, 중간에 에러가 발생하면 모든 변경사항을 롤백하기 위해서다. 두 명이 동시에 같은 사람을 친구 추가하는 동시성 문제도 방지할 수 있다.

### 사용자 차단 (친구 관계 자동 삭제)

차단 기능도 트랜잭션으로 구현했다. 차단하면 **기존 친구 관계가 자동으로 삭제**되어야 한다.

```typescript
export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { blockedUserId } = req.params;

    // 트랜잭션으로 차단 생성 + 친구 관계 삭제를 원자적으로 처리
    await prisma.$transaction(async (tx) => {
      // 차단 추가
      await tx.blockList.create({
        data: { userId, blockedUserId },
      });

      // 양방향 친구 관계 모두 삭제
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

양방향 친구 관계를 모두 삭제하는 이유가 있다. 내가 친구로 추가한 관계와 상대방이 나를 친구로 추가한 관계 두 가지가 존재할 수 있기 때문이다. `deleteMany`로 한 번에 삭제해서 완전히 단절시킨다.

---

## React Native에서 친구 목록 구현

### React Query Hook

친구 목록을 React Query로 관리해서 자동 캐싱과 무효화를 구현했다.

```typescript
// mobile/src/hooks/useFriends.ts
export const useFriends = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.friends.list(userId || ''),
    queryFn: () => friendsApi.getFriends(),
    enabled: !!userId,
    select: data => data.friends,
  });
};

export const useAddFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ friendId }: { friendId: string }) =>
      friendsApi.addFriend(friendId),
    onSuccess: (_, variables) => {
      // 친구 목록 쿼리 무효화하여 재조회
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.list(variables.userId),
      });
    },
  });
};
```

React Query를 사용하면 자동 캐싱으로 한 번 조회한 친구 목록이 메모리에 저장되고, 친구 추가/삭제 후 `invalidateQueries`로 자동 재조회가 된다.

### 실시간 온라인 상태 동기화

친구 목록 화면에서 가장 중요한 기능은 **실시간 온라인 상태 표시**다. Socket.io로 친구의 온라인 상태를 실시간으로 받아와야 한다.

```typescript
// mobile/src/hooks/useFriendStatusSync.ts
export const useFriendStatusSync = (userId: string | undefined) => {
  const queryClient = useQueryClient();

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

전체 재조회 대신 **부분 업데이트**를 선택한 이유가 있다. 전체 재조회는 서버에 HTTP 요청을 보내야 해서 네트워크 비용이 발생한다. 반면 `setQueryData`로 Socket.io에서 받은 데이터만 캐시에 반영하면 즉시 UI가 업데이트된다.

---

## 직접 통화 요청 (DIRECT 매칭)

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

      // 수신자에게 통화 요청 알림
      receiverSocket.emit('call:incoming', {
        session: { id: session.id, channelName: session.channelName },
        caller: { id: userId, nickname: socket.userEmail },
      });

      // 발신자에게 요청 전송 완료 알림
      socket.emit('call:requested', {
        sessionId: session.id,
        receiverId,
      });
    } else {
      // RANDOM 매칭: 기존 랜덤 매칭 로직
    }
  } catch (error) {
    socket.emit('match:failed', {
      reason: '매칭 요청 처리 중 오류가 발생했습니다.',
    });
  }
});
```

`receiverId`가 있으면 특정 사용자에게 직접 요청하고, 없으면 대기열에 추가해서 랜덤 매칭을 진행한다.

---

## 겪었던 문제들

### 친구 온라인 상태가 업데이트되지 않음

Socket.io로 `friend:status-changed` 이벤트를 받았지만 UI가 업데이트되지 않는 문제가 있었다. 확인해보니 React Query 캐시 키가 정확히 일치하지 않았다. `userId`가 `undefined`인 경우 캐시 키가 달라지기 때문이었다.

```typescript
useSocketEvent('friend:status-changed', (data) => {
  if (!userId) return; // userId가 없으면 무시
  // ...
});
```

`userId` 체크를 추가해서 해결했다.

### 동시에 두 사람이 같은 사람을 친구 추가

Race condition으로 중복 친구 추가가 발생할 수 있었다. `findFirst` 체크와 `create` 사이에 시간차가 있기 때문이다.

트랜잭션으로 감싸도 완벽하지 않을 수 있어서, DB의 `@@unique` 제약 조건이 최종 방어선 역할을 하도록 했다.

### 차단 후 친구 관계가 남아있음

차단했는데 친구 목록에 여전히 표시되는 문제가 있었다. 원인은 단방향 친구 관계만 삭제하고 양방향을 삭제하지 않아서였다.

```typescript
await tx.friendship.deleteMany({
  where: {
    OR: [
      { userId, friendId: blockedUserId },
      { userId: blockedUserId, friendId: userId },
    ],
  },
});
```

`deleteMany`로 양방향 관계를 한 번에 삭제해서 해결했다.

---

## 다음 글 예고

**Part 13: 관리자 대시보드**

다음 글에서는 관리자 대시보드를 구현한다. 사용자 관리, 신고 처리, 통계 조회 기능을 다룰 예정이다.

---

## 마치며

친구 시스템과 직접 통화 기능을 구현하면서 몇 가지 배운 점이 있다.

트랜잭션으로 여러 DB 작업을 묶는 것의 중요성을 다시 느꼈다. 친구 추가나 차단처럼 여러 검증과 생성이 필요한 경우, 트랜잭션으로 원자성을 보장해야 한다.

React Query의 `setQueryData`로 Socket.io 이벤트를 캐시에 직접 반영하는 방식이 효과적이었다. 서버 요청 없이 즉시 UI가 업데이트되어 사용자 경험이 좋아졌다.

단방향 친구 관계를 선택한 것도 괜찮은 결정이었다. 영상 통화 후 바로 친구 추가가 가능해서 사용자 흐름이 자연스러웠다.

---

**태그**: `친구 시스템` `Socket.io` `React Query` `Prisma 트랜잭션` `실시간 상태`
