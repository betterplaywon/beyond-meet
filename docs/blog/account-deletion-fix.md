# 회원 탈퇴 기능 버그 수정 및 CASCADE 설정 개선

## 1. 문제 발생

### 증상

회원 탈퇴를 시도하면 아래와 같은 에러가 발생하여 탈퇴가 불가능했다.

> "진행 중인 통화가 있습니다. 통화 종료 후 다시 시도해주세요."

실제로 통화 중이 아닌데도 이 에러가 반복적으로 나타났다.

### 원인 분석

백엔드의 `auth-service.ts` 내 `deleteAccount` 함수에서 탈퇴 전 활성 세션을 체크하는 로직이 문제였다.

```typescript
// 기존 코드 (문제의 원인)
const activeSession = await prisma.matchSession.findFirst({
  where: {
    OR: [{ userId1: userId }, { userId2: userId }],
    status: { in: ['PENDING', 'ACTIVE'] },
  },
});

if (activeSession) {
  throw new AppError(409, 'ACTIVE_CALL_IN_PROGRESS',
    '진행 중인 통화가 있습니다. 통화 종료 후 다시 시도해주세요.');
}
```

통화가 비정상 종료(앱 크래시, 네트워크 끊김 등)되면 `MatchSession`의 상태가 `ACTIVE` 또는 `PENDING`으로 남아있게 되고, 이 좀비 세션 때문에 영구적으로 탈퇴가 불가능한 상태가 되었다.

---

## 2. 해결 과정

백엔드 경험이 부족했기 때문에 AI(Claude)와 함께 문제를 분석하고 해결책을 하나씩 시도해가며 수정했다. 단순 버그 수정으로 시작했지만, 파고들수록 DB 설계 레벨의 문제까지 발견되어 총 3단계에 걸쳐 개선이 이루어졌다.

### 2-1단계: Supabase CASCADE 설정 (직접 시도)

우선 급한 대로 Supabase DB에서 직접 유저 데이터를 삭제하려 했으나, FK 제약조건 때문에 삭제가 안 되는 문제가 있었다. 이를 해결하기 위해 직접 SQL을 작성하여 CASCADE 설정을 적용했다.

```sql
-- 예시: match_sessions의 FK에 CASCADE 추가
ALTER TABLE match_sessions
DROP CONSTRAINT match_sessions_user_id_1_fkey,
ADD CONSTRAINT match_sessions_user_id_1_fkey
FOREIGN KEY (user_id_1) REFERENCES users(id) ON DELETE CASCADE;
```

총 7개 테이블에 대해 CASCADE를 설정하고, `reports` 테이블은 신고 기록 보존을 위해 `SET NULL`로 설정했다.

### 2-2단계: 활성 세션 체크 로직 개선 (AI와 협업)

AI와 함께 `deleteAccount` 함수의 로직을 분석하며 여러 접근법을 검토했다.

**처음 시도한 접근**: 10분 이상 된 세션만 비정상으로 간주하여 정리하고, 최근 세션이 있으면 여전히 차단하는 방식.

```typescript
// 첫 번째 시도: 오래된 세션만 정리
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
await prisma.matchSession.updateMany({
  where: {
    status: { in: ['PENDING', 'ACTIVE'] },
    createdAt: { lt: tenMinutesAgo },
  },
  data: { status: 'CANCELLED' },
});
```

하지만 이 방식은 "사용자가 탈퇴를 원하는데 10분을 기다려야 하는가?"라는 의문이 생겼다. 논의 끝에 **탈퇴 요청 시 모든 활성 세션을 즉시 강제 종료하는 방식**으로 결정했다.

**최종 코드:**

```typescript
// 최종: 모든 활성 세션 강제 종료 후 즉시 탈퇴
await prisma.matchSession.updateMany({
  where: {
    OR: [{ userId1: userId }, { userId2: userId }],
    status: { in: ['PENDING', 'ACTIVE'] },
  },
  data: { status: 'CANCELLED' },
});
```

### 2-3단계: CASCADE → SET NULL 전환 (AI가 발견한 문제)

AI가 중요한 문제를 지적했다. CASCADE 설정 상태에서 유저 A가 탈퇴하면, **상대방 B의 통화 기록과 매칭 세션까지 함께 삭제**되는 문제가 있었다.

| 테이블 | CASCADE 시 문제 |
|--------|----------------|
| `call_records` | A 탈퇴 → B의 통화 기록도 삭제됨 |
| `match_sessions` | A 탈퇴 → B와의 세션도 삭제됨 |
| `friendships` | A 탈퇴 → B 친구 목록에서 제거 (이건 정상) |

이를 해결하기 위해 `match_sessions`와 `call_records`의 사용자 FK를 `CASCADE` → `SET NULL`로 변경했다.

