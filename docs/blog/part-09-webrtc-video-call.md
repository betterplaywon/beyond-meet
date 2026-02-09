# 영상 데이팅 앱 만들기 #9 - WebRTC 영상 통화 구현 (Agora)

> **이전 글 요약**: Part 8에서 Socket.io로 실시간 매칭 시스템을 구축했다. 티어 기반 알고리즘으로 사용자 필터를 적용하고, 주기적 재매칭으로 대기 중인 사용자들을 연결했다.

매칭이 완료되면 실제로 영상 통화를 연결해야 한다. 처음에는 WebRTC를 직접 구현하려고 했는데, 튜토리얼을 따라해보니 생각보다 훨씬 복잡했다.

---

## 💡 WebRTC를 직접 구현하지 않은 이유

"WebRTC 튜토리얼"로 검색하고 코드를 따라해봤다. SDP(Session Description Protocol) 교환, ICE Candidate 수집, STUN/TURN 서버 설정... 개념 하나하나가 복잡했다.

**직접 구현의 어려움**:
- SDP Offer/Answer를 서로 주고받아야 한다
- NAT 통과를 위한 ICE Candidate를 수집하고 교환해야 한다
- 방화벽 뒤에 있는 사용자를 위해 STUN/TURN 서버를 운영해야 한다
- iOS, Android 각각 다른 API를 사용한다

"WebRTC vs 영상 통화 서비스"로 검색해보니 **Agora**, **Twilio**, **Vonage** 같은 CPaaS(Communication Platform as a Service)가 있었다. 이런 서비스들은 WebRTC의 복잡함을 추상화해서 간단한 SDK로 제공한다.

### Agora를 선택한 이유

세 가지 서비스를 비교해봤다.

| 서비스 | 무료 플랜 | 가격 | React Native | 아시아 서버 |
|--------|-----------|------|--------------|-------------|
| Agora | 월 10,000분 | $0.99/1,000분 | 공식 지원 | 한국/일본 |
| Twilio | 없음 | $2.00/1,000분 | 커뮤니티 | 미국 중심 |
| Vonage | 월 1,000분 | $1.50/1,000분 | 제한적 | 유럽 중심 |

**Agora**를 선택한 이유는 명확했다.

1. **무료 플랜**: 월 10,000분이면 Beta 테스트에 충분하다 (20명 × 5분 × 100회 = 10,000분)
2. **React Native 공식 지원**: `react-native-agora` SDK가 잘 관리되고 있다
3. **아시아 서버**: 한국 사용자가 많으므로 지연 시간이 낮다

---

## 🔐 백엔드 토큰 생성

Agora에 연결하려면 **토큰**이 필요하다. 토큰은 채널 이름, 사용자 UID, 권한, 만료 시간 등의 정보를 포함한다. 보안상 토큰은 **백엔드**에서 생성해야 한다. 클라이언트에서 생성하면 App Certificate가 노출되기 때문이다.

```bash
cd backend
npm install agora-token
```

### UID 생성 방식의 변경

처음에는 UID=0으로 토큰을 생성했다. Agora 문서에 따르면 UID=0이면 Agora가 자동으로 UID를 할당한다고 했다.

```typescript
// 초기 구현 (UID=0)
const uid = 0;
const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);
```

하지만 실제 테스트에서 문제가 발생했다. 두 사용자가 같은 채널에 접속할 때 간헐적으로 한쪽 연결이 거부되는 현상이 있었다. Agora 포럼을 검색해보니 **프로덕션 환경에서는 UID=0보다 명시적인 UID를 사용하는 것이 권장**된다고 했다.

그래서 각 사용자에게 고유한 UID를 할당하도록 변경했다.

```typescript
// backend/src/services/match-service.ts
export const generateAgoraToken = (
  channelName: string,
  _userId?: string
): { token: string; uid: number } => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new AppError(500, 'AGORA_CONFIG_MISSING', 'Agora 설정이 누락되었습니다');
  }

  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600; // 1시간
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // 각 사용자에게 고유한 UID를 할당
  // uid=0(wildcard)으로 동일 토큰 발급 시 프로덕션에서 연결 충돌 가능
  const uid = Math.floor(Math.random() * 2147483646) + 1;

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

`2147483646`은 Agora UID의 최대값(2^31 - 2)이다. 1부터 이 값 사이의 난수를 생성해서 각 사용자에게 고유한 UID를 부여한다. 매칭 시 두 사용자 각각에게 다른 UID가 포함된 토큰이 발급된다.

---

## 📱 React Native Agora SDK 설정

```bash
cd mobile
npm install react-native-agora

