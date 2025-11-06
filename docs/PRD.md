# PRD (Product Requirements Document)
## WebRTC 기반 영상 통화 데이팅 앱

---

## 📋 문서 정보

- **작성일**: 2025-11-04
- **프로젝트명**: WebRTC Video Dating App
- **버전**: 1.0.0 (MVP)
- **개발 기간**: 50일 (2025-11-04 ~ 2025-12-24)
- **타겟 플랫폼**: iOS, Android
- **프로젝트 타입**: 데이팅 앱 (1:1 영상 통화 중심)

---

## 🎯 1. 프로젝트 개요

### 1.1 비전 (Vision)

영상 통화를 통해 실시간으로 상대방과 소통하며, 진정한 감정과 매력을 확인할 수 있는 차세대 데이팅 플랫폼을 구축한다.

### 1.2 미션 (Mission)

- 텍스트 중심의 데이팅에서 벗어나 얼굴을 보며 소통하는 직관적인 만남 제공
- 안전하고 신뢰할 수 있는 영상 통화 환경 구축
- 사용자 간 실시간 연결을 통한 즉각적인 매칭 경험 제공

### 1.3 핵심 가치 제안 (Value Proposition)

1. **빠른 연결**: 텍스트 채팅 없이 즉시 영상 통화로 상대 확인
2. **진정성**: 프로필 사진이 아닌 실시간 영상으로 진짜 모습 확인
3. **효율성**: 5분 제한 통화로 시간 낭비 없는 빠른 판단
4. **안전성**: 사용자 인증 및 필터링을 통한 안전한 만남

### 1.4 타겟 사용자

**Primary Persona:**
- **연령대**: 20~35세
- **성별**: 전체
- **특징**:
  - 진지한 만남보다는 가벼운 소개팅을 선호
  - 영상 통화에 거부감이 없는 MZ세대
  - 빠른 판단력과 즉흥적인 성향
  - 텍스트 채팅의 피로감을 느끼는 사용자

**Secondary Persona:**
- 해외 친구/언어 교환을 원하는 사용자
- 새로운 사람들과의 만남을 즐기는 사용자

---

## 🚀 2. 제품 목표 및 성공 지표

### 2.1 출시 전략

**Beta 테스트 단계 (초기):**
- **사용자 제한**: 20명 한정 베타 테스터
- **목적**:
  - 서비스 안정성 검증
  - 초기 사용자 피드백 수집
  - 무료 인프라 범위 내에서 운영 테스트
  - 주요 버그 및 사용성 이슈 파악
- **기간**: 출시 후 2~4주
- **선발 기준**:
  - 지인 위주로 초대
  - 다양한 연령대 및 성별 분포
  - 적극적인 피드백 제공 의지

**정식 출시 단계:**
- 베타 테스트 완료 후 점진적 사용자 확대
- 1차: 50명 → 2차: 100명 → 3차: 제한 해제

### 2.2 제품 목표

**Beta 테스트 (20명 한정):**
- 사용자당 평균 5회 이상 영상 통화
- 통화 성공률 80% 이상
- 크래시 없는 안정적 운영
- 주요 버그 0건 (P0)

**출시 1개월 내:**
- 앱스토어 및 구글 플레이 스토어 정식 출시
- 누적 회원 100명 달성
- 일일 활성 사용자(DAU) 20명 이상

**출시 3개월 내:**
- 누적 회원 500명 달성
- 일평균 50건 이상의 영상 통화 발생
- 사용자 재방문율 30% 이상

**출시 6개월 내:**
- 누적 회원 1,000명 달성
- 일일 활성 사용자(DAU) 100명 이상
- 일평균 200건 이상의 영상 통화 발생

### 2.3 핵심 성공 지표 (KPI)

**Beta 테스트 단계 (20명):**

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 베타 사용자 수 | 20명 | 수동 초대 관리 |
| 사용자당 평균 통화 횟수 | 5회 이상 | 통화 기록 집계 |
| 통화 성공률 | 80% 이상 | 성공 통화 / 시도 통화 |
| 평균 통화 시간 | 3분 이상 | 전체 통화 시간 / 통화 건수 |
| 앱 크래시율 | 0% | Sentry 모니터링 |
| P0 버그 | 0건 | 이슈 트래커 |

**정식 출시 후:**

| 지표 | 1개월 목표 | 3개월 목표 | 측정 방법 |
|------|-----------|-----------|-----------|
| 회원 가입 수 | 100명 | 500명 | 회원가입 완료 이벤트 |
| DAU | 20명 | 100명 | 일별 로그인 사용자 수 |
| 통화 성공률 | 80% 이상 | 85% 이상 | 성공 통화 / 전체 시도 |
| 평균 통화 시간 | 3분 이상 | 3분 이상 | 전체 통화 시간 / 통화 건수 |
| 재방문율 | 30% 이상 | 40% 이상 | 7일 내 재접속 비율 |
| 앱 크래시율 | 1% 이하 | 0.5% 이하 | Sentry 모니터링 |

---

## 📱 3. 기능 명세서 (Feature Specifications)

### 3.1 필수 기능 (MVP - Must Have)

#### 3.1.1 사용자 인증 및 프로필 관리

**회원가입**
- 이메일 인증 방식의 회원가입
- **초기 제한**: 20명 한정 (Beta 테스트)
  - 초대 코드 시스템 또는 관리자 승인 방식
  - 20명 도달 시 회원가입 페이지에 "현재 베타 테스트 중입니다. 곧 공개 예정입니다." 메시지 표시
- 필수 입력 정보:
  - 이메일 주소
  - 비밀번호 (8자 이상, 영문+숫자 조합)
  - 닉네임 (2~10자)
  - 생년월일 (만 18세 이상)
  - 성별 (남성/여성/기타)
  - 국가 선택
  - 프로필 사진 (최소 1장, 최대 5장)
  - **초대 코드** (Beta 테스트 기간 동안 필수)

**로그인**
- 이메일 + 비밀번호 로그인
- 자동 로그인 (옵션)
- 비밀번호 찾기/재설정

