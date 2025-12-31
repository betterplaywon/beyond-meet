# Beyond Meet - 배포 가이드

**중요**: 실제 환경 변수 값은 절대 Git에 커밋하지 마세요!

---

## 백엔드 (Render.com)

**Build Command**: `cd backend && npm install && npm run build`
**Start Command**: `cd backend && npm start`

### 환경 변수

```bash
NODE_ENV=production
PORT=5000

# Supabase
DATABASE_URL="postgresql://postgres.[REF]:[PWD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PWD]@[HOST]:6543/postgres"

# Redis (Upstash)
UPSTASH_REDIS_URL="https://[ID].upstash.io"
UPSTASH_REDIS_TOKEN="[TOKEN]"

# JWT
JWT_SECRET="[SECRET]"
JWT_REFRESH_SECRET="[SECRET]"

# Agora
AGORA_APP_ID="[APP_ID]"
AGORA_APP_CERTIFICATE="[CERT]"

# Firebase
FIREBASE_PROJECT_ID="[PROJECT_ID]"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="[EMAIL]"

# Supabase Storage
SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_ANON_KEY="[KEY]"
SUPABASE_SERVICE_ROLE_KEY="[KEY]"

# Hugging Face (AI Moderation)
HUGGINGFACE_API_KEY="hf_..."
MODERATION_THRESHOLD_MINOR=0.3
MODERATION_THRESHOLD_SEVERE=0.6
MODERATION_ENABLED=true

# Other
ALLOWED_ORIGINS=[DOMAIN]
BETA_USER_LIMIT=30
```

---

## 모바일 환경 변수

```bash
API_BASE_URL=[RENDER_DOMAIN]
AGORA_APP_ID=[APP_ID]
```

---

## 외부 서비스

| 서비스 | 용도 | 무료 한도 |
|--------|------|----------|
| Render.com | 백엔드 호스팅 | 750시간/월 |
| Supabase | PostgreSQL + Storage | 500MB DB, 1GB Storage |
| Upstash | Redis | 10,000 명령/일 |
| Agora | WebRTC | 10,000분/월 |
| Firebase | Push 알림 | 무제한 |
| Hugging Face | AI 모더레이션 | 30,000건/월 |

---

## GitHub Actions (Keep-Alive)

`.github/workflows/keep-alive.yml` - Render 서버 sleep 방지

```yaml
on:
  schedule:
    - cron: "*/5 * * * *"
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -s https://[DOMAIN]/health
```

---

## 트러블슈팅

| 문제 | 해결 |
|------|------|
| Render 서버 sleep | GitHub Actions Keep-Alive 활성화 |
| Prisma migrate 타임아웃 | `?pgbouncer=true` 추가 |
| iOS 알림 안됨 | GoogleService-Info.plist 확인 |
| Android 알림 안됨 | google-services.json 확인 |
