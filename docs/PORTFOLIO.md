# Beyond Meet - 포트폴리오 상세 내용

## 프로젝트 개요

**Beyond Meet** - WebRTC 기반 1:1 비디오 데이팅 앱

**프로젝트 진행 일정**: 2024.11 ~ 2025.01 (약 50일)

**기술 스택**:
- **Mobile (React Native)**: React Native 0.82, React 19, TypeScript, Zustand, React Query 5, Socket.io-client 4.8, react-native-agora 4.5
- **Backend (Node.js)**: Express 5, TypeScript, Prisma 6.18, Socket.io 4.8, JWT, Zod 4.1
- **Infrastructure**: Supabase (PostgreSQL + Storage), Upstash Redis, Agora WebRTC, Firebase FCM, Hugging Face AI, Render

**개발 인원**: 1인 (풀스택)

**서비스 설명**: 실시간 랜덤 매칭 및 WebRTC 화상 통화 기능을 제공하는 모바일 데이팅 앱. AI 기반 콘텐츠 모더레이션 시스템 통합. 비공개 베타 테스트 진행 중 (20명 초대 코드 시스템, $0/월 인프라 운영).

---

# 포트폴리오용 상세 설명

---

## UI/기능 구현

---

### 1. Agora SDK 기반 WebRTC 영상 통화 구현

사용 기술: React Native 0.82, react-native-agora 4.5, TypeScript

🚩 배경 및 목표
WebRTC는 P2P 영상 통화를 구현하는 표준 기술이지만, NAT Traversal, STUN/TURN 서버 구성, 네트워크 변화 대응 등 복잡한 저수준 처리가 필요합니다. 직접 구현 시 개발 기간이 2배 이상 소요될 것으로 예상되어, React Native 공식 지원 + 월 10,000분 무료 제공 + 글로벌 CDN의 Agora SDK를 선택했습니다.

⚙ 작업 내용

- **Agora Engine 초기화**: `createAgoraRtcEngine`으로 RTC 엔진 초기화, `ChannelProfileCommunication` 모드로 채널 참가
- **이벤트 핸들러 등록**: `onJoinChannelSuccess`, `onUserJoined`, `onUserOffline`, `onSnapshotTaken` 등 상태 변화 감지
- **비디오 렌더링**: `RtcSurfaceView`로 로컬/리모트 영상 표시, 리모트는 전체 화면, 로컬은 우측 상단 PIP (120x160)
- **플랫폼별 설정**: iOS는 Info.plist 권한 설정, Android는 `PermissionsAndroid.requestMultiple`로 런타임 권한 요청 + 비디오 인코더 설정 (640x480@15fps)
- **실시간 컨트롤**: 마이크/비디오 토글(`muteLocalAudioStream`, `muteLocalVideoStream`), 카메라 전환(`switchCamera`)

✅ 성과

- 5분간 안정적인 화상 통화 제공 (최대 통화 시간 300초 제한)
- 네트워크 환경 변화 (WiFi ↔ LTE 전환) 시에도 Agora 자동 복구로 끊김 없는 통화 유지
- 로컬 테스트에서 평균 200ms 이하의 낮은 레이턴시 확인

---

### 2. AI 기반 실시간 콘텐츠 모더레이션 시스템

사용 기술: Agora takeSnapshot API, Hugging Face Inference API, RNFS, Socket.io

🚩 배경 및 목표
비디오 데이팅 서비스 특성상 부적절한 콘텐츠 노출 위험이 높아 실시간 모니터링이 필수입니다. 수동 모더레이션은 베타 단계에서 불가능하고, 자체 AI 모델 개발은 시간과 비용이 과도하여 Hugging Face의 `Falconsai/nsfw_image_detection` 모델(월 30,000 요청 무료)을 선택했습니다.

⚙ 작업 내용

- **프레임 캡처 방식 전환**: 초기 `react-native-view-shot` 사용 시 RtcSurfaceView 네이티브 렌더링 계층과 충돌로 캡처 실패 → Agora SDK의 `takeSnapshot` API로 전환
- **비동기 캡처 처리**: Promise 패턴으로 `onSnapshotTaken` 콜백 래핑, 5초 타임아웃 설정
- **신뢰도 기반 조치 시스템**: 신뢰도 < 0.3 정상 진행, 0.3-0.6 Socket.io로 경고 전송 + 모달 표시, ≥ 0.6 통화 강제 종료 + 자동 신고
- **리소스 관리**: 4초 주기 캡처 → Base64 변환 → API 전송 → RNFS로 임시 파일 삭제
- **Race Condition 방지**: `isCallEndedRef`로 통화 종료 상태 즉시 체크, Alert 대기 중 불필요한 캡처 방지

