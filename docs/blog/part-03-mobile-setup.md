# 영상 데이팅 앱 만들기 #3 - React Native 프로젝트 초기 세팅과 iOS/Android 빌드

> **이전 글 요약**: Part 2에서는 Node.js + TypeScript 백엔드 프로젝트를 초기화하고, Express 서버 기본 구조를 만들었다. Controller-Service 패턴, Helmet 보안, Graceful Shutdown 등을 구현했다.

이번 글에서는 **React Native 모바일 앱 프로젝트를 처음부터 구축**한다.

---

## 📌 이번 파트에서 다룰 내용

- React Native CLI로 프로젝트 생성
- TypeScript 설정
- 폴더 구조 설계 (screens, components, navigation, services, hooks, store)
- iOS 개발 환경 (Xcode, CocoaPods)
- Android 개발 환경 (Android Studio, Gradle)
- 환경변수 관리 (개발/프로덕션 분리)
- 첫 화면 구현 및 시뮬레이터 실행

---

## 💡 왜 React Native인가?

### React Native 선택 이유

```
✅ 단일 코드베이스로 iOS/Android 동시 개발 (개발 시간 50% 절감)
✅ JavaScript/TypeScript 사용 (백엔드와 언어 통일)
✅ Hot Reload로 빠른 개발 사이클
✅ 풍부한 라이브러리 생태계 (Agora, Firebase, React Navigation)
✅ Native 기능 접근 가능 (카메라, 마이크, 푸시 알림)
```

### React Native vs 다른 옵션

| 기준 | React Native | Flutter | Native (Swift/Kotlin) |
|------|-------------|---------|---------------------|
| 개발 속도 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 성능 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 라이브러리 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 학습 곡선 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

Beyond Meet 프로젝트는 **빠른 MVP 개발**이 목표였기 때문에 React Native가 최적이었다.

---

## 🤔 React Native CLI vs Expo - CLI를 선택한 이유

React Native 프로젝트를 시작할 때 가장 먼저 마주하는 선택지가 있다: **React Native CLI vs Expo**.

Expo를 사용하면 훨씬 빠른 개발이 가능해보였다. QR 코드 하나로 즉시 앱을 테스트하고, 복잡한 네이티브 설정 없이 시작할 수 있다는 점은 매력적이었다.

하지만 프로젝트 고려사항을 정리해보았을 때, **CLI를 사용해야만 하는 꽤나 크리티컬한 이유들**이 존재했다.

### 선택의 기준: Beyond Meet 프로젝트 요구사항

Beyond Meet은 **WebRTC 기반 1:1 영상 통화**가 핵심 기능이다. 이를 위해 필요한 것들을 나열해보면:

```typescript
// 프로젝트에서 반드시 필요한 핵심 라이브러리들
{
  "react-native-agora": "^4.x",           // WebRTC 영상 통화
  "@react-native-firebase/messaging": "*", // FCM 푸시 알림
  "react-native-vision-camera": "*",       // 카메라 접근
  "@notifee/react-native": "*"            // 로컬 알림
}
```

### 왜 Expo가 아닌 CLI를 선택했는가?

#### 1. **WebRTC (Agora) - Expo Dev Client의 현실적 한계**

