# 영상 데이팅 앱 만들기 #8 - Socket.io 실시간 매칭 시스템

> **이전 글 요약**: Part 7에서 이메일 인증 시스템을 구축했다. Resend로 인증 코드를 발송하고, Upstash Redis에 저장해 10분 후 자동 만료되도록 구현했다.

이제 Beyond Meet의 핵심 기능인 **실시간 랜덤 매칭**을 구현할 차례다. 사용자가 "랜덤 매칭" 버튼을 누르면 실시간으로 다른 사용자와 연결되어 1:1 영상 통화가 시작되는 시스템을 만들어야 한다.

---

## 💡 왜 HTTP가 아닌 Socket.io인가?

처음에는 매칭도 REST API로 구현하려고 했다.

```
1. POST /api/match/request → 매칭 요청
2. GET /api/match/status → 매칭 상태 확인 (1초마다 폴링)
3. GET /api/match/result → 매칭 결과 조회
```

그런데 "HTTP 폴링 vs WebSocket"으로 검색해보니 실시간 통신에는 WebSocket이 훨씬 적합하다는 걸 알게 됐다.

**HTTP 폴링의 문제점**을 보면, 클라이언트가 1초마다 서버에 "매칭 됐어?"라고 물어봐야 한다. 100명이 동시에 매칭 중이면 초당 100개 요청이 발생하고, 대부분의 요청은 "아직 안 됐어"라는 응답만 받는다. 비효율적이다.

**WebSocket**은 반대다. 한 번 연결하면 서버가 클라이언트에게 언제든 메시지를 보낼 수 있다. 매칭이 성공하면 서버가 즉시 알려주니까 폴링이 필요 없다.

"Node.js WebSocket 라이브러리"로 검색했더니 **Socket.io**가 가장 유명하고 안정적이라고 해서 선택했다. 자동 재연결, 폴링 fallback 등 편리한 기능도 많다.

---

## 🔧 Socket.io 서버 설정

### Express와 Socket.io 통합

Express 앱 위에 Socket.io를 올려야 한다.

```typescript
// backend/src/server.ts
import http from 'http';
import { Server } from 'socket.io';
import createApp from './app';
import { authenticateSocket, setupMatchHandlers } from './sockets/match-handler';

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// 인증 미들웨어
io.use(authenticateSocket);

// 연결 핸들러
io.on('connection', (socket) => {
  console.log('🟢 New socket connection:', socket.id);
  setupMatchHandlers(io, socket);
});

server.listen(PORT);
```

`transports: ['websocket', 'polling']`은 WebSocket을 우선 사용하고, 실패하면 HTTP 롱폴링으로 fallback한다는 뜻이다. 네트워크 환경이 안 좋은 곳에서도 동작하게 해준다.

### Socket 인증 미들웨어

HTTP API는 JWT를 헤더에 넣어서 보냈는데, Socket.io는 어떻게 인증할까? 검색해보니 `socket.handshake.auth`에 토큰을 넣어서 보낼 수 있었다.

```typescript
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
    socket.userId = decoded.id;

    // 사용자 온라인 상태 업데이트
    await prisma.user.update({
      where: { id: decoded.id },
      data: { onlineStatus: 'ONLINE', lastActive: new Date() },
    });

    next();
  } catch (error) {
    next(new Error('인증 실패'));
  }
};
```

JWT를 검증하고 `socket.userId`에 사용자 ID를 저장한다. 이제 모든 이벤트 핸들러에서 `socket.userId`로 사용자를 식별할 수 있다.

---

## 📋 매칭 대기열 구현

### 메모리 vs Redis

매칭 대기열을 어디에 저장할지 고민했다.

**메모리(JavaScript Map)**는 빠르고 간단하지만 서버가 재시작되면 대기열이 사라진다.

**Redis**는 영구 저장이 되고 여러 서버에서 공유할 수 있지만, 추가 인프라가 필요하다.

검색해보니 대부분 Redis를 권장했다. 하지만 Beyond Meet은 Beta 단계에서 20명만 사용하고 서버도 1대뿐이라, 일단 **메모리(Map)**로 구현했다. 사용자가 늘어나면 Redis로 마이그레이션할 예정이다.

