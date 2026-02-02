# 영상 데이팅 앱 만들기 #4 - Supabase + Prisma로 PostgreSQL 데이터베이스 구축

> **이전 글 요약**: Part 3에서는 React Native 모바일 앱 프로젝트를 초기화했다. iOS/Android 개발 환경을 구축하고, 환경변수 관리, 첫 화면 구현까지 완료했다.

이번 글에서는 백엔드로 돌아가서 **PostgreSQL 데이터베이스를 설계하고 Prisma ORM을 설정**한다. 데이터베이스 설계는 처음이라 막막했지만, 하나씩 찾아가면서 배웠다.

---

## 📌 이번 파트에서 다룰 내용

- Supabase 프로젝트 생성 (무료 500MB)
- Prisma ORM 소개 및 설치
- 데이터베이스 스키마 설계 (10개 모델)
- 관계형 데이터 모델링 (1:N, N:M)
- 복합 인덱스 추가 (성능 최적화)
- Prisma Client 생성
- 데이터베이스 마이그레이션
- 초기 데이터 시딩

---

## 💡 데이터베이스 기초: SQL vs NoSQL

### 데이터베이스에도 종류가 있다

"Node.js 데이터베이스 연결"로 검색하다가 데이터베이스에도 종류가 있다는 걸 알게 됐다.

**SQL (관계형 데이터베이스)**:

- 엑셀 표처럼 행(row)과 열(column)로 데이터를 저장한다
- 테이블 간 관계를 정의할 수 있다 (예: 사용자 ↔ 통화 기록)
- 데이터 구조가 고정되어 있다 (스키마)
- 예: PostgreSQL, MySQL, SQLite

**NoSQL (비관계형 데이터베이스)**:

- JSON 문서처럼 유연한 구조로 저장한다
- 스키마가 자유롭다 (필드 추가/삭제 쉬움)
- 대용량 데이터에 유리하다
- 예: MongoDB, DynamoDB, Firebase Firestore

**Beyond Meet에서 PostgreSQL(SQL)을 선택한 이유**:

```
✅ 사용자 ↔ 통화 기록 ↔ 매칭 세션 간 관계가 복잡하다
✅ 데이터 무결성이 중요하다 (결제, 신고 기록 등)
✅ Supabase가 PostgreSQL 기반이다 (무료 호스팅)
```

### ORM과 ODM: SQL을 직접 안 써도 된다?

데이터베이스 종류에 따라 편의 도구도 다르다:

| | SQL 데이터베이스 | NoSQL 데이터베이스 |
|---|---|---|
| **편의 도구** | ORM (Object-Relational Mapping) | ODM (Object-Document Mapping) |
| **역할** | SQL 쿼리 대신 코드 객체로 DB 조작 | 문서 쿼리 대신 코드 객체로 DB 조작 |
| **대표 라이브러리** | Prisma, Sequelize, TypeORM | Mongoose (MongoDB용) |

쉽게 말하면:

```sql
-- SQL 직접 작성 (어렵고, 실수하기 쉬움)
SELECT * FROM users WHERE email = 'test@example.com';
```

```typescript
// ORM 사용 (TypeScript 자동완성, 타입 체크)
const user = await prisma.user.findUnique({
  where: { email: "test@example.com" },
});
```

결과는 같지만 ORM을 쓰면 SQL 문법을 몰라도 되고, 타입 안전성까지 얻을 수 있다.

---

## 💡 왜 Prisma인가?

### ORM 중에서 뭘 써야 할까?

PostgreSQL(SQL)을 선택했으니 ORM을 쓰기로 했다. Node.js에서 쓸 수 있는 ORM을 찾아봤다.

### Sequelize vs Prisma 비교

처음에는 Node.js ORM 하면 Sequelize가 가장 유명하다고 해서 쓰려고 했다.

그런데 공식 문서를 보니 설정이 복잡했다. 모델 정의를 일일이 타입 선언해야 했다:

```typescript
// Sequelize - 타입을 수동으로 정의
class User extends Model<UserAttributes, UserCreationAttributes> {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  // ...
}
```

"TypeScript ORM 추천"으로 다시 검색했더니 Prisma가 계속 나왔다.

### Prisma를 선택한 이유

Prisma 공식 문서를 읽어보니 이런 장점이 있었다:

```
✅ 스키마 파일만 작성하면 TypeScript 타입 자동 생성
✅ 직관적인 쿼리 API (SQL 몰라도 됨)
✅ Prisma Studio로 데이터 시각화
✅ 마이그레이션 자동 생성
```

특히 타입 자동 생성이 마음에 들었다:

```prisma
// schema.prisma에 이렇게만 작성하면
model User {
  id    String @id @default(uuid())
  email String @unique
  name  String
}
```

