# 프론트엔드 개발자 인터뷰 예상 질문 (정리습관 - AI 리액트 개발자)

> Beyond Meet 프로젝트 기반 예상 질문 및 모범 답변

---

## 1. 자격요건 관련 질문

### 1.1 React Native 관련

#### Q1. React Native에서 Expo와 순수 CLI의 차이점과 선택 기준은?

**모범 답변**:
```
Expo는 빠른 프로토타이핑과 간편한 배포가 장점이지만, 네이티브 모듈 커스터마이징에 제약이 있습니다.

Beyond Meet에서는 순수 React Native CLI를 선택했습니다:

1. Agora SDK (WebRTC 영상통화) - Expo에서 지원하지 않는 네이티브 모듈
2. Firebase Cloud Messaging - 백그라운드 푸시 알림 커스터마이징 필요
3. 프레임 캡처 기능 - Agora의 takeSnapshot API 직접 접근 필요

결과적으로 네이티브 브릿지에 대한 깊은 이해를 얻었고,
iOS와 Android 빌드 설정(Podfile, build.gradle)을 직접 관리할 수 있게 되었습니다.
```

**코드 증거**: [mobile/ios/Podfile](mobile/ios/Podfile), [mobile/android/build.gradle](mobile/android/build.gradle)

---

#### Q2. React Native에서 성능 최적화 경험이 있나요?

**모범 답변**:
```
Beyond Meet에서 영상통화 화면의 성능 최적화를 진행했습니다:

1. useCallback/useMemo 적극 활용
   - 이벤트 핸들러와 계산된 값의 불필요한 재생성 방지
   - 특히 Socket 이벤트 리스너에서 중요

2. React Query 설정 최적화
   - refetchOnWindowFocus: false (RN에서 불필요)
   - staleTime: 5분으로 설정해 불필요한 API 호출 방지

3. useRef로 렌더링과 무관한 값 관리
   - Agora Engine 인스턴스, interval ID 등
   - 상태 업데이트 없이 최신 값 접근

4. 메모리 누수 방지
   - useEffect cleanup에서 interval, 리스너 정리
   - WeakMap으로 Socket 리스너 관리
```

**코드 증거**: [mobile/src/screens/call/VideoCallScreen.tsx:50-100](mobile/src/screens/call/VideoCallScreen.tsx)

---

### 1.2 TypeScript 관련

#### Q3. TypeScript에서 제네릭을 활용한 경험을 설명해주세요.

**모범 답변**:
```typescript
// Beyond Meet에서 API 응답 타입을 제네릭으로 표준화했습니다

// 1. 제네릭 응답 타입 정의
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 2. API 함수에서 활용
export const getMyProfile = async (): Promise<ApiResponse<User>> => {
  const response = await api.get<ApiResponse<User>>('/users/me');
  return response.data;
};

// 3. React Query와 결합
export const useMyProfile = () => {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: () => userApi.getMyProfile(),
    select: (data) => data.data, // ApiResponse<User>에서 User 추출
  });
};

// 이렇게 하면:
// - 모든 API 응답이 일관된 구조를 가짐
// - 타입 추론이 자동으로 동작
// - IDE 자동완성 지원
```

**코드 증거**: [mobile/src/@types/index.ts:85-95](mobile/src/@types/index.ts)

---

#### Q4. 유니온 타입과 타입 가드를 사용한 경험이 있나요?

**모범 답변**:
```typescript
// Beyond Meet에서 사용자 상태와 매칭 타입에 유니온 타입을 활용했습니다

// 1. 유니온 타입 정의
type OnlineStatus = 'ONLINE' | 'OFFLINE' | 'IN_CALL';
type MatchType = 'RANDOM' | 'DIRECT';
type Gender = 'MALE' | 'FEMALE' | 'OTHER';
type PreferredGender = 'MALE' | 'FEMALE' | 'ANYONE';

// 2. Discriminated Union (판별 유니온)
type SocketEvent =
  | { type: 'match:found'; session: MatchSession; token: string }
  | { type: 'match:failed'; reason: string }
  | { type: 'call:incoming'; session: MatchSession; caller: User };

// 3. 타입 가드 활용
function handleSocketEvent(event: SocketEvent) {
  switch (event.type) {
    case 'match:found':
      // event.session, event.token 타입 자동 추론
      navigation.navigate('VideoCall', {
        sessionId: event.session.id
      });
      break;
    case 'call:incoming':
      // event.caller 타입 자동 추론
      showIncomingCallModal(event.caller);
      break;
  }
}

// 장점:
// - 런타임 에러 방지 (잘못된 상태 접근 불가)
// - 컴파일 타임에 모든 케이스 처리 여부 확인
// - IDE에서 자동완성 지원
```

**코드 증거**: [mobile/src/@types/index.ts:20-35](mobile/src/@types/index.ts)

---

### 1.3 React Query 관련

#### Q5. React Query에서 서버 상태와 클라이언트 상태를 어떻게 구분하나요?

**모범 답변**:
```
Beyond Meet에서는 명확하게 구분했습니다:

[서버 상태 - React Query]
- 프로필 데이터 (useMyProfile)
- 친구 목록 (useFriends)
- 통화 기록 (useCallHistory)
→ 서버가 source of truth, 캐싱/동기화/재검증 필요

[클라이언트 상태 - Zustand]
- 인증 토큰 (accessToken, refreshToken)
- 현재 통화 세션 (currentSession)
- UI 상태 (isInCall, isJoined)
→ 클라이언트에서만 존재, 즉시 업데이트 필요

분리한 이유:
1. 관심사 분리 - 각 상태의 특성에 맞는 도구 사용
2. 캐시 관리 - 서버 상태는 자동 캐시 무효화
3. 지속성 - 인증은 AsyncStorage, 서버 상태는 메모리
```

**코드 증거**:
- React Query: [mobile/src/hooks/useProfile.ts](mobile/src/hooks/useProfile.ts)
- Zustand: [mobile/src/store/authStore.ts](mobile/src/store/authStore.ts)

---

#### Q6. React Query의 캐시 무효화 전략을 설명해주세요.

**모범 답변**:
```typescript
// Beyond Meet에서 사용한 캐시 무효화 패턴

// 1. Mutation 성공 후 관련 쿼리 무효화
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }) => userApi.updateProfile(userId, data),
    onSuccess: (_, variables) => {
      // 내 프로필 무효화 → 자동 재요청
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      // 상세 프로필도 무효화
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(variables.userId)
      });
    },
  });
};

// 2. Query Key Factory 패턴으로 계층적 무효화
export const queryKeys = {
  profile: {
    all: ['profile'] as const,  // 모든 프로필 쿼리 무효화 가능
    me: () => [...queryKeys.profile.all, 'me'] as const,
    detail: (userId: string) => [...queryKeys.profile.all, 'detail', userId] as const,
  },
};

// queryKeys.profile.all로 무효화하면 me와 detail 모두 무효화됨

// 3. 로그아웃 시 전체 캐시 클리어
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear(); // 모든 캐시 제거
    },
  });
};
```

**코드 증거**: [mobile/src/constants/queryKeys.ts](mobile/src/constants/queryKeys.ts)

---

#### Q7. staleTime과 gcTime(cacheTime)의 차이는?

**모범 답변**:
```typescript
// Beyond Meet의 QueryClient 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5분
      gcTime: 10 * 60 * 1000,    // 10분
    },
  },
});

// staleTime (5분)
// - 데이터가 "신선"하다고 간주되는 시간
// - 이 시간 내에는 refetch 발생 안 함
// - 5분 동안 프로필 데이터를 캐시에서 바로 사용

// gcTime (10분, 구 cacheTime)
// - 비활성 쿼리가 메모리에 유지되는 시간
// - 컴포넌트 언마운트 후 10분까지 캐시 유지
// - 다시 마운트되면 캐시된 데이터 즉시 표시

// 실제 동작 예시:
// 1. 프로필 화면 진입 → API 호출
// 2. 3분 후 다른 화면 → 돌아와도 API 호출 안 함 (stale 아님)
// 3. 6분 후 다른 화면 → 돌아오면 캐시 표시 + 백그라운드 refetch
// 4. 11분 후 언마운트 상태 → 캐시 삭제됨
```

---

### 1.4 Claude Code 관련

#### Q8. Claude Code를 활용한 개발 경험을 설명해주세요.

**모범 답변**:
```
Beyond Meet 전체를 Claude Code로 개발했습니다.

[활용 방식]
1. CLAUDE.md 파일로 프로젝트 컨텍스트 제공
   - 아키텍처 개요, 코딩 컨벤션, API 응답 포맷
   - Claude가 프로젝트 맥락을 이해하고 일관된 코드 생성

2. 단계적 구현 요청
   - "매칭 서비스 구현해줘" 같은 포괄적 요청
   - Claude가 서비스, 컨트롤러, 라우트 전체 구조 생성

3. 디버깅 및 리팩토링
   - 에러 메시지와 코드를 공유하면 원인 분석 및 수정
   - "이 코드를 React Query로 마이그레이션해줘" 같은 요청

[장점]
- 개발 속도 3배 이상 향상
- 일관된 코딩 스타일 유지
- 복잡한 타입 정의 자동 생성
- 문서화 자동 생성

[주의점]
- 생성된 코드 반드시 검토 필요
- 비즈니스 로직은 명확히 설명해야 정확한 결과
- 보안 관련 코드는 추가 검증 필수
```

**코드 증거**: [CLAUDE.md](CLAUDE.md)

---

## 2. 우대사항 관련 질문

### 2.0 풀스택 개발 경험

#### Q28. 백엔드, DB, 프론트엔드를 모두 혼자 진행한 이유는?

**모범 답변**:
```
Beyond Meet은 개인 프로젝트로, 의도적으로 풀스택 개발을 선택했습니다.

[선택 이유]
1. 전체 시스템 이해
   - 프론트엔드 개발자로서 "서버에서 왜 이렇게 응답하지?"라는 의문 해소
   - API 설계 시 클라이언트 사용성을 직접 고려 가능
   - 병목 지점을 양쪽 관점에서 파악

2. API 계약 최적화
   - 프론트엔드가 필요한 데이터 구조를 정확히 설계
   - 불필요한 over-fetching, under-fetching 방지
   - 예: 친구 상태 조회 시 필요한 필드만 select

3. 빠른 프로토타이핑
   - 기획 → 백엔드 → 프론트엔드를 한 사이클에 완료
   - 커뮤니케이션 오버헤드 없이 즉시 수정 가능

4. 웹 개발자 역량 확장
   - Node.js, Express, Prisma 실무 경험
   - Socket.io 실시간 통신 구현
   - PostgreSQL 스키마 설계

[배운 점]
- 서버 관점에서의 에러 핸들링 중요성
- 트랜잭션과 race condition 이해
- 인증/인가 플로우 전체 구현 경험
```

---

#### Q29. 프론트-백엔드 API 계약은 어떻게 설계했나요?

