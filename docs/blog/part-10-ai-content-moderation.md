# Part 10: AI 콘텐츠 모더레이션 시스템

Part 9에서 1:1 영상 통화를 구현했다면, 이제 가장 중요한 **안전장치**를 추가할 차례다. 영상 데이팅 앱에서 부적절한 콘텐츠는 큰 문제가 될 수 있으므로, AI로 자동 감지하고 차단하는 시스템을 구축했다.

## 💡 왜 콘텐츠 모더레이션이 필요한가?

처음에는 "사용자가 신고하면 관리자가 확인하면 되지 않을까?"라고 생각했다. 하지만 다른 데이팅 앱 사례를 조사해보니, **실시간 모더레이션**이 필수라는 걸 알게 됐다.

### 수동 모더레이션의 한계

1. **대응 속도**: 신고를 받고 관리자가 확인할 때까지 시간이 걸린다
2. **피해 발생**: 이미 부적절한 콘텐츠를 본 후에 신고하므로 피해가 발생한다
3. **관리자 부담**: 24시간 대기해야 하고, 모든 신고를 확인하기 어렵다

"영상 통화 AI 모더레이션"으로 검색해보니, 여러 서비스가 있었다:

1. **Google Cloud Vision API**: 이미지 분석 API, NSFW 감지 가능
2. **AWS Rekognition**: 얼굴, 객체, 텍스트 인식, NSFW 감지
3. **Hugging Face**: 오픈소스 AI 모델, 무료 API 제공

Beyond Meet은 **Hugging Face**를 선택했다. 그 이유는:

- **무료**: 월 30,000건 무료 요청 (Beta 테스트에 충분)
- **오픈소스**: 나중에 자체 서버에서 모델을 돌릴 수 있다
- **간단한 API**: REST API 호출만으로 이미지 분석 가능

## 1. Hugging Face 설정

### 1.1 Hugging Face 계정 생성