```typescript
// 매칭 대기열
const matchQueue: Map<string, {
  userId: string;
  filters: MatchFilters;
  timestamp: Date;
}> = new Map();

export const addToMatchQueue = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      gender: true,
      birthDate: true,
      country: true,
      preferredGender: true,
      minAge: true,
      maxAge: true,
      preferredCountries: true,
    },
  });

  matchQueue.set(userId, {
    userId,
    filters: user,
    timestamp: new Date(),
  });

  return { inQueue: true, queueSize: matchQueue.size };
};
```

사용자의 매칭 필터(선호 성별, 나이 범위, 국가 등)를 함께 저장한다. 나중에 매칭 알고리즘에서 이 필터를 사용한다.

---

## 🎯 티어 기반 매칭 알고리즘

### 알고리즘 설계

"랜덤 매칭 알고리즘"으로 검색해보니 크게 두 가지 방식이 있었다.

**엄격한 필터 매칭**은 사용자가 설정한 필터를 모두 만족하는 상대만 매칭한다. 사용자 만족도가 높지만, 사용자가 적을 때 매칭이 잘 안 될 수 있다.

**느슨한 매칭**은 필터를 무시하고 대기 중인 아무나 매칭한다. 매칭은 빠르지만 사용자가 원하지 않는 상대와 매칭될 수 있다.

Beyond Meet은 **티어 기반 매칭**을 선택했다. 처음에는 엄격하게 필터를 적용하고, 매칭이 안 되면 점점 조건을 완화하는 방식이다.

### Tier 1: 엄격한 매칭

모든 필터를 적용한다.

```typescript
const strictMatch = await tryMatchWithFilters(userId, currentUser, {
  checkGender: true,
  checkAge: true,
  checkCountry: true,
});
if (strictMatch) return strictMatch;
```

- 성별: 서로의 선호 성별과 일치
- 나이: 서로의 설정한 나이 범위 내
- 국가: 서로의 선호 국가 목록에 포함

### Tier 2: 국가 필터 제외

Tier 1에서 매칭이 안 되면 국가 필터를 제외하고 다시 시도한다.

```typescript
const countryRelaxedMatch = await tryMatchWithFilters(userId, currentUser, {
  checkGender: true,
  checkAge: true,
  checkCountry: false, // 국가 제외
});
if (countryRelaxedMatch) return countryRelaxedMatch;
```

Beta 단계에서는 한국 사용자가 대부분이라 국가 필터를 제외해도 괜찮을 것 같았다.

### Tier 3: 나이 범위 ±5년 확대

Tier 2에서도 안 되면 나이 범위를 ±5년 확대한다.

```typescript
const ageRelaxedMatch = await tryMatchWithFilters(userId, currentUser, {
  checkGender: true,
  checkAge: true,
  checkCountry: false,
  ageBuffer: 5, // ±5년
});
if (ageRelaxedMatch) return ageRelaxedMatch;

return null; // 매칭 실패
```

예를 들어, 25~30세를 선호하는 사용자는 Tier 3에서 20~35세와도 매칭될 수 있다.

### 필터 검증 로직

```typescript
async function tryMatchWithFilters(
  userId: string,
  currentUser: QueueEntry,
  options: FilterOptions
): Promise<string | null> {
  const ageBuffer = options.ageBuffer || 0;

  for (const [candidateId, candidate] of matchQueue) {
    if (candidateId === userId) continue;

    // 성별 필터 (양방향)
    if (options.checkGender) {
      const iAcceptCandidate =
        currentUser.filters.preferredGender === 'ANYONE' ||
        candidate.filters.gender === currentUser.filters.preferredGender;

      const candidateAcceptsMe =
        candidate.filters.preferredGender === 'ANYONE' ||
        currentUser.filters.gender === candidate.filters.preferredGender;

      if (!iAcceptCandidate || !candidateAcceptsMe) continue;
    }

    // 나이 필터 (양방향)
    if (options.checkAge) {
      const candidateAge = calculateAge(candidate.filters.birthDate);
      const myAge = calculateAge(currentUser.filters.birthDate);

      const iAcceptAge = candidateAge >= currentUser.filters.minAge - ageBuffer &&
                         candidateAge <= currentUser.filters.maxAge + ageBuffer;
      const candidateAcceptsAge = myAge >= candidate.filters.minAge - ageBuffer &&
                                  myAge <= candidate.filters.maxAge + ageBuffer;

      if (!iAcceptAge || !candidateAcceptsAge) continue;
    }

    // 차단 여부 확인
    const isBlocked = await prisma.blockList.findFirst({
      where: {
        OR: [
          { userId, blockedUserId: candidateId },
          { userId: candidateId, blockedUserId: userId },
        ],
      },
    });
    if (isBlocked) continue;

    return candidateId; // 매칭 성공
  }

  return null;
}
```