Agora는 WebRTC 영상 통화를 위한 핵심 SDK다. [공식 문서](https://www.agora.io/en/blog/building-a-video-calling-app-using-the-agora-sdk-on-expo-react-native/)를 확인해보니 **Expo Dev Client로도 사용 가능**하다.

하지만 여기에는 중요한 전제 조건이 있다:

```bash
# Expo Go로는 불가능 → 커스텀 빌드 필수
npx expo run:ios  # Xcode 필요
npx expo run:android  # Android Studio 필요
```

**결국 Expo의 최대 장점인 "QR 코드 스캔으로 즉시 테스트"를 사용할 수 없다.** 커스텀 빌드가 필요하다면 React Native CLI와 개발 경험이 거의 동일하다.

더 나아가 Agora는 **네이티브 레벨의 세밀한 권한 설정**이 필요하다:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<!-- Agora에서 요구하는 네이티브 권한 -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.INTERNET" />
```

Expo의 Config Plugin 방식으로도 가능하지만, **복잡한 네이티브 설정이 필요할 때 직접 제어할 수 있는 CLI가 더 안정적**이라고 판단했다.

#### 2. **복잡한 네이티브 설정의 직접 제어 선호**

Beyond Meet은 영상 통화 요청이 왔을 때 **로컬 알림**을 표시해야 한다. 앱이 백그라운드에 있을 때도 "OO님이 통화를 요청했습니다" 알림을 띄워야 한다.

| 라이브러리 | Expo Go | Expo Dev Client | React Native CLI |
|-----------|---------|-----------------|------------------|
| @notifee/react-native | ❌ | ✅ ([Config Plugin](https://notifee.app/react-native/docs/installation/)) | ✅ |
| react-native-agora | ❌ | ✅ (커스텀 빌드 필수) | ✅ |
| react-native-vision-camera | ❌ | ✅ (Config Plugin) | ✅ |

Expo Dev Client로도 모두 사용 가능하다. 하지만 **커스텀 빌드가 필요**하고, 복잡한 네이티브 설정(FCM, Agora, Notifee 동시 사용)을 Config Plugin으로 추상화하는 것보다 **네이티브 코드를 직접 제어하는 것이 디버깅과 최적화에 유리**하다고 판단했다.

특히 WebRTC 영상 통화는 성능에 민감하므로, 필요시 네이티브 레이어를 직접 수정할 수 있는 환경이 중요했다.

#### 3. **학습 목적: 네이티브 레이어 경험**

2025년 현재 [React Native 팀은 Expo를 공식 권장](https://dev.to/wafa_bergaoui/expo-or-react-native-cli-in-2025-lets-settle-this-cl1)하고 있으며, 많은 프로덕션 앱들이 Expo를 채택하고 있다.

하지만 **학습 관점**에서 CLI를 선택했다:

- **네이티브 코드 이해**: Xcode, Android Studio, Gradle, CocoaPods 등 네이티브 빌드 도구 경험
- **복잡한 네이티브 기능**: 기존 네이티브 앱에 RN 통합, 커스텀 네이티브 모듈 작성 등의 시나리오 대비
- **성능 최적화 경험**: WebRTC처럼 성능에 민감한 기능에서 네이티브 레이어 직접 튜닝 가능

Beyond Meet은 단순한 MVP가 아니라, **네이티브 레이어까지 이해하고 제어하는 실무 역량**을 쌓기 위한 프로젝트다. 포트폴리오로도 활용할 것이기 때문에, 네이티브 빌드 전 과정을 경험하는 것이 더 가치 있다고 판단했다.

#### 4. **Expo Dev Client의 트레이드오프**

"그럼 Expo Dev Client를 쓰면 되지 않나?"라는 생각도 들었다. Expo Dev Client는 Expo Go의 제약을 넘어서 커스텀 네이티브 모듈을 사용할 수 있게 해준다.

하지만 **현실은 다르다**:

```bash
# Expo Dev Client를 사용하려면
eas build --profile development  # 클라우드 빌드 (유료 크레딧 소모)
# 또는
npx expo run:ios  # 로컬 빌드 (결국 Xcode 필요 → CLI와 동일)
```

**문제점**:
1. **빌드 복잡도**: Expo의 최대 장점인 "즉시 테스트"가 사라짐. Dev Client는 커스텀 빌드가 필요하므로 Xcode/Android Studio 설정이 필요
2. **Config Plugin 의존**: 모든 네이티브 모듈이 Expo 플러그인을 지원하는 건 아님 (Notifee처럼)
3. **업데이트 타이밍 지연**: 새로운 React Native 버전 출시 → Expo SDK 업데이트까지 보통 2-3개월 지연
4. **디버깅 복잡도**: Expo의 추상화 레이어 때문에 네이티브 크래시 디버깅이 어려움

**결론**: Expo Dev Client는 Expo Go와 CLI의 "중간 지대"를 노리지만, **실무에서는 양쪽 극단이 더 명확한 장점을 제공**한다.

- 빠른 프로토타이핑 → 순수 Expo Go
- 복잡한 네이티브 기능 → 순수 React Native CLI

Beyond Meet은 후자에 해당한다.

### CLI 선택의 트레이드오프

물론 CLI를 선택하면서 포기한 것들도 있다:

| 항목 | Expo | React Native CLI |
|------|------|------------------|
| 초기 설정 | QR 코드 스캔으로 즉시 테스트 | Xcode/Android Studio 설치 필요 |
| OTA 업데이트 | 기본 제공 (Expo Updates) | 별도 구현 필요 (CodePush) |
| 빌드 시간 | 빠름 (JavaScript만) | 느림 (네이티브 코드 컴파일) |
| 학습 곡선 | 낮음 | 높음 (네이티브 빌드 에러 트러블슈팅) |

하지만 **Beyond Meet의 핵심 기능(WebRTC 영상 통화)을 구현하기 위해서는 CLI가 거의 필수**였다.

### 최종 선택: React Native CLI

정리하면, CLI를 선택한 이유는 세 가지다:

1. **커스텀 빌드 필수 상황**: Expo Dev Client로도 구현 가능하지만, 어차피 Xcode/Android Studio 설정이 필요하다면 CLI의 장점이 더 크다
2. **네이티브 코드 직접 제어**: WebRTC 성능 최적화, 복잡한 네이티브 설정을 Config Plugin 추상화 없이 직접 관리
3. **학습 목적**: 네이티브 빌드 도구, 네이티브 모듈 작성 등 풀스택 모바일 개발 역량 강화

**참고**: 2025년 현재 [React Native 팀은 Expo를 공식 권장](https://medium.com/react-native-journal/expo-vs-react-native-cli-in-2025-which-one-should-you-choose-7badd45e5fa7)하고 있으며, 대부분의 프로덕션 앱에서 Expo로 충분하다.

다만 Beyond Meet은 **WebRTC 성능 최적화**와 **네이티브 레이어 학습**이라는 명확한 목표가 있었기 때문에 CLI를 선택했다. 빠른 프로덕션 배포가 목표라면 Expo가 더 나은 선택일 수 있다.

---

## 🛠️ Step 1: React Native CLI 프로젝트 생성

### 1-1. 사전 준비 (macOS 기준)

**필수 도구 설치**:

```bash
# Homebrew 설치 (이미 설치되어 있다면 스킵)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 설치 (20.x LTS 권장)
# 이유: React Native는 JavaScript로 작성되며, Metro bundler가 Node.js 환경에서 실행됨
brew install node@20

# Watchman 설치 (파일 변경 감지)
# 이유: 파일 시스템 변경을 효율적으로 감지하여 Fast Refresh 성능 향상
brew install watchman

# CocoaPods 설치 (iOS 의존성 관리)
# 이유: React Native의 iOS 네이티브 모듈들을 관리하는 표준 도구 (Swift/Objective-C 라이브러리 의존성 해결)
sudo gem install cocoapods
```

**버전 확인**:

```bash
node --version   # v20.x.x
npm --version    # v10.x.x
watchman --version
pod --version    # 1.x.x
```

### 1-2. React Native CLI로 프로젝트 생성

```bash
cd beyond-meet
npx react-native init BeyondMeet --template react-native-template-typescript
```

**생성된 폴더 구조**:

```
BeyondMeet/
├── android/          # Android 네이티브 코드
├── ios/              # iOS 네이티브 코드
├── src/              # React Native 소스 코드 (우리가 작업할 곳)
├── App.tsx           # 앱 엔트리 포인트
├── package.json      # 의존성 관리
├── tsconfig.json     # TypeScript 설정
├── babel.config.js   # Babel 설정
└── metro.config.js   # Metro bundler 설정
```

### 1-3. 프로젝트 이름 변경 (선택)

```bash
# 생성된 폴더를 mobile로 이름 변경
mv BeyondMeet mobile
cd mobile
```

최종 구조:
```
beyond-meet/
├── backend/    # Part 2에서 만든 백엔드
└── mobile/     # 이번에 만든 모바일 앱
```

---

## 📦 Step 2: 필수 패키지 설치

### 2-1. 핵심 라이브러리 설치

```bash
# 네비게이션
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler

# 상태 관리
npm install zustand @tanstack/react-query

# HTTP 통신
npm install axios socket.io-client

# 스토리지
npm install @react-native-async-storage/async-storage

# 환경변수
npm install react-native-config
npm install react-native-dotenv --save-dev

# 유틸리티
npm install date-fns
```

### 2-2. 주요 라이브러리 설명

| 라이브러리 | 용도 | 왜 선택했는가? |
|-----------|------|--------------|
| `@react-navigation` | 화면 네비게이션 | React Native 표준 라이브러리로 Stack, Tab 네비게이션 제공. TypeScript 타입 지원이 우수하고 커뮤니티가 활발함 |
| `zustand` | 클라이언트 상태 관리 | Redux보다 간단한 API로 보일러플레이트가 적음. 인증 상태, 통화 상태 등 앱 전역 상태를 관리하는데 효율적 |
| `@tanstack/react-query` | 서버 상태 관리 | API 응답 자동 캐싱, 백그라운드 리페치, 낙관적 업데이트 제공. 서버 데이터와 클라이언트 상태를 분리하여 관리 복잡도 감소 |
| `axios` | HTTP 요청 | fetch API보다 편리한 인터셉터 제공 (JWT 토큰 자동 추가). 타임아웃, 에러 핸들링이 간편하고 직관적 |
| `socket.io-client` | 실시간 통신 | 백엔드 Socket.io와 완벽 호환. 랜덤 매칭, 영상 통화 시작 등 실시간 이벤트 처리에 필수 |
| `react-native-config` | 환경변수 | .env 파일의 환경변수를 iOS/Android 네이티브 코드에서도 접근 가능. 개발/프로덕션 환경 분리에 필수 |
| `@react-native-async-storage` | 로컬 스토리지 | JWT 토큰, 사용자 설정 등을 안전하게 저장. iOS Keychain, Android SharedPreferences 기반의 암호화된 저장소 |

**현재 프로젝트 버전**:
- `react-native`: 0.82.1
- `react`: 19.1.1
- `typescript`: 5.8.3

---

## 📁 Step 3: 폴더 구조 설계

### 3-1. src 폴더 생성 및 구조화

```bash
mkdir -p src/{screens,components,navigation,services,hooks,store,api,constants,styles,config,utils,types}
```

### 3-2. 최종 폴더 구조

```
mobile/src/
├── screens/          # 화면 컴포넌트 (기능별 폴더)
│   ├── auth/         # 로그인, 회원가입
│   ├── home/         # 홈 화면
│   ├── match/        # 매칭 화면
│   ├── call/         # 영상 통화 화면
│   ├── profile/      # 프로필 화면
│   └── friends/      # 친구 목록
├── components/       # 재사용 가능한 UI 컴포넌트
│   ├── common/       # Button, Input, Avatar 등
│   ├── call/         # CallControls, CallTimer 등
│   └── moderation/   # ModerationWarningModal 등
├── navigation/       # React Navigation 설정
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── MainNavigator.tsx
├── services/         # 외부 서비스 연동
│   ├── api.ts        # Axios 인스턴스
│   ├── socketService.ts  # Socket.io 클라이언트
│   └── pushService.ts    # Firebase FCM
├── hooks/            # 커스텀 훅
│   ├── useAuth.ts
│   ├── useSocket.ts
│   └── usePushNotifications.ts
├── store/            # Zustand 상태 관리
│   ├── authStore.ts  # 인증 상태
│   └── callStore.ts  # 통화 상태
├── api/              # API 호출 함수
│   ├── auth.api.ts
│   └── client.ts
├── constants/        # 상수
│   └── queryKeys.ts  # React Query 키
├── styles/           # 디자인 시스템
│   └── theme.ts      # 색상, 간격, 타이포그래피
├── config/           # 설정
│   └── env.ts        # 환경변수 관리
├── utils/            # 유틸리티 함수
└── types/            # TypeScript 타입 정의
    └── index.ts
```

### 3-3. 왜 이렇게 구조화했는가?

**기능별 폴더링 (Feature-based)**:
- `screens/auth/`: 인증 관련 화면 모음 (로그인, 회원가입, 초대코드)
- `screens/call/`: 통화 관련 화면 모음 (영상 통화, 통화 대기)
- **장점**: 기능 추가/제거 시 폴더 단위로 관리하여 코드 응집도 향상. 예를 들어 친구 기능을 제거하려면 `screens/friends/` 폴더만 삭제하면 됨

**관심사 분리 (Separation of Concerns)**:
- `components/`: UI만 담당하는 재사용 컴포넌트 (Button, Avatar, Modal 등)
- `hooks/`: 비즈니스 로직만 담당 (useAuth, useSocket). UI와 로직을 분리하여 테스트 용이성 향상
- `services/`: 외부 서비스 통신 (API, Socket, FCM). 네트워크 레이어를 추상화하여 변경에 유연

**왜 store와 api를 분리했는가?**:
- `store/`: 클라이언트 전역 상태 (로그인 여부, 현재 통화 상태 등 앱 내부 상태)
- `api/`: 서버 통신 함수 (HTTP 요청). React Query와 결합하여 서버 상태 자동 동기화

이 구조는 **테스트 가능성**, **유지보수성**, **확장성**을 모두 고려한 설계입니다.

---

## ⚙️ Step 4: TypeScript 설정

### 4-1. tsconfig.json

React Native CLI가 자동 생성한 기본 설정을 사용한다:

```json
{
  "extends": "@react-native/typescript-config",
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["**/node_modules", "**/Pods"]
}
```

**`@react-native/typescript-config`가 포함하는 설정**:
- `strict: true`: 엄격한 타입 체크로 런타임 에러 사전 방지 (`null`, `undefined` 체크 강제)
- `jsx: "react-native"`: JSX 문법을 React Native 방식으로 컴파일
- `moduleResolution: "node"`: Node.js 스타일의 모듈 해석 (npm 패키지 자동 탐색)

**왜 TypeScript를 사용하는가?**
- **타입 안전성**: API 응답, 함수 파라미터의 타입 오류를 컴파일 시점에 발견
- **자동 완성**: IDE에서 객체 프로퍼티, 함수 시그니처 자동 완성으로 개발 속도 향상
- **리팩토링 안전성**: 타입이 보장되므로 코드 변경 시 영향 범위 파악 용이

### 4-2. Path Alias 설정 (선택)

더 깔끔한 import를 위해 alias 추가 가능:

**tsconfig.json 수정**:
```json
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**babel.config.js에도 추가 필요**:
```bash
npm install babel-plugin-module-resolver --save-dev
```

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
        },
      },
    ],
  ],
};
```

**사용 예시**:
```typescript
// Before
import { Button } from '../../../components/common/Button';

