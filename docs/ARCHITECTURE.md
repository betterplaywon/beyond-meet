# 기술 아키텍처 문서

## WebRTC 기반 영상 통화 데이팅 앱

---

## 📋 문서 정보

- **작성일**: 2025-11-04
- **버전**: 1.2.0
- **최종 업데이트**: 2025-12-01
- **대상**: 개발팀, 기술 리더
- **목적**: 시스템 아키텍처 설계 및 기술 스택 상세 가이드
- **구현 상태**: 백엔드 100% 완료, 프론트엔드 100% 완료

---

## 🎯 1. 아키텍처 개요

### 1.1 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                          클라이언트 레이어                            │
│                                                                       │
│  ┌──────────────────┐                    ┌──────────────────┐       │
│  │   iOS 앱          │                    │   Android 앱      │       │
│  │  (React Native)  │                    │  (React Native)  │       │
│  │                  │                    │                  │       │
│  │  - Zustand       │                    │  - Zustand       │       │
│  │  - React Nav v6  │                    │  - React Nav v6  │       │
│  │  - TypeScript    │                    │  - TypeScript    │       │
│  └─────────┬────────┘                    └─────────┬────────┘       │
│            │                                       │                 │
└────────────┼───────────────────────────────────────┼─────────────────┘
             │                                       │
             │         ┌─────────────────┐           │
             └─────────►  Agora SDK      ◄───────────┘
                       │  (영상 통화)     │
                       └─────────────────┘
             │                                       │
             │                                       │
             ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway Layer                            │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Render.com (무료 호스팅)                          │   │
│  │                                                               │   │
│  │  Node.js + Express + TypeScript                              │   │
│  │                                                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │  Auth    │  │  User    │  │  Match   │  │  Call    │    │   │
│  │  │  Service │  │  Service │  │  Service │  │  Service │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │     Moderation       │  │          Admin           │   │   │
│  │  │      Service         │  │         Service          │   │   │
│  │  │  (AI 콘텐츠 분석)     │  │     (관리자 기능)        │   │   │
│  │  └──────────────────────┘  └──────────────────────────┘   │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │             Socket.io (실시간 통신)                     │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │          Agora Token Generator Service                 │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
             │                  │                  │
             │                  │                  │
             ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         데이터 레이어                                 │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │  Supabase    │    │   Upstash    │    │  Supabase    │          │
│  │  PostgreSQL  │    │    Redis     │    │   Storage    │          │
│  │              │    │              │    │              │          │
│  │ - Users      │    │ - Sessions   │    │ - Profile    │          │
│  │ - Matches    │    │ - Online     │    │   Photos     │          │
│  │ - Calls      │    │   Status     │    │ - Assets     │          │
│  │ - Friends    │    │ - Queue      │    │              │          │
│  │              │    │              │    │              │          │
│  │ (500MB 무료) │    │(10k 무료/일) │    │  (1GB 무료)  │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
             │
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    외부 서비스 레이어                                 │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Firebase   │    │    Agora     │    │    Sentry    │          │
│  │     FCM      │    │  Video SDK   │    │    (에러)     │          │
│  │  (푸시 알림)  │    │ (영상 통화)   │    │  (트래킹)     │          │
│  │              │    │              │    │              │          │
│  │  (완전 무료)  │    │(10k분 무료)  │    │  (무료 플랜)  │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Hugging Face API                           │   │
│  │              (AI 콘텐츠 모더레이션 - 무료 tier)                │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 아키텍처 패턴

**전체 패턴**: **3-Tier Architecture**

- **Presentation Layer**: React Native (iOS/Android)
- **Application Layer**: Node.js + Express (REST API + WebSocket)
- **Data Layer**: PostgreSQL + Redis + Object Storage

**백엔드 패턴**: **Service-Oriented Architecture (SOA)**

- 각 도메인별 독립적인 서비스 모듈
- 명확한 책임 분리 (SRP)
- 재사용 가능한 공통 유틸리티

---

## 🖥️ 2. 프론트엔드 아키텍처 (React Native)

### 2.1 기술 스택

