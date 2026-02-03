# 기술 아키텍처

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                        클라이언트 레이어                              │
│  ┌──────────────────┐                    ┌──────────────────┐       │
│  │   iOS / Android   │◄──── Agora SDK ───►│     영상 통화     │       │
│  │  (React Native)   │                    │   (10k분/월 무료) │       │
│  └─────────┬────────┘                    └──────────────────┘       │
└────────────┼────────────────────────────────────────────────────────┘
             │ REST API + Socket.io
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     백엔드 (Render.com 무료)                         │
│  Node.js + Express + TypeScript                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Controllers: Auth, User, Match, Call, Admin, Moderation, Agora │ │
│  │ Services:    Auth, User, Match, Call, Admin, Moderation, Push, │ │
│  │              Storage, Email                                     │ │
│  │ Socket.io:   실시간 매칭/통화 이벤트 + 토큰 자동 갱신            │ │
│  │ Hugging Face API: AI 콘텐츠 모더레이션                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────┬─────────────────┬─────────────────┬─────────────────┬────────┘
       │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼
┌──────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌─────────┐
│   Supabase   │ │  Upstash Redis   │ │  Firebase FCM    │ │ Resend  │
│  PostgreSQL  │ │  (10k 명령/일)    │ │  (푸시 알림)      │ │ (이메일) │
│ + Storage    │ │                  │ │                  │ │100건/일 │
│ (500MB 무료) │ │                  │ │                  │ │         │
└──────────────┘ └──────────────────┘ └──────────────────┘ └─────────┘
```

---

## 폴더 구조

### Backend
```
backend/src/
├── controllers/        # Request handlers (auth, user, friends, call, admin, moderation, agora, push)
├── services/           # Business logic
│   ├── auth-service.ts
│   ├── user-service.ts
│   ├── match-service.ts
│   ├── call-service.ts
│   ├── admin-service.ts
│   ├── moderation-service.ts
│   ├── push-service.ts
│   ├── storage-service.ts    # Supabase Storage 파일 업로드/삭제
│   └── email-service.ts      # 이메일 인증 (Resend)
├── routes/             # API routes
│   ├── auth-routes.ts
│   ├── user-routes.ts
│   ├── friends-routes.ts
│   ├── call-routes.ts
│   ├── agora-routes.ts
│   ├── push-routes.ts
│   ├── admin-routes.ts
│   └── moderation-routes.ts
├── middlewares/
│   ├── auth.ts             # JWT 인증
│   ├── errorHandler.ts     # 글로벌 에러 핸들러
│   ├── rateLimiter.ts      # Rate limiting
│   ├── admin.ts            # 관리자 권한 체크
│   └── upload.ts           # Multer 파일 업로드
├── sockets/
│   └── match-handler.ts    # Socket.io 매칭/통화 이벤트
├── config/
│   ├── database.ts         # Prisma client
│   ├── redis.ts            # Upstash Redis
│   ├── firebase.ts         # FCM
│   ├── supabase.ts         # Supabase client
│   └── resend.ts           # Resend 이메일 서비스
└── utils/
    ├── jwt.ts              # JWT 생성/검증
    ├── password.ts         # bcrypt 해싱
    ├── validation.ts       # Zod 스키마
    └── image-validator.ts  # AI 모더레이션 이미지 검증
```

### Mobile
```
mobile/src/
├── screens/            # Screen components by feature
│   ├── auth/           # LoginScreen, RegisterScreen, SplashScreen, WelcomeScreen, EmailVerificationScreen
│   ├── home/           # HomeScreen
│   ├── match/          # MatchingScreen
│   ├── call/           # VideoCallScreen, CallHistoryScreen, CallEndScreen
│   ├── profile/        # ProfileScreen, ProfileEditScreen, SettingsScreen, ChangePasswordScreen, LegalContentScreen
│   ├── friends/        # FriendsScreen
│   └── admin/          # AdminScreen, ModerationLogsScreen, ReportsScreen
├── components/
│   ├── common/         # Avatar, Button, Input, NotificationPermissionModal, Picker
│   │   └── buttons/    # PrimaryButton, SecondaryButton 등
│   ├── call/           # CallControls, CallTimer, IncomingCallModal
│   └── moderation/     # ModerationWarningModal
├── navigation/
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   ├── MainNavigator.tsx
│   └── AdminNavigator.tsx
├── services/
│   ├── api.ts              # Axios instance with interceptors
│   ├── socketService.ts    # Socket.io client
│   ├── pushService.ts      # FCM registration
│   ├── notificationService.ts
│   ├── userApi.ts
│   ├── callApi.ts
│   ├── friendsApi.ts
│   └── adminApi.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useSocket.ts
│   ├── useFriends.ts
│   ├── useProfile.ts
│   ├── useCallHistory.ts
│   ├── useAdmin.ts
│   ├── usePushNotifications.ts
│   ├── useNotificationSetup.ts
│   ├── useFriendStatusSync.ts
│   ├── useEmailVerification.ts  # 이메일 인증 훅
│   └── call/                    # 통화 관련 훅
│       ├── useAgoraEngine.ts
│       ├── useCallEnd.ts
│       ├── useCallSocketEvents.ts
│       ├── useCallTimer.ts
│       └── useModeration.ts
├── store/
│   ├── authStore.ts        # 인증 상태 (Zustand)
│   ├── callStore.ts        # 통화 상태 (Zustand)
│   ├── languageStore.ts    # 언어 설정 (Zustand)
│   └── index.ts
├── i18n/                   # 다국어 지원
│   ├── index.ts
│   └── locales/
│       ├── ko.json         # 한국어
│       ├── en.json         # 영어
│       └── ja.json         # 일본어
├── api/
│   ├── auth.api.ts
│   ├── agora.api.ts
│   └── client.ts
├── constants/
│   └── queryKeys.ts        # React Query 키 팩토리
├── styles/
│   └── theme.ts            # 디자인 시스템 (색상, 간격, 타이포그래피)
├── config/
│   └── env.ts              # 환경변수 (API_BASE_URL, AGORA_APP_ID)
└── @types/
    └── index.ts            # TypeScript 타입 정의
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React Native, TypeScript, Zustand, React Query (@tanstack/react-query), i18next |
| Backend | Node.js, Express, TypeScript, Prisma, Zod |
| Database | PostgreSQL (Supabase), Redis (Upstash) |
| Storage | Supabase Storage (프로필 사진) |
| Video | Agora SDK |
| Push | Firebase Cloud Messaging |
| Email | Resend (이메일 인증) |
| AI | Hugging Face API (NSFW 감지: Falconsai/nsfw_image_detection) |