// After (with alias)
import { Button } from '@/components/common/Button';
```

---

## 🔐 Step 5: 환경변수 관리

### 5-1. react-native-dotenv 설정

**왜 환경변수 관리가 필요한가?**
- 개발 환경에서는 로컬 서버 (`localhost:5000`)를 사용하고, 프로덕션에서는 실제 서버 주소를 사용해야 함
- API 키, Agora App ID 등 민감한 정보를 코드에 하드코딩하지 않고 `.env` 파일로 분리하여 보안 강화
- Git에 `.env` 파일을 올리지 않아 API 키 유출 방지 (`.gitignore`에 추가)

**babel.config.js**:

```javascript
module.exports = api => {
  const isProduction = api.env('production');

  const plugins = [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: isProduction ? '.env.production' : '.env.development',
        safe: false,
        allowUndefined: true,
      },
    ],
  ];

  // 프로덕션 빌드에서 console.* 제거
  if (isProduction) {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins,
  };
};
```

**주요 포인트**:
- 개발/프로덕션 환경별 `.env` 파일 분리 (개발: 로컬 서버, 프로덕션: 실제 서버)
- 프로덕션에서 `console.log` 자동 제거 (앱 번들 크기 감소, 성능 향상)
- Babel 빌드 시점에 환경변수를 코드에 주입하여 런타임 오버헤드 없음

### 5-2. .env 파일 생성

**`.env.development`**:

```bash
# API Base URL (iOS: localhost, Android: 10.0.2.2)
API_BASE_URL_IOS=http://localhost:5000
API_BASE_URL_ANDROID=http://10.0.2.2:5000

