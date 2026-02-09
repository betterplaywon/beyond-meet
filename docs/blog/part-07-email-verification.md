# 영상 데이팅 앱 만들기 #7 - 이메일 인증 시스템 구축

> **이전 글 요약**: Part 6에서 React Native 인증 UI를 구현했다. Zustand로 인증 상태를 관리하고, AsyncStorage에 토큰을 저장해 자동 로그인을 구현했다.

처음에는 회원가입만 하면 바로 앱을 사용할 수 있게 하려고 했다. 그런데 다른 데이팅 앱들을 살펴보니 대부분 이메일 인증을 요구하고 있었다. "왜 굳이 이메일 인증을 할까?" 검색해보니 몇 가지 이유가 있었다.

첫째, 스팸 계정 방지다. 봇이 자동으로 대량 가입하는 것을 막을 수 있다. 둘째, 본인 확인이다. 입력한 이메일이 실제로 그 사람 것인지 확인할 수 있다. 셋째, 나중에 비밀번호를 잊어버렸을 때 이메일로 재설정 링크를 보낼 수 있다.

특히 1:1 영상 통화라는 서비스 특성상 스팸 계정 차단은 필수라고 판단했다. 그래서 이메일 인증 시스템을 구축하기로 했다.

### 2025년 통신 3사 사고가 보여준 인증의 중요성

Part 5에서 2025년 한국 통신 3사 보안 사고를 언급했는데, 이메일 인증 시스템을 구현하면서 다시 한번 그 교훈을 떠올렸다.

SK텔레콤 사고에서 해커들은 탈취한 유심 정보로 **SIM 스와핑(유심 복제)** 공격을 시도할 수 있었다. 유심 인증키가 암호화 없이 저장되어 있었기 때문이다. 만약 2차 인증 수단으로 이메일 인증이 있었다면, 유심이 복제되더라도 추가 방어선이 있었을 것이다.

KT 사고에서는 불법 펨토셀을 통해 **무단 소액결제**가 발생했다. 결제 전 이메일이나 앱 푸시 인증이 있었다면 피해를 줄일 수 있었을 것이다.

이런 사례들을 보면서 **다중 인증(MFA)의 중요성**을 깨달았다. Beyond Meet에서는 현재 이메일 인증만 구현하지만, 정식 출시 시에는 추가 인증 수단도 고려해볼 예정이다.

---

## 📌 인증 방식 선택

이메일 인증을 어떻게 구현할지 고민했다. 크게 두 가지 방식이 있었다.

**링크 클릭 방식**은 Gmail이나 GitHub에서 사용하는 방식이다. 이메일에 인증 링크를 보내고, 사용자가 클릭하면 인증이 완료된다. 클릭 한 번으로 끝나서 편하지만, 모바일 앱에서 딥링크 처리가 복잡해진다.

**코드 입력 방식**은 Instagram이나 Slack에서 사용하는 방식이다. 이메일에 6자리 숫자 코드를 보내고, 사용자가 앱에서 입력한다. 코드를 복사/입력해야 해서 한 단계 더 필요하지만, 모바일 앱에서 구현이 훨씬 간단하다.

Beyond Meet은 모바일 전용 앱이고, 딥링크 설정이 복잡할 것 같아서 **코드 입력 방식**을 선택했다.

### 인증 타이밍

이메일 인증을 언제 할지도 고민거리였다. 회원가입 폼을 다 작성한 후에 할 수도 있고, 가입 전에 먼저 이메일만 인증받을 수도 있다.

검색해보니 **회원가입 전에 인증**하는 것이 좋다고 했다. 이유는 DB에 미인증 계정이 쌓이지 않고, 인증을 완료한 사람만 계정이 생성되니 스팸 방지에 더 효과적이라는 것이다.

그래서 Beyond Meet도 회원가입 3단계 중 Step 1(이메일/비밀번호 입력) 직후에 이메일 인증을 진행하기로 했다.

### 최종 플로우

```
1. 사용자가 이메일/비밀번호 입력
   ↓
2. "이메일 인증" 버튼 클릭 → 백엔드 API 호출
   ↓
3. 백엔드가 6자리 코드 생성 → Redis에 저장 (10분 만료)
   ↓
4. Resend로 이메일 발송
   ↓
5. 사용자가 코드 입력 → 검증
   ↓
6. 검증 성공 → 회원가입 진행
```

