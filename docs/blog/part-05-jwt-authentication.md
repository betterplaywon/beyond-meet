# 영상 데이팅 앱 만들기 #5 - JWT 인증 시스템 구축

> **이전 글 요약**: Part 4에서는 Supabase와 Prisma를 연동해 PostgreSQL 데이터베이스를 구축했다. 10개의 모델을 설계하고, 복합 인덱스를 통해 쿼리 성능을 크게 개선할 수 있었다.

드디어 백엔드의 핵심인 인증 시스템을 구현할 차례가 됐다. 프론트엔드 개발자로서 인증은 항상 "그냥 로그인 API 호출하면 되는 거 아닌가?" 정도로만 생각했었는데, 직접 구현하려고 보니 생각보다 고려할 게 많았다. 비밀번호는 어떻게 저장해야 안전한지, 세션과 토큰의 차이가 뭔지, 동시에 같은 이메일로 가입 요청이 오면 어떻게 되는지... 하나씩 찾아가며 배워나갔다.

---

## 🚨 2025년, 한국 통신 3사 보안 사고가 주는 교훈

인증 시스템을 공부하면서 2025년에 있었던 한국 통신 3사의 대형 보안 사고들을 알게 됐다. 이 사건들은 "기본적인 보안 원칙을 지키지 않으면 어떤 일이 벌어지는가"를 적나라하게 보여준다.

### SK텔레콤: 비밀번호 평문 저장의 재앙

2025년 4월, SK텔레콤에서 역대 최대 규모의 해킹 사고가 발생했다. 민관합동조사단의 조사 결과, 공격자는 **2021년 8월**부터 무려 3년 넘게 SKT 내부망에 잠입해 있었다.

가장 충격적인 부분은 침투 경로였다. SKT의 시스템 관리망 서버에는 **관리자 계정 정보(ID, 비밀번호)가 암호화 없이 평문으로 저장**되어 있었다. 공격자는 이 평문 계정 정보를 확보한 후 내부 서버와 코어망 시스템에 악성코드를 설치하고 통신망 전체를 장악했다.

피해 규모도 엄청났다:
- **유심 인증키(Ki) 2,614만 건** 유출 - 역시 암호화 없이 평문 저장
- **가입자 식별번호(IMSI) 2,696만 건** 유출
- 사실상 **LTE·5G 전체 이용자 2,324만 명**의 개인정보가 노출

개인정보보호위원회는 SKT에 **역대 최대 과징금 1,347억 원**을 부과했고, CEO가 경질되는 사태로 이어졌다. 글로벌 보안 컨설팅 기업 CMA는 이 사건을 "통신 부문 역사상 유례없는 보안 참사"로 평가했다.

### KT: 해킹 은폐와 신고 지연

KT도 2024년에 해킹을 당했지만, 이 사실을 **1년 6개월 동안 숨기다** 2025년 하반기에야 신고했다. SKT 유심 해킹에 사용된 것과 동일한 'BPF도어' 악성코드에 감염된 사실을 알면서도 당국에 알리지 않은 것이다.

불법 펨토셀(초소형 기지국)을 통해 **2만 2천여 명의 개인정보가 유출**되고 **368건의 무단 소액결제** 피해가 발생했다.

### LG유플러스: 증거 훼손 의혹

LG유플러스는 2025년 7월 해킹 정황을 인지하고도 KISA 신고를 미루다 10월에야 침해 사실을 발표했다. 더 심각한 문제는 조사단이 확인한 바에 따르면, **사고 관련 서버들이 조사 전에 재설치되거나 폐기**되어 침해 흔적 확인이 불가능했다는 점이다.

### 개발자로서 배운 교훈

이 사건들을 보면서 몇 가지 교훈을 얻었다:

1. **비밀번호는 절대 평문으로 저장하면 안 된다** - SKT 사고의 핵심 원인
2. **암호화는 "저장 시"와 "전송 시" 모두 필요하다** - 저장된 데이터도 암호화해야 함
3. **보안 사고는 발생 즉시 신고해야 한다** - 은폐는 더 큰 피해로 이어짐
4. **기본적인 보안 원칙이 가장 중요하다** - 대기업도 기본을 지키지 않으면 무너진다

