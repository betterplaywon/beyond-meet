# 영상 데이팅 앱 만들기 #10 - AI 콘텐츠 모더레이션 시스템

> **이전 글 요약**: Part 9에서 Agora를 사용해 1:1 영상 통화를 구현했다. Cloud Proxy로 방화벽 환경에서도 연결이 가능하도록 했고, useAgoraEngine 커스텀 훅으로 코드를 분리했다.

영상 통화가 구현되면 다음으로 고민해야 할 건 **안전장치**였다. 영상 데이팅 앱에서 부적절한 콘텐츠는 서비스 신뢰도에 큰 영향을 미칠 수 있기 때문에, 자동으로 감지하고 대응하는 시스템이 필요하다고 생각했다.

---

## 왜 자동 모더레이션인가

처음에는 "사용자가 신고하면 관리자가 확인하면 되지 않을까?"라고 생각했다. 하지만 다른 데이팅 앱 사례를 찾아보면서 **실시간 모더레이션**의 필요성을 느끼게 됐다.

수동 모더레이션의 한계는 명확했다. 신고를 받고 관리자가 확인할 때까지 시간이 걸린다. 이미 부적절한 콘텐츠를 본 후에 신고가 들어오므로 피해가 발생한 뒤다. 그리고 관리자가 24시간 대기하는 것도 현실적이지 않다.

"영상 통화 AI 모더레이션"으로 검색해보니 Google Cloud Vision, AWS Rekognition, Hugging Face 등 여러 선택지가 있었다.

### Hugging Face를 선택한 이유

여러 서비스를 비교한 끝에 **Hugging Face**를 선택했다.

- **무료 티어**: 월 30,000건 무료 요청이 가능해서 Beta 테스트에 충분했다
- **오픈소스 기반**: 나중에 사용자가 많아지면 자체 서버에서 모델을 돌릴 수 있다
- **간단한 API**: REST API 호출만으로 이미지 분석이 가능하다

NSFW 감지 모델로는 **Falconsai/nsfw_image_detection**을 사용했다. 이진 분류(nsfw vs normal)를 수행하고, 응답 속도도 준수하며(~200ms), 정확도도 약 90% 정도로 괜찮았다.

---

## 모더레이션 전략 설계

### 분석 주기를 얼마나 자주 할 것인가

영상 통화를 얼마나 자주 분석할지 고민이 됐다.

- **매 프레임**: API 호출 비용이 너무 높다 (초당 15~30건)
- **1초마다**: 여전히 비용이 높다 (5분 통화 = 300건)
- **5초마다**: 적절한 균형점 (5분 통화 = 60건)

결국 **5초마다 분석**하기로 했다. 무료 한도 30,000건을 기준으로 계산하면 약 500번의 통화가 가능하다. 5초는 심각한 콘텐츠를 감지하기에 충분히 짧은 간격이라고 판단했다.

### 임계값은 어떻게 설정할 것인가

AI가 판단하는 신뢰도(Confidence)에 따라 어떤 조치를 취할지 결정해야 했다.

처음에는 0.3(경고)/0.6(강제 종료)으로 설정했는데, 테스트해보니 오탐지(False Positive)가 생각보다 많았다. 어두운 조명이나 빠른 움직임에서도 경고가 뜨는 경우가 있었다.

여러 번 테스트를 거쳐 임계값을 **0.7(경고)/0.9(강제 종료)**로 높이고, 환경변수로 조정할 수 있게 했다.

```typescript
// backend/src/services/moderation-service.ts
const THRESHOLD_MINOR = parseFloat(process.env.MODERATION_THRESHOLD_MINOR || '0.7');
const THRESHOLD_SEVERE = parseFloat(process.env.MODERATION_THRESHOLD_SEVERE || '0.9');
```

- **0.7 이상**: 경고만 보냄 (통화는 계속 가능)
- **0.9 이상**: 즉시 통화 종료

임계값을 환경변수로 빼둔 이유는 Beta 테스트 피드백에 따라 유연하게 조정하기 위해서다.

---

## 백엔드 모더레이션 서비스

### Hugging Face API 연동

```typescript
// backend/src/services/moderation-service.ts
import { imageClassification } from '@huggingface/inference';

export const analyzeImage = async (
  imageBase64: string
): Promise<{ confidence: number; label: string }> => {
  // 이미지 크기 검증
  validateImageForModeration(imageBase64);

  // Base64 → Buffer → Blob 변환
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: 'image/jpeg' });

  // AI 모델로 분석
  const result = await imageClassification({
    model: 'Falconsai/nsfw_image_detection',
    inputs: blob,
    accessToken: HUGGINGFACE_API_KEY,
  });

  // 결과 파싱
  const nsfwResult = result.find((r) => r.label === 'nsfw');
  const confidence = nsfwResult?.score || 0;

  return { confidence, label: nsfwResult?.label || 'normal' };
};
```