```json
{
  "core": {
    "react-native": "^0.73.0",
    "react": "^18.2.0",
    "typescript": "^5.3.3"
  },
  "state-management": {
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.17.0"
  },
  "navigation": {
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@react-navigation/bottom-tabs": "^6.5.11"
  },
  "video": {
    "react-native-agora": "^4.2.6"
  },
  "networking": {
    "axios": "^1.6.2",
    "socket.io-client": "^4.6.1"
  },
  "ui": {
    "react-native-vector-icons": "^10.0.3",
    "react-native-linear-gradient": "^2.8.3",
    "react-native-toast-message": "^2.2.0"
  },
  "media": {
    "react-native-image-picker": "^7.1.0",
    "react-native-permissions": "^4.1.0"
  },
  "push": {
    "@react-native-firebase/app": "^19.0.1",
    "@react-native-firebase/messaging": "^19.0.1"
  },
  "utils": {
    "date-fns": "^3.0.6",
    "react-hook-form": "^7.49.2",
    "zod": "^3.22.4"
  }
}
```

### 2.2 폴더 구조

```
react-native-dating-app/
├── android/                    # Android 네이티브 코드
├── ios/                        # iOS 네이티브 코드
├── src/
│   ├── @types/                 # TypeScript 타입 정의
│   │   ├── navigation.ts
│   │   ├── user.ts
│   │   ├── call.ts
│   │   └── env.d.ts
│   │
│   ├── api/                    # API 클라이언트
│   │   ├── client.ts           # Axios 인스턴스
│   │   ├── auth.api.ts
│   │   ├── user.api.ts
│   │   ├── match.api.ts
│   │   ├── call.api.ts
│   │   └── agora.api.ts
│   │
│   ├── assets/                 # 정적 리소스
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── components/             # 재사용 가능한 컴포넌트
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Loader.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── profile/
│   │   │   ├── ProfileCard.tsx
│   │   │   └── PhotoGrid.tsx
│   │   ├── call/
│   │   │   ├── VideoView.tsx
│   │   │   ├── CallControls.tsx
│   │   │   ├── CallTimer.tsx
│   │   │   └── IncomingCallModal.tsx
│   │   └── match/
│   │       ├── MatchCard.tsx
│   │       └── MatchingLoader.tsx
│   │
│   ├── config/                 # 설정 파일
│   │   ├── env.ts              # 환경 변수
│   │   ├── constants.ts        # 상수
│   │   └── agora.config.ts
│   │
│   ├── hooks/                  # Custom Hooks
│   │   ├── useAuth.ts
│   │   ├── useAgora.ts
│   │   ├── useSocket.ts
│   │   ├── usePermissions.ts
│   │   └── useImagePicker.ts
│   │
│   ├── navigation/             # 네비게이션
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   └── types.ts
│   │
│   ├── screens/                # 화면 컴포넌트
│   │   ├── auth/
│   │   │   ├── SplashScreen.tsx
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── MatchingScreen.tsx
│   │   │   └── CallScreen.tsx
│   │   ├── friends/
│   │   │   ├── FriendsListScreen.tsx
│   │   │   └── FriendProfileScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── EditProfileScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── call/
│   │   │   ├── IncomingCallScreen.tsx
│   │   │   ├── VideoCallScreen.tsx
│   │   │   └── CallEndScreen.tsx
│   │   └── admin/               # 관리자 화면 (ADMIN role 전용)
│   │       ├── AdminScreen.tsx           # 관리자 대시보드
│   │       ├── ModerationLogsScreen.tsx  # AI 모더레이션 로그
│   │       └── ReportsScreen.tsx         # 사용자 신고 목록
│   │
│   ├── services/               # 비즈니스 로직 서비스
│   │   ├── api.ts              # Axios 클라이언트
│   │   ├── agoraService.ts     # Agora SDK 래퍼
│   │   ├── socketService.ts    # Socket.io 관리
│   │   ├── pushService.ts      # FCM 관리
│   │   ├── storageService.ts   # AsyncStorage 관리
│   │   └── moderationService.ts # 콘텐츠 모더레이션 API
│   │
│   ├── store/                  # Zustand 상태 관리
│   │   ├── authStore.ts        # 인증 상태
│   │   ├── userStore.ts        # 사용자 정보
│   │   ├── callStore.ts        # 통화 세션 상태
│   │   └── matchStore.ts       # 매칭 상태
│   │
│   ├── styles/                 # 스타일 관련
│   │   ├── theme.ts            # 테마 (색상, 폰트 등)
│   │   ├── spacing.ts
│   │   └── typography.ts
│   │
│   └── utils/                  # 유틸리티 함수
│       ├── validation.ts
│       ├── dateFormat.ts
│       ├── errorHandler.ts
│       └── logger.ts
│
├── .env                        # 환경 변수
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── package.json
└── README.md
```