핵심은 **양방향 체크**다. A가 B를 선호하고, B도 A를 선호해야 매칭된다. 그리고 서로 차단한 사용자는 절대 매칭되지 않는다.

---

## 📡 Socket 이벤트 처리

### 매칭 요청 이벤트

```typescript
socket.on('match:request', async (data: { type: 'RANDOM' }) => {
  try {
    // 1. 대기열에 추가
    await addToMatchQueue(userId);

    // 2. 매칭 상대 찾기
    const matchedUserId = await findMatch(userId);

    if (matchedUserId) {
      // 3. 세션 생성
      const session = await createMatchSession(userId, matchedUserId, 'RANDOM');

      // 4. 대기열에서 제거
      removeFromMatchQueue(userId);
      removeFromMatchQueue(matchedUserId);

      // 5. Agora 토큰 생성
      const [token1, token2] = await Promise.all([
        generateAgoraToken(session.channelName, userId),
        generateAgoraToken(session.channelName, matchedUserId),
      ]);

      // 6. 두 사용자에게 알림
      io.to(userId).emit('match:found', {
        session,
        partner: await getUserMatchInfo(matchedUserId),
        token: token1.token,
        uid: token1.uid,
      });

      io.to(matchedUserId).emit('match:found', {
        session,
        partner: await getUserMatchInfo(userId),
        token: token2.token,
        uid: token2.uid,
      });
    } else {
      // 대기 중
      socket.emit('match:waiting', { message: '매칭 상대를 찾고 있습니다...' });
    }
  } catch (error) {
    socket.emit('match:failed', { reason: error.message });
  }
});
```

플로우를 정리하면 이렇다.

1. 사용자를 대기열에 추가한다
2. Tier 1→2→3 순으로 매칭 상대를 찾는다
3. 매칭 성공 시 세션을 생성하고 Agora 토큰을 발급한다
4. 두 사용자 모두에게 `match:found` 이벤트를 보낸다
5. 즉시 매칭이 안 되면 `match:waiting`을 보내고 대기열에 남긴다

### Socket.io Room

`io.to(userId).emit()`이 어떻게 작동하는지 궁금했다. 검색해보니 **Room** 개념이 있었다.

```typescript
socket.join(userId);
```

Socket이 연결되면 자신의 `userId`를 Room 이름으로 사용해 join한다. 이제 `io.to(userId).emit()`으로 특정 사용자에게만 메시지를 보낼 수 있다.

### 주기적 재매칭

즉시 매칭이 안 되면 대기열에 남아있는데, 이 사용자들을 10초마다 다시 매칭 시도한다.

```typescript
export const startPeriodicMatching = (io: Server) => {
  setInterval(async () => {
    if (matchQueue.size === 0) return; // 대기열 비면 스킵

    const matches = await matchAllUsersInQueue();

    for (const { user1, user2 } of matches) {
      const session = await createMatchSession(user1, user2, 'RANDOM');

      removeFromMatchQueue(user1);
      removeFromMatchQueue(user2);

      // 토큰 생성 및 알림...
      io.to(user1).emit('match:found', { ... });
      io.to(user2).emit('match:found', { ... });
    }
  }, 10000); // 10초마다
};
```

왜 10초일까? 너무 짧으면 서버 부하가 증가하고, 너무 길면 사용자가 오래 기다린다. 검색해보니 10~30초가 적당하다고 해서 10초로 설정했다.

---

## 📱 React Native 클라이언트

### Socket 연결

```typescript
export const connect = (): void => {
  const token = useAuthStore.getState().accessToken;

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  setupEventHandlers();
};
```

`auth.token`으로 JWT를 전달하고, `reconnection`으로 연결이 끊기면 자동 재연결한다.

### 매칭 화면