1. [Hugging Face](https://huggingface.co/)에서 회원가입
2. Settings → Access Tokens → New token 생성
3. Token 복사

**.env에 추가**:

```bash
HUGGINGFACE_API_KEY=hf_your_token_here
```

### 1.2 NSFW 감지 모델 선택

"Hugging Face NSFW detection"으로 검색했더니 여러 모델이 나왔다:

1. **Falconsai/nsfw_image_detection**: 간단한 NSFW vs Normal 분류
2. **google/vit-base-patch16-224**: 범용 이미지 분류 모델
3. **microsoft/resnet-50**: 객체 인식 모델

Beyond Meet은 **Falconsai/nsfw_image_detection**을 선택했다. 이 모델은:

- 이진 분류: `nsfw` vs `normal`
- 빠른 응답: ~200ms
- 높은 정확도: ~90%

## 2. 모더레이션 전략 설계

### 2.1 언제 분석할까?

"영상 통화 모더레이션 타이밍"으로 검색해보니 여러 방법이 있었다:

**A. 매 프레임 분석**
- 장점: 즉시 감지
- 단점: API 호출 비용이 매우 높다 (초당 15~30프레임)

**B. 1초마다 분석**
- 장점: 빠른 감지
- 단점: 여전히 비용이 높다 (5분 통화 = 300건)

**C. 3~5초마다 분석**
- 장점: 적절한 감지 속도와 비용
- 단점: 3~5초 동안은 감지 못함

Beyond Meet은 **4초마다 분석**하기로 했다. 이유는:

- 5분 통화 = 75건 요청 (무료 한도 30,000건 / 75건 = 400번 통화 가능)
- 4초는 충분히 짧아서 심각한 콘텐츠를 빠르게 감지할 수 있다

### 2.2 신뢰도 임계값 설정

AI가 "부적절한 콘텐츠입니다"라고 판단하는 신뢰도(Confidence)를 어떻게 설정할까?

"AI 모더레이션 임계값"으로 검색해보니, 대부분 **이중 임계값**을 사용했다:

- **경고 임계값** (Minor): 0.3~0.5 → 경고만 보냄
- **강제 종료 임계값** (Severe): 0.6~0.8 → 즉시 통화 종료

Beyond Meet의 임계값:

```typescript
const THRESHOLD_MINOR = 0.3; // 30% 이상: 경고
const THRESHOLD_SEVERE = 0.6; // 60% 이상: 강제 종료
```

왜 0.3/0.6인가?

- **0.3보다 낮으면**: 너무 많은 False Positive (오탐지)
- **0.6보다 높으면**: False Negative (놓침)가 많아진다

테스트해본 결과, 0.3/0.6이 적절한 균형점이었다.

## 3. 백엔드 모더레이션 서비스

### 3.1 Hugging Face API 연동

[backend/src/services/moderation-service.ts](backend/src/services/moderation-service.ts:77-117)

```typescript
import { imageClassification } from '@huggingface/inference';

/**
 * 이미지 분석 (Hugging Face API)
 */
export const analyzeImage = async (
  imageBase64: string
): Promise<{ confidence: number; label: string }> => {
  try {
    // 1. 이미지 검증 (크기, 포맷 등)
    validateImageForModeration(imageBase64);

    // 2. Base64 문자열을 Buffer로 변환
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 3. Buffer를 Blob으로 변환 (Hugging Face API 요구사항)
    const blob = new Blob([buffer.buffer], { type: 'image/png' });

    // 4. AI 모델로 이미지 분석
    const result = await imageClassification({
      model: 'Falconsai/nsfw_image_detection',
      data: blob,
      accessToken: HUGGINGFACE_API_KEY,
    });

    // 5. 응답 파싱: [{ label: 'nsfw', score: 0.95 }, { label: 'normal', score: 0.05 }]
    const nsfwResult = result.find((r) => r.label === 'nsfw');
    const confidence = nsfwResult?.score || 0;

    return {
      confidence,
      label: nsfwResult?.label || 'normal',
    };
  } catch (error) {
    console.error('[MODERATION] Hugging Face API error:', error);
    throw new AppError(500, 'AI_ANALYSIS_FAILED', 'AI 분석 실패');
  }
};
```

**핵심 포인트**:

1. **Base64 → Buffer → Blob**: Hugging Face API는 Blob을 요구한다
2. **imageClassification**: Hugging Face 라이브러리 함수
3. **score**: 0.0 ~ 1.0 사이 값 (1.0에 가까울수록 NSFW)

### 3.2 액션 결정 로직

[backend/src/services/moderation-service.ts](backend/src/services/moderation-service.ts:172-182)

```typescript
/**
 * 판단 로직: 신뢰도 기반 액션 결정
 */
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

간단한 if-else 문이지만, 이게 모든 모더레이션 결정의 핵심이다.

### 3.3 API 할당량 관리

Hugging Face 무료 플랜은 **월 30,000건**으로 제한된다. 초과하면 API가 막히므로, Redis로 카운터를 관리한다.

[backend/src/services/moderation-service.ts](backend/src/services/moderation-service.ts:26-50)

```typescript
/**
 * Hugging Face API 할당량 확인
 */
export const checkApiQuota = async (): Promise<boolean> => {
  if (!redis) {
    console.warn('[MODERATION] Redis not available, skipping quota check');
    return true; // Redis 없어도 모더레이션 계속 진행
  }

  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // '2025-01'
    const key = `moderation:quota:${currentMonth}`;

    const count = await redis.get(key);
    const currentCount = count ? parseInt(count as string) : 0;

    if (currentCount >= MONTHLY_QUOTA) {
      console.warn('[MODERATION] Monthly quota exceeded:', currentCount);
      return false;
    }

    return true;
  } catch (error) {
    // Redis 연결 실패 시에도 모더레이션 계속 진행
    console.warn('[MODERATION] Redis error, skipping quota check:', error);
    return true;
  }
};
```

**Graceful Degradation**: Redis가 없거나 실패해도 모더레이션은 계속 작동한다. 안전이 우선이기 때문이다.

### 3.4 모더레이션 로그 저장

[backend/src/services/moderation-service.ts](backend/src/services/moderation-service.ts:122-138)

```typescript
/**
 * 모니터링 로그 생성
 */