**모범 답변**:
```typescript
// Beyond Meet의 API 계약 설계 원칙

// 1. 일관된 응답 포맷 정의
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;    // 프로그래밍용 (에러 분기)
    message: string; // 사용자 표시용
  };
}

// 2. 프론트엔드 친화적 응답 구조
// ❌ 나쁜 예: 필요한 데이터가 중첩되어 있음
{ user: { profile: { friends: [...] } } }

// ✅ 좋은 예: 플랫한 구조로 바로 사용 가능
{ friends: [...], total: 10 }

// 3. 에러 코드 체계화 (클라이언트에서 분기 가능)
const handleError = (error: ApiError) => {
  switch (error.code) {
    case 'TOKEN_EXPIRED':
      return refreshToken();
    case 'USER_NOT_FOUND':
      return navigation.navigate('NotFound');
    case 'VALIDATION_ERROR':
      return showToast(error.message);
  }
};

// 4. TypeScript 타입 공유
// 백엔드의 Prisma 스키마 → 프론트엔드 타입 정의 동기화
type User = {
  id: string;
  nickname: string;
  onlineStatus: 'ONLINE' | 'OFFLINE' | 'IN_CALL';
};

// 5. API 문서화
// docs/API_SPECIFICATION.md에 모든 엔드포인트 정리
// - 요청/응답 예시
// - 에러 코드 목록
// - 인증 필요 여부
```

**코드 증거**: [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)

---

#### Q30. DB 스키마 설계 시 어떤 점을 고려했나요?

**모범 답변**:
```typescript
// Beyond Meet의 DB 스키마 설계 고려사항

// 1. 성능 최적화 인덱스
model User {
  @@index([onlineStatus, gender, country])  // 매칭 쿼리 최적화
  @@index([lastActive(sort: Desc)])         // 활동도 조회 최적화
}

// 2. 관계 설정 (양방향)
model Friendship {
  userId    String
  friendId  String
  user      User @relation("UserFriendships", fields: [userId], references: [id])
  friend    User @relation("FriendOf", fields: [friendId], references: [id])

  @@unique([userId, friendId])  // 중복 친구 방지
}

// 3. 소프트 삭제 고려
// 회원탈퇴 시 관련 데이터 처리
// - 신고 기록: 익명화 (reporterId → 'DELETED_USER')
// - 통화 기록: 삭제
// - 친구 관계: 삭제

// 4. Enum으로 상태 관리
enum OnlineStatus { ONLINE, OFFLINE, IN_CALL }
enum MatchStatus { PENDING, ACTIVE, COMPLETED, REJECTED, CANCELLED }

// 5. 외래키 의존성 순서 (삭제 시 중요)
// ContentModerationLog → Report → CallEvent → CallRecord
// → MatchSession → Friendship → BlockList → DeviceToken → User

// 6. 확장성 고려
// - deviceTokens: 다중 기기 지원
// - matchSessions: 매칭 이력 추적
// - moderationLogs: AI 모더레이션 로그

[설계 과정]
1. ERD 다이어그램으로 관계 시각화
2. 주요 쿼리 패턴 분석 → 인덱스 설계
3. 삭제 시나리오 테스트 → 외래키 순서 확정
```

**코드 증거**: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)

---

### 2.1 Node.js 백엔드 관련

#### Q9. Express에서 에러 핸들링을 어떻게 구현했나요?

**모범 답변**:
```typescript
// Beyond Meet의 에러 핸들링 구조

// 1. 커스텀 에러 클래스
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

// 2. 서비스에서 에러 던지기
const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  return user;
};

// 3. 컨트롤러에서 next로 전달
export const getProfile = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.userId);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error); // 글로벌 에러 핸들러로 전달
  }
};

// 4. 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: { code, message: err.message }
  });
});

// 장점:
// - 일관된 에러 응답 포맷
// - 클라이언트에서 에러 코드로 분기 처리 가능
// - 500 에러도 안전하게 처리
```

**코드 증거**: [backend/src/middlewares/errorHandler.ts](backend/src/middlewares/errorHandler.ts)

---

#### Q10. Socket.io와 REST API를 어떻게 구분해서 사용했나요?

**모범 답변**:
```
Beyond Meet에서는 명확한 기준으로 구분했습니다:

[Socket.io 사용 (실시간 양방향)]
- 랜덤 매칭 요청/응답 (match:request → match:found)
- 통화 시그널링 (call:accept, call:reject, call:end)
- 모더레이션 경고 (moderation:warning)
- 토큰 자동 갱신 (auth:token-refreshed)
- 이유: 즉시 응답이 필요하고, 서버에서 클라이언트로 푸시해야 함

[REST API 사용 (요청-응답)]
- 프로필 CRUD (/users/me)
- 친구 목록 조회 (/friends)
- 통화 기록 저장 (/calls)
- 파일 업로드 (/users/me/photos)
- 이메일 인증 (/auth/send-verification-code, /auth/verify-code)
- 이유: 데이터 영속성 필요, 소켓 끊겨도 데이터 유지

[하이브리드 케이스]
친구에게 직접 통화 요청:
1. REST로 세션 생성 (DB 저장, 끊겨도 유지)
2. Socket으로 상대방에게 알림 (실시간 푸시)
```

**코드 증거**:
- Socket: [backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts)
- REST: [backend/src/routes/](backend/src/routes/)

---

#### Q10-1. Socket 연결 시 토큰 자동 갱신은 어떻게 구현했나요?

**모범 답변**:
```typescript
// Beyond Meet의 Socket 토큰 자동 갱신 구현

// 1. 클라이언트: 연결 시 refreshToken도 함께 전송
const socket = io(SOCKET_URL, {
  auth: {
    token: accessToken,
    refreshToken: refreshToken  // 추가
  },
  transports: ['websocket'],
});

// 2. 서버: 토큰 검증 시 만료된 경우 자동 갱신
io.use(async (socket, next) => {
  const { token, refreshToken } = socket.handshake.auth;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' && refreshToken) {
      // refreshToken으로 새 토큰 발급
      const newTokens = await refreshTokens(refreshToken);

      // 새 토큰을 클라이언트에 전송
      socket.emit('auth:token-refreshed', {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken
      });

      socket.userId = newTokens.userId;
      next();
    } else {
      next(new Error('Authentication failed'));
    }
  }
});

// 3. 클라이언트: 새 토큰 수신 시 저장
socket.on('auth:token-refreshed', (data) => {
  useAuthStore.getState().setTokens(
    data.accessToken,
    data.refreshToken
  );
});

// [장점]
// - HTTP와 Socket 모두 동일한 토큰 갱신 로직
// - 사용자 경험 향상 (재연결 불필요)
// - 토큰 만료로 인한 연결 끊김 방지
```

**코드 증거**:
- 서버: [backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts)
- 클라이언트: [mobile/src/services/socketService.ts](mobile/src/services/socketService.ts)

---

### 2.2 네이티브 모듈 관련

#### Q11. React Native에서 카메라/이미지 처리 경험을 설명해주세요.

**모범 답변**:
```typescript
// Beyond Meet에서 AI 모더레이션을 위한 실시간 프레임 캡처 구현

// 1. Agora SDK로 비디오 스트림 접근
import { createAgoraRtcEngine } from 'react-native-agora';

const agoraEngine = createAgoraRtcEngine();
agoraEngine.enableVideo();
agoraEngine.joinChannel(token, channelName, 0, options);

// 2. 4초마다 프레임 캡처
useEffect(() => {
  const interval = setInterval(() => {
    captureAndAnalyzeFrame();
  }, 4000);

  return () => clearInterval(interval);
}, [isJoined, remoteUid]);

// 3. 프레임 캡처 및 Base64 변환
const captureAndAnalyzeFrame = async () => {
  const filePath = `${RNFS.CachesDirectoryPath}/snapshot_${Date.now()}.jpg`;

  // Agora의 takeSnapshot API로 원격 사용자 영상 캡처
  agoraEngine.takeSnapshot(remoteUid, filePath);

  // 스냅샷 완료 이벤트 대기
  const capturedPath = await snapshotPromise;

  // Base64로 변환
  const base64 = await RNFS.readFile(capturedPath, 'base64');

  // 백엔드로 전송
  await api.post('/moderation/analyze', {
    sessionId,
    imageBase64: `data:image/jpeg;base64,${base64}`
  });

  // 임시 파일 삭제
  await RNFS.unlink(capturedPath);
};

// 챌린지:
// - Promise 기반 스냅샷 처리 (콜백 → Promise 변환)
// - 메모리 관리 (임시 파일 즉시 삭제)
// - 타임아웃 처리 (5초 내 응답 없으면 스킵)
```

**코드 증거**: [mobile/src/screens/call/VideoCallScreen.tsx:150-220](mobile/src/screens/call/VideoCallScreen.tsx)

---

#### Q12. 네이티브 모듈 연동 시 겪은 어려움과 해결 방법은?

**모범 답변**:
```
Beyond Meet에서 Agora SDK 연동 시 겪은 문제들:

[문제 1: iOS 권한 요청 타이밍]
- 증상: 카메라 권한 팝업이 안 뜸
- 원인: Info.plist에 권한 설명 누락
- 해결: NSCameraUsageDescription, NSMicrophoneUsageDescription 추가

[문제 2: Android 권한 런타임 요청]
- 증상: 권한 없이 채널 참가 시도 → 크래시
- 해결:
  await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);
  // 권한 획득 후에만 joinChannel 호출

[문제 3: takeSnapshot 비동기 처리]
- 증상: 스냅샷 완료 전에 파일 읽기 시도 → 에러
- 해결: Promise + onSnapshotTaken 이벤트 조합
  const snapshotPromise = new Promise((resolve, reject) => {
    snapshotResolverRef.current = { resolve, reject };
    setTimeout(() => reject(new Error('Timeout')), 5000);
  });

[문제 4: 메모리 누수]
- 증상: 통화 종료 후 interval 계속 실행
- 해결: useEffect cleanup + isCallEndedRef 플래그
```

**코드 증거**: [mobile/src/screens/call/VideoCallScreen.tsx:70-90](mobile/src/screens/call/VideoCallScreen.tsx)

---

### 2.3 AI 기술 연동 관련

#### Q13. AI 모델을 비즈니스 로직에 어떻게 통합했나요?

**모범 답변**:
```typescript
// Beyond Meet의 AI 콘텐츠 모더레이션 파이프라인

// 1. AI 모델 선택 및 연동
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_API_KEY);

const analyzeImage = async (imageBase64: string) => {
  const buffer = Buffer.from(imageBase64.split(',')[1], 'base64');
  const blob = new Blob([buffer], { type: 'image/jpeg' });

  const result = await hf.imageClassification({
    model: 'Falconsai/nsfw_image_detection',
    data: blob,
  });

  // { label: 'nsfw', score: 0.85 } 형태로 반환
  return result.find(r => r.label === 'nsfw')?.score || 0;
};

// 2. 비즈니스 로직 적용 (신뢰도 기반 액션 결정)
const THRESHOLD_MINOR = 0.3;   // 경고
const THRESHOLD_SEVERE = 0.6;  // 강제 종료

const determineAction = (confidence: number): ModerationAction => {
  if (confidence >= THRESHOLD_SEVERE) return 'CALL_ENDED';
  if (confidence >= THRESHOLD_MINOR) return 'WARNING_ISSUED';
  return 'NONE';
};

// 3. 실시간 파이프라인
// 프론트: 4초마다 프레임 캡처 → POST /moderation/analyze
// 백엔드: AI 분석 → 액션 결정 → Socket 이벤트 발송
// 프론트: 경고 모달 표시 또는 통화 강제 종료

// 4. 할당량 관리 (비용 최적화)
const MONTHLY_QUOTA = 30000;
const quotaKey = `moderation:quota:${year}-${month}`;
const currentUsage = await redis.incr(quotaKey);

if (currentUsage > MONTHLY_QUOTA) {
  return { action: 'NONE', reason: 'QUOTA_EXCEEDED' };
}
```

