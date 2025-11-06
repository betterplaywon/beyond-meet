# 개발 일정표 (50일)

## WebRTC 기반 영상 통화 데이팅 앱

---

## 📋 문서 정보

- **작성일**: 2025-11-04
- **프로젝트 기간**: 50일 (2025-11-04 ~ 2025-12-24)
- **대상**: 개발팀 전체
- **업데이트 주기**: 주 1회

---

## 📅 전체 일정 개요

| 단계         | 기간          | 일수 | 주요 목표                |
| ------------ | ------------- | ---- | ------------------------ |
| **Week 1-2** | 11/04 ~ 11/17 | 14일 | 기획 및 환경 설정        |
| **Week 3-4** | 11/18 ~ 12/01 | 14일 | 백엔드 핵심 개발         |
| **Week 5-6** | 12/02 ~ 12/15 | 14일 | 프론트엔드 핵심 개발     |
| **Week 7**   | 12/16 ~ 12/22 | 7일  | 통합, 테스트, 버그 수정  |
| **Week 8**   | 12/23 ~ 12/24 | 2일  | 스토어 출시 준비 및 제출 |

**총 개발 기간**: 50일

---

## 🗓️ Week 1-2: 기획 및 환경 설정 (14일)

### **Day 1-3 (11/04 ~ 11/06): PRD 확정 및 디자인 준비**

#### Day 1 (11/04 월)

- [x] PRD 문서 작성 완료
- [x] ARCHITECTURE 문서 작성 완료
- [ ] PRD 검토 및 이해관계자 승인 요청
- [ ] 기술 스택 최종 확정

#### Day 2 (11/05 화)

- [ ] Figma 프로젝트 생성
- [ ] 주요 화면 와이어프레임 스케치
  - [ ] 로그인/회원가입
  - [ ] 홈 화면
  - [ ] 영상 통화 화면
- [ ] 색상 팔레트 확정

#### Day 3 (11/06 수)

- [ ] 전체 화면 와이어프레임 완성
- [ ] 사용자 플로우 다이어그램 작성
- [ ] 아이콘 및 에셋 리스트 작성

---

### **Day 4-7 (11/07 ~ 11/10): 개발 환경 설정**

#### Day 4 (11/07 목)

- [ ] React Native CLI 프로젝트 생성
  ```bash
  npx react-native init DatingApp --template react-native-template-typescript
  ```
- [ ] 기본 폴더 구조 설정 (`src/`, `components/`, `screens/` 등)
- [ ] Git 저장소 생성 (GitHub)
- [ ] `.gitignore` 설정

#### Day 5 (11/08 금)

- [ ] TypeScript 설정 (`tsconfig.json`)
- [ ] ESLint, Prettier 설정
- [ ] React Navigation 설치 및 기본 구조
- [ ] Zustand 설치 및 Store 설정

#### Day 6 (11/09 토)

- [ ] 필수 라이브러리 설치
  - [ ] `react-native-agora`
  - [ ] `@react-native-firebase/app`
  - [ ] `@react-native-firebase/messaging`
  - [ ] `react-native-image-picker`
  - [ ] `socket.io-client`
  - [ ] `axios`
- [ ] iOS Podfile 업데이트 (`cd ios && pod install`)

#### Day 7 (11/10 일)

- [ ] 환경 변수 설정 (`.env`)
- [ ] Android 권한 설정 (`AndroidManifest.xml`)
- [ ] iOS 권한 설정 (`Info.plist`)
- [ ] 테스트 빌드 (iOS/Android)

---

### **Day 8-11 (11/11 ~ 11/14): 백엔드 기본 설정**

#### Day 8 (11/11 월)

- [ ] Render.com 계정 생성
- [ ] 백엔드 Node.js 프로젝트 생성
  ```bash
  mkdir backend && cd backend
  npm init -y
  ```
- [ ] TypeScript, Express 설치
- [ ] 기본 폴더 구조 설정

#### Day 9 (11/12 화)

- [ ] Supabase 계정 생성 및 PostgreSQL 프로젝트 설정
- [ ] Prisma 설치 및 초기화
  ```bash
  npx prisma init
  ```
- [ ] Prisma Schema 작성 (User, MatchSession 등)
- [ ] 첫 마이그레이션 실행
  ```bash
  npx prisma migrate dev --name init
  ```

#### Day 10 (11/13 수)

- [ ] Upstash Redis 계정 생성 및 연결 테스트
- [ ] Express 서버 기본 구조 (`app.ts`, `server.ts`)
- [ ] 미들웨어 설정 (cors, helmet, morgan)
- [ ] Health Check 엔드포인트 (`/health`)

