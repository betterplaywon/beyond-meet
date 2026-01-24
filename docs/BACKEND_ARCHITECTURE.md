# Beyond Meet 백엔드 아키텍처 & 디자인 패턴

## 개요

이 문서는 Beyond Meet 백엔드 아키텍처와 코드베이스 전반에 사용된 주요 디자인 패턴에 대한 종합적인 설명을 제공합니다.

## 1. 프로젝트 구조

백엔드는 **계층형 아키텍처(Layered Architecture)** 를 따르며 관심사가 명확하게 분리되어 있습니다:

```
backend/src/
├── @types/           # TypeScript 타입 정의 (Express, 커스텀)
├── config/           # 외부 서비스 설정 (Prisma, Redis, Firebase, Supabase)
├── controllers/      # HTTP 요청 핸들러 (얇은 레이어 - 서비스에 위임)
├── middlewares/      # Express 미들웨어 (인증, 검증, 에러 처리, Rate Limiting)
├── routes/           # 라우트 정의 및 미들웨어 체인
├── services/         # 비즈니스 로직 레이어 (auth, match, user, push, storage, moderation)
├── sockets/          # Socket.io 이벤트 핸들러 (실시간 매칭/통화)
├── utils/            # 재사용 가능한 유틸리티 (JWT, password, validation, relationships)
├── app.ts           # Express 앱 설정
└── server.ts        # HTTP + Socket.io 서버 초기화
```

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                         클라이언트 (Mobile App)                        │
│                    iOS / Android (React Native)                     │
└──────────────────┬────────────────────────────┬─────────────────────┘
                   │                            │
                   │ HTTP/HTTPS                 │ WebSocket
                   │ REST API                   │ Socket.io
                   ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          서버 레이어                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Routes (라우트)                                               │   │
│  │  /auth, /users, /friends, /call, /push, /admin, /moderation │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
│  ┌────────────────────▼─────────────────────────────────────────┐   │
│  │  Middleware Chain (미들웨어 체인)                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │  │   Rate   │→│   Auth   │→│Validation│→│  Upload  │        │   │
│  │  │ Limiting │ │   (JWT)  │ │  (Zod)   │ │ (Multer) │        │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
│  ┌────────────────────▼─────────────────────────────────────────┐   │
│  │  Controllers (컨트롤러) - 얇은 레이어                           │   │
│  │  - 입력 검증                                                   │   │
│  │  - 서비스 레이어 위임                                           │   │
│  │  - 표준화된 응답 반환                                           │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
│  ┌────────────────────▼─────────────────────────────────────────┐   │
│  │  Services (서비스) - 비즈니스 로직 레이어                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │  │   Auth   │ │  Match   │ │   User   │ │   Push   │        │   │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │        │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐         │   │
│  │  │ Storage  │ │Moderation│ │  Call Service        │         │   │
│  │  │ Service  │ │ Service  │ │                      │         │   │
│  │  └──────────┘ └──────────┘ └──────────────────────┘         │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
│  ┌────────────────────▼─────────────────────────────────────────┐   │
│  │  Utils (유틸리티)                                              │   │
│  │  - JWT 생성/검증  - 비밀번호 해싱  - Validation 스키마         │   │
│  │  - 관계 체크      - 사용자 상태 관리                           │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Supabase   │ │    Upstash   │ │   Firebase   │
│  PostgreSQL  │ │     Redis    │ │     FCM      │
│   + Storage  │ │   (캐시)     │ │  (푸시 알림)  │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐
│     Agora    │ │ Hugging Face │
│  Video SDK   │ │  AI Content  │
│  (영상통화)   │ │  Moderation  │
└──────────────┘ └──────────────┘
```

## 2. 핵심 디자인 패턴

### A. Controller-Service 패턴 (Clean Architecture)

**패턴**: 컨트롤러는 의도적으로 얇게 유지하며, 모든 비즈니스 로직을 서비스에 위임합니다.

**컨트롤러 책임** ([auth-controller.ts](backend/src/controllers/auth-controller.ts)):

- Zod 스키마를 사용한 입력 검증
- 서비스 레이어에 위임
- 표준화된 응답 반환
- 에러를 에러 핸들러 미들웨어로 전달

예시:

```typescript
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        formatZodError(parseResult.error),
      );
    }
    const result = await authService.register({ ...validatedData });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
