# Environment Variables Setup Guide

Beyond Meet 앱의 환경 변수 설정 가이드입니다.

---

## 📋 환경 변수 파일 구조

```
mobile/
├── .env.example          # 템플릿 (Git에 커밋됨)
├── .env.development      # 개발 환경 (Git 무시)
├── .env.production       # 프로덕션 환경 (Git 무시)
└── .env                  # 기본 환경 (Git 무시, 선택사항)
```

---

## 🚀 초기 설정 (처음 한 번만)

### 1. 개발 환경 설정

```bash
cd /Users/kang/Desktop/beyond-meet/mobile

# .env.development 파일이 이미 생성되어 있습니다
# 필요시 AGORA_APP_ID를 수정하세요
```

### 2. 프로덕션 환경 설정

```bash
# .env.production 파일이 이미 생성되어 있습니다
# App Store / Play Store 배포 전에 확인하세요
```

### 3. 기본 .env 파일 생성 (선택사항)

```bash
# 개발 환경을 기본으로 사용
cp .env.development .env

# 또는 프로덕션 환경을 기본으로 사용
cp .env.production .env
```

---

## 🔧 환경 변수 설명

### API_BASE_URL

**개발 환경**:
```env
API_BASE_URL=http://localhost:3000
```

- iOS Simulator: `http://localhost:3000` 자동 사용
- Android Emulator: `http://10.0.2.2:3000` 또는 Mac LAN IP 자동 사용
- `src/config/env.ts`에서 플랫폼별로 자동 분기 처리됨

**프로덕션 환경**:
```env
API_BASE_URL=https://beyond-meet-api.onrender.com
```

- Render.com에 배포된 백엔드 URL
- HTTPS 필수!

### AGORA_APP_ID

Agora Console에서 발급받은 App ID:

```env
AGORA_APP_ID=a95a1501c0ca471db8ef43d104d0fea2
```

- 개발/프로덕션 동일한 App ID 사용 가능
- 또는 별도 App ID 사용 가능 (권장)

---

## 🎯 환경 전환 방법

### 방법 1: .env 파일 교체 (권장)

**개발 → 프로덕션 전환**:
```bash
cd mobile
cp .env.production .env
npm run android  # 또는 npm run ios
```

**프로덕션 → 개발 전환**:
```bash
cd mobile
cp .env.development .env
npm run android  # 또는 npm run ios
```

### 방법 2: 빌드 스크립트 사용 (향후 추가 예정)

```bash
# 개발 빌드
npm run dev

# 프로덕션 빌드
npm run build:prod
```

---

## ⚠️ 중요 주의사항

### 1. Git 커밋 금지

절대 다음 파일을 Git에 커밋하지 마세요:

- `.env`
- `.env.development`
- `.env.production`
- `.env.local`
- `.env.*.local`

이 파일들은 `.gitignore`에 포함되어 있습니다.

### 2. 빌드 전 환경 확인

**iOS App Store 배포 전**:
```bash
# .env 파일이 프로덕션 설정인지 확인
cat mobile/.env

# 프로덕션이 아니면 교체
cp mobile/.env.production mobile/.env

# Xcode에서 Archive 생성
```

**Android Play Store 배포 전**:
```bash
# .env 파일이 프로덕션 설정인지 확인
cat mobile/.env

# 프로덕션이 아니면 교체
cp mobile/.env.production mobile/.env

# AAB 빌드
cd mobile/android
./gradlew bundleRelease
```

### 3. 네이티브 재빌드 필요

`react-native-config`는 네이티브 모듈이므로, `.env` 파일 변경 후 **반드시 재빌드**해야 합니다:

**iOS**:
```bash
cd mobile/ios
pod install
cd ..
npm run ios
```

**Android**:
```bash
npm run android
```

---

## 🔍 환경 변수 확인 방법

### 방법 1: 앱 내에서 확인

`src/config/env.ts` 파일에서 환경 변수를 export하므로, 앱 실행 중 console.log로 확인 가능:

```typescript
import { ENV } from '@/config/env';

console.log('API URL:', ENV.API_BASE_URL);
console.log('Agora App ID:', ENV.AGORA_APP_ID);
```

### 방법 2: 파일 직접 확인

```bash
# 현재 활성화된 .env 파일 확인
cat mobile/.env

# 개발 환경 확인
cat mobile/.env.development

# 프로덕션 환경 확인
cat mobile/.env.production
```

---

## 🐛 트러블슈팅

### 문제 1: 환경 변수가 적용되지 않음

**원인**: 네이티브 재빌드를 하지 않음

**해결**:
```bash
# iOS
cd mobile/ios && pod install && cd .. && npm run ios

# Android
npm run android
```

### 문제 2: API_BASE_URL이 localhost로 설정되어 있는데 연결 안 됨

**원인**: 백엔드 서버가 실행되지 않음

**해결**:
```bash
# 백엔드 서버 실행
cd backend
npm run dev
```

### 문제 3: Android에서 localhost 연결 안 됨

**원인**: Android Emulator는 `localhost`를 자체 루프백으로 해석

**해결**: `src/config/env.ts`에서 자동으로 처리되므로 별도 조치 불필요
- iOS: `http://localhost:3000`
- Android: `http://10.0.2.2:3000` 또는 LAN IP

---

## 📚 참고 자료

- **react-native-config 공식 문서**: https://github.com/luggit/react-native-config
- **Beyond Meet 환경 설정 코드**: `mobile/src/config/env.ts`
- **프로젝트 가이드**: `CLAUDE.md` (1.5 환경 변수 사용 섹션)

---

**작성일**: 2025-11-26
**버전**: 1.0.0