#### Day 11 (11/14 목)

- [ ] Render.com에 백엔드 배포 테스트
- [ ] 환경 변수 설정 (Render 대시보드)
- [ ] UptimeRobot 설정 (슬립 모드 방지)
- [ ] 배포 확인 (`https://your-app.onrender.com/health`)

---

### **Day 12-14 (11/15 ~ 11/17): Agora 및 Firebase 설정**

#### Day 12 (11/15 금)

- [ ] Agora 계정 생성
- [ ] Agora Console에서 프로젝트 생성
- [ ] App ID 및 App Certificate 발급
- [ ] 백엔드에 `agora-token` 라이브러리 설치
- [ ] 토큰 생성 함수 테스트

#### Day 13 (11/16 토)

- [ ] Firebase 프로젝트 생성
- [ ] iOS 앱 등록 (Bundle ID)
- [ ] Android 앱 등록 (Package Name)
- [ ] `google-services.json` 다운로드 (Android)
- [ ] `GoogleService-Info.plist` 다운로드 (iOS)

#### Day 14 (11/17 일)

- [ ] Firebase Cloud Messaging (FCM) 설정
- [ ] 푸시 알림 테스트 (디바이스)
- [ ] Week 1-2 회고 및 진행 상황 점검
- [ ] 다음 주 계획 확정

---

## 🗓️ Week 3-4: 백엔드 핵심 개발 (14일)

### **Day 15-18 (11/18 ~ 11/21): 사용자 인증 API**

#### Day 15 (11/18 월)

- [ ] JWT 유틸리티 함수 작성 (`jwt.util.ts`)
- [ ] bcrypt 해싱 함수 작성 (`hash.util.ts`)
- [ ] Auth Service 구현 (`auth.service.ts`)
  - [ ] `register()` 메서드
  - [ ] `login()` 메서드

#### Day 16 (11/19 화)

- [ ] Auth Controller 구현 (`auth.controller.ts`)
  - [ ] `POST /api/auth/register`
  - [ ] `POST /api/auth/login`
- [ ] 입력 검증 (Zod or express-validator)
- [ ] 에러 핸들링 미들웨어

#### Day 17 (11/20 수)

- [ ] Refresh Token 로직 구현
  - [ ] `POST /api/auth/refresh`
- [ ] 로그아웃 API (`POST /api/auth/logout`)
- [ ] Auth 미들웨어 (`auth.middleware.ts`)
  - [ ] JWT 토큰 검증
  - [ ] `req.user` 설정

#### Day 18 (11/21 목)

- [ ] 비밀번호 재설정 API (선택)
  - [ ] `POST /api/auth/forgot-password`
  - [ ] `POST /api/auth/reset-password`
- [ ] Postman/Insomnia로 API 테스트
- [ ] 단위 테스트 작성 (Jest)

---

### **Day 19-22 (11/22 ~ 11/25): 사용자 관리 API**

#### Day 19 (11/22 금)

- [ ] User Service 구현 (`user.service.ts`)
  - [ ] `getUserById()`
  - [ ] `updateUser()`
  - [ ] `getUserFriends()`
- [ ] User Controller 구현
  - [ ] `GET /api/users/:id`
  - [ ] `PUT /api/users/:id`

#### Day 20 (11/23 토)

- [ ] Supabase Storage 설정 (프로필 사진)
- [ ] 파일 업로드 API
  - [ ] `POST /api/users/:id/photos`
- [ ] Multer 또는 Supabase Storage SDK 사용
- [ ] 이미지 리사이징 (선택)

#### Day 21 (11/24 일)

- [ ] 친구 관리 API
  - [ ] `POST /api/users/:id/friends` (친구 추가)
  - [ ] `DELETE /api/users/:id/friends/:friendId` (친구 삭제)
  - [ ] `GET /api/users/:id/friends` (친구 목록)
- [ ] 차단 API
  - [ ] `POST /api/users/:id/block` (차단)
  - [ ] `DELETE /api/users/:id/block/:blockedId` (차단 해제)

#### Day 22 (11/25 월)

- [ ] 온라인 상태 관리 (Redis)
  - [ ] 사용자 접속 시 `user:{id}:online` 설정
  - [ ] 주기적 heartbeat 처리
- [ ] API 테스트 및 버그 수정

---

### **Day 23-25 (11/26 ~ 11/28): Agora 토큰 생성 서비스**

#### Day 23 (11/26 화)

