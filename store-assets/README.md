# Store Assets - Beyond Meet

앱 스토어 제출에 필요한 모든 리소스를 관리하는 폴더입니다.

---

## 📁 폴더 구조

```
store-assets/
├── icons/              # 앱 아이콘 (1024x1024, 512x512)
├── screenshots/        # 스크린샷 (iOS & Android)
│   ├── ios/           # iOS 스크린샷
│   └── android/       # Android 스크린샷
├── ios/               # iOS 전용 리소스
├── android/           # Android 전용 리소스
└── README.md          # 이 파일
```

---

## 🎨 앱 아이콘 현황

### iOS (필수!)

**상태**: ⚠️ **아이콘 없음** - 생성 필요

**위치**: `mobile/ios/BeyondMeet/Images.xcassets/AppIcon.appiconset/`

**현재 상태**:
- `Contents.json` 파일만 존재
- 실제 이미지 파일 없음

**필요한 작업**:
1. 1024x1024 PNG 아이콘 디자인 생성
2. Xcode에서 AppIcon.appiconset에 추가
3. 또는 온라인 도구 사용 (예: https://appicon.co)

**요구사항**:
- 크기: 1024x1024 픽셀
- 포맷: PNG (투명 배경 불가)
- 콘텐츠: 앱 로고, 텍스트 없이 심플한 디자인
- 둥근 모서리 자동 적용되므로 사각형으로 제작

### Android

**상태**: ✅ 기본 React Native 아이콘 존재 (교체 권장)

**위치**: `mobile/android/app/src/main/res/mipmap-*/`

**현재 파일**:
```
mipmap-mdpi/ic_launcher.png         (48x48)
mipmap-mdpi/ic_launcher_round.png
mipmap-hdpi/ic_launcher.png         (72x72)
mipmap-hdpi/ic_launcher_round.png
mipmap-xhdpi/ic_launcher.png        (96x96)
mipmap-xhdpi/ic_launcher_round.png
mipmap-xxhdpi/ic_launcher.png       (144x144)
mipmap-xxhdpi/ic_launcher_round.png
mipmap-xxxhdpi/ic_launcher.png      (192x192)
mipmap-xxxhdpi/ic_launcher_round.png
```

**필요한 작업**:
1. 512x512 PNG 아이콘 디자인 생성
2. Android Studio Image Asset Studio 또는 온라인 도구로 모든 해상도 생성
3. 기존 파일 교체

**요구사항**:
- 크기: 512x512 픽셀 (원본)
- 포맷: PNG
- Adaptive Icon 지원 (foreground + background)

---

## 📸 스크린샷 요구사항

### 필요한 화면 (4-5개)

1. **Onboarding / Login Screen**
   - 초대 코드 입력 화면
   - 캡션: "초대 코드로 시작하세요" / "Start with invite code"

2. **Home Screen**
   - 랜덤 매칭 대기 화면
   - 캡션: "새로운 만남을 시작하세요" / "Start new connections"

3. **Video Call Screen**
   - 영상 통화 중 화면 (더미 데이터 사용)
   - 캡션: "얼굴을 보며 대화하세요" / "Talk face to face"

4. **Profile Screen**
   - 프로필 편집 화면
   - 캡션: "나를 표현하세요" / "Express yourself"

5. **Friends Screen** (선택사항)
   - 친구 목록 화면
   - 캡션: "친구와 연결하세요" / "Connect with friends"

### iOS 스크린샷 사이즈

**필수**:
- iPhone 6.7" Display: **1290 x 2796** (iPhone 14 Pro Max, 15 Pro Max)

**권장**:
- iPhone 6.5" Display: 1242 x 2688 (iPhone 11 Pro Max, XS Max)

**선택**:
- iPhone 5.5" Display: 1242 x 2208 (iPhone 8 Plus)

### Android 스크린샷 사이즈

**필수**:
- Phone: **1080 x 1920** 이상

**선택**:
- 7" Tablet: 1024 x 600
- 10" Tablet: 1280 x 800

### 스크린샷 촬영 방법

#### iOS (Xcode Simulator)

```bash
# 1. Simulator 실행
cd mobile
npm run ios

# 2. 디바이스 선택
Xcode → Window → Devices and Simulators → iPhone 14 Pro Max

# 3. 스크린샷 촬영
Cmd + S (Simulator에서)
또는
Feature → Screenshot
```

스크린샷 저장 위치: `~/Desktop/`

#### Android (Emulator)

```bash
# 1. Emulator 실행 (Pixel 6 Pro 권장)
npm run android

# 2. 스크린샷 촬영
Android Studio → Running Devices → Camera Icon
또는
Cmd + Shift + S (Mac)
```

스크린샷 저장 위치: `~/Desktop/` 또는 지정한 폴더

### 스크린샷 네이밍 규칙

```
screenshots/ios/01-login-ko.png
screenshots/ios/02-home-ko.png
screenshots/ios/03-video-call-ko.png
screenshots/ios/04-profile-ko.png
screenshots/ios/05-friends-ko.png

screenshots/android/01-login-ko.png
screenshots/android/02-home-ko.png
...
```

---

## 🎬 App Preview Video (선택사항)

### 내용 구성 (15-30초)

1. **오프닝** (3초): Beyond Meet 로고
2. **기능 소개** (15초): 프로필 등록 → 매칭 → 영상 통화 → 친구 추가
3. **클로징** (3초): "지금 시작하세요" + 로고

### 비디오 사양

- 해상도: 1080p (1920x1080) 최소
- 형식: MP4 또는 MOV
- 최대 용량: 500MB
- 최대 길이: 30초

---

## 📋 체크리스트

### 아이콘

- [ ] 1024x1024 PNG 아이콘 디자인 (iOS 필수)
- [ ] 512x512 PNG 아이콘 디자인 (Android 필수)
- [ ] iOS AppIcon.appiconset에 추가
- [ ] Android mipmap 폴더에 추가 (모든 해상도)

### 스크린샷

- [ ] iOS 스크린샷 4-5개 (1290 x 2796)
- [ ] Android 스크린샷 4-5개 (1080 x 1920)
- [ ] 한국어 버전
- [ ] 영어 버전 (선택)

### 기타 리소스

- [ ] Feature Graphic (Android, 1024x500) - 선택사항
- [ ] App Preview Video (15-30초) - 선택사항

---

## 🔧 유용한 도구

### 아이콘 생성 도구

- **AppIcon.co**: https://www.appicon.co (iOS & Android 한 번에)
- **MakeAppIcon**: https://makeappicon.com
- **Icon Kitchen**: https://icon.kitchen
- **Figma / Sketch**: 직접 디자인

### 스크린샷 편집 도구

- **Apple Configurator 2**: iOS 스크린샷 프레임 추가
- **Screenshot Creator**: https://www.applaunchpad.com
- **Figma**: 목업 디자인
- **Preview (Mac)**: 기본 이미지 편집

### 비디오 제작 도구

- **QuickTime**: 화면 녹화
- **iMovie**: 간단한 편집
- **Final Cut Pro**: 전문 편집
- **Adobe Premiere**: 전문 편집

---

## 📚 참고 자료

- **Apple Human Interface Guidelines - App Icon**: https://developer.apple.com/design/human-interface-guidelines/app-icons
- **Android App Icon Guidelines**: https://developer.android.com/google-play/resources/icon-design-specifications
- **App Store Screenshot Specifications**: https://help.apple.com/app-store-connect/#/devd274dd925
- **Google Play Screenshot Guidelines**: https://support.google.com/googleplay/android-developer/answer/9866151

---

**작성일**: 2025-11-26
**버전**: 1.0.0
