# 코딩 규칙 및 패턴

## Controller 패턴

Controllers are thin - 비즈니스 로직은 Service로 위임:

```typescript
// ✅ Good: Thin Controller
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await registerUser(req.body); // Service handles logic
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ❌ Bad: Fat Controller
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, inviteCode } = req.body;
    // Don't put business logic here
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ ... });
    // ...
  } catch (error) {
    next(error);
  }
};
```

---

## Service 패턴

```typescript
// backend/src/services/auth-service.ts
export const registerUser = async (data: RegisterInput) => {
  // 1. Validate invite code
  const inviteCode = await validateInviteCode(data.inviteCode);

  // 2. Check beta limit
  const userCount = await prisma.user.count();
  if (userCount >= BETA_LIMIT) {
    throw new AppError('BETA_LIMIT_REACHED', 400);
  }

  // 3. Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      // ...
    }
  });

  // 4. Generate tokens
  const tokens = generateTokens(user.id);

  return { user, ...tokens };
};
```

---

## 에러 핸들링

### Custom Error Class

```typescript
// backend/src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message?: string
  ) {
    super(message || code);
  }
}
```

### Error Middleware

```typescript
// backend/src/middlewares/errorHandler.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message }
    });
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: '서버 오류가 발생했습니다.' }
  });
};
```

### 사용 예시

```typescript
// Service에서 에러 발생
if (!user) {
  throw new AppError('USER_NOT_FOUND', 404, '사용자를 찾을 수 없습니다.');
}

if (user.isBlocked) {
  throw new AppError('USER_BLOCKED', 403, '차단된 사용자입니다.');
}
```

---

## API 응답 형식

모든 API는 일관된 형식으로 응답:

```typescript
// 성공
{
  "success": true,
  "data": { ... }
}

// 에러
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message"
  }
}

// 페이지네이션
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 파일 네이밍

| 타입 | 형식 | 예시 |
|------|------|------|
| 파일 | kebab-case | `auth-controller.ts` |
| 컴포넌트 | PascalCase | `HomeScreen.tsx` |
| 훅 | camelCase (use 접두사) | `useAuth.ts` |
| 상수 | UPPER_SNAKE_CASE | `BETA_USER_LIMIT` |

---

## 환경 변수 접근

프론트엔드에서는 `config/env.ts`를 통해 중앙화:

```typescript
// ✅ Good
import { ENV } from '@/config/env';
const api = axios.create({ baseURL: ENV.API_BASE_URL });

// ❌ Bad
import Config from 'react-native-config';
const api = axios.create({ baseURL: Config.API_BASE_URL });
```

---

## 데이터베이스 마이그레이션

Supabase Pooler 호환성 문제로 수동 마이그레이션 필요:

```bash
# 1. SQL 생성만 (실행 안 함)
npx prisma migrate dev --name <name> --create-only

# 2. 생성된 SQL을 Supabase Dashboard → SQL Editor에서 실행

# 3. Prisma Client 재생성
npm run prisma:generate
```

**주의**: `prisma db push`나 `prisma migrate deploy` 직접 실행 금지