---

## 💌 이메일 발송 서비스 선택

"Node.js 이메일 발송"으로 검색했더니 여러 방법이 나왔다.

**Nodemailer**는 가장 유명한 Node.js 이메일 라이브러리다. Gmail SMTP로 직접 발송할 수 있지만, 하루 500통 제한이 있고 SMTP 설정이 복잡하다.

**SendGrid**와 **AWS SES**는 대용량 발송에 적합하지만, Beta 테스트 20명한테는 과한 것 같았다.

**Resend**는 최근 나온 서비스로 API가 매우 간단하고 TypeScript 지원이 좋다. 무료 플랜이 월 100통이지만 Beta 테스트에는 충분하다.

결국 **Resend**를 선택했다. API 사용법이 가장 간단했고, TypeScript와 궁합이 좋았다.

### Resend 설정

```typescript
// backend/src/config/resend.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('[RESEND] Warning: RESEND_API_KEY not configured.');
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export default resend;
```

Resend 무료 플랜은 검증된 도메인에서만 이메일을 보낼 수 있다. Beta 테스트에서는 Resend가 제공하는 기본 도메인(`onboarding@resend.dev`)을 사용하고, 정식 출시 때 커스텀 도메인을 설정할 예정이다.

---

## 🗄️ 인증 코드 저장소 선택

6자리 인증 코드를 어디에 저장할지 고민했다.

**PostgreSQL**을 쓰면 추가 서비스 없이 바로 사용할 수 있지만, 10분 후 만료 처리를 위해 주기적으로 정리 작업을 돌려야 한다.

**Redis**는 TTL(Time To Live) 기능이 있어서 10분 후 자동으로 삭제된다. 인증 코드는 임시 데이터니까 영구 저장할 필요가 없고, 자동 만료가 편리하다.

검색해보니 대부분 Redis를 추천했다. 그래서 Redis를 사용하기로 했다.

### Upstash Redis 선택

Redis 서버를 어떻게 운영할지 고민했다. EC2에 직접 설치하면 관리가 필요하고, AWS ElastiCache는 월 $10 이상이다.

Beyond Meet은 $0/month 운영 비용이 목표였기 때문에 **Upstash Redis** 무료 플랜을 선택했다. Serverless Redis라서 사용한 만큼만 과금되고, 무료 플랜은 하루 10,000 requests까지 지원한다.

```typescript
// backend/src/config/redis.ts
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

export default redis;
```

Upstash는 HTTP REST API로 Redis를 사용하므로 별도 연결 설정이 필요 없다. `.env`에 URL과 토큰만 추가하면 된다.

---

## 🔐 인증 코드 생성과 발송

### 6자리 코드 생성

```typescript
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
```

`Math.random()`으로 100000~999999 범위의 숫자를 생성한다. 검색해보니 `Math.random()`은 암호학적으로 안전하지 않다고 했다. Node.js에서는 `crypto.randomInt()`를 쓰는 게 권장된다.

하지만 6자리 인증 코드는 10분 후 만료되고, 5번 이상 틀리면 차단되므로, Beta 단계에서는 `Math.random()`으로도 충분하다고 판단했다. 정식 출시 전에 `crypto.randomInt()`로 변경할 예정이다.

### 이메일 발송 로직

