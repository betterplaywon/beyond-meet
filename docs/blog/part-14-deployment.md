# Part 14: Render.com 무료 배포 및 Cold Start 대응

## 1. 배포 플랫폼 선택

백엔드를 개발했으니 이제 실제로 서비스를 배포할 차례다. 베타 서비스는 **$0/월**로 운영하는 것이 목표였기 때문에 무료 호스팅 플랫폼을 찾아봤다.

### 무료 호스팅 플랫폼 비교

| 플랫폼 | 무료 한도 | 장점 | 단점 |
|--------|----------|------|------|
| **Render.com** | 750시간/월 | WebSocket 지원, 자동 배포, HTTPS | 15분 비활동 시 sleep |
| **Railway** | $5 크레딧/월 | Sleep 없음, 빠른 배포 | 무료 크레딧 소진 시 과금 |
| **Fly.io** | 256MB RAM 무료 | Sleep 없음 | RAM 제한으로 Node.js 앱 구동 어려움 |
| **Vercel** | 무제한 | Next.js 최적화 | 서버리스 함수 10초 제한 (Socket.io 불가) |
| **Heroku** | 무료 플랜 종료 | - | 2022년 11월 종료 |

Beyond Meet은 **Render.com**을 선택했다. 이유는:
- **WebSocket (Socket.io) 지원**: 실시간 매칭에 필수
- **자동 배포**: GitHub 연동으로 push 시 자동 배포
- **무료 SSL 인증서**: HTTPS 자동 제공
- **750시간/월**: 한 달 계속 켜둘 수 있는 시간 (744시간 = 31일)

유일한 단점은 **15분 비활동 시 sleep**인데, 이는 GitHub Actions로 해결할 수 있었다 (뒤에서 설명).

## 2. Render.com 배포 설정

### 2.1 Render 프로젝트 생성