```

**서비스 책임** ([auth-service.ts](backend/src/services/auth-service.ts)):

- 모든 비즈니스 로직
- 적절한 격리 수준을 가진 데이터베이스 트랜잭션
- 보안 구현 (비밀번호 해싱, 토큰 생성)
- Race Condition 처리

예시 - 트랜잭션을 사용한 회원가입:

```typescript
const user = await prisma.$transaction(
  async (tx) => {
    const userCount = await tx.user.count();
    if (userCount >= betaLimit) {
      throw new AppError(403, 'BETA_LIMIT_REACHED', 'Beta full');
    }
    const existingUser = await tx.user.findUnique({where: {email}});
    if (existingUser) {
      throw new AppError(400, 'EMAIL_EXISTS', 'Email taken');
    }
    return await tx.user.create({data: {...}});
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 5000,
  }
);
```

### B. 미들웨어 체인 패턴

**패턴**: 여러 미들웨어 함수가 요청 처리 파이프라인을 구성합니다.

**미들웨어 유형**:

1. **인증 (Authentication)** ([auth.ts](backend/src/middlewares/auth.ts))
   - JWT 토큰 검증
   - req.user에 사용자 정보 주입
   - 표준화된 에러 응답

2. **Rate Limiting** ([rateLimiter.ts](backend/src/middlewares/rateLimiter.ts))
   - 작업별 다른 제한:
     - 인증: 15분당 5회
     - 비밀번호 재설정: 시간당 3회
     - 파일 업로드: 시간당 10회
     - 일반 API: 15분당 100회

3. **검증 미들웨어 팩토리** ([validation.ts](backend/src/middlewares/validation.ts))

   ```typescript
   export const validateBody = (schema: ZodSchema) => {
     return (req: Request, res: Response, next: NextFunction) => {
       const result = schema.safeParse(req.body);
       if (!result.success) {
         throw new AppError(
           400,
           "VALIDATION_ERROR",
           formatZodError(result.error),
         );
       }
       req.body = result.data; // Use transformed data
       next();
     };
   };
   ```

4. **업로드 미들웨어** ([upload.ts](backend/src/middlewares/upload.ts))
   - Multer 메모리 스토리지 설정
   - 파일 타입 필터링 (JPEG, PNG, WebP)
   - 크기 제한 (최대 5MB)

5. **관리자 권한** ([admin.ts](backend/src/middlewares/admin.ts))
   - 이중 체크: 데이터베이스 role + 이메일 폴백
   - 마이그레이션 친화적 접근

6. **에러 핸들러** ([errorHandler.ts](backend/src/middlewares/errorHandler.ts))
   - 커스텀 AppError 클래스 처리
   - 중앙집중식 에러 처리
   - 환경별 에러 상세 정보 (개발 vs 프로덕션)

**미들웨어 체인 예시** ([user-routes.ts](backend/src/routes/user-routes.ts)):

```typescript
router.post(
  "/me/photos",
  uploadLimiter, // Rate limiting
  upload.single("photo"), // File upload
  authenticate, // JWT verification
  userController.uploadProfilePhoto, // Controller
);
```

### C. 의존성 주입 패턴

**패턴**: 설정 객체를 모듈 수준에서 주입하며, 서비스 내부에서 인스턴스화하지 않습니다.

**예시** ([database.ts](backend/src/config/database.ts)):

```typescript
// Global singleton pattern for Prisma client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**우아한 성능 저하 (Graceful Degradation)** ([redis.ts](backend/src/config/redis.ts)):

```typescript
const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

if (!redisUrl || !redisToken) {
  console.warn("Redis not configured. Functionality disabled.");
}
```

### D. 커스텀 에러 처리 패턴

**패턴**: 애플리케이션 전반에 걸쳐 구조화된 응답을 가진 커스텀 에러 클래스를 사용합니다.

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// 사용 예시:
throw new AppError(404, "USER_NOT_FOUND", "User not found");
```

**표준화된 응답 포맷**:

```typescript
// Success
{ "success": true, "data": {...} }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

### E. 검증 스키마 패턴

