# 영상 데이팅 앱 만들기 #14 - Render.com 무료 배포와 Cold Start 대응

> **이전 글 요약**: Part 13에서 관리자 대시보드를 구현했다. Promise.all로 병렬 쿼리를 실행해서 성능을 높이고, React Query의 useInfiniteQuery로 무한 스크롤을 구현했다.

백엔드를 개발했으니 이제 실제로 서비스를 배포할 차례다. Beta 서비스는 **$0/월**로 운영하는 것이 목표였기 때문에 무료 호스팅 플랫폼을 찾아봤다.

---

## 배포 플랫폼 선택

### 무료 호스팅 플랫폼 비교

여러 플랫폼을 비교해봤다.

| 플랫폼 | 무료 한도 | 장점 | 단점 |
|--------|----------|------|------|
| **Render.com** | 750시간/월 | WebSocket 지원, 자동 배포, HTTPS | 15분 비활동 시 sleep |
| **Railway** | $5 크레딧/월 | Sleep 없음, 빠른 배포 | 무료 크레딧 소진 시 과금 |
| **Fly.io** | 256MB RAM 무료 | Sleep 없음 | RAM 제한으로 Node.js 앱 구동 어려움 |
| **Vercel** | 무제한 | Next.js 최적화 | 서버리스 함수 10초 제한 (Socket.io 불가) |

Beyond Meet은 **Render.com**을 선택했다. Socket.io 지원이 필수였고, GitHub 연동으로 push 시 자동 배포도 가능했다. 무료 SSL 인증서도 제공된다. 750시간/월은 한 달 계속 켜둘 수 있는 시간이다(744시간 = 31일).

유일한 단점은 **15분 비활동 시 sleep**인데, 이건 GitHub Actions로 해결할 수 있었다.

---

## Render.com 배포 설정

### 프로젝트 생성

1. render.com에 가입하고 **New +** → **Web Service** 선택
2. GitHub 레포지토리 연결
3. Root Directory: `backend`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`

### 빌드 스크립트 설정

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

build 스크립트에서 `prisma generate`를 먼저 실행하는 이유가 있다. Prisma Client는 빌드 시 생성되는 코드로, 스키마에 맞는 타입 안전 DB 클라이언트를 만든다. 빌드마다 실행해야 최신 스키마가 반영된다.

---

## Supabase Connection Pooling

### Prisma + Supabase 연결 문제

Render에 배포했더니 Prisma가 DB 연결에 실패했다.

```
Error: P1001: Can't reach database server at aws-0-ap-northeast-1.pooler.supabase.com
```

찾아보니 Supabase는 **Connection Pooler**를 사용할 때 특별한 설정이 필요했다.

### pgbouncer 설정

Supabase Pooler는 PgBouncer를 사용하는데, Prisma와 호환성 문제가 있다.

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

두 가지 URL이 필요한 이유가 있다. `DATABASE_URL`(Pooler, Port 6543)은 일반 쿼리용이고 `?pgbouncer=true`를 추가해야 한다. `DIRECT_URL`(Direct, Port 5432)은 마이그레이션용인데, Pooler는 일부 명령을 지원하지 않기 때문이다.

---

## Cold Start 문제와 해결

### Render Free Plan의 Sleep 정책

Render 무료 플랜은 **15분간 요청이 없으면 서버를 sleep**시킨다. sleep 후 첫 요청이 오면 **cold start**가 발생해서 60-90초가 걸린다.

이 문제를 해결하기 위해 **GitHub Actions**로 주기적으로 서버를 ping해서 깨어있게 만들었다.

### Health Check 엔드포인트 추가

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

### GitHub Actions Keep-Alive Workflow

`.github/workflows/keep-alive.yml` 파일을 생성했다.

```yaml
name: Keep Render.com Server Alive

on:
  schedule:
    - cron: '*/5 * * * *'  # 5분마다 실행
  workflow_dispatch:  # 수동 실행 가능