---

## Redis 키 구조

```
user:{userId}:online              → 온라인 상태 (TTL: 1시간)
user:{userId}:socketId            → Socket ID
matching:queue                    → 매칭 대기열 (Set)
session:{sessionId}:caller        → 세션 caller ID
recent:call:{userId1}:{userId2}   → 최근 통화 (TTL: 30분)
moderation:quota:{year}-{month}   → AI 모더레이션 월간 사용량
email_verification:{email}        → 이메일 인증 코드 (TTL: 10분)
email_verified:{email}            → 인증 완료 상태 (TTL: 30분)
```

---

## 인증 플로우

```
┌─────────────┐                    ┌─────────────┐
│   Client    │                    │   Server    │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │─── POST /auth/login ────────────►│
       │    { email, password }           │
       │                                  │
       │◄── 200 OK ───────────────────────│
       │    { accessToken, refreshToken } │
       │                                  │
       │─── GET /users/me ───────────────►│
       │    Authorization: Bearer {token} │
       │                                  │
       │◄── 200 OK ───────────────────────│
       │    { user data }                 │
       │                                  │
       │─── (Token expired) ─────────────►│
       │◄── 401 TOKEN_EXPIRED ────────────│
       │                                  │
       │─── POST /auth/refresh ──────────►│
       │    { refreshToken }              │
       │                                  │
       │◄── 200 OK ───────────────────────│
       │    { new accessToken }           │
```

- **Access Token**: 1시간 유효, 요청마다 포함
- **Refresh Token**: 7일 유효, 토큰 갱신용

---

## Socket.io 연결 플로우

```
┌─────────────┐                    ┌─────────────┐
│   Client    │                    │   Server    │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │─── Connect ─────────────────────►│
       │    auth: { token: accessToken,   │
       │            refreshToken }        │
       │                                  │
       │                    authenticateSocket()
       │                    - 토큰 검증
       │                    - (만료 시) refreshToken으로 자동 갱신
       │                    - userId를 socket에 저장
       │                    - user.onlineStatus = ONLINE
       │                                  │
       │◄── 'connect' ────────────────────│
       │                                  │
       │◄── 'auth:token-refreshed' ───────│ (토큰 자동 갱신 시)
       │    { accessToken, refreshToken } │
       │                                  │
       │                    setupMatchHandlers()
       │                    - socket.join(userId)
       │                    - broadcastStatusToFriends(ONLINE)
       │                                  │
       │                    [On Disconnect]
       │                    - removeFromMatchQueue(userId)
       │                    - user.onlineStatus = OFFLINE
       │                    - broadcastStatusToFriends(OFFLINE)
```

---

## 데이터베이스 관계도

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │ match_sessions│      │ call_records │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──┬───│ userId1 (FK) │       │ id (PK)      │
│ email        │   │   │ userId2 (FK) │───────│ sessionId(FK)│
│ passwordHash │   │   │ channelName  │       │ callerId(FK) │
│ nickname     │   │   │ status       │       │ receiverId(FK│
│ gender       │   │   │ matchType    │       │ status       │
│ onlineStatus │   │   └──────────────┘       │ duration     │
└──────┬───────┘   │                          └──────────────┘
       │           │
       │           │   ┌──────────────┐
       │           └───│ friendships  │
       │               ├──────────────┤
       │               │ userId (FK)  │
       │               │ friendId (FK)│
       │               └──────────────┘
       │
       │   ┌──────────────┐       ┌──────────────┐
       └───│ block_lists  │       │device_tokens │
           ├──────────────┤       ├──────────────┤
           │ userId (FK)  │       │ userId (FK)  │
           │ blockedId(FK)│       │ token        │
           └──────────────┘       │ platform     │
                                  └──────────────┘

┌──────────────┐       ┌───────────────────────┐
│ invite_codes │       │content_moderation_logs│
├──────────────┤       ├───────────────────────┤
│ id (PK)      │       │ id (PK)               │
│ code         │       │ sessionId (FK)        │
│ maxUses      │       │ userId (FK)           │
│ usedCount    │       │ confidence            │
│ isActive     │       │ actionTaken           │
└──────────────┘       └───────────────────────┘

┌──────────────┐
│   reports    │
├──────────────┤
│ reporterId   │
│ reportedId   │
│ reason       │
│ isAiGenerated│
│ status       │
└──────────────┘
```

---

## 상세 문서 참조

- [CODING_RULES.md](CODING_RULES.md) - Controller/Service 패턴, 에러 핸들링, Zod 검증
- [SOCKET_EVENTS.md](SOCKET_EVENTS.md) - Socket.io 이벤트 상세 페이로드
- [API_SPECIFICATION.md](API_SPECIFICATION.md) - REST API 엔드포인트
- [BUILD_DEPLOYMENT_GUIDE.md](BUILD_DEPLOYMENT_GUIDE.md) - iOS/Android 빌드 및 배포
