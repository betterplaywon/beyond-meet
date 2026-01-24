# Part 9: WebRTC 영상 통화 구현 (Agora)

Part 8에서 Socket.io로 실시간 매칭을 구현했다면, 이제 실제로 영상 통화를 연결할 차례다. WebRTC를 직접 구현하는 것은 매우 복잡하므로, **Agora**라는 서비스를 사용해 1:1 영상 통화를 구현했다.

## 💡 WebRTC를 직접 구현하지 않은 이유

처음에는 WebRTC를 직접 구현하려고 했다. "WebRTC 튜토리얼"로 검색하고 코드를 따라해봤는데, 생각보다 훨씬 복잡했다.

### WebRTC 직접 구현의 어려움

1. **SDP 교환**: Offer/Answer를 서로 주고받아야 한다
2. **ICE Candidate**: NAT 통과를 위한 여러 후보를 수집하고 교환해야 한다
3. **STUN/TURN 서버**: 방화벽이나 NAT 뒤에 있는 사용자를 위해 별도 서버가 필요하다
4. **크로스 플랫폼**: iOS, Android, 웹 각각 다른 API를 사용한다
5. **네트워크 품질**: 대역폭 조절, 패킷 손실 처리, 지연 최소화 등

"WebRTC vs 영상 통화 서비스"로 검색해보니, **Agora**, **Twilio**, **Vonage** 같은 CPaaS(Communication Platform as a Service)가 있었다.

### Agora를 선택한 이유

세 가지 서비스를 비교해봤다:

| 서비스 | 무료 플랜 | 가격 | SDK 품질 | 지역 서버 |
|--------|-----------|------|----------|-----------|
| **Agora** | 월 10,000분 | $0.99/1,000분 | ⭐⭐⭐⭐⭐ | 아시아 다수 |
| **Twilio** | 없음 | $2.00/1,000분 | ⭐⭐⭐⭐ | 미국 중심 |
| **Vonage** | 월 1,000분 | $1.50/1,000분 | ⭐⭐⭐ | 유럽 중심 |

**Beyond Meet은 Agora를 선택했다**:

1. **무료 플랜**: 월 10,000분으로 Beta 테스트에 충분하다 (20명 × 5분 × 100회 = 10,000분)
2. **React Native 지원**: `react-native-agora` SDK가 잘 관리되고 있다
3. **아시아 서버**: 한국 사용자가 많으므로 지연 시간이 낮다
4. **문서**: 한국어 문서와 예제가 풍부하다

## 1. Agora 설정

### 1.1 Agora 계정 생성 및 프로젝트 설정