```typescript
// TypeScript 타입이 자동으로 생성됨
const user = await prisma.user.findUnique({
  where: { email: "test@example.com" },
});
// user.name 자동완성 됨!
```

프론트엔드에서 TypeScript 쓰던 것처럼 편하게 개발할 수 있을 것 같았다.

---

## 🗄️ Step 1: Supabase 프로젝트 생성

### 1-1. 왜 Supabase인가?

Part 1에서 PostgreSQL을 선택하기로 했는데, 무료 호스팅이 필요했다.

"무료 PostgreSQL 호스팅"으로 검색하니 몇 가지 옵션이 나왔다:

- **Heroku**: 2022년에 무료 플랜 폐지
- **Railway**: 5달러 크레딧 (소진하면 과금)
- **Supabase**: 500MB 무료 (Storage 1GB 포함)

Supabase가 무료 플랜이 제일 괜찮았다:

```
✅ PostgreSQL 데이터베이스 500MB
✅ Storage 1GB (프로필 사진 저장용)
✅ Row Level Security (보안 기능)
✅ Realtime 기능
✅ 무제한 API 요청
```

**Beyond Meet 베타 (20명) 예상 사용량 계산**:

- 사용자 데이터: 20명 × 50KB = 1MB
- 통화 기록: 100건 × 5KB = 500KB
- 프로필 사진: 20명 × 500KB = 10MB (Storage에 저장)
- **총 DB 사용량**: ~50MB (500MB의 10%)

충분할 것 같았다.

### 1-2. 프로젝트 생성

1. [https://supabase.com/](https://supabase.com/) 접속
2. GitHub 로그인
3. "Start your project" 클릭
4. 프로젝트 설정:
   - Name: `beyond-meet`
   - Database Password: 강력한 비밀번호 생성 (저장 필수!)
   - Region: Northeast Asia (Seoul) - 한국 서버 선택

프로젝트 생성에 2분 정도 걸렸다.

### 1-3. 데이터베이스 연결 정보 확인

**Settings → Database → Connection string**로 가니 두 가지 URL이 있었다:

```
# Direct connection
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Pooler connection
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

뭐가 다른지 찾아봤더니:

- **Direct URL**: 마이그레이션 시 사용 (스키마 메타데이터 접근 필요)
- **Pooler URL**: 앱 실행 시 사용 (연결 풀링으로 성능 향상)

처음엔 하나만 쓰면 되는 줄 알았는데, 나중에 Prisma 공식 문서를 보니 둘 다 필요하다고 했다.

---

## 📦 Step 2: Prisma 설치 및 초기화

### 2-1. Prisma 패키지 설치

```bash
cd backend
npm install @prisma/client
npm install prisma --save-dev
```

`@prisma/client`와 `prisma`가 뭐가 다른지 찾아봤다:

- `@prisma/client`: 실제 쿼리 실행 (프로덕션에서 사용)
- `prisma`: CLI 도구 (마이그레이션, 스키마 생성용)

### 2-2. Prisma 초기화

```bash
npx prisma init
```

실행하니 폴더 구조가 생성됐다:

```
backend/
├── prisma/
│   └── schema.prisma    ✅ 스키마 정의 파일
└── .env                 ✅ 환경변수 파일 (DATABASE_URL 추가됨)
```

`schema.prisma` 파일을 열어보니 기본 템플릿이 있었다.

### 2-3. .env 파일 설정

Prisma 공식 문서를 보니 Supabase를 쓸 때는 URL을 2개 설정해야 한다고 했다.

**`.env`**:

```bash
# Direct URL (마이그레이션용)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Pooler URL (앱 실행용)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

Supabase 대시보드에서 복사한 URL을 그대로 붙여넣었다.

---

## 🏗️ Step 3: 데이터베이스 스키마 설계

### 3-1. 어떤 데이터가 필요할까?

백엔드 개발은 프론트엔드와 달리 데이터베이스 설계부터 시작해야 했다.

앱 기능을 기반으로 필요한 데이터를 정리해봤다:

1. **User** - 사용자 정보 (이메일, 비밀번호, 프로필)
2. **MatchSession** - 매칭 세션 (누구와 누가 매칭됐는지)
3. **CallRecord** - 통화 기록 (언제 통화했는지, 얼마나 했는지)
4. **Friendship** - 친구 관계 (친구 추가 기능)
5. **BlockList** - 차단 목록
6. **DeviceToken** - FCM 푸시 알림 토큰
7. **Report** - 신고
8. **ContentModerationLog** - AI 모더레이션 로그
9. **EmailVerification** - 이메일 인증
10. **CallEvent** - 통화 이벤트 (나중에 추가)

### 3-2. schema.prisma 기본 설정

먼저 Prisma 공식 문서에 나온 대로 기본 설정을 작성했다.

**`prisma/schema.prisma`**:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 3-3. User 모델 작성

가장 중요한 User 모델부터 작성했다.

처음에는 "어떤 필드가 필요하지?" 싶어서 다른 데이팅 앱들을 참고했다. 그리고 우리 앱 특성에 맞게 추가했다.

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String    @map("password_hash")
  nickname        String    @db.VarChar(50)
  birthDate       DateTime  @map("birth_date")
  gender          Gender
  country         String    @db.VarChar(2) // ISO 3166-1 alpha-2 (KR, US 등)
  bio             String?   @db.VarChar(200)
  profilePhotos   String[]  @map("profile_photos")
  interests       String[]
  role            UserRole  @default(USER)

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

  // 이메일 인증
  emailVerified   Boolean   @default(false) @map("email_verified")
  emailVerifiedAt DateTime? @map("email_verified_at")

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations (뒤에서 설명)
  callsAsCaller    CallRecord[]   @relation("CallerCalls")
  callsAsReceiver  CallRecord[]   @relation("ReceiverCalls")
  sessions1        MatchSession[] @relation("User1Sessions")
  sessions2        MatchSession[] @relation("User2Sessions")
  friendships      Friendship[]   @relation("UserFriendships")
  friends          Friendship[]   @relation("FriendOf")
  blockedBy        BlockList[]    @relation("BlockedBy")
  blocking         BlockList[]    @relation("Blocking")
  deviceTokens     DeviceToken[]
  reporterReports  Report[]       @relation("ReporterReports")
  reportedUserReports Report[]    @relation("ReportedUserReports")
  moderationLogs   ContentModerationLog[]
  emailVerifications EmailVerification[]
  callEvents       CallEvent[]

  // Performance: 복합 인덱스 (나중에 설명)
  @@index([onlineStatus, gender, country])
  @@index([lastActive(sort: Desc)])
  @@map("users")
}

