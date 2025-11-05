# Constants

앱에서 사용하는 상수를 저장하는 폴더입니다.

## 주요 파일

- `colors.ts` - 컬러 팔레트
- `config.ts` - 앱 설정
- `strings.ts` - 문자열 상수

## 상수 정의 규칙

- UPPER_SNAKE_CASE 사용
- 타입 정의 포함
- 환경별 설정 분리

## 예시

```typescript
// constants/colors.ts
export const COLORS = {
  PRIMARY: '#FF6B6B',
  SECONDARY: '#4ECDC4',
  ACCENT: '#FFE66D',
  BACKGROUND: '#F7F7F7',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#2D3436',
  TEXT_SECONDARY: '#636E72',
  SUCCESS: '#00B894',
  ERROR: '#FF7675',
  WARNING: '#FDCB6E',
} as const;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
} as const;
```

```typescript
// constants/config.ts
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://api.beyondmeet.com';

export const CALL_DURATION_LIMIT = 5 * 60; // 5 minutes in seconds
export const MAX_PROFILE_PHOTOS = 5;
export const MIN_NICKNAME_LENGTH = 2;
export const MAX_NICKNAME_LENGTH = 10;
export const MIN_AGE = 18;
export const MAX_AGE = 100;
```

```typescript
// constants/strings.ts
export const STRINGS = {
  APP_NAME: 'Beyond Meet',
  WELCOME_MESSAGE: '영상 통화로 새로운 인연을 만나보세요',
  LOGIN: '로그인',
  REGISTER: '회원가입',
  LOGOUT: '로그아웃',
} as const;
```
