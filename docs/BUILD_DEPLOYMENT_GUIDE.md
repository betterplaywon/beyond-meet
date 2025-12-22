# 빌드 및 배포 가이드

## 용어 설명

### Archive (iOS)
- **정의**: iOS 앱을 App Store에 배포하기 위한 **최종 패키징 파일**
- **확장자**: `.xcarchive`
- **용도**: App Store Connect에 업로드하여 TestFlight 배포 또는 정식 출시에 사용
- **비유**: "앱을 상자에 포장해서 애플에 보낼 준비를 하는 것"

### AAB (Android App Bundle)
- **정의**: Android 앱을 Play Store에 배포하기 위한 **최종 패키징 파일**
- **확장자**: `.aab`
- **용도**: Play Console에 업로드하여 테스트 트랙 또는 프로덕션 출시에 사용
- **특징**: APK보다 효율적 (기기에 맞게 최적화된 앱 생성)
- **비유**: "앱을 상자에 포장해서 구글에 보낼 준비를 하는 것"

### TestFlight (iOS)
- **정의**: Apple의 공식 **베타 테스트 플랫폼**
- **용도**: 정식 출시 전에 테스터들에게 앱을 배포하여 테스트
- **참여자**: 내부 테스터 (팀원, 최대 100명) / 외부 테스터 (최대 10,000명)
- **비유**: "앱을 출시하기 전에 미리 사용해볼 수 있는 시험판 배포"

### Play Console
- **정의**: Google의 **앱 관리 대시보드**
- **용도**: 앱 업로드, 테스트 트랙 관리, 출시, 통계 확인
- **테스트 트랙**: 내부 테스트 → 비공개 테스트 → 공개 테스트 → 프로덕션

---

## iOS 빌드 및 배포

### 사전 준비
1. **Apple Developer 계정** ($99/년)
2. **Xcode** 최신 버전
3. **앱 번들 ID** 등록 (developer.apple.com)
4. **배포용 인증서 & 프로비저닝 프로파일** 생성

### 1단계: 빌드 버전 설정

`mobile/ios/BeyondMeet/Info.plist` 또는 Xcode에서 설정:
```
CFBundleShortVersionString: 1.0.0  (사용자에게 보이는 버전)
CFBundleVersion: 1                  (빌드 번호, 업로드마다 증가)
```

### 2단계: Archive 빌드 (Xcode GUI)

1. Xcode에서 `mobile/ios/BeyondMeet.xcworkspace` 열기
2. 디바이스 선택: **Any iOS Device (arm64)**
3. 메뉴: **Product → Archive**
4. 빌드 완료 후 **Organizer** 창 자동 열림
5. **Distribute App** → **App Store Connect** → **Upload**

### 2단계: Archive 빌드 (명령어)

```bash
cd /Users/kang/Desktop/beyond-meet/mobile/ios

# 1. Pod 의존성 설치
pod install

# 2. Archive 빌드
xcodebuild -workspace BeyondMeet.xcworkspace \
  -scheme BeyondMeet \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath ./build/BeyondMeet.xcarchive \
  archive

# 3. IPA 파일 생성 (App Store용)
xcodebuild -exportArchive \
  -archivePath ./build/BeyondMeet.xcarchive \
  -exportPath ./build/ipa \
  -exportOptionsPlist ExportOptions.plist
```

### ExportOptions.plist 예시
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

### 3단계: App Store Connect 업로드

**방법 1: Xcode Organizer**
1. Organizer → 해당 Archive 선택
2. **Distribute App** → **App Store Connect**
3. 자동 업로드

**방법 2: Transporter 앱**
1. App Store에서 "Transporter" 다운로드
2. IPA 파일을 드래그 앤 드롭
3. 업로드

**방법 3: 명령어 (xcrun altool)**
```bash
xcrun altool --upload-app \
  --type ios \
  --file ./build/ipa/BeyondMeet.ipa \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

### 4단계: TestFlight 설정

1. **App Store Connect** (appstoreconnect.apple.com) 접속
2. 앱 선택 → **TestFlight** 탭
3. 업로드된 빌드가 **처리 중** → **테스트 준비 완료**로 변경될 때까지 대기 (5~30분)
4. **내부 테스트** 또는 **외부 테스트** 그룹 생성
5. 테스터 이메일 추가 (초대 이메일 발송됨)
6. 테스터는 TestFlight 앱 설치 후 초대 수락

---

## Android 빌드 및 배포

### 사전 준비
1. **Google Play Developer 계정** ($25 일회성)
2. **서명 키 (Keystore)** 생성
3. **앱 등록** (Play Console)

### 1단계: 서명 키 생성 (최초 1회)

```bash
cd /Users/kang/Desktop/beyond-meet/mobile/android

# Keystore 생성
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore beyondmeet-release.keystore \
  -alias beyondmeet \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# 입력 필요:
# - 키스토어 비밀번호
# - 이름, 조직, 국가 정보
```

⚠️ **중요**: keystore 파일과 비밀번호를 안전하게 보관하세요. 분실 시 앱 업데이트 불가!

### 2단계: 서명 설정

`mobile/android/gradle.properties`에 추가:
```properties
MYAPP_UPLOAD_STORE_FILE=beyondmeet-release.keystore
MYAPP_UPLOAD_KEY_ALIAS=beyondmeet
MYAPP_UPLOAD_STORE_PASSWORD=your_store_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

