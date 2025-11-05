# 영상 통화 기능 구현 완료 보고서

## ✅ 완료된 작업

### 1. 패키지 설치
- ✅ react-native-agora (영상 통화 SDK)
- ✅ socket.io-client (실시간 통신)

### 2. Socket.io 연동
**파일:** [src/services/socketService.ts](mobile/src/services/socketService.ts)
- Socket 연결/해제 관리
- 이벤트 emit/on/off 메서드
- 자동 재연결 설정
- 인증 토큰 기반 연결

**Hooks:** [src/hooks/useSocket.ts](mobile/src/hooks/useSocket.ts)
- `useSocket`: Socket 연결 관리
- `useSocketEvent`: Socket 이벤트 리스너

### 3. 매칭 시스템 API
**파일:**
- [src/api/match.api.ts](mobile/src/api/match.api.ts) - 매칭 API
- [src/api/agora.api.ts](mobile/src/api/agora.api.ts) - Agora 토큰 API
- [src/hooks/useMatch.ts](mobile/src/hooks/useMatch.ts) - 매칭 hooks

**주요 기능:**
- `useRandomMatch`: 랜덤 매칭 요청
- `useDirectMatch`: 선택 매칭 (친구에게 통화 요청)
- `useCancelMatch`: 매칭 취소
- `useAcceptMatch`: 매칭 수락
- `useRejectMatch`: 매칭 거절

### 4. 상태 관리 (Zustand)
**파일:** [src/store/callStore.ts](mobile/src/store/callStore.ts)
- `currentSession`: 현재 통화 세션
- `incomingCall`: 수신 중인 통화
- `isInCall`: 통화 중 여부
- `callDuration`: 통화 시간

### 5. 화면 구현

#### A. 매칭 대기 화면
**파일:** [src/screens/match/MatchingScreen.tsx](mobile/src/screens/match/MatchingScreen.tsx)
- 맥박 애니메이션
- 매칭 중 로딩 표시
- 매칭 팁 표시
- 취소 버튼
- Socket 이벤트 리스너 (`match:found`, `match:failed`)

#### B. 통화 수신 모달
**파일:** [src/components/call/IncomingCallModal.tsx](mobile/src/components/call/IncomingCallModal.tsx)
- 전체 화면 모달
- 발신자 프로필 정보
- 수락/거절 버튼
- 맥박 애니메이션

#### C. 영상 통화 화면
**파일:** [src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx)
- 상대방 영상 (전체 화면)
- 내 영상 (PIP - Picture-in-Picture)
- 통화 컨트롤
- 통화 타이머
- 탭하여 컨트롤 표시/숨김

**컨트롤 컴포넌트:** [src/components/call/CallControls.tsx](mobile/src/components/call/CallControls.tsx)
- 🎤 마이크 음소거/해제
- 📷 비디오 끄기/켜기
- 🔄 카메라 전환 (전면 ↔ 후면)
- ❌ 통화 종료

**타이머 컴포넌트:** [src/components/call/CallTimer.tsx](mobile/src/components/call/CallTimer.tsx)
- 5분 카운트 (300초)
- 남은 시간 표시
- 1분 이하일 때 경고 색상
- 시간 초과 시 콜백

#### D. 통화 종료 화면
**파일:** [src/screens/call/CallEndScreen.tsx](mobile/src/screens/call/CallEndScreen.tsx)
- 통화 종료 확인
- 통화 시간 표시
- 상대방 정보
- 친구 추가 버튼
- 홈으로 돌아가기

### 6. 네비게이션 업데이트
**파일:** [src/navigation/RootNavigator.tsx](mobile/src/navigation/RootNavigator.tsx)
- `Matching` 화면 추가
- `VideoCall` 화면 추가
- `CallEnd` 화면 추가

### 7. HomeScreen 연동
**파일:** [src/screens/home/HomeScreen.tsx](mobile/src/screens/home/HomeScreen.tsx)
- Socket 연결 초기화
- 랜덤 매칭 버튼 연동
- 통화 수신 모달 연동
- Socket 이벤트 리스너 (`call:incoming`)

---

## 📁 생성된 파일 목록

```
mobile/src/
├── api/
│   ├── match.api.ts           # 매칭 API
│   └── agora.api.ts           # Agora 토큰 API
│
├── components/call/
│   ├── IncomingCallModal.tsx  # 통화 수신 모달
│   ├── CallControls.tsx       # 통화 컨트롤
│   └── CallTimer.tsx          # 통화 타이머
│
├── hooks/
│   ├── useSocket.ts           # Socket hooks
│   └── useMatch.ts            # 매칭 hooks
│
├── screens/
│   ├── match/
│   │   └── MatchingScreen.tsx # 매칭 대기 화면
│   └── call/
│       ├── VideoCallScreen.tsx # 영상 통화 화면
│       └── CallEndScreen.tsx   # 통화 종료 화면
│
├── services/
│   └── socketService.ts       # Socket.io 서비스
│
└── store/
    └── callStore.ts           # 통화 상태 관리
```

---

## 🎯 주요 플로우

### 1. 랜덤 매칭 플로우
```
HomeScreen
  └─ 랜덤 매칭 버튼 클릭
       └─ Socket emit: 'match:request'
            └─ MatchingScreen (대기)
                 └─ Socket on: 'match:found'
                      └─ VideoCallScreen (통화)
                           └─ 5분 경과 or 수동 종료
                                └─ CallEndScreen
```