enum Gender {
  MALE
  FEMALE
  OTHER
  ANYONE  // 매칭 필터용
}

enum OnlineStatus {
  ONLINE
  OFFLINE
  IN_CALL
}

enum UserRole {
  USER
  ADMIN
}
```

**작성하면서 찾아본 것들**:

1. **`@map()`이 뭔가?**
   - Prisma는 camelCase (JavaScript 스타일)
   - PostgreSQL은 snake_case (전통적 DB 스타일)
   - `@map("password_hash")`로 매핑

2. **`String[]`로 배열 저장**
   - PostgreSQL은 배열 타입을 지원한다
   - `profilePhotos String[]` → 최대 5장 저장
   - `interests String[]` → ["운동", "영화", "음악"]

3. **`@db.VarChar(50)`**
   - PostgreSQL VARCHAR 타입으로 길이 제한
   - 닉네임은 50자까지

4. **`DateTime?`의 `?`**
   - Nullable 타입 (값이 없을 수도 있음)
   - `emailVerifiedAt`는 인증 전에는 null

### 3-4. MatchSession 모델

매칭 세션은 "누구와 누가 매칭됐는지"를 기록한다.

```prisma
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
  moderationLogs  ContentModerationLog[]
  reports         Report[]

  @@index([status, createdAt(sort: Desc)])
  @@map("match_sessions")
}

enum MatchStatus {
  PENDING     // 대기 중
  ACTIVE      // 진행 중
  COMPLETED   // 완료
  REJECTED    // 거절
  CANCELLED   // 취소
}

enum MatchType {
  DIRECT    // 친구에게 직접 통화
  RANDOM    // 랜덤 매칭
}
```

**`fields: [userId1], references: [id]`가 뭔가?**

처음엔 이 문법이 헷갈렸다. Prisma 공식 문서를 읽어보니 **외래 키(Foreign Key)** 설정이었다.

```prisma
user1  User  @relation("User1Sessions", fields: [userId1], references: [id])
```

- `userId1` 필드는 User 테이블의 `id`를 참조한다
- `@relation("User1Sessions")`: User와 MatchSession 사이에 여러 관계가 있어서 이름 필요

### 3-5. CallRecord 모델

```prisma
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

  // Performance: 통화 기록 조회 최적화
  @@index([callerId, createdAt(sort: Desc)])
  @@index([receiverId, createdAt(sort: Desc)])
  @@map("call_records")
}