✅ 성과

- Hugging Face 무료 한도(30k req/month) 내에서 실시간 모더레이션 운영
- 4초 주기 캡처로 월 평균 사용량 약 15,000 요청 (한도의 50%)
- 로컬 테스트에서 부적절한 콘텐츠 감지 시 1~2초 이내 경고 표시 확인

---

### 3. Socket.io 기반 실시간 매칭 시스템

사용 기술: Socket.io, React Native, Zustand, Agora Token

🚩 배경 및 목표
랜덤 매칭 시스템은 실시간 양방향 통신이 필수입니다. HTTP Polling은 네트워크 오버헤드가 크고, SSE는 단방향이라 매칭 취소 등 클라이언트 이벤트 처리 불가. Socket.io는 WebSocket 위에 자동 재연결, 이벤트 기반 API, 네임스페이스/룸 기능을 제공하여 선택했습니다.

⚙ 작업 내용

- **매칭 플로우**: 클라이언트 `match:request` 이벤트 → 서버 매칭 큐 추가 → 10초마다 큐 순회, 성별/연령/국가 필터로 페어링 → 매치 성공 시 Agora 채널 생성 + RTC 토큰 발급 → `match:found` 이벤트로 양측 전달
- **12개 Socket 이벤트 설계**: Client→Server 7개, Server→Client 5개 (match, call, moderation, friend 도메인)
- **타임아웃 처리**: 2분 경과 시 매칭 취소 + Toast 알림
- **Socket 연결 상태 UI**: `socket.isConnected()` 실시간 표시로 네트워크 문제 인지 가능
- **useSocketEvent 커스텀 훅**: Socket 이벤트 리스너를 컴포넌트 라이프사이클과 연동

✅ 성과

- 평균 10~20초 내 매칭 성공 (2명 동시 매칭 요청 시)
- Socket.io 자동 재연결 기능으로 네트워크 변화에도 안정적인 매칭 유지
- 로컬 테스트에서 동시 매칭 요청 20건 처리 성공

---

## 시스템 설계

---

### 4. Axios Interceptor 기반 자동 토큰 갱신

사용 기술: Axios, Zustand, JWT, React Query

🚩 배경 및 목표
JWT 기반 인증에서 Access Token은 보안을 위해 1시간 유효 기간을 가지므로, 앱 사용 중 토큰 만료 시 401 에러 발생. 매번 로그인 화면으로 이동시키면 UX가 크게 저하되고, 각 API 호출마다 토큰 갱신 로직 중복 구현 시 코드 복잡도 증가.

⚙ 작업 내용

- **Request Interceptor**: Zustand의 `useAuthStore`에서 `accessToken`을 읽어 모든 요청에 `Bearer` 헤더 자동 추가
- **Response Interceptor**: 401 에러 감지 시 `refreshToken`으로 `/auth/refresh` 요청 → 새 토큰 Zustand 저장 → 실패한 원본 요청 재시도
- **무한 루프 방지**: `originalRequest._retry` 플래그로 첫 번째 요청만 토큰 갱신
- **에러 파싱 헬퍼**: `parseApiError`로 Axios 에러를 사용자 친화적 메시지로 변환
- **전역 에러 핸들러**: 토큰 갱신 실패 시 React Query 전역 핸들러에서 로그아웃 처리

✅ 성과

- 토큰 만료를 사용자가 인지하지 못하는 seamless한 UX 제공
- 각 API 함수에서 토큰 관리 로직 중복 제거, 코드 간결성 확보
- 로컬 테스트에서 1시간 사용 중 자동 토큰 갱신 정상 작동 확인

---

### 5. Prisma Serializable Transaction으로 Race Condition 방지

사용 기술: Prisma ORM, PostgreSQL, TypeScript

🚩 배경 및 목표
베타 단계에서 20명 사용자 제한을 두고 있지만, 동시에 여러 사용자가 회원가입 시도 시 `user.count()` 체크와 `user.create()` 사이의 시간 차로 제한 초과 가능성 발생. 데이터 정합성 문제이자 베타 전략의 핵심 요구사항.

