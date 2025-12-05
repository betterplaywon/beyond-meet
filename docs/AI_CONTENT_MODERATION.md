# AI 콘텐츠 모더레이션

## 개요

영상 통화 중 부적절한 콘텐츠를 AI로 실시간 감지하여 사용자 안전을 보호합니다.

- **AI 모델**: Hugging Face `Falconsai/nsfw_image_detection`
- **무료 한도**: 30,000건/월
- **분석 주기**: 3-5초마다

---

## 임계값 설정

| 신뢰도 | 액션 | 처리 내용 |
|--------|------|----------|
| < 0.3 | `NONE` | 정상 통화 계속 |
| 0.3 ~ 0.6 | `WARNING_ISSUED` | 경고 알림 + 로그 기록 |
| ≥ 0.6 | `CALL_ENDED` | 강제 종료 + 자동 신고 |

---

## 환경 변수

```bash
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
MODERATION_THRESHOLD_MINOR=0.3
MODERATION_THRESHOLD_SEVERE=0.6
MODERATION_ENABLED=true
```

---

## API

### POST /api/moderation/analyze
프레임 분석 요청

**Request**:
```json
{
  "sessionId": "uuid",
  "imageBase64": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "success": true,
  "data": { "confidence": 0.75, "action": "CALL_ENDED" }
}
```

**이미지 요구사항**:
- 최소 크기: 224 x 224 픽셀
- 형식: JPEG, PNG, WebP

---

## Socket.io 이벤트

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `moderation:warning` | Client → Server | 경고 발송 요청 |
| `moderation:force-end` | Client → Server | 강제 종료 요청 |
| `moderation:warning-received` | Server → Client | 경고 수신 알림 |
| `moderation:call-force-ended` | Server → Client | 강제 종료 알림 |

---

## 데이터베이스

### reports 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| reporter_id | UUID | 신고자 FK |
| reported_user_id | UUID | 대상자 FK |
| reason | Enum | INAPPROPRIATE_CONTENT, HARASSMENT, SPAM, OTHER |
| is_ai_generated | Boolean | AI 자동 신고 여부 |
| ai_confidence | Float | AI 신뢰도 |
| status | Enum | PENDING, RESOLVED, REJECTED |

### content_moderation_logs 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| session_id | UUID | 세션 FK |
| user_id | UUID | 사용자 FK |
| confidence | Float | AI 신뢰도 |
| action_taken | Enum | NONE, WARNING_ISSUED, CALL_ENDED |