**프로필 관리**
- 프로필 사진 추가/삭제 (최대 5장)
- 닉네임 변경
- 자기소개 작성 (선택, 최대 200자)
- 관심사 태그 선택 (선택, 최대 5개)

**설정**
- 매칭 필터 설정:
  - 원하는 성별 (고정, 변경 불가)
  - 나이 범위 (예: 20~30세)
  - 국가 선택 (복수 선택 가능)
- 알림 설정 (푸시 알림 on/off)
- 계정 관리 (로그아웃, 회원 탈퇴)

#### 3.1.2 매칭 시스템

**매칭 방식 (2가지)**

1. **선택 매칭 (Direct Match)**
   - 친구 목록에서 원하는 사용자 선택
   - 상대방에게 통화 요청 전송
   - 상대방이 수락 시 즉시 영상 통화 연결
   - 거절 시 다른 사용자 선택 가능

2. **랜덤 매칭 (Random Match)**
   - "랜덤 매칭" 버튼 클릭
   - 설정한 필터(성별, 나이, 국가)에 맞는 온라인 사용자 중 랜덤 매칭
   - 매칭되면 자동으로 영상 통화 시작
   - 매칭 실패 시 재시도 가능

**매칭 알고리즘**
- 사용자가 설정한 필터 조건 적용
- 성별 필터는 고정 (변경 불가)
- 나이 필터: ±5세 범위 내
- 국가 필터: 사용자가 선택한 국가 목록 내
- 현재 온라인 상태인 사용자만 매칭
- 최근 통화한 사용자는 30분간 재매칭 제외

#### 3.1.3 영상 통화 기능

**통화 시작**
- 선택 매칭: 상대방 수락 시 통화 시작
- 랜덤 매칭: 자동으로 통화 시작
- 통화 연결 시 5초 카운트다운 표시

**통화 기능**
- 실시간 1:1 영상 통화
- 최대 통화 시간: 5분 (자동 종료)
- 남은 시간 타이머 표시
- 고화질 영상 지원 (네트워크 상태에 따라 자동 조절)
- 음성 품질 최적화

**통화 중 컨트롤**
- 마이크 음소거/해제
- 비디오 끄기/켜기
- 카메라 전환 (전면 ↔ 후면)
- 배경 블러 on/off
- 배경 변경 (3~5가지 프리셋 이미지)
- 통화 종료 버튼

**통화 종료**
- 수동 종료: 사용자가 종료 버튼 클릭
- 자동 종료: 5분 경과 시 자동 종료
- 상대방 종료 시 즉시 통화 종료
- 통화 종료 후 홈 화면으로 복귀

**통화 기록**
- 통화 내역 저장 (날짜, 시간, 상대방 닉네임)
- 통화 시간 기록
- 통화 기록에서 사용자 프로필 확인 가능

#### 3.1.4 친구 목록 관리

**친구 추가**
- 통화 후 상대방을 친구로 추가
- 친구 추가 시 상대방 동의 불필요 (일방적 저장)

**친구 목록**
- 추가한 친구 목록 표시
- 친구의 온라인/오프라인 상태 표시
- 친구 프로필 확인
- 친구에게 직접 통화 요청

**친구 관리**
- 친구 삭제
- 차단 기능 (해당 사용자와 매칭 불가)

#### 3.1.5 푸시 알림

**알림 종류**
- 통화 요청 알림 (선택 매칭 시)
- 랜덤 매칭 성공 알림
- 친구 추가 알림
- 시스템 공지사항

**알림 동작**
- 앱이 백그라운드/종료 상태일 때도 알림 수신
- 알림 클릭 시 해당 화면으로 이동
- 알림 설정에서 on/off 가능

### 3.2 추후 구현 기능 (Post-MVP - Nice to Have)

#### 3.2.1 부적절한 콘텐츠 모니터링 (Phase 2)

- AI 기반 실시간 영상 콘텐츠 분석
- 부적절한 행동 자동 감지
- 관리자 대시보드에서 신고 내역 관리
- 자동 경고 및 계정 정지 시스템

#### 3.2.2 기타 추가 기능 (Phase 3+)

- 텍스트 채팅 기능
- 그룹 영상 통화 (3~4인)
- 선물하기 기능
- 프리미엄 멤버십 (무제한 통화, 고급 필터 등)
- 음성 통화 모드
- 화면 공유 기능

---

## 🏗️ 4. 기술 아키텍처 개요

### 4.1 기술 스택

**프론트엔드 (React Native)**
```
- React Native CLI 최신 버전
- TypeScript
- Zustand (상태 관리)
- React Navigation v6 (라우팅)
- react-native-agora (영상 통화)
- @react-native-firebase/messaging (푸시 알림)
- react-native-image-picker (사진 선택)
```

**백엔드 (Node.js) - 무료 호스팅 기반**
```
- Node.js + Express
- TypeScript
- PostgreSQL (무료 Tier - Supabase/Neon)
- Redis (무료 Tier - Upstash)
- Prisma ORM
- JWT (인증)
- Socket.io (실시간 통신)
- agora-token (Agora 토큰 생성)
```

**인프라 (무료 서비스 활용)**
```
- Render.com (백엔드 호스팅 - 무료 플랜)
- Supabase (PostgreSQL 무료 500MB) 또는 Neon (무료 3GB)
- Upstash Redis (무료 10,000 명령/일)
- Firebase Cloud Messaging (무료 푸시 알림)
- Agora (무료 10,000분/월)
- Cloudflare R2 (무료 10GB 스토리지) 또는 Supabase Storage
```

**DevOps**
```
- GitHub (버전 관리)
- GitHub Actions (CI/CD - 무료)
- Sentry (에러 트래킹 - 무료 플랜)
```

### 4.2 무료 백엔드 인프라 구성 전략

#### 4.2.1 호스팅: Render.com 무료 플랜

**장점:**
- 무료로 Node.js 앱 호스팅 가능
- 자동 SSL 인증서
- GitHub 연동 자동 배포
- 환경 변수 관리 지원