**코드 증거**: [backend/src/services/moderation-service.ts](backend/src/services/moderation-service.ts)

---

#### Q14. AI API 호출 시 에러 핸들링은 어떻게 했나요?

**모범 답변**:
```typescript
// Beyond Meet의 AI API 에러 핸들링 전략

// 1. Graceful Degradation (우아한 성능 저하)
const analyzeImage = async (imageBase64: string) => {
  try {
    const confidence = await hf.imageClassification({ ... });
    return { success: true, confidence };
  } catch (error) {
    // AI 실패해도 통화는 계속 진행
    console.error('[Moderation] AI analysis failed:', error);
    return { success: false, confidence: 0 };
  }
};

// 2. 할당량 초과 시 안전하게 스킵
const checkQuota = async () => {
  try {
    const usage = await redis.get(quotaKey);
    return usage < MONTHLY_QUOTA;
  } catch (redisError) {
    // Redis 실패해도 모더레이션 계속 동작
    console.error('[Moderation] Redis check failed:', redisError);
    return true; // 일단 허용
  }
};

// 3. 타임아웃 설정
const analyzeWithTimeout = async (imageBase64: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const result = await hf.imageClassification({
      model: 'Falconsai/nsfw_image_detection',
      data: blob,
      signal: controller.signal,
    });
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
};

// 4. 재시도 로직 (지수 백오프)
const analyzeWithRetry = async (imageBase64: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await analyzeImage(imageBase64);
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1초, 2초, 4초
    }
  }
};
```

**코드 증거**: [backend/src/services/moderation-service.ts:50-80](backend/src/services/moderation-service.ts)

---

### 2.4 이메일 인증 시스템 관련

#### Q14-1. 이메일 인증 시스템은 어떻게 구현했나요?

**모범 답변**:
```typescript
// Beyond Meet의 이메일 인증 파이프라인

// 1. Resend 서비스 설정
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// 2. 인증 코드 생성 및 저장 (Redis)
const sendVerificationCode = async (email: string) => {
  // 6자리 인증 코드 생성
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Redis에 저장 (TTL: 10분)
  await redis.set(`email_verification:${email}`, JSON.stringify({
    code,
    attempts: 0,
    createdAt: Date.now()
  }), 'EX', 600);

  // 이메일 발송
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: 'Beyond Meet 이메일 인증',
    html: `인증 코드: <strong>${code}</strong> (10분간 유효)`
  });
};

// 3. 인증 코드 확인
const verifyCode = async (email: string, code: string) => {
  const data = await redis.get(`email_verification:${email}`);
  if (!data) throw new AppError(400, 'CODE_EXPIRED', '인증 코드가 만료되었습니다');

  const { code: savedCode, attempts } = JSON.parse(data);

  // 시도 횟수 제한 (5회)
  if (attempts >= 5) {
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', '시도 횟수를 초과했습니다');
  }

  if (code !== savedCode) {
    // 시도 횟수 증가
    await redis.set(`email_verification:${email}`, JSON.stringify({
      ...JSON.parse(data),
      attempts: attempts + 1
    }), 'KEEPTTL');
    throw new AppError(400, 'INCORRECT_CODE', '잘못된 인증 코드입니다');
  }

  // 인증 완료 상태 저장 (TTL: 30분)
  await redis.set(`email_verified:${email}`, 'true', 'EX', 1800);
  await redis.del(`email_verification:${email}`);
};

// 4. 회원가입 시 인증 상태 확인
const register = async (data: RegisterInput) => {
  const isVerified = await redis.get(`email_verified:${data.email}`);
  if (!isVerified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', '이메일 인증이 필요합니다');
  }
  // ... 회원가입 진행
};

// [보안 고려사항]
// - 인증 코드 TTL (10분)
// - 시도 횟수 제한 (5회)
// - Rate Limiting (재발송 10회/5분)
// - 인증 완료 후 코드 즉시 삭제
```

**코드 증거**:
- 서비스: [backend/src/services/email-service.ts](backend/src/services/email-service.ts)
- 컨트롤러: [backend/src/controllers/auth-controller.ts](backend/src/controllers/auth-controller.ts)

---

#### Q14-2. 이메일 인증을 회원가입 전에 하는 이유는?

**모범 답변**:
```
회원가입 전 이메일 인증(Pre-registration Verification) 방식을 선택한 이유:

[1. 불필요한 계정 생성 방지]
- 잘못된 이메일로 계정 생성 후 인증 실패 → 고아 계정 발생
- 인증 먼저 → 유효한 이메일만 계정 생성 가능

[2. 사용자 경험 개선]
- 이메일 입력 → 인증 → 나머지 정보 입력
- 마지막에 인증 실패하는 것보다 처음에 확인하는 게 나음

[3. DB 정합성]
- 미인증 사용자 관리 불필요
- 모든 User 레코드는 인증된 이메일 보장

[4. 초대 코드 시스템과 연동]
- 초대 코드는 한 번만 사용 가능
- 이메일 미인증으로 가입 실패 시 코드 낭비 방지

[구현 흐름]
1. Welcome 화면 → 이메일 입력
2. 인증 코드 발송 → 코드 입력
3. 인증 완료 → Redis에 상태 저장 (30분)
4. 회원가입 폼 → 인증 상태 확인 후 진행

[대안: 회원가입 후 인증의 단점]
- 미인증 사용자 추적 필요
- 일정 기간 후 삭제 로직 필요
- 인증 독촉 이메일 발송 필요
```

**코드 증거**: [mobile/src/screens/auth/EmailVerificationScreen.tsx](mobile/src/screens/auth/EmailVerificationScreen.tsx)

---

### 2.5 다국어 지원 (i18n) 관련

#### Q14-3. 다국어 지원은 어떻게 구현했나요?

**모범 답변**:
```typescript
// Beyond Meet의 다국어(i18n) 구현

// 1. i18next 설정 (mobile/src/i18n/index.ts)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
  },
  lng: 'ko',  // 기본 언어
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
});

// 2. Zustand로 언어 상태 관리 (languageStore.ts)
interface LanguageState {
  language: 'ko' | 'en' | 'ja';
  setLanguage: (lang: 'ko' | 'en' | 'ja') => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'ko',
      setLanguage: (lang) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },
    }),
    { name: 'language-storage' }
  )
);

// 3. 컴포넌트에서 사용
const HomeScreen = () => {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{t('home.welcome')}</Text>
      <Button title={t('home.startMatching')} />
    </View>
  );
};

// 4. 번역 파일 구조 (locales/ko.json)
{
  "home": {
    "welcome": "환영합니다",
    "startMatching": "매칭 시작"
  },
  "call": {
    "connecting": "연결 중...",
    "ended": "통화가 종료되었습니다"
  }
}

// [지원 언어]
// - 한국어 (ko) - 기본
// - 영어 (en)
// - 일본어 (ja)

// [장점]
// - 앱 재시작 없이 즉시 언어 변경
// - AsyncStorage에 선택 저장 (persist)
// - 중앙화된 번역 관리
```

**코드 증거**:
- i18n 설정: [mobile/src/i18n/index.ts](mobile/src/i18n/index.ts)
- 언어 스토어: [mobile/src/store/languageStore.ts](mobile/src/store/languageStore.ts)
- 번역 파일: [mobile/src/i18n/locales/](mobile/src/i18n/locales/)

---

#### Q15. 매칭 알고리즘을 어떻게 설계했나요?

**모범 답변**:
```typescript
// Beyond Meet의 3-Tier Fallback 매칭 알고리즘

// 설계 원칙: 사용자 대기 시간 최소화 + 선호도 최대한 반영

// Tier 1: 엄격한 매칭 (모든 필터 적용)
const tier1Match = (user: User, candidate: Candidate) => {
  return (
    checkGenderPreference(user, candidate) &&  // 양방향 성별 체크
    checkAgeRange(user, candidate) &&          // 나이 범위 체크
    checkCountryPreference(user, candidate) && // 국가 필터 체크
    !isBlocked(user, candidate)                // 차단 목록 체크
  );
};

// Tier 2: 국가 필터 제외
const tier2Match = (user: User, candidate: Candidate) => {
  return (
    checkGenderPreference(user, candidate) &&
    checkAgeRange(user, candidate) &&
    !isBlocked(user, candidate)
  );
};

// Tier 3: 나이 범위 ±5년 확대
const tier3Match = (user: User, candidate: Candidate) => {
  return (
    checkGenderPreference(user, candidate) &&
    checkAgeRangeExtended(user, candidate, 5) && // ±5년 확대
    !isBlocked(user, candidate)
  );
};

// 매칭 실행 로직
const findMatch = (user: User, queue: Candidate[]) => {
  // Tier 1 시도
  let match = queue.find(c => tier1Match(user, c));
  if (match) return { match, tier: 1 };

  // Tier 2 시도
  match = queue.find(c => tier2Match(user, c));
  if (match) return { match, tier: 2 };

  // Tier 3 시도
  match = queue.find(c => tier3Match(user, c));
  if (match) return { match, tier: 3 };

  return null; // 대기열에서 계속 대기
};

// 양방향 성별 체크 (핵심 로직)
const checkGenderPreference = (a: User, b: User) => {
  const aAcceptsB = a.preferredGender === 'ANYONE' || a.preferredGender === b.gender;
  const bAcceptsA = b.preferredGender === 'ANYONE' || b.preferredGender === a.gender;
  return aAcceptsB && bAcceptsA;
};
```

**코드 증거**: [backend/src/services/match-service.ts](backend/src/services/match-service.ts)

---

### 2.7 데이터 흐름 설계 관련

#### Q16. 전체 시스템의 데이터 흐름을 설명해주세요.

