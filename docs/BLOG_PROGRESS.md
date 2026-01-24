# Beyond Meet 블로그 포스팅 시리즈 - 작성 진행 상황

> 이 문서는 블로그 포스팅 시리즈의 작성 진행 상황을 추적한다. 새로운 대화 컨텍스트에서도 이전 내용을 참조하여 자연스럽게 이어갈 수 있도록 간략하게 기록한다.

---

## 📊 전체 진행 상황

- **전체**: 15개 파트
- **완료**: 4개 파트
- **진행률**: 26.7%

---

## ✅ Part 1: 프로젝트 기획과 기술 스택 선정 (완료)

**파일 경로**: `/Users/kang/Desktop/beyond-meet/docs/blog/part-01-project-planning.md`

**작성 완료일**: 2026-01-07

**주요 내용**:
- 프로젝트 배경 및 아이디어 (왜 영상 데이팅 앱인가?)
- MVP 요구사항 정의 (베타 20명 한정)
- 기술 스택 선정 과정
  - Frontend: React Native
  - Backend: Node.js + Express + TypeScript
  - Database: PostgreSQL (Supabase)
  - Video: Agora SDK
  - Cache: Upstash Redis
  - Push: Firebase FCM
  - AI: Hugging Face API
  - Hosting: Render.com
  - Email: Resend
- $0/월 무료 인프라 예상 비용 계산
- 시스템 아키텍처 다이어그램
- 2개월 개발 일정 계획

**분량**: 약 4,500자

**핵심 키워드**: 무료 인프라, MVP, WebRTC, React Native, $0 운영

---

## ✅ Part 2: 개발 환경 구축 - Backend (완료)

**파일 경로**: `/Users/kang/Desktop/beyond-meet/docs/blog/part-02-backend-setup.md`

**작성 완료일**: 2026-01-07

**주요 내용**:
- Node.js 프로젝트 초기화 (npm init)
- TypeScript 설정 (tsconfig.json 상세 설명)
- Express 서버 기본 구조 (app.ts, server.ts 분리)
- 폴더 구조 설계 (Controller-Service 패턴 도입)
- 개발 도구 설정
  - ts-node-dev (Hot Reload)
  - Morgan (HTTP 로깅)
  - Helmet (보안 헤더)
- 환경변수 관리 (.env, .env.example)
- CORS 설정 (React Native 앱 연동 준비)
- Health Check 엔드포인트 (/health)
- Graceful Shutdown (SIGTERM, SIGINT)
- 에러 핸들링 (통일된 응답 형식)

**분량**: 약 4,800자

**핵심 키워드**: Node.js, TypeScript, Express, ts-node-dev, Controller-Service 패턴, 보안

**강조 포인트**:
- TypeScript를 사용하는 이유 (타입 안정성)
- Controller-Service 패턴 설명 (관심사 분리)
- Graceful Shutdown 구현 (안전한 서버 종료)
- 자주 발생하는 에러 해결법

---

## ✅ Part 3: 개발 환경 구축 - Mobile (완료)

**파일 경로**: `/Users/kang/Desktop/beyond-meet/docs/blog/part-03-mobile-setup.md`

**작성 완료일**: 2026-01-08

**주요 내용**:
- React Native CLI로 프로젝트 생성
- TypeScript 설정 (@react-native/typescript-config)
- 폴더 구조 설계 (screens, components, navigation, services, hooks, store 등)
- 필수 라이브러리 설치
  - React Navigation (네비게이션)
  - Zustand (클라이언트 상태)
  - TanStack React Query (서버 상태)
  - Axios, Socket.io Client
- iOS 개발 환경
  - Xcode 설치
  - CocoaPods 의존성 관리
  - 시뮬레이터 실행
- Android 개발 환경
  - Android Studio 설치
  - SDK 설정
  - 에뮬레이터 실행
- 환경변수 관리
  - react-native-dotenv 설정
  - .env.development / .env.production 분리
  - iOS/Android 플랫폼별 API URL 처리
- 첫 화면 구현 (App.tsx)
- Hot Reload 테스트

**분량**: 약 5,200자

**핵심 키워드**: React Native, TypeScript, iOS, Android, 환경변수, CocoaPods, Gradle

**강조 포인트**:
- React Native를 선택한 이유 (크로스 플랫폼 개발)
- 환경변수 플랫폼별 분기 (localhost vs 10.0.2.2)
- 폴더 구조 설계 철학 (기능별 폴더링)
- 자주 발생하는 에러 해결법 (CocoaPods, Metro, SDK)

---

## ✅ Part 4: 데이터베이스 설계와 Prisma ORM 설정 (완료)

**파일 경로**: `/Users/kang/Desktop/beyond-meet/docs/blog/part-04-database-prisma.md`

**작성 완료일**: 2026-01-08

**주요 내용**:
- Supabase 프로젝트 생성 (무료 500MB)
- Prisma ORM 소개 및 설치
- 데이터베이스 스키마 설계 (10개 모델)
  - User, MatchSession, CallRecord, CallEvent
  - Friendship, BlockList, DeviceToken
  - Report, ContentModerationLog, EmailVerification