### 2.4 상태 관리 (Zustand + React Query)

**Zustand** - 클라이언트 상태 관리 (UI 상태, 세션)
**React Query** - 서버 상태 관리 (API 데이터, 캐싱)

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (access: string, refresh: string) => void;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true }),
      clearTokens: () =>
        set({ accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// src/store/callStore.ts
import { create } from 'zustand';

interface CallState {
  currentSession: CallSession | null;
  incomingCall: CallData | null;
  setCurrentSession: (session: CallSession | null) => void;
  setIncomingCall: (call: CallData | null) => void;
}

export const useCallStore = create<CallState>((set) => ({
  currentSession: null,
  incomingCall: null,
  setCurrentSession: (session) => set({ currentSession: session }),
  setIncomingCall: (call) => set({ incomingCall: call }),
}));

// React Query 사용 예시
// src/hooks/useUser.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { userApi } from '../services/api';

export const useMyProfile = () => {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: userApi.getMyProfile,
  });
};

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
};
```

### 2.5 네비게이션 구조

```typescript
// src/navigation/types.ts
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  IncomingCall: { callData: CallData };
  VideoCall: { channelName: string; token: string; receiverId: string };
};

export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Friends: undefined;
  Profile: undefined;
};
```

### 2.6 Agora 통합 (Custom Hook)

```typescript
// src/hooks/useAgora.ts
import { useEffect, useState, useRef } from "react";
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from "react-native-agora";
import { AGORA_APP_ID } from "../config/env";

