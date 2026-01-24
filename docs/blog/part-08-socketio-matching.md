# Part 8: Socket.io 실시간 매칭 시스템 구축

Part 7까지 인증 시스템을 완성했다면, 이제 Beyond Meet의 핵심 기능인 **실시간 랜덤 매칭**을 구현할 차례다. 사용자가 "랜덤 매칭" 버튼을 누르면 실시간으로 다른 사용자와 연결되어 1:1 영상 통화가 시작되는 시스템을 만들었다.

## 💡 왜 HTTP가 아니라 Socket.io인가?

처음에는 매칭도 HTTP REST API로 구현하려고 했다. 예를 들어:

```
1. POST /api/match/request → 매칭 요청
2. GET /api/match/status → 매칭 상태 확인 (폴링)
3. GET /api/match/result → 매칭 결과 조회
```

하지만 "HTTP 폴링 vs WebSocket"으로 검색해보니, 실시간 통신에는 **WebSocket**이 훨씬 적합하다는 걸 알게 됐다.

### HTTP 폴링의 문제점

- **지연 시간**: 클라이언트가 1초마다 서버에 "매칭 됐어?"라고 물어봐야 한다
- **서버 부하**: 100명이 동시에 매칭 중이면 초당 100개 요청이 발생한다
- **비효율적**: 대부분의 요청은 "아직 안 됐어"라는 응답만 받는다

### WebSocket의 장점

- **즉시 알림**: 매칭 성공 시 서버가 클라이언트에게 즉시 알림을 보낸다
- **양방향 통신**: 서버↔클라이언트 모두 언제든 메시지를 보낼 수 있다
- **낮은 오버헤드**: 한 번 연결하면 계속 유지되므로 HTTP 헤더 반복 전송이 없다

"Node.js WebSocket 라이브러리"로 검색했더니 **Socket.io**가 가장 유명하고 안정적이라고 해서 선택했다.

## 1. Socket.io 서버 설정

### 1.1 Express 서버와 Socket.io 통합

[backend/src/server.ts](backend/src/server.ts:1-30)

```typescript
import http from 'http';
import { Server } from 'socket.io';
import createApp from './app';
import { authenticateSocket, setupMatchHandlers, startPeriodicMatching } from './sockets/match-handler';

const PORT = process.env.PORT || 3000;

const app = createApp(); // Express 앱
const server = http.createServer(app); // HTTP 서버

// Socket.io 설정
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Socket.io 인증 미들웨어
io.use(authenticateSocket);

// Socket.io 연결 핸들러
io.on('connection', (socket) => {
  console.log('🟢 New socket connection:', socket.id);
  setupMatchHandlers(io, socket as any);
});

// 주기적 재매칭 시스템 시작
startPeriodicMatching(io);

server.listen(PORT);
```

**핵심 포인트**:

1. **http.createServer**: Express를 HTTP 서버로 감싼다
2. **Socket.io 초기화**: HTTP 서버 위에 Socket.io를 올린다
3. **CORS 설정**: React Native 앱에서 접근 가능하도록 CORS 허용
4. **transports**: WebSocket을 우선 사용하고, 실패 시 HTTP 롱폴링으로 fallback

### 1.2 Socket 인증 미들웨어

HTTP API는 JWT를 헤더에 넣어서 보냈다면, Socket.io는 어떻게 인증할까? 검색해보니 `socket.handshake.auth`에 토큰을 넣어서 보낼 수 있었다.

[backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts:43-76)

```typescript
/**
 * Socket 인증 미들웨어
 */
export const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('인증 토큰이 필요합니다'));
    }

    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.id) {
      return next(new Error('유효하지 않은 토큰입니다'));
    }

    // socket 객체에 userId 저장
    socket.userId = decoded.id;
    socket.userEmail = decoded.email;

    // 사용자 온라인 상태 업데이트
    await prisma.user.update({
      where: { id: decoded.id },
      data: {
        onlineStatus: 'ONLINE',
        lastActive: new Date(),
      },
    });

    next();
  } catch (error) {
    next(new Error('인증 실패'));
  }
};
```

JWT를 검증하고, `socket.userId`에 사용자 ID를 저장한다. 이제 모든 이벤트 핸들러에서 `socket.userId`로 사용자를 식별할 수 있다.