**모범 답변**:
```
Beyond Meet의 데이터 흐름 (매칭 → 통화 → 종료)

[1. 매칭 요청]
사용자 A 앱
  → Socket.emit('match:request', { filters })
  → 백엔드 Socket 핸들러
  → matchQueue에 추가
  → 10초마다 findMatch() 실행
  → 매칭 성공 시 MatchSession DB 저장
  → Socket.emit('match:found') to A, B

[2. 통화 시작]
사용자 A, B 앱
  → Agora joinChannel(token)
  → 백엔드: CallRecord 생성 (status: ONGOING)
  → 4초마다 프레임 캡처
  → POST /moderation/analyze
  → AI 분석 → 액션 결정

[3. 통화 종료]
사용자 A 앱
  → Socket.emit('call:end')
  → 백엔드: CallRecord 업데이트 (duration, endTime)
  → Socket.emit('call:ended') to B
  → 양쪽 Agora leaveChannel()

[4. 상태 동기화]
- React Query: 통화 기록 invalidateQueries
- Zustand: currentSession = null, isInCall = false
- Socket: 연결 유지 (다음 매칭 대기 가능)

[데이터 흐름 특징]
1. 실시간: Socket.io (매칭, 시그널링)
2. 영속성: REST API + Prisma (프로필, 기록)
3. 캐싱: React Query (프론트), Redis (백엔드)
4. 분리: 서버 상태 vs 클라이언트 상태
```

---

#### Q17. 인증 플로우를 설명해주세요.

**모범 답변**:
```typescript
// Beyond Meet의 JWT 기반 인증 플로우

// 1. 로그인 시 토큰 발급
const login = async (email, password) => {
  const user = await validateCredentials(email, password);

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }  // 1시간
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }  // 7일
  );

  return { accessToken, refreshToken, user };
};

// 2. Axios 인터셉터로 토큰 자동 첨부 (프론트)
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. 토큰 만료 시 자동 갱신 (프론트)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      const { accessToken, refreshToken: newRefresh } =
        await authApi.refresh(refreshToken);

      useAuthStore.getState().setTokens(accessToken, newRefresh);
      error.config.headers.Authorization = `Bearer ${accessToken}`;

      return api(error.config); // 원래 요청 재시도
    }
    return Promise.reject(error);
  }
);

// 4. Socket.io 인증
const socket = io(SOCKET_URL, {
  auth: { token: accessToken },
});

// 백엔드에서 handshake 시 토큰 검증
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

**코드 증거**:
- 프론트: [mobile/src/services/api.ts](mobile/src/services/api.ts)
- 백엔드: [backend/src/middlewares/auth.ts](backend/src/middlewares/auth.ts)

---

### 2.8 WebRTC & Agora 심화

#### Q31. WebRTC의 핵심 개념을 설명해주세요.

**모범 답변**:
```
WebRTC(Web Real-Time Communication)는 브라우저/앱 간 P2P 실시간 통신을 위한 기술입니다.

[핵심 개념]

1. P2P (Peer-to-Peer)
   - 서버를 거치지 않고 클라이언트 간 직접 연결
   - 낮은 지연시간, 서버 부하 감소
   - 문제: NAT/방화벽 뒤의 클라이언트는 직접 연결 불가

2. STUN (Session Traversal Utilities for NAT)
   - 클라이언트의 공인 IP 주소를 알려주는 서버
   - NAT 뒤에 있는 클라이언트가 자신의 외부 주소 파악
   - 무료 공용 서버 존재 (Google STUN 등)

3. TURN (Traversal Using Relays around NAT)
   - P2P 연결 실패 시 중계 서버 역할
   - 모든 트래픽이 TURN 서버를 경유 (비용 발생)
   - 최후의 수단으로 사용

4. ICE (Interactive Connectivity Establishment)
   - STUN/TURN을 활용해 최적의 연결 경로 탐색
   - ICE Candidate: 연결 가능한 주소 후보들
   - 여러 후보 중 가장 좋은 경로 선택

5. SDP (Session Description Protocol)
   - 미디어 세션 정보를 기술하는 포맷
   - 코덱, 해상도, 포트 등의 정보 교환
   - Offer/Answer 모델로 협상

6. Signaling 서버
   - SDP, ICE Candidate 교환을 중개
   - WebRTC 자체에는 시그널링 방법이 정의되지 않음
   - Beyond Meet: Socket.io로 구현

[연결 흐름]
1. A가 Offer SDP 생성 → Signaling 서버로 전송
2. B가 Offer 수신 → Answer SDP 생성 → 전송
3. 양쪽에서 ICE Candidate 수집 → 교환
4. 최적 경로로 P2P 연결 수립
5. 미디어 스트림 전송 시작
```

---

#### Q32. Agora를 선택한 이유는?

**모범 답변**:
```
Beyond Meet에서 Agora를 선택한 이유:

[1. 무료 티어]
- 월 10,000분 무료 (Beta 20명에 충분)
- 사용자당 약 500분의 통화 가능
- $0/월 운영 비용 목표 달성

[2. 인프라 관리 불필요]
- STUN/TURN 서버 직접 운영 불필요
- 글로벌 엣지 서버 네트워크 제공
- 자동 품질 최적화 (네트워크 상황에 따라)

[3. React Native SDK 품질]
- react-native-agora 공식 지원
- TypeScript 타입 정의 포함
- 문서화가 잘 되어 있음

[4. 토큰 기반 인증]
- 서버에서 동적 토큰 발급 가능
- 채널별, 사용자별 권한 제어
- 토큰 만료 시간 설정 가능

[5. 추가 기능]
- takeSnapshot API: AI 모더레이션용 프레임 캡처
- 음소거, 카메라 전환 등 제어 API
- 통화 품질 통계 제공

[대안 비교]
| 서비스 | 무료 티어 | SDK 품질 | 단점 |
|--------|----------|----------|------|
| Agora | 10,000분/월 | 우수 | - |
| Twilio | 없음 | 우수 | 비용 |
| Daily.co | 2,000분/월 | 보통 | RN 지원 제한 |
| 직접 구축 | - | - | TURN 서버 비용 |
```

**코드 증거**: [mobile/src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx)

---

#### Q33. Signaling 서버는 왜 필요한가요?

**모범 답변**:
```
WebRTC는 P2P 연결을 위해 사전에 정보를 교환해야 합니다.
이 교환을 중개하는 것이 Signaling 서버입니다.

[Signaling이 전달하는 정보]
1. SDP (Session Description Protocol)
   - 사용할 코덱, 해상도, 포트 정보
   - Offer/Answer 교환으로 협상

2. ICE Candidate
   - 연결 가능한 IP:Port 후보들
   - STUN/TURN 서버에서 수집한 정보

[Beyond Meet의 Signaling 구현]
Socket.io를 Signaling 서버로 활용:

// 매칭 성공 시 Agora 채널 정보 전달
io.to(userId).emit('match:found', {
  session: { channelName: 'call_123_abc' },
  token: 'agora-token-for-user',
  uid: 0,
});

// 통화 수락 시 양쪽에게 알림
io.to(callerId).emit('call:accepted', {
  token: callerToken,
  uid: callerUid,
});

[Signaling vs Media 서버]
- Signaling: 연결 수립 정보만 교환 (가벼움)
- Media: 실제 영상/음성 스트림 전달 (무거움)
- Beyond Meet: Signaling은 Socket.io, Media는 Agora

[왜 Signaling은 표준이 없나?]
- WebRTC는 미디어 전송에만 집중
- Signaling은 애플리케이션마다 요구사항이 다름
- HTTP, WebSocket, Socket.io 등 자유롭게 선택 가능
```

**코드 증거**: [backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts)

---

#### Q34. Agora 토큰 기반 인증은 어떻게 동작하나요?

**모범 답변**:
```typescript
// Beyond Meet의 Agora 토큰 인증 구조

// 1. 서버에서 토큰 생성 (match-service.ts)
export const generateAgoraToken = (
  channelName: string,
  userId: string
): { token: string; uid: number } => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  const role = RtcRole.PUBLISHER;  // 방송자 권한
  const expirationTimeInSeconds = 3600;  // 1시간
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;

  // Agora SDK로 토큰 빌드
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    0,  // UID 자동 할당
    role,
    privilegeExpiredTs,
    privilegeExpiredTs
  );

  return { token, uid: 0 };
};

// 2. 매칭 성공 시 각 사용자에게 개별 토큰 발급
const user1Token = generateAgoraToken(channelName, userId1);
const user2Token = generateAgoraToken(channelName, userId2);

io.to(userId1).emit('match:found', {
  token: user1Token.token,  // 사용자별 고유 토큰
  ...
});

// 3. 클라이언트에서 토큰으로 채널 참가
agoraEngine.joinChannel(
  token,        // 서버에서 받은 토큰
  channelName,  // 채널 이름
  0,            // UID (0이면 자동 할당)
  { clientRoleType: ClientRoleType.ClientRoleBroadcaster }
);

// [토큰의 역할]
// 1. 채널 접근 권한 검증
// 2. 사용자 역할 지정 (Publisher/Subscriber)
// 3. 만료 시간 설정
// 4. App Certificate으로 서명 → 위조 불가

// [보안 이점]
// - 토큰 없이는 채널 참가 불가
// - 토큰 만료 시 자동 퇴장
// - 서버에서만 토큰 생성 → 클라이언트 조작 방지
```

**코드 증거**:
- 서버: [backend/src/services/match-service.ts](backend/src/services/match-service.ts)
- 클라이언트: [mobile/src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx)

---

### 2.9 서버 기초 지식

#### Q35. Express 미들웨어란 무엇인가요?

**모범 답변**:
```typescript
// 미들웨어: 요청(req)과 응답(res) 사이에서 실행되는 함수

// Beyond Meet의 미들웨어 구조
app.use(cors());           // 1. CORS 처리
app.use(express.json());   // 2. JSON 파싱
app.use(rateLimiter);      // 3. Rate Limiting
app.use(authenticate);     // 4. 인증 검사
// → Controller 실행
app.use(errorHandler);     // 5. 에러 핸들링

// 미들웨어 체인 동작 원리
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;  // 다음 미들웨어/컨트롤러에서 사용 가능
    next();  // 다음 미들웨어로 이동
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// [Beyond Meet의 주요 미들웨어]
1. auth.ts - JWT 인증 검사
2. admin.ts - 관리자 권한 검사
3. rateLimiter.ts - 요청 제한
4. upload.ts - 파일 업로드 처리
5. errorHandler.ts - 에러 통합 처리

// [미들웨어의 장점]
- 관심사 분리 (인증, 로깅, 에러 처리 등)
- 재사용성 (여러 라우트에 적용)
- 테스트 용이성 (개별 미들웨어 테스트)
```

**코드 증거**: [backend/src/middlewares/](backend/src/middlewares/)

---

#### Q36. Rate Limiting은 왜 필요한가요?

**모범 답변**:
```typescript
// Beyond Meet의 Rate Limiting 구현

import rateLimit from 'express-rate-limit';

// 1. 인증 API 제한 (브루트포스 공격 방지)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 5,                     // 최대 5회 시도
  skipSuccessfulRequests: true,  // 성공한 요청은 카운트 안 함
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_AUTH_ATTEMPTS',
      message: '로그인 시도 횟수가 초과되었습니다. 15분 후 다시 시도해주세요.'
    }
  }
});

// 2. 파일 업로드 제한 (서버 리소스 보호)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1분
  max: 10,              // 최대 10회
});

// 3. 일반 API 제한
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1분
  max: 100,             // 최대 100회
});

// [Rate Limiting이 필요한 이유]

