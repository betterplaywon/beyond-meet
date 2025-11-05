# Beyond Meet - 설정 및 실행 가이드

**작성일**: 2025-11-05
**목적**: 백엔드 서버 시작 및 프론트엔드 연동

---

## 📋 현재 상태

✅ **완료됨**:
- 백엔드 코드 구현 (인증 API, Socket.io, 매칭 시스템)
- 프론트엔드 UI 구현 (인증, 홈, 영상 통화 UI)
- Prisma 스키마 정의
- TypeScript 빌드 성공

⏳ **실행 필요**:
- 데이터베이스 마이그레이션
- 초대 코드 생성
- 백엔드 서버 시작
- 프론트엔드 테스트

---

## 1️⃣ 데이터베이스 마이그레이션

### 터미널에서 실행:

```bash
cd /Users/kang/Desktop/beyond-meet/backend
npx prisma db push
```

**또는** (마이그레이션 파일 생성 원하는 경우):

```bash
npx prisma migrate dev --name init
```

**기대 출력**:
```
✔ Your database is now in sync with your schema.
✔ Generated Prisma Client
```

**문제 발생 시**:
- Supabase 프로젝트가 "Paused" 상태인지 확인
- https://supabase.com/dashboard에서 프로젝트 Resume
- VPN 비활성화 후 재시도

---

## 2️⃣ 초대 코드 생성

### 터미널에서 실행:

```bash
cd /Users/kang/Desktop/beyond-meet/backend
npm run db:seed
```

**기대 출력**:
```
🌱 Seeding database...
✅ Created invite code: BETA-0001
✅ Created invite code: BETA-0002
...
✅ Created 20 invite codes for beta testing

📋 All active invite codes:
   1. BETA-0001 (0/1 used)
   2. BETA-0002 (0/1 used)
   ...
   20. BETA-0020 (0/1 used)

🎉 Seeding complete!
```

---

## 3️⃣ Agora 설정 (선택사항)

**영상 통화 기능을 테스트하려면 Agora 설정 필수!**

### A. Agora 계정 생성

1. https://console.agora.io 접속
2. 회원가입 (무료)
3. "Create a project" 클릭

### B. 프로젝트 생성

- **Project Name**: `BeyondMeet`
- **Use Case**: `Video Calling` 선택
- **Authentication**: `Secured mode: APP ID + Token` 선택 ⚠️ 중요!

### C. App ID와 Certificate 복사

1. 생성된 프로젝트 클릭
2. **App ID** 복사
3. **Edit** 버튼 → **Primary Certificate** 활성화 및 복사

### D. 환경 변수 설정

`backend/.env` 파일 수정:

```bash
# Agora
AGORA_APP_ID=복사한_App_ID
AGORA_APP_CERTIFICATE=복사한_Certificate
```

**⚠️ 주의**: Agora 설정 없이도 인증 API는 테스트 가능합니다. 영상 통화 기능만 Agora가 필요합니다.

---

## 4️⃣ 백엔드 서버 시작

### 터미널 1 (백엔드 서버):

```bash
cd /Users/kang/Desktop/beyond-meet/backend
npm run dev
```

**기대 출력**:
```
🚀 Beyond Meet API server running on port 3000
🔌 Socket.io server ready
Environment: development
```

**서버가 실행되면 그대로 두고 새 터미널을 엽니다.**

---

## 5️⃣ API 테스트

### 새 터미널에서 실행:

```bash
# Health Check
curl http://localhost:3000/health

# 기대 응답:
# {
#   "status": "ok",
#   "timestamp": "2025-11-05...",
#   "environment": "development"
# }

# API 정보
curl http://localhost:3000/api

# 기대 응답:
# {
#   "message": "Beyond Meet API v1.0.0",
#   "status": "running",
#   "endpoints": {
#     "auth": "/api/auth",
#     "users": "/api/users",
#     ...
#   }
# }
```

### 회원가입 테스트:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "BETA-0001",
    "email": "test@example.com",
    "password": "password123",
    "nickname": "테스터",
    "birthDate": "1995-01-01",
    "gender": "MALE",
    "country": "KR",
    "preferredGender": "FEMALE",
    "minAge": 20,
    "maxAge": 30
  }'
```

**기대 응답**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid...",
      "email": "test@example.com",
      "nickname": "테스터",
      ...
    },
    "accessToken": "eyJhbGciOiJ...",
    "refreshToken": "eyJhbGciOiJ..."
  }
}
```

---

## 6️⃣ 프론트엔드 실행

### A. React Native Metro 시작

터미널 2 (Metro):

```bash
cd /Users/kang/Desktop/beyond-meet/mobile
npm start
```

### B. iOS 시뮬레이터 실행

터미널 3 (iOS):