# Agora WebRTC
AGORA_APP_ID=your-agora-app-id
```

**`.env.production`**:

```bash
# API Base URL (실제 서버 주소)
API_BASE_URL=https://beyond-meet.onrender.com

# Agora WebRTC
AGORA_APP_ID=your-agora-app-id
```

**왜 iOS와 Android URL이 다른가?**

이는 각 플랫폼의 가상 머신 네트워크 구조 차이 때문이다:

- **iOS 시뮬레이터**: 호스트 컴퓨터의 네트워크 스택을 공유. 따라서 `localhost`로 호스트 컴퓨터 접근 가능
- **Android 에뮬레이터**: 독립된 가상 머신에서 실행되어 `localhost`는 에뮬레이터 자신을 가리킴
  - 호스트 컴퓨터 접근: Android가 제공하는 특수 IP `10.0.2.2` 사용 (호스트 컴퓨터의 루프백)
  - 실제 디바이스 테스트 시에는 Wi-Fi에서 호스트 컴퓨터의 실제 IP (예: `192.168.0.100:5000`) 사용

### 5-3. env.ts 중앙 관리

**`src/config/env.ts`**:

```typescript
import { Platform } from 'react-native';
import {
  API_BASE_URL_IOS,
  API_BASE_URL_ANDROID,
  API_BASE_URL,
  AGORA_APP_ID,
} from '@env';