export const createModerationLog = async (data: {
  sessionId: string;
  userId: string;
  confidence: number;
  actionTaken: ModerationAction;
  metadata?: any;
}) => {
  return await prisma.contentModerationLog.create({
    data: {
      sessionId: data.sessionId,
      userId: data.userId,
      confidence: data.confidence,
      actionTaken: data.actionTaken,
      metadata: data.metadata || {},
    },
  });
};
```

모든 분석 결과를 DB에 저장한다. 나중에 통계 분석이나 오탐지 개선에 사용한다.

## 4. 모바일 앱 프레임 캡처

### 4.1 Agora SDK의 takeSnapshot

처음에는 `react-native-view-shot`으로 화면을 캡처하려고 했다. 하지만 문제가 있었다:

- `RtcSurfaceView`는 네이티브 View이므로 `react-native-view-shot`으로 캡처가 안 된다
- 캡처되더라도 검은 화면이나 빈 화면이 나온다

"Agora screenshot"으로 검색해보니, Agora SDK가 **takeSnapshot** 메서드를 제공한다는 걸 알게 됐다.

[mobile/src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx:105-217)

```typescript
const captureAndAnalyzeFrame = useCallback(async () => {
  try {
    // 1. 통화 종료 상태 체크
    if (isCallEndedRef.current || remoteUidRef.current === 0) {
      return;
    }

    // 2. 임시 파일 경로 생성
    const timestamp = Date.now();
    const filePath = `${RNFS.CachesDirectoryPath}/moderation_snapshot_${timestamp}.jpg`;

    // 3. Promise 생성 (onSnapshotTaken 콜백 대기)
    const snapshotPromise = new Promise<string>((resolve, reject) => {
      snapshotResolverRef.current = { resolve, reject };

      // 5초 타임아웃
      setTimeout(() => {
        if (snapshotResolverRef.current) {
          snapshotResolverRef.current = null;
          reject(new Error('Snapshot timeout'));
        }
      }, 5000);
    });

    // 4. Agora SDK의 takeSnapshot 호출
    const result = agoraEngineRef.current.takeSnapshot(
      remoteUidRef.current, // 상대방 UID
      filePath,
    );

    if (result !== 0) {
      snapshotResolverRef.current = null;
      return;
    }

    // 5. onSnapshotTaken 콜백이 호출될 때까지 대기
    const capturedFilePath = await snapshotPromise;

    // 6. 파일을 Base64로 변환
    const base64 = await RNFS.readFile(capturedFilePath, 'base64');
    const imageBase64 = `data:image/jpeg;base64,${base64}`;

    // 7. 임시 파일 삭제
    await RNFS.unlink(capturedFilePath).catch(() => {});

    // 8. API 호출
    const response = await api.post('/moderation/analyze', {
      sessionId,
      imageBase64,
    });

    const { action } = response.data.data;

    // 9. 액션 처리
    if (action === 'WARNING_ISSUED') {
      socketService.sendModerationWarning(sessionId, remoteUidRef.current.toString());
    } else if (action === 'CALL_ENDED') {
      isCallEndedRef.current = true;
      socketService.sendModerationForceEnd(sessionId);
      Alert.alert('통화 종료', '부적절한 콘텐츠가 감지되어 통화가 종료되었습니다.');
    }
  } catch (error) {
    // 에러는 조용히 무시 (다음 프레임에서 재시도)
  }
}, [sessionId]);
```

**핵심 포인트**:

1. **takeSnapshot**: Agora SDK가 비디오 스트림을 직접 캡처해 파일로 저장
2. **Promise 패턴**: `onSnapshotTaken` 콜백을 Promise로 감싸서 `await` 가능
3. **Base64 변환**: 파일을 Base64로 변환해 API로 전송
4. **임시 파일 삭제**: 디스크 공간 절약을 위해 캡처 후 즉시 삭제

### 4.2 onSnapshotTaken 콜백

[mobile/src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx:371-390)

```typescript
agoraEngine.registerEventHandler({
  // ...
  onSnapshotTaken: (_connection, _uid, filePath, _width, _height, errCode) => {
    if (snapshotResolverRef.current) {
      if (errCode === 0) {
        snapshotResolverRef.current.resolve(filePath);
      } else {
        snapshotResolverRef.current.reject(
          new Error(`Snapshot failed with error code: ${errCode}`)
        );
      }
      snapshotResolverRef.current = null;
    }
  },
});
```

Agora가 스냅샷을 완료하면 이 콜백이 호출된다. Promise를 resolve/reject해서 `await snapshotPromise`가 완료된다.

### 4.3 4초마다 캡처

[mobile/src/screens/call/VideoCallScreen.tsx](mobile/src/screens/call/VideoCallScreen.tsx:220-242)

```typescript
useEffect(() => {
  // 통화 중이고, 상대방이 있을 때만 실행
  if (!isJoined || remoteUid === 0) {
    if (moderationIntervalRef.current) {
      clearInterval(moderationIntervalRef.current);
      moderationIntervalRef.current = null;
    }
    return;
  }

  // 4초마다 캡처 및 분석
  const interval = setInterval(() => {
    captureAndAnalyzeFrame();
  }, 4000);

  moderationIntervalRef.current = interval;

  return () => {
    if (moderationIntervalRef.current) {
      clearInterval(moderationIntervalRef.current);
      moderationIntervalRef.current = null;
    }
  };
}, [isJoined, remoteUid, captureAndAnalyzeFrame]);
```

## 5. Socket.io 경고/강제 종료

### 5.1 경고 전송

클라이언트가 AI로부터 `WARNING_ISSUED` 응답을 받으면, Socket.io로 상대방에게 경고를 보낸다:

[backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts:298-311)

```typescript
socket.on('moderation:warning', async (data: { sessionId: string; targetUserId: string }) => {
  try {
    // 상대방에게 경고 알림
    io.to(data.targetUserId).emit('moderation:warning-received', {
      sessionId: data.sessionId,
      message: '부적절한 행동이 감지되었습니다. 경고를 받았습니다.',
    });
  } catch (error) {
    console.error('[MODERATION] Warning error:', error);
  }
});
```

상대방은 `moderation:warning-received` 이벤트를 받아서 경고 모달을 표시한다.

### 5.2 강제 종료

`CALL_ENDED` 응답을 받으면 즉시 통화를 강제 종료한다:

[backend/src/sockets/match-handler.ts](backend/src/sockets/match-handler.ts:316-359)

```typescript
socket.on('moderation:force-end', async (data: { sessionId: string; reportedUserId: string }) => {
  try {
    const session = await prisma.matchSession.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) {
      return;
    }

    // 통화 종료 처리
    const result = await matchService.endCall(data.sessionId, data.reportedUserId);

    // 양쪽 사용자에게 강제 종료 알림
    io.to(session.userId1).emit('moderation:call-force-ended', {
      sessionId: data.sessionId,
      reason: 'Inappropriate content detected',
    });

    io.to(session.userId2).emit('moderation:call-force-ended', {
      sessionId: data.sessionId,
      reason: 'Inappropriate content detected',
    });

    // 자동 신고 생성
    await moderationService.createAutoReport({
      reportedUserId: data.reportedUserId,
      sessionId: data.sessionId,
      confidence: 0.7,
    });
  } catch (error) {
    console.error('[MODERATION] Force end error:', error);
  }
});
```

두 사용자 모두 통화가 종료되고, AI가 자동으로 신고를 생성한다.

## 6. 테스트 결과

### 6.1 정상 통화 테스트

```bash
# 사용자 A, B가 정상적으로 대화
[A] 🎥 Video call started
[B] 🎥 Video call started