# iOS
cd ios && pod install && cd ..
```

### 권한 설정

**iOS (Info.plist)**:
```xml
<key>NSCameraUsageDescription</key>
<string>영상 통화를 위해 카메라 권한이 필요합니다</string>
<key>NSMicrophoneUsageDescription</key>
<string>영상 통화를 위해 마이크 권한이 필요합니다</string>
```

**Android (AndroidManifest.xml)**:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## 🌐 Cloud Proxy 설정

테스트 중에 특정 네트워크 환경에서 연결이 안 되는 문제가 발생했다. 회사 네트워크나 일부 공공 Wi-Fi에서 Agora 연결이 실패하는 것이었다.

Agora 문서를 찾아보니 **Cloud Proxy** 기능이 있었다. 방화벽이나 엄격한 NAT 환경에서도 연결이 가능하도록 Agora의 프록시 서버를 통해 미디어를 전달하는 기능이다.

```typescript
// Cloud Proxy 설정 - NAT/방화벽 환경에서도 연결 가능하도록
// TcpProxy: TCP/TLS 443 포트 강제 사용 (방화벽 통과 보장)
agoraEngine.setCloudProxy(CloudProxyType.TcpProxy);
```

`TcpProxy` 모드는 443 포트(HTTPS)만 사용하므로 대부분의 방화벽을 통과할 수 있다. UDP보다 지연 시간이 약간 길어질 수 있지만, 연결 안정성이 훨씬 좋아졌다.

---

## 🎣 useAgoraEngine 커스텀 훅

처음에는 모든 Agora 로직을 `VideoCallScreen` 컴포넌트 안에 넣었다. 그런데 코드가 너무 길어지고, 다른 화면에서 재사용하기 어려웠다. 그래서 Agora 관련 로직을 커스텀 훅으로 분리했다.

```typescript
// mobile/src/hooks/call/useAgoraEngine.ts
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  CloudProxyType,
} from 'react-native-agora';

interface UseAgoraEngineParams {
  channelName: string;
  token: string;
  serverUid: number;
}