```typescript
export const sendPreRegistrationVerificationEmail = async (email: string): Promise<void> => {
  // 쿨다운 체크 (60초 이내 재전송 방지)
  const recentVerification = await prisma.emailVerification.findFirst({
    where: {
      user: { email },
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
  });

  if (recentVerification) {
    throw new AppError(429, 'RESEND_COOLDOWN', '60초 후에 다시 시도해주세요');
  }

  // 6자리 코드 생성
  const code = generateVerificationCode();

  // Redis에 저장 (10분 TTL)
  const key = `email_verification:${email}`;
  await redis.set(
    key,
    JSON.stringify({ code, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 }),
    { ex: 10 * 60 }
  );

  // Resend로 이메일 발송
  await resend.emails.send({
    from: `Beyond Meet <${RESEND_FROM_EMAIL}>`,
    to: email,
    subject: '[Beyond Meet] 이메일 인증 코드',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF8383;">Beyond Meet</h2>
        <p>아래 인증 코드를 입력하여 이메일을 인증해주세요:</p>
        <div style="background: #f5f5f5; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #666;">이 코드는 10분 후에 만료됩니다.</p>
      </div>
    `,
  });
};
```

핵심 포인트가 몇 가지 있다.

1. **쿨다운 체크**: 60초 이내에 재전송을 시도하면 거부한다. 스팸 방지용이다.
2. **Redis TTL**: 10분 후 자동 삭제되도록 `ex` 옵션을 설정한다.
3. **시도 횟수 저장**: `attempts` 필드로 몇 번 틀렸는지 추적한다.

---

## ✅ 인증 코드 검증

```typescript
export const verifyPreRegistrationCode = async (email: string, code: string): Promise<boolean> => {
  const key = `email_verification:${email}`;
  const data = await redis.get(key);

  if (!data) {
    throw new AppError(400, 'NO_PENDING_VERIFICATION', '인증 요청이 없습니다.');
  }

  const verification = data as { code: string; expiresAt: string; attempts: number };

  // 시도 횟수 체크
  if (verification.attempts >= 5) {
    await redis.del(key);
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', '시도 횟수를 초과했습니다.');
  }

  // 시도 횟수 증가 (검증 전에!)
  verification.attempts += 1;
  await redis.set(key, JSON.stringify(verification), { ex: 10 * 60 });

  // 만료 체크
  if (new Date(verification.expiresAt) < new Date()) {
    await redis.del(key);
    throw new AppError(400, 'CODE_EXPIRED', '인증 코드가 만료되었습니다.');
  }

  // 코드 검증
  if (verification.code !== code) {
    const remaining = 5 - verification.attempts;
    throw new AppError(400, 'INVALID_CODE', `코드가 틀렸습니다. (남은 시도: ${remaining}회)`);
  }

  // 인증 완료: "이메일 인증됨" 플래그 저장 (30분 유효)
  await redis.set(`email_verified:${email}`, 'true', { ex: 30 * 60 });
  await redis.del(key);

  return true;
};
```

여기서 주목할 점은 **시도 횟수를 검증 전에 증가**시킨다는 것이다. 처음엔 "틀렸을 때만 증가시키면 되지 않나?"라고 생각했는데, 검색해보니 검증 전에 증가시키는 게 맞다고 했다.

이유는 검증 중에 서버가 다운되거나 네트워크가 끊기면 `attempts`가 증가하지 않아서 공격자가 의도적으로 요청을 중단해 무한 시도할 수 있기 때문이다. 그래서 **증가 → 검증 → 성공 시 반환** 순서가 안전하다.

### 왜 시도 횟수 제한이 중요한가

2025년 KT 사고에서 불법 펨토셀을 통한 공격이 성공한 이유 중 하나는 **무차별 대입 공격(Brute Force)에 대한 방어가 부족**했기 때문이다. 공격자들은 탈취한 정보를 바탕으로 반복적인 시도를 통해 소액결제까지 성공시켰다.

인증 코드도 마찬가지다. 6자리 숫자는 100만 가지 경우의 수밖에 없다. 시도 횟수 제한이 없다면 봇이 모든 조합을 시도해볼 수 있다. 그래서 **5회 제한 + 10분 만료**라는 이중 방어선을 구현했다.

---

## 📱 모바일 앱 UI 구현

### 6자리 코드 입력 UI

6칸짜리 입력 필드를 만들고, 자동 포커스 이동과 붙여넣기를 지원하도록 구현했다.

```typescript
const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length > 1) {
      // 붙여넣기: 6자리를 각 칸에 분배
      const pastedCode = numericText.slice(0, 6).split('');
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (index + i < 6) newCode[index + i] = char;
      });
      setCode(newCode);
    } else {
      // 단일 입력: 다음 칸으로 자동 이동
      const newCode = [...code];
      newCode[index] = numericText;
      setCode(newCode);

      if (numericText && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  return (
    <View style={styles.codeContainer}>
      {code.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => { inputRefs.current[index] = ref; }}
          style={styles.codeInput}
          value={digit}
          onChangeText={(text) => handleCodeChange(text, index)}
          keyboardType="number-pad"
          maxLength={6}
        />
      ))}
    </View>
  );
};
```

UI 구현에서 신경 쓴 점들이 있다.

1. **자동 포커스 이동**: 숫자를 입력하면 다음 칸으로 자동으로 이동한다.
2. **붙여넣기 지원**: 6자리를 한 번에 붙여넣으면 각 칸에 분배된다.
3. **Backspace 처리**: 빈 칸에서 Backspace를 누르면 이전 칸으로 이동한다.
4. **재전송 쿨다운**: 60초 타이머로 스팸을 방지한다.

처음에는 각 TextInput의 `maxLength`를 1로 설정했는데, 그러면 붙여넣기가 안 됐다. `maxLength`를 6으로 늘리고 붙여넣기 로직을 추가해서 해결했다.

---

## 🔧 겪었던 문제들

### Resend 이메일이 스팸으로 분류됨

Gmail에서 Resend로 발송한 이메일이 스팸 폴더로 들어가는 경우가 있었다. Resend 기본 도메인은 발신자 신뢰도가 낮기 때문이다.

Beta 테스트에서는 사용자에게 "스팸 폴더도 확인하세요"라고 안내했고, 정식 출시 전에 커스텀 도메인을 설정하고 SPF/DKIM 인증을 추가할 예정이다.

### Redis가 설정되지 않으면 서버 크래시

Redis가 없는 환경에서 `redis.set()`을 호출하면 `null` 객체에 메서드를 호출하게 되어 에러가 발생했다.

```typescript
if (!redis) {
  throw new AppError(500, 'REDIS_NOT_CONFIGURED', '서버 설정 오류입니다.');
}
```

Redis가 없으면 명확한 에러 메시지를 반환하도록 수정했다. 서버는 정상적으로 시작되지만 이메일 인증 기능만 사용할 수 없게 된다.

---

## 🎯 테스트 결과

이메일 인증 플로우를 테스트해봤다.

```bash
# 1. 인증 코드 발송
curl -X POST http://localhost:5000/api/auth/send-verification-code \
  -d '{"email":"test@example.com"}'