1. DDoS 공격 방어
   - 대량 요청으로 서버 마비 시도 차단
   - IP별/사용자별 요청 수 제한

2. 브루트포스 공격 방지
   - 로그인 무차별 대입 공격 차단
   - 15분에 5회 실패 시 임시 차단

3. 리소스 보호
   - 파일 업로드, AI API 호출 등 비용이 큰 작업 제한
   - 서버 안정성 유지

4. 공정한 사용 보장
   - 한 사용자가 리소스 독점 방지
   - 모든 사용자에게 동등한 서비스

// [구현 위치]
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', uploadLimiter, userRoutes);
```

**코드 증거**: [backend/src/middlewares/rateLimiter.ts](backend/src/middlewares/rateLimiter.ts)

---

#### Q37. 트랜잭션은 언제 사용하나요?

**모범 답변**:
```typescript
// Beyond Meet에서 트랜잭션을 사용한 사례

// 1. 회원가입 시 (race condition 방지)
await prisma.$transaction(
  async (tx) => {
    // Beta 사용자 수 제한 확인 (동시 가입 시 정확한 카운트)
    const userCount = await tx.user.count();
    if (userCount >= BETA_LIMIT) {
      throw new AppError(403, 'BETA_LIMIT_REACHED', '...');
    }

    // 초대 코드 사용 여부 확인
    const inviteCode = await tx.inviteCode.findUnique({
      where: { code: data.inviteCode }
    });
    if (inviteCode?.isUsed) {
      throw new AppError(400, 'INVITE_CODE_USED', '...');
    }

    // 사용자 생성 + 초대 코드 사용 처리 (원자적)
    await tx.user.create({ data: { ... } });
    await tx.inviteCode.update({
      where: { code: data.inviteCode },
      data: { isUsed: true, usedBy: userId }
    });
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 5000
  }
);

// 2. 회원탈퇴 시 (외래키 의존성 순서 보장)
await prisma.$transaction(async (tx) => {
  // 정확한 순서로 삭제해야 외래키 에러 방지
  await tx.contentModerationLog.deleteMany({ where: { userId } });
  await tx.report.updateMany({ ... });  // 익명화
  await tx.callEvent.deleteMany({ ... });
  await tx.callRecord.deleteMany({ ... });
  // ... 더 많은 테이블
  await tx.user.delete({ where: { id: userId } });
});

// [트랜잭션이 필요한 상황]
1. 여러 테이블을 동시에 수정할 때
2. 중간에 실패하면 전체 롤백이 필요할 때
3. 동시 접근으로 인한 데이터 불일치 방지
4. 비즈니스 로직의 원자성 보장

// [Isolation Level 선택]
- Serializable: 가장 엄격, 동시성 낮음 (회원가입)
- ReadCommitted: 기본값, 대부분의 경우 충분
```

**코드 증거**: [backend/src/services/auth-service.ts](backend/src/services/auth-service.ts)

---

### 2.10 아키텍처 패턴

#### Q38. 싱글톤 패턴을 Socket 서비스에 적용한 이유는?

**모범 답변**:
```typescript
// Beyond Meet의 Socket 서비스 싱글톤 구현

// mobile/src/services/socketService.ts
let socket: Socket | null = null;  // 모듈 레벨 단일 인스턴스

export const connect = (): void => {
  if (socket?.connected) return;  // 이미 연결되어 있으면 무시

  const token = useAuthStore.getState().accessToken;
  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket'],
  });
};

export const disconnect = (): void => {
  socket?.disconnect();
  socket = null;
};

export const emit = (event: string, data?: any): void => {
  socket?.emit(event, data);
};

// [싱글톤 패턴을 적용한 이유]

1. 리소스 효율성
   - 하나의 WebSocket 연결만 유지
   - 여러 연결 시 서버 리소스 낭비
   - 네트워크 오버헤드 감소

2. 전역 접근성
   - 어느 화면에서든 socketService.emit() 호출 가능
   - 컴포넌트 간 socket 인스턴스 공유 불필요

3. 상태 일관성
   - 연결 상태가 앱 전체에서 일관됨
   - 중복 연결/해제 방지

4. 이벤트 리스너 관리
   - 모든 리스너가 같은 인스턴스에 등록
   - 화면 전환 시에도 리스너 유지 (글로벌 이벤트)

// [대안과 비교]
- Context API: 렌더링과 무관한 Socket에는 과한 설계
- Redux: 보일러플레이트 증가, 복잡성 높음
- 싱글톤: 단순하고 명확한 접근
```

**코드 증거**: [mobile/src/services/socketService.ts](mobile/src/services/socketService.ts)

---

#### Q39. 3-tier 아키텍처(Controller-Service-DB)의 장점은?

**모범 답변**:
```typescript
// Beyond Meet의 3-tier 아키텍처

// [1. Controller Layer - 요청/응답 처리]
// backend/src/controllers/auth-controller.ts
export const register = async (req, res, next) => {
  try {
    // 입력 검증만 수행
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(...));
    }

    // 비즈니스 로직은 서비스에 위임
    const result = await authService.register(parseResult.data);

    // 응답 포맷팅
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// [2. Service Layer - 비즈니스 로직]
// backend/src/services/auth-service.ts
export const register = async (data: RegisterInput) => {
  // 트랜잭션, 비즈니스 규칙, 외부 서비스 호출
  return await prisma.$transaction(async (tx) => {
    // Beta 사용자 수 제한 체크
    // 초대 코드 검증
    // 사용자 생성
    // ...
  });
};

// [3. Data Layer - 데이터 접근]
// Prisma ORM으로 추상화
await prisma.user.create({ data: { ... } });
await prisma.user.findUnique({ where: { id } });

// [장점]

1. 관심사 분리
   - Controller: HTTP 처리
   - Service: 비즈니스 로직
   - Prisma: 데이터 접근

2. 테스트 용이성
   - Service만 단위 테스트 가능
   - Controller는 통합 테스트
   - Mock 주입 용이

3. 재사용성
   - 같은 Service를 여러 Controller에서 사용
   - Socket 핸들러에서도 Service 호출

4. 유지보수성
   - 각 레이어 독립적 수정 가능
   - 새로운 개발자도 구조 파악 용이
```

**코드 증거**:
- Controller: [backend/src/controllers/](backend/src/controllers/)
- Service: [backend/src/services/](backend/src/services/)

---

#### Q40. 이벤트 기반 아키텍처를 선택한 이유는?

**모범 답변**:
```typescript
// Beyond Meet의 이벤트 기반 아키텍처

// [사용 사례]

1. 매칭 시스템
   Client → match:request → Server 처리 → match:found → Client
   // 언제 매칭될지 모르므로 폴링 대신 이벤트 사용

2. 통화 시그널링
   call:incoming → call:accept → call:accepted
   // 상대방 응답을 실시간으로 받아야 함

3. 친구 상태 동기화
   friend:status-changed → UI 업데이트
   // 서버에서 변경 감지 시 즉시 푸시

// [이벤트 기반 선택 이유]

1. 실시간 요구사항
   - 매칭, 통화는 즉시 응답이 필요
   - HTTP 폴링은 지연 + 리소스 낭비

2. 양방향 통신
   - 서버 → 클라이언트 푸시 가능
   - REST API는 단방향 (클라이언트 → 서버)

3. 상태 변화 감지
   - 친구가 온라인 됐을 때 즉시 알림
   - 폴링으로는 지연 발생

// [구현 방식]
// Socket 핸들러에서 이벤트 리스너 등록
socket.on('match:request', async (data) => {
  const match = await matchService.findMatch(userId);
  if (match) {
    io.to(userId).emit('match:found', { ... });
  } else {
    socket.emit('match:waiting', { ... });
  }
});

// [이벤트 기반 vs 요청-응답 구분]
| 케이스 | 방식 | 이유 |
|--------|------|------|
| 매칭 요청 | Socket | 응답 시점 불확실 |
| 프로필 조회 | REST | 즉시 응답 가능 |
| 친구 상태 | Socket | 서버 → 클라이언트 푸시 |
| 파일 업로드 | REST | 멀티파트 처리 |
```

**코드 증거**:
- Socket: [backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts)
- REST: [backend/src/routes/](backend/src/routes/)

---

## 3. Beyond Meet 프로젝트 심화 질문

#### Q18. 프로젝트에서 가장 어려웠던 기술적 챌린지는?

**모범 답변**:
```
실시간 AI 모더레이션 파이프라인 구현이 가장 어려웠습니다.

[챌린지 1: 프레임 캡처 타이밍]
- Agora의 takeSnapshot이 비동기 콜백 방식
- Promise로 래핑하고 타임아웃 처리 추가
- 캡처 실패 시 다음 interval로 스킵

[챌린지 2: Base64 인코딩 성능]
- 고해상도 이미지는 Base64 변환이 느림
- 640x480으로 해상도 제한
- 임시 파일 즉시 삭제로 메모리 관리

[챌린지 3: AI API 비용 최적화]
- Hugging Face 무료 티어 한계 (30,000회/월)
- Redis로 월간 사용량 추적
- 할당량 초과 시 graceful degradation

[챌린지 4: 실시간 경고 전달]
- AI 분석 결과를 즉시 사용자에게 전달해야 함
- REST가 아닌 Socket으로 푸시
- 양쪽 사용자에게 동시에 알림

결과적으로 4초 주기로 안정적인 모더레이션 시스템 구축.
Beta 기간 동안 부적절한 콘텐츠 0건 노출.
```

---

#### Q19. 프로젝트의 확장성을 고려한 설계는?

**모범 답변**:
```
Beyond Meet은 Beta (20명)에서 시작하지만 확장 가능하게 설계했습니다.

[1. 상태 관리 분리]
- 현재: 메모리 기반 matchQueue
- 확장: Redis Pub/Sub로 다중 서버 지원 가능
  // 서버 1에서 매칭 요청 → Redis 발행
  // 서버 2에서 구독 → 매칭 처리

[2. 데이터베이스 인덱싱]
// 미리 매칭 쿼리 최적화
@@index([onlineStatus, gender, country])
@@index([lastActive(sort: Desc)])

// 1000명 이상에서도 빠른 매칭

[3. AI 모더레이션 확장]
- 현재: Hugging Face API (30,000회/월)
- 확장: 자체 모델 배포 또는 AWS Rekognition
- 추상화된 인터페이스로 쉽게 교체 가능

[4. 푸시 알림 확장]
- 현재: Firebase FCM 직접 호출
- 확장: 메시지 큐 (SQS) + Worker로 비동기 처리

[5. 모니터링 준비]
- 구조화된 로깅 (console.log → winston 교체 용이)
- 에러 코드 체계화 (Sentry 연동 준비)
```

---

#### Q20. 이 프로젝트에서 배운 점은?

**모범 답변**:
```
[기술적 학습]
1. React Query와 Zustand 조합의 강력함
   - 서버/클라이언트 상태 분리로 복잡성 감소
   - 캐시 무효화 전략의 중요성