`mobile/android/app/build.gradle`에 서명 설정 추가:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3단계: 버전 설정

`mobile/android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 1          // 업로드마다 증가 (정수)
        versionName "1.0.0"    // 사용자에게 보이는 버전
    }
}
```

### 4단계: AAB 빌드

```bash
cd /Users/kang/Desktop/beyond-meet/mobile/android

# AAB (App Bundle) 빌드 - Play Store 업로드용
./gradlew bundleRelease

# 결과 파일 위치
# app/build/outputs/bundle/release/app-release.aab
```

### 참고: APK 빌드 (직접 설치용)
```bash
# APK 빌드 - 직접 설치 테스트용
./gradlew assembleRelease

# 결과 파일 위치
# app/build/outputs/apk/release/app-release.apk
```

### 5단계: Play Console 업로드

1. **Play Console** (play.google.com/console) 접속
2. 앱 선택 → **프로덕션** (또는 테스트 트랙)
3. **새 버전 만들기**
4. AAB 파일 업로드 (`app-release.aab`)
5. 버전 정보 입력
6. **심사를 위해 버전 제출**

### Play Console 테스트 트랙 설명

| 트랙 | 용도 | 테스터 수 |
|------|------|----------|
| 내부 테스트 | 팀 내부 빠른 테스트 | 최대 100명 |
| 비공개 테스트 | 초대된 테스터만 | 이메일로 초대 |
| 공개 테스트 | 누구나 참여 가능 | 무제한 |
| 프로덕션 | 정식 출시 | 모든 사용자 |

**권장 순서**: 내부 테스트 → 비공개 테스트 → 프로덕션

---

## 빌드 스크립트

### 통합 빌드 스크립트 생성

`mobile/scripts/build.sh`:
```bash
#!/bin/bash

set -e

PLATFORM=$1
BUILD_TYPE=${2:-release}

echo "🔨 Building Beyond Meet for $PLATFORM ($BUILD_TYPE)..."

case $PLATFORM in
  ios)
    cd ../ios
    pod install

    if [ "$BUILD_TYPE" = "release" ]; then
      xcodebuild -workspace BeyondMeet.xcworkspace \
        -scheme BeyondMeet \
        -configuration Release \
        -destination generic/platform=iOS \
        -archivePath ./build/BeyondMeet.xcarchive \
        archive
      echo "✅ Archive created at ./build/BeyondMeet.xcarchive"
    else
      xcodebuild -workspace BeyondMeet.xcworkspace \
        -scheme BeyondMeet \
        -configuration Debug \
        build
    fi
    ;;

  android)
    cd ../android

    if [ "$BUILD_TYPE" = "release" ]; then
      ./gradlew bundleRelease
      echo "✅ AAB created at app/build/outputs/bundle/release/app-release.aab"
    else
      ./gradlew assembleDebug
    fi
    ;;

  *)
    echo "Usage: ./build.sh [ios|android] [release|debug]"
    exit 1
    ;;
esac

echo "🎉 Build completed!"
```

사용법:
```bash
chmod +x mobile/scripts/build.sh

# iOS Release 빌드
./mobile/scripts/build.sh ios release

# Android Release 빌드
./mobile/scripts/build.sh android release
```

---

## 빌드 트러블슈팅

### iOS 일반 오류

**오류: "No signing certificate"**
```
해결: Xcode → Preferences → Accounts → Apple ID 로그인 후
      자동 서명 활성화 또는 프로비저닝 프로파일 수동 선택
```

**오류: "pod install 실패"**
```bash
cd ios
rm -rf Pods Podfile.lock
pod repo update
pod install
```

### Android 일반 오류

**오류: "JAVA_HOME not set"**
```bash
# macOS
export JAVA_HOME=$(/usr/libexec/java_home)
```

**오류: "SDK location not found"**
```bash
# mobile/android/local.properties 확인/생성
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

**오류: "Keystore was tampered with"**
```
해결: keystore 비밀번호가 정확한지 확인
```

---

## 버전 관리 팁

### Semantic Versioning (권장)
```
MAJOR.MINOR.PATCH
1.0.0 → 1.0.1 (버그 수정)
1.0.0 → 1.1.0 (새 기능 추가)
1.0.0 → 2.0.0 (호환성 깨지는 변경)
```

### 빌드 번호
- **iOS**: `CFBundleVersion` - 같은 버전이라도 업로드마다 증가
- **Android**: `versionCode` - 항상 이전보다 큰 정수

### 예시
```
버전 1.0.0, 빌드 1 → 심사 거절
버전 1.0.0, 빌드 2 → 수정 후 재업로드
버전 1.0.0, 빌드 3 → 승인, 출시
버전 1.0.1, 빌드 4 → 버그 수정 업데이트
```

---

## 체크리스트

### 빌드 전 확인사항
- [ ] 환경변수가 프로덕션 값으로 설정됨
- [ ] API URL이 프로덕션 서버를 가리킴
- [ ] 디버그 로그 제거/비활성화
- [ ] 버전 번호 증가
- [ ] 빌드 번호 증가

### 업로드 전 확인사항
- [ ] 앱 아이콘 설정됨
- [ ] 스플래시 스크린 설정됨
- [ ] 권한 설명 (카메라, 마이크) 작성됨
- [ ] 개인정보 처리방침 URL 준비됨