1. [render.com](https://render.com) 가입
2. **New +** → **Web Service** 선택
3. GitHub 레포지토리 연결
4. 프로젝트 이름: `beyond-meet-api`
5. Root Directory: `backend`
6. Build Command: `npm install && npm run build`
7. Start Command: `npm start`

### 2.2 환경 변수 설정

Render Dashboard → Environment 탭에서 환경 변수를 추가했다.

```bash
NODE_ENV=production
PORT=5000

# Supabase Database (Pooler)
DATABASE_URL="postgresql://postgres.[REF]:[PWD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PWD]@[HOST]:5432/postgres"

# Redis (Upstash)
UPSTASH_REDIS_URL="https://[ID].upstash.io"
UPSTASH_REDIS_TOKEN="[TOKEN]"

# JWT
JWT_SECRET="[SECRET]"
JWT_REFRESH_SECRET="[SECRET]"

# Agora
AGORA_APP_ID="[APP_ID]"
AGORA_APP_CERTIFICATE="[CERT]"

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID="[PROJECT_ID]"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="[EMAIL]"

# Supabase Storage
SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[KEY]"

# Hugging Face (AI Moderation)
HUGGINGFACE_API_KEY="hf_..."
MODERATION_THRESHOLD_MINOR=0.3
MODERATION_THRESHOLD_SEVERE=0.6
MODERATION_ENABLED=true

# CORS
ALLOWED_ORIGINS=https://beyond-meet-api.onrender.com

# Beta Limit
BETA_USER_LIMIT=30
```

### 2.3 빌드 스크립트 설정

Render는 `package.json`의 `scripts`를 사용한다.

```json
// backend/package.json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "prisma generate && tsc",
    "start": "node dist/server.js"
  }
}
```

**build 스크립트 구성**:
1. `prisma generate`: Prisma Client 생성 (DB 스키마 기반)
2. `tsc`: TypeScript → JavaScript 컴파일

**왜 `prisma generate`가 필요?**
- Prisma Client는 빌드 시 생성되는 코드
- 스키마에 맞는 타입 안전 DB 클라이언트 생성
- 빌드마다 실행해야 최신 스키마 반영

## 3. Supabase Connection Pooling

### 3.1 Prisma + Supabase 연결 문제

Render에 배포했더니 Prisma가 DB 연결에 실패했다. 에러 메시지:

```
Error: P1001: Can't reach database server at aws-0-ap-northeast-1.pooler.supabase.com
```

검색해보니 Supabase는 **Connection Pooler**를 사용할 때 특별한 설정이 필요했다.

### 3.2 `?pgbouncer=true` 추가

Supabase Pooler는 PgBouncer를 사용하는데, Prisma와 호환성 문제가 있다. 해결 방법:

```prisma
// backend/prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

```bash
# .env
DATABASE_URL="postgresql://postgres.[REF]:[PWD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PWD]@[HOST]:5432/postgres"
```

**두 가지 URL의 역할**:
- `DATABASE_URL` (Pooler, Port 6543): 일반 쿼리용, `?pgbouncer=true` 추가
- `DIRECT_URL` (Direct, Port 5432): 마이그레이션용 (Pooler는 일부 명령 지원 안 함)

찾아봤더니 Prisma는 `migrate`나 `db push` 같은 스키마 변경 작업은 `DIRECT_URL`을 사용하고, 일반 쿼리는 `DATABASE_URL`을 사용한다고 한다.

## 4. Cold Start 문제와 해결

### 4.1 Render Free Plan의 Sleep 정책

Render 무료 플랜은 **15분간 요청이 없으면 서버를 sleep** 시킨다. sleep 후 첫 요청이 오면 **cold start**가 발생하여 60-90초가 걸린다.

이 문제를 해결하기 위해 **GitHub Actions**로 주기적으로 서버를 ping하여 깨어있게 만들었다.

### 4.2 Health Check 엔드포인트 추가

먼저 백엔드에 health check 엔드포인트를 추가했다.

```typescript
// backend/src/server.ts
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

### 4.3 GitHub Actions Keep-Alive Workflow

`.github/workflows/keep-alive.yml` 파일을 생성했다.

```yaml
name: Keep Render.com Server Alive

on:
  schedule:
    # 5분마다 실행
    - cron: '*/5 * * * *'

  # 수동 실행 가능
  workflow_dispatch:

jobs:
  ping-server:
    runs-on: ubuntu-latest

    steps:
      - name: Ping Health Endpoint
        run: |
          echo "🏓 Pinging Render.com server..."

          # 최대 3회 재시도 (cold start 대응)
          max_attempts=3
          attempt=1

          while [ $attempt -le $max_attempts ]; do
            echo "Attempt $attempt/$max_attempts..."

            # 타임아웃 120초 설정 (cold start는 보통 60-90초)
            set +e
            response=$(curl -s -o /dev/null -w "%{http_code}" \
              --max-time 120 \
              --connect-timeout 10 \
              https://beyond-meet-api.onrender.com/health)
            curl_exit_code=$?
            set -e

            # HTTP 200이고 curl이 성공한 경우에만 성공
            if [ "$response" = "200" ] && [ $curl_exit_code -eq 0 ]; then
              echo "✅ Server is alive! (HTTP $response)"
              exit 0
            else
              echo "⚠️ Attempt $attempt failed: HTTP $response"
              if [ $attempt -lt $max_attempts ]; then
                echo "Waiting 30 seconds before retry..."
                sleep 30
              fi
            fi

            attempt=$((attempt + 1))
          done

          echo "❌ All attempts failed"
          exit 1
```

**Keep-Alive 구현 포인트**:
1. **5분마다 실행**: Render는 15분 비활동 시 sleep → 5분마다 ping하면 항상 깨어있음
2. **3회 재시도**: Cold start 시 첫 요청이 타임아웃될 수 있으므로 재시도
3. **120초 타임아웃**: Cold start는 60-90초 걸리므로 충분한 여유
4. **수동 실행 가능**: `workflow_dispatch`로 GitHub Actions 탭에서 수동 실행 가능

찾아봤더니 GitHub Actions의 `schedule`은 최소 5분 간격만 지원한다고 한다. 더 짧은 간격은 불가능하다.

## 5. 자동 배포 (CI/CD)

### 5.1 Render Auto-Deploy 설정

Render는 GitHub 연동 시 **자동 배포**를 지원한다.

1. Render Dashboard → Settings
2. **Auto-Deploy**: **Yes** 선택
3. **Branch**: `main` 선택

이제 `main` 브랜치에 push하면 자동으로 빌드 및 배포가 진행된다.

### 5.2 배포 흐름

1. **Code Push**: `git push origin main`
2. **Render Webhook**: GitHub가 Render에 push 알림
3. **Build**: `npm install && npm run build` 실행
4. **Deploy**: 새 버전으로 교체 (Zero-Downtime)
5. **Notification**: Render에서 이메일/Slack 알림

**Zero-Downtime Deployment**:
- Render는 새 버전을 먼저 시작
- Health check가 성공하면 트래픽을 새 버전으로 전환
- 이전 버전 종료

## 6. CORS 설정

### 6.1 React Native에서 CORS 문제

React Native 앱에서 Render 서버로 요청을 보냈더니 CORS 에러가 발생했다.

```
Access to XMLHttpRequest at 'https://beyond-meet-api.onrender.com/api/auth/login'
from origin 'http://localhost:19000' has been blocked by CORS policy
```

찾아봤더니 React Native는 웹뷰 기반이 아니라서 **실제로는 CORS 문제가 없다**고 한다. 하지만 개발 중에는 Expo의 웹 버전에서 테스트할 수 있으므로 CORS 설정이 필요했다.

### 6.2 CORS 미들웨어 설정

```typescript
// backend/src/server.ts
import cors from 'cors';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || '*';

app.use(cors({
  origin: (origin, callback) => {
    // 모바일 앱에서는 origin이 null일 수 있음
    if (!origin || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
```

**환경 변수 설정**:
```bash
# 개발 환경
ALLOWED_ORIGINS=http://localhost:19000,http://localhost:19006

# 프로덕션
ALLOWED_ORIGINS=https://beyond-meet-api.onrender.com
```

## 7. 환경별 API URL 설정

### 7.1 모바일 앱 환경 변수

React Native 앱에서 API URL을 환경별로 자동 감지하도록 설정했다.

```typescript
// mobile/src/config/env.ts
import Config from 'react-native-config';
import { Platform } from 'react-native';

const getApiBaseUrl = (): string => {
  // 환경 변수가 설정되어 있으면 우선 사용
  if (Config.API_BASE_URL) {
    return Config.API_BASE_URL;
  }

  // 개발 환경: localhost 자동 감지
  if (__DEV__) {
    // iOS: localhost
    // Android: 10.0.2.2 (Android Emulator의 호스트 머신)
    return Platform.OS === 'ios'
      ? 'http://localhost:5000'
      : 'http://10.0.2.2:5000';
  }

  // 프로덕션: Render URL
  return 'https://beyond-meet-api.onrender.com';
};

export const ENV = {
  API_BASE_URL: getApiBaseUrl(),
  AGORA_APP_ID: Config.AGORA_APP_ID || '',
};
```

**자동 감지 로직**:
1. `API_BASE_URL` 환경 변수가 있으면 우선 사용
2. 개발 모드 (`__DEV__`)이면 localhost 자동 감지
3. 프로덕션이면 Render URL 사용

## 8. 데이터베이스 마이그레이션

### 8.1 Supabase에서 직접 SQL 실행

Render에서 Prisma 마이그레이션을 실행하려고 했더니 에러가 발생했다.

```bash
prisma migrate deploy
# Error: Prisma Migrate requires the DIRECT_URL environment variable
```

검색해보니 Supabase Pooler는 일부 마이그레이션 명령을 지원하지 않는다고 한다. 해결 방법:

1. **로컬에서 마이그레이션 SQL 생성**:
```bash
npx prisma migrate dev --name <name> --create-only
```

2. **Supabase Dashboard에서 SQL 직접 실행**:
   - Supabase → SQL Editor
   - 생성된 `migration.sql` 파일 내용 복사
   - 실행

3. **Prisma Client 재생성**:
```bash
npm run prisma:generate
```

이 방식이 번거롭지만, 베타 서비스라 스키마 변경이 많지 않아서 감수할 만했다.

## 9. 모니터링 및 로깅

### 9.1 Render 로그 확인

Render Dashboard → Logs 탭에서 실시간 로그를 확인할 수 있다.

```
[2025-01-15 10:30:45] INFO: Server started on port 5000
[2025-01-15 10:30:50] INFO: Socket.io server initialized
[2025-01-15 10:31:02] INFO: GET /health - 200 (5ms)
```

### 9.2 Uptime 모니터링

GitHub Actions keep-alive 로그로 서버 상태를 확인할 수 있다.

```
✅ Server is alive! (HTTP 200)
📊 Server Status:
{"status":"ok","timestamp":"2025-01-15T10:35:00.123Z","uptime":3600}
```

## 10. 테스트 및 검증

### 10.1 배포 후 첫 요청 테스트

1. **Cold Start 테스트**: 15분 이상 대기 후 요청
   - 첫 요청: ~80초 소요 (cold start)
   - 이후 요청: ~200ms 소요

2. **Keep-Alive 효과 테스트**:
   - GitHub Actions 활성화
   - 1시간 후 요청: ~200ms (sleep 안 됨)

### 10.2 Socket.io 연결 테스트

React Native 앱에서 Socket.io 연결 테스트:

```typescript
import io from 'socket.io-client';

const socket = io('https://beyond-meet-api.onrender.com', {
  transports: ['websocket'],
  auth: {
    token: accessToken,
  },
});

socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});
```

결과: 연결 성공! WebSocket이 Render에서 정상 작동한다.

## 11. 트러블슈팅

### 11.1 Prisma Generate 실패

**문제**: Render 배포 시 `prisma generate` 실패.

**에러**:
```
Error: @prisma/client did not initialize yet.
```

**원인**: `prisma`가 `devDependencies`에 있어서 production 빌드 시 설치 안 됨.

**해결**:
```json
// package.json
{
  "dependencies": {
    "@prisma/client": "^6.18.0",
    "prisma": "^6.18.0"  // devDependencies → dependencies로 이동
  }
}
```

### 11.2 WebSocket 연결 끊김

**문제**: Socket.io 연결이 자주 끊김.

**원인**: Render Free Plan은 메모리 제한이 512MB → 메모리 부족 시 재시작.

**해결**:
1. **메모리 사용량 최적화**: 불필요한 메모리 캐싱 제거
2. **재연결 로직 추가**:
```typescript
socket.on('disconnect', () => {
  console.log('Socket disconnected, attempting reconnect...');
  socket.connect();
});
```

### 11.3 GitHub Actions가 실행 안 됨

**문제**: Keep-alive workflow가 실행되지 않음.

**원인**: GitHub Actions는 기본적으로 비활성화된 레포지토리에서는 schedule이 작동 안 함.

**해결**: GitHub → Actions 탭 → Enable workflow

## 12. 비용 분석

### 12.1 무료 서비스 조합

| 서비스 | 무료 한도 | 실제 사용량 (베타 30명) | 비용 |
|--------|----------|----------------------|------|
| Render.com | 750시간/월 | 744시간/월 (100%) | $0 |
| Supabase | 500MB DB, 1GB Storage | ~50MB DB, ~200MB Storage | $0 |
| Upstash Redis | 10,000 명령/일 | ~2,000 명령/일 | $0 |
| Agora | 10,000분/월 | ~1,500분/월 | $0 |
| Firebase FCM | 무제한 | ~500 알림/일 | $0 |
| Hugging Face | 30,000건/월 | ~5,000건/월 | $0 |
| **총계** | - | - | **$0/월** |

베타 서비스를 **완전 무료**로 운영 성공!

## 13. 정리

Render.com에 백엔드를 무료로 배포했다. 주요 구현 내용:

1. **Render.com 선택**: WebSocket 지원, 자동 배포, 무료 SSL
2. **Supabase Connection Pooling**: `?pgbouncer=true` + `DIRECT_URL` 설정
3. **GitHub Actions Keep-Alive**: 5분마다 ping하여 cold start 방지
4. **자동 배포 (CI/CD)**: GitHub push 시 자동 빌드 및 배포
5. **환경별 URL 자동 감지**: 개발/프로덕션 환경 자동 전환
6. **$0/월 운영**: 모든 서비스를 무료 티어로 조합

다음 Part에서는 **Beta 테스트 및 피드백 반영**을 다루겠다.