## 2. 매칭 대기열 (Queue) 구현

### 2.1 메모리 vs Redis 선택

매칭 대기열을 어디에 저장할지 고민했다. 두 가지 방법이 있었다:

**A. 메모리 (JavaScript Map)**
- 장점: 빠르고 간단하다
- 단점: 서버가 재시작되면 대기열이 사라진다

**B. Redis**
- 장점: 영구 저장, 여러 서버에서 공유 가능
- 단점: Redis 서버가 필요하다

"매칭 대기열 구현"으로 검색해보니, 대부분 **Redis**를 권장했다. 그 이유는:

- 서버가 재시작돼도 대기 중인 사용자를 잃지 않는다
- 여러 서버로 Scale out할 때 대기열을 공유할 수 있다

하지만 Beyond Meet은 Beta 단계에서 20명만 사용하고, 서버도 1대만 운영하므로, 일단 **메모리 (Map)**로 구현했다. 나중에 사용자가 늘어나면 Redis로 마이그레이션할 예정이다.

[backend/src/services/match-service.ts](backend/src/services/match-service.ts:41-45)

```typescript
// 매칭 대기열 (메모리)
const matchQueue: Map<
  string,
  { userId: string; filters: any; timestamp: Date }
> = new Map();
```

### 2.2 대기열에 추가

[backend/src/services/match-service.ts](backend/src/services/match-service.ts:152-187)

```typescript
/**
 * 랜덤 매칭 - 매칭 대기열에 추가
 */
export const addToMatchQueue = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      gender: true,
      birthDate: true,
      country: true,
      preferredGender: true,
      minAge: true,
      maxAge: true,
      preferredCountries: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  // 대기열에 추가
  matchQueue.set(userId, {
    userId,
    filters: {
      gender: user.gender,
      birthDate: user.birthDate,
      country: user.country,
      preferredGender: user.preferredGender,
      minAge: user.minAge,
      maxAge: user.maxAge,
      preferredCountries: user.preferredCountries,
    },
    timestamp: new Date(),
  });

  return { inQueue: true, queueSize: matchQueue.size };
};
```

사용자의 매칭 필터(성별, 나이 범위, 국가 등)를 함께 저장한다. 나중에 매칭 알고리즘에서 이 필터를 사용한다.

## 3. 티어 기반 매칭 알고리즘

### 3.1 매칭 알고리즘 설계 고민

"랜덤 매칭 알고리즘"으로 검색해보니, 크게 두 가지 방식이 있었다:

**A. 엄격한 필터 매칭**
- 사용자가 설정한 필터(성별, 나이, 국가)를 모두 만족하는 상대만 매칭
- 장점: 사용자 만족도가 높다
- 단점: 매칭이 잘 안 될 수 있다 (특히 사용자가 적을 때)

**B. 느슨한 매칭**
- 필터를 무시하고 대기 중인 아무나 매칭
- 장점: 매칭이 빠르다
- 단점: 사용자가 원하지 않는 상대와 매칭될 수 있다

Beyond Meet은 **티어 기반 매칭**을 선택했다. 처음에는 엄격하게 필터를 적용하고, 매칭이 안 되면 점점 조건을 완화하는 방식이다.

### 3.2 Tier 1: 엄격한 매칭 (모든 필터 적용)

[backend/src/services/match-service.ts](backend/src/services/match-service.ts:224-237)

```typescript
// Tier 1: 엄격한 매칭 (모든 필터 적용)
const strictMatch = await tryMatchWithFilters(
  userId,
  currentUser,
  currentUserAge,
  {
    checkGender: true,
    checkAge: true,
    checkCountry: true,
  }
);
if (strictMatch) {
  return strictMatch;
}
```

- **성별**: 사용자가 선호하는 성별과 일치
- **나이**: 사용자가 설정한 나이 범위 내
- **국가**: 사용자가 선호하는 국가 목록에 포함

### 3.3 Tier 2: 국가 필터 제외

Tier 1에서 매칭이 안 되면, 국가 필터를 제외하고 다시 시도한다.

[backend/src/services/match-service.ts](backend/src/services/match-service.ts:239-252)