/**
 * 필수 환경 변수 검증
 */
const requireEnvVar = (value: string | undefined, name: string): string => {
  if (!value || value.trim() === '') {
    throw new Error(
      `❌ Missing required environment variable: ${name}\n` +
        `Please check your .env file and ensure ${name} is properly set.`,
    );
  }
  return value;
};

export const ENV = {
  // API Base URL (플랫폼별 분기)
  API_BASE_URL: __DEV__
    ? Platform.select({
        ios: requireEnvVar(API_BASE_URL_IOS, 'API_BASE_URL_IOS'),
        android: requireEnvVar(API_BASE_URL_ANDROID, 'API_BASE_URL_ANDROID'),
      })!
    : requireEnvVar(API_BASE_URL, 'API_BASE_URL'),

  // Agora App ID
  AGORA_APP_ID: requireEnvVar(AGORA_APP_ID, 'AGORA_APP_ID'),

  // 기타 설정
  TIMEOUT: 10000, // 10초
  MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 5MB
};

// 개발 환경에서 설정 출력
if (__DEV__) {
  console.log('📱 [ENV] Configuration loaded:');
  console.log(`  Platform: ${Platform.OS}`);
  console.log(`  API URL: ${ENV.API_BASE_URL}`);
}
```

**왜 env.ts로 중앙 관리하는가?**
- **환경변수 검증**: `requireEnvVar` 함수로 필수 환경변수 누락 시 앱 시작 단계에서 즉시 에러 발생 (런타임 에러 방지)
- **타입 안전성**: `ENV.API_BASE_URL`로 접근 시 IDE 자동 완성 지원, 오타 방지
- **플랫폼별 자동 분기**: `Platform.select`로 iOS/Android 환경에 따라 자동으로 올바른 URL 선택
- **중앙 집중화**: 환경변수를 한 곳에서 관리하여 변경 시 수정 포인트가 명확함

### 5-4. TypeScript 타입 정의

**`src/@types/env.d.ts`**:

```typescript
declare module '@env' {
  export const API_BASE_URL_IOS: string;
  export const API_BASE_URL_ANDROID: string;
  export const API_BASE_URL: string;
  export const AGORA_APP_ID: string;
}
```

---

## 📱 Step 6: iOS 개발 환경 설정

### 6-1. Xcode 설치

App Store에서 Xcode 설치 (무료, 약 12GB)

### 6-2. CocoaPods 의존성 설치

**CocoaPods란?**
Swift/Objective-C 프로젝트의 의존성 관리 도구 (JavaScript의 npm과 동일한 역할). React Native는 JavaScript로 작성되지만 iOS 네이티브 기능 (카메라, 마이크 등)에 접근하기 위해 네이티브 모듈이 필요하다.

```bash
cd ios
pod install
cd ..
```

**pod install이 하는 일**:
- `Podfile`에 정의된 React Native 네이티브 모듈 의존성을 설치 (예: Agora SDK, Firebase SDK)
- Xcode 프로젝트 설정 업데이트 (빌드 설정, 링커 플래그 자동 구성)
- `.xcworkspace` 파일 생성 (Xcode 워크스페이스. 여러 프로젝트를 하나로 묶어서 관리)

**주의**: 이후 Xcode에서는 `.xcworkspace` 파일을 열어야 한다 (`.xcodeproj` 아님). `.xcodeproj`만 열면 CocoaPods로 설치한 라이브러리를 찾지 못해 빌드 에러 발생.

### 6-3. iOS 시뮬레이터 실행

```bash
npm run ios
```

또는 특정 기기 지정:

```bash
npx react-native run-ios --simulator="iPhone 15 Pro"
```

**시뮬레이터 목록 확인**:

```bash
xcrun simctl list devices
```

### 6-4. Metro Bundler

**Metro란?**
React Native 전용 JavaScript 번들러. Webpack과 유사하지만 모바일 환경에 최적화되어 있다.

**Metro의 역할**:
- JavaScript 코드를 번들링하여 앱에 전달 (여러 `.js` 파일을 하나의 번들로 묶음)
- Fast Refresh 지원 (코드 변경 시 앱 전체를 재시작하지 않고 변경된 컴포넌트만 Hot Reload)
- 소스맵 생성으로 디버깅 시 원본 코드 위치 표시

첫 실행 시 Metro Bundler가 자동으로 시작된다:

```
               ######                ######
             ###     ####        ####     ###
            ##          ###    ###          ##
            ##             ####             ##
            ##             ####             ##
            ##           ##    ##           ##
            ##         ###      ###         ##
             ##  ########################  ##
          ######    ###            ###    ######
      ###     ##    ##              ##    ##     ###
   ###         ## ###      ####      ### ##         ###
  ##           ####      ########      ####           ##
 ##             ###     ##########     ###             ##
  ##           ####      ########      ####           ##
   ###         ## ###      ####      ### ##         ###
      ###     ##    ##              ##    ##     ###
          ######    ###            ###    ######
             ##  ########################  ##
            ##         ###      ###         ##
            ##           ##    ##           ##
            ##             ####             ##
            ##             ####             ##
            ##          ###    ###          ##
             ###     ####        ####     ###
               ######                ######

               Welcome to React Native!
                Learn once, write anywhere

