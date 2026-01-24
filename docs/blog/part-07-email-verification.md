# Part 7: 이메일 인증 시스템 구축

Part 5에서 JWT 인증 시스템을 구축하고, Part 6에서 React Native 인증 UI를 만들었다면, 이번에는 이메일 인증 시스템을 추가한다. 회원가입 시 이메일로 6자리 인증 코드를 발송하고, 사용자가 코드를 입력해야만 앱을 사용할 수 있도록 구현했다.

## 💡 왜 이메일 인증이 필요한가?

처음에는 회원가입만 하면 바로 앱을 쓸 수 있게 하려고 했다. 그런데 다른 데이팅 앱들을 조사해보니 대부분 이메일 인증을 요구했다.

"이메일 인증 왜 하는지"를 검색해보니 이유가 있었다:

1. **스팸 계정 방지**: 봇이 자동으로 대량 가입하는 것을 막는다
2. **본인 확인**: 입력한 이메일이 실제로 사용자 것인지 확인한다
3. **비밀번호 찾기**: 나중에 비밀번호를 잊어버렸을 때 이메일로 재설정 링크를 보낼 수 있다

특히 1:1 영상 통화라는 민감한 서비스이므로, 스팸 계정 차단은 필수라고 판단했다.

## 1. 이메일 인증 플로우 설계

이메일 인증을 어떻게 구현할지 고민했다. 크게 두 가지 방식이 있었다:

### 1.1 인증 방식 비교

**A. 링크 클릭 방식** (Gmail, GitHub 등이 사용)
- 이메일에 인증 링크를 보내고, 사용자가 클릭하면 인증 완료
- 장점: 편리하다 (클릭 한 번)
- 단점: 모바일 앱에서 딥링크 처리가 복잡하다

**B. 코드 입력 방식** (Instagram, Slack 등이 사용)
- 이메일에 6자리 숫자 코드를 보내고, 사용자가 앱에 입력
- 장점: 모바일 앱에서 구현이 간단하다
- 단점: 코드를 복사/입력해야 해서 한 단계 더 필요하다

Beyond Meet은 모바일 전용 앱이고, 딥링크 설정이 복잡할 것 같아서 **코드 입력 방식**을 선택했다.

### 1.2 인증 타이밍 결정

이메일 인증을 언제 할지도 고민했다:

- **회원가입 전**: 가입 폼 작성 전에 이메일 인증
- **회원가입 후**: 가입은 하고, 앱 사용 전에 이메일 인증

"회원가입 이메일 인증 타이밍"으로 검색해보니, 대부분 **회원가입 전**에 인증하는 것이 좋다고 했다. 그 이유는:

1. DB에 미인증 계정이 쌓이지 않는다
2. 사용자가 인증을 완료한 후에만 계정이 생성되므로 스팸 방지에 효과적이다

그래서 Beyond Meet도 회원가입 3단계 중 **Step 1 (이메일/비밀번호 입력) 직후**에 이메일 인증을 진행하기로 했다.

### 1.3 최종 플로우

```
1. 사용자가 이메일/비밀번호 입력 (RegisterScreen Step 1)
   ↓
2. "이메일 인증" 버튼 클릭 → POST /api/auth/send-verification-code
   ↓
3. 백엔드가 6자리 코드 생성 → Redis에 저장 (10분 만료)
   ↓
4. Resend로 이메일 발송
   ↓
5. 사용자가 이메일 확인 후 코드 입력 (EmailVerificationScreen)
   ↓
6. POST /api/auth/verify-code → Redis에서 코드 검증
   ↓
7. 검증 성공 시 "이메일 인증됨" 플래그를 Redis에 30분간 저장
   ↓
8. RegisterScreen Step 2로 이동 → 프로필 입력 완료 후 회원가입
```

## 2. 이메일 발송 서비스 선택

### 2.1 이메일 발송 방법 조사

"Node.js 이메일 발송"으로 검색했더니 여러 방법이 나왔다:

1. **Nodemailer** (가장 유명한 Node.js 이메일 라이브러리)
   - Gmail SMTP로 직접 발송 가능
   - 무료지만 Gmail이 하루 500통 제한이 있다
   - SMTP 설정이 복잡하다

2. **SendGrid** (무료 월 100통)
   - API가 간단하다
   - 무료 플랜이 100통으로 적다

