# 영상 데이팅 앱 만들기 #5 - JWT 인증 시스템 구축 (보안 강화)

> **이전 글 요약**: Part 4에서는 Supabase + Prisma로 PostgreSQL 데이터베이스를 구축했다. 10개 모델을 설계하고, 복합 인덱스로 98% 성능 향상을 달성했다.

이번 글에서는 **JWT 기반 회원가입/로그인 API**를 구현한다. 인증 시스템은 처음이라 개념부터 찾아가며 배웠다.

---

## 📌 이번 파트에서 다룰 내용

- JWT가 뭔지 이해하기
- bcrypt로 비밀번호 해싱
- Access Token + Refresh Token 구조
- Zod로 입력 검증 (이메일, 비밀번호 강도)
- Race Condition 방지 (Serializable 트랜잭션)
- 인증 미들웨어 구현
- 회원가입/로그인 API 테스트

---

## 💡 JWT가 뭔지 몰라서 찾아봤다

### 인증 방식 검색

"Node.js 로그인 구현"으로 검색했더니 두 가지 방식이 나왔다:

1. **세션 기반 인증** (Session + Cookie)
2. **토큰 기반 인증** (JWT)

각각 뭐가 다른지 찾아봤다.

### 세션 기반 인증

```
1. 사용자 로그인
2. 서버가 세션 ID 생성 → 메모리/Redis에 저장
3. 세션 ID를 쿠키로 전달
4. 이후 요청마다 쿠키의 세션 ID로 사용자 확인
```

**문제점**:
- 서버 메모리에 세션을 저장해야 함
- 서버가 여러 대면 세션 공유 필요 (Redis 등)
- React Native는 쿠키 처리가 복잡함

### JWT (JSON Web Token)

```
1. 사용자 로그인
2. 서버가 JWT 토큰 생성 (서명 포함)
3. 토큰을 클라이언트에 전달
4. 이후 요청마다 토큰을 Header에 포함
5. 서버는 서명 검증만 하면 됨 (DB 조회 불필요)
```

**장점**:
- 서버가 상태를 저장하지 않음 (Stateless)
- 서버 확장이 쉬움
- React Native에서 AsyncStorage로 간단히 저장

JWT를 선택하기로 했다.

### JWT 구조

JWT를 디코딩해보니 3부분으로 나뉘어있었다:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

- **Header**: 알고리즘 정보 (HS256)
- **Payload**: 사용자 데이터 (id, email 등)
- **Signature**: 위변조 방지 서명

Payload는 Base64로 인코딩돼서 누구나 볼 수 있다. 그래서 비밀번호 같은 민감한 정보는 넣으면 안 된다고 한다.

---

## 🔐 Step 1: bcrypt로 비밀번호 해싱

### 왜 해싱이 필요한가?

처음에는 "비밀번호를 그냥 DB에 저장하면 안 되나?" 싶었다.

검색해보니 절대 안 된다고 한다:
- DB가 해킹당하면 비밀번호가 그대로 노출됨
- 같은 비밀번호를 다른 서비스에서 쓰면 거기도 털림

### bcrypt 알아보기

"Node.js 비밀번호 암호화"로 검색했더니 bcrypt가 가장 많이 나왔다.

**bcrypt 특징**:
- 단방향 해싱 (복호화 불가능)
- Salt 자동 생성 (같은 비밀번호도 다른 해시값)
- 느린 해싱 (무차별 대입 공격 방어)

### 1-1. bcrypt 설치

```bash
npm install bcryptjs
npm install @types/bcryptjs --save-dev
```

### 1-2. password.ts 작성

**`src/utils/password.ts`**:

```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

**SALT_ROUNDS가 뭔가?**

처음엔 몰랐는데 찾아보니:
- Salt: 랜덤 문자열을 비밀번호에 추가
- Rounds: 해싱을 몇 번 반복할지 (10 = 2^10 = 1024번)
- 높을수록 안전하지만 느림

10이 권장값이라고 해서 그대로 사용했다.

### 1-3. 테스트

콘솔에서 테스트해봤다:

```typescript
const hashed = await hashPassword('MyPassword123!');
console.log(hashed);
// $2a$10$N9qo8uLOickgx2ZMRZoMye.bDDD4TmXPOPy.CJk3tXFPBQ9ZQUQKW

const isMatch = await comparePassword('MyPassword123!', hashed);
console.log(isMatch); // true