jobs:
  ping-server:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Health Endpoint
        run: |
          max_attempts=3
          attempt=1

          while [ $attempt -le $max_attempts ]; do
            response=$(curl -s -o /dev/null -w "%{http_code}" \
              --max-time 120 \
              https://beyond-meet-api.onrender.com/health)

            if [ "$response" = "200" ]; then
              echo "✅ Server is alive!"
              exit 0
            fi

            echo "⚠️ Attempt $attempt failed, retrying..."
            sleep 30
            attempt=$((attempt + 1))
          done

          echo "❌ All attempts failed"
          exit 1
```

핵심 포인트를 정리하면:
- **5분마다 실행**: Render는 15분 비활동 시 sleep이므로 5분마다 ping하면 항상 깨어있다
- **3회 재시도**: Cold start 시 첫 요청이 타임아웃될 수 있으므로 재시도한다
- **120초 타임아웃**: Cold start는 60-90초 걸리므로 충분한 여유를 둔다

찾아보니 GitHub Actions의 `schedule`은 최소 5분 간격만 지원한다고 한다.

---

## 자동 배포 (CI/CD)

Render는 GitHub 연동 시 **자동 배포**를 지원한다. Settings에서 Auto-Deploy를 Yes로 설정하고 main 브랜치를 선택하면, `main` 브랜치에 push할 때마다 자동으로 빌드 및 배포가 진행된다.

Render는 새 버전을 먼저 시작하고, health check가 성공하면 트래픽을 새 버전으로 전환한 후 이전 버전을 종료하는 Zero-Downtime Deployment를 제공한다.

---

## 환경별 API URL 설정

React Native 앱에서 API URL을 환경별로 자동 감지하도록 설정했다.

```typescript
// mobile/src/config/env.ts
const getApiBaseUrl = (): string => {
  if (Config.API_BASE_URL) {
    return Config.API_BASE_URL;
  }

  if (__DEV__) {
    // iOS: localhost, Android: 10.0.2.2 (Android Emulator의 호스트 머신)
    return Platform.OS === 'ios'
      ? 'http://localhost:5000'
      : 'http://10.0.2.2:5000';
  }

  return 'https://beyond-meet-api.onrender.com';
};

export const ENV = {
  API_BASE_URL: getApiBaseUrl(),
};
```

`API_BASE_URL` 환경 변수가 있으면 우선 사용하고, 개발 모드(`__DEV__`)이면 localhost를 자동 감지하며, 프로덕션이면 Render URL을 사용한다.

---

## 겪었던 문제들

### Prisma Generate 실패

Render 배포 시 `prisma generate`가 실패했다. `prisma`가 `devDependencies`에 있어서 production 빌드 시 설치되지 않아서 생긴 문제였다.

```json
{
  "dependencies": {
    "@prisma/client": "^6.18.0",
    "prisma": "^6.18.0"  // devDependencies → dependencies로 이동
  }
}
```

### WebSocket 연결 끊김

Socket.io 연결이 자주 끊기는 문제가 있었다. Render Free Plan의 메모리 제한이 512MB인데, 메모리가 부족하면 재시작되기 때문이었다.

불필요한 메모리 캐싱을 제거하고, 클라이언트에 재연결 로직을 추가해서 해결했다.

### GitHub Actions가 실행 안 됨

Keep-alive workflow가 실행되지 않는 문제가 있었다. GitHub Actions는 기본적으로 비활성화된 레포지토리에서는 schedule이 작동하지 않는다. GitHub의 Actions 탭에서 Enable workflow를 클릭해야 한다.

---

## 비용 분석

### 무료 서비스 조합

| 서비스 | 무료 한도 | 실제 사용량 (Beta 30명) | 비용 |
|--------|----------|----------------------|------|
| Render.com | 750시간/월 | 744시간/월 | $0 |
| Supabase | 500MB DB, 1GB Storage | ~50MB DB, ~200MB Storage | $0 |
| Upstash Redis | 10,000 명령/일 | ~2,000 명령/일 | $0 |
| Agora | 10,000분/월 | ~1,500분/월 | $0 |
| Firebase FCM | 무제한 | ~500 알림/일 | $0 |
| Hugging Face | 30,000건/월 | ~5,000건/월 | $0 |
| **총계** | - | - | **$0/월** |

Beta 서비스를 **완전 무료**로 운영하는 데 성공했다.

---

## 다음 글 예고

**Part 15: Beta 테스트**

다음 글에서는 Beta 테스트 진행 과정과 피드백 반영에 대해 다룬다. 테스터 모집, 피드백 수집, 버그 수정 등을 다룰 예정이다.

---

## 마치며

Render.com에 백엔드를 무료로 배포하면서 몇 가지 배운 점이 있다.

Cold start 문제는 GitHub Actions로 5분마다 ping하는 것으로 해결할 수 있었다. 이렇게 하면 서버가 항상 깨어있어서 사용자 경험이 좋아진다.

Supabase의 Connection Pooler 설정이 처음에 헷갈렸는데, `DATABASE_URL`과 `DIRECT_URL`을 분리하고 `?pgbouncer=true`를 추가하면 된다는 걸 알게 됐다.

무료 서비스만 조합해서 $0/월로 Beta 서비스를 운영할 수 있다는 게 의외였다. Render, Supabase, Upstash, Agora, Firebase, Hugging Face 모두 무료 티어가 충분했다.

---

**태그**: `Render.com` `배포` `CI/CD` `Cold Start` `GitHub Actions` `무료 호스팅`