```typescript
// Tier 2: 국가 필터 제외
const countryRelaxedMatch = await tryMatchWithFilters(
  userId,
  currentUser,
  currentUserAge,
  {
    checkGender: true,
    checkAge: true,
    checkCountry: false, // 국가 필터 제외
  }
);
if (countryRelaxedMatch) {
  return countryRelaxedMatch;
}
```

Beta 단계에서는 한국 사용자가 대부분이라 국가 필터를 제외해도 괜찮을 것 같았다.

### 3.4 Tier 3: 나이 범위 ±5년 확대

Tier 2에서도 매칭이 안 되면, 나이 범위를 ±5년 확대한다.

[backend/src/services/match-service.ts](backend/src/services/match-service.ts:254-269)

```typescript
// Tier 3: 나이 범위 ±5년 확대
const ageRelaxedMatch = await tryMatchWithFilters(
  userId,
  currentUser,
  currentUserAge,
  {
    checkGender: true,
    checkAge: true,
    checkCountry: false,
    ageBuffer: 5, // 나이 범위 ±5년
  }
);
if (ageRelaxedMatch) {
  return ageRelaxedMatch;
}

return null; // 매칭 실패
```

예를 들어, 25~30세를 선호하는 사용자는 Tier 3에서 20~35세와도 매칭될 수 있다.

### 3.5 필터 검증 로직

[backend/src/services/match-service.ts](backend/src/services/match-service.ts:302-370)

```typescript
async function tryMatchWithFilters(
  userId: string,
  currentUser: { userId: string; filters: any; timestamp: Date },
  currentUserAge: number,
  options: {
    checkGender: boolean;
    checkAge: boolean;
    checkCountry: boolean;
    ageBuffer?: number;
  }
): Promise<string | null> {
  const ageBuffer = options.ageBuffer || 0;

  for (const [candidateId, candidate] of matchQueue) {
    if (candidateId === userId) continue; // 자기 자신 제외

    const candidateAge = calculateAge(candidate.filters.birthDate);

    // 성별 필터 (양방향 체크)
    if (options.checkGender) {
      const currentUserAcceptsAny = currentUser.filters.preferredGender === 'ANYONE';
      const candidateAcceptsAny = candidate.filters.preferredGender === 'ANYONE';

      // 현재 사용자가 상대방의 성별을 선호하는지
      if (!currentUserAcceptsAny && candidate.filters.gender !== currentUser.filters.preferredGender) {
        continue;
      }

      // 상대방이 현재 사용자의 성별을 선호하는지
      if (!candidateAcceptsAny && currentUser.filters.gender !== candidate.filters.preferredGender) {
        continue;
      }
    }

    // 나이 필터 (양방향 체크)
    if (options.checkAge) {
      const minAge = currentUser.filters.minAge - ageBuffer;
      const maxAge = currentUser.filters.maxAge + ageBuffer;
      const candidateMinAge = candidate.filters.minAge - ageBuffer;
      const candidateMaxAge = candidate.filters.maxAge + ageBuffer;

      // 상대방 나이가 내 범위 안에 있는지
      if (candidateAge < minAge || candidateAge > maxAge) {
        continue;
      }

      // 내 나이가 상대방 범위 안에 있는지
      if (currentUserAge < candidateMinAge || currentUserAge > candidateMaxAge) {
        continue;
      }
    }

    // 차단 여부 확인
    const isBlocked = await prisma.blockList.findFirst({
      where: {
        OR: [
          { userId: userId, blockedUserId: candidateId },
          { userId: candidateId, blockedUserId: userId },
        ],
      },
    });

    if (isBlocked) {
      continue;
    }

    // 매칭 성공!
    return candidateId;
  }

  return null;
}
```

**핵심 포인트**:

1. **양방향 체크**: A가 B를 선호하고, B도 A를 선호해야 매칭된다
2. **ANYONE 처리**: 선호 성별이 "누구나"이면 성별 필터를 무시한다
3. **차단 확인**: 서로 차단한 사용자는 매칭되지 않는다

## 4. Socket 이벤트 핸들러

### 4.1 매칭 요청 이벤트

[backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts:93-157)