Hugging Face API는 Blob 형식을 요구하므로 Base64 → Buffer → Blob 변환 과정이 필요했다.

### 액션 결정 로직

```typescript
export const determineAction = (confidence: number): ModerationAction => {
  if (confidence >= THRESHOLD_SEVERE) {
    return 'CALL_ENDED'; // 강제 종료
  } else if (confidence >= THRESHOLD_MINOR) {
    return 'WARNING_ISSUED'; // 경고
  } else {
    return 'NONE'; // 정상
  }
};
```

---

## 모바일 앱에서 프레임 캡처하기

### 캡처 방식을 바꾸게 된 이유

처음에는 Agora SDK의 `takeSnapshot` 메서드를 사용했다. 하지만 몇 가지 문제가 있었다.

1. `takeSnapshot`은 콜백 방식이라 코드가 복잡해졌다
2. 특정 상황에서 캡처가 실패하는 경우가 있었다
3. 에러 핸들링이 까다로웠다

그래서 **react-native-view-shot**으로 변경했다. 이 라이브러리는 React Native의 View를 이미지로 캡처하는 기능을 제공한다.

```typescript
// ViewShot 래퍼로 상대방 비디오를 감싼다
<ViewShot ref={remoteVideoRef}>
  <RtcSurfaceView canvas={{ uid: remoteUid }} style={styles.remoteVideo} />
</ViewShot>
```

그리고 `capture()` 메서드로 스크린샷을 찍는다.

```typescript
const uri = await remoteVideoRef.current.capture?.();
const base64 = await RNFS.readFile(uri, 'base64');
```

Agora의 네이티브 메서드보다 이 방식이 더 간단하고 안정적이었다.

### useModeration 커스텀 훅

모더레이션 로직도 커스텀 훅으로 분리했다. Part 9에서 useAgoraEngine을 분리한 것처럼, 관심사를 나누면 VideoCallScreen 컴포넌트가 훨씬 깔끔해진다.

```typescript
// mobile/src/hooks/call/useModeration.ts
export const useModeration = ({
  sessionId,
  partnerId,
  isCallEndedRef,
  remoteVideoRef,
  isRemoteJoined,
  isJoined,
  onCallForceEnd,
}: UseModerationParams) => {
  const moderationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnalyzingRef = useRef(false);

  const captureAndAnalyzeFrame = useCallback(async () => {
    if (isCallEndedRef.current) return;
    if (!remoteVideoRef.current) return;
    if (isAnalyzingRef.current) return; // 중복 분석 방지

    isAnalyzingRef.current = true;

    try {
      // ViewShot으로 캡처
      const uri = await remoteVideoRef.current.capture?.();
      if (!uri) return;

      // Base64로 변환
      const base64 = await RNFS.readFile(uri, 'base64');
      const imageBase64 = `data:image/jpeg;base64,${base64}`;

      // 임시 파일 삭제
      await RNFS.unlink(uri).catch(() => {});

      // API 호출
      const response = await api.post('/moderation/analyze', {
        sessionId,
        imageBase64,
      }, { timeout: 30000 });

      const { action } = response.data.data;

      // 액션 처리
      if (action === 'WARNING_ISSUED') {
        socketService.sendModerationWarning(sessionId, partnerId);
      } else if (action === 'CALL_ENDED') {
        socketService.sendModerationForceEnd(sessionId);
        onCallForceEnd();
      }
    } catch {
      // 에러는 무시 (다음 주기에 재시도)
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [sessionId, partnerId, isCallEndedRef, remoteVideoRef, onCallForceEnd]);

  useEffect(() => {
    if (!isJoined || !isRemoteJoined) {
      cleanup();
      return;
    }

    // 3초 후 첫 분석, 이후 5초마다
    const timeout = setTimeout(() => captureAndAnalyzeFrame(), 3000);
    const interval = setInterval(() => captureAndAnalyzeFrame(), 5000);

    moderationIntervalRef.current = interval;

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isJoined, isRemoteJoined, captureAndAnalyzeFrame]);

  return { cleanup };
};
```

핵심 포인트를 정리하면:
- **isAnalyzingRef**: 이전 분석이 끝나기 전에 새 분석이 시작되는 것을 방지한다
- **3초 후 첫 분석**: 통화 연결 직후에는 화면이 불안정할 수 있어서 잠시 대기한다
- **5초 간격**: API 호출 비용과 감지 속도 사이의 균형점이다