const isWrong = await comparePassword('WrongPassword', hashed);
console.log(isWrong); // false
```

같은 비밀번호를 여러 번 해싱해도 매번 다른 값이 나왔다. Salt 때문이구나 싶었다.

---

## 🎫 Step 2: JWT 토큰 생성

### 2-1. jsonwebtoken 설치

```bash
npm install jsonwebtoken
npm install @types/jsonwebtoken --save-dev
```

### 2-2. Access Token vs Refresh Token

JWT 문서를 보다가 Access Token과 Refresh Token을 같이 쓴다는 걸 알았다.

**왜 두 개를 쓰는가?**

처음엔 Access Token 하나면 되지 않나 싶었다. 찾아보니:

- **Access Token**: 짧은 만료 시간 (1시간)
  - 매 API 요청마다 전송
  - 탈취당해도 1시간 후 무효화

- **Refresh Token**: 긴 만료 시간 (7일)
  - Access Token이 만료되면 갱신용으로 사용
  - 안전한 곳에 저장 (React Native AsyncStorage)

보안과 사용성의 균형이구나 싶었다.

### 2-3. jwt.ts 작성

**`src/utils/jwt.ts`**:

```typescript
import jwt from 'jsonwebtoken';

/**
 * JWT 시크릿 검증
 */
const validateSecret = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters`);
  }
  return value;
};

const JWT_SECRET = validateSecret('JWT_SECRET', process.env.JWT_SECRET);
const JWT_REFRESH_SECRET = validateSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);

export interface TokenPayload {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h', // 1시간
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d', // 7일
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};
```

**왜 시크릿을 검증하는가?**

처음 작성할 때는 `process.env.JWT_SECRET || 'default-secret'` 이렇게 했었다.

그런데 보안 가이드를 보니 기본값은 위험하다고 했다:
- 기본값은 GitHub에 올라갈 수 있음
- 누구나 토큰을 위조할 수 있음

그래서 환경변수가 없으면 서버를 시작하지 않도록 바꿨다.

### 2-4. .env에 시크릿 추가

시크릿을 어떻게 생성할지 찾아봤다.

```bash
# 32자 랜덤 문자열 생성 (macOS/Linux)
openssl rand -base64 32
```

**`.env`**:

```bash
JWT_SECRET=your-very-long-and-random-secret-key-at-least-32-characters
JWT_REFRESH_SECRET=another-different-secret-key-for-refresh-token-32-chars
```

---

## ✅ Step 3: Zod로 입력 검증

### 입력 검증이 왜 필요한가?

"Node.js 보안"으로 검색하다가 입력 검증의 중요성을 알게 됐다.

사용자가 보내는 데이터를 믿으면 안 된다:
- 이메일 형식이 맞는지
- 비밀번호가 충분히 강한지
- HTML 태그로 XSS 공격 시도하는지

### 3-1. Zod 선택

"TypeScript 입력 검증"으로 검색했더니 몇 가지 나왔다:
- Joi: 유명하지만 TypeScript 타입 추론이 약함
- **Zod**: TypeScript 완벽 지원, 타입 자동 추론

Prisma처럼 타입을 자동으로 만들어준다고 해서 Zod를 선택했다.

### 3-2. Zod 설치

```bash
npm install zod
```

### 3-3. validation.ts 작성

**`src/utils/validation.ts`** (일부):