⚙ 작업 내용

- **Serializable Isolation Level 적용**: Prisma의 `$transaction` 메서드에 `{ isolationLevel: 'Serializable' }` 옵션 추가
- **동작 방식**: 트랜잭션 간 완전한 격리 보장, 동시 트랜잭션이 순차적으로 실행된 것과 동일한 결과 제공
- **PostgreSQL SSI**: Serializable Snapshot Isolation 알고리즘으로 충돌 감지 시 재시도
- **트레이드오프 판단**: Serializable은 가장 느린 격리 수준이지만, 베타 환경에서 초당 1~2건 회원가입 예상으로 성능보다 정합성 우선

✅ 성과

- 동시 요청 부하 테스트(30명 동시 가입 시도) 결과, 정확히 20명까지만 가입 허용
- 데이터 정합성 100% 보장, 베타 전략 요구사항 충족
- 향후 결제 중복 방지, 재고 관리 등에 동일 패턴 활용 가능

---

### 6. Controller-Service 패턴 백엔드 아키텍처

사용 기술: Express 5, TypeScript, Zod, Prisma

🚩 배경 및 목표
초기 백엔드 구현 시 모든 로직을 컨트롤러에 작성하면 코드 중복 발생, 테스트 어려움, 비즈니스 로직 변경 시 여러 파일 수정 필요. 처음 백엔드를 구현하면서 유지보수 가능한 구조 설계 필요.

⚙ 작업 내용

- **얇은 컨트롤러**: 요청 파라미터 추출 + 서비스 호출 + 응답 포맷팅만 담당
- **서비스 레이어**: 모든 비즈니스 로직, DB 쿼리, 외부 API 호출 처리 (함수형 접근)
- **Zod 입력 검증**: 컨트롤러 진입 시점에 스키마 검증, `formatZodError`로 사용자 친화적 에러 메시지
- **일관된 응답 포맷**: `{ success: true, data: {...} }` / `{ success: false, error: {...} }`
- **전역 에러 핸들러**: `AppError` 클래스로 상태 코드 + 에러 코드 + 메시지 통합 관리

✅ 성과

- 8개 도메인(auth, user, match, call, friends, admin, moderation, push) 명확히 분리
- 코드 재사용성 향상 (예: `getUserMatchInfo`를 match-controller와 socket-handler에서 공통 사용)
- 새로운 기능 추가 시 서비스만 구현 후 컨트롤러에서 연결하는 방식으로 빠른 개발 가능

---

### 7. React Query 캐싱 최적화

사용 기술: TanStack React Query 5, TypeScript, Zustand

🚩 배경 및 목표
초기 구현 시 `useEffect`에서 직접 API 호출하면 화면 전환마다 동일 데이터 재조회로 네트워크 비용과 서버 부하 증가. 로딩 상태, 에러 처리, 재시도 로직 매번 중복 구현 필요.

⚙ 작업 내용

- **Query Key Factory 패턴**: `queryKeys.profile.me()`, `queryKeys.friends.list(userId)` 등 계층적 구조로 중앙 관리
- **계층적 무효화**: `invalidateQueries({ queryKey: ['profile'] })` 호출 시 모든 프로필 쿼리 무효화
- **Stale Time 설정**: 프로필 5분, 친구 목록 3분, 통화 기록 1분 캐시 유지
- **Mutation 후 선택적 Invalidation**: 프로필 수정 시 `queryKeys.profile.me()`만 무효화
- **placeholderData**: 이전 데이터 유지하며 백그라운드 갱신으로 깜빡임 방지

✅ 성과

- 화면 전환 시 불필요한 재조회 제거
- 네트워크 요청 약 40% 감소 (개발 환경 Chrome DevTools 측정)
- 로딩 상태, 에러 처리 중복 코드 제거

---

## 개발 생산성/DX 개선

---

### 8. React Native CLI iOS/Android 플랫폼 관리

사용 기술: React Native CLI, CocoaPods, Gradle, TypeScript

🚩 배경 및 목표
React Native는 네이티브 코드를 추상화하지만, 각 플랫폼의 빌드 시스템(iOS: Xcode + CocoaPods, Android: Gradle)은 개별 관리 필요. 특히 Agora SDK, Firebase 등 네이티브 모듈 통합 시 플랫폼별 의존성 충돌, 빌드 설정 불일치 문제 발생.