**제한사항:**
- 15분간 요청이 없으면 슬립 모드 (재시작 시 지연 발생)
- 월 750시간 무료 (1개 인스턴스 상시 가동 가능)
- CPU/메모리 제한 있음 (라이트 트래픽 처리 가능)

**대응 방안:**
- Cron 작업으로 주기적 health check 요청 (슬립 방지)
- 초기 사용자 수가 적을 때는 충분히 활용 가능
- 트래픽 증가 시 유료 플랜으로 업그레이드 ($7/월)

#### 4.2.2 데이터베이스: Supabase (무료 플랜)

**제공 내용:**
- PostgreSQL 500MB 저장 공간
- 무제한 API 요청
- 실시간 subscriptions
- 내장 인증 시스템 (선택적 사용)
- 파일 스토리지 1GB

**대안: Neon**
- PostgreSQL 3GB 무료
- Serverless 아키텍처
- 자동 스케일링

**선택 기준:**
- MVP 단계에서는 Supabase 추천 (올인원 솔루션)
- 데이터베이스만 필요하면 Neon (더 많은 용량)

#### 4.2.3 캐싱/실시간: Upstash Redis

**제공 내용:**
- 무료 10,000 명령/일
- REST API 지원
- 지연 시간 최소화

**사용 사례:**
- 사용자 온라인 상태 관리
- 매칭 대기열 관리
- 세션 저장
- API 응답 캐싱

#### 4.2.4 파일 스토리지: Supabase Storage / Cloudflare R2

**Supabase Storage (권장):**
- 1GB 무료
- PostgreSQL과 통합
- 이미지 자동 리사이징
- CDN 포함

**Cloudflare R2 (대안):**
- 10GB 무료
- S3 호환 API
- 더 많은 용량 필요 시 선택

#### 4.2.5 푸시 알림: Firebase Cloud Messaging

**제공 내용:**
- 완전 무료
- iOS, Android 지원
- 무제한 메시지 전송
- 높은 신뢰성

#### 4.2.6 영상 통화: Agora (무료 플랜)

**제공 내용:**
- 매월 10,000분 무료
- 초과 시: $0.99/1000분

**계산:**
- 사용자 1명당 평균 일일 통화: 15분 (3회 × 5분)
- 100명 활성 사용자: 1,500분/일 = 45,000분/월
- **비용: 월 $35 예상**

**대응 방안:**
- 초기에는 무료 플랜으로 시작
- 사용자 증가 시 유료 전환 필요 (피할 수 없는 비용)
- 대안: 자체 WebRTC 구현 (TURN/STUN 서버 필요, 복잡도 증가)

### 4.3 비용 최적화 전략

**무료 유지 가능한 범위:**
- 동시 접속자 50명 이하
- 일일 통화 시간 300분 이하 (10,000분/월)
- 데이터베이스 500MB 이하
- 파일 스토리지 1GB 이하

**Beta 테스트 (20명) 예상 사용량:**
- 사용자: 20명
- 예상 일일 통화 시간: 100분 (사용자당 5분)
- 월간 통화 시간: 3,000분
- **결과**: 완전 무료 범위 내 운영 가능 ✅

**비용 발생 시점:**
- Agora 무료 한도 초과 시 (월 10,000분 초과)
- 사용자가 1,000명 이상 증가 시 Render 유료 플랜 필요

**총 예상 비용 (월간):**
- **Beta 테스트 (20명)**: $0 (완전 무료) ✅
- **초기 확장 (50~100명)**: $0 (완전 무료)
- **성장기 (100~500명)**: $35~50 (Agora + Render)
- **확장기 (1,000명+)**: $100~200 (인프라 업그레이드 필요)

**20명 제한의 추가 이점:**
- 무료 인프라로 안정적 운영 가능
- 서비스 품질 검증 기회
- 점진적 확장으로 예상치 못한 비용 발생 방지
- 피드백 기반 개선 후 확장 가능

### 4.4 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                         클라이언트                            │
│  ┌───────────────┐              ┌───────────────┐           │
│  │  iOS App      │              │  Android App  │           │
│  │ (React Native)│              │ (React Native)│           │
│  └───────┬───────┘              └───────┬───────┘           │
│          │                              │                    │
└──────────┼──────────────────────────────┼────────────────────┘
           │                              │
           │         ┌────────────────────┘
           │         │
           ▼         ▼
    ┌──────────────────────┐
    │  Agora Video SDK     │ (무료 10,000분/월)
    │  (영상 통화)          │
    └──────────────────────┘
           │
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    백엔드 서버 (Render.com 무료)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Node.js + Express + TypeScript               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │  Auth API    │  │  Match API   │  │ Call API  │  │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │ Agora Token  │  │  Socket.io   │  │  User API │  │   │
│  │  │  Generator   │  │ (실시간 통신) │  │           │  │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└────┬────────────────────┬─────────────────────┬─────────────┘
     │                    │                     │
     ▼                    ▼                     ▼
┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Supabase   │  │  Upstash Redis   │  │  Firebase FCM    │
│ PostgreSQL  │  │  (캐싱/세션)      │  │  (푸시 알림)      │
│ (무료 500MB)│  │ (무료 10k/일)    │  │  (완전 무료)      │
└─────────────┘  └──────────────────┘  └──────────────────┘
     │
     ▼
┌─────────────┐
│  Supabase   │
│  Storage    │
│ (무료 1GB)  │
└─────────────┘
```

---

## 📐 5. 데이터 모델 설계

### 5.1 ERD (Entity Relationship Diagram)

```
┌──────────────────┐         ┌──────────────────┐
│      User        │         │   MatchSession   │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │────┐    │ id (PK)          │
│ email            │    │    │ userId1 (FK)     │
│ password_hash    │    └────│ userId2 (FK)     │
│ nickname         │         │ channelName      │
│ birth_date       │         │ status           │
│ gender           │         │ matchType        │
│ country          │         │ startTime        │
│ bio              │         │ endTime          │
│ profile_photos   │         │ duration         │
│ interests        │         └──────────────────┘
│ preferences      │                  │
│ online_status    │         ┌────────┴─────────┐
│ last_active      │         │                  │
│ created_at       │         ▼                  ▼
│ updated_at       │  ┌──────────────┐  ┌──────────────┐
└──────────────────┘  │  CallRecord  │  │  CallEvent   │
         │            ├──────────────┤  ├──────────────┤
         │            │ id (PK)      │  │ id (PK)      │
         │            │ sessionId(FK)│  │ sessionId(FK)│
         │            │ callerId(FK) │  │ eventType    │
         │            │ receiverId   │  │ timestamp    │
         │            │ status       │  │ metadata     │
         │            │ startTime    │  └──────────────┘
         │            │ endTime      │
         │            │ duration     │
         ├────────────│ quality      │
         │            └──────────────┘
         │
         ▼