enum CallStatus {
  INITIATED   // 시작
  RINGING     // 벨 울림
  ONGOING     // 진행 중
  COMPLETED   // 완료
  MISSED      // 부재중
  REJECTED    // 거절
  FAILED      // 실패
}
```

### 3-6. Friendship 모델 (자기 참조 관계)

친구 관계는 처음에 어떻게 설계해야 할지 막막했다.

"User ↔ User 관계"를 어떻게 표현하지? 찾아보니 **자기 참조 관계**라고 한다.

```prisma
model Friendship {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  friendId        String    @map("friend_id")
  createdAt       DateTime  @default(now()) @map("created_at")

  // Relations
  user            User      @relation("UserFriendships", fields: [userId], references: [id])
  friend          User      @relation("FriendOf", fields: [friendId], references: [id])

  @@unique([userId, friendId])
  @@index([userId, createdAt(sort: Desc)])
  @@map("friendships")
}
```

**`@@unique([userId, friendId])`**:

- 같은 사람을 중복으로 친구 추가 못하게 막는다
- A가 B를 친구 추가했으면, 다시 추가 불가

### 3-7. 나머지 모델들 (간략)

**BlockList**:

```prisma
model BlockList {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  blockedUserId   String    @map("blocked_user_id")
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation("BlockedBy", fields: [userId], references: [id])
  blockedUser     User      @relation("Blocking", fields: [blockedUserId], references: [id])

  @@unique([userId, blockedUserId])
  @@map("block_list")
}
```

**DeviceToken** (FCM 푸시):

```prisma
model DeviceToken {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  token           String    @unique
  platform        Platform
  lastUpdated     DateTime  @default(now()) @map("last_updated")

  user            User      @relation(fields: [userId], references: [id])

  @@map("device_tokens")
}

enum Platform {
  IOS
  ANDROID
}
```

**Report** (신고):

```prisma
model Report {
  id              String       @id @default(uuid())
  reporterId      String?      @map("reporter_id")
  reportedUserId  String?      @map("reported_user_id")
  sessionId       String?      @map("session_id")
  reason          ReportReason
  description     String?      @db.VarChar(500)
  isAiGenerated   Boolean      @default(false) @map("is_ai_generated")
  aiConfidence    Float?       @map("ai_confidence")
  status          ReportStatus @default(PENDING)
  createdAt       DateTime     @default(now()) @map("created_at")

  // Nullable 관계 (나중에 설명)
  reporter        User?        @relation("ReporterReports", fields: [reporterId], references: [id], onDelete: SetNull)
  reportedUser    User?        @relation("ReportedUserReports", fields: [reportedUserId], references: [id], onDelete: SetNull)
  session         MatchSession? @relation(fields: [sessionId], references: [id])

  @@index([status, createdAt(sort: Desc)])
  @@map("reports")
}

enum ReportReason {
  INAPPROPRIATE_CONTENT
  HARASSMENT
  SPAM
  FAKE_PROFILE
  OTHER
}

enum ReportStatus {
  PENDING
  REVIEWED
  RESOLVED
  DISMISSED
}
```

**ContentModerationLog**:

```prisma
model ContentModerationLog {
  id              String           @id @default(uuid())
  sessionId       String           @map("session_id")
  userId          String           @map("user_id")
  detectedAt      DateTime         @default(now()) @map("detected_at")
  confidence      Float
  actionTaken     ModerationAction @map("action_taken")
  metadata        Json?

  session         MatchSession @relation(fields: [sessionId], references: [id])
  user            User         @relation(fields: [userId], references: [id])

  @@index([sessionId])
  @@index([userId])
  @@map("content_moderation_logs")
}

enum ModerationAction {
  NONE
  WARNING_ISSUED
  CALL_ENDED
}
```

**EmailVerification**:

```prisma
model EmailVerification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  code      String   @db.VarChar(6)
  expiresAt DateTime @map("expires_at")
  attempts  Int      @default(0)
  verified  Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("email_verifications")
}
```

**CallEvent**:

```prisma
model CallEvent {
  id        String   @id @default(uuid())
  sessionId String   @map("session_id")
  userId    String   @map("user_id")
  eventType CallEventType @map("event_type")
  timestamp DateTime @default(now())
  metadata  Json?

  session   MatchSession @relation(fields: [sessionId], references: [id])
  user      User         @relation(fields: [userId], references: [id])

  @@index([sessionId, timestamp(sort: Desc)])
  @@map("call_events")
}