```typescript
socket.on(
  'match:request',
  async (data: { type: 'RANDOM' | 'DIRECT'; targetUserId?: string }) => {
    try {
      if (data.type === 'RANDOM') {
        // 1. 대기열에 추가
        await matchService.addToMatchQueue(userId);

        // 2. 매칭 상대 찾기
        const matchedUserId = await matchService.findMatch(userId);

        if (matchedUserId) {
          // 3. 세션 생성
          const session = await matchService.createMatchSession(
            userId,
            matchedUserId,
            'RANDOM'
          );

          // 4. 대기열에서 제거
          matchService.removeFromMatchQueue(userId);
          matchService.removeFromMatchQueue(matchedUserId);

          // 5. 사용자 정보 가져오기
          const [user1, user2] = await Promise.all([
            matchService.getUserMatchInfo(userId),
            matchService.getUserMatchInfo(matchedUserId),
          ]);

          // 6. Agora 토큰 생성
          const user1TokenData = matchService.generateAgoraToken(
            session.channelName,
            userId
          );
          const user2TokenData = matchService.generateAgoraToken(
            session.channelName,
            matchedUserId
          );

          // 7. 두 사용자에게 매칭 성공 알림
          io.to(userId).emit('match:found', {
            session: {
              id: session.id,
              channelName: session.channelName,
            },
            partner: user2,
            token: user1TokenData.token,
            uid: user1TokenData.uid,
          });

          io.to(matchedUserId).emit('match:found', {
            session: {
              id: session.id,
              channelName: session.channelName,
            },
            partner: user1,
            token: user2TokenData.token,
            uid: user2TokenData.uid,
          });
        } else {
          // 매칭 대기 중
          socket.emit('match:waiting', {
            message: '매칭 상대를 찾고 있습니다...',
          });
        }
      }
    } catch (error: any) {
      console.error('[MATCH] Match request error:', error);
      socket.emit('match:failed', {
        reason: error.message || '매칭 요청 실패',
      });
    }
  }
);
```

**플로우**:

1. 사용자를 대기열에 추가한다
2. 즉시 매칭 상대를 찾는다 (Tier 1→2→3 순으로 시도)
3. 매칭 성공 시:
   - 매칭 세션(MatchSession)을 생성한다
   - Agora 영상 통화 토큰을 생성한다
   - 두 사용자에게 `match:found` 이벤트를 보낸다
4. 매칭 실패 시:
   - `match:waiting` 이벤트를 보낸다
   - 주기적 재매칭 시스템이 나중에 다시 시도한다

### 4.2 주기적 재매칭 시스템

즉시 매칭이 안 되면 대기열에 남아있는데, 이 사용자들을 10초마다 다시 매칭 시도한다.

[backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts:395-464)

```typescript
/**
 * 주기적 재매칭 시스템 시작
 * 10초마다 큐의 모든 사용자를 재매칭 시도
 */
let periodicMatchingInterval: NodeJS.Timeout | null = null;

export const startPeriodicMatching = (io: Server) => {
  if (periodicMatchingInterval) {
    return; // 이미 실행 중이면 중복 실행 방지
  }

  periodicMatchingInterval = setInterval(async () => {
    try {
      const matches = await matchService.matchAllUsersInQueue();

      // 매칭된 사용자들에게 알림 전송
      for (const match of matches) {
        const { user1, user2 } = match;

        // 세션 생성
        const session = await matchService.createMatchSession(
          user1,
          user2,
          'RANDOM'
        );

        // 대기열에서 제거
        matchService.removeFromMatchQueue(user1);
        matchService.removeFromMatchQueue(user2);

        // 사용자 정보 및 토큰 생성
        const [userData1, userData2] = await Promise.all([
          matchService.getUserMatchInfo(user1),
          matchService.getUserMatchInfo(user2),
        ]);

        const user1TokenData = matchService.generateAgoraToken(
          session.channelName,
          user1
        );
        const user2TokenData = matchService.generateAgoraToken(
          session.channelName,
          user2
        );

        // 두 사용자에게 매칭 성공 알림
        io.to(user1).emit('match:found', {
          session: { id: session.id, channelName: session.channelName },
          partner: userData2,
          token: user1TokenData.token,
          uid: user1TokenData.uid,
        });

        io.to(user2).emit('match:found', {
          session: { id: session.id, channelName: session.channelName },
          partner: userData1,
          token: user2TokenData.token,
          uid: user2TokenData.uid,
        });
      }
    } catch (error) {
      console.error('[PERIODIC_MATCHING] Error during periodic matching:', error);
    }
  }, 10000); // 10초마다 실행
};
```