**Prisma 스키마 변경:**

```prisma
// 변경 전
user1  User  @relation(..., onDelete: Cascade)

// 변경 후
user1  User? @relation(..., onDelete: SetNull)  // nullable + SetNull
```

**Supabase SQL:**

```sql
ALTER TABLE match_sessions
ALTER COLUMN user_id_1 DROP NOT NULL;
-- ... FK 제약조건을 SET NULL로 변경
```

**백엔드 NULL 처리:**

```typescript
// call-service.ts - 탈퇴한 사용자 폴백 처리
partner: partner
  ? { id: partner.id, nickname: partner.nickname, profilePhotos: partner.profilePhotos }
  : { id: null, nickname: '탈퇴한 사용자', profilePhotos: [] },
```

**모바일 UI 보호:**

```typescript
// CallEndScreen.tsx - 탈퇴한 사용자에게 친구 추가 버튼 숨김
const isPartnerDeleted = !sessionInfo?.partner?.id;
const showAddFriendButton = !isPartnerDeleted && !isAlreadyFriend && !addFriendMutation.isSuccess;
```

### 2-4단계: 단위 테스트 작성 (AI와 협업)

백엔드에 테스트 환경이 없었기 때문에 Jest + ts-jest를 설치하고, `deleteAccount` 함수에 대한 단위 테스트를 처음부터 작성했다.

```
✓ 프로필 사진 없는 사용자가 정상적으로 탈퇴된다
✓ 프로필 사진이 있는 사용자 탈퇴 시 Storage에서 사진이 삭제된다
✓ 존재하지 않는 사용자 → USER_NOT_FOUND (404)
✓ 비밀번호 불일치 → INVALID_PASSWORD (400)
✓ 활성 세션이 있어도 강제 CANCELLED 후 즉시 탈퇴 진행
✓ Storage 삭제 실패해도 탈퇴는 정상 완료된다

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

---

## 3. 결과

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/prisma/schema.prisma` | 8개 관계에 `onDelete` 설정 추가 (Cascade/SetNull) |
| `backend/src/services/auth-service.ts` | 활성 세션 강제 종료 + 트랜잭션 간소화 |
| `backend/src/services/call-service.ts` | 탈퇴한 사용자 NULL 폴백 처리 |
| `mobile/src/screens/call/CallEndScreen.tsx` | 탈퇴한 사용자 친구 추가 버튼 숨김 |
| `backend/jest.config.ts` | Jest 테스트 환경 설정 (신규) |
| `backend/src/__tests__/delete-account.test.ts` | 단위 테스트 6개 (신규) |

### 최종 FK 정책

| 테이블 | onDelete | 이유 |
|--------|----------|------|
| `match_sessions` (user FK) | **SET NULL** | 상대방의 세션 기록 보존 |
| `call_records` (user FK) | **SET NULL** | 상대방의 통화 기록 보존 |
| `reports` (user FK) | **SET NULL** | 신고 기록 익명화 보존 |
| `friendships` | CASCADE | 탈퇴한 사용자가 친구 목록에 남으면 부자연스러움 |
| `block_list` | CASCADE | 차단 대상이 없으면 의미 없음 |
| `device_tokens` | CASCADE | 사용자 전용 데이터 |
| `email_verifications` | CASCADE | 사용자 전용 데이터 |
| `content_moderation_logs` | CASCADE | 사용자 전용 데이터 |
| `call_events` | CASCADE (session FK) | 세션 종속 데이터 |

### 개선 전/후 비교

| 항목 | 개선 전 | 개선 후 |
|------|---------|---------|
| 좀비 세션 시 탈퇴 | 영구 차단 | 즉시 강제 종료 후 탈퇴 |
| 탈퇴 시 상대방 영향 | 통화 기록 전체 삭제 | 기록 보존, "탈퇴한 사용자"로 표시 |
| 트랜잭션 | 10개 테이블 개별 삭제 | Report 익명화 + User 삭제 (CASCADE 활용) |
| 테스트 | 없음 | 6개 단위 테스트 |

### 배운 점

- 백엔드 경험이 부족했지만, AI와 함께 문제를 하나씩 파고들며 단순 버그 수정을 넘어 DB 설계 레벨의 개선까지 이끌어낼 수 있었다.
- CASCADE는 편리하지만, 다대다 관계에서 한쪽 삭제가 상대방 데이터에 영향을 줄 수 있다는 점을 간과하기 쉽다.
- 단위 테스트를 작성하면서 엣지 케이스(Storage 실패, 좀비 세션 등)를 체계적으로 검증할 수 있었다.
- 처음부터 완벽한 설계를 하기보다, 문제를 발견할 때마다 점진적으로 개선하는 것이 현실적인 접근이라는 걸 체감했다.