enum CallEventType {
  JOINED
  LEFT
  QUALITY_DEGRADED
  QUALITY_IMPROVED
}
```

---

## 🔗 Step 4: 관계형 데이터 모델링 이해하기

스키마를 작성하면서 "관계"라는 개념이 계속 나왔다. 처음엔 왜 필요한지 몰랐는데, 직접 부딪히면서 이해하게 됐다.

### 4-1. 왜 "관계"가 필요한가?

처음에는 모든 데이터를 한 테이블에 넣으면 되지 않나? 싶었다.

예를 들어, 통화 기록을 이렇게 저장한다고 해보자:

```
| 통화ID | 발신자이름 | 발신자이메일      | 수신자이름 | 수신자이메일      | 통화시간 |
|--------|------------|-------------------|------------|-------------------|----------|
| 1      | 철수       | cs@test.com       | 영희       | yh@test.com       | 300초    |
| 2      | 철수       | cs@test.com       | 민수       | ms@test.com       | 120초    |
| 3      | 철수       | cs@test.com       | 영희       | yh@test.com       | 450초    |
```

**문제점**:

- 철수의 이메일이 3번 중복 저장됨 (저장 공간 낭비)
- 철수가 이메일을 바꾸면 3개 행을 모두 수정해야 함 (수정 누락 위험)
- 영희 정보도 2번 중복됨

**해결책 - 테이블 분리**:

```
[users 테이블]
| id  | 이름 | 이메일          |
|-----|------|-----------------|
| U1  | 철수 | cs@test.com     |
| U2  | 영희 | yh@test.com     |
| U3  | 민수 | ms@test.com     |

[call_records 테이블]
| id | caller_id | receiver_id | 통화시간 |
|----|-----------|-------------|----------|
| 1  | U1        | U2          | 300초    |
| 2  | U1        | U3          | 120초    |
| 3  | U1        | U2          | 450초    |
```

이렇게 하면:

- 사용자 정보는 한 번만 저장
- 이메일 변경 시 users 테이블만 수정
- `caller_id`로 users 테이블을 **참조** → 이게 바로 "관계"

### 4-2. 1:N (일대다) 관계

**개념**: 한쪽이 여러 개를 가질 수 있는 관계

가장 흔한 관계 유형이다. "User → CallRecord" 관계를 보다가 1:N이라는 용어를 처음 알았다.

```
┌──────────────┐              ┌──────────────────┐
│     User     │              │    CallRecord    │
├──────────────┤              ├──────────────────┤
│ id (PK)      │◀────────┐    │ id (PK)          │
│ email        │         ├────│ callerId (FK)    │
│ nickname     │         │    │ receiverId (FK)  │
│ ...          │         │    │ duration         │
│              │◀────────┘    │ ...              │
└──────────────┘              └──────────────────┘

        1                              N
   (한 명의 User)            (여러 개의 CallRecord)
```

- **PK (Primary Key)**: 각 행을 고유하게 식별하는 키
- **FK (Foreign Key)**: 다른 테이블의 PK를 참조하는 키

**Beyond Meet 예시**:

- User A가 10번 통화했으면 → CallRecord 10개가 User A를 참조
- 그런데 통화는 **caller(발신자)**와 **receiver(수신자)**가 있어서 관계가 2개다

```prisma
// User 모델에서 - 배열([])은 "여러 개를 가질 수 있다"는 의미
callsAsCaller    CallRecord[]   @relation("CallerCalls")    // 내가 건 통화들
callsAsReceiver  CallRecord[]   @relation("ReceiverCalls")  // 내가 받은 통화들

// CallRecord 모델에서 - 단일 User를 참조
caller    User   @relation("CallerCalls", fields: [callerId], references: [id])
receiver  User   @relation("ReceiverCalls", fields: [receiverId], references: [id])
```

**`@relation("CallerCalls")`는 왜 필요한가?**

같은 두 테이블 사이에 관계가 여러 개면 Prisma가 구분을 못 한다. 이름을 붙여서 "이 관계는 발신자용, 저 관계는 수신자용"이라고 알려주는 것이다.

### 4-3. 자기 참조 관계 (Self-Relation)

**개념**: 같은 테이블 내에서 서로를 참조하는 관계

친구 관계를 설계할 때 막막했다. User와 User 사이의 관계인데, 어떻게 표현하지?

```
"철수의 친구는 영희다"

철수(User) ──친구──▶ 영희(User)
   │                    │
   └── 같은 테이블 ──────┘
```

이걸 **자기 참조 관계**라고 한다. 해결책은 **중간 테이블**을 만드는 것이다.

```
┌──────────────┐           ┌──────────────────┐
│     User     │           │    Friendship    │
├──────────────┤           ├──────────────────┤
│ id (PK)      │◀──────────│ userId (FK)      │  "누가"
│ nickname     │           │ friendId (FK)    │  "누구를" 친구 추가했는지
│ ...          │◀──────────│ createdAt        │
└──────────────┘           └──────────────────┘
```

**데이터 예시**:

```
[Friendship 테이블]
| id | userId | friendId | createdAt  |
|----|--------|----------|------------|
| 1  | 철수   | 영희     | 2024-01-01 |  → 철수가 영희를 친구 추가
| 2  | 영희   | 철수     | 2024-01-02 |  → 영희가 철수를 친구 추가 (양방향)
| 3  | 철수   | 민수     | 2024-01-03 |  → 철수가 민수를 친구 추가
```

**Prisma 코드**:

```prisma
// User 모델에서 - 양방향 조회를 위해 2개의 관계 정의
friendships   Friendship[]   @relation("UserFriendships")  // 내가 추가한 친구들
friends       Friendship[]   @relation("FriendOf")         // 나를 추가한 사람들