3. **AWS SES** (무료 월 62,000통)
   - 매우 저렴하다
   - AWS 계정 설정이 필요하다

4. **Resend** (무료 월 100통, 개발자 친화적)
   - 최근 나온 서비스로 API가 매우 간단하다
   - TypeScript 지원이 좋다
   - 무료 플랜 100통이지만 Beta 테스트에는 충분하다

Beyond Meet은 Beta 단계에서 20명만 사용하므로, **Resend**를 선택했다. API가 가장 간단하고 TypeScript 지원도 좋아서다.

### 2.2 Resend 설정

[backend/src/config/resend.ts](backend/src/config/resend.ts)

```typescript
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('[RESEND] Warning: RESEND_API_KEY not configured. Email verification will be disabled.');
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export default resend;
```

환경변수 `.env`에 Resend API 키를 추가했다:

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

Resend 무료 플랜은 검증된 도메인에서만 이메일을 보낼 수 있다. Beta 테스트에서는 Resend가 제공하는 기본 도메인(`onboarding@resend.dev`)을 사용하고, 정식 출시 시 커스텀 도메인을 설정할 예정이다.

## 3. 인증 코드 저장소 선택

### 3.1 PostgreSQL vs Redis

6자리 인증 코드를 어디에 저장할지 고민했다. 두 가지 방법이 있었다:

**A. PostgreSQL** (기존 데이터베이스)
- `EmailVerification` 테이블에 저장
- 장점: 추가 서비스 없이 바로 사용 가능
- 단점: 10분 후 만료 처리를 위해 주기적으로 쿼리를 돌려야 한다

**B. Redis** (인메모리 캐시)
- Redis에 TTL 10분으로 저장
- 장점: TTL로 자동 만료, 빠른 조회/삭제
- 단점: Redis 서버가 필요하다

"이메일 인증 코드 저장"으로 검색해보니, 대부분 **Redis**를 추천했다. 그 이유는:

- 인증 코드는 **임시 데이터**이므로 영구 저장할 필요가 없다
- Redis의 **TTL 기능**으로 자동 만료 처리가 간단하다
- PostgreSQL에 불필요한 레코드가 쌓이지 않는다

그래서 Beyond Meet도 Redis를 사용하기로 했다.

### 3.2 Upstash Redis 선택

Redis 서버를 어떻게 운영할지 고민했다. 세 가지 방법이 있었다:

1. **직접 EC2에 Redis 설치**: 설정이 복잡하고 관리가 필요하다
2. **AWS ElastiCache**: 월 $10 이상으로 비용이 든다
3. **Upstash Redis**: Serverless Redis, 무료 플랜 10,000 requests/day

Beyond Meet은 **$0/month 운영 비용**이 목표이므로, **Upstash Redis** 무료 플랜을 선택했다.

[backend/src/config/redis.ts](backend/src/config/redis.ts)

```typescript
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn('⚠️  Upstash Redis credentials not configured. Redis functionality will be disabled.');
}

const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

export default redis;
```

Upstash는 HTTP REST API로 Redis를 사용하므로, 별도 서버 연결 설정이 필요 없다. `.env`에 URL과 토큰만 추가하면 된다:

```bash
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

## 4. 이메일 인증 서비스 구현

### 4.1 6자리 인증 코드 생성

[backend/src/services/email-service.ts](backend/src/services/email-service.ts:16-18)

```typescript
/**
 * Generate 6-digit verification code
 */
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
```

`Math.random()`으로 100000 ~ 999999 범위의 숫자를 생성한다. 이 방식이 암호학적으로 안전한지 검색해봤다.

"Math.random() 보안"으로 검색하니, `Math.random()`은 **암호학적으로 안전하지 않다**고 했다. Node.js에서는 `crypto.randomInt()`를 사용하는 것이 권장된다.

하지만 6자리 인증 코드는 10분 후 만료되고, 5번 이상 틀리면 차단되므로, Beta 단계에서는 `Math.random()`으로도 충분하다고 판단했다. 정식 출시 전에 `crypto.randomInt()`로 변경할 예정이다.

### 4.2 회원가입 전 이메일 인증 (Pre-Registration)

회원가입 전에는 아직 `userId`가 없으므로, Redis에 이메일을 키로 사용해 코드를 저장한다.

[backend/src/services/email-service.ts](backend/src/services/email-service.ts:99-166)

```typescript
/**
 * Send verification email for pre-registration (no userId yet)
 */
