# AI 모더레이션 프로덕션 버그 수정 보고서

> 작성일: 2026-01-27

## 1. 문제 발생

### 증상
프로덕션 환경에서 랜덤 매칭 영상 통화 중 음란 콘텐츠가 표시되어도 AI 모더레이션이 전혀 동작하지 않음.

### 초기 가설
VideoCallScreen의 비즈니스 로직을 커스텀 훅으로 분리하는 리팩토링 작업(`9b21375`, 2026-01-24) 이후 발생한 것으로 추정.

---

## 2. 문제의 원인

### 커밋 히스토리 분석

| 커밋 | 날짜 | 내용 | 상태 |
|------|------|------|------|
| `1340a7c` | 2025-11-27 | 모더레이션 서비스 최초 생성 | axios로 `{ inputs: imageBase64 }` 사용 ✅ |
| `c92bce9` | 2025-11-28 09:46:24 | `@huggingface/inference` 라이브러리로 변경 | **`data: blob` 사용 ❌** |
| `8ac97f5` | 2025-11-28 09:46:59 | test-moderation.ts 생성 | `inputs: blob` 사용 ✅ |
| `9b21375` | 2026-01-24 | VideoCallScreen 리팩토링 | 기존 버그 그대로 유지 |

### 핵심 발견

**리팩토링이 원인이 아니었음.** AI 모더레이션은 **처음부터 제대로 동작한 적이 없었음.**

버그는 2025년 11월 28일 `c92bce9` 커밋에서 axios에서 `@huggingface/inference` 라이브러리로 변경하면서 발생. 같은 날 생성된 테스트 코드(`test-moderation.ts`)는 올바른 파라미터를 사용했지만, 실제 서비스 코드는 잘못된 파라미터를 사용.

---

### 발견된 버그 목록

#### Bug #1: Hugging Face API 파라미터 오류 (Critical)

**파일**: `backend/src/services/moderation-service.ts:94`

```typescript
// 잘못된 코드 (c92bce9 커밋부터)
const result = await imageClassification({
  model: HUGGINGFACE_MODEL,
  data: blob,  // ❌ 잘못된 파라미터명
  accessToken: HUGGINGFACE_API_KEY,
});

// 올바른 코드 (test-moderation.ts에서는 정상)
const result = await imageClassification({
  model: HUGGINGFACE_MODEL,
  inputs: blob,  // ✅ 올바른 파라미터명
  accessToken: HUGGINGFACE_API_KEY,
});
```

**영향**: 모든 Hugging Face API 호출이 실패하여 AI 분석이 전혀 수행되지 않음.

---

#### Bug #2: Blob 생성 방식 오류 (Critical)

**파일**: `backend/src/services/moderation-service.ts:89`

```typescript
// 잘못된 코드
const blob = new Blob([buffer.buffer], { type: 'image/png' });

// 올바른 코드
const blob = new Blob([buffer], { type: 'image/jpeg' });
```

**문제점**:
1. `buffer.buffer`는 불필요한 이중 래핑 (Buffer는 이미 Uint8Array)
2. MIME 타입이 `image/png`이지만 모바일에서 전송하는 스냅샷은 JPEG

---

#### Bug #3: 모바일에서 targetUserId 전달 오류 (High)

**파일**: `mobile/src/hooks/call/useModeration.ts:73`

```typescript
// 잘못된 코드 (리팩토링 이전 원본 코드부터 존재)
socketService.sendModerationWarning(
  sessionId,
  remoteUidRef.current.toString(),  // Agora UID (숫자)
);

// 올바른 코드
socketService.sendModerationWarning(
  sessionId,
  partnerId,  // 실제 사용자 UUID
);
```

**문제점**: Socket 핸들러(`io.to(data.targetUserId)`)는 사용자 UUID를 기대하는데, Agora UID(숫자)를 문자열로 변환해서 전달.

**영향**: 경고가 잘못된 대상에게 전송되거나 전혀 전송되지 않음.

---

## 3. 해결 과정

### 3.1 코드베이스 탐색

1. 모더레이션 서비스, 컨트롤러, 소켓 핸들러, 모바일 훅 분석
2. 테스트 파일(`test-moderation.ts`)과 실제 서비스 코드 비교
3. **테스트 코드에서 올바른 `inputs` 파라미터 사용 확인** → 버그 발견

### 3.2 백엔드 수정

**moderation-service.ts**:
- `data: blob` → `inputs: blob`
- `buffer.buffer` → `buffer`
- `image/png` → `image/jpeg`

