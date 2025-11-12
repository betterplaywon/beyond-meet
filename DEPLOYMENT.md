# Beyond Meet - 배포 및 인프라 가이드

이 문서는 Beyond Meet 프로젝트의 배포, 인프라 설정, 환경 변수 관리에 대한 상세 정보를 담고 있습니다.

**⚠️ 중요: 실제 환경 변수 값은 절대 Git에 커밋하지 마세요! `.env` 파일만 사용하세요.**

---

## 📦 프로덕션 배포 현황 (2025-11-12 기준)

### 🚀 백엔드 배포 (Render.com)

**배포 URL**: [YOUR_RENDER.COM_DOMAIN](env 참조)

**상태**:

- ✅ Health Check: HTTP 200 OK
- ✅ 응답 시간: ~0.25초
- ✅ 자동 빌드 & 배포 설정 완료
- ✅ 환경 변수 15개 모두 설정 완료

**배포 방법**:

1. GitHub 저장소 연결
2. Build Command: `cd backend && npm install && npm run build`
3. Start Command: `cd backend && npm start`
4. 환경 변수 설정 (아래 참조)
5. 자동 배포 활성화 (main 브랜치 push 시)

---

## 🗄️ 데이터베이스 (Supabase)

### DB 마이그레이션 완료

**생성된 테이블 (9개)**:

1. `users` - 사용자 정보 (이메일, 비밀번호, 프로필)
2. `match_sessions` - 매칭 세션 (랜덤/선택 매칭)
3. `call_records` - 통화 기록 (시작/종료 시간, 품질)
4. `call_events` - 통화 이벤트 (상세 로그)
5. `friendships` - 친구 관계 (상태: PENDING, ACCEPTED)
6. `block_lists` - 차단 목록
7. `invite_codes` - 초대 코드 (20개 생성 완료)
8. `invite_code_usages` - 초대 코드 사용 내역
9. `device_tokens` - FCM 디바이스 토큰 (iOS, Android)

**ENUM 타입 정의**:

- `Gender`: MALE, FEMALE, OTHER
- `OnlineStatus`: ONLINE, OFFLINE, IN_CALL
- `MatchStatus`: PENDING, ACTIVE, COMPLETED, REJECTED, CANCELLED
- `CallEndReason`: COMPLETED, CANCELLED, TIMEOUT, ERROR
- `FriendshipStatus`: PENDING, ACCEPTED, REJECTED, BLOCKED
- `DeviceType`: IOS, ANDROID

**초기 데이터**:

- ✅ 초대 코드 20개 생성 완료 (Beta 테스트용)

---

## 🔧 환경 변수 설정

### 백엔드 환경 변수 (`backend/.env`)

**⚠️ 중요**:

- 실제 값은 `.env` 파일에만 저장
- 절대 Git에 커밋하지 말 것
- `.env.example` 파일만 커밋

```bash
# 개발 환경
NODE_ENV=production  # 프로덕션: production, 개발: development
PORT=5000

# 데이터베이스 (Supabase)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[HOST]:6543/postgres"

# Redis (Upstash)
UPSTASH_REDIS_URL="https://[REDIS_ID].upstash.io"
UPSTASH_REDIS_TOKEN="[YOUR_REDIS_TOKEN]"

# JWT
JWT_SECRET="[YOUR_STRONG_SECRET_KEY]"
JWT_REFRESH_SECRET="[YOUR_REFRESH_SECRET_KEY]"

# Agora WebRTC
AGORA_APP_ID="[YOUR_AGORA_APP_ID]"
AGORA_APP_CERTIFICATE="[YOUR_AGORA_CERTIFICATE]"

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID="[YOUR_PROJECT_ID]"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[YOUR_PRIVATE_KEY]\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="[SERVICE_ACCOUNT]@[PROJECT_ID].iam.gserviceaccount.com"

# Supabase Storage
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"

# 기타
ALLOWED_ORIGINS=[YOUR_RENDER.COM_DOMAIN]
BETA_USER_LIMIT=20
```

### 프론트엔드 환경 변수 (`mobile/.env`)

```bash
# 프로덕션 API URL
API_BASE_URL=[YOUR_RENDER.COM_DOMAIN]

# Agora App ID (백엔드와 동일한 값 사용)
AGORA_APP_ID=[YOUR_AGORA_APP_ID]
```

### Render.com 환경 변수 설정 방법

1. Render.com Dashboard 접속
2. Beyond Meet 서비스 선택
3. **Environment** 탭 클릭
4. 위의 15개 환경 변수 추가
5. **Save Changes** 클릭

---

## 🌐 외부 서비스 통합

### 1. Agora WebRTC

**프로젝트 설정**:

- Agora Console (https://console.agora.io) 접속
- 프로젝트 생성: Beyond Meet
- Authentication Mode: **Secured** (Certificate 사용)
- App ID 및 Certificate 복사
- 백엔드/프론트엔드 `.env` 파일에 설정

**구현 완료**:

- ✅ 백엔드: RTC Token 생성 API (`/api/agora/token`)
- ✅ 프론트엔드: Agora Video SDK 통합
- ✅ 무료 플랜: 10,000분/월

### 2. Firebase Cloud Messaging (FCM)

**프로젝트 설정**:

1. Firebase Console (https://console.firebase.google.com) 접속
2. 프로젝트 생성
3. **Android 앱 추가**:
   - Package Name: `com.beyondmeet`
   - `google-services.json` 다운로드 → `mobile/android/app/`
4. **iOS 앱 추가**:
   - Bundle ID: `com.beyondmeet`
   - `GoogleService-Info.plist` 다운로드 → `mobile/ios/`
5. **Service Account Key 생성**:
   - Project Settings → Service Accounts
   - Generate New Private Key
   - JSON 다운로드 → 백엔드 환경 변수에 설정

**구현 완료**:

- ✅ FCM 푸시 알림 서비스 (`/api/push`)
- ✅ 포그라운드/백그라운드/Deep Link 처리

### 3. Upstash Redis

**Database 설정**:

1. Upstash Console (https://console.upstash.com) 접속
2. Database 생성
   - Name: beyond-meet-redis
   - Region: AWS ap-southeast-2 (가까운 지역)
   - Type: Regional
3. REST URL 및 Token 복사
4. 백엔드 `.env` 파일에 설정

**사용처**:

- ✅ 실시간 매칭 대기열
- ✅ 세션 관리 캐싱
- ✅ Rate Limiting 카운터
- ✅ 무료 플랜: 10,000 명령/일

### 4. Supabase

**프로젝트 설정**:

1. Supabase Dashboard (https://supabase.com/dashboard) 접속
2. 프로젝트 생성
3. **Database 설정**:
   - Settings → Database
   - Connection String 복사 (Pooler 사용)
   - `DATABASE_URL`에 `?pgbouncer=true` 파라미터 추가
4. **Storage 설정**:
   - Storage → Create Bucket
   - Bucket Name: `profile-photos`
   - Public Bucket 체크

**구현 완료**:

- ✅ Prisma ORM 연동
- ✅ 프로필 사진 업로드/삭제 API
- ✅ 무료 플랜: 500MB DB + 1GB Storage

---

## 🤖 자동화 워크플로우

### GitHub Actions - Keep-Alive

**파일 위치**: `.github/workflows/keep-alive.yml`

**목적**: Render.com 무료 플랜의 서버 sleep 방지 (15분 무요청 시 sleep)

```yaml
name: Keep Render Server Alive

on:
  schedule:
    - cron: "*/5 * * * *" # 5분마다 실행
  workflow_dispatch: # 수동 실행 가능

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping server
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://beyond-meet-api.onrender.com/health)
          if [ $response -eq 200 ]; then
            echo "Server is alive (HTTP $response)"
          else
            echo "Server returned HTTP $response)"
            exit 1
          fi
```

**특징**:

- ✅ 5분마다 자동 실행
- ✅ HTTP 200 응답 확인
- ✅ 수동 실행 가능
- ✅ 무료 (GitHub Actions 2,000분/월)

---

## 📋 완료 작업 히스토리

### 🚀 인프라 배포 완료 (2025-11-12)

- ✅ Render.com 백엔드 배포
- ✅ Supabase DB 마이그레이션 (9개 테이블)
- ✅ Agora WebRTC 설정
- ✅ Firebase FCM 설정 (iOS + Android)
- ✅ Upstash Redis 연결
- ✅ GitHub Actions Keep-Alive 활성화
- ✅ 환경 변수 15개 설정

### 🐛 버그 수정 (2025-11-10 ~ 2025-11-12)

**백엔드**:

- Morgan 의존성 이동 (devDependencies → dependencies)
- 프로필 편집 API 수정
- GitHub Actions 워크플로우 추가

**모바일**:

- 환경 변수 관리 시스템 구축 (`config/env.ts`)
- iOS 빌드 에러 수정
- 친구 요청 알림 라우팅 수정

---

## 🔍 트러블슈팅

### Render.com 이슈

**문제**: 서버 sleep 상태
**해결**: GitHub Actions Keep-Alive 활성화

**문제**: 환경 변수 미로드
**해결**: Render.com Dashboard에서 재설정

### Supabase 이슈

**문제**: Prisma migrate 시간 초과
**해결**: `?pgbouncer=true` 파라미터 추가

**문제**: Connection pooler 에러
**해결**: `DIRECT_URL`을 Pooler URL로 설정

### Firebase FCM 이슈

**문제**: iOS 알림 수신 안 됨
**해결**:

- `GoogleService-Info.plist` 확인
- Push Notifications Capability 활성화

**문제**: Android 알림 수신 안 됨
**해결**:

- `google-services.json` 확인
- Package Name 일치 확인

---

**작성일**: 2025-11-12
**버전**: 1.0.0

배포 관련 문의사항은 [CLAUDE.md](CLAUDE.md)를 참조하세요.