**왜 10초인가?**

- 너무 짧으면: 서버 부하가 증가한다
- 너무 길면: 사용자가 오래 기다린다

"실시간 매칭 주기"로 검색했더니 10~30초가 적당하다고 해서 10초로 설정했다.

### 4.3 Socket.io Room 개념

Socket.io에서 `io.to(userId).emit()`이 어떻게 작동하는지 궁금했다. 검색해보니 **Room** 개념이 있었다.

[backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts:84-85)

```typescript
// Socket을 사용자 ID room에 join
socket.join(userId);
```

Socket이 연결되면 자신의 `userId`를 Room 이름으로 사용해 join한다. 이제 `io.to(userId).emit()`으로 특정 사용자에게만 메시지를 보낼 수 있다.

## 5. React Native 클라이언트 구현

### 5.1 Socket 연결

[mobile/src/services/socketService.ts](mobile/src/services/socketService.ts:77-108)

```typescript
/**
 * Socket 연결
 */
export const connect = (): void => {
  if (socket?.connected) {
    console.log('[SOCKET] Already connected');
    return;
  }

  const token = useAuthStore.getState().accessToken;

  if (!token) {
    console.error('[SOCKET] ❌ No access token available');
    return;
  }

  const socketUrl = ENV.API_BASE_URL.endsWith('/api')
    ? ENV.API_BASE_URL.slice(0, -4)
    : ENV.API_BASE_URL;

  console.log('[SOCKET] Connecting to:', socketUrl);

  socket = io(socketUrl, {
    auth: {
      token, // JWT 토큰 전달
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  setupEventHandlers();
};
```

**핵심 포인트**:

1. **auth.token**: JWT를 `socket.handshake.auth`로 전달
2. **transports**: WebSocket을 우선 사용
3. **reconnection**: 연결이 끊기면 자동 재연결 (최대 5번)

### 5.2 매칭 화면

[mobile/src/screens/match/MatchingScreen.tsx](mobile/src/screens/match/MatchingScreen.tsx:39-112)

```typescript
const MatchingScreen: React.FC<Props> = ({ navigation }) => {
  const setCurrentSession = useCallStore(state => state.setCurrentSession);
  const socket = useSocket();

  // 맥박 애니메이션 시작
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    // 매칭 타임아웃 (2분)
    const timeout = setTimeout(() => {
      Toast.show({
        type: 'info',
        text1: '매칭 시간 초과',
        text2: '현재 매칭 가능한 사용자가 없습니다.',
      });
      socketService.cancelMatch();
      navigation.goBack();
    }, 120000); // 2분

    return () => {
      pulse.stop();
      clearTimeout(timeout);
    };
  }, [navigation, scaleAnim]);

  // 매칭 성공 이벤트 리스너
  useSocketEvent('match:found', (data: any) => {
    console.log('🎉 Match found!');

    setCurrentSession(data.session);

    Toast.show({
      type: 'success',
      text1: '매칭 성공!',
      text2: `${data.partner?.nickname || '상대방'}님과 연결되었습니다`,
    });

    // VideoCallScreen으로 이동
    navigation.replace('VideoCall', {
      sessionId: data.session.id,
      channelName: data.session.channelName,
      token: data.token,
      uid: data.uid,
    });
  });

  // 매칭 실패 이벤트
  useSocketEvent('match:failed', (data: any) => {
    Toast.show({
      type: 'error',
      text1: '매칭 실패',
      text2: data.message || '매칭에 실패했습니다.',
    });
    navigation.goBack();
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* 맥박 애니메이션 아이콘 */}
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <Icon name="favorite" size={100} color={colors.primary} />
      </Animated.View>

      <Text style={styles.title}>매칭 중입니다...</Text>
      <ActivityIndicator size="large" color={colors.primary} />
    </SafeAreaView>
  );
};
```