```typescript
import { z } from 'zod';

/**
 * HTML 태그 제거 (XSS 방지)
 */
const sanitizeHtml = (str: string): string => {
  return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * 비밀번호 규칙:
 * - 최소 8자
 * - 대문자 1개 이상
 * - 숫자 1개 이상
 * - 특수문자 1개 이상
 */
const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .regex(/[A-Z]/, '비밀번호에 대문자가 최소 1개 포함되어야 합니다')
  .regex(/[0-9]/, '비밀번호에 숫자가 최소 1개 포함되어야 합니다')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, '비밀번호에 특수문자가 최소 1개 포함되어야 합니다');

/**
 * 이메일 스키마
 */
const emailSchema = z
  .string()
  .email('유효한 이메일 형식이 아닙니다')
  .max(255, '이메일은 255자를 초과할 수 없습니다')
  .transform((email) => email.toLowerCase().trim());

/**
 * 닉네임 스키마
 */
const nicknameSchema = z
  .string()
  .min(2, '닉네임은 최소 2자 이상이어야 합니다')
  .max(20, '닉네임은 20자를 초과할 수 없습니다')
  .regex(/^[a-zA-Z0-9가-힣_]+$/, '닉네임은 영문, 한글, 숫자, 언더스코어만 사용 가능합니다')
  .transform(sanitizeHtml);

/**
 * 생년월일 스키마 (18세 이상)
 */
const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '생년월일은 YYYY-MM-DD 형식이어야 합니다')
  .refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    return actualAge >= 18;
  }, '18세 이상만 가입할 수 있습니다');

/**
 * 회원가입 요청 스키마
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
  birthDate: birthDateSchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  country: z.string().length(2).regex(/^[A-Z]{2}$/),
  bio: z.string().max(200).transform(sanitizeHtml).optional(),
  interests: z.array(z.string().max(30)).max(10).optional(),
  preferredGender: z.enum(['MALE', 'FEMALE', 'ANYONE']),
  minAge: z.number().int().min(18).max(100),
  maxAge: z.number().int().min(18).max(100),
  preferredCountries: z.array(z.string().length(2)).max(20).optional(),
}).refine((data) => data.minAge <= data.maxAge, {
  message: '최소 나이는 최대 나이보다 작거나 같아야 합니다',
  path: ['minAge'],
});

/**
 * 로그인 요청 스키마
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

/**
 * Zod 에러를 사용자 친화적 메시지로 변환
 */
export const formatZodError = (error: z.ZodError): string => {
  const issues = error.issues;
  if (issues && issues.length > 0) {
    return issues[0].message;
  }
  return '입력값이 올바르지 않습니다';
};

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

**작성하면서 배운 것들**:

1. **`.transform()`**: 데이터를 변환할 수 있다
   - `email.toLowerCase().trim()`: 소문자 + 공백 제거
   - `sanitizeHtml()`: HTML 태그 제거

2. **`.refine()`**: 커스텀 검증 로직
   - 18세 이상 체크
   - minAge <= maxAge 검증

3. **`z.infer<>`**: Zod 스키마에서 TypeScript 타입 자동 생성
   ```typescript
   const result = registerSchema.parse(req.body);
   // result 타입이 자동으로 추론됨!
   ```

---

## 🚀 Step 4: 회원가입 API 구현

### 4-1. auth-service.ts 작성

**`src/services/auth-service.ts`** (일부):

```typescript
import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  country: string;
  // ... 기타 필드
}

/**
 * 회원가입
 */
export const register = async (data: RegisterInput) => {
  // 1. 비밀번호 해싱 (트랜잭션 전에 수행)
  const hashedPassword = await hashPassword(data.password);

  // 2. 트랜잭션으로 사용자 생성
  const user = await prisma.$transaction(
    async (tx) => {
      // Beta 사용자 수 제한 확인
      const userCount = await tx.user.count();
      const betaLimit = parseInt(process.env.BETA_USER_LIMIT || '30', 10);

      if (userCount >= betaLimit) {
        throw new AppError(403, 'BETA_LIMIT_REACHED', 'Beta 테스트 사용자 수가 가득 찼습니다');
      }

      // 이메일 중복 확인
      const existingUser = await tx.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError(400, 'EMAIL_EXISTS', '이미 사용 중인 이메일입니다');
      }

      // 사용자 생성
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          nickname: data.nickname,
          birthDate: new Date(data.birthDate),
          gender: data.gender,
          country: data.country,
          // ... 기타 필드
        },
      });

      return newUser;
    },
    {
      // Serializable: Race Condition 완전 방지
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 5000,
    }
  );

  // 3. JWT 토큰 생성
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, accessToken, refreshToken };
};
```

**Serializable 트랜잭션이 뭔가?**

처음에는 그냥 `prisma.user.create()`로 작성했었다.

그런데 문제가 생겼다. 같은 이메일로 동시에 여러 요청이 오면:
1. 요청 A: 이메일 중복 확인 → 없음
2. 요청 B: 이메일 중복 확인 → 없음 (A가 아직 생성 안 함)
3. 요청 A: 사용자 생성 성공
4. 요청 B: 사용자 생성 성공 (중복!)

이걸 **Race Condition**이라고 한다.

"PostgreSQL Race Condition 방지"로 검색했더니 트랜잭션 격리 수준이 나왔다:
- **Read Committed** (기본): Race Condition 발생 가능
- **Serializable**: 동시 요청을 순차적으로 처리 (안전)

Serializable을 쓰면 한 트랜잭션이 끝날 때까지 다른 트랜잭션이 기다린다. 조금 느리지만 안전하다.

### 4-2. auth-controller.ts 작성

**`src/controllers/auth-controller.ts`**:

```typescript
import { Request, Response, NextFunction } from 'express';
import { register as registerUser, login as loginUser } from '../services/auth-service';
import { registerSchema, loginSchema, formatZodError } from '../utils/validation';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. 입력 검증
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: formatZodError(result.error),
        },
      });
    }

    // 2. 회원가입 처리
    const { user, accessToken, refreshToken } = await registerUser(result.data);

    // 3. 성공 응답
    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. 입력 검증
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: formatZodError(result.error),
        },
      });
    }

    // 2. 로그인 처리
    const { user, accessToken, refreshToken } = await loginUser(result.data);

    // 3. 성공 응답
    res.json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

