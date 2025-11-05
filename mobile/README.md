# Beyond Meet - React Native 앱

WebRTC 기반 1:1 영상 통화 데이팅 앱의 프론트엔드 (iOS/Android)

## 🎯 프로젝트 정보

- **플랫폼**: iOS, Android
- **프레임워크**: React Native 0.82
- **언어**: TypeScript
- **상태 관리**: Zustand + React Query
- **네비게이션**: React Navigation v6

## 📁 폴더 구조

```
mobile/
├── android/              # Android 네이티브 코드
├── ios/                  # iOS 네이티브 코드
├── src/
│   ├── @types/          # TypeScript 타입 정의
│   ├── api/             # API 클라이언트 및 엔드포인트
│   ├── components/      # 재사용 가능한 컴포넌트
│   │   └── common/      # Button, Input, Avatar 등
│   ├── config/          # 환경 변수 및 설정
│   ├── hooks/           # Custom Hooks (useAuth 등)
│   ├── navigation/      # 네비게이션 설정
│   ├── screens/         # 화면 컴포넌트
│   │   ├── auth/        # 인증 화면
│   │   ├── home/        # 홈 화면
│   │   ├── friends/     # 친구 목록
│   │   └── profile/     # 프로필
│   ├── store/           # Zustand stores
│   ├── styles/          # 디자인 시스템 (theme.ts)
│   └── utils/           # 유틸리티 함수
├── App.tsx              # 앱 진입점
└── package.json
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. iOS 설정 (Mac만 가능)

```bash
cd ios && pod install && cd ..
```

### 3. 환경 변수 설정

`src/config/env.ts` 파일에서 API URL을 설정하세요:

```typescript
export const ENV = {
  API_BASE_URL: 'http://localhost:3000/api',  // 백엔드 URL
  AGORA_APP_ID: '',  // Agora App ID (나중에 추가)
};
```

### 4. 앱 실행

#### iOS
```bash
npm run ios
```

#### Android
```bash
npm run android
```

## 🎨 디자인 시스템

디자인 시스템은 [src/styles/theme.ts](src/styles/theme.ts)에 정의되어 있습니다.

### 컬러 팔레트

```typescript
colors = {
  primary: '#FF6B6B',      // 코랄 레드
  secondary: '#4ECDC4',    // 민트 그린
  accent: '#FFE66D',       // 옐로우
  background: '#F7F7F7',   // 라이트 그레이
  surface: '#FFFFFF',      // 화이트
  // ...
}
```

### 타이포그래피

- **H1**: 32px, Bold
- **H2**: 24px, Bold
- **H3**: 20px, SemiBold
- **Body1**: 16px, Regular
- **Body2**: 14px, Regular

## 📦 주요 패키지

### 상태 관리
- **zustand**: 가벼운 상태 관리 (Redux 대체)
- **@tanstack/react-query**: 서버 상태 관리 및 캐싱

### 네비게이션
- **@react-navigation/native**: 네비게이션
- **@react-navigation/stack**: 스택 네비게이션
- **@react-navigation/bottom-tabs**: 탭 네비게이션

### UI/UX
- **react-native-toast-message**: 토스트 메시지
- **react-native-safe-area-context**: Safe Area 처리

### 네트워킹
- **axios**: HTTP 클라이언트

## 🏗️ 주요 기능

### ✅ 완료된 기능

1. **인증 시스템**
   - 스플래시 화면
   - 웰컴 화면
   - 로그인/회원가입
   - JWT 토큰 관리
   - 자동 로그인

2. **디자인 시스템**
   - 공통 컴포넌트 (Button, Input, Avatar)
   - 테마 시스템 (colors, typography, spacing)
   - 반응형 레이아웃

3. **네비게이션**
   - 인증 스택
   - 메인 탭 (홈, 친구, 프로필)

4. **메인 화면**
   - 홈 화면 (랜덤 매칭 버튼)
   - 친구 목록
   - 프로필 화면

### 🚧 TODO

1. **영상 통화**
   - Agora SDK 통합
   - 영상 통화 화면
   - 통화 컨트롤 (음소거, 카메라 전환 등)

2. **매칭 시스템**
   - 랜덤 매칭 로직
   - 선택 매칭 (친구에게 통화 요청)
   - 매칭 대기 화면

3. **기타**
   - 프로필 편집
   - 설정 화면
   - 통화 기록
   - 푸시 알림

## 🔧 개발 가이드

### 새로운 화면 추가

1. `src/screens/` 에 새 폴더 및 파일 생성
2. `src/@types/index.ts` 에 네비게이션 타입 추가
3. 해당 네비게이터에 Screen 추가

### 새로운 API 추가

1. `src/api/` 에 API 파일 생성 (예: `user.api.ts`)
2. `src/hooks/` 에 React Query hook 생성 (예: `useUser.ts`)

### 새로운 Store 추가

1. `src/store/` 에 Zustand store 생성 (예: `userStore.ts`)
2. 필요한 컴포넌트에서 사용

## 📝 코딩 컨벤션

### TypeScript

```typescript
// ✅ 타입 정의
interface User {
  id: string;
  nickname: string;
}

// ✅ 함수형 컴포넌트
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  // ...
};

// ❌ any 사용 지양
const data: any = {}; // 피하세요
```

### 스타일링

```typescript
// ✅ StyleSheet 사용
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

// ❌ 인라인 스타일 지양
<View style={{ flex: 1 }} />
```

## 🐛 문제 해결

### Metro Bundler 오류

```bash
npm start -- --reset-cache
```

### iOS 빌드 실패

```bash
cd ios && pod install && cd ..
npm run ios
```

### Android 빌드 실패

```bash
cd android && ./gradlew clean && cd ..
npm run android
```

## 📚 참고 자료

- [React Native 공식 문서](https://reactnative.dev)
- [Zustand 문서](https://zustand-demo.pmnd.rs)
- [React Query 문서](https://tanstack.com/query)
- [React Navigation 문서](https://reactnavigation.org)

## 👥 팀

- **프로젝트**: Beyond Meet
- **개발 기간**: 2025-11-04 ~ 2025-12-24 (50일)

---

**문서 작성일**: 2025-11-05