- 관계형 데이터 모델링
  - 1:N 관계 (User → CallRecord)
  - N:M 자기 참조 (User ↔ User 친구)
  - Nullable 관계 (GDPR 대응, onDelete: SetNull)
- 복합 인덱스 추가 (9개)
  - 매칭 쿼리 최적화 (98% 성능 향상)
  - 통화/친구 목록 조회 최적화
- Prisma Client 생성 및 타입 안전한 쿼리
- 데이터베이스 마이그레이션 (Supabase SQL Editor 사용)
- database.ts 설정 (Hot Reload 대응)
- 초기 데이터 시딩 스크립트
- Prisma Studio 활용법

**분량**: 약 5,800자

**핵심 키워드**: Prisma, PostgreSQL, Supabase, 복합 인덱스, 관계형 모델링, ORM

**강조 포인트**:
- Prisma를 선택한 이유 (타입 안전성)
- 복합 인덱스로 98% 성능 향상
- GDPR 대응 (nullable 관계)
- Supabase Pooler 마이그레이션 주의사항

---

## 🔄 Part 5: JWT 인증 시스템 구축 (대기 중)

**예정 내용**:
- JWT 토큰 기반 인증 흐름 (Access + Refresh Token)
- bcrypt로 비밀번호 해싱
- 회원가입 API 구현
  - 초대 코드 검증 (Race Condition 방지)
  - Zod로 입력 검증
  - Serializable 트랜잭션
- 로그인 API 구현
- 토큰 갱신 API
- 인증 미들웨어 (JWT 검증)
- 보안 개선 사항
  - JWT 시크릿 기본값 제거 (32자 이상 필수)
  - 비밀번호 강도 정책 (대문자+숫자+특수문자)
  - HTML 태그 새니타이징

**참고 파일**:
- `/Users/kang/Desktop/beyond-meet/backend/src/utils/jwt.ts`
- `/Users/kang/Desktop/beyond-meet/backend/src/utils/password.ts`
- `/Users/kang/Desktop/beyond-meet/backend/src/utils/validation.ts`
- `/Users/kang/Desktop/beyond-meet/backend/src/services/auth-service.ts`
- `/Users/kang/Desktop/beyond-meet/backend/src/controllers/auth-controller.ts`
- `/Users/kang/Desktop/beyond-meet/backend/src/middlewares/auth.ts`
- `/Users/kang/Desktop/beyond-meet/docs/SECURITY_FIXES.md`

---

## 📝 작성 가이드라인 (유지)

### 어조
- **딱딱한 말투**: ~했다, ~하다 (×: ~합니다, ~했습니다)
- 간결하고 명확한 문장
- 불필요한 꾸밈 표현 제거

### 백엔드/인프라 파트 작성 관점 (중요!)
**프론트엔드 개발자의 학습 과정을 기록하듯 작성한다.**

나는 프론트엔드 개발자이고, 서버와 인프라 부분에 대한 지식이 부족하다. 따라서 백엔드/인프라 관련 파트는 **전문가처럼 작성하지 않고**, **검색과 공식 문서 학습을 통해 깨달은 것처럼** 작성한다.

**적용 파트**:
- Part 1: 기술 스택 선정 (백엔드 기술 부분)
- Part 2: 백엔드 개발 환경 구축
- Part 4: 데이터베이스 설계
- Part 5: JWT 인증 시스템
- Part 6: Socket.io 실시간 통신
- Part 7: Agora WebRTC 연동
- Part 10: 배포 및 인프라 (Render.com, Supabase)
- Part 11: 보안 강화
- Part 14: 성능 최적화

**제외 파트** (프론트엔드 전문 영역):
- Part 3: Mobile 개발 환경 구축
- Part 8: UI/UX 구현
- Part 9: 상태 관리 (Zustand, React Query)

**작성 패턴 (Before/After)**:

❌ **전문가 어조 (사용 금지)**:
```
"Prisma ORM을 선택한 이유는 타입 안전성과 마이그레이션 자동화 때문이다."
"복합 인덱스를 추가하면 쿼리 성능이 98% 향상된다."
"JWT는 Stateless 인증 방식으로 확장성이 뛰어나다."
```

✅ **학습 과정 어조 (사용)**:
```
"처음에는 Sequelize를 쓰려다가, 공식 문서를 보니 Prisma가 TypeScript 지원이 더 좋다고 해서 바꿨다."
"쿼리가 너무 느려서 구글링했더니 '복합 인덱스'라는 걸 알게 됐다. PostgreSQL 문서를 읽어보니..."
"JWT가 뭔지 찾아보니 토큰 기반 인증 방식이라고 한다. 세션보다 서버 메모리를 안 쓴다고 해서 선택했다."
```