**패턴**: 재사용 가능한 변환과 정제 기능을 가진 중앙집중식 Zod 스키마를 사용합니다.

**위치**: [validation.ts](backend/src/utils/validation.ts)

**기능**:

- HTML 살균을 통한 XSS 보호
- 이메일 변환 (소문자 변환, 공백 제거)
- 비밀번호 강도 검증 (8자 이상, 대문자, 숫자, 특수문자)
- 연령 확인 (18세 이상)
- 국가 코드 검증 (ISO 3166-1 alpha-2)
- 복잡한 비즈니스 규칙을 위한 커스텀 정제

### F. 유틸리티 모듈 패턴

**패턴**: 코드 재사용을 위한 단일 책임 유틸리티 모듈을 사용합니다.

**예시**:

1. **관계 확인** ([relationship-checks.ts](backend/src/utils/relationship-checks.ts))

   ```typescript
   export const checkBlockStatus = async (
     userId1: string,
     userId2: string,
   ): Promise<boolean> => {
     const block = await prisma.blockList.findFirst({
       where: {
         OR: [
           { userId: userId1, blockedUserId: userId2 },
           { userId: userId2, blockedUserId: userId1 },
         ],
       },
     });
     return !!block;
   };
   ```

2. **사용자 상태 업데이트** ([user-status.ts](backend/src/utils/user-status.ts))
   - 온라인/오프라인 상태 업데이트 관리
   - 인증 및 소켓 핸들러에서 사용

3. **비밀번호 유틸리티** ([password.ts](backend/src/utils/password.ts))

   ```typescript
   export const hashPassword = async (password: string): Promise<string> => {
     return bcrypt.hash(password, SALT_ROUNDS);
   };

   export const comparePassword = async (
     password: string,
     hash: string,
   ): Promise<boolean> => {
     return bcrypt.compare(password, hash);
   };
   ```

### G. Socket.io 이벤트 핸들러 패턴

**패턴**: 인증, 룸 기반 메시징, 서비스 위임을 통한 실시간 통신을 사용합니다.

**위치**: [match-handler.ts](backend/src/sockets/match-handler.ts)

**소켓 인증**:

```typescript
export const authenticateSocket = async (socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = verifyAccessToken(token);
  socket.userId = decoded.id;
  await prisma.user.update({...}); // Update online status
  next();
};
```

**이벤트 핸들링 패턴**:

```typescript
socket.on('match:request', async (data) => {
  try {
    await matchService.addToMatchQueue(userId);
    const matchedUserId = await matchService.findMatch(userId);
    if (matchedUserId) {
      const session = await matchService.createMatchSession(...);
      io.to(userId).emit('match:found', {...});
      io.to(matchedUserId).emit('match:found', {...});
    }
  } catch (error) {
    socket.emit('match:failed', {reason: error.message});
  }
});
```

**룸 기반 메시징**: 각 사용자는 타겟 통신을 위한 자신만의 룸을 가집니다.

## 3. 요청 처리 흐름 아키텍처

