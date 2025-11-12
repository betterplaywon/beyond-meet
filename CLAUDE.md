# Claude Code - 프로젝트 개발 가이드

이 문서는 Beyond Meet 프로젝트 개발 시 Claude가 따라야 할 규칙과 컨벤션을 정의합니다.

---

## 📋 프로젝트 정보

- **프로젝트명**: Beyond Meet
- **타입**: WebRTC 기반 1:1 영상 통화 데이팅 앱
- **플랫폼**: iOS, Android (React Native)
- **개발 기간**: 50일 (2025-11-04 ~ 2025-12-24)
- **Beta 전략**: 20명 한정 초대 코드 시스템
- **비용 목표**: $0/월 (Beta 단계)

---

## 🗂️ 프로젝트 구조

```
beyond-meet/
├── mobile/              # React Native 앱 (iOS + Android)
├── backend/             # Node.js + Express + Prisma 백엔드
├── docs/               # 프로젝트 문서 (PRD, API 명세서 등)
├── README.md           # 프로젝트 메인 문서
├── CLAUDE.md           # 개발 가이드 (이 파일)
└── DEPLOYMENT.md       # 배포 및 인프라 가이드
```

---

## 📚 필수 참고 문서

개발 시작 전 반드시 다음 문서를 읽고 이해해야 합니다:

1. **[docs/PRD.md](docs/PRD.md)** ⭐⭐⭐⭐⭐

   - 프로젝트 비전, 미션, 핵심 기능
   - Beta 테스트 전략 (20명 한정)
   - 초대 코드 시스템
   - 데이터 모델 (Prisma Schema)

2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** ⭐⭐⭐⭐⭐

   - 시스템 아키텍처
   - 기술 스택 (React Native, Node.js, Prisma, Agora)
   - 폴더 구조
   - 무료 인프라 전략

3. **[docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)** ⭐⭐⭐⭐

   - 모든 API 엔드포인트 명세
   - 요청/응답 형식
   - 에러 코드

4. **[docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)** ⭐⭐⭐⭐

   - 50일 개발 일정
   - 주차별 목표
   - 위험 요소 및 대응

5. **[docs/UI_FLOW.md](docs/UI_FLOW.md)** ⭐⭐⭐⭐

   - 화면 설계
   - 디자인 시스템
   - 사용자 플로우

6. **[DEPLOYMENT.md](DEPLOYMENT.md)** ⭐⭐⭐⭐⭐
   - 프로덕션 배포 가이드
   - 환경 변수 설정
   - 외부 서비스 통합 (Agora, Firebase, Upstash, Supabase)
   - GitHub Actions 자동화
   - 트러블슈팅

---

## 🎯 핵심 제약사항

### 1. Beta 테스트 제약

- **사용자 수**: 20명 한정
- **초대 코드**: 회원가입 시 필수
- **비용**: $0/월 운영 필수

### 2. 기능 제약

- **통화 시간**: 5분 제한
- **매칭 방식**: 랜덤 + 선택 매칭만
- **신고/차단**: MVP에서 제외 (추후 추가)

### 3. 무료 서비스 한도

- **Agora**: 10,000분/월
- **Render**: 750시간/월
- **Supabase**: 500MB DB + 1GB Storage
- **Upstash**: 10,000 명령/일
- **Firebase**: FCM 무제한

---

## 💻 코딩 컨벤션

### 공통 규칙

#### 1. 언어

- **TypeScript 필수** - 모든 코드는 TypeScript로 작성
- JavaScript 사용 금지
- `any` 타입 사용 최소화

#### 2. 네이밍

```typescript
// 파일명: kebab-case
user-service.ts
auth-controller.ts

// 변수/함수: camelCase
const userId = '123';
function getUserById() {}

// 클래스/인터페이스/타입: PascalCase
class UserService {}
interface User {}
type AuthToken = string;

// 상수: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// Private 변수/메서드: _prefix
private _internalState = {};
```

#### 3. 주석

```typescript
// ✅ 좋은 예: 복잡한 로직에 주석 추가
/**
 * 사용자 매칭 알고리즘
 * - 필터 조건: 성별, 나이, 국가
 * - 이미 매칭된 사용자 제외
 * - 온라인 상태인 사용자만 선택
 */
async function findMatchingUsers() {}

// ❌ 나쁜 예: 자명한 코드에 불필요한 주석
// 사용자 ID를 가져옴
const userId = user.id;
```