2. Socket.io와 REST의 적절한 사용 분리
   - 실시간 vs 영속성 요구사항 구분
   - 하이브리드 케이스 처리 방법

3. AI를 비즈니스 로직에 통합하는 방법
   - API 호출 → 신뢰도 → 액션 결정 파이프라인
   - 비용 관리와 에러 핸들링의 중요성

4. 네이티브 모듈 연동 경험
   - iOS/Android 권한 처리 차이
   - 비동기 네이티브 API Promise 래핑

[비기술적 학습]
1. Claude Code 활용 능력 향상
   - 효과적인 프롬프트 작성법
   - 컨텍스트 제공의 중요성 (CLAUDE.md)

2. 풀스택 관점에서의 설계
   - 프론트-백엔드 API 계약 설계
   - 에러 핸들링 일관성
```

---

## 4. 일반 기술 면접 질문

#### Q21. React의 렌더링 최적화 방법은?

**모범 답변**:
```typescript
// Beyond Meet에서 적용한 최적화 기법들

// 1. React.memo - 불필요한 리렌더링 방지
const UserProfile = React.memo(({ user }: { user: User }) => {
  return <View>...</View>;
});

// 2. useCallback - 함수 참조 안정화
const handlePress = useCallback(() => {
  navigation.navigate('Profile');
}, [navigation]);

// 3. useMemo - 계산된 값 메모이제이션
const filteredFriends = useMemo(() => {
  return friends.filter(f => f.name.includes(searchQuery));
}, [friends, searchQuery]);

// 4. useRef - 렌더링과 무관한 값
const agoraEngineRef = useRef<IRtcEngine | null>(null);
const intervalRef = useRef<NodeJS.Timeout | null>(null);

// 5. React Query의 select - 필요한 데이터만 구독
const { data: userName } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  select: (data) => data.name, // name만 변경 시 리렌더링
});

// 6. 리스트 최적화
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
/>
```

---

#### Q22. 클로저(Closure)와 이를 활용한 경험은?

**모범 답변**:
```typescript
// Beyond Meet에서 클로저를 활용한 사례

// 1. Socket 리스너에서 최신 상태 접근
const VideoCallScreen = () => {
  const [remoteUid, setRemoteUid] = useState(0);
  const remoteUidRef = useRef(0);

  // 문제: 클로저가 오래된 remoteUid 캡처
  // useSocketEvent('call:end', () => {
  //   console.log(remoteUid); // 항상 초기값 0
  // });

  // 해결: useRef로 최신 값 유지
  useEffect(() => {
    remoteUidRef.current = remoteUid;
  }, [remoteUid]);

  useSocketEvent('call:end', () => {
    console.log(remoteUidRef.current); // 최신 값
  });
};

// 2. 팩토리 패턴으로 쿼리 키 생성
const createQueryKeys = (entity: string) => ({
  all: [entity] as const,
  list: () => [...createQueryKeys(entity).all, 'list'] as const,
  detail: (id: string) => [...createQueryKeys(entity).all, 'detail', id] as const,
});

const userKeys = createQueryKeys('user');
// userKeys.detail('123') → ['user', 'detail', '123']

// 3. 디바운스 함수
const createDebounce = (fn: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const debouncedSearch = createDebounce((query: string) => {
  api.search(query);
}, 300);
```

---

## 5. 추가 예상 질문 (짧은 답변)

#### Q23. Promise와 async/await의 차이는?
```
async/await는 Promise의 문법적 설탕(syntactic sugar)입니다.
- Promise: .then().catch() 체이닝
- async/await: 동기 코드처럼 작성, try/catch로 에러 처리
- 가독성과 디버깅 용이성 때문에 async/await 선호
```

#### Q24. == 와 === 의 차이는?
```
- == (동등 연산자): 타입 변환 후 비교. '1' == 1 → true
- === (일치 연산자): 타입과 값 모두 비교. '1' === 1 → false
- 항상 === 사용 권장 (예측 가능한 동작)
```

#### Q25. Virtual DOM이란?
```
실제 DOM의 메모리 내 표현.
1. 상태 변경 시 새 Virtual DOM 생성
2. 이전 Virtual DOM과 비교 (Diffing)
3. 변경된 부분만 실제 DOM에 적용 (Reconciliation)
→ DOM 조작 최소화로 성능 향상
```

#### Q26. REST API 설계 원칙은?
```
1. 리소스 중심 URL: /users, /users/123
2. HTTP 메서드: GET(조회), POST(생성), PUT(수정), DELETE(삭제)
3. 상태 없음(Stateless): 각 요청은 독립적
4. 일관된 응답 포맷: { success, data, error }
```

#### Q27. CORS란?
```
Cross-Origin Resource Sharing.
브라우저의 Same-Origin Policy를 우회하는 메커니즘.
서버에서 Access-Control-Allow-Origin 헤더로 허용 도메인 지정.
Beyond Meet에서는 Express cors 미들웨어로 처리.
```

---

## 5. 추가 트러블슈팅 경험

#### Q41. iOS 로그아웃 시 렌더링 충돌 문제를 어떻게 해결했나요?

**모범 답변**:
```typescript
// 문제 상황
// iOS에서 로그아웃 시 앱이 크래시되는 현상

// 원인 분석
// 1. 로그아웃 시 Zustand 상태 초기화
// 2. React Query 캐시 클리어
// 3. 네비게이션 스택 리셋
// → 세 가지가 동기적으로 실행되면서 렌더링 사이클 충돌

// 해결 방법: requestAnimationFrame 사용
export const useLogout = () => {
  const queryClient = useQueryClient();

  const performLogout = () => {
    // 서버 로그아웃은 fire-and-forget
    authApi.logout().catch(() => {});

    // requestAnimationFrame으로 다음 프레임에 상태 변경
    requestAnimationFrame(() => {
      queryClient.clear();
      useAuthStore.getState().logout();
    });
  };

  return useMutation({
    mutationFn: performLogout,
  });
};

// [왜 requestAnimationFrame인가?]
// - 현재 렌더링 사이클이 완료된 후 실행
// - iOS의 렌더링 파이프라인과 동기화
// - 상태 변경이 안전한 시점에 실행됨

// [대안들]
// - setTimeout(fn, 0): 비슷하지만 렌더링과 동기화 안됨
// - queueMicrotask: 너무 빠름, 같은 문제 발생
// - InteractionManager (RN): 과한 설계
```

**코드 증거**: [mobile/src/hooks/useAuth.ts](mobile/src/hooks/useAuth.ts)

---

#### Q42. Socket 리스너 메모리 누수를 어떻게 방지했나요?

**모범 답변**:
```typescript
// 문제 상황
// 같은 Socket 이벤트가 여러 번 처리되는 현상

// 원인 분석
// useEffect에서 callback이 변경될 때마다 새 리스너 등록
// 이전 리스너가 제대로 정리되지 않음

// 해결 방법 1: useRef로 callback 안정화
export const useSocketEvent = (event: string, callback: Function) => {
  const callbackRef = useRef(callback);

  // callback 변경 시 ref만 업데이트 (리스너 재등록 안함)
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 리스너는 한 번만 등록
  useEffect(() => {
    const stableCallback = (...args: any[]) => {
      callbackRef.current(...args);
    };

    socketService.on(event, stableCallback);

    return () => {
      socketService.off(event, stableCallback);
    };
  }, [event]);  // callback은 의존성에서 제외
};

// 해결 방법 2: WeakMap으로 리스너 추적
// socketService.ts
const listenerWrappers: WeakMap<Function, Function> = new WeakMap();

export const on = (event: string, callback: Function) => {
  // wrapper 생성 및 WeakMap에 저장
  const wrapper = (...args: any[]) => callback(...args);
  listenerWrappers.set(callback, wrapper);
  socket?.on(event, wrapper);
};

export const off = (event: string, callback: Function) => {
  // 원본 callback으로 wrapper 찾아서 제거
  const wrapper = listenerWrappers.get(callback);
  if (wrapper) {
    socket?.off(event, wrapper);
    listenerWrappers.delete(callback);
  }
};

// [WeakMap의 장점]
// - callback이 GC되면 자동으로 entry 제거
// - 메모리 누수 방지
// - 원본 callback으로 wrapper 조회 가능
```

**코드 증거**:
- Hook: [mobile/src/hooks/useSocket.ts](mobile/src/hooks/useSocket.ts)
- Service: [mobile/src/services/socketService.ts](mobile/src/services/socketService.ts)

---

## 6. 최신 React 기술 심화

#### Q43. React 18의 Concurrent Rendering이란?

**모범 답변**:
```
Concurrent Rendering은 React 18에서 도입된 렌더링 방식으로,
렌더링 작업을 중단하고 재개할 수 있게 해줍니다.

[핵심 개념]

1. Time Slicing (시간 분할)
   - 긴 렌더링 작업을 작은 단위로 분할
   - 각 단위 사이에 브라우저가 사용자 입력 처리 가능
   - 결과: UI가 멈추지 않고 반응성 유지

2. 우선순위 기반 렌더링
   - 긴급한 업데이트 (사용자 입력) → 높은 우선순위
   - 덜 긴급한 업데이트 (목록 필터링) → 낮은 우선순위
   - 높은 우선순위 작업이 낮은 우선순위를 중단 가능

3. Concurrent Mode vs Concurrent Features
   - Concurrent Mode: React 17에서 실험적으로 존재 (전체 앱에 적용)
   - Concurrent Features: React 18에서 점진적 도입 (opt-in 방식)
   - createRoot()로 Concurrent Features 활성화

[React 17 vs 18 비교]

// React 17: Synchronous Rendering (동기)
// 렌더링 시작하면 끝날 때까지 중단 불가
// 긴 목록 렌더링 → UI 멈춤

// React 18: Concurrent Rendering (동시성)
// 렌더링 중에도 사용자 입력 처리 가능
// 긴 목록 렌더링 중에도 타이핑 가능

[활성화 방법]
// React 17
ReactDOM.render(<App />, document.getElementById('root'));

// React 18
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

[Beyond Meet 적용 가능성]
- 친구 목록 검색 시 useTransition으로 필터링 지연
- 매칭 대기 중 UI 애니메이션 부드럽게 유지
- 하지만 React Native는 아직 제한적 지원
```

---

#### Q44. useTransition과 useDeferredValue의 차이점은?

**모범 답변**:
```typescript
// 둘 다 "덜 긴급한" 업데이트를 표시하는 훅이지만 사용 방식이 다릅니다.

// [useTransition - 상태 업데이트 자체를 지연]
const SearchableList = () => {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    // 입력 필드는 즉시 업데이트 (긴급)
    setQuery(e.target.value);

    // 목록 필터링은 낮은 우선순위로 표시
    startTransition(() => {
      setFilteredItems(filterItems(items, e.target.value));
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}  {/* 전환 중 로딩 표시 */}
      <ItemList items={filteredItems} />
    </div>
  );
};

// [useDeferredValue - 값 자체를 지연]
const SearchableList = () => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // query는 즉시 변경, deferredQuery는 지연됨
  const filteredItems = useMemo(
    () => filterItems(items, deferredQuery),
    [deferredQuery]  // 지연된 값 사용
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {/* query !== deferredQuery면 로딩 상태 */}
      <div style={{ opacity: query !== deferredQuery ? 0.7 : 1 }}>
        <ItemList items={filteredItems} />
      </div>
    </div>
  );
};