- [ ] Agora Service 구현 (`agora.service.ts`)
  - [ ] `generateRtcToken(channelName, uid)`
  - [ ] `generateChannelName()`
- [ ] Agora Controller 구현
  - [ ] `POST /api/agora/token`

#### Day 24 (11/27 수)

- [ ] 토큰 발급 로직 테스트
- [ ] 채널명 고유성 보장 (타임스탬프 + 랜덤)
- [ ] 토큰 만료 시간 설정 (1시간)

#### Day 25 (11/28 목)

- [ ] Agora Console에서 통화 테스트
- [ ] 토큰 검증 및 디버깅
- [ ] API 문서화

---

### **Day 26-28 (11/29 ~ 12/01): 매칭 시스템 API**

#### Day 26 (11/29 금)

- [ ] Match Service 구현 (`match.service.ts`)
  - [ ] `findRandomMatch(userId)`
  - [ ] `isMatchCompatible()` (필터링 로직)
  - [ ] `createMatchSession()`

#### Day 27 (11/30 토)

- [ ] 랜덤 매칭 API
  - [ ] `POST /api/match/random`
- [ ] Redis 매칭 대기열 구현
  - [ ] `matching:queue` Set 사용
- [ ] 매칭 성공 시 세션 생성

#### Day 28 (12/01 일)

- [ ] 선택 매칭 API
  - [ ] `POST /api/match/direct`
- [ ] 매칭 취소 API
  - [ ] `DELETE /api/match/:sessionId`
- [ ] Week 3-4 회고 및 점검

---

## 🗓️ Week 5-6: 프론트엔드 핵심 개발 (14일)

### **Day 29-31 (12/02 ~ 12/04): 인증 UI**

#### Day 29 (12/02 월)

- [ ] 스플래시 화면 구현 (`SplashScreen.tsx`)
- [ ] 웰컴 화면 구현 (`WelcomeScreen.tsx`)
- [ ] 로그인 화면 UI (`LoginScreen.tsx`)

#### Day 30 (12/03 화)

- [ ] 회원가입 화면 Step 1 (이메일, 비밀번호)
- [ ] 회원가입 화면 Step 2 (닉네임, 생년월일, 성별)
- [ ] 회원가입 화면 Step 3 (프로필 사진)

#### Day 31 (12/04 수)

- [ ] React Hook Form + Zod 검증 연동
  - [ ] `login()` thunk
  - [ ] `register()` thunk
- [ ] 로그인/회원가입 API 연동
- [ ] 권한 요청 화면 (카메라, 마이크, 알림)

---

### **Day 32-35 (12/05 ~ 12/08): 프로필 관리 UI**

#### Day 32 (12/05 목)

- [ ] 프로필 화면 구현 (`ProfileScreen.tsx`)
- [ ] 내 정보 표시 (사진, 닉네임, 나이, 국가)
- [ ] 설정 버튼 추가

#### Day 33 (12/06 금)

- [ ] 프로필 편집 화면 (`EditProfileScreen.tsx`)
- [ ] 사진 업로드 기능 (`react-native-image-picker`)
  - [ ] 갤러리에서 선택
  - [ ] 카메라로 촬영
- [ ] 닉네임, 자기소개 수정

#### Day 34 (12/07 토)

- [ ] 설정 화면 (`SettingsScreen.tsx`)
- [ ] 매칭 필터 설정 화면
  - [ ] 성별 (고정)
  - [ ] 나이 범위 슬라이더
  - [ ] 국가 선택 (멀티 선택)
- [ ] 알림 설정 토글

#### Day 35 (12/08 일)

- [ ] 프로필 업데이트 API 연동
- [ ] 사진 업로드 API 연동
- [ ] 테스트 (iOS/Android)

---

### **Day 36-38 (12/09 ~ 12/11): 매칭 UI**

#### Day 36 (12/09 월)

- [ ] 홈 화면 구현 (`HomeScreen.tsx`)
- [ ] "랜덤 매칭" 대형 버튼
- [ ] 탭 네비게이션 (Home, Friends, Profile)

#### Day 37 (12/10 화)

- [ ] 친구 목록 화면 (`FriendsListScreen.tsx`)
- [ ] 친구 카드 컴포넌트 (사진, 닉네임, 온라인 상태)
- [ ] 친구 프로필 상세 화면
- [ ] 통화 요청 버튼

#### Day 38 (12/11 수)