export const useAgora = () => {
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const engineRef = useRef<IRtcEngine | null>(null);

  useEffect(() => {
    const initAgora = async () => {
      const engine = createAgoraRtcEngine();
      await engine.initialize({ appId: AGORA_APP_ID });

      engine.registerEventHandler({
        onJoinChannelSuccess: () => {
          console.log("Joined channel successfully");
          setIsJoined(true);
        },
        onUserJoined: (connection, uid) => {
          console.log("Remote user joined:", uid);
          setRemoteUid(uid);
        },
        onUserOffline: (connection, uid) => {
          console.log("Remote user left:", uid);
          setRemoteUid(null);
        },
      });

      await engine.enableVideo();
      engineRef.current = engine;
    };

    initAgora();

    return () => {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
    };
  }, []);

  const joinChannel = async (
    token: string,
    channelName: string,
    uid: number = 0
  ) => {
    await engineRef.current?.joinChannel(token, channelName, uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });
  };

  const leaveChannel = async () => {
    await engineRef.current?.leaveChannel();
    setIsJoined(false);
    setRemoteUid(null);
  };

  const toggleMute = async () => {
    await engineRef.current?.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = async () => {
    await engineRef.current?.muteLocalVideoStream(!isVideoDisabled);
    setIsVideoDisabled(!isVideoDisabled);
  };

  const switchCamera = async () => {
    await engineRef.current?.switchCamera();
    setIsFrontCamera(!isFrontCamera);
  };

  const enableVirtualBackground = async (
    blurDegree: "low" | "medium" | "high"
  ) => {
    // Agora Virtual Background API
    // 구현 세부사항은 Agora 문서 참조
  };

  return {
    engine: engineRef.current,
    isJoined,
    remoteUid,
    isMuted,
    isVideoDisabled,
    isFrontCamera,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleVideo,
    switchCamera,
    enableVirtualBackground,
  };
};
```

---

## ⚙️ 3. 백엔드 아키텍처 (Node.js + Express)

### 3.1 기술 스택

```json
{
  "core": {
    "node": "^20.10.0",
    "express": "^4.18.2",
    "typescript": "^5.3.3"
  },
  "database": {
    "@prisma/client": "^5.7.1",
    "prisma": "^5.7.1"
  },
  "cache": {
    "@upstash/redis": "^1.28.0"
  },
  "auth": {
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  },
  "validation": {
    "zod": "^3.22.4",
    "express-validator": "^7.0.1"
  },
  "realtime": {
    "socket.io": "^4.6.1"
  },
  "video": {
    "agora-token": "^2.0.3"
  },
  "push": {
    "firebase-admin": "^12.0.0"
  },
  "utils": {
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "winston": "^3.11.0"
  }
}
```

### 3.2 폴더 구조

```
backend/
├── prisma/
│   ├── schema.prisma           # 데이터베이스 스키마
│   └── migrations/             # 마이그레이션 파일
│
├── src/
│   ├── @types/                 # TypeScript 타입 정의
│   │   ├── express.d.ts
│   │   └── models.ts
│   │
│   ├── config/                 # 설정 파일
│   │   ├── env.ts              # 환경 변수 관리
│   │   ├── database.ts         # Prisma 클라이언트
│   │   ├── redis.ts            # Upstash Redis 클라이언트
│   │   ├── firebase.ts         # Firebase Admin SDK
│   │   └── agora.ts            # Agora 설정
│   │
│   ├── controllers/            # 컨트롤러 (요청 처리)
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── match.controller.ts
│   │   ├── call.controller.ts
│   │   ├── agora.controller.ts
│   │   ├── admin.controller.ts       # 관리자 API
│   │   └── moderation.controller.ts  # AI 모더레이션 API
│   │
│   ├── middlewares/            # 미들웨어
│   │   ├── auth.middleware.ts  # JWT 인증
│   │   ├── error.middleware.ts # 에러 핸들링
│   │   ├── validation.middleware.ts
│   │   └── rateLimit.middleware.ts
│   │
│   ├── routes/                 # 라우트 정의
│   │   ├── index.ts            # 메인 라우터
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── match.routes.ts
│   │   ├── call.routes.ts
│   │   ├── agora.routes.ts
│   │   ├── admin.routes.ts          # 관리자 라우트
│   │   └── moderation.routes.ts     # 모더레이션 라우트
│   │
│   ├── services/               # 비즈니스 로직
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── match.service.ts
│   │   ├── call.service.ts
│   │   ├── agora.service.ts
│   │   ├── push.service.ts
│   │   ├── storage.service.ts
│   │   ├── admin.service.ts          # 관리자 서비스
│   │   └── moderation.service.ts     # AI 모더레이션 서비스 (Hugging Face)
│   │
│   ├── utils/                  # 유틸리티 함수
│   │   ├── jwt.util.ts
│   │   ├── hash.util.ts
│   │   ├── validator.util.ts
│   │   ├── logger.util.ts
│   │   └── error.util.ts
│   │
│   ├── sockets/                # Socket.io 핸들러
│   │   ├── index.ts            # Socket.io 서버 설정
│   │   ├── auth.socket.ts
│   │   ├── match.socket.ts
│   │   └── call.socket.ts
│   │
│   ├── app.ts                  # Express 앱 설정
│   └── server.ts               # 서버 시작
│
├── .env                        # 환경 변수
├── .env.example
├── .gitignore
├── tsconfig.json
├── package.json
└── README.md
```

### 3.3 Express 앱 구조

```typescript
// src/app.ts
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { logger } from "./utils/logger.util";

const createApp = (): Application => {
  const app = express();

  // 보안 헤더
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
      credentials: true,
    })
  );

  // Body Parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(morgan("combined", { stream: logger.stream }));

  // Health Check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use("/api", routes);

  // Error Handling
  app.use(errorMiddleware);

  return app;
};

export default createApp;
```

```typescript
// src/server.ts
import http from "http";
import createApp from "./app";
import { initializeSocket } from "./sockets";
import { logger } from "./utils/logger.util";

const PORT = process.env.PORT || 3000;

const app = createApp();
const server = http.createServer(app);

// Socket.io 초기화
initializeSocket(server);

server.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
});

