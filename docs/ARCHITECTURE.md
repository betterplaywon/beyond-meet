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
│  │ Services:    Auth, User, Match, Call, Admin, Moderation, Push  │ │
│  │ Socket.io:   실시간 매칭/통화 이벤트                             │ │
│  │ Hugging Face API: AI 콘텐츠 모더레이션                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────┬─────────────────┬─────────────────┬──────────────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│    Supabase      │ │  Upstash Redis   │ │  Firebase FCM    │
│   PostgreSQL     │ │  (10k 명령/일)    │ │  (푸시 알림)      │
│  + Storage (1GB) │ │                  │ │                  │
│   (500MB 무료)   │ │                  │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 폴더 구조

### Backend
```
backend/src/
├── controllers/    # auth, user, match, call, admin, moderation, agora
├── services/       # 비즈니스 로직
├── routes/         # API 라우트
├── middlewares/    # auth, error, rateLimit
├── sockets/        # Socket.io 핸들러
├── config/         # database, redis, firebase, supabase
└── utils/          # jwt, password, logger
```

### Mobile
```
mobile/src/
├── screens/        # auth/, home/, call/, profile/, admin/
├── components/     # common/, call/, moderation/
├── navigation/     # RootNavigator, AuthNavigator, MainNavigator
├── services/       # api, socket, push, agora
├── hooks/          # useAuth, useSocket, useFriends, useProfile
├── store/          # Zustand (authStore, callStore)
└── config/         # env.ts
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React Native, TypeScript, Zustand, React Query |
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL (Supabase), Redis (Upstash) |
| Video | Agora SDK |
| Push | Firebase Cloud Messaging |
| AI | Hugging Face API (NSFW 감지) |

---

## Redis 키 구조

```
user:{userId}:online              → 온라인 상태 (TTL: 1시간)
user:{userId}:socketId            → Socket ID
matching:queue                    → 매칭 대기열 (Set)
session:{sessionId}:caller        → 세션 caller ID
recent:call:{userId1}:{userId2}   → 최근 통화 (TTL: 30분)
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

- [CODING_RULES.md](CODING_RULES.md) - Controller/Service 패턴, 에러 핸들링
- [SOCKET_EVENTS.md](SOCKET_EVENTS.md) - Socket.io 이벤트 상세 페이로드
- [API_SPECIFICATION.md](API_SPECIFICATION.md) - REST API 엔드포인트