┌──────────────────┐         ┌──────────────────┐
│   Friendship     │         │  DeviceToken     │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │         │ id (PK)          │
│ userId (FK)      │         │ userId (FK)      │
│ friendId (FK)    │         │ token            │
│ created_at       │         │ platform         │
└──────────────────┘         │ lastUpdated      │
         │                   └──────────────────┘
         │
         ▼
┌──────────────────┐
│   BlockList      │
├──────────────────┤
│ id (PK)          │
│ userId (FK)      │
│ blockedUserId(FK)│
│ created_at       │
└──────────────────┘
```

### 5.2 스키마 정의 (Prisma Schema)

```prisma
// prisma/schema.prisma

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String    @map("password_hash")
  nickname        String    @db.VarChar(50)
  birthDate       DateTime  @map("birth_date")
  gender          Gender
  country         String    @db.VarChar(2) // ISO 3166-1 alpha-2
  bio             String?   @db.VarChar(200)
  profilePhotos   String[]  @map("profile_photos")
  interests       String[]

  // 매칭 필터 설정
  preferredGender Gender    @map("preferred_gender")
  minAge          Int       @map("min_age")
  maxAge          Int       @map("max_age")
  preferredCountries String[] @map("preferred_countries")

  // 상태 관리
  onlineStatus    OnlineStatus @default(OFFLINE) @map("online_status")
  lastActive      DateTime  @default(now()) @map("last_active")

  // 알림 설정
  pushEnabled     Boolean   @default(true) @map("push_enabled")

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  callsAsCaller    CallRecord[]   @relation("CallerCalls")
  callsAsReceiver  CallRecord[]   @relation("ReceiverCalls")
  friendships      Friendship[]   @relation("UserFriendships")
  friends          Friendship[]   @relation("FriendOf")
  blockedUsers     BlockList[]    @relation("BlockedBy")
  blockedBy        BlockList[]    @relation("Blocking")
  deviceTokens     DeviceToken[]
  matchSessionsAsUser1 MatchSession[] @relation("User1Sessions")
  matchSessionsAsUser2 MatchSession[] @relation("User2Sessions")

  @@map("users")
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum OnlineStatus {
  ONLINE
  OFFLINE
  IN_CALL
}

model MatchSession {
  id              String    @id @default(uuid())
  userId1         String    @map("user_id_1")
  userId2         String    @map("user_id_2")
  channelName     String    @unique @map("channel_name")
  status          MatchStatus @default(PENDING)
  matchType       MatchType @map("match_type")
  startTime       DateTime? @map("start_time")
  endTime         DateTime? @map("end_time")
  duration        Int?      // seconds

  createdAt       DateTime  @default(now()) @map("created_at")

  // Relations
  user1           User      @relation("User1Sessions", fields: [userId1], references: [id])
  user2           User      @relation("User2Sessions", fields: [userId2], references: [id])
  callRecords     CallRecord[]
  callEvents      CallEvent[]

  @@map("match_sessions")
}

enum MatchStatus {
  PENDING
  ACTIVE
  COMPLETED
  REJECTED
  CANCELLED
}

enum MatchType {
  DIRECT    // 선택 매칭
  RANDOM    // 랜덤 매칭
}

model CallRecord {
  id              String    @id @default(uuid())
  sessionId       String    @map("session_id")
  callerId        String    @map("caller_id")
  receiverId      String    @map("receiver_id")
  status          CallStatus @default(INITIATED)
  startTime       DateTime? @map("start_time")
  endTime         DateTime? @map("end_time")
  duration        Int?      // seconds
  quality         Int?      // 1-5 scale

  createdAt       DateTime  @default(now()) @map("created_at")

  // Relations
  session         MatchSession @relation(fields: [sessionId], references: [id])
  caller          User      @relation("CallerCalls", fields: [callerId], references: [id])
  receiver        User      @relation("ReceiverCalls", fields: [receiverId], references: [id])

  @@map("call_records")
}

enum CallStatus {
  INITIATED
  RINGING
  ONGOING
  COMPLETED
  MISSED
  REJECTED
  FAILED
}

model CallEvent {
  id              String    @id @default(uuid())
  sessionId       String    @map("session_id")
  eventType       CallEventType @map("event_type")
  timestamp       DateTime  @default(now())
  metadata        Json?

  // Relations
  session         MatchSession @relation(fields: [sessionId], references: [id])

  @@map("call_events")
}

enum CallEventType {
  CALL_INITIATED
  CALL_RINGING
  CALL_ACCEPTED
  CALL_REJECTED
  CALL_STARTED
  CALL_ENDED
  CAMERA_SWITCHED
  BACKGROUND_BLUR_ENABLED
  BACKGROUND_CHANGED
  AUDIO_MUTED
  VIDEO_DISABLED
  POOR_NETWORK
  CONNECTION_LOST
}

model Friendship {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  friendId        String    @map("friend_id")
  createdAt       DateTime  @default(now()) @map("created_at")

  // Relations
  user            User      @relation("UserFriendships", fields: [userId], references: [id])
  friend          User      @relation("FriendOf", fields: [friendId], references: [id])

  @@unique([userId, friendId])
  @@map("friendships")
}

model BlockList {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  blockedUserId   String    @map("blocked_user_id")
  createdAt       DateTime  @default(now()) @map("created_at")

  // Relations
  user            User      @relation("BlockedBy", fields: [userId], references: [id])
  blockedUser     User      @relation("Blocking", fields: [blockedUserId], references: [id])

  @@unique([userId, blockedUserId])
  @@map("block_list")
}