// Graceful Shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});
```

### 3.4 서비스 레이어 예시

```typescript
// src/services/match.service.ts
import { prisma } from "../config/database";
import { redis } from "../config/redis";
import { MatchType, MatchStatus } from "@prisma/client";
import { generateChannelName } from "../utils/agora.util";

export class MatchService {
  /**
   * 랜덤 매칭 요청 처리
   */
  async findRandomMatch(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // 필터 조건에 맞는 온라인 사용자 찾기
    const matchingQueue = await redis.smembers("matching:queue");

    for (const candidateId of matchingQueue) {
      if (candidateId === userId) continue;

      const candidate = await prisma.user.findUnique({
        where: { id: candidateId },
      });
      if (!candidate) continue;

      // 필터링 로직
      if (this.isMatchCompatible(user, candidate)) {
        // 매칭 성공
        await redis.srem("matching:queue", candidateId);

        const session = await this.createMatchSession(
          userId,
          candidateId,
          "RANDOM"
        );
        return { matched: true, session, partner: candidate };
      }
    }

    // 매칭 대기열에 추가
    await redis.sadd("matching:queue", userId);
    return { matched: false };
  }

  /**
   * 선택 매칭 (친구에게 통화 요청)
   */
  async requestDirectMatch(callerId: string, receiverId: string) {
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) throw new Error("Receiver not found");

    // 온라인 상태 확인
    const isOnline = await redis.get(`user:${receiverId}:online`);
    if (!isOnline) throw new Error("Receiver is offline");

    // 매칭 세션 생성
    const session = await this.createMatchSession(
      callerId,
      receiverId,
      "DIRECT"
    );

    return session;
  }

  /**
   * 매칭 세션 생성
   */
  private async createMatchSession(
    userId1: string,
    userId2: string,
    matchType: MatchType
  ) {
    const channelName = generateChannelName();

    const session = await prisma.matchSession.create({
      data: {
        userId1,
        userId2,
        channelName,
        matchType,
        status: "PENDING",
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    return session;
  }

  /**
   * 필터링 로직
   */
  private isMatchCompatible(user: any, candidate: any): boolean {
    // 성별 필터
    if (user.preferredGender !== candidate.gender) return false;

    // 나이 필터
    const candidateAge = this.calculateAge(candidate.birthDate);
    if (candidateAge < user.minAge || candidateAge > user.maxAge) return false;

    // 국가 필터
    if (!user.preferredCountries.includes(candidate.country)) return false;

    // 최근 통화한 사용자 제외 (30분)
    // TODO: Redis에서 체크

    return true;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }
}

export const matchService = new MatchService();
```

### 3.5 Socket.io 구현

```typescript
// src/sockets/index.ts
import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt.util";
import { redis } from "../config/redis";
import { logger } from "../utils/logger.util";

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
      credentials: true,
    },
  });

  // 인증 미들웨어
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId;
    logger.info(`User connected: ${userId}`);

    // 온라인 상태 업데이트
    await redis.set(`user:${userId}:online`, "1", { ex: 3600 });
    await redis.set(`user:${userId}:socketId`, socket.id);

    // 매칭 요청
    socket.on("match:request", async (data) => {
      // 매칭 로직 처리
      // ...
    });

    // 통화 수락
    socket.on("call:accept", async (data) => {
      const { sessionId } = data;
      // 통화 수락 처리
      // ...
      const callerId = await redis.get(`session:${sessionId}:caller`);
      const callerSocketId = await redis.get(`user:${callerId}:socketId`);

      if (callerSocketId) {
        io.to(callerSocketId).emit("call:accepted", { sessionId });
      }
    });

    // 통화 거절
    socket.on("call:reject", async (data) => {
      const { sessionId } = data;
      // 거절 처리
      // ...
    });

    // 연결 해제
    socket.on("disconnect", async () => {
      logger.info(`User disconnected: ${userId}`);
      await redis.del(`user:${userId}:online`);
      await redis.del(`user:${userId}:socketId`);
    });
  });

  return io;
};
```

### 3.6 Agora Token 생성

```typescript
// src/services/agora.service.ts
import { RtcTokenBuilder, RtcRole } from "agora-token";
import { AGORA_APP_ID, AGORA_APP_CERTIFICATE } from "../config/agora";