**전체 요청 처리 흐름** (Routes → Middleware → Controllers → Services → Database):

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Route 정의 (user-routes.ts)                                  │
│    router.post('/me/photos', uploadLimiter,                    │
│                upload.single('photo'),                          │
│                userController.uploadProfilePhoto)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Middleware Chain 실행                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ uploadLimiter: Rate limiting 체크                    │    │
│    └──────────────────────┬───────────────────────────────┘    │
│                           ▼                                     │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ upload.single('photo'): 메모리로 파일 업로드          │    │
│    └──────────────────────┬───────────────────────────────┘    │
│                           ▼                                     │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ authenticate: JWT 검증 (라우터에 암묵적)              │    │
│    └──────────────────────┬───────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Controller (user-controller.ts)                             │
│    - req.user에서 userId 추출                                  │
│    - 기본 권한 체크                                             │
│    - 서비스 레이어에 위임                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Service (user-service.ts)                                   │
│    - 비즈니스 로직 (사진 제한 체크: 최대 6개)                    │
│    - Supabase 스토리지 업로드                                   │
│    - 새 사진 URL로 데이터베이스 업데이트                         │
│    - 결과 반환                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Response                                                     │
│    - Controller가 표준화된 JSON 포맷팅                          │
│    - 또는 에러를 에러 핸들러 미들웨어로 전달                     │
└─────────────────────────────────────────────────────────────────┘
```

**라우트 구성** ([index.ts](backend/src/routes/index.ts)):

```typescript
router.use("/auth", authRoutes); // 인증 엔드포인트
router.use("/users", userRoutes); // 사용자 관리
router.use("/agora", agoraRoutes); // 영상통화 토큰
router.use("/friends", friendsRoutes); // 친구 시스템
router.use("/call", callRoutes); // 통화 이력
router.use("/push", pushRoutes); // 푸시 알림
router.use("/admin", adminRoutes); // 관리자 작업
router.use("/moderation", moderationRoutes); // 콘텐츠 모더레이션
```

## 4. 통신 패턴

### A. HTTP REST API

**사용 사례**:

- 사용자 CRUD 작업
- 파일 업로드
- 실시간이 아닌 데이터 조회
- 통화 이력 및 세션 정보
- 친구 및 차단 목록 관리
- 관리자 작업

### B. Socket.io 실시간 통신

**사용 사례**:

- 랜덤 매칭 요청/응답
- 매칭 취소/수락/거절
- 통화 시그널링 (수신, 수락, 거절, 종료)
- 직접 통화 요청
- 친구 상태 브로드캐스트 (온라인/오프라인)
- 모더레이션 경고 및 강제 종료

**소켓 이벤트**:

클라이언트 → 서버:

- `match:request`, `match:cancel`
- `call:accept`, `call:reject`, `call:end`
- `moderation:warning`, `moderation:force-end`

서버 → 클라이언트:

- `match:waiting`, `match:found`, `match:failed`, `match:cancelled`
- `call:incoming`, `call:requested`, `call:accepted`, `call:rejected`, `call:ended`, `call:failed`
- `friend:status-changed`
- `moderation:warning-received`, `moderation:call-force-ended`

## 5. 보안 아키텍처

### 다중 레이어 보안 접근:

1. **입력 검증**: XSS 보호가 포함된 Zod 스키마
2. **인증**: 액세스 토큰(1시간) + 리프레시 토큰(7일) JWT
3. **권한 부여**: 사용자/관리자 역할 확인 미들웨어
4. **Rate Limiting**: 남용 방지를 위한 엔드포인트별 제한
5. **파일 업로드 보안**: 타입/크기 제한, Supabase 스토리지
6. **데이터베이스 트랜잭션**: 중요 작업을 위한 Serializable 격리
7. **비밀번호 보안**: 적절한 솔트 라운드를 사용한 Bcrypt 해싱

**JWT 보안** ([jwt.ts](backend/src/utils/jwt.ts)):

```typescript
const validateSecret = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`${name} required`);
  if (value.length < 32) throw new Error(`${name} must be 32+ chars`);
  return value;
};
```

## 6. 파일 업로드 아키텍처

**다중 서비스 조율**:

1. **Route**: 업로드 미들웨어가 multipart/form-data 처리
2. **Controller**: req.file에서 파일 추출, 사용자 검증
3. **Service**: 비즈니스 로직 (6개 사진 제한 체크)
4. **Storage Service**: 공개 URL 생성과 함께 Supabase 업로드
5. **Database**: 새 사진 URL로 사용자 레코드 업데이트

**예시** ([user-service.ts](backend/src/services/user-service.ts)):

```typescript
export const uploadProfilePhoto = async (
  userId: string,
  file: Express.Multer.File,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.profilePhotos.length >= 6) {
    throw new AppError(400, "MAX_PHOTOS_EXCEEDED", "Max 6 photos");
  }

  const fileName = `${userId}/${uuidv4()}.${fileExt}`;
  const { data, error } = await supabaseStorage
    .from("profile-photos")
    .upload(fileName, file.buffer, { contentType: file.mimetype });

  const photoUrl = supabaseStorage
    .from("profile-photos")
    .getPublicUrl(data.path);

  await prisma.user.update({
    where: { id: userId },
    data: { profilePhotos: [...user.profilePhotos, photoUrl] },
  });
};
```

## 7. 데이터베이스 트랜잭션 전략

**트랜잭션을 사용하는 중요 작업**:

- 사용자 등록 (베타 제한 강제)
- 계정 삭제 (올바른 순서로 연쇄 삭제)

**격리 수준**: Race Condition에 민감한 작업을 위한 Serializable

**예시 - Race Condition 방지**:

```typescript
// Multiple users trying to register simultaneously
const user = await prisma.$transaction(
  async (tx) => {
    // All checks and creation in single atomic operation
    const userCount = await tx.user.count();
    if (userCount >= betaLimit) {
      throw new AppError(403, 'BETA_LIMIT_REACHED', 'Beta full');
    }
    // ... more checks
    return await tx.user.create({data: {...}});
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 5000,
  }
);
```

## 8. 외부 서비스 통합

| 서비스       | 목적                             | 설정 파일                                                                                                                                                   | 패턴                 |
| ------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Supabase     | PostgreSQL + 파일 스토리지       | [database.ts](backend/src/config/database.ts), [supabase.ts](backend/src/config/supabase.ts), [storage-service.ts](backend/src/services/storage-service.ts) | Singleton + Service  |
| Agora        | 영상통화 토큰 (월 10,000분 무료) | [agora-controller.ts](backend/src/controllers/agora-controller.ts)                                                                                          | Direct SDK 사용      |
| Firebase     | FCM 푸시 알림                    | [firebase.ts](backend/src/config/firebase.ts)                                                                                                               | Admin SDK            |
| Upstash      | Redis 캐시 (선택사항)            | [redis.ts](backend/src/config/redis.ts)                                                                                                                     | Graceful degradation |
| Hugging Face | AI 콘텐츠 모더레이션             | [moderation-service.ts](backend/src/services/moderation-service.ts)                                                                                         | API 클라이언트       |

## 9. 아키텍처 장점

1. **관심사 분리**: 레이어 간 명확한 경계 (routes, controllers, services, utils)
2. **테스트 가능성**: 독립적으로 테스트 가능한 순수 함수 서비스
3. **확장성**: 얇은 컨트롤러로 엔드포인트 추가 용이
4. **보안**: 다중 방어 레이어 (검증, 인증, rate limiting)
5. **에러 처리**: 중앙집중식, 일관된 에러 응답
6. **타입 안전성**: Prisma 생성 타입을 사용한 완전한 TypeScript
7. **코드 재사용**: 유틸리티로 서비스 간 중복 방지
8. **실시간 지원**: REST와 함께 깔끔한 Socket.io 통합
9. **트랜잭션 안전성**: 중요 작업을 위한 적절한 데이터베이스 트랜잭션
10. **우아한 성능 저하**: 선택적 서비스가 앱을 중단시키지 않음

## 10. 아키텍처 트레이드오프 및 제한사항

모든 아키텍처 결정에는 트레이드오프가 있습니다. 현재 설계의 제한사항과 개선 가능 영역:

### 잠재적 단점

#### 1. **과도한 추상화 (Over-Abstraction)**

**문제점**:

- 단순한 CRUD 작업에도 Controller → Service → Database의 3단계 레이어를 거침
- 간단한 조회 작업에도 보일러플레이트 코드가 많음

```typescript
// 예시: 단순 조회에도 여러 레이어 필요
// Controller
export const getUser = async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id);
  res.json({ success: true, data: user });
};