Beyond Meet을 만들면서 "개인 프로젝트니까 대충 해도 되겠지"라는 생각이 들 때도 있었다. 하지만 이 사건들을 보면서 **보안에는 타협이 없어야 한다**는 걸 깨달았다. 비밀번호 해싱, 토큰 관리, 입력 검증... 하나하나가 사용자의 정보를 지키는 방패다.

---

## 📌 이번 파트에서 다룰 내용

- JWT의 개념과 세션 기반 인증과의 차이
- bcrypt를 사용한 비밀번호 해싱
- Access Token과 Refresh Token의 역할
- Zod를 활용한 입력값 검증
- Race Condition 방지를 위한 트랜잭션 처리
- 인증 미들웨어 구현

---

## 💡 세션 vs JWT, 어떤 방식을 써야 할까?

### 인증 방식을 찾아보다

"Node.js 로그인 구현"이라고 검색하니 크게 두 가지 방식이 나왔다. 세션 기반 인증과 토큰 기반 인증(JWT). 처음엔 둘의 차이가 뭔지 감이 안 왔는데, 각각의 동작 방식을 그려보니 이해가 됐다.

**세션 기반 인증**은 서버가 사용자 정보를 메모리나 Redis에 저장하고, 클라이언트에게는 세션 ID만 쿠키로 전달하는 방식이다. 매 요청마다 서버는 세션 ID로 저장소를 조회해서 사용자를 확인한다.

```
1. 사용자 로그인
2. 서버가 세션 ID 생성 → 메모리/Redis에 저장
3. 세션 ID를 쿠키로 클라이언트에 전달
4. 이후 요청마다 쿠키의 세션 ID로 사용자 확인
```

이 방식의 문제는 서버가 상태를 갖게 된다는 점이었다. 서버가 여러 대로 늘어나면 세션을 공유해야 하고, 무엇보다 React Native에서 쿠키를 다루는 게 생각보다 복잡하다고 한다.

**JWT(JSON Web Token)**는 반대로 서버가 아무것도 저장하지 않는다. 사용자 정보를 토큰 자체에 담아서 서명과 함께 클라이언트에게 전달하고, 이후 요청에서는 서명만 검증하면 된다.

```
1. 사용자 로그인
2. 서버가 JWT 토큰 생성 (서명 포함)
3. 토큰을 클라이언트에 전달
4. 이후 요청마다 토큰을 Header에 포함
5. 서버는 서명만 검증 (DB 조회 불필요)
```

React Native에서는 AsyncStorage에 토큰을 저장하면 되니까 훨씬 간단했다. 서버 확장도 쉽고, Stateless하게 유지할 수 있다는 점이 마음에 들어서 JWT를 선택했다.

### JWT 구조 살펴보기

