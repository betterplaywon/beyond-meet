# Supabase + Prisma 통합 가이드

Beyond Meet 프로젝트에서 Supabase와 Prisma를 함께 사용하는 방법을 안내합니다.

---

## 🎯 통합 전략

**Supabase**와 **Prisma**를 함께 사용하여 각각의 장점을 활용합니다:

- **Prisma**: PostgreSQL 데이터베이스 ORM (사용자, 매칭, 통화 기록 등)
- **Supabase JS**: 파일 스토리지 (프로필 사진, 배경 이미지 등)

---

## ✅ 설치 완료

```bash
npm install @supabase/supabase-js  # ✅ 설치됨
```

---

## 📁 생성된 파일

### 1. Supabase Client 설정

**파일**: `backend/src/config/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const supabaseStorage = supabaseAdmin.storage;
```

**특징**:
- Service Role Key 사용 (서버 사이드 전용)
- RLS(Row Level Security) 우회
- 모든 데이터 접근 가능

### 2. Storage Service

**파일**: `backend/src/services/storage-service.ts`

**주요 메서드**:
- `uploadProfilePhoto()` - 프로필 사진 업로드
- `deleteProfilePhoto()` - 프로필 사진 삭제
- `deleteMultipleProfilePhotos()` - 여러 사진 삭제
- `createBucket()` - Storage Bucket 생성

---

## 🔧 사용 방법

### 1. 데이터베이스 작업 (Prisma 사용)

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 사용자 생성
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    passwordHash: hashedPassword,
    nickname: 'testuser',
    // ...
  },
});

// 사용자 조회
const users = await prisma.user.findMany({
  where: { onlineStatus: 'ONLINE' },
});
```

**사용 케이스**:
- 사용자 관리 (CRUD)
- 매칭 시스템
- 통화 기록
- 친구 관계
- 초대 코드 관리

### 2. 파일 업로드 (Supabase Storage 사용)

```typescript
import { storageService } from '../services/storage-service';

// 프로필 사진 업로드
const photoUrl = await storageService.uploadProfilePhoto(
  userId,
  fileBuffer,
  'profile.jpg'
);

// Prisma로 URL 저장
await prisma.user.update({
  where: { id: userId },
  data: {
    profilePhotos: {
      push: photoUrl,
    },
  },
});
```

**사용 케이스**:
- 프로필 사진 업로드
- 배경 이미지 업로드
- 기타 파일 저장

---

## 🗄️ Supabase Storage 설정

### 1. Bucket 생성 (Supabase Dashboard)

1. Supabase Dashboard 접속
2. **Storage** 메뉴 클릭
3. **Create Bucket** 클릭
4. Bucket 정보 입력:
   - Name: `profile-photos`
   - Public: ✅ (체크)
   - File size limit: 5 MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

### 2. 또는 코드로 Bucket 생성

```typescript
import { storageService } from './services/storage-service';

// 한 번만 실행
await storageService.createBucket();
```

---

## 📊 데이터베이스 스키마 적용

Supabase pooler를 통한 Prisma 마이그레이션은 제한이 있습니다. 두 가지 방법 중 선택:

### 방법 1: Supabase SQL Editor 사용 (권장)

1. **Supabase Dashboard** 접속
2. **SQL Editor** 메뉴 클릭
3. **New query** 클릭
4. Prisma 스키마를 SQL로 변환하여 실행

**SQL 생성 방법**:
```bash
cd backend
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration.sql
```

생성된 `migration.sql` 파일을 Supabase SQL Editor에 붙여넣고 실행

### 방법 2: Prisma db push 사용

```bash
cd backend
npx prisma db push
```

**주의사항**:
- Production에서는 사용하지 마세요
- 마이그레이션 히스토리가 생성되지 않습니다
- 데이터 손실 가능성 있음

---

## 🔐 환경 변수

`.env` 파일에 다음 변수들이 설정되어 있어야 합니다:

```bash
# Prisma (PostgreSQL)
DATABASE_URL=postgresql://...?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://...

# Supabase
SUPABASE_URL=https://bnxspyjnmocodnleyowo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 실전 예제

### 예제 1: 회원가입 시 프로필 사진 업로드

```typescript
import { PrismaClient } from '@prisma/client';
import { storageService } from '../services/storage-service';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();

async function registerUser(data: {
  email: string;
  password: string;
  nickname: string;
  profilePhoto: Buffer;
}) {
  // 1. 비밀번호 해싱
  const passwordHash = await hashPassword(data.password);

  // 2. 프로필 사진 업로드
  const photoUrl = await storageService.uploadProfilePhoto(
    'temp-id', // 임시 ID (실제로는 사용자 생성 후 업데이트)
    data.profilePhoto,
    `${data.nickname}.jpg`
  );

  // 3. 사용자 생성
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      nickname: data.nickname,
      profilePhotos: [photoUrl],
      // ...
    },
  });

  return user;
}
```

### 예제 2: 프로필 사진 업데이트

```typescript
async function updateProfilePhoto(userId: string, newPhoto: Buffer) {
  // 1. 기존 사용자 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhotos: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 2. 새 사진 업로드
  const newPhotoUrl = await storageService.uploadProfilePhoto(
    userId,
    newPhoto,
    'profile.jpg'
  );

  // 3. 기존 사진 삭제 (선택사항)
  if (user.profilePhotos.length > 0) {
    // 첫 번째 사진만 유지하는 경우
    const oldPhotoUrl = user.profilePhotos[0];
    const oldFilePath = oldPhotoUrl.split('/').slice(-2).join('/');
    await storageService.deleteProfilePhoto(oldFilePath);
  }

  // 4. 데이터베이스 업데이트
  await prisma.user.update({
    where: { id: userId },
    data: {
      profilePhotos: [newPhotoUrl, ...user.profilePhotos.slice(0, 4)], // 최대 5장
    },
  });

  return newPhotoUrl;
}
```

### 예제 3: 사용자 탈퇴 시 모든 데이터 삭제

```typescript
async function deleteUser(userId: string) {
  // 1. 사용자 정보 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhotos: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 2. 프로필 사진 삭제
  if (user.profilePhotos.length > 0) {
    const filePaths = user.profilePhotos.map((url) =>
      url.split('/').slice(-2).join('/')
    );
    await storageService.deleteMultipleProfilePhotos(filePaths);
  }

  // 3. 데이터베이스에서 사용자 삭제 (Cascade로 관련 데이터 자동 삭제)
  await prisma.user.delete({
    where: { id: userId },
  });
}
```

---

## 🚀 다음 단계

1. **Storage Bucket 생성**:
   - Supabase Dashboard에서 `profile-photos` bucket 생성
   - 또는 코드로 자동 생성

2. **데이터베이스 스키마 적용**:
   - Supabase SQL Editor에서 스키마 실행
   - 또는 `npx prisma db push`

3. **초기 데이터 생성**:
   ```bash
   cd backend
   npm run db:seed
   ```

4. **API 개발 시작**:
   - 인증 API (`/api/auth/*`)
   - 사용자 관리 API (`/api/users/*`)
   - 파일 업로드 API (`/api/users/:id/photos`)

---

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Storage 가이드](https://supabase.com/docs/guides/storage)
- [Prisma + Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Prisma 마이그레이션](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

**작성일**: 2025-11-05
**버전**: 1.0.0
**최종 업데이트**: Supabase JS 통합 완료