// [사용 케이스 구분]

| 상황 | 권장 훅 | 이유 |
|------|---------|------|
| 상태 업데이트 제어 가능 | useTransition | 업데이트를 직접 래핑 |
| props로 받은 값 | useDeferredValue | 부모 컴포넌트 수정 불가 |
| 로딩 상태 필요 | useTransition | isPending 제공 |
| 간단한 지연만 필요 | useDeferredValue | 코드 더 간단 |

// [Beyond Meet 적용 예시]
// 친구 목록 검색
const FriendsSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const { data: friends } = useFriends();

  const handleSearch = (text: string) => {
    setSearchQuery(text);  // 입력은 즉시

    startTransition(() => {
      // 필터링은 나중에 (타이핑 끊기지 않음)
      setFilteredFriends(friends.filter(f =>
        f.nickname.includes(text)
      ));
    });
  };
};
```

---

#### Q45. React Server Components(RSC)란?

**모범 답변**:
```typescript
// React Server Components는 서버에서만 실행되는 컴포넌트입니다.
// 클라이언트로 JavaScript가 전송되지 않습니다.

// [Server Component vs Client Component]

// Server Component (기본값 - Next.js 13+ App Router)
// app/users/page.tsx
async function UsersPage() {
  // 서버에서 직접 DB 접근 가능!
  const users = await prisma.user.findMany();

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// Client Component ('use client' 지시어 필요)
// app/components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);  // 상태 사용 가능

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}

// [Server Components의 장점]

1. 번들 크기 감소
   - 서버 컴포넌트의 JS는 클라이언트로 전송되지 않음
   - 대형 라이브러리(moment, lodash)를 서버에서만 사용 가능

2. 직접 백엔드 접근
   - DB, 파일 시스템, 내부 API 직접 호출
   - API 엔드포인트 없이 데이터 페칭

3. 자동 코드 분할
   - Client Component가 자동으로 lazy loading됨

4. 스트리밍
   - 컴포넌트 단위로 점진적 렌더링 가능

// [제약 사항]

Server Component에서 불가능한 것:
- useState, useEffect 등 React 훅
- 브라우저 API (window, document)
- 이벤트 핸들러 (onClick, onChange)
- Context (createContext)

// [Server Component 구성 패턴]

// 서버: 데이터 페칭 + 레이아웃
// app/dashboard/page.tsx
async function DashboardPage() {
  const stats = await fetchStats();  // 서버에서 페칭

  return (
    <div>
      <h1>Dashboard</h1>
      <StatsDisplay stats={stats} />
      <InteractiveChart />  {/* Client Component */}
    </div>
  );
}

// 클라이언트: 인터랙션이 필요한 부분만
// app/components/InteractiveChart.tsx
'use client';

export function InteractiveChart() {
  const [zoom, setZoom] = useState(1);
  // ... 인터랙티브 차트 로직
}

// [Beyond Meet과의 관계]
// 현재 Beyond Meet은 React Native (모바일 앱)
// RSC는 웹 환경 (Next.js)에서 사용
// 향후 웹 버전 개발 시 적용 가능:
// - 프로필 페이지: Server Component (정적 데이터)
// - 채팅/통화 UI: Client Component (실시간 인터랙션)
```

---

#### Q46. Suspense의 동작 원리와 활용법은?

**모범 답변**:
```typescript
// Suspense는 비동기 작업 중 fallback UI를 보여주는 컴포넌트입니다.

// [기본 사용법]
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <AsyncComponent />  {/* 로딩 중이면 Loading 표시 */}
    </Suspense>
  );
}

// [동작 원리]

1. 컴포넌트가 Promise를 throw
2. Suspense가 이를 catch
3. Promise가 resolve될 때까지 fallback 표시
4. resolve되면 실제 컴포넌트 렌더링

// [React 18의 Suspense 활용]

// 1. 코드 분할 (React.lazy)
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyComponent />
    </Suspense>
  );
}

// 2. Data Fetching (with React Query, SWR 등)
// React Query v5 + Suspense
const UserProfile = () => {
  const { data } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // data는 항상 존재 (undefined 아님)
  return <div>{data.name}</div>;
};

// 사용하는 곳
<Suspense fallback={<ProfileSkeleton />}>
  <UserProfile />
</Suspense>

// 3. 중첩 Suspense (점진적 로딩)
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<ContentSkeleton />}>
    <MainContent />
  </Suspense>
  <Suspense fallback={<SidebarSkeleton />}>
    <Sidebar />
  </Suspense>
</Suspense>

// 4. Streaming SSR (Next.js App Router)
// 서버에서 컴포넌트가 준비되는 대로 스트리밍
async function Page() {
  return (
    <div>
      <Header />  {/* 즉시 전송 */}
      <Suspense fallback={<Spinner />}>
        <SlowComponent />  {/* 준비되면 스트리밍 */}
      </Suspense>
    </div>
  );
}

// [Suspense의 장점]

1. 선언적 로딩 상태
   - if (isLoading) return <Loading /> 패턴 제거
   - 컴포넌트가 데이터만 신경 쓰면 됨

2. 로딩 상태 통합
   - 여러 비동기 작업을 하나의 fallback으로 처리
   - 일관된 UX

3. Concurrent Features와 통합
   - useTransition과 함께 사용 가능
   - 부드러운 전환 효과

// [Beyond Meet 적용 가능 예시]
// React Query의 useSuspenseQuery 활용
const FriendsList = () => {
  const { data: friends } = useSuspenseQuery({
    queryKey: friendsKeys.all,
    queryFn: () => friendsApi.getFriends(),
  });

  return <FlatList data={friends} ... />;
};

// 사용처
<Suspense fallback={<FriendsListSkeleton />}>
  <FriendsList />
</Suspense>
```

---

#### Q47. React 18의 자동 배칭(Automatic Batching)이란?

**모범 답변**:
```typescript
// 자동 배칭은 여러 상태 업데이트를 하나의 리렌더링으로 묶는 기능입니다.

// [React 17 vs React 18]

// React 17: 이벤트 핸들러 내부에서만 배칭
function handleClick() {
  setCount(c => c + 1);  // 리렌더링 안 함
  setFlag(f => !f);       // 리렌더링 안 함
  // 여기서 1번 리렌더링 (배칭 O)
}

// 하지만 setTimeout, Promise에서는 배칭 안 됨
setTimeout(() => {
  setCount(c => c + 1);  // 리렌더링 1회
  setFlag(f => !f);       // 리렌더링 1회
  // 총 2번 리렌더링 (배칭 X) - React 17
}, 1000);

// React 18: 모든 곳에서 자동 배칭
setTimeout(() => {
  setCount(c => c + 1);  // 리렌더링 안 함
  setFlag(f => !f);       // 리렌더링 안 함
  // 1번 리렌더링 (자동 배칭 O) - React 18
}, 1000);

// Promise, fetch 콜백에서도 동일
fetch('/api/data').then(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // React 18: 1번 리렌더링
});

// [배칭 비활성화가 필요한 경우: flushSync]
import { flushSync } from 'react-dom';

function handleClick() {
  flushSync(() => {
    setCount(c => c + 1);
  });
  // DOM이 즉시 업데이트됨

  flushSync(() => {
    setFlag(f => !f);
  });
  // DOM이 즉시 업데이트됨
}

// [flushSync 사용 케이스]
// 1. DOM 측정이 필요한 경우
const handleExpand = () => {
  flushSync(() => {
    setExpanded(true);
  });
  // 이 시점에서 DOM이 확장됨
  const height = ref.current.getBoundingClientRect().height;
  console.log('Expanded height:', height);
};

// 2. 외부 라이브러리와 동기화
const handleScroll = () => {
  flushSync(() => {
    setScrollPosition(newPosition);
  });
  // 외부 차트 라이브러리가 새 위치 인식
  chartLibrary.scrollTo(newPosition);
};

// [성능 향상 원리]
// 3번의 setState → 1번의 리렌더링
// - 가상 DOM diffing 1회
// - 실제 DOM 업데이트 1회
// - 레이아웃/페인트 1회

// [Beyond Meet에서의 예시]
// 통화 종료 시 여러 상태 업데이트
const handleCallEnd = () => {
  setIsInCall(false);
  setCurrentSession(null);
  setRemoteUid(0);
  setCallDuration(0);
  // React 18: 자동으로 1번만 리렌더링
};
```

---

#### Q48. Hydration이란 무엇이고, Selective Hydration은?

**모범 답변**:
```typescript
// Hydration은 서버에서 렌더링된 HTML에 JavaScript 이벤트 핸들러를 연결하는 과정입니다.

// [SSR + Hydration 흐름]

// 1. 서버: HTML 문자열 생성
const html = renderToString(<App />);
// 결과: <button>Count: 0</button> (정적 HTML)

// 2. 클라이언트: HTML 즉시 표시 (JavaScript 로딩 전)
// 사용자는 콘텐츠를 빠르게 볼 수 있음 (FCP 향상)

// 3. JavaScript 로드 완료 후: Hydration
hydrateRoot(document.getElementById('root'), <App />);
// React가 기존 DOM에 이벤트 핸들러 연결
// 이제 버튼 클릭이 동작함

// [Hydration Mismatch 에러]
// 서버와 클라이언트 렌더링 결과가 다를 때 발생

// ❌ 잘못된 예
function Clock() {
  return <span>{new Date().toLocaleTimeString()}</span>;
  // 서버: "10:00:00"
  // 클라이언트: "10:00:05" (시간 차이)
  // → Hydration Mismatch!
}

// ✅ 올바른 예
function Clock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    // 클라이언트에서만 시간 설정
    setTime(new Date().toLocaleTimeString());
  }, []);

  return <span>{time ?? 'Loading...'}</span>;
}

// [React 18의 Selective Hydration]

// React 17: 전체 앱이 hydrate되어야 인터랙션 가능
// React 18: Suspense 경계 단위로 독립적 hydration