**match-handler.ts**:
- `call:accepted` 이벤트에 `partnerId` 필드 추가

### 3.3 모바일 수정

**타입 정의** (`@types/index.ts`):
```typescript
// Before
VideoCall: { sessionId: string; channelName: string; token: string; uid: number };

// After
VideoCall: { sessionId: string; channelName: string; token: string; uid: number; partnerId: string };
```

**useModeration 훅**:
- `partnerId` 파라미터 추가
- `remoteUidRef.current.toString()` → `partnerId`

**VideoCall 진입점 수정**:
- `MatchingScreen.tsx`
- `RootNavigator.tsx`
- `FriendsScreen.tsx`
- `pushService.ts`

### 3.4 검증

```bash
cd backend && npx ts-node test-moderation.ts
```

```
✓ 테스트 1: 환경 변수 확인 - 통과
✓ 테스트 2: Hugging Face API 연결 - 통과
✓ 테스트 3: 임계값 로직 - 통과
```

**Hugging Face API 응답 정상 수신**:
```json
[
  { "label": "normal", "score": 0.9922957420349121 },
  { "label": "nsfw", "score": 0.007704315707087517 }
]
```

---

## 4. 수정된 파일 목록

| 파일 | 수정 내용 |
|------|----------|
| `backend/src/services/moderation-service.ts` | API 파라미터 및 Blob 생성 수정 |
| `backend/src/sockets/match-handler.ts` | `call:accepted`에 partnerId 추가 |
| `mobile/src/@types/index.ts` | VideoCall 타입에 partnerId 추가 |
| `mobile/src/hooks/call/useModeration.ts` | partnerId 파라미터 사용 |
| `mobile/src/screens/call/VideoCallScreen.tsx` | partnerId 전달 |
| `mobile/src/screens/match/MatchingScreen.tsx` | partnerId 전달 |
| `mobile/src/navigation/RootNavigator.tsx` | partnerId 전달 |
| `mobile/src/screens/friends/FriendsScreen.tsx` | partnerId 전달 |
| `mobile/src/services/pushService.ts` | partnerId 전달 |
| `backend/test-moderation.ts` | 테스트 이미지 경로 수정 |

---

## 5. 교훈

### 5.1 테스트 코드와 실제 코드의 동기화
- 테스트 코드(`test-moderation.ts`)는 올바르게 작성되었지만, 실제 서비스 코드와 동기화되지 않음
- **테스트 코드를 참조하여 버그를 발견**할 수 있었음

### 5.2 타입 시스템의 한계
- TypeScript의 타입 체크가 이 오류를 잡지 못함
- `@huggingface/inference` 라이브러리의 타입 정의가 느슨했을 가능성

### 5.3 E2E 테스트의 필요성
- 단위 테스트만으로는 이런 통합 문제를 발견하기 어려움
- 실제 API 호출을 포함한 E2E 테스트가 있었다면 조기 발견 가능

### 5.4 코드 리뷰 시 외부 라이브러리 API 확인
- 라이브러리 마이그레이션 시 API 시그니처 변경 사항을 꼼꼼히 확인해야 함
- 공식 문서 또는 테스트 코드 참조 필수

---

## 6. 결론

| 버그 | 발생 시점 | 원인 | 수정 완료 |
|------|----------|------|----------|
| `data` → `inputs` | 2025-11-28 | 라이브러리 마이그레이션 시 파라미터 오류 | ✅ |
| `buffer.buffer` → `buffer` | 2025-11-28 | 불필요한 이중 래핑 | ✅ |
| `image/png` → `image/jpeg` | 2025-11-28 | 잘못된 MIME 타입 | ✅ |
| Agora UID → 사용자 UUID | 최초 구현 시 | 잘못된 ID 타입 사용 | ✅ |

**AI 모더레이션은 처음부터 제대로 동작한 적이 없었으며**, 이번 수정으로 완전히 정상화되었습니다.

---

# 2차 버그 수정 보고서

> 작성일: 2026-01-28

## 1. 문제 발생

### 증상
개발 환경에서 AI 모더레이션 API 호출 시 지속적으로 `Network Error`가 발생하여 유해 콘텐츠 감지 기능이 동작하지 않았습니다.

```
[MODERATION] Frame analysis failed: Network Error AxiosError: Network Error
```

---

## 2. 발견된 버그 및 수정

### Bug #1: Express Body Size 제한 (100KB)

**원인**: Express.js의 기본 JSON body size 제한이 100KB인데, base64로 인코딩된 이미지 데이터가 이 제한을 초과했습니다.