// Friendship 모델에서
user    User   @relation("UserFriendships", fields: [userId], references: [id])
friend  User   @relation("FriendOf", fields: [friendId], references: [id])
```

처음엔 "왜 이렇게 복잡하게 해야 하지?" 싶었다. 그런데 이렇게 하면:

```typescript
// 철수가 추가한 친구 목록 조회
const 철수 = await prisma.user.findUnique({
  where: { nickname: "철수" },
  include: { friendships: true }, // 영희, 민수
});

// 철수를 친구로 추가한 사람들 조회
const 철수 = await prisma.user.findUnique({
  where: { nickname: "철수" },
  include: { friends: true }, // 영희
});
```

양방향으로 조회할 수 있었다.

### 4-4. Nullable 관계 (GDPR 대응)

Report 모델을 보면 `String?`로 nullable 필드가 많다:

```prisma
reporterId      String?      // nullable (값이 없을 수 있음)
reportedUserId  String?      // nullable

reporter        User?        @relation(..., onDelete: SetNull)
reportedUser    User?        @relation(..., onDelete: SetNull)
```

**왜 nullable로 했을까?**

찾아보니 **GDPR(개인정보보호법) 대응** 때문이었다.

```
[시나리오]
1. 철수가 영희를 신고함 → Report 레코드 생성 (reporterId: 철수)
2. 철수가 "내 계정 삭제해줘" 요청
3. 철수의 User 레코드 삭제 필요

[문제]
- Report는 증거로 남겨야 함
- 하지만 Report.reporterId가 철수를 참조하고 있음
- 철수를 삭제하면 참조 무결성 오류 발생!

[해결: onDelete: SetNull]
- 철수 삭제 시 reporterId만 null로 변경
- Report 기록은 유지 (신고 내용, 시간 등)
- 단, "누가 신고했는지"는 익명화됨
```

```
Before: { reporterId: "철수ID", reason: "부적절한 행동", ... }
After:  { reporterId: null, reason: "부적절한 행동", ... }
```

신고 기록은 유지되되, 사용자 정보는 익명화된다.

### 4-5. 관계 유형 정리

| 관계 유형 | 설명 | Beyond Meet 예시 |
|-----------|------|------------------|
| **1:1** | 하나가 하나만 가짐 | (이 프로젝트에선 미사용) |
| **1:N** | 하나가 여러 개를 가짐 | User → CallRecord, User → DeviceToken |
| **N:M** | 여러 개가 여러 개를 가짐 | User ↔ User (Friendship 중간 테이블) |
| **자기 참조** | 같은 테이블 내 참조 | Friendship, BlockList |

---

## 🚀 Step 5: 복합 인덱스 추가 (성능 최적화)

### 5-1. 인덱스가 뭔지 몰랐다

스키마 작성을 다 하고 테스트해보니 매칭 쿼리가 느렸다. 20명만 있어도 500ms가 걸렸다.

"데이터베이스 쿼리 느림"으로 검색했더니 **인덱스**라는 개념이 나왔다.

- 인덱스는 책의 "찾아보기" 같은 것
- 특정 컬럼을 빠르게 찾을 수 있게 해줌
- 하지만 쓰기 속도는 조금 느려짐

### 5-2. 복합 인덱스를 알게 된 계기

매칭 쿼리를 보니 3개 조건을 동시에 쓰고 있었다:

```sql
-- 온라인이고, 여성이고, 한국 사용자 찾기
SELECT * FROM users
WHERE online_status = 'ONLINE'
  AND gender = 'FEMALE'
  AND country = 'KR';
```

"PostgreSQL 여러 WHERE 조건 최적화"로 검색했더니 **복합 인덱스**가 나왔다.

- 단일 인덱스: 한 컬럼만 빠르게 검색
- 복합 인덱스: 여러 컬럼을 묶어서 검색

Prisma에서는 이렇게 추가한다:

```prisma
model User {
  // ...

  @@index([onlineStatus, gender, country])  // 복합 인덱스
  @@index([lastActive(sort: Desc)])         // 단일 인덱스 (정렬)
}
```

### 5-3. 적용 결과

복합 인덱스를 추가하고 다시 테스트했다:

**Before (인덱스 없음)**:

- 쿼리 시간: 500ms
- Full Table Scan (전체 데이터 스캔)

**After (복합 인덱스 적용)**:

- 쿼리 시간: 10ms
- Index Scan
- **98% 성능 향상!**

---

## 🔧 Step 6: Prisma Client 생성

### 6-1. Prisma Client 생성

스키마 작성이 끝나고 다음 명령어를 실행했다:

```bash
npx prisma generate
```

실행하니 `node_modules/.prisma/client/` 폴더에 파일들이 생성됐다.

이 명령어가 스키마를 읽고 TypeScript 타입을 자동 생성한다. 덕분에 이제 이렇게 쓸 수 있다:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email: "test@example.com" },
});
// user.nickname 자동완성 됨!
```