#### 4. 에러 처리

```typescript
// ✅ 항상 try-catch 사용
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error("API call failed:", error);
  throw new AppError(500, "INTERNAL_ERROR", "Failed to process request");
}

// ❌ 에러를 무시하지 말 것
try {
  await apiCall();
} catch (error) {
  // 빈 catch 블록
}
```

---

### 백엔드 (Node.js + Express + Prisma)

#### 1. 폴더 구조 (엄격히 준수)

```
backend/
├── src/
│   ├── @types/          # TypeScript 타입 정의
│   ├── config/          # 설정 파일 (DB, Redis, Firebase)
│   ├── controllers/     # 요청 처리 로직
│   ├── middlewares/     # Express 미들웨어
│   ├── routes/          # API 라우트 정의
│   ├── services/        # 비즈니스 로직
│   ├── sockets/         # Socket.io 핸들러
│   ├── utils/           # 유틸리티 함수
│   ├── app.ts           # Express 앱 설정
│   └── server.ts        # 서버 시작점
├── prisma/
│   └── schema.prisma    # 데이터베이스 스키마
├── .env                 # 환경 변수 (Git 무시)
├── .env.example         # 환경 변수 템플릿
├── package.json
└── tsconfig.json
```

#### 2. API 응답 형식 (통일 필수)

```typescript
// ✅ 성공 응답
{
  "success": true,
  "data": {
    // 응답 데이터
  }
}

// ✅ 에러 응답
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적인 메시지"
  }
}
```

#### 3. 파일 작성 규칙

**Controller 예시:**

```typescript
// src/controllers/auth-controller.ts
import { Request, Response, NextFunction } from "express";
import { registerUser } from "../services/auth-service";
import { AppError } from "../middlewares/errorHandler";

/**
 * 회원가입
 * POST /api/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { inviteCode, email, password } = req.body;

    const result = await registerUser({
      inviteCode,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 로그인
 * POST /api/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    // 서비스 함수 호출
    // ...
  } catch (error) {
    next(error);
  }
};
```

**Service 예시:**

```typescript
// src/services/auth-service.ts
import prisma from "../config/database";
import { hashPassword } from "../utils/password";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { AppError } from "../middlewares/errorHandler";

/**
 * 초대 코드 검증
 */
const validateInviteCode = async (code: string) => {
  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code },
  });

  if (!inviteCode) {
    throw new AppError(400, "INVALID_INVITE_CODE", "Invalid invite code");
  }

  if (inviteCode.usedCount >= inviteCode.maxUses) {
    throw new AppError(400, "INVITE_CODE_EXHAUSTED", "Invite code has been fully used");
  }

  return inviteCode;
};

/**
 * 사용자 회원가입
 */
export const registerUser = async (
  data: RegisterInput
): Promise<RegisterOutput> => {
  // 1. 초대 코드 검증
  const inviteCode = await validateInviteCode(data.inviteCode);

  // 2. 이메일 중복 확인
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError(400, "EMAIL_EXISTS", "Email already registered");
  }

  // 3. 사용자 생성
  const hashedPassword = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      // ...
    },
  });

  // 4. 토큰 생성
  const accessToken = generateAccessToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * 사용자 로그인
 */
export const loginUser = async (
  data: LoginInput
): Promise<LoginOutput> => {
  // 로그인 로직
  // ...
};
```

#### 4. 데이터베이스 마이그레이션 규칙 (중요!)

**⚠️ Supabase를 사용하므로 Prisma CLI 대신 Supabase Dashboard에서 직접 SQL 실행**

Prisma 스키마 변경 시 다음 절차를 따라야 합니다:

**1단계: Prisma 스키마 수정**

```bash
# backend/prisma/schema.prisma 파일 수정
```

**2단계: SQL 마이그레이션 파일 생성**

```bash
cd backend
npx prisma migrate dev --name <마이그레이션_이름> --create-only
```

이 명령어는 `prisma/migrations/` 폴더에 SQL 파일을 생성하지만 **실제 DB에는 적용하지 않음**