// Service
export const getUserById = async (id: string) => {
  return await prisma.user.findUnique({ where: { id } });
};
// → Prisma를 직접 호출해도 되는 단순 작업에 불필요한 추상화
```

**트레이드오프**: 일관성 vs 효율성

- 장점: 모든 코드가 동일한 패턴을 따라 이해하기 쉬움
- 단점: 개발 속도가 느려지고 코드량 증가

#### 2. **테스트 부재**

**문제점**:

- 계층형 아키텍처는 테스트하기 좋은 구조이나, 실제 테스트 코드가 없음
- Unit tests, Integration tests, E2E tests 모두 부재
- 리팩토링 시 회귀 버그 위험 높음

**개선 방안**:

```typescript
// 예시: Service 레이어 테스트
describe("AuthService", () => {
  it("should register user with valid invite code", async () => {
    const mockUser = { email: "test@test.com", inviteCode: "BETA-0001" };
    const result = await authService.register(mockUser);
    expect(result.user).toBeDefined();
    expect(result.tokens).toBeDefined();
  });
});
```

#### 3. **에러 처리의 일관성 문제**

**문제점**:

- AppError를 사용하지만 일부 코드에서는 일반 Error throw
- 에러 코드 표준화가 부족 (문서화되지 않음)
- 클라이언트에서 어떤 에러 코드가 올 수 있는지 예측 어려움

```typescript
// 개선 필요: 에러 코드 Enum 정의
export enum ErrorCode {
  // Auth errors
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  EMAIL_EXISTS = "EMAIL_EXISTS",
  INVALID_INVITE_CODE = "INVALID_INVITE_CODE",