### 6-2. database.ts 설정 파일 작성

Prisma 공식 문서를 보니 Hot Reload 환경에서는 PrismaClient를 싱글톤으로 관리해야 한다고 했다.

**`src/config/database.ts`**:

```typescript
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
```

**왜 `global.prisma`를 사용하는가?**

Hot Reload 시 매번 새 PrismaClient를 만들면 데이터베이스 연결이 쌓인다. `global` 변수에 저장하면 기존 인스턴스를 재사용한다.

React Native에서 Context를 싱글톤으로 관리하는 것과 비슷한 개념이구나 싶었다.

---

## 🗃️ Step 7: 데이터베이스 마이그레이션

### 7-1. 마이그레이션이 뭔가?

Prisma 문서를 보니 "마이그레이션"이라는 단계가 있었다.

- **마이그레이션**: 스키마 변경 사항을 실제 데이터베이스에 적용하는 것
- `schema.prisma` → SQL로 변환 → PostgreSQL 실행

### 7-2. Supabase에서 migrate 문제

처음에 이 명령어를 실행했다:

```bash
npx prisma migrate dev --name init
```

그런데 에러가 났다:

```
Error: P3009
migrate found failed migrations in the target database
```

찾아보니 Supabase Pooler와 `prisma migrate dev` 간에 호환 문제가 있었다.

**해결책**: SQL만 생성하고 Supabase SQL Editor에서 직접 실행

```bash
# SQL 파일만 생성 (실행은 안 함)
npx prisma migrate dev --name init --create-only
```

이렇게 하니 `prisma/migrations/20260108000000_init/migration.sql` 파일이 생성됐다.

### 7-3. Supabase SQL Editor에서 실행

1. Supabase Dashboard → SQL Editor
2. `migration.sql` 파일 내용 복사
3. 붙여넣고 Run 클릭

**migration.sql 예시** (일부):

```sql
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'ANYONE');
CREATE TYPE "OnlineStatus" AS ENUM ('ONLINE', 'OFFLINE', 'IN_CALL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nickname" VARCHAR(50) NOT NULL,
    ...
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_online_status_gender_country_idx" ON "users"("online_status", "gender", "country");
```

실행하니 10개 테이블이 모두 생성됐다!

### 7-4. Prisma Client 재생성

마이그레이션 후에는 Prisma Client를 다시 생성해야 한다:

```bash
npx prisma generate
```

---

## 🌱 Step 8: 초기 데이터 시딩

### 8-1. seed.ts 작성

**`prisma/seed.ts`**:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...\n");

  // 현재 유저 수 확인
  const userCount = await prisma.user.count();

  console.log(`👥 Current users: ${userCount}`);
  console.log("\n✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("\n❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
```

### 8-2. package.json에 스크립트 추가

```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio",
    "db:seed": "ts-node prisma/seed.ts"
  }
}
```

### 8-3. 시딩 실행

```bash
npm run db:seed
```

**출력**:

```
🌱 Starting database seeding...

👥 Current users: 0

✅ Seeding completed!
```

---

## 🎯 현재까지 완성된 것

### 체크리스트

- [x] Supabase 프로젝트 생성 (무료 500MB)
- [x] Prisma ORM 설치
- [x] 데이터베이스 스키마 설계 (10개 모델)
- [x] 관계형 데이터 모델링 (1:N, N:M, 자기 참조)
- [x] 복합 인덱스 추가 (성능 98% 향상)
- [x] Prisma Client 생성
- [x] 데이터베이스 마이그레이션 (SQL 실행)
- [x] database.ts 설정 파일 작성
- [x] 시딩 스크립트 작성

### 데이터베이스 구조

```
10개 테이블:
├── users                     ✅ 사용자 정보
├── match_sessions            ✅ 매칭 세션
├── call_records              ✅ 통화 기록
├── call_events               ✅ 통화 이벤트
├── friendships               ✅ 친구 관계
├── block_list                ✅ 차단 목록
├── device_tokens             ✅ FCM 토큰
├── reports                   ✅ 신고
├── content_moderation_logs   ✅ AI 모더레이션
└── email_verifications       ✅ 이메일 인증