**UI 구현 포인트**:

1. **맥박 애니메이션**: 하트 아이콘이 커졌다 작아지는 애니메이션
2. **2분 타임아웃**: 2분 동안 매칭이 안 되면 자동으로 취소
3. **useSocketEvent**: Socket 이벤트를 React 컴포넌트에서 구독

### 5.3 useSocketEvent Hook

[mobile/src/hooks/useSocket.ts](mobile/src/hooks/useSocket.ts)

```typescript
/**
 * Socket 이벤트 리스너 Hook
 * useEffect로 이벤트 등록/해제를 자동 관리
 */
export const useSocketEvent = (event: string, callback: Function) => {
  useEffect(() => {
    socketService.on(event, callback);

    return () => {
      socketService.off(event, callback);
    };
  }, [event, callback]);
};
```

`useSocketEvent`는 컴포넌트가 마운트될 때 이벤트를 등록하고, 언마운트될 때 자동으로 해제한다. 이렇게 하면 메모리 누수를 방지할 수 있다.

## 6. 테스트 결과

### 6.1 로컬 테스트 (2명)

```bash
# Terminal 1: 백엔드 서버 시작
cd backend
npm run dev

# Terminal 2: iOS 시뮬레이터 실행
cd mobile
npm run ios

# Terminal 3: Android 에뮬레이터 실행
npm run android
```

**테스트 시나리오**:

1. iOS에서 사용자 A 로그인 → 랜덤 매칭 시작
2. Android에서 사용자 B 로그인 → 랜덤 매칭 시작
3. 서버 로그에서 매칭 성공 확인:

```
[MATCH] User A added to queue
[MATCH] User B added to queue
[MATCH] Match found: A <-> B
[SOCKET] Emitting match:found to A
[SOCKET] Emitting match:found to B
```

4. 두 앱에서 "매칭 성공!" 토스트 확인
5. VideoCallScreen으로 자동 이동

### 6.2 Tier 테스트

**Tier 1 테스트** (엄격한 필터):

```
사용자 A: 여성, 25세, 한국, 선호 성별 남성, 나이 25~30세
사용자 B: 남성, 27세, 한국, 선호 성별 여성, 나이 23~28세
→ Tier 1에서 매칭 성공 ✅
```

**Tier 2 테스트** (국가 필터 제외):

```
사용자 A: 여성, 25세, 한국, 선호 국가 일본
사용자 B: 남성, 27세, 한국, 선호 국가 미국
→ Tier 1 실패 (국가 불일치)
→ Tier 2에서 매칭 성공 ✅ (국가 무시)
```

**Tier 3 테스트** (나이 범위 확대):

```
사용자 A: 여성, 25세, 선호 나이 30~35세
사용자 B: 남성, 27세, 선호 나이 20~24세
→ Tier 1 실패 (A가 B 나이 거부, B가 A 나이 거부)
→ Tier 2 실패 (여전히 나이 불일치)
→ Tier 3에서 매칭 성공 ✅ (±5년 확대: A는 25~40세, B는 15~29세)
```

### 6.3 주기적 재매칭 테스트

```bash
# 1. 사용자 A 매칭 시작 (즉시 매칭 실패)
[MATCH] User A added to queue
[MATCH] No match found for A
[SOCKET] Emitting match:waiting to A

# 2. 10초 후 사용자 B 매칭 시작
[MATCH] User B added to queue
[MATCH] No match found for B
[SOCKET] Emitting match:waiting to B

# 3. 10초 타이머 실행 (20초 후)
[PERIODIC_MATCHING] Checking queue...
[PERIODIC_MATCHING] Queue size: 2
[PERIODIC_MATCHING] Match found: A <-> B
[SOCKET] Emitting match:found to A
[SOCKET] Emitting match:found to B
```

즉시 매칭이 안 돼도 주기적 재매칭으로 결국 매칭된다.

## 7. 트러블슈팅

### 7.1 문제: Socket 연결이 자꾸 끊긴다

**증상**: iOS에서 앱을 백그라운드로 전환하면 Socket 연결이 끊어진다

**원인**: iOS는 백그라운드 앱의 네트워크 연결을 제한한다