JWT가 어떻게 생겼는지 궁금해서 [jwt.io](https://jwt.io/)에서 디코딩해봤다. 토큰은 점(.)으로 구분된 세 부분으로 이루어져 있었다.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

- **Header**: 알고리즘 정보 (HS256 등)
- **Payload**: 사용자 데이터 (id, email 등)
- **Signature**: 위변조 방지를 위한 서명

여기서 중요한 걸 알게 됐는데, Payload 부분은 Base64로 인코딩된 것일 뿐 암호화가 아니라서 누구나 내용을 볼 수 있다. 그래서 비밀번호 같은 민감한 정보는 절대 넣으면 안 된다.

---

## 🔐 Step 1: bcrypt로 비밀번호 해싱

### 비밀번호를 그냥 저장하면 안 되는 이유

처음에는 솔직히 "비밀번호를 DB에 그냥 저장하면 안 되나?"라는 생각이 들었다. 검색해보니 이건 정말 위험한 발상이었다.

앞서 언급한 SK텔레콤 사고가 바로 이 교훈을 보여준다. SKT는 시스템 관리망 서버에 관리자 비밀번호를 암호화 없이 평문으로 저장했고, 공격자는 이를 통해 3년 동안 내부망을 장악했다. 유심 인증키(Ki) 2,614만 건도 암호화 없이 저장되어 있어서 해커가 원본 그대로 탈취할 수 있었다.

만약 데이터베이스가 유출되면 사용자들의 비밀번호가 그대로 노출되고, 같은 비밀번호를 다른 서비스에서도 사용하는 경우가 많으니 연쇄적인 피해로 이어질 수 있다.

그래서 비밀번호는 반드시 **단방향 해싱**을 해야 한다. 해싱된 값에서는 원래 비밀번호를 복원할 수 없고, 로그인할 때는 입력받은 비밀번호를 같은 방식으로 해싱해서 저장된 값과 비교하면 된다.

### bcrypt를 선택한 이유

"Node.js 비밀번호 암호화"로 검색하니 bcrypt가 가장 많이 언급됐다. bcrypt는 몇 가지 특징이 있다.

- **단방향 해싱**: 복호화가 불가능하다
- **Salt 자동 생성**: 같은 비밀번호라도 매번 다른 해시값이 나온다
- **의도적으로 느림**: 무차별 대입 공격(brute force)을 어렵게 만든다

특히 Salt라는 개념이 흥미로웠다. 같은 비밀번호 "1234"를 해싱해도 매번 다른 결과가 나오기 때문에, 공격자가 미리 계산해둔 해시 테이블(레인보우 테이블)로 비밀번호를 찾아내는 게 불가능해진다.

```bash
npm install bcryptjs
npm install @types/bcryptjs --save-dev
```

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

`SALT_ROUNDS`는 해싱을 몇 번 반복할지를 나타낸다. 10이면 2^10 = 1024번 반복하는 것이다. 숫자가 높을수록 안전하지만 느려지는데, 10이 일반적으로 권장되는 값이라고 해서 그대로 사용했다.

테스트해보니 같은 비밀번호를 여러 번 해싱해도 매번 다른 값이 나왔다. Salt가 제대로 동작하는 것이다.

```typescript
const hashed = await hashPassword('MyPassword123!');
// $2a$10$N9qo8uLOickgx2ZMRZoMye.bDDD4TmXPOPy.CJk3tXFPBQ9ZQUQKW

const isMatch = await comparePassword('MyPassword123!', hashed);
// true
```

---

## 🎫 Step 2: JWT 토큰 생성

### Access Token과 Refresh Token이 왜 둘 다 필요할까

JWT 관련 자료를 찾다 보니 대부분 Access Token과 Refresh Token을 함께 사용하고 있었다. 처음엔 "토큰 하나면 충분하지 않나?"라는 의문이 들었다.

이유를 찾아보니 보안과 사용성의 균형 때문이었다.

- **Access Token**: 짧은 만료 시간 (보통 1시간). 매 API 요청마다 사용하므로 탈취될 위험이 있지만, 1시간이면 무효화된다.
- **Refresh Token**: 긴 만료 시간 (7일). Access Token이 만료되면 이걸로 새 Access Token을 발급받는다. 자주 사용하지 않아서 상대적으로 안전하다.

만약 Access Token 하나만 쓰고 유효기간을 길게 잡으면, 탈취당했을 때 오랫동안 악용될 수 있다. 반대로 유효기간을 짧게 하면 사용자가 자주 다시 로그인해야 한다. 두 토큰을 조합하면 이 문제를 해결할 수 있다.

```bash
npm install jsonwebtoken
npm install @types/jsonwebtoken --save-dev
```

**`src/utils/jwt.ts`**:

```typescript
import jwt from 'jsonwebtoken';

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};
```

처음에는 `process.env.JWT_SECRET || 'default-secret'` 이렇게 기본값을 넣었었다. 그런데 보안 가이드를 읽어보니 이게 위험하다고 했다. 기본값이 GitHub에 올라갈 수도 있고, 누구나 그 값으로 토큰을 위조할 수 있으니까. 그래서 환경변수가 없거나 32자 미만이면 서버가 아예 시작되지 않도록 바꿨다.

시크릿 키는 터미널에서 랜덤하게 생성할 수 있다.

```bash
openssl rand -base64 32
```

---

## ✅ Step 3: Zod로 입력 검증

### 사용자 입력을 믿으면 안 된다

"Node.js 보안"을 검색하다가 입력 검증의 중요성을 알게 됐다. 클라이언트에서 보내는 데이터는 언제든 조작될 수 있다. 이메일 형식이 맞는지, 비밀번호가 너무 짧지 않은지, 심지어 HTML 태그를 넣어서 XSS 공격을 시도하는 건 아닌지 서버에서 반드시 검증해야 한다.

TypeScript 입력 검증 라이브러리를 찾아보니 Joi와 Zod가 많이 언급됐다. Joi는 오래되고 유명하지만 TypeScript 타입 추론이 약하다고 했고, **Zod**는 TypeScript를 완벽하게 지원하면서 스키마에서 타입을 자동으로 추론해준다. Prisma를 쓰면서 타입 자동 생성의 편리함을 느꼈기 때문에 Zod를 선택했다.

```bash
npm install zod
```

**`src/utils/validation.ts`** (핵심 부분):

```typescript
import { z } from 'zod';

const sanitizeHtml = (str: string): string => {
  return str.replace(/<[^>]*>/g, '').trim();
};

const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .regex(/[A-Z]/, '비밀번호에 대문자가 최소 1개 포함되어야 합니다')
  .regex(/[0-9]/, '비밀번호에 숫자가 최소 1개 포함되어야 합니다')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, '비밀번호에 특수문자가 최소 1개 포함되어야 합니다');

const emailSchema = z
  .string()
  .email('유효한 이메일 형식이 아닙니다')
  .max(255)
  .transform((email) => email.toLowerCase().trim());

const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다')
  .refine((date) => {
    const birth = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    return age >= 18;
  }, '18세 이상만 가입할 수 있습니다');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: z.string().min(2).max(20).transform(sanitizeHtml),
  birthDate: birthDateSchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  // ... 기타 필드
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

Zod를 쓰면서 몇 가지 유용한 기능을 알게 됐다.

1. **`.transform()`**: 데이터를 변환할 수 있다. 이메일을 소문자로 바꾸거나, HTML 태그를 제거하는 데 썼다.
2. **`.refine()`**: 복잡한 커스텀 검증 로직을 넣을 수 있다. 18세 이상인지 확인하는 데 사용했다.
3. **`z.infer<>`**: 스키마에서 TypeScript 타입을 자동으로 생성해준다. 덕분에 타입을 따로 정의할 필요가 없었다.

---

## 🚀 Step 4: 회원가입 API 구현

### Race Condition 문제와 해결

회원가입 로직을 작성하면서 생각지 못한 문제를 발견했다. 같은 이메일로 동시에 여러 요청이 오면 어떻게 될까?

```
1. 요청 A: 이메일 중복 확인 → 없음
2. 요청 B: 이메일 중복 확인 → 없음 (A가 아직 생성 안 함)
3. 요청 A: 사용자 생성 성공
4. 요청 B: 사용자 생성 성공 (중복!)
```

이런 상황을 **Race Condition**이라고 한다. 검색해보니 PostgreSQL의 트랜잭션 격리 수준으로 해결할 수 있었다.

- **Read Committed** (기본값): 위 문제가 발생할 수 있음
- **Serializable**: 트랜잭션을 순차적으로 처리해서 충돌을 방지

**`src/services/auth-service.ts`** (핵심 부분):

```typescript
export const register = async (data: RegisterInput) => {
  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.$transaction(
    async (tx) => {
      // 이메일 중복 확인
      const existingUser = await tx.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError(400, 'EMAIL_EXISTS', '이미 사용 중인 이메일입니다');
      }

      // 사용자 생성
      return tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          nickname: data.nickname,
          birthDate: new Date(data.birthDate),
          gender: data.gender,
          // ...
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 5000,
    }
  );

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

Serializable 격리 수준을 쓰면 한 트랜잭션이 끝날 때까지 다른 트랜잭션이 기다린다. 조금 느리긴 하지만, 회원가입처럼 데이터 무결성이 중요한 경우에는 꼭 필요하다.

### Controller는 얇게 유지

**`src/controllers/auth-controller.ts`**:

```typescript
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: formatZodError(result.error) },
      });
    }

    const { user, accessToken, refreshToken } = await registerUser(result.data);

    res.status(201).json({
      success: true,
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};
```

Controller는 검증하고, Service를 호출하고, 응답을 보내는 것만 담당한다. 비즈니스 로직은 모두 Service에 있다. 이렇게 분리해두니 나중에 테스트하기도 쉬워질 것 같았다.

---

## 🔒 Step 5: 인증 미들웨어 구현

인증이 필요한 API를 보호하려면 미들웨어가 필요하다. 미들웨어는 요청과 응답 사이에서 실행되는 함수로, 인증, 로깅, 에러 처리 등에 사용된다.

**`src/middlewares/auth.ts`**:

```typescript
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
      });
    }

    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' },
    });
  }
};
```

TypeScript에서 `req.user`를 사용하려면 타입을 확장해야 한다.

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

이제 라우트에 미들웨어를 적용하면 된다.

```typescript
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);
```

---

## ✅ Step 6: API 테스트

구현한 API를 테스트해봤다.

**회원가입**:

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

```json
{
  "success": true,
  "data": {
    "user": { "id": "clx123...", "email": "test@example.com" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**인증이 필요한 API (토큰 없이)**:

```bash
curl http://localhost:5000/api/user/me
```

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "No token provided" }
}
```

**인증이 필요한 API (토큰 포함)**:

```bash
curl http://localhost:5000/api/user/me \
  -H "Authorization: Bearer eyJ..."
```

```json
{
  "success": true,
  "data": { "id": "clx123...", "email": "test@example.com" }
}
```

모두 예상대로 동작했다.

---

## 🎯 구현 결과

### 완성된 파일 구조

```
backend/src/
├── utils/
│   ├── jwt.ts                # JWT 토큰 생성/검증
│   ├── password.ts           # 비밀번호 해싱/비교
│   └── validation.ts         # Zod 입력 검증
├── services/
│   └── auth-service.ts       # 회원가입/로그인 로직
├── controllers/
│   └── auth-controller.ts    # HTTP 요청/응답 처리
├── middlewares/
│   └── auth.ts               # 인증 미들웨어
└── @types/
    └── express.d.ts          # req.user 타입 정의
```

### 보안 체크리스트

- [x] JWT 시크릿 32자 이상 강제
- [x] bcrypt로 비밀번호 단방향 해싱
- [x] Zod로 모든 입력값 검증
- [x] HTML 태그 제거 (XSS 방지)
- [x] Serializable 트랜잭션으로 Race Condition 방지
- [x] Access/Refresh Token 분리

---

## 📚 다음 글 예고

**Part 6: React Native 인증 UI와 상태 관리**

다음 글에서는 다시 모바일 앱으로 돌아가서 인증 UI를 구현한다. 회원가입/로그인 화면을 만들고, Zustand로 인증 상태를 관리하고, AsyncStorage에 토큰을 저장하는 작업을 진행할 예정이다.

---

## 📖 참고 자료

- [JWT 공식 사이트](https://jwt.io/)
- [Zod 공식 문서](https://zod.dev/)
- [bcrypt.js GitHub](https://github.com/dcodeIO/bcrypt.js)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### 2025년 통신 3사 보안 사고 관련
- [과기정통부 SKT 해킹사고 조사 결과 발표](https://byline.network/2025/07/4-318/)
- [SK텔레콤 침해사고 최종 조사결과 발표 - 대한민국 정책브리핑](https://www.korea.kr/news/policyNewsView.do?newsId=156721622)
- [개인정보위, SK텔레콤 개인정보 유출사고 제재처분 의결](https://m.korea.kr/briefing/pressReleaseView.do?newsId=156705039)
- [SKT·KT·LGU+ 전부 뚫렸다…떨어진 보안 신뢰](https://news.nate.com/view/20251225n01916)
- [2025 보안 사고 결산 - 해킹에 무너진 통신 3사](https://m.boannews.com/html/detail.html?idx=140880)

---

## 💬 마치며

프론트엔드 개발자로서 인증 시스템을 직접 구현해보니 많은 걸 배웠다. JWT가 뭔지, 왜 세션 대신 토큰을 쓰는지, 비밀번호는 왜 해싱해야 하는지... 당연하게 사용하던 것들의 이유를 알게 되니 뿌듯했다.

특히 Race Condition이라는 개념은 이번에 처음 알았다. 동시 요청 문제를 직접 겪어보진 않았지만, 가능성을 미리 차단하는 게 중요하다는 걸 배웠다.

Zod는 Prisma처럼 타입을 자동으로 만들어줘서 정말 편했다. 프론트엔드에서도 충분히 활용할 수 있을 것 같다.

다음 글에서는 익숙한 React Native로 돌아가서 인증 UI를 만들어본다.

---

**태그**: `JWT` `인증` `bcrypt` `Zod` `보안` `Node.js` `TypeScript` `Race Condition`