---

## Socket.io로 경고와 강제 종료 전달하기

### 경고 전송

클라이언트가 `WARNING_ISSUED` 응답을 받으면 Socket.io로 상대방에게 경고를 보낸다.

```typescript
// 백엔드 Socket 핸들러
socket.on('moderation:warning', async (data) => {
  io.to(data.targetUserId).emit('moderation:warning-received', {
    sessionId: data.sessionId,
    message: '부적절한 행동이 감지되었습니다.',
  });
});
```

### 강제 종료

`CALL_ENDED` 응답을 받으면 양쪽 사용자 모두에게 통화 종료를 알린다.

```typescript
socket.on('moderation:force-end', async (data) => {
  const session = await prisma.matchSession.findUnique({
    where: { id: data.sessionId },
  });

  // 양쪽 사용자에게 알림
  io.to(session.userId1).emit('moderation:call-force-ended', {
    reason: 'Inappropriate content detected',
  });
  io.to(session.userId2).emit('moderation:call-force-ended', {
    reason: 'Inappropriate content detected',
  });

  // 자동 신고 생성
  await moderationService.createAutoReport({
    reportedUserId: data.reportedUserId,
    sessionId: data.sessionId,
  });
});
```

---

## 테스트 결과

### 정상 통화

```
[A] AI Analysis: confidence=0.08 → Action: NONE
[B] AI Analysis: confidence=0.05 → Action: NONE
```

정상 통화에서는 신뢰도가 0.05~0.15 정도로 낮게 나왔다.

### 부적절한 콘텐츠 감지

```
[A] AI Analysis: confidence=0.75 → Action: WARNING_ISSUED
[B] Warning received

... 계속 ...

[A] AI Analysis: confidence=0.92 → Action: CALL_ENDED
[A] Call force ended
[B] Call force ended
```

신뢰도 0.75에서 경고가 발송되고, 0.92에서 강제 종료되는 것을 확인했다.

### 오탐지 개선

임계값을 0.7/0.9로 높인 후 오탐지가 크게 줄었다.

- 어두운 조명: ~0.25 (경고 미만)
- 빠른 움직임: ~0.30 (경고 미만)
- 카메라 흔들림: ~0.20 (경고 미만)

---

## 겪었던 문제들

### ViewShot 캡처가 검은 화면으로 나오는 문제

처음에 ViewShot으로 캡처했더니 검은 화면만 나왔다. Agora의 RtcSurfaceView가 네이티브 View라서 발생하는 문제였다.

ViewShot의 `captureMode="continuous"` 옵션과 View에 `collapsable={false}`를 추가해서 해결했다.

### Hugging Face API 콜드 스타트

첫 요청이 5~10초 걸리는 경우가 있었다. 무료 서버는 모델이 메모리에 로드되어 있지 않으면 느려지는 현상이 있다.

타임아웃을 30초로 넉넉하게 설정하고, 첫 분석은 연결 후 3초 뒤에 시작하도록 해서 연결 직후의 불안정한 상태를 피했다.

---

## 다음 글 예고

**Part 11: Supabase Storage 프로필 사진**

다음 글에서는 Supabase Storage를 사용해 프로필 사진 업로드를 구현한다. 이미지 리사이즈, 보안 정책, 캐싱 전략을 다룰 예정이다.

---

## 마치며

AI 콘텐츠 모더레이션을 구현하면서 몇 가지 배운 점이 있다.

임계값 설정이 생각보다 까다로웠다. 너무 낮으면 오탐지가 많아지고, 너무 높으면 실제 문제를 놓칠 수 있다. 0.7/0.9로 시작하고 피드백에 따라 조정하는 방식이 현실적인 접근이었다.

캡처 방식도 여러 번 바꿨다. Agora의 takeSnapshot보다 react-native-view-shot이 더 간단하고 안정적으로 동작했다.

커스텀 훅으로 로직을 분리한 것도 좋은 선택이었다. useAgoraEngine, useModeration처럼 관심사를 분리하니 VideoCallScreen 컴포넌트가 훨씬 읽기 쉬워졌다.

완벽한 시스템은 아니지만, Beta 단계의 안전장치로는 충분하다고 생각한다. 사용자가 많아지면 자체 서버에 모델을 배포해서 지연 시간을 줄일 계획이다.

---

**태그**: `AI` `Hugging Face` `콘텐츠 모더레이션` `NSFW` `React Native` `커스텀 훅`