**3단계: Claude가 사용자에게 SQL 제공**

Claude는 생성된 SQL 파일을 읽어서 사용자에게 다음과 같이 알려줘야 합니다:

```
📋 Supabase에서 실행할 SQL:

다음 SQL을 Supabase Dashboard에서 실행해주세요:

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 → SQL Editor
3. 아래 SQL 복사 & 붙여넣기 → Run

--- SQL 시작 ---
CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  ...
);
--- SQL 끝 ---

완료 후 "완료했어요" 라고 답변해주시면 다음 단계를 진행합니다.
```

**4단계: Prisma Client 재생성**

```bash
cd backend
npm run prisma:generate
```

**절대 하지 말 것**:

- ❌ `npx prisma db push` - Supabase pooler와 호환 문제
- ❌ `npx prisma migrate deploy` - 시간이 너무 오래 걸림
- ❌ Claude가 직접 마이그레이션 실행 시도

**Claude의 역할**:

1. Prisma 스키마 변경 감지
2. SQL 마이그레이션 파일 생성 (`--create-only`)
3. SQL 파일 읽어서 사용자에게 제공
4. 사용자가 Supabase에서 실행 완료 확인 후 다음 단계 진행

#### 5. Prisma 사용 규칙

```typescript
// ✅ 트랜잭션 사용 (여러 테이블 수정 시)
await prisma.$transaction(async (tx) => {
  await tx.user.update({ where: { id: userId }, data: { ... } });
  await tx.inviteCodeUsage.create({ data: { ... } });
});

// ✅ Select 최적화 (필요한 필드만 선택)
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    nickname: true,
  },
});

// ❌ 모든 필드 가져오지 말 것
const user = await prisma.user.findUnique({
  where: { id: userId },
});
```

#### 6. 환경 변수 사용

```typescript
// ✅ 타입 안전하게 사용
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

// ❌ 직접 사용하지 말 것
jwt.sign(payload, process.env.JWT_SECRET);
```

#### 7. 환경 변수 파일 관리

**⚠️ 환경 변수 설정 상세 정보는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참조하세요.**

**중요사항**:

- ✅ `.env` 파일은 Git에 커밋하지 않음 (`.gitignore`에 포함)
- ✅ `.env.example` 파일은 커밋하여 템플릿 제공
- ✅ 백엔드: `dotenv`로 환경 변수 로드
- ✅ 프론트엔드: `react-native-config`로 .env 파일 읽음
- ❌ **절대 실제 비밀 키를 코드나 문서에 포함하지 말 것**

---

### 프론트엔드 (React Native)

#### 1. 폴더 구조 (엄격히 준수)

```
mobile/src/
├── components/          # 재사용 가능한 UI 컴포넌트
│   ├── common/         # Button, Input 등
│   ├── video/          # 영상 통화 관련
│   └── profile/        # 프로필 관련
├── screens/            # 화면 컴포넌트
│   ├── auth/           # 로그인, 회원가입
│   ├── home/           # 홈 화면
│   ├── call/           # 영상 통화
│   └── profile/        # 프로필
├── navigation/         # React Navigation 설정
├── services/           # API 호출
│   ├── api.ts          # Axios 설정
│   └── endpoints/      # API 엔드포인트
├── hooks/              # Custom Hooks
├── config/             # 환경 설정 ⭐ NEW
│   └── env.ts          # 환경 변수 중앙화
├── utils/              # 유틸리티 함수
├── types/              # TypeScript 타입
├── constants/          # 상수
└── App.tsx             # 앱 진입점
```

#### 2. 컴포넌트 작성 규칙

```typescript
// ✅ Functional Component + Hooks
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

interface UserProfileProps {
  userId: string;
  onUpdate?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUpdate,
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId);
  }, [userId]);

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.nickname}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

// ❌ Class Component 사용 금지
class UserProfile extends React.Component {}
```

#### 4. API 호출

```typescript
// services/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10000,
});

// Request 인터셉터
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response 인터셉터
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 갱신 로직
    }
    return Promise.reject(error);
  }
);

export default api;
```

#### 5. 환경 변수 사용 (React Native)

**환경 변수 설정 파일** (`mobile/src/config/env.ts`):