1. [Agora 콘솔](https://console.agora.io/)에서 회원가입
2. 새 프로젝트 생성
3. **App ID**와 **App Certificate** 복사

**.env에 추가**:

```bash
AGORA_APP_ID=your-app-id-here
AGORA_APP_CERTIFICATE=your-app-certificate-here
```

### 1.2 Agora 토큰이란?

Agora에 연결하려면 **토큰**이 필요하다. 처음에는 토큰 없이 App ID만으로 연결할 수 있지만, 보안상 프로덕션에서는 반드시 토큰을 사용해야 한다.

"Agora 토큰"으로 검색해보니, 토큰은 다음 정보를 포함한다:

- **Channel Name**: 어느 채널에 접속할지
- **UID**: 사용자 고유 ID
- **Role**: Publisher(송신) vs Subscriber(수신)
- **Expiration Time**: 토큰 만료 시간

토큰은 **백엔드**에서 생성해야 한다. 클라이언트에서 생성하면 App Certificate가 노출되기 때문이다.

## 2. 백엔드 토큰 생성

### 2.1 agora-token 패키지 설치

```bash
cd backend
npm install agora-token
```

Agora에서 공식으로 제공하는 Node.js 토큰 생성 라이브러리다.

### 2.2 토큰 생성 함수

[backend/src/services/match-service.ts](backend/src/services/match-service.ts:65-99)

```typescript
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import crypto from 'crypto';

/**
 * Agora 토큰 생성
 * @param channelName 채널 이름
 * @param userId 사용자 ID (사용하지 않음, UID=0으로 통일)
 * @returns { token: string, uid: number }
 */
export const generateAgoraToken = (
  channelName: string,
  _userId?: string
): { token: string; uid: number } => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new AppError(
      500,
      'AGORA_CONFIG_MISSING',
      'Agora 설정이 누락되었습니다'
    );
  }

  const role = RtcRole.PUBLISHER; // 송신 권한
  const expirationTimeInSeconds = 3600; // 1시간
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // UID를 0으로 설정하여 Agora가 자동 할당하도록 처리
  // 이렇게 하면 토큰이 모든 UID에 대해 유효함
  const uid = 0;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs,
    privilegeExpiredTs
  );

  return { token, uid };
};
```

**핵심 포인트**:

1. **UID = 0**: Agora가 자동으로 UID를 할당한다. 이렇게 하면 토큰을 모든 사용자가 사용할 수 있다
2. **RtcRole.PUBLISHER**: 송신+수신 모두 가능한 권한
3. **만료 시간**: 1시간 후 토큰이 만료된다

### 2.3 왜 UID를 0으로 설정했나?

처음에는 `userId`를 해시해서 고유한 UID를 생성하려고 했다:

```typescript
// 이전 코드
const hash = crypto.createHash('sha256').update(userId).digest();
const uid = hash.readUInt32BE(0);
```

하지만 이 방식은 문제가 있었다:

- 토큰이 특정 UID에만 유효하므로, 사용자마다 개별 토큰을 생성해야 한다
- Socket.io에서 두 사용자에게 각각 다른 토큰을 전달하는 로직이 복잡해진다

"Agora UID 0"으로 검색해보니, **UID=0으로 토큰을 생성하면 Agora가 랜덤 UID를 할당**한다는 걸 알게 됐다. 이렇게 하면:

- 하나의 토큰으로 여러 사용자가 접속 가능
- 각 사용자는 Agora에서 할당받은 고유 UID를 받는다

Part 8에서 매칭 성공 시 토큰을 생성하는 코드를 이미 구현했다:

```typescript
// Socket.io 매칭 핸들러에서
const user1TokenData = matchService.generateAgoraToken(
  session.channelName,
  userId
);

io.to(userId).emit('match:found', {
  session: { id: session.id, channelName: session.channelName },
  partner: user2,
  token: user1TokenData.token,
  uid: user1TokenData.uid, // 0
});
```

## 3. React Native Agora SDK 설정

### 3.1 패키지 설치

```bash
cd mobile
npm install react-native-agora
```

iOS의 경우 추가 설정이 필요하다:

```bash
cd ios
pod install
cd ..
```

### 3.2 권한 설정

**iOS (ios/BeyondMeet/Info.plist)**:

```xml
<key>NSCameraUsageDescription</key>
<string>영상 통화를 위해 카메라 권한이 필요합니다</string>
<key>NSMicrophoneUsageDescription</key>
<string>영상 통화를 위해 마이크 권한이 필요합니다</string>
```

**Android (android/app/src/main/AndroidManifest.xml)**:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## 4. VideoCallScreen 구현

### 4.1 Agora Engine 초기화

[mobile/src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx:301-422)

```typescript
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';

const VideoCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sessionId, channelName, token } = route.params;
  const agoraEngineRef = useRef<IRtcEngine | undefined>(undefined);
  const [localUid, setLocalUid] = useState<number>(0);
  const [remoteUid, setRemoteUid] = useState<number>(0);

  useEffect(() => {
    const setupVideoSDK = async () => {
      try {
        // 1. 권한 요청 (Android)
        if (Platform.OS === 'android') {
          const grants = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);

          if (
            grants['android.permission.CAMERA'] !== PermissionsAndroid.RESULTS.GRANTED ||
            grants['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED
          ) {
            Alert.alert('권한 필요', '카메라와 마이크 권한이 필요합니다.');
            return;
          }
        }

        // 2. Agora Engine 생성
        agoraEngineRef.current = createAgoraRtcEngine();
        const agoraEngine = agoraEngineRef.current;

        // 3. Agora 초기화
        agoraEngine.initialize({
          appId: ENV.AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileCommunication, // 1:1 통화 모드
        });

        // 4. 이벤트 핸들러 등록
        agoraEngine.registerEventHandler({
          onJoinChannelSuccess: (_connection, joinedUid) => {
            console.log('✅ Joined channel with UID:', joinedUid);
            setLocalUid(joinedUid);
            setIsJoined(true);
          },
          onUserJoined: (_connection, remoteUserUid) => {
            console.log('👤 Remote user joined:', remoteUserUid);
            setRemoteUid(remoteUserUid);
          },
          onUserOffline: () => {
            console.log('👋 Remote user left');
            setRemoteUid(0);
          },
          onError: (err, msg) => {
            console.error('❌ Agora Error:', err, msg);
            Alert.alert('Agora 오류', `에러 코드: ${err}\n메시지: ${msg}`);
          },
        });

        // 5. 비디오 활성화
        agoraEngine.enableVideo();

        // 6. Android 비디오 설정
        if (Platform.OS === 'android') {
          agoraEngine.setVideoEncoderConfiguration({
            dimensions: { width: 640, height: 480 },
            frameRate: 15,
            bitrate: 0, // Standard bitrate
          });
        }

        // 7. 미리보기 시작
        agoraEngine.startPreview();

        // 8. 채널 참가 (uid=0 → Agora 자동 할당)
        agoraEngine.joinChannel(token, channelName, 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });
      } catch (error) {
        console.error('Setup error:', error);
        Alert.alert('오류', '영상 통화를 시작할 수 없습니다.');
      }
    };

    setupVideoSDK();

    // Cleanup
    return () => {
      agoraEngineRef.current?.leaveChannel();
      agoraEngineRef.current?.release();
    };
  }, [channelName, token]);

  return (
    <View style={styles.container}>
      {/* 로컬 비디오 (작은 화면) */}
      {localUid !== 0 && (
        <RtcSurfaceView
          canvas={{ uid: localUid }}
          style={styles.localVideo}
        />
      )}

      {/* 원격 비디오 (큰 화면) */}
      {remoteUid !== 0 && (
        <RtcSurfaceView
          canvas={{ uid: remoteUid }}
          style={styles.remoteVideo}
        />
      )}
    </View>
  );
};
```

**핵심 포인트**:

1. **ChannelProfileCommunication**: 1:1 통화 모드 (낮은 지연시간)
2. **ClientRoleBroadcaster**: 송신+수신 모두 가능
3. **uid=0**: Agora가 자동으로 UID 할당 (서버에서 받은 UID는 0)
4. **RtcSurfaceView**: 비디오를 렌더링하는 네이티브 View

### 4.2 이벤트 핸들러 이해

Agora SDK는 이벤트 기반으로 작동한다:

```typescript
agoraEngine.registerEventHandler({
  onJoinChannelSuccess: (_connection, joinedUid) => {
    // 내가 채널에 참가했을 때
    // joinedUid: Agora가 할당한 내 UID
    setLocalUid(joinedUid);
  },
  onUserJoined: (_connection, remoteUserUid) => {
    // 상대방이 채널에 참가했을 때
    // remoteUserUid: 상대방의 UID
    setRemoteUid(remoteUserUid);
  },
  onUserOffline: () => {
    // 상대방이 채널을 떠났을 때
    setRemoteUid(0);
  },
});
```

이 이벤트들이 발생하면 React의 state가 업데이트되고, UI가 자동으로 다시 렌더링된다.

### 4.3 RtcSurfaceView 이해

`RtcSurfaceView`는 Agora의 네이티브 View다. React Native의 일반 View가 아니라 iOS/Android 네이티브 View를 직접 렌더링한다.

```typescript
<RtcSurfaceView
  canvas={{ uid: remoteUid }}
  style={styles.remoteVideo}
/>
```

- **uid**: 렌더링할 사용자의 UID
- **style**: React Native 스타일 (위치, 크기)

로컬 비디오는 작은 화면(PIP)으로, 원격 비디오는 전체 화면으로 표시한다.

## 5. 통화 컨트롤 구현

### 5.1 음소거/비디오 끄기

[mobile/src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx:450-458)

```typescript
const [isMuted, setIsMuted] = useState(false);
const [isVideoOff, setIsVideoOff] = useState(false);

const handleToggleMute = () => {
  agoraEngineRef.current?.muteLocalAudioStream(!isMuted);
  setIsMuted(!isMuted);
};

const handleToggleVideo = () => {
  agoraEngineRef.current?.muteLocalVideoStream(!isVideoOff);
  setIsVideoOff(!isVideoOff);
};
```

Agora SDK가 음소거와 비디오 끄기를 간단하게 제공한다.

### 5.2 카메라 전환 (전면/후면)

```typescript
const handleSwitchCamera = () => {
  agoraEngineRef.current?.switchCamera();
};
```

iOS/Android 모두 `switchCamera()` 한 줄로 카메라를 전환할 수 있다.

### 5.3 통화 종료

[mobile/src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx:464-477)

```typescript
const handleEndCall = () => {
  Alert.alert('통화 종료', '통화를 종료하시겠습니까?', [
    { text: '취소', style: 'cancel' },
    {
      text: '종료',
      style: 'destructive',
      onPress: () => {
        // Socket.io로 종료 이벤트 전송
        socketService.endCall(sessionId);
        navigation.replace('CallEnd', { sessionId });
      },
    },
  ]);
};
```

통화 종료 시:

1. Socket.io로 `call:end` 이벤트를 서버에 보낸다
2. 서버가 상대방에게도 `call:ended` 이벤트를 보낸다
3. `CallEndScreen`으로 이동한다
4. `useEffect` cleanup에서 `agoraEngine.leaveChannel()` 호출

## 6. 통화 타이머 구현

### 6.1 5분 제한

Beyond Meet은 통화 시간을 **5분으로 제한**했다. 그 이유는:

1. **Agora 무료 플랜**: 월 10,000분으로 제한되므로 장시간 통화를 막는다
2. **사용자 경험**: 첫 만남이 너무 길면 부담스럽다
3. **다음 매칭 유도**: 5분 후 다른 사람과 매칭을 유도한다

[mobile/src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx:424-448)

```typescript
const maxDuration = 300; // 5분 (초)
const callDuration = useCallStore(state => state.callDuration);
const setCallDuration = useCallStore(state => state.setCallDuration);

// 타이머 로직
useEffect(() => {
  setCallDuration(0); // 초기화

  const interval = setInterval(() => {
    const current = useCallStore.getState().callDuration;
    if (current >= maxDuration) {
      clearInterval(interval);
      return;
    }
    setCallDuration(current + 1);
  }, 1000);

  return () => clearInterval(interval);
}, [maxDuration, setCallDuration]);

// 시간 초과 처리
useEffect(() => {
  if (callDuration >= maxDuration) {
    Alert.alert('시간 종료', '5분이 경과하여 통화가 종료됩니다.');
    socketService.endCall(sessionId);
    navigation.replace('CallEnd', { sessionId });
  }
}, [callDuration, maxDuration]);
```

**동작 방식**:

1. 1초마다 `callDuration`을 1씩 증가시킨다
2. `callDuration`이 300에 도달하면 자동으로 통화를 종료한다
3. Zustand store에 저장해서 전역에서 접근 가능

### 6.2 타이머 UI

[mobile/src/components/call/CallTimer.tsx](mobile/src/components/call/CallTimer.tsx)

```typescript
export const CallTimer: React.FC<{ duration: number }> = ({ duration }) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <Text style={styles.timer}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </Text>
  );
};
```

화면 상단에 "03:45" 형태로 표시된다.

## 7. 테스트 결과

### 7.1 로컬 테스트 (iOS + Android)

```bash
# Terminal 1: 백엔드 서버
cd backend
npm run dev

# Terminal 2: iOS 시뮬레이터
cd mobile
npm run ios

# Terminal 3: Android 에뮬레이터
npm run android
```

**테스트 시나리오**:

1. iOS에서 사용자 A 로그인 → 랜덤 매칭
2. Android에서 사용자 B 로그인 → 랜덤 매칭
3. 매칭 성공 → 두 앱에서 VideoCallScreen 진입
4. iOS에서 A의 얼굴 보임, Android에서 B의 얼굴 보임
5. 음소거, 비디오 끄기, 카메라 전환 테스트
6. 5분 후 자동 종료 확인

**결과**:

```
[iOS A] ✅ Joined channel with UID: 123456789
[iOS A] 👤 Remote user joined: 987654321

[Android B] ✅ Joined channel with UID: 987654321
[Android B] 👤 Remote user joined: 123456789

[iOS A] 🎥 Video call started
[Android B] 🎥 Video call started

... 5분 후 ...

[iOS A] ⏰ Time up! Ending call
[Android B] 📞 Call ended by other party
```

성공적으로 1:1 영상 통화가 연결되고, 5분 후 자동으로 종료되었다.

### 7.2 네트워크 품질 테스트

실제 iOS 기기와 Android 기기로 테스트했다 (Wi-Fi 환경):

| 항목 | 결과 |
|------|------|
| **연결 시간** | 2~3초 |
| **비디오 품질** | 480p, 15fps (양호) |
| **음질** | 깨끗함, 지연 없음 |
| **지연 시간** | ~200ms (체감상 거의 없음) |
| **끊김** | 없음 |

LTE 환경에서도 테스트했는데, 약간의 화질 저하는 있었지만 통화에는 문제가 없었다.

## 8. 트러블슈팅

### 8.1 문제: iOS에서 비디오가 검은 화면으로 나옴

**증상**: Android는 정상인데 iOS에서만 비디오가 안 보인다

**원인**: iOS는 `startPreview()`를 호출해야 로컬 비디오가 렌더링된다

**해결**:
```typescript
// 비디오 활성화 후 반드시 미리보기 시작
agoraEngine.enableVideo();
agoraEngine.startPreview(); // 필수!
```

### 8.2 문제: Android에서 앱 크래시

**증상**: Android에서 통화 화면 진입 시 앱이 크래시된다

**원인**: 카메라/마이크 권한이 없는 상태에서 Agora SDK를 초기화하면 크래시 발생

**해결**:
```typescript
// SDK 초기화 전에 반드시 권한 확인
const grants = await PermissionsAndroid.requestMultiple([
  PermissionsAndroid.PERMISSIONS.CAMERA,
  PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
]);

if (grants['android.permission.CAMERA'] !== PermissionsAndroid.RESULTS.GRANTED) {
  Alert.alert('권한 필요', '카메라 권한이 필요합니다.');
  return; // 권한 없으면 초기화하지 않음
}
```

### 8.3 문제: 상대방 비디오가 안 보임

**증상**: 로컬 비디오는 보이는데 상대방 비디오가 안 보인다

**원인**: `onUserJoined` 이벤트에서 `remoteUid`를 제대로 설정하지 않았다

**디버깅**:
```typescript
agoraEngine.registerEventHandler({
  onUserJoined: (_connection, remoteUserUid) => {
    console.log('👤 Remote user joined:', remoteUserUid); // 로그 확인
    setRemoteUid(remoteUserUid); // State 업데이트
  },
});
```

로그를 확인해보니 `onUserJoined`가 호출되지 않았다. 알고 보니 상대방이 채널에 참가하지 못한 상태였다 (토큰 만료).

**해결**: 토큰 만료 시간을 1시간으로 늘렸다.

### 8.4 문제: RtcSurfaceView가 렌더링되지 않음

**증상**: `remoteUid !== 0`인데도 화면에 아무것도 안 보인다

**원인**: `RtcSurfaceView`의 style에 `width`, `height`가 없었다

**해결**:
```typescript
// 반드시 width, height 지정
<RtcSurfaceView
  canvas={{ uid: remoteUid }}
  style={{
    width: '100%',
    height: '100%',
  }}
/>
```

React Native의 일반 View와 달리, 네이티브 View는 명시적으로 크기를 지정해야 한다.

## 9. Agora vs WebRTC 비교

Agora를 사용한 후 느낀 점을 정리하면:

| 항목 | 직접 WebRTC 구현 | Agora 사용 |
|------|------------------|-----------|
| **개발 시간** | 2~3주 | 2~3일 |
| **코드 복잡도** | 매우 높음 | 낮음 |
| **품질** | 네트워크에 따라 불안정 | 안정적 |
| **크로스 플랫폼** | 각 플랫폼마다 구현 필요 | 하나의 SDK로 해결 |
| **STUN/TURN 서버** | 직접 운영 필요 | Agora가 제공 |
| **비용** | $0 (서버 비용 별도) | 월 10,000분 무료 |

Beyond Meet 같은 MVP에서는 **Agora가 압도적으로 유리**하다. 나중에 사용자가 많아지면 비용 문제로 WebRTC를 직접 구현할 수도 있지만, 초기 단계에서는 Agora가 최선의 선택이었다.

## 10. 개선 사항

현재 구현은 Beta 단계이므로 다음 기능들은 추후 추가할 예정이다:

1. **화질 자동 조절**: 네트워크 상태에 따라 해상도 자동 변경
2. **녹화 기능**: 신고 시 증거 자료로 활용 (법적 검토 필요)
3. **미용 필터**: 얼굴 보정 필터 (Agora Beauty Effect)
4. **배경 흐림**: 가상 배경 또는 배경 흐림 처리
5. **통화 품질 통계**: 지연시간, 패킷 손실률 실시간 표시

## 11. 정리

Agora를 사용한 WebRTC 영상 통화 구현을 정리하면:

1. **Agora 선택**: WebRTC 직접 구현은 복잡하므로 Agora CPaaS 사용
2. **토큰 생성**: 백엔드에서 `agora-token` 라이브러리로 토큰 생성 (UID=0)
3. **React Native SDK**: `react-native-agora`로 간단하게 영상 통화 구현
4. **이벤트 기반**: `onJoinChannelSuccess`, `onUserJoined` 이벤트로 상태 관리
5. **RtcSurfaceView**: 네이티브 View로 비디오 렌더링
6. **5분 제한**: 타이머로 통화 시간 제한 (무료 플랜 절약)
7. **권한 처리**: iOS/Android 각각 카메라/마이크 권한 요청

이제 Beyond Meet은 사용자가 매칭된 후 실시간으로 1:1 영상 통화를 할 수 있다. Agora 덕분에 WebRTC의 복잡함 없이 안정적인 영상 통화를 구현할 수 있었다.

다음 Part에서는 AI 콘텐츠 모더레이션 시스템을 다룬다. 통화 중 부적절한 콘텐츠를 자동으로 감지하고 차단하는 시스템을 구축한 과정을 정리할 예정이다.