**작성 흐름**:
1. **문제 인식** - "이 부분을 구현하려는데 어떻게 해야 할지 몰랐다"
2. **검색/학습** - "구글링해보니...", "공식 문서를 읽어보니..."
3. **이해** - "아, 이런 개념이구나"
4. **선택** - "A와 B를 비교해보니, 우리 프로젝트엔 A가 맞는 것 같다"
5. **구현** - "이렇게 코드를 작성했다"
6. **검증** - "실행해보니 작동한다"

**구체적 예시**:

**주제: Prisma ORM 선택 이유**

❌ 전문가 어조:
> "Prisma는 타입 안전성, 마이그레이션 자동화, 직관적인 쿼리 API를 제공한다. Sequelize보다 TypeScript 지원이 우수하며, Prisma Studio로 데이터를 시각화할 수 있다."

✅ 학습 과정 어조:
> "처음에는 Node.js ORM 하면 Sequelize가 가장 유명하다고 해서 쓰려고 했다. 그런데 설치하고 TypeScript 설정을 보니 뭔가 복잡했다. 타입 정의를 수동으로 다 작성해야 했다.
>
> 그래서 다른 ORM이 없나 찾아봤더니 Prisma라는 게 있었다. 공식 문서를 읽어보니 스키마 파일 하나만 작성하면 TypeScript 타입을 자동으로 생성해준다고 한다. 이게 딱 내가 원하던 거였다.
>
> Prisma Studio라는 GUI 도구도 있어서 데이터를 직접 보면서 디버깅할 수 있다고 한다. 프론트엔드 개발자 입장에서는 SQL 쿼리 직접 짜는 것보다 훨씬 편할 것 같았다."

**주제: 복합 인덱스 추가**

❌ 전문가 어조:
> "매칭 쿼리의 WHERE 조건에 사용되는 컬럼들을 분석하여 복합 인덱스를 추가했다. (onlineStatus, gender, country) 조합으로 인덱스를 생성하면 쿼리 플래너가 인덱스 스캔을 수행하여 성능이 98% 향상된다."

✅ 학습 과정 어조:
> "매칭 시스템을 만들고 테스트해보니 20명만 있어도 쿼리가 느렸다. 실제 서비스에서 몇백 명이면 어떻게 될지 걱정됐다.
>
> '데이터베이스 쿼리 느림'이라고 구글링했더니 '인덱스'라는 개념이 나왔다. PostgreSQL 공식 문서를 읽어보니, 자주 검색하는 컬럼에 인덱스를 추가하면 빨라진다고 한다. 책의 '찾아보기' 같은 거라고 이해했다.
>
> 우리 매칭 쿼리를 보니 onlineStatus, gender, country를 WHERE 조건으로 쓰고 있었다. 이 세 개를 묶어서 '복합 인덱스'를 만들면 된다는 글을 찾았다.
>
> Prisma 문서에서 @@index 문법을 찾아서 추가했다. 적용 전후를 비교해보니 98% 빨라졌다. 20ms → 0.5ms로 줄어들었다."

### 글 구조
1. 도입부 (이번 파트 소개, 이전 파트 요약)
2. 이론/개념 설명 (핵심 개념, 선택 이유) - **백엔드 파트는 학습 과정으로**
3. 실전 구현 (단계별 가이드, 핵심 코드)
4. 테스트 및 검증
5. 마무리 (요약, 다음 파트 예고)

### 강조 포인트
- 💰 무료 인프라 활용
- 🔒 보안 강화
- 🚀 성능 최적화
- 🤖 AI 모더레이션

### 독자층 고려
- 주니어: 상세한 개념 설명
- 시니어: 아키텍처 설계 이유
- 창업가: 비용 절감 전략

---

## 📁 파일 구조

```
beyond-meet/
├── docs/
│   ├── blog/
│   │   ├── part-01-project-planning.md ✅
│   │   ├── part-02-backend-setup.md ✅
│   │   ├── part-03-mobile-setup.md ✅
│   │   ├── part-04-database-prisma.md (대기)
│   │   └── ...
│   ├── BLOG_PROGRESS.md (현재 파일)
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY_FIXES.md
│   └── AI_CONTENT_MODERATION.md
├── backend/
│   ├── src/
│   ├── prisma/
│   └── package.json
└── mobile/
    ├── src/
    └── package.json
```

---

## 🎯 다음 작업

**Part 4 작성 시 필요한 정보**:
1. `/Users/kang/Desktop/beyond-meet/backend/prisma/schema.prisma` 읽기
2. `/Users/kang/Desktop/beyond-meet/backend/src/config/database.ts` 읽기
3. `/Users/kang/Desktop/beyond-meet/backend/prisma/seed.ts` 읽기
4. Prisma 마이그레이션 파일 확인
5. Supabase 무료 플랜 설명
6. 데이터베이스 스키마 설계 철학 (관계형 데이터 모델링)
7. 복합 인덱스 설명 (성능 최적화)

---

## 📌 메모

- 각 파트는 3,000~5,000자 분량
- 코드 블록 5~10개 포함
- 실제 프로젝트 코드 참조하여 작성
- Before/After 비교 (리팩토링 시)
- 에러 해결 팁 포함