  // User errors
  USER_NOT_FOUND = "USER_NOT_FOUND",
  MAX_PHOTOS_EXCEEDED = "MAX_PHOTOS_EXCEEDED",

  // ... 모든 에러 코드 중앙 관리
}
```

#### 4. **트랜잭션 사용의 제한적 범위**

**문제점**:

- Serializable 격리 수준은 성능 오버헤드가 큼
- 모든 중요 작업이 트랜잭션으로 보호되지 않음 (예: 사진 업로드 + DB 업데이트는 트랜잭션 없음)
- Supabase Storage 실패 시 DB만 업데이트되는 불일치 가능

```typescript
// 문제 있는 코드 (파일 업로드 아키텍처 섹션 참조)
export const uploadProfilePhoto = async (userId: string, file: Express.Multer.File) => {
  const user = await prisma.user.findUnique({where: {id: userId}});

  // Supabase 업로드 실패 가능 지점 1
  const {data, error} = await supabaseStorage.upload(...);

  // DB 업데이트는 성공하지만 파일은 없을 수 있음
  await prisma.user.update({
    where: {id: userId},
    data: {profilePhotos: [...user.profilePhotos, photoUrl]}
  });
};

// 개선: 보상 트랜잭션(Compensating Transaction) 패턴 필요
```

#### 5. **Socket.io와 HTTP의 상태 동기화 문제**

**문제점**:

- Socket 연결과 HTTP 요청이 독립적으로 동작
- 사용자의 온라인 상태가 실제와 불일치 가능
- Socket 재연결 로직이 복잡하고 에러 처리가 어려움

```typescript
// 문제 시나리오:
// 1. 사용자가 Socket 연결 → isOnline: true
// 2. 네트워크 끊김 → Socket 연결 끊어짐
// 3. HTTP 요청은 여전히 가능 (다른 연결)
// 4. isOnline이 false로 업데이트 안 될 수 있음
```

#### 6. **의존성 주입(DI) 패턴의 미흡**

**문제점**:

- 서비스 간 직접 import로 강결합
- 테스트 시 Mock 교체가 어려움
- 순환 의존성 가능성

```typescript
// 현재: 강결합
import { prisma } from "../config/database";
import { uploadToSupabase } from "../services/storage-service";

// 개선: DI 컨테이너 사용 (예: tsyringe, InversifyJS)
@injectable()
class UserService {
  constructor(
    @inject("Database") private db: Database,
    @inject("StorageService") private storage: StorageService,
  ) {}
}
```

#### 7. **캐싱 전략 부재**

**문제점**:

- Redis가 선택사항이지만 실제 캐싱 로직이 없음
- 매번 DB 조회로 성능 저하 (예: 사용자 프로필 조회)
- N+1 쿼리 문제 가능성

```typescript
// 개선 예시:
export const getUserById = async (id: string) => {
  const cacheKey = `user:${id}`;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (redis && user) {
    await redis.setex(cacheKey, 3600, JSON.stringify(user));
  }

  return user;
};
```

#### 8. **모니터링 및 로깅 부족**

**문제점**:

- console.log 외 구조화된 로깅 없음
- 성능 모니터링 도구 부재 (APM)
- 에러 트래킹 시스템 없음 (Sentry 등)

```typescript
// 개선: 구조화된 로깅
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