**해결**:
```typescript
// reconnection 옵션 활성화
socket = io(socketUrl, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

앱이 포그라운드로 돌아오면 자동으로 재연결된다. 다만, 매칭 중이었던 사용자는 대기열에서 제거되므로 다시 매칭을 시작해야 한다.

### 7.2 문제: 대기열에 중복 등록

**증상**: 사용자가 "랜덤 매칭" 버튼을 연속으로 빠르게 누르면 대기열에 중복으로 들어간다

**원인**: `addToMatchQueue`가 비동기이므로, 첫 번째 요청이 완료되기 전에 두 번째 요청이 들어올 수 있다

**해결**:
```typescript
// Map의 set()은 자동으로 덮어쓰므로 중복 방지됨
matchQueue.set(userId, { ... });
```

Map은 키가 같으면 자동으로 덮어쓰므로 별도 처리가 필요 없었다. 다만, 클라이언트에서 버튼 중복 클릭을 막는 것이 더 좋다.

### 7.3 문제: 매칭 후에도 주기적 재매칭이 계속 실행됨

**증상**: 사용자가 매칭된 후에도 `matchAllUsersInQueue()`가 계속 실행되어 불필요한 DB 쿼리 발생

**원인**: `setInterval`이 대기열이 비어도 계속 실행된다

**해결**:
```typescript
periodicMatchingInterval = setInterval(async () => {
  // 대기열이 비었으면 스킵
  if (matchQueue.size === 0) {
    return;
  }

  const matches = await matchService.matchAllUsersInQueue();
  // ...
}, 10000);
```

대기열이 비어있으면 조기 return해서 불필요한 연산을 줄였다.

### 7.4 문제: io.to(userId)가 작동하지 않음

**증상**: `io.to(userId).emit('match:found')`를 실행했는데 클라이언트에서 받지 못한다

**원인**: Socket이 `userId` Room에 join하지 않았다

**해결**:
```typescript
// Socket 연결 시 반드시 Room에 join
export const setupMatchHandlers = (io: Server, socket: AuthenticatedSocket) => {
  const userId = socket.userId!;
  socket.join(userId); // 필수!

  // ...
};
```

Socket.io에서 특정 사용자에게 메시지를 보내려면 반드시 Room에 join해야 한다.

## 8. 개선 사항

현재 구현은 Beta 단계이므로 다음 기능들은 추후 추가할 예정이다:

1. **Redis 대기열**: 서버 재시작 시 대기열 유지, 여러 서버에서 공유
2. **매칭 우선순위**: 대기 시간이 긴 사용자를 우선 매칭
3. **매칭 히스토리 회피**: 최근에 매칭된 상대는 일정 시간 동안 재매칭 방지
4. **지역 기반 매칭**: 같은 지역 사용자 우선 매칭 (Geolocation API)
5. **관심사 태그**: 취미/관심사 태그를 설정하고 공통 관심사가 많은 사람 우선 매칭

## 9. 정리

Socket.io 실시간 매칭 시스템 구축을 정리하면:

1. **Socket.io 선택**: HTTP 폴링보다 WebSocket이 실시간 통신에 적합
2. **JWT 인증**: `socket.handshake.auth.token`으로 Socket 연결 인증
3. **메모리 대기열**: Map으로 간단하게 구현 (Beta 단계에 충분)
4. **티어 기반 매칭**: Tier 1 (엄격) → Tier 2 (국가 제외) → Tier 3 (나이 ±5년)
5. **주기적 재매칭**: 10초마다 대기열의 모든 사용자를 재매칭 시도
6. **Socket Room**: `socket.join(userId)`로 특정 사용자에게 메시지 전송

이제 Beyond Meet은 사용자가 "랜덤 매칭" 버튼을 누르면 실시간으로 다른 사용자와 연결되어 영상 통화를 시작할 수 있다. Tier 기반 매칭으로 사용자가 원하는 상대와 매칭될 확률을 높이면서도, 사용자가 적을 때도 매칭이 잘 되도록 했다.

다음 Part에서는 Agora를 사용한 WebRTC 영상 통화 구현을 다룬다. 매칭 성공 후 실제로 영상 통화가 어떻게 연결되는지 정리할 예정이다.