9개 복합 인덱스:
└── 매칭/통화/친구 조회 성능 최적화 (98% 향상)
```

---

## 🎨 Prisma Studio로 데이터 확인

### Prisma Studio 실행

마지막으로 Prisma Studio라는 도구를 발견했다.

```bash
npm run prisma:studio
```

브라우저가 자동으로 열리면서 `http://localhost:5555`에 접속됐다.

모든 테이블을 GUI로 볼 수 있었다! 데이터 추가/수정/삭제도 클릭 몇 번으로 가능했다.

프론트엔드 개발자 입장에서는 SQL 쿼리 없이 데이터를 확인할 수 있어서 정말 편했다.

---

## 🚨 자주 발생하는 에러와 해결법

### 에러 1: `prisma migrate dev` 실패

첫 마이그레이션 시도에서 이 에러가 났다.

**증상**:

```
Error: P3009
migrate found failed migrations in the target database
```

**원인**: Supabase Pooler가 스키마 메타데이터에 접근 불가

**해결**:

```bash
# SQL만 생성
npx prisma migrate dev --name init --create-only

# Supabase SQL Editor에서 직접 실행
```

### 에러 2: 타입 오류 (`Property does not exist`)

스키마를 수정했는데 타입 에러가 계속 났다.

**증상**:

```typescript
Property 'user' does not exist on type 'PrismaClient'
```

**원인**: Prisma Client 재생성 필요

**해결**:

```bash
npx prisma generate
```

스키마를 수정할 때마다 `npx prisma generate`를 실행해야 한다는 걸 배웠다.

### 에러 3: 연결 실패

처음 연결 시도에서 이 에러가 났다.

**증상**:

```
Error: P1001
Can't reach database server
```

**해결**:

- `.env` 파일의 `DATABASE_URL` 확인
- Supabase 대시보드에서 프로젝트가 일시 중지되었는지 확인
- 비밀번호에 특수문자가 있으면 URL 인코딩 필요

---

## 💡 Prisma 활용 팁

### Tip 1: VS Code Extension

Prisma Extension을 설치하니 편했다:

- 구문 하이라이팅
- 자동완성
- 포맷팅

### Tip 2: Prisma Format

스키마 파일이 지저분해지면:

```bash
npx prisma format
```

자동으로 정렬해준다.

### Tip 3: Prisma Validate

스키마 문법이 맞는지 확인:

```bash
npx prisma validate
```

마이그레이션 전에 실행하면 에러를 미리 잡을 수 있다.

---

## 📚 다음 글 예고

**Part 5: JWT 인증 시스템 구축 (보안 강화)**

다음 글에서는 회원가입/로그인 API를 구현한다.

다룰 내용:

- JWT 토큰 기반 인증 (Access + Refresh Token)
- bcrypt로 비밀번호 해싱
- Zod로 입력 검증 (이메일, 비밀번호 강도)
- 초대 코드 검증 (Race Condition 방지)
- 보안 강화 (JWT 시크릿 검증, Serializable 트랜잭션)
- 인증 미들웨어 구현

---

## 📖 참고 자료

### 공식 문서

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)

### 추천 읽을거리

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Database Indexing Best Practices](https://use-the-index-luke.com/)

---

## 💬 마치며

이 글에서는 Supabase + Prisma로 PostgreSQL 데이터베이스를 구축했다.

**핵심 요약**:

- ✅ Supabase 무료 플랜으로 $0 운영
- ✅ Prisma ORM으로 타입 안전한 쿼리
- ✅ 10개 모델, 9개 복합 인덱스 설계
- ✅ 관계형 데이터 모델링 (1:N, N:M, 자기 참조)
- ✅ GDPR 대응 (nullable 관계, onDelete: SetNull)

프론트엔드 개발자 입장에서 데이터베이스 설계는 완전히 새로운 영역이었다. SQL도 모르고, ORM도 처음이었다.

하지만 Prisma 덕분에 TypeScript 쓰듯이 데이터베이스를 다룰 수 있었다. 특히 스키마 파일만 작성하면 타입이 자동 생성되는 게 정말 편했다.

복합 인덱스 개념은 처음에 어려웠지만, "책의 찾아보기" 비유로 이해하니 쉬워졌다. 실제로 98% 성능 향상을 체감하니 뿌듯했다.

다음 글에서는 JWT 인증 시스템을 구현한다. 이것도 백엔드 영역이라 낯설겠지만, 하나씩 찾아가면서 배워볼 생각이다.

**궁금한 점이나 피드백은 댓글로 남겨달라.** 🙌

---

**태그**: `Prisma` `PostgreSQL` `Supabase` `ORM` `데이터베이스 설계` `복합 인덱스` `관계형 모델링` `TypeScript`