### 2. 선택 매칭 플로우 (친구에게 통화)
```
FriendsScreen
  └─ 친구 통화 버튼 클릭
       └─ API: /match/direct
            └─ Socket emit: 'call:request'
                 └─ 상대방 앱: IncomingCallModal
                      ├─ 수락 → VideoCallScreen
                      └─ 거절 → 홈으로 복귀
```

### 3. 통화 수신 플로우
```
HomeScreen (백그라운드)
  └─ Socket on: 'call:incoming'
       └─ IncomingCallModal 표시
            ├─ 수락 → VideoCallScreen
            └─ 거절 → 모달 닫기
```

---

## ⚠️ 주의사항

### Agora SDK 네이티브 설정 필요

현재는 **UI 구조만 구현**되어 있으며, 실제 Agora 영상 통화를 위해서는 추가 설정이 필요합니다:

#### iOS 설정
```bash
cd ios && pod install
```

**Info.plist에 권한 추가:**
```xml
<key>NSCameraUsageDescription</key>
<string>영상 통화를 위해 카메라 접근이 필요합니다</string>
<key>NSMicrophoneUsageDescription</key>
<string>영상 통화를 위해 마이크 접근이 필요합니다</string>
```

#### Android 설정
**android/app/src/main/AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Agora 실제 연동 작업

[src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx)의 TODO 부분:

```typescript
// TODO: Agora SDK 초기화
useEffect(() => {
  // 1. Agora Engine 생성
  // 2. Video 활성화
  // 3. 채널 조인
  // 4. 이벤트 핸들러 등록
}, []);

// TODO: 실제 Agora 메서드 호출
const handleToggleMute = () => {
  // engine.muteLocalAudioStream(!isMuted);
};

const handleToggleVideo = () => {
  // engine.muteLocalVideoStream(!isVideoOff);
};

const handleSwitchCamera = () => {
  // engine.switchCamera();
};
```

**참고 문서:**
- [Agora React Native 공식 문서](https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=react-native)
- [Agora API Reference](https://api-ref.agora.io/en/video-sdk/react-native/latest/)

---

## 🔧 환경 변수 설정

**src/config/env.ts에 Agora App ID 추가:**
```typescript
export const ENV = {
  API_BASE_URL: 'http://localhost:3000/api',
  AGORA_APP_ID: 'YOUR_AGORA_APP_ID', // 여기에 Agora App ID 입력
};
```

Agora Console에서 App ID 발급:
1. https://console.agora.io 접속
2. 프로젝트 생성
3. App ID 복사
4. 위 파일에 붙여넣기

---

## 📊 Socket.io 이벤트 목록

### Client → Server (Emit)
```typescript
'match:request'    // 매칭 요청 { type: 'RANDOM' | 'DIRECT' }
'match:cancel'     // 매칭 취소
'call:accept'      // 통화 수락 { sessionId }
'call:reject'      // 통화 거절 { sessionId }
'call:end'         // 통화 종료 { sessionId }
```

### Server → Client (On)
```typescript
'match:found'      // 매칭 성공 { session, partner, token }
'match:failed'     // 매칭 실패 { reason }
'call:incoming'    // 통화 수신 { session, caller }
'call:accepted'    // 상대방 수락 { sessionId }
'call:rejected'    // 상대방 거절 { sessionId }
'call:ended'       // 통화 종료 { sessionId }
```

---

## ✅ 테스트 체크리스트

### 기본 기능
- [ ] 홈 화면에서 랜덤 매칭 버튼 클릭
- [ ] 매칭 대기 화면 표시
- [ ] 매칭 취소 동작
- [ ] 통화 수신 모달 표시
- [ ] 통화 수락/거절

### 영상 통화 (Agora 연동 후)
- [ ] 영상 통화 화면 진입
- [ ] 내 영상/상대방 영상 표시
- [ ] 마이크 음소거
- [ ] 비디오 끄기
- [ ] 카메라 전환
- [ ] 5분 타이머
- [ ] 통화 종료

### Socket 연결
- [ ] 앱 시작 시 Socket 자동 연결
- [ ] Socket 이벤트 정상 수신
- [ ] 재연결 동작 확인

---

## 🚀 다음 단계

### Phase 1: Agora 실제 연동
1. Agora SDK 네이티브 설정
2. VideoCallScreen에 실제 Agora 코드 구현
3. 권한 요청 처리
4. 에러 핸들링

### Phase 2: 추가 기능
1. **배경 블러/변경**
   - Agora Virtual Background API
   - 배경 이미지 프리셋

2. **통화 품질 표시**
   - 네트워크 상태 표시
   - 품질 인디케이터

3. **통화 기록**
   - 통화 기록 저장
   - 통화 기록 화면

### Phase 3: 프로필 & 설정
1. 프로필 편집
2. 사진 업로드
3. 설정 화면
4. 매칭 필터

---

## 📝 참고 사항

### 백엔드 연동 필요
- 백엔드의 Socket.io 서버가 실행 중이어야 합니다
- 매칭 API 엔드포인트가 구현되어 있어야 합니다
- Agora 토큰 생성 API가 필요합니다

### 실제 디바이스 테스트 필요
- 영상 통화는 실제 디바이스에서만 테스트 가능
- 시뮬레이터에서는 카메라가 작동하지 않음
- 최소 2대의 디바이스 필요 (iOS, Android)

---

**작성일**: 2025-11-05
**작성자**: Claude
**상태**: 완료 ✅ (Agora 실제 연동 제외)
