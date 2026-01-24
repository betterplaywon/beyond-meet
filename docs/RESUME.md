# Beyond Meet - 이력서용 기술 요약

## 프로젝트 개요

### Project: Beyond Meet

**프로젝트 기간:** 2024.11.06 ~ 2025.01.14

**기술 스택:** React Native 0.82, React 19, TypeScript, Zustand, React Query 5, Socket.io, Node.js, Express 5, Prisma 6, Supabase, Agora WebRTC

**개발 인원:** 1인 (풀스택)

**서비스:** 실시간 랜덤 매칭 및 WebRTC 화상 통화를
제공하는 1:1 비디오 데이팅 앱.
AI 콘텐츠 모더레이션 시스템 통합,
$0/월 인프라로 베타 운영 중

---

# 이력서용 기술 요약

## UI/기능 구현

### 1. Agora SDK 기반 WebRTC 영상 통화 구현

React Native 환경에서 Agora SDK를 활용하여 P2P 영상 통화 시스템을 구현했습니다. `RtcSurfaceView`로 PIP 방식 이중 화면을 구성하고, Platform별 비디오 인코더 및 네이티브 권한 처리를 적용하여 5분간 안정적인 화상 통화를 제공합니다.

### 2. AI 기반 실시간 콘텐츠 모더레이션 시스템

Agora `takeSnapshot` API와 Hugging Face NSFW Detection을 결합하여 통화 중 부적절한 콘텐츠를 실시간 탐지하는 시스템을 구현했습니다. 신뢰도 기반 조치 시스템(경고/강제 종료)과 Race Condition 방지 로직으로 Hugging Face 무료 한도 내 안정적 운영을 달성했습니다.

### 3. Socket.io 기반 실시간 매칭 시스템

WebSocket으로 실시간 매칭 상태를 동기화하고, 서버 사이드 주기적 매칭 알고리즘(10초 주기)과 결합하여 평균 10~20초 내 매칭을 제공합니다. 12개 Socket 이벤트 설계, 2분 타임아웃 처리, 연결 상태 UI로 UX 일관성을 확보했습니다.

## 시스템 설계

### 4. Axios Interceptor 기반 자동 토큰 갱신

JWT 토큰 만료 시 자동 재발급 및 요청 재시도 로직을 구현했습니다. Request/Response Interceptor 패턴으로 모든 요청에 토큰 자동 추가, `_retry` 플래그로 무한 루프 방지, 토큰 갱신 실패 시 전역 로그아웃 처리를 적용했습니다.

### 5. Prisma Serializable Transaction으로 Race Condition 방지

베타 20명 제한 환경에서 동시 가입 요청 시 제한 초과를 방지하기 위해 Prisma Serializable Isolation Level 트랜잭션을 적용했습니다. 동시 요청 부하 테스트에서 정확히 제한 인원까지만 가입을 허용합니다.

### 6. Controller-Service 패턴 백엔드 아키텍처

비즈니스 로직을 서비스 레이어로 분리하여 유지보수성과 테스트 용이성을 확보했습니다. 8개 도메인(auth, user, match, call, friends, admin, moderation, push)을 명확히 분리하고, Zod 스키마 기반 입력 검증과 일관된 응답 포맷을 적용했습니다.

### 7. React Query 캐싱 최적화

서버 상태 관리를 React Query로 전환하고, Query Key Factory 패턴으로 계층적 캐시 관리를 구현했습니다. Stale Time 설정과 Mutation 후 선택적 Invalidation으로 화면 전환 시 불필요한 재조회를 제거하여 네트워크 요청 약 40% 감소를 달성했습니다.

## 개발 생산성/DX 개선

### 8. React Native CLI iOS/Android 플랫폼 관리

React Native 0.82 업그레이드 후 발생한 iOS 모듈 충돌 문제를 Podfile `post_install` 훅 8단계 자동화 스크립트로 해결했습니다. Android SDK 버전 통일, 환경 변수 플랫폼 분기(`Platform.select`)로 양 플랫폼 안정적 빌드 환경을 구축했습니다.

### 9. 6개 무료 티어 서비스 통합 ($0/월 운영)

Supabase, Upstash, Agora, Firebase, Hugging Face, Render 등 6개 무료 티어 서비스를 통합하여 월 $0 인프라 비용으로 프로덕션급 환경을 구축했습니다. 베타 20명 기준 사용량 계산 및 한도 80% 도달 시 알림 설정으로 안정적 운영을 보장합니다.

## 풀스택 역량 확장

### 10. 첫 백엔드 개발 경험

웹 프론트엔드 개발자에서 Node.js/Express 서버 구현까지 경험하며 풀스택 역량을 확장했습니다. Prisma ORM 스키마 설계, JWT 인증 플로우, Socket.io 실시간 통신, 6개 외부 서비스 통합을 학습하고 적용했습니다.
