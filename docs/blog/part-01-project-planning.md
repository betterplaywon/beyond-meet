# 영상 데이팅 앱 만들기 #1 - 무료로 MVP 만들기 위한 기술 스택 선정

> 이 글은 **Beyond Meet** 프로젝트의 개발 과정을 담은 시리즈의 첫 번째 글이다. 2개월간 React Native와 Node.js로 WebRTC 기반 1:1 영상 데이팅 앱을 개발하고, **월 0원**의 무료 인프라로 베타 서비스를 운영한 경험을 공유한다.

---

## 📌 시리즈 소개

**전체 시리즈 구성 (15개 파트)**

1. **프로젝트 기획과 기술 스택 선정** ← 현재 글
2. 개발 환경 구축 - Backend (Node.js + TypeScript)
3. 개발 환경 구축 - Mobile (React Native)
4. 데이터베이스 설계와 Prisma ORM 설정
5. JWT 인증 시스템 구축 (보안 강화)
6. React Native 인증 UI와 상태 관리
7. 이메일 인증 시스템 구축
8. Socket.io 실시간 통신 구축
9. WebRTC 영상 통화 구현 (Agora SDK)
10. AI 콘텐츠 모더레이션 시스템
11. FCM 푸시 알림 시스템
12. 친구 시스템과 온라인 상태 동기화
13. 데이터베이스 성능 최적화와 복합 인덱스
14. iOS/Android 앱 빌드 및 배포
15. 백엔드 배포와 무료 인프라 운영

---

## 💡 프로젝트 배경: 왜 영상 데이팅 앱인가?

### 문제 인식

기존 데이팅 앱의 한계점:
- **프로필 사진 필터링 과다**: 실제 모습과 다른 경우 많음
- **텍스트 중심 대화**: 실제 만남까지 시간이 오래 걸림
- **가짜 프로필 문제**: 사진 도용, 봇 계정 등

### 핵심 아이디어

**"텍스트 없이 바로 영상 통화로 만나는 데이팅 앱"**

- ✅ **즉시 영상 통화**: 프로필 확인 후 바로 5분 영상 통화
- ✅ **빠른 판단**: 5분 제한으로 효율적인 만남
- ✅ **AI 모더레이션**: 부적절한 콘텐츠 실시간 감지

---

## 🎯 MVP 요구사항 정의

### 베타 전략: 왜 20명 한정인가?

초기 개발자가 혼자서 안정적으로 운영할 수 있는 규모를 설정했다.

**베타 테스트 목표**
- 👥 **사용자 수**: 20명 (초대 코드 시스템)
- 💰 **운영 비용**: $0/월 (무료 인프라만 사용)
- ⏱️ **개발 기간**: 2개월 (2025.11 ~ 2026.01)
- 📱 **플랫폼**: iOS, Android 동시 지원

### 핵심 기능 (MVP 범위)

1. **회원 가입/로그인**
   - 초대 코드 필수 (BETA-0001 ~ BETA-0020)
   - 이메일 인증
   - JWT 토큰 기반 인증

2. **랜덤 매칭**
   - 성별, 나이, 국가 필터링
   - 실시간 매칭 큐
   - 5분 제한 영상 통화

3. **친구 시스템**
   - 통화 후 친구 추가
   - 친구에게 직접 통화 요청
   - 온라인 상태 실시간 확인

4. **AI 콘텐츠 모더레이션**
   - 부적절한 콘텐츠 자동 감지
   - 경고 및 강제 종료
   - 자동 신고 시스템

5. **푸시 알림**
   - 매칭 성공 알림
   - 친구 요청 알림
   - 직접 통화 요청 알림

---

## 🛠️ 기술 스택 선정 과정

### 1. Frontend: React Native를 선택한 이유

**고려한 옵션**
- Native 개발 (Swift + Kotlin): 최고 성능이지만 개발 시간 2배
- Flutter: 빠른 개발이지만 라이브러리 생태계 부족
- **React Native** ✅: JavaScript 생태계 + 빠른 개발 + 풍부한 라이브러리

**선택 이유**
```
✅ iOS/Android 동시 개발 (개발 시간 50% 절감)
✅ JavaScript/TypeScript로 통일 (Backend와 언어 공유)
✅ 풍부한 영상 통화 라이브러리 (Agora SDK 공식 지원)
✅ Hot Reload로 빠른 개발 사이클
```

