# 데이터베이스 설정 가이드 (Supabase)

Beyond Meet 프로젝트의 데이터베이스 설정 가이드입니다.

---

## 1. Supabase 프로젝트 정보

- **Project URL**: https://bnxspyjnmocodnleyowo.supabase.co
- **Project Ref**: bnxspyjnmocodnleyowo
- **Region**: ap-northeast-2 (Seoul)

---

## 2. 환경 변수 설정

### 2.1 Supabase Credentials

backend/.env 파일에 다음 값들이 설정되어 있습니다:

```bash
# Supabase Storage
SUPABASE_URL=https://bnxspyjnmocodnleyowo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 PostgreSQL 연결 문자열 설정 (중요!)

**현재 상태**: DATABASE_URL이 임시 값으로 설정되어 있습니다.

**필수 작업**: Supabase 대시보드에서 실제 데이터베이스 연결 문자열을 가져와야 합니다.

#### 연결 문자열 가져오는 방법:

1. Supabase Dashboard에 로그인
2. 프로젝트 선택 (bnxspyjnmocodnleyowo)
3. Settings > Database 메뉴로 이동
4. "Connection String" 섹션에서 다음 중 하나를 선택:
   - **Session pooler** (권장): 연결 풀링 지원
   - **Direct connection**: 직접 연결

5. 연결 문자열 복사 (형식 예시):
   ```
   postgresql://postgres.[project-ref]:[YOUR_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
   ```

6. backend/.env 파일의 DATABASE_URL 업데이트:
   ```bash
   DATABASE_URL=postgresql://postgres.bnxspyjnmocodnleyowo:[YOUR_DB_PASSWORD]@db.bnxspyjnmocodnleyowo.supabase.co:5432/postgres
   ```

**주의사항**:
- `[YOUR_DB_PASSWORD]`는 Supabase에서 프로젝트 생성 시 설정한 데이터베이스 비밀번호입니다.
- Anon Key나 Service Role Key가 아닙니다!
- 비밀번호를 잊어버린 경우 Supabase Dashboard > Settings > Database에서 재설정할 수 있습니다.

---

## 3. Prisma 마이그레이션

### 3.1 Prisma Client 생성

이미 완료되었습니다:

```bash
cd backend
npx prisma generate
```

### 3.2 데이터베이스 마이그레이션 실행

올바른 DATABASE_URL 설정 후 다음 명령어를 실행하세요:

```bash
cd backend

# 마이그레이션 생성 및 실행
npx prisma migrate dev --name init

# 또는 프로덕션 환경에서는
npx prisma migrate deploy
```

### 3.3 Prisma Studio로 데이터 확인

```bash
cd backend
npx prisma studio
```

브라우저에서 http://localhost:5555 로 접속하여 데이터베이스를 GUI로 확인할 수 있습니다.

---

## 4. 데이터베이스 스키마

현재 정의된 스키마:

### 4.1 주요 테이블

1. **users** - 사용자 정보
2. **match_sessions** - 매칭 세션
3. **call_records** - 통화 기록
4. **call_events** - 통화 이벤트
5. **friendships** - 친구 관계
6. **block_list** - 차단 목록
7. **device_tokens** - 디바이스 토큰 (푸시 알림)
8. **invite_codes** - 초대 코드 (Beta 테스트)
9. **invite_code_usage** - 초대 코드 사용 내역

전체 스키마는 `backend/prisma/schema.prisma` 파일을 참조하세요.

---

## 5. 연결 테스트

### 5.1 데이터베이스 연결 확인

```bash
cd backend
npx prisma db pull
```

성공하면 연결이 정상적으로 설정된 것입니다.

### 5.2 테스트 쿼리 실행

```typescript
// backend/src/test-db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // 테스트 쿼리
    const userCount = await prisma.user.count();
    console.log(`📊 Current user count: ${userCount}`);

  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

실행:
```bash
cd backend
npx ts-node src/test-db.ts
```

---

## 6. 초기 데이터 생성 (Seeding)

### 6.1 Beta 테스트용 초대 코드 생성

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 20개의 초대 코드 생성
  const inviteCodes = Array.from({ length: 20 }, (_, i) => ({
    code: `BETA-${String(i + 1).padStart(4, '0')}`,
    maxUses: 1,
    isActive: true,
  }));

  for (const code of inviteCodes) {
    await prisma.inviteCode.create({
      data: code,
    });
  }

  console.log('✅ Created 20 invite codes for beta testing');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

실행:
```bash
cd backend
npx ts-node prisma/seed.ts
```

---

## 7. 보안 주의사항

### 7.1 환경 변수 보안

- `.env` 파일은 절대 Git에 커밋하지 마세요
- `.gitignore`에 `.env`가 포함되어 있는지 확인하세요
- 프로덕션 환경에서는 강력한 비밀번호를 사용하세요

### 7.2 Supabase API Keys

- **Anon Key**: 클라이언트에서 사용 가능 (공개 가능)
- **Service Role Key**: 서버에서만 사용 (절대 공개 금지!)

### 7.3 데이터베이스 비밀번호

- Supabase 대시보드에서 주기적으로 변경하세요
- 강력한 비밀번호 사용 권장 (20자 이상, 특수문자 포함)

---

## 8. 트러블슈팅

### 8.1 연결 실패 (ECONNREFUSED)

**원인**: DATABASE_URL이 올바르지 않음

**해결**:
1. Supabase Dashboard에서 연결 문자열 재확인
2. 비밀번호가 올바른지 확인
3. 프로젝트 Ref가 일치하는지 확인

### 8.2 마이그레이션 실패

**원인**: 스키마 변경 충돌

**해결**:
```bash
# 마이그레이션 초기화
npx prisma migrate reset

# 새로운 마이그레이션 생성
npx prisma migrate dev --name init
```

### 8.3 "Password authentication failed"

**원인**: 잘못된 데이터베이스 비밀번호

**해결**:
1. Supabase Dashboard > Settings > Database
2. "Reset Database Password" 클릭
3. 새 비밀번호로 DATABASE_URL 업데이트

---

## 9. 다음 단계

- [ ] DATABASE_URL에 실제 비밀번호 설정
- [ ] Prisma 마이그레이션 실행
- [ ] 초기 데이터 시딩 (초대 코드 생성)
- [ ] 데이터베이스 연결 테스트
- [ ] API 서버에서 Prisma Client 사용 시작

---

## 10. 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Prisma + Supabase 가이드](https://supabase.com/docs/guides/integrations/prisma)

---

**작성일**: 2025-11-05
**버전**: 1.0.0
**최종 업데이트**: 2025-11-05