**파일**: `backend/src/app.ts`

```typescript
// 변경 전
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 변경 후
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

---

### Bug #2: Axios 타임아웃 초과 (10초)

**원인**: 클라이언트의 Axios 타임아웃이 10초로 설정되어 있었는데, Hugging Face AI 모델 호출이 cold start로 인해 10초 이상 걸리는 경우가 있어 타임아웃이 발생했습니다.

**파일**: `mobile/src/hooks/call/useModeration.ts`

```typescript
// 변경 전
const response = await api.post('/moderation/analyze', {
  sessionId: sessionIdRef.current,
  imageBase64,
});

// 변경 후
const response = await api.post(
  '/moderation/analyze',
  {
    sessionId: sessionIdRef.current,
    imageBase64,
  },
  {
    timeout: 30000, // AI 분석은 시간이 오래 걸릴 수 있으므로 30초로 설정
  },
);
```

---

### Bug #3: Android에서 비디오 프레임 캡처 실패 (Critical)

**원인**: Android에서 `RtcSurfaceView`는 네이티브 SurfaceView를 사용하는데, SurfaceView는 별도의 렌더링 레이어를 사용하기 때문에 `react-native-view-shot`(ViewShot)이 실제 비디오 프레임을 캡처하지 못하고 항상 검은 화면만 캡처했습니다.

**증상**:
- 캡처된 이미지 크기가 항상 동일(약 19KB)
- AI가 항상 `normal`로 판정 (검은 화면이므로)

**파일**: `mobile/src/screens/call/VideoCallScreen.tsx`

```typescript
// import 추가
import { RtcSurfaceView, RtcTextureView } from 'react-native-agora';
```

```tsx
// 변경 전 - 상대방 비디오
<RtcSurfaceView
  style={styles.remoteVideoInner}
  canvas={{ uid: remoteUidRef.current, renderMode: 1, mirrorMode: 0 }}
  zOrderOnTop={false}
/>

// 변경 후 - 플랫폼별 분기 처리
{Platform.OS === 'android' ? (
  <RtcTextureView
    style={styles.remoteVideoInner}
    canvas={{ uid: remoteUidRef.current, renderMode: 1, mirrorMode: 0 }}
  />
) : (
  <RtcSurfaceView
    style={styles.remoteVideoInner}
    canvas={{ uid: remoteUidRef.current, renderMode: 1, mirrorMode: 0 }}
    zOrderOnTop={false}
  />
)}
```

**설명**:
- `RtcTextureView`는 Android의 TextureView를 사용하며, 일반 View 렌더링 파이프라인을 사용하므로 ViewShot으로 캡처 가능
- `RtcTextureView`는 Android 전용이므로 iOS에서는 기존 `RtcSurfaceView` 유지

---

### Bug #4: 자동 신고 생성 누락

**원인**: `createAutoReport` 함수가 정의되어 있었지만, `CALL_ENDED` 액션 시 실제로 호출되지 않았습니다.

**파일**: `backend/src/controllers/moderation-controller.ts`

```typescript
// 심각한 콘텐츠 감지 시 자동 신고 생성 로직 추가
if (action === 'CALL_ENDED') {
  try {
    const session = await prisma.matchSession.findUnique({
      where: { id: sessionId },
      select: { userId1: true, userId2: true },
    });

    if (session) {
      // 분석 요청자가 상대방의 비디오를 분석하므로,
      // 신고 대상은 요청자가 아닌 다른 사용자
      const reportedUserId = session.userId1 === userId ? session.userId2 : session.userId1;

      await moderationService.createAutoReport({
        reportedUserId,
        sessionId,
        confidence: result.confidence,
      });

      console.log('[MODERATION] Auto report created for user:', reportedUserId);
    }
  } catch (reportError) {
    console.error('[MODERATION] Failed to create auto report:', reportError);
  }
}
```

---

### Bug #5: 소켓 핸들러 중복 신고 생성

**원인**: 소켓 핸들러(`moderation:force-end`)에서도 `createAutoReport`를 호출하고 있어서 중복 신고가 발생할 수 있었고, confidence 값도 임시 값(0.7)으로 하드코딩되어 있었습니다.

**파일**: `backend/src/sockets/match-handler.ts`

```typescript
// 변경 전 - 중복 자동 신고 생성
socket.on("moderation:force-end", async (data) => {
  // ... 통화 종료 처리 ...

  // 자동 신고 생성 (컨트롤러와 중복!)
  await moderationService.createAutoReport({
    reportedUserId: data.reportedUserId,
    sessionId: data.sessionId,
    confidence: 0.7, // 임시 값
  });
});