**주요 라이브러리**
- `react-native-agora`: 영상 통화 (Agora SDK)
- `@react-navigation/native`: 화면 네비게이션
- `zustand`: 클라이언트 상태 관리
- `@tanstack/react-query`: 서버 상태 관리
- `socket.io-client`: 실시간 통신
- `@react-native-firebase/messaging`: 푸시 알림

---

### 2. Backend: Node.js + Express + TypeScript를 선택한 이유

처음엔 어떤 백엔드 프레임워크를 쓸지 고민이 많았다. 프론트엔드 개발자 입장에서 서버 개발은 낯설었기 때문이다.

**고려한 옵션들**

먼저 "영상 통화 앱 백엔드"로 검색해봤다. Python Django나 FastAPI가 초보자에게 좋다는 글이 많았다. 하지만 영상 통화는 실시간 통신이 핵심인데, Django는 WebSocket 성능이 별로라는 글을 봤다.

Java Spring Boot도 찾아봤다. 대규모 서비스에서 많이 쓴다고 하는데, 설정 파일이 너무 복잡해 보였다. 프로젝트 초기화 튜토리얼만 봐도 XML 설정이 잔뜩 나왔다. 2개월 내에 완성해야 하는데 학습 곡선이 너무 가파를 것 같았다.

**Node.js를 선택하게 된 이유**

그러다 "React Native 백엔드 추천"으로 검색했더니 Node.js + Express 조합이 계속 나왔다. 찾아보니 몇 가지 큰 장점이 있었다:

1. **언어 통일**: 프론트엔드랑 같은 JavaScript를 쓴다. API 요청/응답 타입을 공유할 수 있다고 했다.

2. **Socket.io 네이티브 지원**: 실시간 매칭 시스템을 만들려면 WebSocket이 필요한데, Socket.io 공식 문서를 보니 Node.js 예제가 제일 많았다. Python이나 Java는 별도 라이브러리를 써야 한다고 한다.

3. **비동기 I/O**: 이게 뭔지 찾아봤더니, 여러 사용자가 동시에 요청해도 서버가 멈추지 않는다고 한다. 영상 통화처럼 실시간 데이터를 주고받는 앱에 적합하다는 설명이었다.

**TypeScript 추가**

Express 튜토리얼을 따라하다가 문제가 생겼다. JavaScript는 타입 체크가 없어서 `user.name`을 `user.username`으로 잘못 쓰면 런타임 에러가 났다.

"Node.js 타입 체크"로 검색했더니 TypeScript가 나왔다. React Native도 TypeScript 쓰고 있어서 익숙했다. 공식 문서 보니 Express에서도 쓸 수 있다고 해서 바로 적용했다.

**핵심 라이브러리**
- `express`: 웹 프레임워크 (공식 문서가 친절함)
- `socket.io`: 실시간 양방향 통신 (매칭/통화 이벤트)
- `prisma`: ORM (나중에 설명)
- `jsonwebtoken`: JWT 인증 (이것도 나중에)
- `zod`: 입력 검증 (TypeScript와 궁합 좋음)
- `agora-token`: Agora RTC 토큰 생성
- `@huggingface/inference`: AI 모더레이션

---

### 3. Database: PostgreSQL (Supabase)를 선택한 이유

데이터베이스는 더 헷갈렸다. SQL이냐 NoSQL이냐부터 결정해야 했다.

**NoSQL (MongoDB) 고려**

처음에는 MongoDB를 쓰려고 했다. 프론트엔드 개발자 입장에서 JSON 형식으로 데이터를 다루는 게 익숙했기 때문이다.

```javascript
// MongoDB는 이렇게 JSON 형태로 저장
{
  "userId": "abc123",
  "friends": ["user1", "user2", "user3"]
}
```

그런데 우리 앱 데이터 구조를 그려보니 관계형 데이터가 너무 많았다:
- User ↔ CallRecord (한 명이 여러 통화)
- User ↔ User (친구 관계)
- User ↔ Report (신고 관계)

"MongoDB 관계형 데이터"로 검색했더니, 관계형 데이터는 SQL 데이터베이스가 더 적합하다는 글이 많았다. MongoDB로도 할 수 있지만 복잡해진다고 한다.

**PostgreSQL + Supabase 선택**

"무료 PostgreSQL 호스팅"으로 검색했다. 여러 서비스가 나왔는데, Supabase가 눈에 띄었다:

```
Supabase 무료 플랜:
✅ PostgreSQL 500MB
✅ Storage 1GB (프로필 사진 저장용)
✅ Row Level Security (보안 기능)
✅ 무료 SSL 연결
```

베타 20명 기준으로 계산해보니 500MB면 충분했다. 게다가 Storage도 같이 제공해서 프로필 사진을 따로 S3 같은 곳에 올릴 필요가 없었다.

**Prisma ORM 선택**

PostgreSQL을 선택하고 나니 또 문제가 생겼다. SQL 쿼리를 직접 작성해야 했다:

```sql
SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;
```

이렇게 문자열로 쿼리를 쓰면 오타가 나도 실행 전까진 모른다.

"Node.js PostgreSQL ORM"으로 검색했더니 Sequelize와 Prisma가 나왔다. Sequelize가 더 유명하지만, Prisma 공식 문서를 보니 TypeScript 지원이 훨씬 좋았다:

```typescript
// Prisma는 타입 자동 생성
const user = await prisma.user.findUnique({
  where: { email: 'test@example.com' }
});
// user.name 자동완성 됨!
```

스키마 파일 하나만 작성하면 TypeScript 타입을 자동으로 생성해준다. 프론트엔드에서 TypeScript 쓰던 것처럼 DB 쿼리도 타입 체크가 되니까 훨씬 편했다.

---

### 4. Video SDK: Agora를 선택한 이유

영상 통화 기능을 직접 구현할 순 없었다. WebRTC를 처음부터 만들려면 몇 달이 걸린다고 한다.

**고려한 옵션들**

"React Native 영상 통화 SDK"로 검색했다:

1. **Twilio Video**: 유명하지만 무료 플랜이 없었다. 가격표를 보니 분당 과금이었다.

2. **Daily.co**: 무료 플랜이 있지만 월 10,000분 중 5,000분은 그룹 통화만 무료였다. 1:1 통화는 제한이 있었다.

3. **Agora**: 무료 플랜 10,000분/월, React Native 공식 SDK 제공

**Agora 선택 이유**

Agora 공식 문서를 읽어보니 딱 우리가 필요한 기능이었다:

```
Agora 무료 플랜:
✅ 10,000분/월 무료 (베타 20명이면 충분)
✅ React Native 공식 SDK
✅ 낮은 레이턴시 (평균 250ms 이하)
✅ 자동 품질 조정 (네트워크 상황 따라)
```

**예상 사용량 계산**

베타 20명 기준으로 계산해봤다:
- 일평균 활성 사용자: 10명 (50% 활동)
- 1인당 하루 통화: 1회 (5분)
- 월 총 통화 시간: 10명 × 5분 × 30일 = **1,500분**
- ✅ 무료 한도 10,000분의 15%만 사용

실제로는 더 적게 나올 것 같았다. 매일 쓰는 사람이 많지 않을테니까.

---

### 5. 기타 무료 서비스 선정

#### 5-1. Cache: Upstash Redis

"실시간 매칭 시스템"을 구글링하다가 Redis라는 걸 알게 됐다.

PostgreSQL에 매칭 대기 중인 사람을 저장하면 너무 느리다고 한다. 매칭은 1초 안에 처리돼야 하는데, DB 쿼리는 수십 밀리초가 걸린다.

Redis는 "인메모리 데이터베이스"라고 한다. 메모리에 데이터를 저장해서 엄청 빠르다고 했다. 매칭 큐, 온라인 상태 같은 임시 데이터 저장에 적합하다는 설명이었다.

"무료 Redis 호스팅"으로 찾아보니 Upstash가 나왔다:

```
Upstash 무료 플랜:
✅ 10,000 명령/일 무료
✅ Serverless (안 쓸 땐 비용 없음)
✅ REST API 지원
```

베타 20명 × 하루 100번 = 2,000 명령/일 정도면 충분할 것 같았다.

#### 5-2. Push Notification: Firebase FCM

푸시 알림은 Firebase FCM을 선택했다. React Native 공식 문서에서도 FCM을 추천하더라.

```
Firebase FCM:
✅ 완전 무료 무제한
✅ iOS/Android 통합 지원
✅ React Native 라이브러리 있음
```

다른 선택지를 찾아볼 필요가 없었다. 무료 무제한이면 당연히 이걸 써야지.

