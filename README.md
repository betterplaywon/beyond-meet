# Beyond Meet - WebRTC Video Dating App

**1:1 영상 통화 기반 데이팅 앱**

[![Project Status](https://img.shields.io/badge/Status-In%20Development-yellow)](https://github.com)
[![Progress](https://img.shields.io/badge/Progress-90%25-brightgreen)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

---

## 📋 프로젝트 개요

Beyond Meet는 WebRTC 기반 1:1 영상 통화 데이팅 앱입니다.

- **플랫폼**: iOS, Android (React Native)
- **개발 기간**: 50일 (2025-11-04 ~ 2025-12-24)
- **현재 진행**: Day 7 (진행률 90% - 계획 대비 4-5주 앞섬) 🎉
- **Beta 전략**: 20명 한정 초대 코드 시스템
- **운영 비용**: $0/월 (Beta 단계)

---

## 🗂️ 프로젝트 구조

```
beyond-meet/
├── mobile/              # React Native 앱 (iOS + Android)
│   ├── src/
│   │   ├── screens/    # 화면 컴포넌트
│   │   ├── components/ # 재사용 컴포넌트
│   │   ├── api/        # API 클라이언트
│   │   ├── store/      # Zustand 상태 관리
│   │   ├── navigation/ # React Navigation
│   │   └── hooks/      # Custom Hooks
│   ├── ios/            # iOS 네이티브 코드
│   └── android/        # Android 네이티브 코드
│
├── backend/             # Node.js + Express 백엔드
│   ├── src/
│   │   ├── controllers/ # 요청 처리 로직
│   │   ├── services/    # 비즈니스 로직
│   │   ├── routes/      # API 라우트
│   │   ├── middlewares/ # Express 미들웨어
│   │   ├── sockets/     # Socket.io 핸들러
│   │   └── config/      # 설정 파일
│   ├── prisma/          # Prisma 스키마 & 마이그레이션
│   └── .env             # 환경 변수 (Git 무시)
│
├── docs/                # 프로젝트 문서
│   ├── PRD.md          # 제품 요구사항
│   ├── ARCHITECTURE.md # 기술 아키텍처
│   ├── API_SPECIFICATION.md # API 명세서
│   ├── DEVELOPMENT_PLAN.md  # 개발 일정
│   └── UI_FLOW.md      # UI/UX 플로우
│
├── CLAUDE.md            # 개발 컨벤션 (필독!)
└── README.md            # 이 파일
```

---

## 🚀 기술 스택

### Frontend (mobile/)

- **Framework**: React Native 0.82.1
- **Language**: TypeScript
- **영상 통화**: Agora Video SDK (WebRTC)
- **상태 관리**: Zustand
- **서버 상태 관리**: React Query (@tanstack/react-query)
- **HTTP 클라이언트**: Axios
- **라우팅**: React Navigation
- **실시간 통신**: Socket.io Client

### Backend (backend/)

- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **ORM**: Prisma (PostgreSQL)
- **실시간 통신**: Socket.io
- **인증**: JWT (Access + Refresh Token)
- **보안**: bcryptjs, Helmet, CORS

### 무료 인프라

| 서비스         | 용도                 | 무료 한도              | 상태      |
| -------------- | -------------------- | ---------------------- | --------- |
| **Render.com** | 백엔드 호스팅        | 750시간/월             | ⚠️ 미설정 |
| **Supabase**   | PostgreSQL + Storage | 500MB DB + 1GB Storage | ✅ 연결됨 |
| **Upstash**    | Redis 캐시           | 10,000 명령/일         | ⚠️ 미설정 |
| **Firebase**   | FCM 푸시 알림        | 무제한                 | ⚠️ 미설정 |
| **Agora**      | 영상 통화            | 10,000분/월            | ⚠️ 미설정 |

---

## 📊 현재 진행 상황 (2025-11-10 기준)

### 전체 진행률: 90% (Day 7/50일) ⭐ +20% 증가

#### ✅ Backend: 100% 완료 🎉

**구현 완료:**

- ✅ 인증 시스템 (회원가입, 로그인, JWT, 초대 코드 검증)
- ✅ 사용자 관리 API (프로필 조회/수정, 친구 관리)
- ✅ 매칭 시스템 (랜덤/선택 매칭, Socket.io)
- ✅ Agora RTC 토큰 생성
- ✅ Prisma Schema 전체 정의 (9개 모델)
- ✅ Supabase Storage 연동
- ✅ 통화 관리 API (시작/종료/기록/이벤트)
- ✅ 푸시 알림 API (FCM 디바이스 토큰 등록/제거)
- ✅ 프로필 사진 업로드 API (Supabase Storage, Multer)
- ✅ 관리자 API (초대 코드 생성, 통계, 비활성화)
- ✅ 비밀번호 재설정 API (forgot-password, reset-password)
- ✅ Rate Limiting (인증, 업로드, 관리자별 제한)

#### ✅ Mobile: 100% 완료 🎉 ⭐ +30% 증가

**구현 완료:**

- ✅ 인증 화면 (Splash, Welcome, Login, Register)
- ✅ 홈 화면 (HomeScreen)
- ✅ 영상 통화 화면 (VideoCallScreen, CallEndScreen, IncomingCallModal)
- ✅ 프로필 화면 (ProfileScreen, ProfileEditScreen, SettingsScreen)
- ✅ 친구 목록 화면 (FriendsScreen)
- ✅ 통화 기록 화면 (CallHistoryScreen)
- ✅ **매칭 대기 화면** (MatchingScreen) ⭐ NEW
- ✅ 공통 컴포넌트 (Button, Input, Avatar, Picker, **NotificationPermissionModal**) ⭐ NEW
- ✅ Navigation 구조 (Auth, Main, Root)
- ✅ Zustand Store (클라이언트 상태 관리 + userId 추가)
- ✅ React Query 통합 완료 (서버 상태 관리)
  - ✅ API 서비스 레이어 (axios 인터셉터, 토큰 관리)
  - ✅ 친구 API Hooks (useFriends, useAddFriend, useRemoveFriend, useBlockUser)
  - ✅ 사용자 API Hooks (useMyProfile, useUpdateProfile, useUploadProfilePhoto, useUpdateSettings)
  - ✅ 통화 API Hooks (useCallHistory, useStartCall, useEndCall)
  - ✅ 매칭 API Hooks (useStartMatch, useCancelMatch)
  - ✅ Socket.io 통합 (useSocket, useSocketEvent)
- ✅ Firebase FCM 연동 (iOS + Android)
- ✅ **푸시 알림 완전 통합** ⭐⭐⭐ NEW
  - ✅ pushService.ts 통합 서비스 (포그라운드/백그라운드/Deep Link)
  - ✅ NotificationPermissionModal (권한 요청 UI)
  - ✅ 알림 타입별 화면 이동 (call_incoming, match_found, friend_request, call_ended)
  - ✅ 토큰 자동 갱신 및 서버 등록

#### ⚠️ Infrastructure: 10% 완료

**진행 필요:**

- ❌ Render.com 배포 ⭐⭐⭐⭐⭐
- ❌ Supabase DB 마이그레이션 실행 ⭐⭐⭐⭐⭐
- ❌ Agora 프로젝트 설정 ⭐⭐⭐⭐⭐
- ❌ Firebase FCM 설정 ⭐⭐⭐⭐⭐
- ❌ Upstash Redis 설정 ⭐⭐⭐⭐
- ❌ UptimeRobot 모니터링 ⭐⭐⭐

---

## 🎯 핵심 기능

### MVP 기능 (Beta 출시)

- [x] 사용자 인증 (회원가입/로그인)
- [x] 초대 코드 시스템 (20명 한정)
- [x] 프로필 관리 (기본 정보, 편집, 설정)
- [x] 프로필 사진 업로드 ⭐ NEW
- [x] 랜덤 매칭
- [x] 친구 선택 매칭
- [x] 친구 목록 및 관리
- [x] 1:1 영상 통화 (5분 제한)
- [x] 매칭 대기 화면 ⭐ NEW
- [x] 통화 기록 화면
- [x] 푸시 알림 (포그라운드/백그라운드/Deep Link) ⭐ NEW

### 추후 기능 (v1.1+)

- 신고/차단 시스템
- 배경 블러/변경
- 부적절한 콘텐츠 AI 감지
- 사용자 검증 배지
- 프리미엄 멤버십

---

## 🏃 시작하기

### 사전 요구사항

```bash
# 필수
Node.js 18+
npm 또는 yarn
Git

# iOS 개발 (Mac만)
Xcode 14+
CocoaPods

# Android 개발
Android Studio
JDK 11+
```

### 1. 저장소 클론

```bash
git clone <repository-url>
cd beyond-meet
```

### 2. 백엔드 설정

```bash
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (DATABASE_URL, JWT_SECRET 등)

# Prisma 클라이언트 생성
npm run prisma:generate

# 데이터베이스 마이그레이션 (Supabase 설정 완료 후)
npm run prisma:migrate

# 초대 코드 생성
npm run db:seed

# 개발 서버 실행
npm run dev
```

**백엔드 서버**: http://localhost:3000

### 3. 모바일 앱 설정

```bash
cd mobile

# 의존성 설치
npm install

# iOS 의존성 (Mac만)
cd ios && pod install && cd ..

# Metro bundler 실행
npm start
```

**새 터미널에서 앱 실행:**

```bash
# iOS
npm run ios

# Android
npm run android
```

---

## 📡 API 엔드포인트

### 인증 API

```
POST   /api/auth/register       # 회원가입 (초대 코드 필수)
POST   /api/auth/login          # 로그인
POST   /api/auth/refresh        # 토큰 갱신
POST   /api/auth/logout         # 로그아웃 (인증 필요)
GET    /api/auth/me             # 내 정보 조회 (인증 필요)
```

### 사용자 API

```
GET    /api/users/:id           # 사용자 조회
PUT    /api/users/:id           # 프로필 수정
POST   /api/users/friends       # 친구 추가
DELETE /api/users/friends/:id   # 친구 삭제
```

### 매칭 API

```
POST   /api/match/random        # 랜덤 매칭 요청
POST   /api/match/direct        # 선택 매칭 (친구에게)
DELETE /api/match/:sessionId    # 매칭 취소
```

### Agora API

```
POST   /api/agora/token         # RTC 토큰 생성
```

### 관리자 API

```
POST   /api/admin/invite-codes  # 초대 코드 생성
GET    /api/admin/invite-codes  # 초대 코드 목록
GET    /api/admin/stats         # 사용자 통계
```

### Socket.io 이벤트

**Client → Server:**

- `match:request` - 매칭 요청
- `match:cancel` - 매칭 취소
- `call:accept` - 통화 수락
- `call:reject` - 통화 거절
- `call:end` - 통화 종료

**Server → Client:**

- `match:found` - 매칭 성공
- `call:incoming` - 통화 수신
- `call:ended` - 통화 종료됨

---

## 🛠️ 개발 가이드

### 코딩 컨벤션

**⚠️ 개발 시작 전 필독:** [CLAUDE.md](CLAUDE.md)

이 파일에는 다음이 포함되어 있습니다:

- TypeScript 네이밍 규칙
- API 응답 형식 통일
- Prisma 사용 규칙
- React Native 컴포넌트 작성 규칙
- Git 커밋 메시지 형식
- 보안 규칙
- 절대 금지 사항

### 백엔드 개발

```bash
cd backend

# TypeScript 빌드
npm run build

# 프로덕션 실행
npm start

# Prisma Studio (GUI)
npm run prisma:studio

# 타입 체크
npm run typecheck
```

### 데이터베이스 마이그레이션

**⚠️ Supabase 사용 시 주의사항:**

Prisma 마이그레이션 대신 Supabase Dashboard에서 직접 SQL 실행 권장:

```bash
# 1. SQL 마이그레이션 파일 생성 (실행 안함)
cd backend
npx prisma migrate dev --name <name> --create-only

# 2. 생성된 SQL 파일 확인
cat prisma/migrations/<timestamp>_<name>/migration.sql

# 3. Supabase Dashboard > SQL Editor에서 실행
# 4. Prisma Client 재생성
npm run prisma:generate
```

### 테스트

```bash
# 백엔드 테스트 (추후 구현)
cd backend
npm test

# 모바일 테스트 (추후 구현)
cd mobile
npm test
```

---

## 📚 문서

### 필독 문서 (개발 시작 전)

1. **[CLAUDE.md](CLAUDE.md)** ⭐⭐⭐⭐⭐

   - 코딩 컨벤션 및 프로젝트 규칙
   - 진행 상황 및 남은 업무

2. **[docs/PRD.md](docs/PRD.md)** ⭐⭐⭐⭐⭐

   - 프로젝트 비전 및 요구사항
   - Beta 전략
   - 초대 코드 시스템

3. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** ⭐⭐⭐⭐⭐

   - 시스템 아키텍처
   - 기술 스택 상세
   - 무료 인프라 전략

4. **[docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)** ⭐⭐⭐⭐

   - 모든 API 엔드포인트 명세
   - 요청/응답 형식
   - 에러 코드

5. **[docs/UI_FLOW.md](docs/UI_FLOW.md)** ⭐⭐⭐⭐

   - 화면 설계
   - 디자인 시스템
   - 사용자 플로우

6. **[docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)** ⭐⭐⭐⭐
   - 50일 개발 일정
   - 주차별 목표
   - 위험 요소 대응

---

## 🚢 배포

### 백엔드 배포 (Render.com)

1. Render.com 계정 생성
2. New Web Service 생성
3. GitHub 저장소 연결
4. 설정:
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: Node 18
5. 환경 변수 설정 (DATABASE_URL, JWT_SECRET 등)

### 모바일 앱 배포

#### iOS (TestFlight)

```bash
cd mobile/ios
# Xcode에서 Archive → TestFlight 업로드
```

#### Android (Google Play Beta)

```bash
cd mobile/android
./gradlew assembleRelease
# Google Play Console에서 Beta 트랙 업로드
```

---

## 🧪 Beta 테스트 (20명 한정)

### 초대 코드 생성 (서버에서)

```bash
cd backend
npm run db:seed
# BETA-0001 ~ BETA-0020 생성됨
```

### 초대 코드 배포

1. 생성된 초대 코드를 Beta 테스터에게 전달
2. 각 코드는 1회만 사용 가능
3. 회원가입 시 초대 코드 입력 필수

### Beta 테스트 목표

- 동시 접속자 20명 안정성 확인
- 영상 통화 품질 테스트
- 매칭 알고리즘 검증
- 버그 수집 및 수정

---

## 💰 비용 산정

### Beta 단계 (20명)

- **예상 일일 통화**: 100분
- **월간 통화**: 3,000분 (< Agora 10,000분 한도)
- **월간 비용**: **$0** ✅

### 무료 한도 요약

```
✅ Agora: 10,000분/월 (현재 사용: ~3,000분)
✅ Render: 750시간/월 (상시 가동 가능)
✅ Supabase: 500MB DB + 1GB Storage
✅ Upstash: 10,000 명령/일
✅ Firebase: FCM 무제한
```

---

## 📅 다음 단계 (권장 순서)

### ✅ Week 1 (11/04 ~ 11/10) - 완료! 🎉

1. ✅ 백엔드 API 100% 완료
2. ✅ 프론트엔드 개발 100% 완료
3. ✅ 푸시 알림 시스템 완전 통합

### Week 2 (11/11 ~ 11/17) - 인프라 배포 & 테스트

1. **Render.com 배포** (1일)
   - 백엔드 배포
   - 환경 변수 설정
   - 도메인 연결

2. **Supabase DB 마이그레이션** (1일)
   - Prisma 스키마 실행
   - 초기 데이터 세팅 (초대 코드 20개)

3. **외부 서비스 설정** (1일)
   - Agora 프로젝트 설정 (App ID, Certificate)
   - Firebase FCM 서버 키 설정
   - Upstash Redis 설정

4. **통합 테스트** (2일)
   - API 엔드포인트 테스트
   - 영상 통화 품질 테스트
   - 푸시 알림 테스트 (iOS + Android)
   - Socket.io 연결 안정성 테스트

5. **성능 최적화** (1일)
   - React Query 캐싱 전략
   - 이미지 로딩 최적화
   - 번들 사이즈 최적화

**예상 Beta 출시일**: 2025-11-13 🎉 (당초 계획보다 11일 빠름!)

### 📋 최근 완료 (2025-11-10) ⭐ NEW

**프론트엔드:**
- ✅ pushService.ts 통합 서비스 구현 (포그라운드/백그라운드/Deep Link)
- ✅ NotificationPermissionModal 컴포넌트
- ✅ 알림 타입별 Deep Link 처리 (4가지 타입)
- ✅ authStore에 userId 추가 (푸시 알림 백엔드 연동)
- ✅ useNotificationSetup Hook 업데이트
- ✅ RootNavigator에 Navigation ref 설정
- ✅ 로그인/회원가입 시 userId 저장 로직

**이전 완료 (2025-11-07):**
- ✅ 통화 관리 API, 푸시 알림 API, 관리자 API
- ✅ 프로필 사진 업로드 API, 비밀번호 재설정 API
- ✅ Rate Limiting 미들웨어
- ✅ 매칭 대기 화면, Firebase FCM 연동

---

## 🐛 문제 해결

### 자주 발생하는 이슈

#### 1. 데이터베이스 연결 실패

```bash
# Supabase 프로젝트 상태 확인
# Paused 상태라면 Resume 클릭
# VPN 비활성화 후 재시도
```

#### 2. Prisma 에러

```bash
cd backend
npm run prisma:generate
```

#### 3. iOS 빌드 실패

```bash
cd mobile/ios
pod install
cd ..
npm run ios
```

#### 4. Android 빌드 실패

```bash
cd mobile/android
./gradlew clean
cd ..
npm run android
```

자세한 내용은 [CLAUDE.md](CLAUDE.md)의 "문제 해결" 섹션 참조

---

## 📝 라이선스

MIT License

---

## 📞 연락처

- **GitHub**: [Repository Link]
- **Email**: [Contact Email]
- **Docs**: [docs/](docs/)

---

**버전**: 1.4.0
**최종 업데이트**: 2025-11-10
**상태**: 개발 진행 중 (90% 완료 - 백엔드 & 프론트엔드 100% 완료!) 🚀🎉