... 4초마다 캡처 및 분석 ...

[A] 📸 Snapshot taken
[A] 🔍 AI Analysis: confidence=0.05 (normal)
[A] ✅ Action: NONE

[B] 📸 Snapshot taken
[B] 🔍 AI Analysis: confidence=0.08 (normal)
[B] ✅ Action: NONE

... 5분 후 자동 종료 ...
```

정상 통화에서는 신뢰도가 0.05~0.15 정도로 낮게 나왔다.

### 6.2 부적절한 콘텐츠 테스트

테스트를 위해 부적절한 이미지를 화면에 띄워봤다:

```bash
[A] 📸 Snapshot taken
[A] 🔍 AI Analysis: confidence=0.35 (nsfw)
[A] ⚠️ Action: WARNING_ISSUED

[B] 📨 Warning received: 부적절한 행동이 감지되었습니다

... 계속 부적절한 콘텐츠 유지 ...

[A] 📸 Snapshot taken (8초 후)
[A] 🔍 AI Analysis: confidence=0.72 (nsfw)
[A] ❌ Action: CALL_ENDED

[A] 📞 Call force ended
[B] 📞 Call force ended: Inappropriate content detected
```

신뢰도 0.35에서 경고를 받고, 0.72에서 강제 종료되었다.

### 6.3 오탐지 (False Positive) 테스트

AI가 정상 콘텐츠를 부적절하다고 판단하는 경우도 있었다:

- **어두운 조명**: 신뢰도 ~0.25 (경고 미만)
- **카메라 흔들림**: 신뢰도 ~0.20 (경고 미만)
- **빠른 움직임**: 신뢰도 ~0.30 (경고 수준)

임계값 0.3/0.6을 선택한 이유가 여기에 있다. 0.3보다 낮으면 오탐지가 너무 많고, 0.6보다 높으면 실제 부적절한 콘텐츠를 놓칠 수 있다.

## 7. 트러블슈팅

### 7.1 문제: takeSnapshot이 항상 실패함

**증상**: `onSnapshotTaken`에서 errCode가 항상 -1을 반환한다

**원인**: `remoteUid`가 0이거나 잘못된 UID를 전달했다

**디버깅**:
```typescript
console.log('Remote UID:', remoteUidRef.current); // 0이 아닌지 확인