#### 5-3. AI Moderation: Hugging Face API

부적절한 콘텐츠를 어떻게 걸러낼지 고민이 많았다.

처음엔 사람이 직접 신고하면 관리자가 확인하는 방식을 생각했다. 하지만 실시간 영상 통화에서는 신고가 들어와도 이미 늦다.

"실시간 영상 콘텐츠 감지"로 검색하다가 Hugging Face API를 발견했다. AI 모델이 이미지를 분석해서 부적절한 콘텐츠를 자동으로 감지해준다고 한다.

```
Hugging Face 무료 플랜:
✅ 30,000 요청/월 무료
✅ 모델: Falconsai/nsfw_image_detection
✅ 평균 응답 시간: 1~2초
```

공식 문서를 보니 사용법도 간단했다. 3초마다 프레임을 캡처해서 보내면 AI가 분석한다.

**예상 사용량**:
- 통화당 5분 ÷ 3초 = 100 요청/통화
- 월 100통화 = 10,000 요청
- ✅ 무료 한도 30,000 요청의 33% 사용

#### 5-4. Hosting: Render.com

백엔드를 어디에 배포할지도 찾아봤다.

"무료 Node.js 호스팅"으로 검색했다. Heroku가 유명했는데 2022년에 무료 플랜을 없앴다고 한다.

Render.com이라는 곳을 찾았다:

```
Render.com 무료 플랜:
✅ 750시간/월 무료 (24시간 × 31일 = 744시간)
✅ GitHub 연동 자동 배포
✅ 환경변수 관리 가능
```

한 가지 문제가 있었다. 15분 동안 요청이 없으면 서버가 슬립 모드로 들어간다고 한다. 다시 깨우는 데 30초 정도 걸린다.

검색해보니 GitHub Actions로 5분마다 헬스체크 요청을 보내면 해결된다고 해서 나중에 적용하기로 했다.

#### 5-5. Email Verification: Resend

이메일 인증 코드를 어떻게 보낼지 찾아봤다.

Gmail SMTP를 쓰려다가, 보안 설정이 복잡하다는 글을 봤다. "무료 이메일 발송 API"로 검색했더니 Resend가 나왔다:

```
Resend 무료 플랜:
✅ 100통/일 무료
✅ 간단한 API (3줄이면 발송)
```

베타 테스트면 하루에 이메일 인증 10건 정도일 테니 충분했다.

---

## 💰 예상 비용 계산 (20명 기준)

### 월간 사용량 예측

| 서비스 | 무료 한도 | 예상 사용량 | 비용 |
|--------|-----------|------------|------|
| **Supabase** (DB) | 500MB | ~50MB | $0 |
| **Supabase** (Storage) | 1GB | ~100MB | $0 |
| **Agora** (Video) | 10,000분/월 | ~3,000분/월 | $0 |
| **Upstash Redis** | 10,000 명령/일 | ~2,000 명령/일 | $0 |
| **Render.com** | 750시간/월 | 750시간/월 | $0 |
| **Firebase FCM** | 무제한 | ~1,000건/월 | $0 |
| **Hugging Face** | 30,000건/월 | ~10,000건/월 | $0 |
| **Resend** (Email) | 100통/일 | ~10통/일 | $0 |
| **총 비용** | - | - | **$0** |

### 계산 근거

**통화 시간 계산**
- 사용자: 20명
- 일평균 활성 사용자: 10명 (50%)
- 1인당 일평균 통화: 1회 (5분)
- 월간 총 통화 시간: 10명 × 5분 × 30일 = **1,500분**
- ✅ Agora 무료 한도 10,000분 대비 15% 사용

**데이터베이스 크기**
- 사용자 20명 × 평균 50KB = 1MB
- 통화 기록 100건 × 5KB = 500KB
- 기타 데이터: ~50MB
- ✅ Supabase 무료 500MB 대비 10% 사용

**스토리지 크기**
- 프로필 사진: 20명 × 평균 500KB = 10MB
- ✅ Supabase Storage 1GB 대비 1% 사용

---

## 📐 시스템 아키텍처

### 전체 구조도