export const sendPreRegistrationVerificationEmail = async (email: string): Promise<void> => {
  // 쿨다운 체크 (60초 이내 재전송 방지)
  const recentVerification = await prisma.emailVerification.findFirst({
    where: {
      user: { email },
      createdAt: {
        gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
      },
    },
  });

  if (recentVerification) {
    const waitSeconds = Math.ceil(
      (RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - recentVerification.createdAt.getTime())) / 1000
    );
    throw new AppError(
      429,
      'RESEND_COOLDOWN',
      `${waitSeconds}초 후에 다시 시도해주세요`
    );
  }

  // 6자리 코드 생성
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

  // Redis에 저장 (10분 TTL)
  const redis = (await import('../config/redis')).default;

  if (!redis) {
    throw new AppError(500, 'REDIS_NOT_CONFIGURED', '서버 설정 오류입니다.');
  }

  const key = `email_verification:${email}`;
  await redis.set(
    key,
    JSON.stringify({ code, expiresAt: expiresAt.toISOString(), attempts: 0 }),
    { ex: VERIFICATION_CODE_EXPIRY_MINUTES * 60 }
  );

  // Resend로 이메일 발송
  if (!resend) {
    console.warn('[EMAIL] Resend not configured, skipping email. Code:', code);
    return;
  }

  const { error } = await resend.emails.send({
    from: `Beyond Meet <${RESEND_FROM_EMAIL}>`,
    to: email,
    subject: '[Beyond Meet] 이메일 인증 코드',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #FF8383;">Beyond Meet</h2>
        <p>안녕하세요!</p>
        <p>아래 인증 코드를 입력하여 이메일을 인증해주세요:</p>
        <div style="background-color: #f5f5f5; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FF8383;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #666;">이 코드는 ${VERIFICATION_CODE_EXPIRY_MINUTES}분 후에 만료됩니다.</p>
      </div>
    `,
  });

  if (error) {
    console.error('[EMAIL] Failed to send verification email:', error);
    throw new AppError(500, 'EMAIL_SEND_FAILED', '이메일 전송에 실패했습니다');
  }
};
```

**핵심 포인트**:

1. **쿨다운 체크**: 60초 이내 재전송 방지 (스팸 방지)
2. **Redis TTL**: 10분 후 자동 삭제
3. **시도 횟수 제한**: `attempts` 필드로 5번까지만 허용
4. **HTML 이메일**: Resend HTML 템플릿으로 보기 좋게 디자인

### 4.3 인증 코드 검증

[backend/src/services/email-service.ts](backend/src/services/email-service.ts:171-219)

```typescript
/**
 * Verify pre-registration email code
 */
export const verifyPreRegistrationCode = async (email: string, code: string): Promise<boolean> => {
  const redis = (await import('../config/redis')).default;

  if (!redis) {
    throw new AppError(500, 'REDIS_NOT_CONFIGURED', '서버 설정 오류입니다.');
  }

  const key = `email_verification:${email}`;
  const data = await redis.get(key);

  if (!data) {
    throw new AppError(400, 'NO_PENDING_VERIFICATION', '인증 요청이 없습니다. 인증 코드를 다시 요청해주세요.');
  }

  // Upstash Redis는 JSON을 자동으로 파싱해서 반환한다
  const verification = data as { code: string; expiresAt: string; attempts: number };

  // 시도 횟수 체크
  if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await redis.del(key);
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', '인증 시도 횟수를 초과했습니다. 새 코드를 요청해주세요.');
  }

  // 시도 횟수 증가
  verification.attempts += 1;
  await redis.set(key, JSON.stringify(verification), { ex: VERIFICATION_CODE_EXPIRY_MINUTES * 60 });

  // 만료 체크
  if (new Date(verification.expiresAt) < new Date()) {
    await redis.del(key);
    throw new AppError(400, 'CODE_EXPIRED', '인증 코드가 만료되었습니다. 새 코드를 요청해주세요.');
  }

  // 코드 검증
  if (verification.code !== code) {
    const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - verification.attempts;
    throw new AppError(
      400,
      'INVALID_CODE',
      `인증 코드가 올바르지 않습니다. (남은 시도: ${remainingAttempts}회)`
    );
  }

  // 인증 완료: Redis에 "이메일 인증됨" 플래그 저장 (30분 유효)
  await redis.set(`email_verified:${email}`, 'true', { ex: 30 * 60 });
  await redis.del(key);

  return true;
};
```

**검증 과정**:

1. Redis에서 `email_verification:{email}` 키로 조회
2. 시도 횟수가 5번 이상이면 차단
3. 시도 횟수 증가 (틀린 경우 대비)
4. 만료 시간 체크
5. 코드 일치 확인
6. 성공 시 `email_verified:{email}` 플래그를 30분간 저장
7. 인증 코드 삭제

### 4.4 왜 시도 횟수를 먼저 증가시키나?

코드를 작성하다가 의문이 생겼다. 왜 코드 검증 **전에** `attempts`를 증가시킬까? 검증 후에 틀렸을 때만 증가시키는 게 맞지 않나?

"인증 코드 시도 횟수 타이밍"으로 검색해봤다. 검색 결과, **검증 전에 증가**시키는 것이 맞다고 했다. 그 이유는:

- 검증 후에 증가시키면, 검증 중에 서버가 다운되거나 네트워크가 끊기면 `attempts`가 증가하지 않는다
- 공격자가 의도적으로 요청을 중단해 무한 시도할 수 있다

그래서 **증가 → 검증 → 성공 시 반환** 순서가 안전하다.

## 5. API 엔드포인트 구현

### 5.1 회원가입 전 인증 코드 발송

[backend/src/controllers/auth-controller.ts](backend/src/controllers/auth-controller.ts:288-313)

```typescript
/**
 * 회원가입 전 이메일 인증 코드 발송 (비인증)
 * POST /api/auth/send-verification-code
 */
export const sendVerificationCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError(400, 'MISSING_EMAIL', '이메일을 입력해주세요');
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(400, 'INVALID_EMAIL', '올바른 이메일 형식이 아닙니다');
    }

    await sendPreRegistrationVerificationEmail(email);

    res.status(200).json({
      success: true,
      data: {
        message: '인증 코드가 이메일로 전송되었습니다',
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### 5.2 회원가입 전 인증 코드 확인

[backend/src/controllers/auth-controller.ts](backend/src/controllers/auth-controller.ts:319-345)

```typescript
/**
 * 회원가입 전 이메일 인증 코드 확인 (비인증)
 * POST /api/auth/verify-code
 */
export const verifyCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      throw new AppError(400, 'MISSING_FIELDS', '이메일과 인증 코드를 입력해주세요');
    }

    // Zod 스키마로 코드 검증
    const parseResult = verifyEmailSchema.safeParse({ code });
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(parseResult.error));
    }

    await verifyPreRegistrationCode(email, code);

    res.status(200).json({
      success: true,
      data: {
        message: '이메일이 인증되었습니다',
        emailVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

Zod 스키마로 코드 형식을 검증한다:

[backend/src/utils/validation.ts](backend/src/utils/validation.ts)

```typescript
export const verifyEmailSchema = z.object({
  code: z.string().length(6, '인증 코드는 6자리여야 합니다').regex(/^\d{6}$/, '인증 코드는 숫자만 포함해야 합니다'),
});
```

## 6. 모바일 앱 이메일 인증 UI

### 6.1 EmailVerificationScreen 구조

[mobile/src/screens/auth/EmailVerificationScreen.tsx](mobile/src/screens/auth/EmailVerificationScreen.tsx)

```typescript
const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // 회원가입 전 플로우인지 확인
  const isPreRegistration = !!route.params?.email;
  const email = route.params?.email || useAuthStore((state) => state.userEmail) || '';

  const verifyCodeMutation = useVerifyCode();
  const sendCodeMutation = useSendVerificationCode();

  const handleCodeChange = (text: string, index: number) => {
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length > 1) {
      // 붙여넣기 처리: 6자리를 한 번에 입력
      const pastedCode = numericText.slice(0, CODE_LENGTH).split('');
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (index + i < CODE_LENGTH) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + pastedCode.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      // 단일 문자 입력: 다음 칸으로 자동 이동
      const newCode = [...code];
      newCode[index] = numericText;
      setCode(newCode);

      if (numericText && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Backspace: 이전 칸으로 이동
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== CODE_LENGTH) {
      return;
    }

    if (isPreRegistration) {
      // 회원가입 전: verifyCode API 사용
      verifyCodeMutation.mutate(
        { email, code: verificationCode },
        {
          onSuccess: () => {
            navigation.navigate('Register', {
              emailVerified: true,
              formData: route.params?.formData,
            });
          },
        }
      );
    } else {
      // 로그인 후: verifyEmail API 사용
      verifyEmailMutation.mutate(verificationCode);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 6자리 코드 입력 UI */}
      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref; }}
            style={[styles.codeInput, digit && styles.codeInputFilled]}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={6} // 붙여넣기 대응
            selectTextOnFocus
          />
        ))}
      </View>

      {/* 재전송 버튼 (60초 쿨다운) */}
      <TouchableOpacity
        onPress={handleResend}
        disabled={resendCooldown > 0}
      >
        <Text>
          {resendCooldown > 0 ? `재전송 (${resendCooldown}초)` : '재전송'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};
```

**UI 구현 포인트**:

1. **6칸 입력 UI**: TextInput을 6개 배치해 각 자리수를 입력
2. **자동 포커스 이동**: 숫자 입력 시 다음 칸으로 자동 이동
3. **붙여넣기 지원**: 6자리를 한 번에 붙여넣기 가능
4. **Backspace 처리**: 빈 칸에서 Backspace 누르면 이전 칸으로 이동
5. **재전송 쿨다운**: 60초 타이머로 스팸 방지

### 6.2 두 가지 플로우 지원

EmailVerificationScreen은 두 가지 상황에서 사용된다:

1. **회원가입 전**: `route.params`에 `email`과 `formData`가 전달됨
2. **로그인 후**: `route.params` 없음, AuthStore에서 이메일을 가져옴

```typescript
// 회원가입 전 플로우인지 확인
const isPreRegistration = !!route.params?.email;
const email = route.params?.email || useAuthStore((state) => state.userEmail) || '';

// 회원가입 전: verifyCode API
if (isPreRegistration) {
  verifyCodeMutation.mutate({ email, code: verificationCode });
}
// 로그인 후: verifyEmail API
else {
  verifyEmailMutation.mutate(verificationCode);
}
```

이렇게 하나의 화면으로 두 가지 플로우를 모두 처리할 수 있다.

## 7. 테스트 결과

### 7.1 이메일 발송 테스트

```bash
# 1. 이메일 인증 코드 발송 요청
curl -X POST http://localhost:5000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 응답
{
  "success": true,
  "data": {
    "message": "인증 코드가 이메일로 전송되었습니다"
  }
}

# 2. Redis 확인
# Redis에 email_verification:test@example.com 키가 생성됨
# {"code":"123456","expiresAt":"2024-01-15T10:10:00.000Z","attempts":0}

# 3. 이메일 수신
# Resend에서 발송한 이메일이 test@example.com으로 도착
# 제목: [Beyond Meet] 이메일 인증 코드
# 내용: 6자리 코드 (예: 123456)
```

### 7.2 인증 코드 검증 테스트

```bash
# 1. 올바른 코드 입력
curl -X POST http://localhost:5000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# 응답
{
  "success": true,
  "data": {
    "message": "이메일이 인증되었습니다",
    "emailVerified": true
  }
}

# 2. 틀린 코드 입력 (5번까지 허용)
curl -X POST http://localhost:5000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"000000"}'

# 응답
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "인증 코드가 올바르지 않습니다. (남은 시도: 4회)"
  }
}

# 3. 5번 틀린 후 재시도
curl -X POST http://localhost:5000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"000000"}'

# 응답
{
  "success": false,
  "error": {
    "code": "TOO_MANY_ATTEMPTS",
    "message": "인증 시도 횟수를 초과했습니다. 새 코드를 요청해주세요."
  }
}
```

### 7.3 쿨다운 테스트

```bash
# 1. 첫 번째 이메일 발송
curl -X POST http://localhost:5000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 성공

# 2. 60초 이내 재발송 시도
curl -X POST http://localhost:5000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 응답
{
  "success": false,
  "error": {
    "code": "RESEND_COOLDOWN",
    "message": "45초 후에 다시 시도해주세요"
  }
}
```

## 8. 트러블슈팅

### 8.1 문제: Resend 이메일이 스팸으로 분류됨

**증상**: Gmail에서 Resend로 발송한 이메일이 스팸 폴더로 들어갔다

**원인**: Resend 기본 도메인(`onboarding@resend.dev`)은 발신자 신뢰도가 낮다

**해결**:
1. Beta 테스트에서는 사용자에게 "스팸 폴더도 확인하세요" 안내 추가
2. 정식 출시 전에 커스텀 도메인(예: `noreply@beyondmeet.app`) 설정 및 SPF/DKIM 인증 추가

### 8.2 문제: Redis 연결 실패 시 서버 크래시

**증상**: Redis가 설정되지 않으면 서버가 시작되지 않았다

**원인**: `redis.set()`에서 `null` 객체를 호출해 에러가 발생했다

**해결**:
```typescript
if (!redis) {
  console.warn('[EMAIL] Redis not configured. Cannot store verification code.');
  throw new AppError(500, 'REDIS_NOT_CONFIGURED', '서버 설정 오류입니다.');
}
```

Redis가 없으면 명확한 에러 메시지를 반환하고, 서버는 정상적으로 시작되도록 수정했다.

### 8.3 문제: 모바일 앱에서 코드 붙여넣기 안 됨

**증상**: 이메일에서 코드를 복사한 후 앱에 붙여넣기가 안 됐다

**원인**: 각 TextInput의 `maxLength={1}`로 설정해서 한 칸에 1글자만 입력 가능했다

**해결**:
```typescript
// maxLength를 6으로 늘리고, 붙여넣기 로직 추가
<TextInput
  maxLength={6} // 6자리를 한 번에 받을 수 있도록
  onChangeText={(text) => handleCodeChange(text, index)}
/>

const handleCodeChange = (text: string, index: number) => {
  if (text.length > 1) {
    // 붙여넣기: 6자리를 각 칸에 분배
    const pastedCode = text.slice(0, 6).split('');
    // ...
  }
};
```

이제 이메일에서 코드를 복사해서 붙여넣으면 자동으로 6칸에 분배된다.

## 9. 회원가입 플로우 완성

이메일 인증을 추가한 최종 회원가입 플로우는 다음과 같다:

```
RegisterScreen
├─ Step 1: 이메일/비밀번호 입력
│  └─ "이메일 인증" 버튼 → POST /send-verification-code
│     └─ 이메일 발송 성공 → EmailVerificationScreen으로 이동
│
EmailVerificationScreen
├─ 6자리 코드 입력
├─ POST /verify-code → Redis 검증
└─ 인증 성공 → RegisterScreen Step 2로 복귀

RegisterScreen
├─ Step 2: 프로필 정보 입력 (닉네임, 생년월일, 성별, 국가)
│  └─ "다음" 버튼
│
├─ Step 3: 매칭 설정 (선호 성별, 나이 범위)
│  └─ "회원가입 완료" 버튼 → POST /register
│     └─ JWT 발급, 자동 로그인
```

회원가입 API에서는 Redis에 `email_verified:{email}` 플래그가 있는지 확인해, 이메일 인증을 완료한 경우에만 계정을 생성한다.

## 10. 개선 사항

현재 구현은 Beta 단계이므로 다음 기능들은 추후 추가할 예정이다:

1. **커스텀 도메인**: Resend에 도메인 등록 및 SPF/DKIM 설정
2. **암호학적 안전한 코드 생성**: `crypto.randomInt()` 사용
3. **이메일 템플릿 개선**: HTML/CSS로 더 예쁜 디자인
4. **로그인 후 이메일 재인증**: 이메일 변경 시 재인증 요구
5. **비밀번호 찾기**: 이메일 인증 코드로 비밀번호 재설정

## 11. 정리

이메일 인증 시스템 구축을 정리하면:

1. **Resend**: 간단한 API로 이메일 발송 (무료 월 100통)
2. **Upstash Redis**: Serverless Redis로 인증 코드 저장 (TTL 10분)
3. **6자리 코드**: `Math.random()`으로 생성, 5번 시도 제한
4. **Pre-Registration 플로우**: 회원가입 전에 이메일 인증 완료
5. **쿨다운**: 60초 이내 재전송 방지 (스팸 방지)

이제 Beyond Meet은 스팸 계정 없이 안전하게 회원가입을 진행할 수 있다. 사용자는 이메일로 받은 6자리 코드를 입력해 본인 확인을 완료하고, 앱을 사용할 수 있다.

다음 Part에서는 Socket.io로 실시간 매칭 시스템을 구축하는 과정을 다룬다. 사용자가 "랜덤 매칭" 버튼을 누르면 실시간으로 다른 사용자와 연결되는 과정을 정리할 예정이다.