# 응답: {"success": true, "data": {"message": "인증 코드가 이메일로 전송되었습니다"}}

# 2. 올바른 코드로 검증
curl -X POST http://localhost:5000/api/auth/verify-code \
  -d '{"email":"test@example.com","code":"123456"}'

# 응답: {"success": true, "data": {"emailVerified": true}}

# 3. 틀린 코드로 검증 (5번 제한)
# 응답: {"error": {"code": "INVALID_CODE", "message": "코드가 틀렸습니다. (남은 시도: 4회)"}}

# 4. 60초 이내 재발송 시도
# 응답: {"error": {"code": "RESEND_COOLDOWN", "message": "45초 후에 다시 시도해주세요"}}
```

모두 예상대로 동작했다.

---

## 📚 다음 글 예고

**Part 8: Socket.io 실시간 매칭 시스템**

다음 글에서는 Socket.io로 실시간 매칭 시스템을 구축한다. 사용자가 "랜덤 매칭" 버튼을 누르면 실시간으로 다른 사용자와 연결되는 과정을 다룰 예정이다.

---

## 💬 마치며

이메일 인증 시스템을 구축하면서 몇 가지를 배웠다.

Resend는 정말 간단했다. API 호출 한 번으로 이메일을 보낼 수 있고, TypeScript 타입도 잘 지원된다. Beta 테스트에는 충분한 선택이었다.

Redis의 TTL 기능은 임시 데이터를 다루는 데 딱 맞았다. 인증 코드처럼 일정 시간 후 만료되는 데이터는 PostgreSQL보다 Redis가 훨씬 적합하다는 걸 알게 됐다.

시도 횟수를 검증 전에 증가시켜야 한다는 것도 새로 알게 된 내용이다. 보안을 위해 세심하게 신경 써야 할 부분이 많다는 걸 느꼈다.

2025년 통신 3사 보안 사고를 보면서, 대기업도 기본적인 보안 원칙을 지키지 않으면 무너진다는 걸 다시 한번 깨달았다. SKT는 비밀번호와 인증키를 평문으로 저장했고, KT와 LGU+는 침해 사실을 제때 신고하지 않았다. 개인 프로젝트라고 해서 보안을 소홀히 하면 안 된다는 교훈을 얻었다.

다음 글에서는 Socket.io를 사용해 실시간 매칭 시스템을 구축한다.

---

**태그**: `이메일 인증` `Resend` `Redis` `Upstash` `인증 코드` `Node.js`