⚙ 작업 내용

- **iOS 모듈 충돌 해결**: React Native 0.82 업그레이드 후 `React-RuntimeCore`와 `React-jsitooling` 모듈 간 네임스페이스 충돌 발생
- **Podfile post_install 훅 8단계 스크립트**: modulemap 파일 수정, 중복 모듈 삭제, `-Xcc` 플래그 중복 제거, xcconfig 파일 정리
- **Android SDK 버전 통일**: compileSdk 36, targetSdk 36, minSdk 24, Kotlin 2.1.20 통일
- **환경 변수 플랫폼 분기**: `Platform.select`로 iOS는 `localhost:5000`, Android는 `10.0.2.2:5000` (에뮬레이터 호스트)

✅ 성과

- iOS/Android 양 플랫폼에서 안정적인 빌드 및 실행 환경 구축
- `pod install` 시마다 자동 수정 적용으로 일관된 빌드 환경 유지
- 플랫폼별 환경 변수 자동 분기로 개발/프로덕션 환경 관리 간소화

---

### 9. 6개 무료 티어 서비스 통합 ($0/월 운영)

사용 기술: Supabase, Upstash, Agora, Firebase, Hugging Face, Render

🚩 배경 및 목표
베타 단계에서 인프라 비용 최소화하면서 프로덕션급 환경 구축 필요. AWS/GCP는 무료 티어가 제한적이고 베타 종료 후 비용 급증 가능. 각 서비스의 무료 한도를 정확히 파악하고 20명 베타 기준으로 충분한 서비스만 선정.

⚙ 작업 내용

- **서비스 선정 기준**: 무료 한도 충분성(20명 베타 + 2배 여유), 프로덕션 전환 가능성, 개발자 친화성, 안정성(Uptime SLA 99%+)
- **통합 서비스**: Supabase (500MB DB, 1GB Storage), Upstash (10k commands/day), Agora (10k min/month), Firebase FCM (unlimited), Hugging Face (30k req/month), Render (750 hours/month)
- **비용 절감 전략**: AI 모더레이션 4초 주기 캡처(3초→4초로 25% 요청 감소), Render Keep-alive 스크립트(GitHub Actions 5분마다 헬스 체크)
- **모니터링**: 각 서비스 대시보드에서 주간 사용량 체크, 한도 80% 도달 시 알림 설정

✅ 성과

- 월 $0 인프라 비용으로 베타 서비스 운영
- 프로덕션급 환경 구축 경험 (DB, 캐시, WebRTC, AI, 호스팅 모두 포함)
- 향후 유료 전환 시 비용 예측 가능

---

## 풀스택 역량 확장

---

### 10. 첫 백엔드 개발 경험

사용 기술: Node.js, Express 5, Prisma ORM, Socket.io, JWT, TypeScript

🚩 배경 및 목표
4년차 웹 프론트엔드 개발자로서 React, TypeScript, 상태 관리는 익숙했지만 백엔드 개발 경험 부재. Beyond Meet 프로젝트를 통해 풀스택 개발자로 성장하고, 실제 유저가 사용할 서비스를 처음부터 끝까지 구현하고자 함.

⚙ 작업 내용

- **Node.js/Express 서버 구조 이해**: 미들웨어 체인 개념, 라우팅 구조, `next()` 함수로 미들웨어 연결
- **Prisma ORM 스키마 설계**: ERD 설계(9개 모델), 관계 설정(1:N, N:M, Self-referencing), 인덱스 최적화
- **JWT 인증 플로우 구현**: Access Token(1시간) + Refresh Token(7일) 이중 구조, 토큰 검증 미들웨어
- **Socket.io 실시간 통신 설계**: 이벤트 기반 아키텍처, Socket Authentication, Room 개념 활용
- **AI 도움 활용**: DB 인덱싱, Redis 캐싱 전략은 Claude 제안 코드를 분석하고 학습하는 방식으로 진행

✅ 성과

- 백엔드 개발 기초 역량 확보 (Node.js, Express, Prisma, Socket.io, JWT)
- 프론트엔드-백엔드 간 협업 이해도 향상
- 6개 외부 서비스 통합 경험
- 1인 풀스택 프로젝트 완수 경험 (기획 → 설계 → 개발 → 배포)
