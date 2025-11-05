# Beyond Meet - WebRTC Video Dating App

## 프로젝트 개요

**Beyond Meet**는 1:1 영상 통화를 중심으로 한 데이팅 앱입니다.
- **플랫폼**: iOS, Android (React Native)
- **개발 기간**: 50일 (2025-11-04 ~ 2025-12-24)
- **Beta 전략**: 20명 한정 초대 코드 시스템
- **비용**: $0/월 (Beta 단계)

## 프로젝트 구조

```
beyond-meet/
├── mobile/          # React Native 앱 (iOS + Android)
├── backend/         # Node.js + Express + Prisma 백엔드
└── README.md        # 이 파일
```

## 기술 스택

### Frontend (mobile/)
- React Native 0.82.1
- TypeScript
- Agora Video SDK (WebRTC)
- Redux Toolkit (상태 관리)
- React Navigation (라우팅)

### Backend (backend/)
- Node.js + Express
- TypeScript
- Prisma ORM (PostgreSQL)
- Socket.io (실시간 통신)
- JWT 인증
- bcryptjs (비밀번호 해싱)

### 무료 인프라
- **호스팅**: Render.com (750시간/월 무료)
- **데이터베이스**: Supabase PostgreSQL (500MB 무료)
- **캐시**: Upstash Redis (10,000 명령/일 무료)
- **푸시 알림**: Firebase FCM (무제한 무료)
- **영상 통화**: Agora (10,000분/월 무료)

## 시작하기

### 1. 사전 요구사항

- Node.js 18+
- npm 또는 yarn
- Xcode (iOS 개발)
- Android Studio (Android 개발)
- CocoaPods (iOS 의존성)

### 2. 백엔드 설정

```bash
cd backend

# 의존성 설치 (이미 완료됨)
npm install

# Prisma 클라이언트 생성
npm run prisma:generate

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 실제 값 입력

# 데이터베이스 마이그레이션
npm run prisma:migrate

# 개발 서버 실행
npm run dev
```

백엔드 서버는 http://localhost:3000 에서 실행됩니다.

### 3. 모바일 앱 설정

```bash
cd mobile

# iOS 의존성 설치 (Mac만 해당)
cd ios && pod install && cd ..

# Metro bundler 실행
npm start

# iOS 실행 (다른 터미널에서)
npm run ios

# Android 실행 (다른 터미널에서)
npm run android
```

## 핵심 기능

### ✅ MVP 기능 (출시 버전)
- 사용자 인증 (회원가입/로그인)
- 초대 코드 시스템 (20명 한정)
- 프로필 관리 (사진, 관심사, 필터 설정)
- 랜덤 매칭 + 친구 선택 매칭
- 1:1 영상 통화 (5분 제한)
- 카메라 전환 (전면/후면)
- 배경 블러/변경
- 친구 관리
- 푸시 알림

### 🔜 추후 기능
- 신고/차단 시스템
- 부적절한 콘텐츠 AI 감지
- 사용자 검증 배지
- 프리미엄 멤버십

## API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입 (초대 코드 필요)
- `POST /api/auth/login` - 로그인
- `POST /api/auth/validate-invite` - 초대 코드 검증
- `POST /api/auth/refresh` - 토큰 갱신

### 사용자
- `GET /api/users/me` - 내 프로필 조회
- `PUT /api/users/me` - 내 프로필 수정
- `GET /api/users/:id` - 다른 사용자 프로필 조회

### 매칭
- `POST /api/match/random` - 랜덤 매칭 요청
- `POST /api/match/direct/:userId` - 친구에게 통화 요청
- `POST /api/match/:sessionId/accept` - 매칭 수락
- `POST /api/match/:sessionId/reject` - 매칭 거절

### Agora
- `POST /api/agora/token` - Agora RTC 토큰 생성

### 관리자
- `POST /api/admin/invite-codes` - 초대 코드 생성
- `GET /api/admin/invite-codes` - 초대 코드 목록
- `GET /api/admin/stats` - 사용자 통계

## 개발 가이드

### 백엔드 빌드
```bash
cd backend
npm run build         # TypeScript 컴파일
npm start            # 프로덕션 모드로 실행
```

### 데이터베이스 관리
```bash
cd backend
npm run prisma:studio    # Prisma Studio GUI
npm run prisma:generate  # Prisma 클라이언트 재생성
npm run prisma:migrate   # 마이그레이션 실행
```

### 코드 스타일
- 모든 코드는 TypeScript를 사용합니다
- ESLint와 Prettier로 코드 포맷팅
- 커밋 전 린트 체크

## 배포

### 백엔드 배포 (Render.com)
1. Render.com에 가입
2. 새 Web Service 생성
3. GitHub 저장소 연결
4. 빌드 명령: `cd backend && npm install && npm run build`
5. 시작 명령: `cd backend && npm start`
6. 환경 변수 설정

### 모바일 앱 배포
1. **iOS**: Xcode로 Archive → App Store Connect 업로드
2. **Android**: `cd android && ./gradlew assembleRelease`

## Beta 테스트 (20명 한정)

### 초대 코드 생성 (관리자)
```bash
curl -X POST http://localhost:3000/api/admin/invite-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "count": 20,
    "maxUses": 1,
    "expiresInDays": 30
  }'
```

### 초대 코드 사용 (사용자)
회원가입 시 초대 코드 입력 필수

## 비용 산정

### Beta 테스트 (20명)
- 예상 일일 통화: 100분
- 월간 통화: 3,000분
- **총 비용**: $0 ✅

### 무료 한도
- Agora: 10,000분/월
- Render: 750시간/월
- Supabase: PostgreSQL 500MB + 1GB Storage
- Upstash: Redis 10,000 명령/일
- Firebase: FCM 무제한

## 문서

### 개발 가이드
- **[CLAUDE.md](CLAUDE.md)** - 코딩 컨벤션 및 프로젝트 규칙 (개발 시작 전 필독!)

### 프로젝트 문서
자세한 문서는 [docs/](docs/) 폴더를 참고하세요:
- [PRD.md](docs/PRD.md) - 제품 요구사항 문서
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - 기술 아키텍처
- [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) - 50일 개발 일정
- [API_SPECIFICATION.md](docs/API_SPECIFICATION.md) - API 명세서
- [UI_FLOW.md](docs/UI_FLOW.md) - UI/UX 플로우

## 라이선스

[라이선스 정보]

## 연락처

- GitHub: [저장소 링크]
- Email: [이메일 주소]

---

**버전**: 1.0.0
**작성일**: 2025-11-04
**상태**: 개발 진행 중 🚀