- [ ] 매칭 대기 화면 (`MatchingScreen.tsx`)
- [ ] 로딩 애니메이션
- [ ] 매칭 취소 버튼
- [ ] Socket.io 클라이언트 연결 (`socketService.ts`)
- [ ] 실시간 매칭 이벤트 수신

---

### **Day 39-42 (12/12 ~ 12/15): 영상 통화 UI (Agora 통합)**

#### Day 39 (12/12 목)

- [ ] Agora SDK 설치 확인
- [ ] iOS 네이티브 설정 (Info.plist, Podfile)
- [ ] Android 네이티브 설정 (AndroidManifest.xml, build.gradle)
- [ ] Agora Custom Hook 구현 (`useAgora.ts`)

#### Day 40 (12/13 금)

- [ ] 영상 통화 화면 레이아웃 (`VideoCallScreen.tsx`)
- [ ] 상대방 영상 (전체 화면)
- [ ] 내 영상 (PIP)
- [ ] 컨트롤 버튼 배치

#### Day 41 (12/14 토)

- [ ] 통화 기능 구현
  - [ ] `joinChannel()` 함수
  - [ ] `leaveChannel()` 함수
  - [ ] 마이크 음소거/해제
  - [ ] 비디오 끄기/켜기
  - [ ] 카메라 전환 (전면 ↔ 후면)

#### Day 42 (12/15 일)

- [ ] 배경 블러 기능 (`enableVirtualBackground()`)
- [ ] 통화 타이머 구현 (5분 제한)
- [ ] 통화 종료 처리
- [ ] 통화 수신 화면 (`IncomingCallScreen.tsx`)
- [ ] Week 5-6 회고

---

## 🗓️ Week 7: 통합, 테스트, 버그 수정 (7일)

### **Day 43-45 (12/16 ~ 12/18): 통합 및 엔드투엔드 테스트**

#### Day 43 (12/16 월)

- [ ] 전체 플로우 테스트 1: 회원가입 → 로그인 → 프로필 설정
- [ ] 전체 플로우 테스트 2: 랜덤 매칭 → 영상 통화 → 통화 종료
- [ ] 전체 플로우 테스트 3: 친구 추가 → 선택 매칭 → 통화

#### Day 44 (12/17 화)

- [ ] Socket.io 실시간 통신 테스트
  - [ ] 매칭 요청/수락/거절
  - [ ] 통화 요청/수락/거절
- [ ] 푸시 알림 테스트 (앱 백그라운드/종료 상태)
- [ ] 다양한 네트워크 환경 테스트 (WiFi, 4G, 3G)

#### Day 45 (12/18 수)

- [ ] 다양한 디바이스 테스트
  - [ ] iOS (최소 2종): iPhone 14, iPhone SE
  - [ ] Android (최소 2종): Galaxy S23, 저사양 기기
- [ ] 크래시 발생 여부 확인
- [ ] Sentry 에러 로그 검토

---

### **Day 46-47 (12/19 ~ 12/20): 버그 수정 및 최적화**

#### Day 46 (12/19 목)

- [ ] 발견된 버그 리스트 작성
- [ ] 우선순위 설정 (P0, P1, P2)
- [ ] P0 버그 수정 (크래시, 통화 실패 등)
- [ ] P1 버그 수정 (UI 깨짐, 성능 이슈)

#### Day 47 (12/20 금)

- [ ] 성능 최적화
  - [ ] 앱 로딩 시간 단축
  - [ ] 메모리 사용량 최적화
  - [ ] 이미지 압축 및 캐싱
- [ ] UI/UX 개선
  - [ ] 로딩 스피너 추가
  - [ ] 에러 메시지 개선
  - [ ] 토스트 메시지 일관성

---

### **Day 48-49 (12/21 ~ 12/22): 스토어 출시 준비**

#### Day 48 (12/21 토)

- [ ] App Icon 제작 (1024x1024px)
- [ ] Launch Screen 디자인
- [ ] 스크린샷 촬영 (iOS/Android 각 5장)
  - [ ] 로그인 화면
  - [ ] 홈 화면
  - [ ] 매칭 화면
  - [ ] 영상 통화 화면
  - [ ] 프로필 화면

#### Day 49 (12/22 일)

- [ ] 앱 설명 작성 (한국어/영어)
- [ ] 키워드 선정
- [ ] 개인정보 처리방침 웹페이지 작성 (Notion or GitHub Pages)
- [ ] 이용약관 웹페이지 작성
- [ ] 프로모션 비디오 촬영 (선택)

---

## 🗓️ Week 8: 스토어 제출 (2일)

### **Day 50 (12/23 ~ 12/24): 스토어 제출**