Controller는 얇게 유지했다. 검증하고 Service 호출하고 응답 보내는 것만.

---

## 🔒 Step 5: 인증 미들웨어 구현

### 5-1. 미들웨어가 뭔가?

"Express 미들웨어"로 검색해봤다.

- 미들웨어: 요청과 응답 사이에서 실행되는 함수
- 인증, 로깅, 에러 처리 등에 사용

```
Client → Middleware 1 → Middleware 2 → Controller → Response
```

### 5-2. auth.ts 작성

**`src/middlewares/auth.ts`**:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Authorization 헤더 확인
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        },
      });
    }

    // 2. 'Bearer ' 제거
    const token = authHeader.substring(7);

    // 3. 토큰 검증
    const payload = verifyAccessToken(token);

    // 4. req.user에 저장 (다음 미들웨어/컨트롤러에서 사용)
    req.user = payload;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
        },
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication failed',
      },
    });
  }
};
```

### 5-3. 타입 정의

TypeScript에서 `req.user`를 쓰려면 타입을 정의해야 한다고 했다.

**`src/@types/express.d.ts`**:

```typescript
import { TokenPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
```

이제 컨트롤러에서 `req.user.id`를 쓸 수 있다.

### 5-4. 라우트에 적용

**`src/routes/user.ts`** (예시):

```typescript
import express from 'express';
import { authenticate } from '../middlewares/auth';
import { getProfile, updateProfile } from '../controllers/user-controller';

const router = express.Router();

// 인증 필요한 API
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);

export default router;
```

`authenticate` 미들웨어를 거치면 토큰이 검증되고, `req.user`에 사용자 정보가 들어간다.

---

## ✅ Step 6: API 테스트

### 6-1. 회원가입 테스트

**요청**:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "MyPassword123!",
    "nickname": "테스터",
    "birthDate": "1995-01-01",
    "gender": "MALE",
    "country": "KR",
    "preferredGender": "FEMALE",
    "minAge": 20,
    "maxAge": 35
  }'
```

**응답**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx123...",
      "email": "test@example.com",
      "nickname": "테스터",
      "emailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

성공! 토큰이 생성됐다.

### 6-2. 로그인 테스트

**요청**:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "MyPassword123!"
  }'
```

**응답**:

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### 6-3. 인증 필요한 API 테스트

**요청 (토큰 없음)**:

```bash
curl http://localhost:5000/api/user/me
```

**응답**:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No token provided"
  }
}
```

**요청 (토큰 포함)**:

```bash
curl http://localhost:5000/api/user/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**응답**:

```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "email": "test@example.com",
    "nickname": "테스터"
  }
}
```

인증 미들웨어가 제대로 작동한다!

---

## 🎯 현재까지 완성된 것

### 체크리스트

- [x] JWT 개념 이해 (Stateless 인증)
- [x] bcrypt로 비밀번호 해싱
- [x] Access Token + Refresh Token 구조
- [x] Zod로 입력 검증 (이메일, 비밀번호 강도, 18세 이상)
- [x] Race Condition 방지 (Serializable 트랜잭션)
- [x] 회원가입/로그인 API
- [x] 인증 미들웨어 구현
- [x] API 테스트 완료

### 파일 구조

```
backend/src/
├── utils/
│   ├── jwt.ts                ✅ JWT 토큰 생성/검증
│   ├── password.ts           ✅ 비밀번호 해싱/비교
│   └── validation.ts         ✅ Zod 입력 검증
├── services/
│   └── auth-service.ts       ✅ 회원가입/로그인 로직
├── controllers/
│   └── auth-controller.ts    ✅ HTTP 요청/응답 처리
├── middlewares/
│   └── auth.ts               ✅ 인증 미들웨어
└── @types/
    └── express.d.ts          ✅ req.user 타입 정의