```typescript
import Config from "react-native-config";
import { Platform } from "react-native";

// 개발 환경 감지
const isDev = __DEV__;

// 플랫폼별 localhost 주소
const getLocalhost = () => {
  if (Platform.OS === "android") {
    return "10.0.2.2"; // Android 에뮬레이터 localhost
  }
  return "localhost"; // iOS 시뮬레이터
};

// 환경 변수 Export
export const ENV = {
  API_BASE_URL: isDev
    ? `http://${getLocalhost()}:5000`
    : Config.API_BASE_URL || "https://beyond-meet.onrender.com",
  AGORA_APP_ID: Config.AGORA_APP_ID || "your-agora-app-id",
};
```

**사용 예시:**

```typescript
// ✅ config/env.ts 사용
import { ENV } from "@/config/env";

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
});

// ❌ 직접 사용하지 말 것
import Config from "react-native-config";
const api = axios.create({
  baseURL: Config.API_BASE_URL,
});
```

**환경별 동작:**

- **개발 환경** (`__DEV__ === true`): localhost 자동 사용
  - iOS: `http://localhost:5000`
  - Android: `http://10.0.2.2:5000`
- **프로덕션 환경**: `.env` 파일의 `API_BASE_URL` 사용

#### 6. 스타일링 (UI_FLOW.md 참고)

```typescript
// ✅ StyleSheet 사용
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7", // UI_FLOW.md의 컬러 팔레트 사용
  },
  primaryButton: {
    backgroundColor: "#FF6B6B", // Primary Color
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});

// ❌ 인라인 스타일 지양
<View style={{ flex: 1, backgroundColor: "#F7F7F7" }} />;
```

---

## 🔐 보안 규칙

### 1. 환경 변수

```bash
# ✅ .env 파일에 저장 (Git 무시)
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-key

# ❌ 코드에 하드코딩 금지
const secret = 'super-secret-key';
```

### 2. 비밀번호

```typescript
// ✅ bcrypt로 해싱
import { hashPassword, comparePassword } from "./utils/password";

const hashedPassword = await hashPassword(plainPassword);
const isValid = await comparePassword(plainPassword, hashedPassword);

// ❌ 평문 저장 금지
user.password = plainPassword;
```

### 3. JWT 토큰

```typescript
// ✅ 짧은 만료 시간
const accessToken = jwt.sign(payload, secret, { expiresIn: "1h" });
const refreshToken = jwt.sign(payload, secret, { expiresIn: "7d" });

// ❌ 만료 시간 없음
const token = jwt.sign(payload, secret);
```

### 4. SQL Injection 방지

```typescript
// ✅ Prisma 사용 (자동 방지)
await prisma.user.findMany({
  where: { email: userInput },
});

// ❌ Raw SQL 사용 금지
await prisma.$queryRaw(`SELECT * FROM users WHERE email = '${userInput}'`);
```

---

## 🧪 테스트 규칙

### 1. 단위 테스트

```typescript
// ✅ 모든 Service 함수는 테스트 작성
describe("AuthService", () => {
  it("should register user with valid invite code", async () => {
    const result = await authService.register({
      inviteCode: "VALID_CODE",
      email: "test@example.com",
      password: "password123",
    });

    expect(result.user).toBeDefined();
    expect(result.accessToken).toBeDefined();
  });
});
```

### 2. API 테스트

```typescript
// ✅ 주요 API 엔드포인트 테스트
describe("POST /api/auth/register", () => {
  it("should return 201 with valid data", async () => {
    const response = await request(app).post("/api/auth/register").send({
      inviteCode: "VALID_CODE",
      email: "test@example.com",
      password: "password123",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

---

## 📝 Git 커밋 규칙

### 1. 커밋 메시지 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2. Type 종류

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드 추가
- `chore`: 빌드 설정 변경

### 3. 예시

```bash
feat(auth): 초대 코드 검증 API 구현

- InviteCode 모델 활용
- 사용 횟수 제한 체크
- 만료 시간 검증