#### Day 50-1 (12/23 월)

- [ ] **iOS App Store 제출**
  - [ ] Xcode Archive 빌드
  - [ ] App Store Connect 업로드
  - [ ] 메타데이터 입력
    - [ ] 앱 이름
    - [ ] 부제목
    - [ ] 설명
    - [ ] 스크린샷
    - [ ] 개인정보 처리방침 URL
    - [ ] 지원 URL
  - [ ] TestFlight 테스트 (선택)
  - [ ] 심사 요청

#### Day 50-2 (12/24 화)

- [ ] **Google Play Store 제출**

  - [ ] Android AAB 빌드
  - [ ] Google Play Console 업로드
  - [ ] 메타데이터 입력
    - [ ] 앱 제목
    - [ ] 간단한 설명
    - [ ] 자세한 설명
    - [ ] 스크린샷
    - [ ] 개인정보 처리방침 URL
  - [ ] 콘텐츠 등급 설정
  - [ ] 프로덕션 트랙 출시

- [ ] 🎉 **축하합니다! 50일 개발 완료 및 스토어 제출 완료!**

---

## 📊 진행 상황 추적

### 주간 체크리스트

| Week | 목표 달성률 | 주요 완료 항목 | 이슈 |
| ---- | ----------- | -------------- | ---- |
| 1-2  | \_\_%       |                |      |
| 3-4  | \_\_%       |                |      |
| 5-6  | \_\_%       |                |      |
| 7    | \_\_%       |                |      |
| 8    | \_\_%       |                |      |

### 마일스톤

- [ ] **M1 (Day 14)**: 환경 설정 완료
- [ ] **M2 (Day 28)**: 백엔드 API 완료
- [ ] **M3 (Day 42)**: 프론트엔드 핵심 기능 완료
- [ ] **M4 (Day 47)**: 통합 테스트 및 버그 수정 완료
- [ ] **M5 (Day 50)**: 스토어 제출 완료

---

## ⚠️ 위험 요소 및 대응

### 위험 요소

1. **Agora 통합 복잡도**

   - 예상 지연: 2~3일
   - 대응: Day 39-42에 집중 투입, 필요 시 Day 48-49에서 시간 확보

2. **iOS/Android 플랫폼별 이슈**

   - 예상 지연: 1~2일
   - 대응: 조기 테스트, 플랫폼별 조건부 처리

3. **앱스토어 리젝션**
   - 예상: 첫 제출 시 리젝션 가능성 40~60%
   - 대응: 12/25 이후 2주간 수정 및 재제출

### 버퍼 타임

- Week 7에 3일 버퍼 포함
- 실제 필요 시 P2 기능 과감히 제거

---

## 📝 Daily Standup 템플릿

매일 아침 진행 상황 공유:

```
**날짜**: YYYY-MM-DD
**이름**: [개발자 이름]

**어제 완료한 작업**:
- [ ] 작업 1
- [ ] 작업 2

**오늘 계획**:
- [ ] 작업 1
- [ ] 작업 2

**블로커**:
- 없음 / [이슈 설명]
```

---

## 🎯 출시 후 계획

### Week 9-10 (12/25 ~ 01/07)

- [ ] 앱스토어 심사 대응
- [ ] 리젝션 시 수정 및 재제출
- [ ] 초기 사용자 피드백 수집
- [ ] 긴급 버그 수정

### Phase 2 (출시 후 1~2개월)

- [ ] 신고/차단 기능 추가
- [ ] 부적절한 콘텐츠 AI 감지
- [ ] 사용자 검증 배지
- [ ] 관리자 대시보드

---

## ✅ 완료 조건 (Definition of Done)

각 작업 항목은 다음 조건을 만족해야 "완료"로 간주:

1. **코드 작성 완료**
2. **로컬 테스트 통과**
3. **코드 리뷰 완료** (팀이 있는 경우)
4. **Git 커밋 및 푸시**
5. **관련 문서 업데이트**

---

## 📞 연락처 및 리소스

### 중요 링크

- **GitHub Repo**: [링크 입력]
- **Figma**: [링크 입력]
- **Render Dashboard**: [링크 입력]
- **Agora Console**: https://console.agora.io
- **Firebase Console**: https://console.firebase.google.com
- **Supabase Dashboard**: [링크 입력]

### 긴급 연락처

- **프로젝트 매니저**: [이름 및 연락처]
- **CTO**: [이름 및 연락처]
- **디자이너**: [이름 및 연락처]

---

**문서 끝**

**화이팅! 🚀**