export class AgoraService {
  /**
   * RTC Token 생성
   */
  generateRtcToken(channelName: string, uid: number = 0): string {
    const expirationTimeInSeconds = 3600; // 1시간
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    return token;
  }

  /**
   * 채널명 생성 (고유)
   */
  generateChannelName(): string {
    return `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const agoraService = new AgoraService();
```

---

## 🗄️ 4. 데이터베이스 설계

### 4.1 Prisma Schema (이미 PRD에 포함됨)

PRD 섹션 5.2 참조

### 4.2 인덱스 전략

```prisma
model User {
  // ...

  @@index([email])
  @@index([onlineStatus])
  @@index([country, gender, onlineStatus])
}

model MatchSession {
  // ...

  @@index([userId1, createdAt])
  @@index([userId2, createdAt])
  @@index([status, createdAt])
  @@index([channelName])
}

model CallRecord {
  // ...

  @@index([callerId, createdAt])
  @@index([receiverId, createdAt])
  @@index([status, createdAt])
}
```

### 4.3 Redis 사용 전략

**키 네이밍 컨벤션:**

```
user:{userId}:online              → 온라인 상태 (TTL: 1시간)
user:{userId}:socketId            → Socket ID 매핑
matching:queue                    → 매칭 대기열 (Set)
session:{sessionId}:caller        → 세션의 caller ID
session:{sessionId}:receiver      → 세션의 receiver ID
recent:call:{userId1}:{userId2}   → 최근 통화 기록 (TTL: 30분)
```

**사용 사례:**

1. **온라인 상태 관리**

   ```typescript
   // 온라인 설정
   await redis.set(`user:${userId}:online`, "1", { ex: 3600 });

   // 온라인 체크
   const isOnline = await redis.get(`user:${userId}:online`);
   ```

2. **매칭 대기열**

   ```typescript
   // 대기열 추가
   await redis.sadd("matching:queue", userId);

   // 대기열 조회
   const queue = await redis.smembers("matching:queue");

   // 대기열 제거
   await redis.srem("matching:queue", userId);
   ```

3. **세션 관리**
   ```typescript
   // 세션 정보 저장
   await redis.set(`session:${sessionId}:caller`, callerId, { ex: 600 });
   await redis.set(`session:${sessionId}:receiver`, receiverId, { ex: 600 });
   ```

---

## 🔒 5. 보안 아키텍처

### 5.1 인증 플로우

```
┌─────────┐                  ┌─────────┐                 ┌─────────┐
│  Client │                  │  Server │                 │   DB    │
└────┬────┘                  └────┬────┘                 └────┬────┘
     │                            │                           │
     │  POST /api/auth/login      │                           │
     │  { email, password }       │                           │
     ├───────────────────────────>│                           │
     │                            │  Query user by email      │
     │                            ├──────────────────────────>│
     │                            │                           │
     │                            │  Return user + hash       │
     │                            │<──────────────────────────┤
     │                            │                           │
     │                            │  bcrypt.compare()         │
     │                            │  (비밀번호 검증)          │
     │                            │                           │
     │  200 OK                    │                           │
     │  { accessToken,            │                           │
     │    refreshToken,           │                           │
     │    user }                  │                           │
     │<───────────────────────────┤                           │
     │                            │                           │
     │  Store tokens in           │                           │
     │  AsyncStorage              │                           │
     │                            │                           │
     │  Subsequent API calls      │                           │
     │  Authorization: Bearer     │                           │
     │  {accessToken}             │                           │
     ├───────────────────────────>│                           │
     │                            │  Verify JWT               │
     │                            │  (미들웨어)               │
     │                            │                           │
     │  200 OK + Data             │                           │
     │<───────────────────────────┤                           │
```

### 5.2 JWT 토큰 전략

**Access Token:**

- 유효 기간: 1시간
- Payload: `{ userId, email, iat, exp }`
- 헤더에 포함: `Authorization: Bearer {token}`

**Refresh Token:**

- 유효 기간: 7일
- DB에 해시값 저장
- `/api/auth/refresh` 엔드포인트로 갱신

```typescript
// src/utils/jwt.util.ts
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../config/env";

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
```

### 5.3 API Rate Limiting

```typescript
// src/middlewares/rateLimit.middleware.ts
import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: "Too many requests, please try again later.",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 로그인/회원가입은 15분에 5회까지
  message: "Too many authentication attempts, please try again later.",
});
```

### 5.4 환경 변수 관리

```bash
# .env.example

# Server
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
UPSTASH_REDIS_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_TOKEN=your-token

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Agora
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-app-certificate

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🚀 6. 배포 아키텍처

### 6.1 Render.com 배포 설정

**Build Command:**

```bash
npm install && npx prisma generate && npm run build
```

**Start Command:**

```bash
npm run start
```

**Health Check Path:**

```
/health
```

**환경 변수:**

- Render.com 대시보드에서 설정
- `.env` 파일 내용 복사

### 6.2 Prisma Migration

```bash
# 로컬에서 마이그레이션 생성
npx prisma migrate dev --name init

# 프로덕션 배포 시
npx prisma migrate deploy
```

### 6.3 무료 호스팅 슬립 모드 대응

**문제:** Render.com 무료 플랜은 15분간 요청이 없으면 슬립 모드 진입

**해결책: Health Check Cron (외부 서비스)**

**옵션 1: UptimeRobot (무료)**

- https://uptimerobot.com
- 5분마다 `/health` 엔드포인트 핑
- 50개 모니터 무료

**옵션 2: cron-job.org (무료)**

- https://cron-job.org
- 커스텀 스케줄 설정 가능

**설정 예시:**

- URL: `https://your-app.onrender.com/health`
- Interval: 5분
- Method: GET

### 6.4 CI/CD 파이프라인 (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Render

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Trigger Render deploy
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
```

---

## 📊 7. 모니터링 및 로깅

### 7.1 로깅 전략 (Winston)

```typescript
// src/utils/logger.util.ts
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

export { logger };
```

### 7.2 에러 트래킹 (Sentry)

```typescript
// src/config/sentry.ts
import * as Sentry from "@sentry/node";

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
};

// Express error handler와 통합
import { Handlers } from "@sentry/node";
app.use(Handlers.requestHandler());
app.use(Handlers.errorHandler());
```

### 7.3 Agora Analytics

- Agora Console에서 자동 제공
- 통화 품질, 네트워크 상태, 에러율 모니터링
- https://console.agora.io

---

## 🧪 8. 테스트 전략

### 8.1 프론트엔드 테스트

**도구:**

- Jest + React Native Testing Library
- Detox (E2E)

**예시:**

```typescript
// src/components/__tests__/Button.test.tsx
import { render, fireEvent } from "@testing-library/react-native";
import Button from "../Button";

describe("Button Component", () => {
  it("renders correctly", () => {
    const { getByText } = render(
      <Button title="Click me" onPress={() => {}} />
    );
    expect(getByText("Click me")).toBeTruthy();
  });

  it("calls onPress when clicked", () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Click me" onPress={onPressMock} />
    );

    fireEvent.press(getByText("Click me"));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
```

### 8.2 백엔드 테스트

**도구:**

- Jest
- Supertest (API 테스트)

**예시:**

```typescript
// src/__tests__/auth.test.ts
import request from "supertest";
import createApp from "../app";

const app = createApp();

describe("POST /api/auth/register", () => {
  it("should register a new user", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "Password123!",
      nickname: "testuser",
      birthDate: "1990-01-01",
      gender: "MALE",
      country: "KR",
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("accessToken");
  });
});
```

---

## 📚 9. 참고 자료

### 9.1 공식 문서

- React Native: https://reactnative.dev
- Agora: https://docs.agora.io
- Prisma: https://www.prisma.io/docs
- Socket.io: https://socket.io/docs
- Render: https://render.com/docs
- Supabase: https://supabase.com/docs
- Upstash: https://docs.upstash.com

### 9.2 추천 학습 자료

- React Native Architecture: https://reactnative.dev/architecture/overview
- Agora Best Practices: https://docs.agora.io/en/video-calling/develop/best-practices
- Node.js Performance: https://nodejs.org/en/docs/guides/simple-profiling

---

**문서 끝**