Closes #123
```

---

## 🚨 절대 금지 사항

### 1. 코드 작성

- ❌ `any` 타입 남발
- ❌ `console.log` 배포 코드에 포함
- ❌ 하드코딩된 비밀 키
- ❌ 주석 처리된 코드 (삭제할 것)
- ❌ 미사용 import 문

### 2. API 개발

- ❌ API 응답 형식 변경 (통일 필수)
- ❌ 인증 없이 민감한 정보 노출
- ❌ Rate Limiting 없이 배포
- ❌ CORS 설정 `*` (특정 도메인만 허용)

### 3. 데이터베이스

- ❌ Production DB에 직접 쿼리
- ❌ Migration 없이 스키마 변경
- ❌ Index 없는 쿼리 (성능 저하)

### 4. 프론트엔드

- ❌ 민감한 정보 AsyncStorage에 평문 저장
- ❌ 무한 루프 발생 가능한 useEffect
- ❌ Key prop 없는 리스트 렌더링

---

## ✅ 개발 전 체크리스트

### 백엔드 API 개발 시

- [ ] docs/API_SPECIFICATION.md 확인
- [ ] 응답 형식 통일 (`success`, `data`, `error`)
- [ ] 에러 처리 (`try-catch`, `AppError`)
- [ ] JWT 인증 미들웨어 적용
- [ ] Prisma 트랜잭션 필요 여부 확인
- [ ] 환경 변수 사용 확인
- [ ] 테스트 코드 작성

### 프론트엔드 화면 개발 시

- [ ] docs/UI_FLOW.md 확인
- [ ] 디자인 시스템 컬러 팔레트 사용
- [ ] Zustand로 클라이언트 상태 관리
- [ ] API 호출 시 에러 처리
- [ ] 로딩 상태 표시
- [ ] TypeScript 타입 정의

---

## 🔧 문제 해결

### 자주 발생하는 이슈

#### 1. TypeScript 에러

```bash
# Prisma 클라이언트 재생성
cd backend && npm run prisma:generate

# 타입 체크
npm run build
```

#### 2. 환경 변수 로드 안 됨

```typescript
// .env 파일 위치 확인
// dotenv.config() 호출 확인
import dotenv from "dotenv";
dotenv.config();
```

#### 3. CORS 에러

```typescript
// backend/src/app.ts
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(","),
    credentials: true,
  })
);
```

#### 4. React Native 빌드 실패

```bash
# iOS
cd mobile/ios && pod install && cd ..

# Android
cd mobile/android && ./gradlew clean && cd ..
```

#### 5. 환경 변수 설정 (React Native)

```bash
# mobile/.env 파일 생성
cp mobile/.env.example mobile/.env

# 프로덕션 배포 시 수정
API_BASE_URL=https://your-backend-url.com
AGORA_APP_ID=your-agora-app-id
```

**개발 환경**에서는 `.env` 파일이 없어도 자동으로 localhost 사용 (config/env.ts의 fallback)

---

## 🚀 배포 및 인프라

**⚠️ 배포, 환경 변수, 외부 서비스 설정, 자동화 워크플로우 등에 대한 상세 정보는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참조하세요.**

**주요 내용:**

- Render.com 프로덕션 배포 가이드
- Supabase DB 마이그레이션 절차
- Agora, Firebase, Upstash 설정 방법
- GitHub Actions Keep-Alive 워크플로우
- 트러블슈팅 가이드

---

## 📞 도움이 필요할 때

1. **PRD 확인**: [docs/PRD.md](docs/PRD.md)
2. **아키텍처 확인**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. **API 명세 확인**: [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)
4. **일정 확인**: [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)

---

## 📊 프로젝트 진행 상황 (2025-11-12 기준)

### 전체 진행률: **98%** (Day 12/50일)

#### 남은 작업

**통합 테스트** (2-3일):

- API 엔드포인트 전체 테스트
- 영상 통화 품질 테스트 (iOS ↔ Android)
- 푸시 알림 테스트 (포그라운드/백그라운드)
- Socket.io 매칭 시스템 안정성 테스트

**Beta 출시** (11/15 예상):

- 초대 코드 20개 활용
- Beta 테스터 모집
- 피드백 수집 및 버그 대응

**⚠️ 상세 배포 내역 및 완료 작업 히스토리는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참조하세요.**

---

**작성일**: 2025-11-05
**버전**: 1.7.0
**최종 업데이트**: 2025-11-12 (문서 재구성 완료 - DEPLOYMENT.md 분리, 진행률 98%)
