# 🧪 Android + iOS 크로스 플랫폼 영상 통화 테스트 가이드

## 📋 목차

1. [환경 설정](#환경-설정)
2. [백엔드 시작](#백엔드-시작)
3. [iOS 시뮬레이터 빌드](#ios-시뮬레이터-빌드)
4. [Android 실제 기기 빌드](#android-실제-기기-빌드)
5. [영상 통화 테스트](#영상-통화-테스트)
6. [문제 해결](#문제-해결)

---

## ✅ 환경 설정

### 이미 완료된 설정

다음 설정들은 이미 완료되었습니다:

- ✅ Mac WiFi IP: `192.168.219.101`
- ✅ Android 권한 추가 (카메라, 마이크)
- ✅ iOS 권한 추가 (카메라, 마이크)
- ✅ 모바일 API 설정 (env.ts)
  - iOS: `http://localhost:3000/api`
  - Android: `http://192.168.219.101:3000/api`
- ✅ Agora SDK 완전 구현
- ✅ 백엔드 Agora 설정 확인
  - AGORA_APP_ID: `a95a1501c0ca471db8ef43d104d0fea2`
  - AGORA_APP_CERTIFICATE: 설정됨

### 필요한 준비물

1. **Mac** (백엔드 실행용)
2. **Android 실제 기기** 1대
   - USB 케이블
   - Mac과 **동일한 WiFi** 연결
   - USB 디버깅 활성화 필요
3. **인터넷 연결** (Agora 클라우드 사용)

---

## 🚀 백엔드 시작

### 1단계: 백엔드 서버 실행

```bash
cd /Users/kang/Desktop/beyond-meet/backend
npm run dev
```

**예상 출력:**
```
🚀 Server running on port 3000
✅ Database connected
🔌 Socket.io server ready
```

### 2단계: 백엔드 헬스체크

**Mac에서 확인:**
```bash
curl http://localhost:3000/health
```

**Android 기기에서 접근 가능한지 확인:**
```bash
curl http://192.168.219.101:3000/health
```

**둘 다 다음과 같은 응답이 와야 합니다:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-14T...",
  "environment": "development"
}
```

⚠️ **만약 LAN IP 접근이 안 되면:**
1. Mac 방화벽 설정 확인
2. 시스템 설정 → 네트워크 → 방화벽 → Node.js 허용

---

## 📱 iOS 시뮬레이터 빌드

### 1단계: Pod 설치 (처음 1회만)

```bash
cd /Users/kang/Desktop/beyond-meet/mobile
cd ios
pod install
cd ..
```

### 2단계: iOS 앱 실행

```bash
npm run ios
```

또는 특정 시뮬레이터 선택:

```bash
npx react-native run-ios --simulator="iPhone 15 Pro"
```

### 3단계: Metro Bundler 확인

별도 터미널에서:
```bash
cd /Users/kang/Desktop/beyond-meet/mobile
npm start
```

### 4단계: 동작 확인

- ✅ 앱이 시뮬레이터에서 실행됨
- ✅ Metro bundler에서 에러 없음
- ✅ 회원가입/로그인 가능

---

## 📱 Android 실제 기기 빌드

### 1단계: USB 디버깅 활성화

**Android 기기에서:**
1. 설정 → 휴대전화 정보
2. "빌드 번호" 7번 연속 탭 → 개발자 옵션 활성화
3. 설정 → 개발자 옵션 → USB 디버깅 ON

### 2단계: 기기 연결 확인

**USB로 Android 기기를 Mac에 연결 후:**

```bash
cd /Users/kang/Desktop/beyond-meet/mobile
adb devices
```

**예상 출력:**
```
List of devices attached
XXXXXXXX    device
```

기기가 보이지 않으면:
- USB 케이블 재연결
- 기기에서 "USB 디버깅 허용" 팝업 확인

### 3단계: WiFi 연결 확인

**Android 기기가 Mac과 동일한 WiFi에 연결되어 있는지 확인!**

- Mac WiFi: [WiFi 이름 확인]
- Android WiFi: 설정 → WiFi → 동일한 이름인지 확인

### 4단계: Android 앱 빌드 및 설치

```bash
cd /Users/kang/Desktop/beyond-meet/mobile
npx react-native run-android
```

**빌드 시간:** 3-5분 (처음에는 더 오래 걸릴 수 있음)

### 5단계: 동작 확인

- ✅ 앱이 Android 기기에 설치됨
- ✅ Metro bundler에서 에러 없음
- ✅ 회원가입/로그인 가능

### 6단계: 네트워크 연결 테스트

**Android 기기에서:**
1. Chrome 브라우저 열기
2. 주소창에 입력: `http://192.168.219.101:3000/health`
3. JSON 응답이 표시되어야 함

만약 연결 안 되면 → [문제 해결](#문제-해결) 참고

---

## 🎥 영상 통화 테스트

### 1단계: 테스트 계정 생성

**iOS 시뮬레이터:**
1. 앱 열기
2. 회원가입
   - 이메일: `ios-test@example.com`
   - 비밀번호: `password123`
   - 초대 코드: (유효한 초대 코드 입력)
3. 프로필 설정 완료

**Android 기기:**
1. 앱 열기
2. 회원가입
   - 이메일: `android-test@example.com`
   - 비밀번호: `password123`
   - 초대 코드: (다른 유효한 초대 코드 입력)
3. 프로필 설정 완료

### 2단계: 랜덤 매칭 시작

**iOS 시뮬레이터에서:**
1. 홈 화면 → "랜덤 매칭" 버튼 탭
2. "매칭 중..." 화면 표시

**Android 기기에서:**
1. 홈 화면 → "랜덤 매칭" 버튼 탭
2. "매칭 중..." 화면 표시

**백엔드 로그 확인:**
```
🔍 User <userId1> added to match queue
🔍 User <userId2> added to match queue
✅ Match found: <userId1> <-> <userId2>
🎫 Agora token generated for channel: <channelName>
```

### 3단계: 매칭 성공 및 영상 통화

**양쪽 기기에서:**
1. "매칭 성공!" 알림
2. 자동으로 VideoCallScreen으로 이동
3. **로컬 비디오** (작은 PIP 창)에 내 얼굴 표시
4. **원격 비디오** (전체 화면)에 상대방 얼굴 표시

### 4단계: 컨트롤 테스트

**각 기기에서 테스트:**

| 기능 | 동작 |
|------|------|
| 🔇 **음소거** | 마이크 아이콘 탭 → 상대방이 내 소리 못 들음 |
| 📹 **비디오 끄기** | 카메라 아이콘 탭 → 상대방이 내 영상 안 보임 |
| 🔄 **카메라 전환** | 화살표 아이콘 탭 → 전면/후면 카메라 전환 |
| ⏱️ **타이머** | 화면 상단에 5분 타이머 표시 |
| ❌ **통화 종료** | 빨간 전화 아이콘 탭 → 통화 종료 |

### 5단계: 로그 확인

**Metro Bundler (iOS):**
```
🎥 Initializing Agora SDK...
Channel: <channelName>
AGORA_APP_ID: a95a1501c0ca471db8ef43d104d0fea2
🚀 Joining channel...
✅ Successfully joined channel
👤 Remote user joined: <remoteUid>
```

**Metro Bundler (Android):**
```
🎥 Initializing Agora SDK...
Channel: <channelName>
AGORA_APP_ID: a95a1501c0ca471db8ef43d104d0fea2
🚀 Joining channel...
✅ Successfully joined channel
👤 Remote user joined: <remoteUid>
```

**백엔드:**
```
Socket connected: <socketId1>
Socket connected: <socketId2>
Match found
Agora token generated
```

---

## ❌ 문제 해결

### 문제 1: Android에서 "Network Error"

**증상:** Android 앱에서 로그인/회원가입 실패

**해결책:**

1. **WiFi 확인**
   ```bash
   # Android 기기와 Mac이 같은 WiFi인지 확인
   ```

2. **Mac IP 재확인**
   ```bash
   ipconfig getifaddr en0
   # 출력: 192.168.219.101
   ```

3. **Android 브라우저에서 테스트**
   - Chrome 열기
   - `http://192.168.219.101:3000/health` 접속
   - JSON 응답이 와야 함

4. **Mac 방화벽 확인**
   - 시스템 설정 → 네트워크 → 방화벽
   - Node.js 인바운드 연결 허용
   - 또는 임시로 방화벽 끄기 (테스트용)

5. **백엔드 재시작**
   ```bash
   cd /Users/kang/Desktop/beyond-meet/backend
   # Ctrl+C로 중단
   npm run dev
   ```

### 문제 2: iOS에서 "Network Error"

**증상:** iOS 시뮬레이터에서 API 호출 실패

**해결책:**

1. **백엔드 실행 확인**
   ```bash
   curl http://localhost:3000/health
   ```

2. **env.ts 확인**
   ```typescript
   // mobile/src/config/env.ts
   ios: 'http://localhost:3000/api', // localhost 확인
   ```

3. **Metro Bundler 재시작**
   ```bash
   cd /Users/kang/Desktop/beyond-meet/mobile
   npm start -- --reset-cache
   ```

### 문제 3: Socket.io 연결 실패

**증상:** "Socket not connected" 에러

**해결책:**

1. **JWT 토큰 확인**
   - 로그인이 성공했는지 확인
   - AsyncStorage에 토큰이 저장되었는지 확인

2. **백엔드 로그 확인**
   ```
   Socket connection attempt...
   Authentication failed / Authentication success
   ```

3. **Socket.io 재연결**
   - 앱을 완전히 종료 후 재시작

### 문제 4: Agora 비디오가 안 보임

**증상:** VideoCallScreen에서 로컬/원격 비디오 안 보임

**해결책:**

1. **권한 확인 (iOS)**
   - iOS 시뮬레이터: 카메라 권한 팝업 확인
   - 설정 → BeyondMeet → 카메라/마이크 ON

2. **권한 확인 (Android)**
   ```bash
   # 권한 수동 부여
   adb shell pm grant com.beyondmeet android.permission.CAMERA
   adb shell pm grant com.beyondmeet android.permission.RECORD_AUDIO
   ```

3. **Agora 로그 확인**
   ```
   🎥 Initializing Agora SDK...
   ✅ Successfully joined channel
   ```

4. **AGORA_APP_ID 확인**
   ```bash
   # 백엔드
   cd /Users/kang/Desktop/beyond-meet/backend
   cat .env | grep AGORA_APP_ID

   # 모바일
   cd /Users/kang/Desktop/beyond-meet/mobile
   cat .env | grep AGORA_APP_ID
   ```

### 문제 5: "Invalid Token" 에러

**증상:** Agora join channel 실패

**해결책:**

1. **백엔드 .env 확인**
   ```bash
   cd /Users/kang/Desktop/beyond-meet/backend
   cat .env | grep AGORA_APP_CERTIFICATE
   # 값이 있어야 함
   ```

2. **토큰 만료 시간 확인**
   - 백엔드에서 1시간 토큰 생성 중
   - 1시간 이상 테스트 시 재매칭 필요

### 문제 6: Mac IP가 바뀜

**증상:** 어제는 됐는데 오늘 Android가 연결 안 됨

**원인:** Mac이 WiFi를 재연결하면서 IP가 변경됨

**해결책:**

1. **새 IP 확인**
   ```bash
   ipconfig getifaddr en0
   # 예: 192.168.219.105 (변경됨)
   ```

2. **env.ts 업데이트**
   ```typescript
   // mobile/src/config/env.ts
   android: 'http://192.168.219.105:3000/api', // 새 IP로 변경
   ```

3. **Android 앱 재빌드**
   ```bash
   cd /Users/kang/Desktop/beyond-meet/mobile
   npx react-native run-android
   ```

### 문제 7: 빌드 에러 (Android)

**증상:** `npx react-native run-android` 실패

**해결책:**

1. **Clean 빌드**
   ```bash
   cd /Users/kang/Desktop/beyond-meet/mobile/android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

2. **node_modules 재설치**
   ```bash
   cd /Users/kang/Desktop/beyond-meet/mobile
   rm -rf node_modules
   npm install
   npx react-native run-android
   ```

### 문제 8: 빌드 에러 (iOS)

**증상:** `npm run ios` 실패

**해결책:**

1. **Pod 재설치**
   ```bash
   cd /Users/kang/Desktop/beyond-meet/mobile/ios
   rm -rf Pods Podfile.lock
   pod install
   cd ..
   npm run ios
   ```

2. **Derived Data 삭제**
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   npm run ios
   ```

---

## 📊 테스트 체크리스트

### 백엔드
- [ ] 백엔드 서버 실행 (`npm run dev`)
- [ ] `http://localhost:3000/health` 접근 가능
- [ ] `http://192.168.219.101:3000/health` 접근 가능 (Mac IP)
- [ ] AGORA_APP_ID, AGORA_APP_CERTIFICATE 설정됨

### iOS 시뮬레이터
- [ ] 앱 빌드 성공 (`npm run ios`)
- [ ] 회원가입/로그인 가능
- [ ] Socket.io 연결 성공 (백엔드 로그 확인)
- [ ] 카메라/마이크 권한 허용

### Android 실제 기기
- [ ] USB 디버깅 활성화
- [ ] `adb devices`로 기기 인식
- [ ] Mac과 동일한 WiFi 연결
- [ ] Chrome에서 `http://192.168.219.101:3000/health` 접근 가능
- [ ] 앱 빌드 및 설치 성공 (`npx react-native run-android`)
- [ ] 회원가입/로그인 가능
- [ ] Socket.io 연결 성공
- [ ] 카메라/마이크 권한 허용

### 영상 통화
- [ ] 랜덤 매칭 시작 (양쪽 기기)
- [ ] 매칭 성공 (백엔드 로그에 "Match found")
- [ ] VideoCallScreen 진입
- [ ] 로컬 비디오 표시 (PIP)
- [ ] 원격 비디오 표시 (전체 화면)
- [ ] 음소거 기능 작동
- [ ] 비디오 끄기 기능 작동
- [ ] 카메라 전환 기능 작동
- [ ] 타이머 표시 (5분)
- [ ] 통화 종료 기능 작동

---

## 🎉 성공 기준

다음 모든 항목이 체크되면 **테스트 성공**입니다:

1. ✅ iOS 시뮬레이터에서 앱 실행
2. ✅ Android 실제 기기에서 앱 실행
3. ✅ 양쪽에서 회원가입/로그인 성공
4. ✅ 랜덤 매칭 성공
5. ✅ 영상 통화 화면에서 **서로의 얼굴이 보임**
6. ✅ **서로의 음성이 들림**
7. ✅ 컨트롤 버튼들이 정상 작동
8. ✅ 통화 종료 정상 작동

---

## 📞 추가 도움말

### 로그 모니터링

**백엔드 로그:**
```bash
cd /Users/kang/Desktop/beyond-meet/backend
npm run dev
# 모든 Socket.io, Agora 로그가 여기 표시됨
```

**iOS Metro Bundler:**
```bash
cd /Users/kang/Desktop/beyond-meet/mobile
npm start
# iOS 앱의 console.log가 여기 표시됨
```

**Android Logcat:**
```bash
adb logcat | grep -i agora
# Agora 관련 로그만 필터링
```

### 성능 모니터링

- **Agora 통화 품질:** [Agora Console](https://console.agora.io) → Analytics
- **백엔드 메모리:** `top -pid <node-process-id>`

### 유용한 명령어 모음

```bash
# Mac IP 확인
ipconfig getifaddr en0

# Android 기기 확인
adb devices

# Android 권한 부여
adb shell pm grant com.beyondmeet android.permission.CAMERA
adb shell pm grant com.beyondmeet android.permission.RECORD_AUDIO

# Android 앱 제거
adb uninstall com.beyondmeet

# Metro Bundler 캐시 삭제
npm start -- --reset-cache

# iOS 시뮬레이터 초기화
xcrun simctl erase all
```

---

**작성일:** 2025-11-14
**버전:** 1.0.0
**Mac IP:** `192.168.219.101` (변경될 수 있음)