model DeviceToken {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  token           String    @unique
  platform        Platform
  lastUpdated     DateTime  @default(now()) @map("last_updated")

  // Relations
  user            User      @relation(fields: [userId], references: [id])

  @@map("device_tokens")
}

enum Platform {
  IOS
  ANDROID
}

model InviteCode {
  id              String    @id @default(uuid())
  code            String    @unique @db.VarChar(20)
  maxUses         Int       @default(1) @map("max_uses")
  usedCount       Int       @default(0) @map("used_count")
  isActive        Boolean   @default(true) @map("is_active")
  createdBy       String?   @map("created_by")
  expiresAt       DateTime? @map("expires_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  // Relations
  usedBy          InviteCodeUsage[]

  @@map("invite_codes")
}

model InviteCodeUsage {
  id              String    @id @default(uuid())
  inviteCodeId    String    @map("invite_code_id")
  userId          String    @map("user_id")
  usedAt          DateTime  @default(now()) @map("used_at")

  // Relations
  inviteCode      InviteCode @relation(fields: [inviteCodeId], references: [id])

  @@unique([inviteCodeId, userId])
  @@map("invite_code_usage")
}
```

---

## 🎨 6. UI/UX 디자인 가이드라인

### 6.1 디자인 원칙

1. **단순성 (Simplicity)**: 직관적이고 이해하기 쉬운 UI
2. **속도감 (Speed)**: 빠른 로딩과 즉각적인 피드백
3. **안전감 (Safety)**: 신뢰를 줄 수 있는 디자인
4. **재미 (Fun)**: 사용이 즐거운 인터랙션

### 6.2 참고 앱 분석 (아자르)

**아자르에서 배울 점:**
- 대형 버튼으로 빠른 액션 유도
- 통화 중 최소한의 UI 요소
- 스와이프 제스처 활용
- 생동감 있는 애니메이션

**차별화 포인트 (아자르와 달라야 할 점):**
- 색상 스키마 변경 (아자르는 보라색 계열 → 우리는 다른 컬러)
- 레이아웃 구조 변경 (버튼 위치, 메뉴 구성)
- 아이콘 스타일 차별화
- 고유한 브랜딩 요소 추가

### 6.3 주요 화면 구성

#### 6.3.1 온보딩 플로우

1. **스플래시 화면**
   - 앱 로고 표시 (2초)
   - 로딩 애니메이션

2. **웰컴 화면**
   - 앱 소개 슬라이드 (3장)
   - "시작하기" 버튼

3. **회원가입 화면**
   - 이메일 입력
   - 비밀번호 입력
   - 이용약관 동의

4. **프로필 설정 화면 (Step 1/3)**
   - 닉네임 입력
   - 생년월일 선택
   - 성별 선택

5. **프로필 설정 화면 (Step 2/3)**
   - 국가 선택
   - 관심사 태그 선택 (선택)

6. **프로필 설정 화면 (Step 3/3)**
   - 프로필 사진 업로드 (최소 1장)
   - 자기소개 작성 (선택)

7. **권한 요청 화면**
   - 카메라 권한
   - 마이크 권한
   - 푸시 알림 권한

#### 6.3.2 메인 화면

**홈 화면 (탭 1)**
- 상단: 프로필 아이콘, 설정 아이콘
- 중앙: 대형 "랜덤 매칭" 버튼
- 하단: 탭 네비게이션 (홈, 친구, 프로필)

**친구 목록 화면 (탭 2)**
- 상단: 검색 바
- 리스트: 친구 카드 (사진, 닉네임, 온라인 상태)
- 각 카드 탭 시 프로필 상세 + 통화 버튼

**프로필 화면 (탭 3)**
- 상단: 내 프로필 사진
- 닉네임, 나이, 국가
- 자기소개
- 통화 기록
- 설정 버튼

#### 6.3.3 매칭 화면

**랜덤 매칭 대기 화면**
- 중앙: 로딩 애니메이션
- "매칭 중..." 텍스트
- 취소 버튼

**매칭 성공 화면**
- 상대방 프로필 미리보기
- "3초 후 통화 시작" 카운트다운
- 건너뛰기 버튼 (선택)

**통화 요청 화면 (선택 매칭)**
- 상대방 프로필 사진
- "○○님에게 통화 요청 중..."
- 취소 버튼

**통화 수신 화면**
- 전체 화면 모달
- 상대방 프로필 사진 (배경 블러)
- 닉네임, 나이, 국가
- 수락 버튼 (녹색)
- 거절 버튼 (빨간색)

#### 6.3.4 통화 화면

**통화 중 화면 레이아웃**
```
┌─────────────────────────────────┐
│                                 │ ← 상대방 영상 (전체 화면)
│                                 │
│         [내 화면 (PIP)]          │ ← 작은 창 (우측 상단)
│  ┌──────────────────┐           │
│  │                  │           │
│  └──────────────────┘           │
│                                 │
│  ⏱ 03:24 / 05:00                │ ← 타이머 (좌측 상단)
│                                 │
│                                 │
│  [🎤] [📹] [🔄] [🌫] [❌]        │ ← 컨트롤 버튼 (하단)
└─────────────────────────────────┘

버튼 설명:
🎤 - 마이크 음소거/해제
📹 - 비디오 끄기/켜기
🔄 - 카메라 전환
🌫 - 배경 블러/변경
❌ - 통화 종료
```

**통화 종료 화면**
- "통화가 종료되었습니다"
- 통화 시간 표시
- 친구 추가 버튼
- 홈으로 돌아가기 버튼

#### 6.3.5 설정 화면

**설정 메뉴**
- 계정 정보
- 매칭 필터 설정
  - 성별 (고정)
  - 나이 범위
  - 국가 선택
- 알림 설정
- 차단 목록
- 개인정보 처리방침
- 이용약관
- 로그아웃
- 회원 탈퇴

### 6.4 컬러 팔레트 (예시 - 최종 디자인 시 조정)

```
Primary Color:    #FF6B6B (코랄 레드)
Secondary Color:  #4ECDC4 (민트 그린)
Accent Color:     #FFE66D (옐로우)
Background:       #F7F7F7 (라이트 그레이)
Surface:          #FFFFFF (화이트)
Text Primary:     #2D3436 (다크 그레이)
Text Secondary:   #636E72 (미드 그레이)
Success:          #00B894 (그린)
Error:            #FF7675 (레드)
Warning:          #FDCB6E (오렌지)
```

### 6.5 타이포그래피

```
Font Family: SF Pro / Roboto (시스템 폰트)

Heading 1: 32px, Bold
Heading 2: 24px, Bold
Heading 3: 20px, SemiBold
Body 1: 16px, Regular
Body 2: 14px, Regular
Caption: 12px, Regular
Button: 16px, SemiBold
```

### 6.6 인터랙션 가이드

- **버튼 피드백**: 탭 시 0.2초 스케일 애니메이션
- **화면 전환**: 네이티브 스택 애니메이션 (슬라이드)
- **로딩 상태**: 스피너 또는 스켈레톤 UI
- **에러 메시지**: 토스트 메시지 (3초 자동 닫힘)
- **성공 피드백**: 체크 아이콘 + 햅틱 피드백

---

## 🔐 7. 보안 및 개인정보 보호

### 7.1 인증 및 권한

**인증 방식**
- JWT (JSON Web Token) 기반 인증
- Access Token (1시간 유효) + Refresh Token (7일 유효)
- 비밀번호 해싱: bcrypt (salt rounds: 10)

**권한 관리**
- 카메라 권한: 통화 시작 전 필수 확인
- 마이크 권한: 통화 시작 전 필수 확인
- 푸시 알림 권한: 선택적 (권장)
- 사진 라이브러리 권한: 프로필 사진 업로드 시 필수

### 7.2 데이터 보안

**전송 중 암호화**
- HTTPS/TLS 1.3 사용 (모든 API 통신)
- Agora 영상/음성: 자동 암호화 (AES-128/256)

**저장 데이터 보호**
- 비밀번호: bcrypt 해싱 (절대 평문 저장 금지)
- JWT Refresh Token: 암호화하여 DB 저장
- 민감 정보 (이메일, 생년월일): 데이터베이스 레벨 암호화

**토큰 관리**
- Agora Token: 1시간 유효 기간 설정
- 통화 종료 후 즉시 토큰 폐기
- 재사용 방지를 위한 고유 channel name 생성

### 7.3 개인정보 처리

**수집하는 정보**
- 필수: 이메일, 비밀번호, 닉네임, 생년월일, 성별, 국가, 프로필 사진
- 선택: 자기소개, 관심사 태그
- 자동 수집: 접속 로그, 통화 기록, 디바이스 토큰

**정보 사용 목적**
- 서비스 제공 및 매칭 알고리즘
- 사용자 경험 개선
- 통계 분석
- 푸시 알림 발송

**정보 보유 기간**
- 회원 탈퇴 시 즉시 삭제 (법적 보관 의무 제외)
- 통화 기록: 3개월 보관 후 자동 삭제
- 탈퇴 회원 이메일: 재가입 방지 목적으로 해시값만 1년 보관

**제3자 제공**
- Agora: 영상 통화 제공 목적
- Firebase: 푸시 알림 발송 목적
- 기타 제3자 제공 없음

### 7.4 사용자 안전

**신고 및 차단 (Phase 2 이후)**
- 통화 중 신고 버튼
- 신고 사유 선택 (부적절한 행동, 욕설, 스팸 등)
- 차단 시 해당 사용자와 매칭 불가

**모니터링 (Phase 2 이후)**
- AI 기반 부적절한 콘텐츠 자동 감지
- 관리자 대시보드에서 신고 내역 검토
- 경고 누적 시 계정 정지

### 7.5 준수 사항

- **GDPR** (유럽 사용자 대상 시)
- **개인정보보호법** (한국)
- **Apple App Store Guidelines**
- **Google Play Store Policies**

### 7.6 개인정보 처리방침 및 이용약관

- 앱 내 링크 제공 (별도 웹페이지)
- 회원가입 시 동의 필수
- 변경 시 사용자 공지

---

## 📆 8. 개발 일정 (50일)

### 8.1 개발 단계별 일정

#### **Week 1-2: 기획 및 환경 설정 (14일)**

**Day 1-3: PRD 확정 및 디자인 준비**
- [x] PRD 문서 작성 및 검토
- [ ] 와이어프레임 초안 작성 (Figma)
- [ ] 기술 스택 최종 확정

**Day 4-7: 개발 환경 설정**
- [ ] React Native CLI 프로젝트 생성
- [ ] TypeScript 설정
- [ ] ESLint, Prettier 설정
- [ ] 폴더 구조 설계
- [ ] Git 저장소 생성 및 브랜치 전략 수립

**Day 8-11: 백엔드 기본 설정**
- [ ] Render.com 계정 생성 및 프로젝트 설정
- [ ] Supabase 계정 생성 및 PostgreSQL 설정
- [ ] Upstash Redis 연결
- [ ] Prisma 초기 설정 및 마이그레이션
- [ ] Express 서버 기본 구조 구축

**Day 12-14: Agora 및 Firebase 설정**
- [ ] Agora 계정 생성 및 App ID 발급
- [ ] Firebase 프로젝트 생성 및 FCM 설정
- [ ] iOS/Android 앱 등록
- [ ] 테스트 환경 구축

#### **Week 3-4: 백엔드 핵심 개발 (14일)**

**Day 15-18: 사용자 인증 API**
- [ ] 회원가입 API (`POST /api/auth/register`)
- [ ] 로그인 API (`POST /api/auth/login`)
- [ ] JWT 토큰 발급/검증 로직
- [ ] Refresh Token API (`POST /api/auth/refresh`)
- [ ] 비밀번호 재설정 API
- [ ] 이메일 인증 로직 (선택)

**Day 19-22: 사용자 관리 API**
- [ ] 프로필 조회 API (`GET /api/users/:id`)
- [ ] 프로필 수정 API (`PUT /api/users/:id`)
- [ ] 프로필 사진 업로드 API (`POST /api/users/:id/photos`)
- [ ] 사용자 온라인 상태 관리 (Redis)
- [ ] 친구 목록 API (`GET /api/users/:id/friends`)
- [ ] 친구 추가/삭제 API

**Day 23-25: Agora 토큰 생성 서비스**
- [ ] Agora RTC Token 생성 함수
- [ ] 토큰 발급 API (`POST /api/agora/token`)
- [ ] Channel Name 생성 로직
- [ ] 토큰 유효성 검증

**Day 26-28: 매칭 시스템 API**
- [ ] 랜덤 매칭 API (`POST /api/match/random`)
- [ ] 매칭 대기열 관리 (Redis)
- [ ] 선택 매칭 API (`POST /api/match/direct`)
- [ ] 매칭 취소 API
- [ ] 매칭 알고리즘 구현 (필터링)

#### **Week 5-6: 프론트엔드 핵심 개발 (14일)**

**Day 29-31: 인증 UI**
- [ ] 스플래시 화면
- [ ] 웰컴 화면
- [ ] 로그인 화면
- [ ] 회원가입 화면 (Step 1/2/3)
- [ ] 권한 요청 화면
- [ ]  상태 관리 (Auth)

**Day 32-35: 프로필 관리 UI**
- [ ] 프로필 화면 (내 프로필)
- [ ] 프로필 편집 화면
- [ ] 사진 업로드 기능 (react-native-image-picker)
- [ ] 설정 화면
- [ ] 매칭 필터 설정 화면

**Day 36-38: 매칭 UI**
- [ ] 홈 화면 (랜덤 매칭 버튼)
- [ ] 친구 목록 화면
- [ ] 매칭 대기 화면
- [ ] 통화 요청/수신 화면
- [ ] Socket.io 연결 및 실시간 이벤트 처리

**Day 39-42: 영상 통화 UI (Agora 통합)**
- [ ] Agora SDK 설치 및 설정 (iOS/Android)
- [ ] 영상 통화 화면 구현
- [ ] 카메라 전환 기능
- [ ] 음소거/비디오 끄기 기능
- [ ] 배경 블러 기능 (Agora Virtual Background)
- [ ] 통화 타이머 구현 (5분 제한)
- [ ] 통화 종료 처리

#### **Week 7: 통합, 테스트, 버그 수정 (7일)**

**Day 43-45: 통합 및 엔드투엔드 테스트**
- [ ] 전체 플로우 테스트 (회원가입 → 매칭 → 통화)
- [ ] 백엔드-프론트엔드 통합 테스트
- [ ] 푸시 알림 테스트 (iOS/Android)
- [ ] 다양한 네트워크 환경 테스트
- [ ] 디바이스별 테스트 (최소 3종)

**Day 46-47: 버그 수정 및 최적화**
- [ ] 발견된 버그 수정
- [ ] 성능 최적화 (로딩 시간, 메모리 사용)
- [ ] UI/UX 개선
- [ ] 에러 핸들링 보강

**Day 48-49: 스토어 출시 준비**
- [ ] App Icon 제작
- [ ] 스크린샷 촬영 (각 플랫폼별 5장)
- [ ] 앱 설명 작성 (한국어/영어)
- [ ] 개인정보 처리방침 웹페이지 작성
- [ ] 이용약관 웹페이지 작성
- [ ] 프로모션 비디오 촬영 (선택)

**Day 50: 스토어 제출**
- [ ] iOS App Store Connect 업로드
- [ ] Google Play Console 업로드
- [ ] 메타데이터 입력
- [ ] 심사 요청

### 8.2 개발 우선순위

**P0 (최우선 - 없으면 출시 불가)**
- 회원가입/로그인
- 1:1 영상 통화
- 랜덤 매칭
- 카메라 전환
- 통화 시간 제한 (5분)

**P1 (중요 - MVP에 포함)**
- 선택 매칭
- 친구 목록
- 프로필 관리
- 배경 블러/변경
- 푸시 알림

**P2 (추가 개선 - Post-MVP)**
- 통화 품질 표시
- 통화 기록 상세
- 필터 고도화
- 부적절한 콘텐츠 모니터링

### 8.3 위험 요소 및 버퍼

**예상 위험 요소:**
1. Agora SDK 통합 복잡도 → **3일 버퍼**
2. iOS/Android 플랫폼별 이슈 → **2일 버퍼**
3. 앱스토어 리젝션 가능성 → **출시 후 대응**

**권장사항:**
- Week 6 완료 시점에 핵심 기능 동작 확인
- Week 7은 여유를 두고 테스트 및 수정에 집중
- 앱스토어 제출 후 1~2주 추가 개발 기간 확보 권장

---

## 🚧 9. 위험 요소 및 대응 방안

### 9.1 기술적 위험

#### 9.1.1 Agora SDK 통합 복잡도

**위험:**
- React Native에서 Agora 네이티브 모듈 연동 시 에러 발생 가능
- iOS/Android 각각 다른 설정 필요
- 배경 블러 기능이 일부 디바이스에서 지원 안 될 수 있음

**대응:**
- 공식 문서 철저히 참고
- 커뮤니티 이슈 사전 조사
- 최소 3종 디바이스에서 사전 테스트
- 배경 블러 지원 여부를 사전 체크하는 로직 추가

#### 9.1.2 네트워크 품질 이슈

**위험:**
- 저속 네트워크에서 통화 품질 저하
- 연결 실패율 증가

**대응:**
- Agora의 자동 품질 조절 기능 활용
- 네트워크 품질 인디케이터 표시
- 연결 실패 시 재시도 로직 구현
- 최소 대역폭 요구사항 사용자에게 안내

#### 9.1.3 무료 인프라 제약

**위험:**
- Render.com 슬립 모드로 인한 첫 요청 지연 (30초)
- 데이터베이스 용량 초과 (500MB)
- Agora 무료 한도 초과 (10,000분/월)

**대응:**
- Health check 크론 작업 (5분마다)
- 데이터베이스 정기 정리 (오래된 통화 기록 삭제)
- 사용량 모니터링 대시보드 구축
- 유료 전환 시점 사전 계획

### 9.2 비즈니스 위험

#### 9.2.1 앱스토어 리젝션

**위험:**
- 데이팅 앱은 심사가 엄격함
- 콘텐츠 모니터링 부족 시 거절 가능
- 개인정보 처리방침 미비 시 거절

**대응:**
- Phase 2에서 신고/차단 기능 우선 개발
- 명확한 개인정보 처리방침 및 이용약관 작성
- 심사 시 테스트 계정 제공
- 첫 리젝션 대비 2주 버퍼 확보
- 심사 가이드라인 사전 철저히 검토

#### 9.2.2 사용자 안전 이슈

**위험:**
- 부적절한 행동 사용자 출현
- 사용자 신고 증가
- 평판 하락

**대응:**
- 이메일 인증 필수
- 신고/차단 기능 추가 (Phase 2)
- 커뮤니티 가이드라인 명시
- 운영 정책 수립

#### 9.2.3 비용 증가

**위험:**
- 사용자 급증 시 Agora 비용 급등
- 인프라 유료 전환 필요

**대응:**
- 사용량 모니터링 및 알림 설정
- 사용자 성장 예측 및 비용 계획
- 통화 시간 제한으로 비용 통제
- 수익 모델 조기 도입 검토 (프리미엄 멤버십)

### 9.3 일정 위험

**위험:**
- 예상보다 개발 기간 증가
- 버그 수정에 시간 소요
- 디자인 변경 요청

**대응:**
- 기능 우선순위 명확히 (P0 → P1 → P2)
- Daily Standup으로 진행 상황 체크
- P2 기능은 과감히 Post-MVP로 이연
- 50일은 타이트하므로 60~70일 실제 목표 권장

---

## 📊 10. 성공 지표 및 측정 방법

### 10.1 핵심 지표 (KPI)

| 지표 | 목표 | 측정 도구 | 수집 주기 |
|------|------|-----------|-----------|
| 회원 가입 수 | 출시 1개월 1,000명 | Backend DB | 일별 |
| DAU | 100명 | Analytics | 일별 |
| MAU | 500명 | Analytics | 월별 |
| 통화 성공률 | 80% 이상 | Backend Logs | 실시간 |
| 평균 통화 시간 | 3분 이상 | Backend Logs | 일별 |
| 재방문율 (7일) | 30% 이상 | Analytics | 주별 |
| 앱 크래시율 | 1% 이하 | Sentry | 실시간 |
| 통화 품질 점수 | 4.0/5.0 이상 | Agora Analytics | 일별 |

### 10.2 사용자 행동 지표

- **온보딩 완료율**: 회원가입 완료 / 앱 설치
- **첫 통화까지 소요 시간**: 회원가입 → 첫 통화 시작
- **일평균 통화 횟수**: 총 통화 / DAU
- **친구 추가율**: 친구 추가 / 통화 완료
- **매칭 성공률**: 성공한 매칭 / 시도한 매칭

### 10.3 기술 지표

- **API 응답 시간**: P95 < 500ms
- **앱 로딩 시간**: < 3초
- **통화 연결 시간**: < 5초
- **서버 가동률**: 99.5% 이상

### 10.4 측정 도구

**Analytics:**
- Google Analytics for Firebase (무료)
- 커스텀 이벤트 트래킹

**에러 트래킹:**
- Sentry (무료 플랜)

**통화 품질:**
- Agora Analytics Dashboard

**백엔드 모니터링:**
- Render.com 대시보드
- 커스텀 로깅 (Winston)

---

## 📝 11. 출시 후 로드맵

### Phase 1: MVP 출시 (Day 1-50)
- ✅ 1:1 영상 통화
- ✅ 랜덤/선택 매칭
- ✅ 기본 프로필 관리
- ✅ 배경 블러/변경
- ✅ 카메라 전환

### Phase 2: 안전 기능 강화 (출시 후 1~2개월)
- 신고/차단 기능
- 부적절한 콘텐츠 AI 감지
- 사용자 검증 배지
- 관리자 대시보드

### Phase 3: 기능 확장 (출시 후 3~4개월)
- 텍스트 채팅
- 음성 통화 모드
- 그룹 영상 통화 (3~4인)
- 선물하기 기능

### Phase 4: 수익화 (출시 후 5~6개월)
- 프리미엄 멤버십
- 무제한 통화 시간
- 고급 필터 (학력, 직업 등)
- 광고 제거

---

## 📄 12. 부록

### 12.1 참고 자료

**Agora 공식 문서:**
- https://docs.agora.io/en/Video/start_call_react_native
- https://api-ref.agora.io/en/video-sdk/react-native/3.x/index.html

**React Native 공식 문서:**
- https://reactnative.dev/docs/getting-started

**무료 인프라 가이드:**
- Render: https://render.com/docs
- Supabase: https://supabase.com/docs
- Upstash: https://docs.upstash.com

**앱스토어 가이드라인:**
- Apple: https://developer.apple.com/app-store/review/guidelines/
- Google: https://play.google.com/console/about/guides/

### 12.2 용어 정리

- **DAU**: Daily Active Users (일일 활성 사용자)
- **MAU**: Monthly Active Users (월간 활성 사용자)
- **MVP**: Minimum Viable Product (최소 기능 제품)
- **WebRTC**: Web Real-Time Communication (웹 실시간 통신)
- **JWT**: JSON Web Token (JSON 웹 토큰)
- **FCM**: Firebase Cloud Messaging (파이어베이스 클라우드 메시징)
- **SDK**: Software Development Kit (소프트웨어 개발 키트)
- **API**: Application Programming Interface (애플리케이션 프로그래밍 인터페이스)

### 12.3 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0.0 | 2025-11-04 | 초안 작성 | Claude |

---

## ✅ 승인

이 PRD는 프로젝트 이해관계자의 검토 및 승인을 거쳐야 합니다.

- [ ] 프로젝트 매니저 승인
- [ ] 개발 팀 리드 승인
- [ ] 디자이너 승인
- [ ] CTO 승인

---

**문서 끝**