```
┌─────────────────────────────────────────────────────────────────────┐
│                        클라이언트 레이어                              │
│  ┌──────────────────┐                    ┌──────────────────┐       │
│  │   iOS / Android   │◄──── Agora SDK ───►│     영상 통화     │       │
│  │  (React Native)   │                    │   (10k분/월 무료) │       │
│  └─────────┬────────┘                    └──────────────────┘       │
└────────────┼────────────────────────────────────────────────────────┘
             │ REST API + Socket.io
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     백엔드 (Render.com 무료)                         │
│  Node.js + Express + TypeScript                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Controllers: Auth, User, Match, Call, Admin, Moderation, Agora │ │
│  │ Services:    비즈니스 로직 처리                                 │ │
│  │ Socket.io:   실시간 매칭/통화 이벤트                             │ │
│  │ Hugging Face API: AI 콘텐츠 모더레이션                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────┬─────────────────┬─────────────────┬──────────────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│    Supabase      │ │  Upstash Redis   │ │  Firebase FCM    │
│   PostgreSQL     │ │  (10k 명령/일)    │ │  (푸시 알림)      │
│  + Storage (1GB) │ │                  │ │                  │
│   (500MB 무료)   │ │                  │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 주요 통신 흐름

**1. 회원가입 플로우**
```
1. 클라이언트: 이메일 입력 → POST /auth/send-verification
2. 백엔드: Resend API로 6자리 코드 발송
3. 클라이언트: 코드 입력 → POST /auth/verify-email
4. 백엔드: 코드 검증 → 토큰 발급
5. 클라이언트: 프로필 정보 입력 → POST /auth/register
```

**2. 랜덤 매칭 플로우**
```
1. 클라이언트: Socket 연결 + match:request 이벤트
2. 백엔드: Redis 매칭 큐에 사용자 추가
3. 백엔드: 필터 조건 맞는 상대 찾기
4. 백엔드: Agora RTC Token 생성
5. 백엔드: match:found 이벤트로 양쪽에 채널 정보 전송
6. 클라이언트: Agora SDK로 영상 통화 시작
```

**3. AI 모더레이션 플로우**
```
1. 클라이언트: 3초마다 프레임 캡처 → Base64 인코딩
2. 백엔드: POST /moderation/analyze
3. 백엔드: Hugging Face API로 NSFW 분석
4. 백엔드: 신뢰도 0.3 이상 시 경고, 0.6 이상 시 강제 종료
5. 클라이언트: 모달 표시 또는 통화 종료
```

---

## 📅 개발 일정 계획 (2개월)

### Week 1-2: 프로젝트 초기 세팅
- [x] 기술 스택 선정 및 문서화
- [x] Backend 프로젝트 초기화 (Node.js + TypeScript + Express)
- [x] Mobile 프로젝트 초기화 (React Native + TypeScript)
- [x] PostgreSQL 데이터베이스 설계 (Prisma Schema)
- [x] Supabase 프로젝트 생성 및 연결

### Week 3-4: 인증 시스템
- [x] JWT 기반 회원가입/로그인 API
- [x] React Native 인증 UI (다단계 폼)
- [x] Zustand로 인증 상태 관리
- [x] 토큰 자동 갱신 로직
- [x] 이메일 인증 시스템 (Resend API)

### Week 5-6: 핵심 기능 (영상 통화)
- [x] Socket.io 실시간 매칭 시스템
- [x] Agora SDK 통합 (iOS/Android)
- [x] 영상 통화 화면 구현
- [x] 통화 기록 저장
- [x] 친구 추가 기능

### Week 7-8: 고급 기능
- [x] AI 콘텐츠 모더레이션 (Hugging Face)
- [x] Firebase FCM 푸시 알림
- [x] 친구 온라인 상태 실시간 동기화
- [x] 직접 통화 요청 기능
- [x] 관리자 대시보드

### Week 9: 보안 강화 및 성능 최적화
- [x] JWT 시크릿 검증 강화
- [x] Race Condition 방지 (Serializable 트랜잭션)
- [x] Zod 입력 검증 추가
- [x] PostgreSQL 복합 인덱스 추가 (97% 성능 개선)
- [x] Rate Limiting 설정

### Week 10: 배포 및 베타 테스트
- [x] Render.com 백엔드 배포
- [x] iOS TestFlight 업로드
- [x] Android Play Store 내부 테스트
- [x] 베타 테스터 20명 초대
- [x] 피드백 수집 및 버그 수정

---

## 🎓 이 프로젝트에서 배울 수 있는 것

### 기술적 경험

1. **풀스택 개발**
   - React Native (모바일)
   - Node.js + Express (백엔드)
   - PostgreSQL (데이터베이스)

2. **실시간 통신**
   - WebRTC 기반 영상 통화
   - Socket.io 양방향 통신
   - 매칭 알고리즘 구현

3. **외부 서비스 통합**
   - Agora SDK (영상 통화)
   - Firebase FCM (푸시 알림)
   - Hugging Face API (AI)
   - Supabase (Database + Storage)

4. **보안 및 성능**
   - JWT 인증 시스템
   - Race Condition 방지
   - 데이터베이스 쿼리 최적화

### 비즈니스 경험

- 💰 **무료 인프라 활용법**: $0로 베타 서비스 운영
- 📊 **MVP 범위 설정**: 핵심 기능만 빠르게 구현
- 📱 **iOS/Android 동시 출시**: React Native로 개발 시간 절감

---

## 🔍 왜 이 시리즈를 읽어야 하나?

### 이런 사람에게 추천한다

✅ **주니어 개발자**
- 실전 프로젝트 경험이 부족한 사람
- 영상 통화 앱 만들어보고 싶은 사람
- React Native 실무 개발 배우고 싶은 사람

✅ **시니어 개발자**
- WebRTC 아키텍처 설계 참고하고 싶은 사람
- 무료 인프라 조합 전략 알고 싶은 사람
- Socket.io + Agora 통합 경험 필요한 사람

✅ **창업/사이드 프로젝트 준비자**
- 빠르게 MVP 만들어야 하는 사람
- 초기 비용 없이 서비스 런칭하고 싶은 사람
- 베타 테스트 전략 세우고 싶은 사람

### 이 시리즈의 특징

🎯 **실전 중심**
- 이론보다 실제 코드와 구현 방법
- 에러 해결 과정 상세히 기록
- Before/After 비교로 개선 과정 공유

💰 **무료 인프라 전략**
- 각 서비스의 무료 플랜 한도 분석
- 예상 사용량 계산 방법
- Keep-Alive 등 실전 팁

🔒 **보안 중시**
- JWT 검증 강화
- Race Condition 방지
- 입력 검증 (Zod)

🚀 **성능 최적화**
- PostgreSQL 복합 인덱스 (97% 개선)
- React Query 캐시 전략
- Socket.io 이벤트 최적화

---

## 📚 다음 글 예고

**Part 2: 개발 환경 구축 - Backend (Node.js + TypeScript)**

다음 글에서는 백엔드 프로젝트를 처음부터 세팅하는 방법을 다룬다.

다룰 내용:
- Node.js 프로젝트 초기화
- TypeScript 설정 (tsconfig.json)
- Express 서버 기본 구조
- 폴더 구조 설계 (Controller-Service 패턴)
- 개발 도구 설정 (ts-node-dev, ESLint, Prettier)
- 첫 API 엔드포인트 작성 (Health Check)

---

## 📖 참고 자료

### 공식 문서
- [React Native 공식 문서](https://reactnative.dev/)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Agora SDK 문서](https://docs.agora.io/)
- [Socket.io 문서](https://socket.io/docs/)

### 무료 서비스
- [Supabase](https://supabase.com/) - PostgreSQL + Storage
- [Render.com](https://render.com/) - 백엔드 호스팅
- [Upstash](https://upstash.com/) - Redis
- [Hugging Face](https://huggingface.co/) - AI API

### 프로젝트 저장소
- GitHub: (추후 공개 예정)

---

## 💬 마치며

이 글에서는 Beyond Meet 프로젝트의 기획 배경과 기술 스택 선정 과정을 공유했다.

**핵심 요약**
- ✅ React Native로 iOS/Android 동시 개발
- ✅ Node.js + Socket.io로 실시간 통신
- ✅ Agora SDK로 WebRTC 영상 통화
- ✅ 6개 무료 서비스 조합으로 $0/월 운영

백엔드 기술 선정은 프론트엔드 개발자 입장에서 낯설었지만, 검색과 공식 문서를 통해 하나씩 해결했다. 다음 글에서는 본격적으로 Node.js 백엔드를 세팅하는 과정을 담을 예정이다.

**궁금한 점이나 피드백은 댓글로 남겨달라.** 🙌

---

**태그**: `React Native` `Node.js` `WebRTC` `Agora` `영상 통화 앱` `무료 인프라` `Socket.io` `Prisma` `MVP 개발` `스타트업`