```bash
cd /Users/kang/Desktop/beyond-meet/mobile
npm run ios
```

### C. Android 에뮬레이터 실행 (선택)

터미널 3 (Android):

```bash
cd /Users/kang/Desktop/beyond-meet/mobile
npm run android
```

---

## 7️⃣ 프론트엔드 - 백엔드 연동 테스트

### 테스트 시나리오:

1. **회원가입**
   - 앱 실행 → "시작하기" → "회원가입"
   - 초대 코드: `BETA-0001` 입력
   - 이메일, 비밀번호, 닉네임 등 입력
   - 회원가입 성공 → 홈 화면 이동

2. **로그인**
   - 로그아웃 → 로그인 화면
   - 이메일, 비밀번호 입력
   - 로그인 성공 → 홈 화면 이동

3. **Socket 연결 확인**
   - 백엔드 터미널에서 확인:
     ```
     User connected: <user_id>
     ```

4. **랜덤 매칭 테스트** (두 계정 필요)
   - 계정 1: "랜덤 매칭" 버튼 클릭
   - 계정 2: "랜덤 매칭" 버튼 클릭
   - 두 계정이 매칭되면 영상 통화 화면으로 이동

---

## 🎯 주요 API 엔드포인트

### 인증 API

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|----------|
| POST | /api/auth/register | 회원가입 | ❌ |
| POST | /api/auth/login | 로그인 | ❌ |
| POST | /api/auth/refresh | 토큰 갱신 | ❌ |
| POST | /api/auth/logout | 로그아웃 | ✅ |
| GET | /api/auth/me | 내 정보 조회 | ✅ |

### Socket.io 이벤트

**Client → Server (emit)**:
- `match:request` - 매칭 요청
- `match:cancel` - 매칭 취소
- `call:accept` - 통화 수락
- `call:reject` - 통화 거절
- `call:end` - 통화 종료

**Server → Client (on)**:
- `match:found` - 매칭 성공
- `call:incoming` - 통화 수신
- `call:accepted` - 통화 수락됨
- `call:ended` - 통화 종료됨

---

## 🐛 문제 해결

### 1. 데이터베이스 연결 실패

**에러**: `Can't reach database server`

**해결**:
1. Supabase Dashboard에서 프로젝트 상태 확인
2. Paused 상태라면 "Resume" 클릭
3. `.env` 파일의 DATABASE_URL 재확인
4. VPN 비활성화 후 재시도

### 2. 백엔드 서버 시작 실패

**에러**: `Port 3000 is already in use`

**해결**:
```bash
# 3000 포트 사용 중인 프로세스 종료
lsof -ti:3000 | xargs kill -9
```

### 3. Prisma 에러

**에러**: `Prisma Client not found`

**해결**:
```bash
cd backend
npm run prisma:generate
```

### 4. 프론트엔드 빌드 에러

**에러**: `Unable to resolve module`

**해결**:
```bash
cd mobile
rm -rf node_modules
npm install
# iOS
cd ios && pod install && cd ..
```

### 5. Agora 토큰 에러

**에러**: `AGORA_CONFIG_MISSING`

**해결**:
- Agora 설정 없이는 영상 통화 기능 불가
- 섹션 3 "Agora 설정" 참고하여 설정

---

## 📊 데이터베이스 확인

### Prisma Studio 실행:

```bash
cd backend
npm run prisma:studio
```

브라우저에서 http://localhost:5555 접속

**확인 가능한 것**:
- 생성된 초대 코드 목록
- 등록된 사용자 목록
- 매칭 세션 기록
- 통화 기록

---

## 🎉 완료!

모든 설정이 완료되었습니다!

### 실행 중인 서비스:

1. **백엔드 서버** (터미널 1): http://localhost:3000
2. **Socket.io 서버**: ws://localhost:3000
3. **React Native Metro** (터미널 2)
4. **iOS 시뮬레이터/Android 에뮬레이터** (터미널 3)

### 다음 단계:

- Beta 테스터에게 초대 코드 전달 (`BETA-0001` ~ `BETA-0020`)
- 실제 디바이스에서 영상 통화 테스트
- Agora 설정 완료하여 영상 통화 기능 활성화
- 버그 수정 및 개선

---

## 📞 문의

문제가 발생하면 다음을 확인하세요:

1. [BACKEND_IMPLEMENTATION_COMPLETE.md](BACKEND_IMPLEMENTATION_COMPLETE.md) - 백엔드 구현 내용
2. [VIDEO_CALL_SETUP_COMPLETE.md](VIDEO_CALL_SETUP_COMPLETE.md) - 프론트엔드 영상 통화 UI
3. [CLAUDE.md](CLAUDE.md) - 개발 컨벤션
4. [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) - API 명세서

**Happy Coding! 🚀**
