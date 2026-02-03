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

---

## useEffect 사용 가이드라인

### 지양해야 할 패턴 (Anti-patterns)

#### 1. 의존성 배열 없는 Effect

```typescript
// ❌ Bad: 매 렌더마다 실행됨
useEffect(() => {
  someRef.current = someValue;
});

// ✅ Good: 값 변경 시에만 실행
useEffect(() => {
  someRef.current = someValue;
}, [someValue]);
```

#### 2. State를 Ref로 동기화하는 Effect

```typescript
// ❌ Bad: 불필요한 렌더 사이클 발생
const [value, setValue] = useState(0);
const valueRef = useRef(0);

useEffect(() => {
  valueRef.current = value;
}, [value]);

// ✅ Good: setState 호출 시점에 ref도 함께 업데이트
const handleChange = (newValue: number) => {
  valueRef.current = newValue;
  setValue(newValue);
};
```

#### 3. Error 상태를 감시하는 Effect (React Query)

```typescript
// ❌ Bad: useEffect로 에러 감시
const { error } = useQuery({ ... });

useEffect(() => {
  if (error) Alert.alert('오류', message);
}, [error]);

// ✅ Good: Custom Hook에서 meta 활용
// hooks/useXxx.ts
export const useXxx = () => {
  return useQuery({
    queryKey: [...],
    queryFn: ...,
    meta: { errorMessage: '에러 메시지' },
  });
};

// App.tsx - QueryClient 설정
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (_error, query) => {
      const message = query.meta?.errorMessage as string;
      if (message) Alert.alert('오류', message);
    },
  }),
});
```

#### 4. 콜백 함수를 Ref로 동기화하는 복수의 Effect

```typescript
// ❌ Bad: 여러 개의 ref 동기화 effect
useEffect(() => { onClickRef.current = onClick; }, [onClick]);
useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

// ✅ Good: 렌더 시점에 직접 할당 (React 18+)
const callbacksRef = useRef({ onClick, onChange });
callbacksRef.current = { onClick, onChange };
```

### Effect가 적절한 경우

1. **외부 시스템과의 동기화**: Socket.io 이벤트 리스너, DOM API 등
2. **타이머/인터벌 관리**: setInterval, setTimeout
3. **구독 관리**: 이벤트 구독/해제
4. **브라우저 API**: IntersectionObserver, ResizeObserver 등

### Effect 대신 사용할 것

| 시나리오 | 대안 |
|---------|------|
| Props 기반 state 업데이트 | 렌더링 중 직접 계산 또는 key prop 사용 |
| 이벤트 핸들러 로직 | 이벤트 핸들러 함수 내에서 처리 |
| 서버 데이터 fetching | React Query useQuery |
| 에러 처리 | React Query onError 또는 Error Boundary |
| 파생 상태 계산 | useMemo 또는 렌더링 중 계산 |

---

## Zod 입력 검증 패턴

### 스키마 파일 위치
`backend/src/utils/validation.ts`

### 주요 스키마

| 스키마 | 용도 |
|-------|------|
| `registerSchema` | 회원가입 입력 검증 |
| `loginSchema` | 로그인 입력 검증 |
| `resetPasswordSchema` | 비밀번호 재설정 검증 |
| `updateProfileSchema` | 프로필 업데이트 검증 |
| `sendVerificationCodeSchema` | 이메일 인증 코드 발송 |
| `verifyCodeSchema` | 인증 코드 확인 |

### 비밀번호 규칙

- 최소 8자
- 대문자 1개 이상
- 숫자 1개 이상
- 특수문자 1개 이상

### 사용 예시

```typescript
import { registerSchema, formatZodError } from '../utils/validation';
import { AppError } from './errors';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Zod 스키마로 입력 검증
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(result.error));
    }

    // 2. 검증된 데이터 사용 (타입 추론됨)
    const validatedData = result.data;

    // 3. 서비스 호출
    const response = await registerUser(validatedData);

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};
```

### XSS 방지

모든 문자열 필드는 `sanitizeHtml` 변환이 적용됨:

```typescript
const sanitizeHtml = (str: string): string => {
  return str.replace(/<[^>]*>/g, '').trim();
};
```

### 커스텀 스키마 정의

```typescript
// 닉네임 스키마 예시
const nicknameSchema = z
  .string()
  .min(2, '닉네임은 최소 2자 이상이어야 합니다')
  .max(20, '닉네임은 20자를 초과할 수 없습니다')
  .regex(/^[a-zA-Z0-9가-힣_]+$/, '닉네임은 영문, 한글, 숫자, 언더스코어만 사용 가능합니다')
  .transform(sanitizeHtml);
```

---

## 파일 업로드 패턴

### Multer 미들웨어 설정

위치: `backend/src/middlewares/upload.ts`

```typescript
import multer from 'multer';

// 메모리 스토리지 (Supabase로 업로드하므로 디스크 저장 불필요)
const storage = multer.memoryStorage();

// 파일 필터 (이미지만 허용)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('허용되지 않는 파일 형식입니다'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
```

### Storage Service

위치: `backend/src/services/storage-service.ts`

```typescript
import { supabase } from '../config/supabase';

export const uploadProfilePhoto = async (
  userId: string,
  file: Express.Multer.File
): Promise<string> => {
  const fileName = `${userId}/${Date.now()}_${file.originalname}`;

  const { data, error } = await supabase.storage
    .from('profile-photos')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw new AppError(500, 'UPLOAD_FAILED', '파일 업로드에 실패했습니다');

  // Public URL 생성
  const { data: { publicUrl } } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(data.path);

  return publicUrl;
};
```

### 라우트에서 사용

```typescript
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

// Rate limiting + Multer + Controller
router.post(
  '/me/photos',
  uploadLimiter,           // 1분당 3회 제한
  upload.single('photo'),  // 'photo' 필드의 단일 파일
  userController.uploadProfilePhoto
);
```

---

## React Query 키 패턴

위치: `mobile/src/constants/queryKeys.ts`

```typescript
export const queryKeys = {
  // 프로필
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
    detail: (userId: string) => [...queryKeys.profile.all, 'detail', userId] as const,
  },

  // 친구
  friends: {
    all: ['friends'] as const,
    list: () => [...queryKeys.friends.all, 'list'] as const,
    blocked: () => [...queryKeys.friends.all, 'blocked'] as const,
  },

  // 통화 기록
  callHistory: {
    all: ['callHistory'] as const,
    list: () => [...queryKeys.callHistory.all, 'list'] as const,
    session: (sessionId: string) => [...queryKeys.callHistory.all, 'session', sessionId] as const,
  },
};
```

### 캐시 무효화 예시

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';

// 친구 추가 후 목록 무효화
const queryClient = useQueryClient();

const addFriendMutation = useMutation({
  mutationFn: (friendId: string) => friendsApi.addFriend(friendId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
  },
});