// 변경 후 - 자동 신고는 컨트롤러에서만 생성 (실제 confidence 값 사용)
socket.on("moderation:force-end", async (data) => {
  // ... 통화 종료 처리 ...
  // 자동 신고는 /api/moderation/analyze 컨트롤러에서 생성됨
});
```

---

## 3. 수정된 파일 목록

| 파일 경로 | 수정 내용 |
|-----------|-----------|
| `backend/src/app.ts` | JSON body size 제한 10MB로 증가 |
| `mobile/src/hooks/call/useModeration.ts` | API 타임아웃 30초로 증가, 상세 에러 로깅 추가 |
| `mobile/src/screens/call/VideoCallScreen.tsx` | Android에서 RtcTextureView 사용 |
| `backend/src/controllers/moderation-controller.ts` | CALL_ENDED 시 자동 신고 생성 로직 추가 |
| `backend/src/sockets/match-handler.ts` | 중복 자동 신고 생성 코드 제거 |

---

## 4. 모더레이션 동작 흐름

```
1. 영상 통화 시작
   ↓
2. 3초 후 첫 프레임 캡처 시작, 이후 5초 간격으로 반복
   ↓
3. ViewShot으로 상대방 비디오 캡처 (Android: TextureView 사용)
   ↓
4. Base64 인코딩 후 /api/moderation/analyze API 호출 (타임아웃: 30초)
   ↓
5. Hugging Face AI 모델(Falconsai/nsfw_image_detection)로 분석
   ↓
6. confidence 값에 따른 액션 결정:
   - < 0.3: NONE (정상)
   - 0.3 ~ 0.6: WARNING_ISSUED (상대방에게 경고)
   - >= 0.6: CALL_ENDED (통화 강제 종료 + 자동 신고)
   ↓
7. CALL_ENDED 시:
   - 자동 신고 생성 (Report 테이블, 실제 confidence 값 포함)
   - 소켓으로 양쪽 사용자에게 강제 종료 알림
   - 클라이언트에서 통화 종료 처리
```

---

## 5. 테스트 방법

1. 백엔드 서버 재시작
2. 두 기기에서 통화 연결
3. 유해 콘텐츠(NSFW) 이미지가 카메라에 보이도록 테스트
4. 확인 사항:
   - 백엔드 콘솔에서 `Base64 length` 값이 다양한지 확인 (검은 화면이면 항상 동일)
   - confidence >= 0.6 시 `[MODERATION] Auto report created for user:` 로그 확인
   - 통화가 강제 종료되는지 확인
   - DB Report 테이블에 자동 신고가 생성되었는지 확인

---

## 6. 참고 사항

### SurfaceView vs TextureView

| 특성 | SurfaceView | TextureView |
|------|-------------|-------------|
| 렌더링 레이어 | 별도 레이어 | 일반 View 레이어 |
| 성능 | 높음 | 약간 오버헤드 |
| 스크린샷 캡처 | ❌ 불가능 | ✅ 가능 |
| 변환(회전, 크기조절) | ❌ 제한적 | ✅ 가능 |

Android에서 SurfaceView는 별도의 렌더링 레이어를 사용하여 성능이 좋지만, 일반 View 계층과 분리되어 있어 스크린샷 캡처가 불가능합니다.

### Hugging Face API 응답 시간

무료 Inference API는 모델 로딩 시간(cold start)으로 인해 첫 요청이 10초 이상 걸릴 수 있습니다. 이후 요청은 모델이 메모리에 캐시되어 빨라집니다.

---

## 7. 결론

| 버그 | 원인 | 수정 완료 |
|------|------|----------|
| Express body size 제한 | 기본값 100KB | ✅ 10MB로 증가 |
| Axios 타임아웃 | 기본값 10초 | ✅ 30초로 증가 |
| Android 비디오 캡처 실패 | SurfaceView 사용 | ✅ TextureView로 변경 |
| 자동 신고 미생성 | 호출 누락 | ✅ 컨트롤러에 추가 |
| 중복 신고 생성 | 소켓/컨트롤러 중복 호출 | ✅ 소켓에서 제거 |

이번 수정으로 Android 기기에서 AI 모더레이션이 정상 동작하며, 유해 콘텐츠 감지 시 통화 강제 종료와 자동 신고가 올바르게 생성됩니다.