logger.info("User registered", { userId, email, timestamp: new Date() });
```

#### 9. **데이터베이스 마이그레이션 전략의 복잡성**

**문제점**:

- Supabase pooler와 Prisma의 호환성 문제
- 수동 SQL 실행 필요로 배포 자동화 어려움
- 마이그레이션 롤백 전략 부재

**개선 필요**: CI/CD 파이프라인에서 자동화된 마이그레이션 실행

#### 10. **API 버전 관리 부재**

**문제점**:

- `/api/v1` 같은 버전 관리 없음
- Breaking change 시 기존 앱 지원 어려움
- 점진적 기능 배포 불가능

```typescript
// 개선: 버전별 라우팅
router.use("/v1/auth", authRoutesV1);
router.use("/v2/auth", authRoutesV2);
```

### 트레이드오프 요약

| 영역          | 현재 접근                     | 트레이드오프                |
| ------------- | ----------------------------- | --------------------------- |
| **추상화**    | 모든 요청이 3단계 레이어 통과 | 일관성 ↑ / 개발 속도 ↓      |
| **테스트**    | 테스트 코드 없음              | 빠른 개발 ↑ / 안정성 ↓      |
| **에러 처리** | AppError 사용, 표준 부족      | 유연성 ↑ / 예측 가능성 ↓    |
| **트랜잭션**  | 일부만 Serializable           | 성능 ↑ / 데이터 일관성 ↓    |
| **캐싱**      | Redis 선택사항, 로직 없음     | 단순함 ↑ / 성능 ↓           |
| **DI**        | 직접 import                   | 단순함 ↑ / 테스트 용이성 ↓  |
| **모니터링**  | 기본 로깅만                   | 빠른 시작 ↑ / 운영 가시성 ↓ |

### 우선순위별 개선 권장사항

#### 🔴 높은 우선순위 (즉시 개선)

1. **테스트 코드 작성** - 핵심 비즈니스 로직(auth, match)부터
2. **에러 코드 표준화** - Enum으로 중앙 관리
3. **로깅 시스템 구축** - Winston + Sentry 통합

#### 🟡 중간 우선순위 (단기)

4. **트랜잭션 범위 확대** - 파일 업로드 등 불일치 가능 영역
5. **캐싱 전략 구현** - 자주 조회되는 데이터부터
6. **API 버전 관리** - 향후 Breaking change 대비

#### 🟢 낮은 우선순위 (장기)

7. **DI 컨테이너 도입** - 프로젝트 성장 시 고려
8. **과도한 추상화 제거** - 성능 병목 발견 시
9. **마이그레이션 자동화** - CI/CD 성숙도 향상 후

## 11. 핵심 요약

Beyond Meet 백엔드는 **전문가급 Node.js 아키텍처**를 보여줍니다:

### 강점

- ✅ **클린 아키텍처**: 프레젠테이션(컨트롤러), 비즈니스 로직(서비스), 데이터 액세스(Prisma) 간 명확한 분리
- ✅ **SOLID 원칙**: 단일 책임(얇은 컨트롤러), 의존성 주입(설정 모듈)
- ✅ **보안 우선**: 다중 검증 및 인증 레이어
- ✅ **유지보수성**: 일관된 패턴, 재사용 가능한 유틸리티, 중앙집중식 에러 처리
- ✅ **확장성**: 모듈러 설계로 기능 추가 용이
- ✅ **실시간 지원**: 이중 통신 패턴 (HTTP + WebSocket)
- ✅ **프로덕션 준비**: 트랜잭션 안전성, rate limiting, 에러 처리

### 개선 필요 영역

- ⚠️ **테스트 커버리지**: Unit/Integration 테스트 부재
- ⚠️ **모니터링**: 구조화된 로깅 및 APM 도구 필요
- ⚠️ **캐싱**: Redis 활용도 낮음
- ⚠️ **에러 표준화**: 에러 코드 중앙 관리 필요
- ⚠️ **트랜잭션 범위**: 외부 서비스 연동 시 불일치 가능

이 아키텍처는 **베타 단계 MVP에 적합**하며, 사용자가 증가하면서 위의 개선사항들을 단계적으로 적용하는 것을 권장합니다. 완벽한 아키텍처보다는 **현재 단계에 맞는 적절한 복잡도**를 유지하는 것이 중요합니다.