// 예시: 댓글이 무거운 페이지
function Page() {
  return (
    <div>
      <Header />      {/* 즉시 hydrate */}
      <MainContent /> {/* 즉시 hydrate */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />  {/* 나중에 hydrate (Streaming) */}
      </Suspense>
    </div>
  );
}

// [Selective Hydration의 장점]

1. 우선순위 기반 Hydration
   - 사용자가 클릭한 영역 먼저 hydrate
   - 댓글 로딩 중 헤더 클릭 → 헤더 먼저 hydrate

2. 스트리밍과 결합
   - HTML이 준비되는 대로 전송
   - JavaScript도 준비되는 대로 hydrate
   - 전체 로딩 완료를 기다릴 필요 없음

3. 점진적 사용자 경험
   - 페이지 일부가 먼저 인터랙티브
   - 전체 TTI(Time to Interactive) 개선

// [Streaming SSR + Selective Hydration 흐름]

1. 서버: Header HTML 생성 → 즉시 전송
2. 클라이언트: Header 표시 + Hydrate 시작
3. 서버: MainContent HTML 생성 → 전송
4. 클라이언트: MainContent 표시 + Hydrate
5. 서버: Comments 데이터 로드 중... (Suspense fallback 전송됨)
6. 클라이언트: Comments 위치에 Skeleton 표시
7. 서버: Comments HTML 완성 → 전송
8. 클라이언트: Skeleton → Comments로 교체 + Hydrate

// [Beyond Meet 웹 버전 적용 시]
// 무거운 컴포넌트를 Suspense로 감싸서 점진적 로딩
<Suspense fallback={<CallHistorySkeleton />}>
  <CallHistory />  {/* 많은 데이터 로드 */}
</Suspense>
```

---

#### Q49. React의 Fiber 아키텍처를 설명해주세요.

**모범 답변**:
```
Fiber는 React 16에서 도입된 새로운 재조정(Reconciliation) 알고리즘입니다.

[등장 배경: Stack Reconciler의 한계]

React 15 이하 (Stack Reconciler):
- 재귀적으로 컴포넌트 트리 순회
- 한번 시작하면 중단 불가능
- 긴 작업 → 메인 스레드 블로킹 → UI 멈춤

예시:
렌더링 시작 → [컴포넌트 A → B → C → D → ...] → 완료
             └─ 이 구간 동안 사용자 입력 무시

[Fiber의 핵심 아이디어]

1. 작업 단위화 (Unit of Work)
   - 각 컴포넌트 = 하나의 Fiber 노드
   - 작업을 작은 단위로 분할

2. 중단 및 재개 가능
   - 각 Fiber 작업 후 브라우저에 제어권 양보 가능
   - 높은 우선순위 작업이 끼어들 수 있음

3. 우선순위 시스템
   - 긴급: 사용자 입력, 애니메이션
   - 보통: 데이터 페칭 결과 반영
   - 낮음: 화면 밖 컴포넌트 렌더링

[Fiber 노드 구조]

// 각 컴포넌트마다 생성되는 Fiber 객체
interface Fiber {
  type: any;           // 컴포넌트 함수 또는 'div' 같은 문자열
  key: string | null;  // reconciliation용 키
  stateNode: any;      // DOM 노드 또는 클래스 인스턴스

  // 트리 구조 (연결 리스트)
  return: Fiber | null;   // 부모 Fiber
  child: Fiber | null;    // 첫 번째 자식 Fiber
  sibling: Fiber | null;  // 다음 형제 Fiber

  // 작업 관련
  pendingProps: any;      // 새로 들어온 props
  memoizedProps: any;     // 이전 렌더의 props
  memoizedState: any;     // 이전 렌더의 state
  updateQueue: any;       // 상태 업데이트 큐

  // 효과(Effect) 관련
  flags: Flags;           // 수행할 작업 (Placement, Update, Deletion)
  subtreeFlags: Flags;    // 자식 트리의 작업 플래그
}

[Fiber 작업 흐름: 2단계 처리]

1. Render Phase (중단 가능)
   - Fiber 트리 순회하며 변경사항 계산
   - 부수 효과(side effects) 수집
   - DOM 조작 없음 (메모리에서만 작업)

2. Commit Phase (중단 불가)
   - 계산된 변경사항을 실제 DOM에 반영
   - 생명주기 메서드 호출
   - 동기적으로 실행 (일관성 보장)

[Concurrent Rendering과의 관계]

Fiber 아키텍처가 있기에 Concurrent Rendering 가능:

// 작업 A 실행 중 높은 우선순위 B 발생
작업 A 시작 → [Fiber 1] → [Fiber 2] → B 발생!
             ↓
작업 A 중단 → 작업 B 실행 → 완료
             ↓
작업 A 재개 → [Fiber 3] → [Fiber 4] → 완료

// 이것이 useTransition, useDeferredValue의 동작 원리

[메모리 구조: Double Buffering]

current Fiber Tree  ←→  workInProgress Fiber Tree
(현재 화면에 표시)        (다음 렌더링 계산 중)

- 렌더링 완료 시 포인터만 교체 (빠른 전환)
- 오류 발생 시 current 유지 (안전한 롤백)
```

---

#### Q50. React Native에서 최신 React 기능을 어떻게 활용하나요?

**모범 답변**:
```typescript
// React Native는 React의 Concurrent Features를 점진적으로 지원하고 있습니다.

// [React Native의 새 아키텍처 (New Architecture)]

// 1. Fabric - 새로운 렌더링 시스템
// - C++로 작성된 새로운 UI 렌더러
// - Concurrent Rendering 지원
// - 동기적 레이아웃 측정 가능

// 2. TurboModules - 새로운 네이티브 모듈 시스템
// - Lazy loading (필요할 때만 로드)
// - 동기/비동기 네이티브 호출 선택 가능
// - 타입 안전성 향상

// 3. JSI (JavaScript Interface)
// - JavaScript와 네이티브 간 직접 통신
// - Bridge 제거 → 성능 향상
// - 동기적 네이티브 호출 가능

// [React 18 기능의 RN 지원 현황]

| 기능 | 지원 상태 | 비고 |
|------|----------|------|
| Automatic Batching | ✅ 지원 | 0.69+ |
| useTransition | ⚠️ 제한적 | New Architecture 필요 |
| useDeferredValue | ⚠️ 제한적 | New Architecture 필요 |
| Suspense (lazy) | ✅ 지원 | 코드 분할용 |
| Suspense (data) | ⚠️ 제한적 | 라이브러리 의존 |
| Server Components | ❌ 미지원 | 웹 전용 |

// [Beyond Meet에서 활용 가능한 최신 기능]

// 1. Automatic Batching (이미 동작 중)
const handleCallEnd = () => {
  setIsInCall(false);
  setCurrentSession(null);
  setCallDuration(0);
  // React Native 0.69+에서 자동 배칭
};

// 2. React.lazy로 화면 코드 분할
const AdminScreen = React.lazy(() => import('./screens/admin/AdminScreen'));

// 3. useSyncExternalStore (Zustand 내부 사용)
// 외부 스토어와 React 동기화에 최적화된 훅
// Zustand가 내부적으로 사용

// [New Architecture 활성화 방법]

// android/gradle.properties
newArchEnabled=true

// ios/Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '1'

// [New Architecture 활성화 시 이점]

1. Concurrent Features 완전 지원
   - useTransition으로 부드러운 화면 전환
   - useDeferredValue로 검색 최적화

2. 동기적 레이아웃 측정
   // 이전: 비동기로 measure 필요
   ref.current.measure((x, y, width, height) => { ... });

   // New Architecture: 동기적 측정 가능
   const { width, height } = ref.current.measureSync();

3. 빠른 네이티브 호출
   // TurboModules: JSI 기반 직접 호출
   const result = NativeModule.calculateSync(data);

// [Beyond Meet 마이그레이션 고려사항]

1. 의존성 호환성 확인
   - react-native-agora: New Architecture 지원 여부
   - 기타 네이티브 모듈 확인

2. 점진적 마이그레이션
   - Bridgeless Mode 비활성화로 호환성 유지 가능
   - 모든 라이브러리 준비 후 완전 전환

3. 성능 프로파일링
   - Flipper로 마이그레이션 전후 성능 비교
   - JavaScript Thread, UI Thread 부하 측정

// [실제 적용 예시: useTransition으로 검색 최적화]
const FriendsScreen = () => {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const { data: friends } = useFriends();

  const filteredFriends = useMemo(() =>
    friends?.filter(f => f.nickname.includes(query)) ?? [],
    [friends, query]
  );

  const handleSearch = (text: string) => {
    // New Architecture에서 완전 동작
    startTransition(() => {
      setQuery(text);
    });
  };

  return (
    <View>
      <SearchInput onChangeText={handleSearch} />
      {isPending && <ActivityIndicator />}
      <FriendsList friends={filteredFriends} />
    </View>
  );
};
```

---

## 준비 체크리스트

### 기술 스택
- [ ] React Native CLI vs Expo 선택 기준
- [ ] Zustand vs Redux 비교
- [ ] React Query 캐싱 전략 (staleTime, gcTime)
- [ ] TypeScript 제네릭, 유니온 타입 예시

### 아키텍처
- [ ] 3-tier 아키텍처 (Controller-Service-DB) 설명
- [ ] 싱글톤 패턴 적용 이유
- [ ] 이벤트 기반 vs 요청-응답 구분 기준
- [ ] Socket.io vs REST 사용 케이스

### 풀스택 경험
- [ ] 혼자 개발한 이유와 장점
- [ ] API 계약 설계 과정
- [ ] DB 스키마 설계 고려사항

### WebRTC & Agora
- [ ] WebRTC 핵심 개념 (P2P, STUN/TURN, ICE, SDP)
- [ ] Agora 선택 이유 (무료 티어, SDK 품질)
- [ ] Signaling 서버 역할
- [ ] 토큰 기반 채널 인증

### 서버 기초
- [ ] Express 미들웨어 개념
- [ ] Rate Limiting 필요성
- [ ] 트랜잭션 사용 사례
- [ ] JWT 인증 플로우

### AI 적용
- [ ] AI 모더레이션 파이프라인 설명
- [ ] Hugging Face API 연동 과정
- [ ] Graceful Degradation 구현

### 이메일 인증 시스템
- [ ] Pre-registration 이메일 인증 선택 이유
- [ ] Redis 기반 인증 코드 저장 (TTL, 시도 횟수 제한)
- [ ] Resend 서비스 연동
- [ ] 보안 고려사항 (Rate Limiting, 코드 만료)

### 다국어 지원 (i18n)
- [ ] i18next + react-i18next 설정
- [ ] Zustand persist로 언어 설정 저장
- [ ] 번역 파일 구조 (ko, en, ja)

### Socket 토큰 관리
- [ ] Socket 연결 시 토큰 자동 갱신 구현
- [ ] auth:token-refreshed 이벤트 흐름
- [ ] HTTP와 Socket 토큰 갱신 일관성

### 트러블슈팅
- [ ] iOS requestAnimationFrame 해결
- [ ] Socket 리스너 메모리 누수 방지 (WeakMap)
- [ ] Android 비디오 성능 최적화

### 프로젝트 전반
- [ ] Beyond Meet 프로젝트 구조 설명
- [ ] 3-Tier 매칭 알고리즘 설명
- [ ] 데이터 흐름 (매칭 → 통화 → 종료)

### 최신 React 기술
- [ ] Concurrent Rendering 개념 (Time Slicing, 우선순위)
- [ ] useTransition vs useDeferredValue 차이
- [ ] React Server Components (RSC) 이해
- [ ] Suspense 동작 원리 (Data Fetching, Streaming SSR)
- [ ] 자동 배칭 (Automatic Batching) 개념
- [ ] Hydration과 Selective Hydration
- [ ] Fiber 아키텍처 (작업 단위, 중단/재개)
- [ ] React Native New Architecture (Fabric, TurboModules, JSI)