const result = agoraEngineRef.current.takeSnapshot(
  remoteUidRef.current,
  filePath
);

if (result !== 0) {
  console.error('takeSnapshot failed:', result);
}
```

**해결**: `onUserJoined` 이벤트에서 `remoteUidRef.current`를 제대로 설정하고, `remoteUid !== 0`일 때만 캡처했다.

### 7.2 문제: Base64 이미지가 너무 큼

**증상**: API 요청이 "Payload Too Large" 에러를 반환한다

**원인**: Agora가 캡처한 이미지가 2~3MB로 너무 크다

**해결**:
```typescript
// 이미지 크기 검증 추가
export const validateImageForModeration = (imageBase64: string): void => {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const sizeInBytes = Buffer.from(base64Data, 'base64').length;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > 5) {
    throw new AppError(400, 'IMAGE_TOO_LARGE', '이미지 크기가 5MB를 초과합니다');
  }
};
```

Express의 body-parser 제한도 늘렸다:

```typescript
app.use(express.json({ limit: '10mb' }));
```

### 7.3 문제: 통화 종료 후에도 캡처 계속됨

**증상**: 통화를 종료했는데 캡처와 API 호출이 계속 발생한다

**원인**: `setInterval`이 정리되지 않았다

**해결**:
```typescript
// ref로 플래그 관리
const isCallEndedRef = useRef(false);

// 통화 종료 시 즉시 플래그 설정
const handleEndCall = () => {
  isCallEndedRef.current = true; // 즉시 설정
  if (moderationIntervalRef.current) {
    clearInterval(moderationIntervalRef.current);
    moderationIntervalRef.current = null;
  }
  // ...
};

// 캡처 함수에서 플래그 체크
const captureAndAnalyzeFrame = useCallback(async () => {
  if (isCallEndedRef.current) {
    return; // 조기 return
  }
  // ...
}, []);
```

### 7.4 문제: Hugging Face API 속도가 느림

**증상**: AI 분석에 5~10초가 걸린다

**원인**: Hugging Face의 무료 서버는 콜드 스타트(Cold Start) 문제가 있다. 모델이 메모리에 로드되어 있지 않으면 첫 요청이 느리다.

**임시 해결**: 첫 요청은 느려도 괜찮다고 판단하고, 타임아웃을 10초로 설정했다.

**장기 해결**: 나중에 사용자가 많아지면 자체 서버에 모델을 배포해 지연 시간을 줄일 예정이다.

## 8. 개선 사항

현재 구현은 Beta 단계이므로 다음 기능들은 추후 추가할 예정이다:

1. **자체 모델 배포**: Hugging Face 모델을 자체 서버에 배포해 지연 시간 감소
2. **얼굴 인식**: 얼굴이 보이지 않으면 경고 (신원 확인)
3. **음성 모더레이션**: 욕설이나 위협적인 언어 감지
4. **행동 패턴 분석**: 여러 프레임을 종합해 패턴 감지
5. **신고 대시보드**: 관리자가 로그를 확인하고 오탐지 개선

## 9. 정리

AI 콘텐츠 모더레이션 시스템 구축을 정리하면:

1. **Hugging Face 선택**: 무료 API로 NSFW 감지 모델 사용 (월 30,000건)
2. **4초마다 캡처**: 비용과 감지 속도의 균형
3. **이중 임계값**: 0.3 (경고) / 0.6 (강제 종료)
4. **Agora takeSnapshot**: 비디오 스트림을 직접 캡처해 Base64로 변환
5. **Socket.io 알림**: 경고/강제 종료를 실시간으로 전달
6. **Redis 할당량 관리**: 월 30,000건 초과 방지
7. **모더레이션 로그**: 모든 분석 결과를 DB에 저장

이제 Beyond Meet은 AI가 자동으로 부적절한 콘텐츠를 감지하고, 경고 또는 강제 종료로 사용자를 보호할 수 있다. 완벽하지는 않지만, Beta 단계에서 안전장치로는 충분하다.

다음 Part에서는 관리자 대시보드 구현을 다룬다. 관리자가 신고를 확인하고, 사용자를 차단하고, 통계를 확인하는 시스템을 정리할 예정이다.