To reload the app press "r"
To open developer menu press "d"
```

**개발 메뉴 단축키**:
- `r`: 앱 리로드
- `d`: 개발자 메뉴 열기

---

## 🤖 Step 7: Android 개발 환경 설정

### 7-1. Android Studio 설치

[Android Studio 다운로드](https://developer.android.com/studio)

**설치 시 포함되는 것**:
- Android SDK
- Android SDK Platform
- Android Virtual Device (AVD)

### 7-2. 환경변수 설정 (macOS)

**왜 환경변수 설정이 필요한가?**
React Native CLI가 Android SDK 도구들 (`adb`, `emulator` 등)을 찾기 위해 `ANDROID_HOME` 경로를 참조한다. 이를 설정하지 않으면 `npm run android` 실행 시 "SDK location not found" 에러 발생.

**~/.zshrc** (또는 ~/.bash_profile) 편집:

```bash
# Android SDK 홈 경로 설정
export ANDROID_HOME=$HOME/Library/Android/sdk
# 에뮬레이터 명령어 사용 가능하도록 PATH 추가
export PATH=$PATH:$ANDROID_HOME/emulator
# adb(Android Debug Bridge) 명령어 사용 가능하도록 PATH 추가
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

적용:

```bash
source ~/.zshrc
```

**확인**:
```bash
adb --version  # Android Debug Bridge version 확인
emulator -list-avds  # 생성된 에뮬레이터 목록 확인
```

