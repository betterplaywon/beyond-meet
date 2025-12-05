# PRD (Product Requirements Document)

## 프로젝트 개요

**Beyond Meet** - WebRTC 기반 1:1 영상 데이팅 앱

- **플랫폼**: iOS, Android (React Native)
- **백엔드**: Node.js + Express + TypeScript
- **베타 전략**: 20명 한정, 초대 코드 시스템

### 핵심 가치
1. 텍스트 없이 즉시 영상 통화로 상대 확인
2. 5분 제한 통화로 빠른 판단
3. AI 기반 콘텐츠 모더레이션

---

## 베타 테스트 전략

**사용자 제한**: 20명 (초대 코드 필수)

**무료 인프라 범위 내 운영**:
- Agora: 10,000분/월 무료
- Supabase: PostgreSQL 500MB, Storage 1GB
- Upstash Redis: 10,000 명령/일
- Render.com: 750시간/월 무료
- Firebase FCM: 무제한 무료

**예상 사용량 (20명 기준)**:
- 일일 통화 시간: ~100분
- 월간 통화 시간: ~3,000분
- **결과**: 완전 무료 범위 내 운영 가능

---

## 데이터 모델 (Prisma Schema)

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String
  nickname        String    @db.VarChar(50)
  birthDate       DateTime
  gender          Gender    // MALE, FEMALE, OTHER
  country         String    @db.VarChar(2)
  bio             String?   @db.VarChar(200)
  profilePhotos   String[]
  interests       String[]
  role            UserRole  @default(USER) // USER, ADMIN

  // 매칭 필터
  preferredGender Gender
  minAge          Int
  maxAge          Int
  preferredCountries String[]

  // 상태
  onlineStatus    OnlineStatus @default(OFFLINE) // ONLINE, OFFLINE, IN_CALL
  lastActive      DateTime
  pushEnabled     Boolean   @default(true)
}

model MatchSession {
  id          String      @id @default(uuid())
  userId1     String
  userId2     String
  channelName String      @unique
  status      MatchStatus // PENDING, ACTIVE, COMPLETED, REJECTED, CANCELLED
  matchType   MatchType   // DIRECT, RANDOM
  startTime   DateTime?
  endTime     DateTime?
  duration    Int?
}

model CallRecord {
  id         String     @id @default(uuid())
  sessionId  String
  callerId   String
  receiverId String
  status     CallStatus // INITIATED, RINGING, ONGOING, COMPLETED, MISSED, REJECTED, FAILED
  startTime  DateTime?
  endTime    DateTime?
  duration   Int?
}

model Friendship {
  id       String @id @default(uuid())
  userId   String
  friendId String
  @@unique([userId, friendId])
}

model BlockList {
  id            String @id @default(uuid())
  userId        String
  blockedUserId String
  @@unique([userId, blockedUserId])
}

model InviteCode {
  id        String    @id @default(uuid())
  code      String    @unique
  maxUses   Int       @default(1)
  usedCount Int       @default(0)
  isActive  Boolean   @default(true)
  expiresAt DateTime?
}

model DeviceToken {
  id       String   @id @default(uuid())
  userId   String
  token    String   @unique
  platform Platform // IOS, ANDROID
}
```

---

## 출시 후 로드맵

### Phase 3: 기능 확장
- 텍스트 채팅
- 음성 통화 모드
- 그룹 영상 통화 (3~4인)

### Phase 4: 수익화
- 프리미엄 멤버십
- 무제한 통화 시간
- 고급 필터

---

## 성공 지표 (KPI)

| 지표 | 베타 목표 | 정식 출시 목표 |
|------|-----------|---------------|
| 사용자당 평균 통화 | 5회 이상 | - |
| 통화 성공률 | 80% 이상 | 85% 이상 |
| 평균 통화 시간 | 3분 이상 | 3분 이상 |
| 크래시율 | 0% | 1% 이하 |