```

---

## 🚨 자주 발생하는 에러와 해결법

### 에러 1: JWT_SECRET 없음

서버 시작 시 에러:

```
Error: JWT_SECRET environment variable is required
```

**해결**: `.env` 파일에 시크릿 추가

```bash
openssl rand -base64 32
# 생성된 문자열을 .env에 추가
```

### 에러 2: 비밀번호 검증 실패

회원가입 시도 시:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "비밀번호에 대문자가 최소 1개 포함되어야 합니다"
  }
}
```

**해결**: 비밀번호 규칙 확인
- 최소 8자
- 대문자 1개 이상
- 숫자 1개 이상
- 특수문자 1개 이상

예: `MyPassword123!`

### 에러 3: Token Expired

API 요청 시:

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token has expired"
  }
}
```

**해결**: Refresh Token으로 Access Token 갱신

(이 기능은 다음에 구현할 예정)

---

## 💡 보안 개선 사항

### 1. JWT 시크릿 강제

기본값을 허용하지 않고, 32자 이상 필수:

```typescript
const validateSecret = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters`);
  }
  return value;
};
```

### 2. 비밀번호 강도 검증

Zod로 복잡도 강제:

```typescript
.regex(/[A-Z]/, '대문자 1개 이상')
.regex(/[0-9]/, '숫자 1개 이상')
.regex(/[!@#$%^&*(),.?":{}|<>]/, '특수문자 1개 이상')
```

### 3. HTML 태그 제거 (XSS 방지)

모든 문자열 입력에 sanitize 적용:

```typescript
const sanitizeHtml = (str: string): string => {
  return str.replace(/<[^>]*>/g, '').trim();
};
```

### 4. Race Condition 방지

Serializable 트랜잭션으로 동시성 문제 해결:

```typescript
await prisma.$transaction(async (tx) => {
  // 검증 및 생성 로직
}, {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable
});
```

---

## 📚 다음 글 예고

**Part 6: React Native 인증 UI와 상태 관리**

다음 글에서는 모바일 앱으로 돌아가서 인증 UI를 구현한다. 이 부분은 프론트엔드 영역이라 익숙할 것 같다.

다룰 내용:
- 회원가입/로그인 화면 구현
- Zustand로 인증 상태 관리
- AsyncStorage에 토큰 저장
- 자동 로그인 구현
- 토큰 만료 시 자동 갱신

---

## 📖 참고 자료

### 공식 문서
- [JWT 공식 사이트](https://jwt.io/)
- [Zod 공식 문서](https://zod.dev/)
- [bcrypt.js](https://github.com/dcodeIO/bcrypt.js)

### 추천 읽을거리
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Node.js Security Best Practices](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)

---

## 💬 마치며

이 글에서는 JWT 기반 인증 시스템을 구현했다.

**핵심 요약**:
- ✅ JWT로 Stateless 인증 구현
- ✅ bcrypt로 비밀번호 안전하게 해싱
- ✅ Zod로 모든 입력 검증
- ✅ Serializable 트랜잭션으로 Race Condition 방지
- ✅ 인증 미들웨어로 보호된 API 구현

프론트엔드 개발자 입장에서 인증 시스템은 완전히 새로운 영역이었다.

JWT가 뭔지, 왜 세션 대신 토큰을 쓰는지 하나씩 찾아가며 배웠다. 특히 Serializable 트랜잭션으로 Race Condition을 방지하는 개념은 처음 알았는데, 동시 요청 문제를 경험해보니 왜 필요한지 이해가 갔다.

Zod는 Prisma처럼 타입을 자동으로 생성해줘서 정말 편했다. `z.infer<>`로 TypeScript 타입이 자동으로 나오니 실수가 줄었다.

다음 글에서는 React Native로 돌아가서 인증 UI를 만든다. 익숙한 영역이라 더 자세히 다룰 수 있을 것 같다.

**궁금한 점이나 피드백은 댓글로 남겨달라.** 🙌

---

**태그**: `JWT` `인증` `bcrypt` `Zod` `보안` `Node.js` `TypeScript` `Race Condition` `트랜잭션`