### 7-3. Android 에뮬레이터 생성

Android Studio → Tools → Device Manager → Create Device

**권장 설정**:
- Device: Pixel 7 Pro
- System Image: Android 13 (API Level 33)
- RAM: 2GB

### 7-4. Android 앱 실행

**에뮬레이터 먼저 시작**:

```bash
emulator -avd Pixel_7_Pro_API_33
```

**앱 실행**:

```bash
npm run android
```

**빌드 성공 시**:

```
BUILD SUCCESSFUL in 45s
> Task :app:installDebug
Installing APK 'app-debug.apk' on 'Pixel_7_Pro_API_33(AVD) - 13'
Installed on 1 device.
```

---

## ✅ Step 8: 첫 화면 구현 및 테스트

### 8-1. App.tsx 수정

**`App.tsx`**:

```typescript
import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ENV } from './src/config/env';

function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Beyond Meet</Text>
        <Text style={styles.subtitle}>영상 데이팅 앱</Text>
        <Text style={styles.info}>API URL: {ENV.API_BASE_URL}</Text>
        <Text style={styles.info}>
          Environment: {__DEV__ ? 'Development' : 'Production'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 32,
  },
  info: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});

export default App;
```

### 8-2. Hot Reload 테스트

타이틀을 수정해보자:

```typescript
<Text style={styles.title}>Beyond Meet 🚀</Text>
```

파일 저장 → 앱이 자동으로 리로드된다!

---

## 🎯 현재까지 완성된 것

### 체크리스트

- [x] React Native 프로젝트 생성
- [x] TypeScript 설정
- [x] 폴더 구조 설계
- [x] 필수 라이브러리 설치
- [x] 환경변수 관리 (개발/프로덕션 분리)
- [x] iOS 개발 환경 설정 (CocoaPods)
- [x] Android 개발 환경 설정 (SDK, AVD)
- [x] 첫 화면 구현
- [x] iOS 시뮬레이터 실행 확인
- [x] Android 에뮬레이터 실행 확인

### 파일 구조

```
mobile/
├── src/
│   ├── config/
│   │   └── env.ts          ✅ 환경변수 관리
│   ├── @types/
│   │   └── env.d.ts        ✅ TypeScript 타입 정의
│   └── (기타 폴더들...)
├── App.tsx                 ✅ 앱 엔트리 포인트
├── .env.development        ✅ 개발 환경변수
├── .env.production         ✅ 프로덕션 환경변수
├── babel.config.js         ✅ Babel 설정 (dotenv 플러그인)
├── package.json            ✅ 의존성 관리
└── tsconfig.json           ✅ TypeScript 설정
```

---

## 🚨 자주 발생하는 에러와 해결법

### 에러 1: CocoaPods 설치 실패

**증상**:
```
[!] Unable to find a specification for ...
```

**원인**: CocoaPods 로컬 저장소(spec repo)가 오래되어 최신 라이브러리 정보를 찾지 못함

**해결**:
```bash
cd ios
pod install --repo-update  # CocoaPods 저장소 업데이트 후 설치
cd ..
```

**추가 해결법** (위 방법이 안 될 경우):
```bash
pod cache clean --all       # CocoaPods 캐시 삭제
rm -rf Pods Podfile.lock    # 기존 설치 파일 삭제
pod install                 # 재설치
```

### 에러 2: Metro Bundler 포트 충돌

**증상**:
```
Error: listen EADDRINUSE: address already in use :::8081
```

**원인**: 이전에 실행한 Metro Bundler 프로세스가 종료되지 않고 8081 포트를 점유 중. 또는 다른 프로그램이 해당 포트 사용 중.

**해결**:
```bash
# Metro 프로세스 강제 종료
lsof -ti:8081 | xargs kill -9

# 또는 다른 포트 사용
npx react-native start --port 8082
```

**근본 해결**: 터미널을 닫을 때 `Ctrl+C`로 Metro를 정상 종료하는 습관 들이기

### 에러 3: Android SDK 경로 오류

**증상**:
```
SDK location not found
```

**원인**: Gradle 빌드 시스템이 Android SDK 경로를 찾지 못함. 환경변수 `ANDROID_HOME`이 설정되지 않았거나, `local.properties` 파일이 없음.

**해결**:

**방법 1: `android/local.properties` 파일 생성**:
```
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

**방법 2: 환경변수 확인**:
```bash
echo $ANDROID_HOME  # 출력이 없으면 환경변수 미설정
```
환경변수가 없다면 Step 7-2 참고하여 `~/.zshrc`에 추가

### 에러 4: Xcode 버전 호환 문제

**증상**:
```
The iOS deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set to ...
```

**원인**: React Native 프로젝트의 최소 iOS 버전과 CocoaPods 라이브러리의 최소 iOS 버전이 불일치. 일부 라이브러리는 iOS 13 이상을 요구.

**해결**:

**`ios/Podfile` 수정**:
```ruby
platform :ios, '13.0'  # 최소 iOS 버전을 13.0으로 상향 (iOS 13 미만 기기는 앱 설치 불가)
```

그 후:
```bash
cd ios
pod install  # Podfile 변경 후 재설치
cd ..
```

**참고**: iOS 13은 2019년 출시. 현재 대부분의 기기가 iOS 13 이상을 사용하므로 문제없음.

---

## 💡 개발 팁

### Tip 1: Fast Refresh vs Live Reload

**Fast Refresh** (권장):
- 컴포넌트 상태를 유지하면서 UI만 업데이트 (예: 로그인 상태 유지한 채로 버튼 색상만 변경)
- React Hooks 상태도 보존되어 개발 속도 대폭 향상
- 기본 활성화

**Live Reload**:
- 앱 전체를 리로드하여 상태 초기화 (예: 로그인 상태 → 로그아웃)
- 네이티브 모듈 변경 시 필요 (Java/Kotlin, Swift/Objective-C 코드 수정)
- 개발자 메뉴(`d`)에서 활성화 가능

**실무 팁**: Fast Refresh로 작업하다가 이상하게 동작하면 앱을 완전히 재시작(Live Reload)해보자.

### Tip 2: Flipper 디버깅 도구

React Native 0.62+에 기본 포함. Facebook이 개발한 모바일 앱 디버깅 플랫폼.

**주요 기능**:
- **Network Inspector**: API 요청/응답 실시간 모니터링 (JWT 토큰, 응답 시간, 에러 확인)
- **Layout Inspector**: 컴포넌트 계층 구조 확인 (CSS 스타일 디버깅)
- **Crash Reporter**: 앱 크래시 로그 수집 및 분석
- **Redux DevTools**: 상태 변화 추적 (Redux 사용 시)

**로그 확인**:
```bash
npx react-native log-ios      # iOS 시뮬레이터 콘솔 로그
npx react-native log-android   # Android 에뮬레이터 Logcat
```

**왜 유용한가?**: 크롬 개발자 도구처럼 네트워크 요청, 컴포넌트 상태를 시각적으로 확인 가능. API 디버깅 시 필수 도구.

### Tip 3: React DevTools

**React DevTools란?**
React 컴포넌트 트리를 검사하고 props/state를 실시간으로 확인하는 도구. 웹 개발에서 사용하는 Chrome Extension의 독립 실행형 버전.

```bash
npm install -g react-devtools
react-devtools
```

앱 실행 후 개발자 메뉴(`d`) → "Toggle Inspector"

**활용법**:
- 컴포넌트 계층 구조 확인 (어떤 컴포넌트가 리렌더링되는지 파악)
- props, state 값 실시간 확인 및 수정 (디버깅 시 유용)
- 성능 프로파일링 (어떤 컴포넌트가 느린지 측정)

---

## 📚 다음 글 예고

**Part 4: 데이터베이스 설계와 Prisma ORM 설정**

다음 글에서는 백엔드로 돌아가서 PostgreSQL 데이터베이스를 설계한다.

다룰 내용:
- Supabase 프로젝트 생성 (무료 플랜)
- Prisma ORM 소개 및 설치
- 스키마 설계 (User, MatchSession, CallRecord 등 9개 모델)
- 데이터베이스 마이그레이션
- 초기 데이터 시딩 (초대 코드 BETA-0001 ~ BETA-0020)

---

## 📖 참고 자료

### 공식 문서
- [React Native 공식 문서](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query/latest)

### 추천 도구
- [React Native Directory](https://reactnative.directory/) - 라이브러리 검색
- [Expo Snack](https://snack.expo.dev/) - 온라인 에디터
- [Reactotron](https://github.com/infinitered/reactotron) - 디버깅 도구

---

## 💬 마치며

이 글에서는 React Native 모바일 앱 프로젝트를 처음부터 세팅했다.

**핵심 요약**:
- ✅ React Native CLI로 프로젝트 생성
- ✅ iOS/Android 개발 환경 구축
- ✅ 환경변수 관리 (개발/프로덕션 분리)
- ✅ 폴더 구조 설계 (기능별 폴더링)
- ✅ 첫 화면 구현 및 Hot Reload 확인

다음 글에서는 Supabase + Prisma로 데이터베이스를 구축한다.

**궁금한 점이나 피드백은 댓글로 남겨달라.** 🙌

---

**태그**: `React Native` `TypeScript` `iOS` `Android` `모바일 앱 개발` `React Navigation` `Zustand` `환경변수 관리`