```typescript
const MatchingScreen: React.FC<Props> = ({ navigation }) => {
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // 맥박 애니메이션
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    // 2분 타임아웃
    const timeout = setTimeout(() => {
      Toast.show({ type: 'info', text1: '매칭 시간 초과' });
      socketService.cancelMatch();
      navigation.goBack();
    }, 120000);

    return () => {
      pulse.stop();
      clearTimeout(timeout);
    };
  }, []);

  // 매칭 성공 이벤트
  useSocketEvent('match:found', (data) => {
    Toast.show({ type: 'success', text1: '매칭 성공!' });
    navigation.replace('VideoCall', {
      sessionId: data.session.id,
      channelName: data.session.channelName,
      token: data.token,
      uid: data.uid,
    });
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Icon name="favorite" size={100} color={colors.primary} />
      </Animated.View>
      <Text>매칭 중입니다...</Text>
    </SafeAreaView>
  );
};
```

하트 아이콘이 커졌다 작아지는 맥박 애니메이션을 넣었다. 2분 동안 매칭이 안 되면 자동으로 취소된다.

`useSocketEvent`는 컴포넌트가 마운트될 때 이벤트를 등록하고, 언마운트될 때 자동으로 해제하는 커스텀 훅이다. 이렇게 하면 메모리 누수를 방지할 수 있다.

---

## 🔧 겪었던 문제들

### iOS 백그라운드에서 연결 끊김

iOS에서 앱을 백그라운드로 전환하면 Socket 연결이 끊어졌다. iOS는 백그라운드 앱의 네트워크 연결을 제한하기 때문이다.

`reconnection: true` 옵션으로 앱이 포그라운드로 돌아오면 자동 재연결되도록 했다. 다만, 매칭 중이었던 사용자는 대기열에서 제거되므로 다시 매칭을 시작해야 한다.

### io.to(userId)가 작동 안 함

`io.to(userId).emit()`을 실행했는데 클라이언트에서 받지 못하는 문제가 있었다. 원인은 Socket이 `userId` Room에 join하지 않아서였다.

```typescript
socket.join(userId); // 필수!
```

Socket 연결 직후에 반드시 Room에 join해야 한다.

---

## 🎯 테스트

### 티어 테스트

**Tier 1 테스트**:
```
사용자 A: 여성, 25세, 한국, 선호 성별 남성, 나이 25~30세
사용자 B: 남성, 27세, 한국, 선호 성별 여성, 나이 23~28세
→ Tier 1에서 매칭 성공 ✅
```

**Tier 2 테스트**:
```
사용자 A: 여성, 25세, 한국, 선호 국가 일본
사용자 B: 남성, 27세, 한국, 선호 국가 미국
→ Tier 1 실패 (국가 불일치)
→ Tier 2에서 매칭 성공 ✅ (국가 무시)
```

**Tier 3 테스트**:
```
사용자 A: 여성, 25세, 선호 나이 30~35세
사용자 B: 남성, 27세, 선호 나이 20~24세
→ Tier 1, 2 실패
→ Tier 3에서 매칭 성공 ✅ (±5년 확대)
```

### 주기적 재매칭 테스트

```
[00:00] 사용자 A 매칭 시작 → 즉시 매칭 실패 → 대기
[00:10] 사용자 B 매칭 시작 → 즉시 매칭 실패 → 대기
[00:20] 주기적 재매칭 실행 → A와 B 매칭 성공!
```

---

## 📚 다음 글 예고

**Part 9: WebRTC 영상 통화 구현**

다음 글에서는 Agora를 사용한 WebRTC 영상 통화를 구현한다. 매칭 성공 후 실제로 영상 통화가 어떻게 연결되는지, 오디오/비디오 on/off, 통화 종료 등을 다룰 예정이다.

---

## 💬 마치며

Socket.io로 실시간 매칭 시스템을 구현하면서 많은 걸 배웠다.

HTTP 폴링과 WebSocket의 차이를 이해하게 됐다. 실시간 통신에는 확실히 WebSocket이 맞다. 서버가 클라이언트에게 먼저 메시지를 보낼 수 있다는 게 핵심이다.

티어 기반 매칭 알고리즘은 처음 설계해봤는데, 사용자 경험과 매칭 성공률 사이의 균형을 맞추는 게 생각보다 어려웠다. 너무 엄격하면 매칭이 안 되고, 너무 느슨하면 사용자가 불만족한다.

Socket.io의 Room 개념도 유용했다. 특정 사용자에게만 메시지를 보내는 게 이렇게 간단할 줄 몰랐다.

다음 글에서는 Agora를 사용해 영상 통화를 구현한다.

---

**태그**: `Socket.io` `WebSocket` `실시간` `매칭` `Node.js` `React Native`