export const useAgoraEngine = ({ channelName, token, serverUid }: UseAgoraEngineParams) => {
  const engineRef = useRef<IRtcEngine | undefined>(undefined);
  const remoteUidRef = useRef<number>(0);
  const [localUid, setLocalUid] = useState<number>(0);
  const [isRemoteJoined, setIsRemoteJoined] = useState(false);

  useEffect(() => {
    const setupVideoSDK = async () => {
      // 권한 요청...

      engineRef.current = createAgoraRtcEngine();
      const agoraEngine = engineRef.current;

      agoraEngine.initialize({
        appId: ENV.AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // Cloud Proxy 활성화
      agoraEngine.setCloudProxy(CloudProxyType.TcpProxy);

      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: (_connection, joinedUid) => {
          setLocalUid(joinedUid);
        },
        onUserJoined: (_connection, remoteUserUid) => {
          remoteUidRef.current = remoteUserUid;
          setIsRemoteJoined(true);
        },
        onUserOffline: () => {
          remoteUidRef.current = 0;
          setIsRemoteJoined(false);
        },
      });

      agoraEngine.enableVideo();
      agoraEngine.startPreview();
      agoraEngine.joinChannel(token, channelName, serverUid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    };

    setupVideoSDK();

    return () => {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
    };
  }, [channelName, token, serverUid]);

  const controls = useMemo(() => ({
    muteAudio: (mute: boolean) => engineRef.current?.muteLocalAudioStream(mute),
    muteVideo: (mute: boolean) => engineRef.current?.muteLocalVideoStream(mute),
    switchCamera: () => engineRef.current?.switchCamera(),
  }), []);

  return { localUid, remoteUidRef, isRemoteJoined, controls };
};
```

이렇게 분리하면 몇 가지 장점이 있다.

1. **관심사 분리**: Agora 연결 로직과 UI 로직이 분리된다
2. **재사용성**: 다른 화면에서도 같은 훅을 사용할 수 있다
3. **테스트 용이성**: 훅을 독립적으로 테스트할 수 있다

---

## 🖥️ VideoCallScreen 구현

이제 화면 컴포넌트는 훅을 사용해서 간단해졌다.

```typescript
const VideoCallScreen: React.FC<Props> = ({ route }) => {
  const { channelName, token, uid: serverUid, sessionId } = route.params;

  const { localUid, remoteUidRef, isRemoteJoined, controls } = useAgoraEngine({
    channelName,
    token,
    serverUid,
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const handleToggleMute = () => {
    controls.muteAudio(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    controls.muteVideo(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  return (
    <View style={styles.container}>
      {/* 상대방 비디오 (전체 화면) */}
      {isRemoteJoined && (
        <RtcSurfaceView
          canvas={{ uid: remoteUidRef.current }}
          style={styles.remoteVideo}
        />
      )}

      {/* 내 비디오 (작은 화면) */}
      {localUid !== 0 && (
        <RtcSurfaceView
          canvas={{ uid: localUid }}
          style={styles.localVideo}
        />
      )}

      {/* 컨트롤 버튼 */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={handleToggleMute}>
          <Icon name={isMuted ? 'mic-off' : 'mic'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleVideo}>
          <Icon name={isVideoOff ? 'videocam-off' : 'videocam'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={controls.switchCamera}>
          <Icon name="flip-camera-ios" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

`RtcSurfaceView`는 Agora의 네이티브 View다. React Native의 일반 View가 아니라 iOS/Android 네이티브 View를 직접 렌더링한다. `canvas.uid`에 렌더링할 사용자의 UID를 지정한다.

---

## ⏱️ 통화 타이머 (5분 제한)

Beyond Meet은 통화 시간을 **5분으로 제한**했다. 이유는 세 가지다.

1. **Agora 무료 플랜**: 월 10,000분으로 제한되므로 장시간 통화를 막아야 한다
2. **첫 만남 부담 감소**: 처음 만나는 사람과 너무 긴 통화는 부담스럽다
3. **다음 매칭 유도**: 5분 후 새로운 사람과 매칭을 유도한다

```typescript
const maxDuration = 300; // 5분
const [callDuration, setCallDuration] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setCallDuration(prev => {
      if (prev >= maxDuration) {
        clearInterval(interval);
        return prev;
      }
      return prev + 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, []);

useEffect(() => {
  if (callDuration >= maxDuration) {
    Alert.alert('시간 종료', '5분이 경과하여 통화가 종료됩니다.');
    socketService.endCall(sessionId);
    navigation.replace('CallEnd', { sessionId });
  }
}, [callDuration]);
```

---

## 🔧 겪었던 문제들

### iOS에서 비디오가 검은 화면

Android는 정상인데 iOS에서만 비디오가 안 보였다. iOS는 `startPreview()`를 반드시 호출해야 로컬 비디오가 렌더링된다.

```typescript
agoraEngine.enableVideo();
agoraEngine.startPreview(); // iOS 필수!
```

### 특정 네트워크에서 연결 실패

회사 네트워크나 일부 공공 Wi-Fi에서 연결이 안 됐다. 방화벽이 UDP 포트를 차단하고 있었다. Cloud Proxy를 TCP 모드로 설정해서 해결했다.

```typescript
agoraEngine.setCloudProxy(CloudProxyType.TcpProxy);
```

### RtcSurfaceView가 렌더링 안 됨

`remoteUid !== 0`인데도 화면에 아무것도 안 보였다. React Native의 일반 View와 달리 네이티브 View는 명시적으로 크기를 지정해야 했다.

```typescript
<RtcSurfaceView
  canvas={{ uid: remoteUid }}
  style={{ width: '100%', height: '100%' }} // 필수!
/>
```

---

## 🎯 테스트 결과

iOS와 Android 실제 기기로 테스트했다.

| 항목 | 결과 |
|------|------|
| 연결 시간 | 2~3초 |
| 비디오 품질 | 480p, 15fps |
| 지연 시간 | ~200ms |
| 끊김 | 없음 (Cloud Proxy 적용 후) |

LTE 환경에서도 약간의 화질 저하는 있었지만 통화에는 문제가 없었다.

---

## 📚 다음 글 예고

**Part 10: AI 콘텐츠 모더레이션**

다음 글에서는 통화 중 부적절한 콘텐츠를 자동으로 감지하고 경고하는 AI 모더레이션 시스템을 구축한다. Hugging Face의 NSFW 탐지 모델을 사용해 실시간으로 화면을 분석하는 과정을 다룰 예정이다.

---

## 💬 마치며

Agora를 사용해 영상 통화를 구현하면서 몇 가지를 배웠다.

WebRTC를 직접 구현하는 것과 CPaaS를 사용하는 것의 차이가 명확했다. 직접 구현하면 2~3주가 걸릴 작업을 Agora로는 2~3일 만에 끝냈다. MVP 단계에서는 확실히 CPaaS가 유리하다.

UID=0으로 토큰을 생성하면 편하지만, 프로덕션에서는 각 사용자에게 고유한 UID를 할당하는 게 안전하다는 것도 알게 됐다. 문서에 명시적으로 쓰여있지 않은 실전 노하우였다.

Cloud Proxy는 생각보다 중요했다. 개발 환경에서는 잘 되던 게 실제 사용자 환경에서 안 될 수 있다. 방화벽 뒤의 사용자를 위해 TcpProxy 모드를 기본으로 켜두는 게 좋다.

커스텀 훅으로 로직을 분리한 것도 좋은 선택이었다. 코드가 깔끔해지고 유지보수가 쉬워졌다.

다음 글에서는 AI 콘텐츠 모더레이션 시스템을 구축한다.

---

**태그**: `WebRTC` `Agora` `영상 통화` `React Native` `Cloud Proxy` `커스텀 훅`
