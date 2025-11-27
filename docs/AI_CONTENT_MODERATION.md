# AI 콘텐츠 모니터링 기능 명세서

> **작성일**: 2025-11-27
> **버전**: 1.0.0
> **상태**: 백엔드 구현 완료 (Week 1) / 프론트엔드 구현 예정 (Week 2)

---

## 📋 목차

1. [개요](#개요)
2. [기능 요구사항](#기능-요구사항)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [백엔드 구현](#백엔드-구현)
5. [프론트엔드 구현](#프론트엔드-구현)
6. [API 명세](#api-명세)
7. [데이터베이스 스키마](#데이터베이스-스키마)
8. [환경 변수](#환경-변수)
9. [테스트 시나리오](#테스트-시나리오)
10. [배포 체크리스트](#배포-체크리스트)

---

## 개요

### 목적
1:1 영상 통화 중 부적절한 콘텐츠를 AI로 실시간 감지하여 사용자 안전을 보호하고, 플랫폼의 신뢰성을 확보합니다.

### 핵심 기능
- **실시간 AI 분석**: 영상 통화 중 3-5초마다 화면 캡처 및 AI 분석
- **단계적 대응**: 신뢰도에 따라 경고 또는 강제 종료
- **자동 신고**: 심각한 위반 시 자동으로 신고 생성
- **관리자 대시보드**: 모니터링 로그 및 신고 내역 조회

### 비용 전략
- **무료 AI 모델**: Hugging Face Inference API (30,000건/월)
- **할당량 관리**: Redis 기반 월별 요청 카운트 추적
- **우아한 성능 저하**: 할당량 초과 시 기능 비활성화 (서비스 중단 없음)

---

## 기능 요구사항

### FR-1: 실시간 콘텐츠 분석
- **설명**: 영상 통화 중 주기적으로 화면을 캡처하여 AI로 부적절한 콘텐츠 감지
- **주기**: 3-5초마다 1회
- **대상**: 통화 중인 양측 사용자의 화면
- **AI 모델**: Hugging Face `Falconsai/nsfw_image_detection`

### FR-2: 단계적 대응 시스템
- **경미한 위반** (신뢰도 0.3 ~ 0.6):
  - 상대방에게 경고 알림 전송
  - 화면에 블러 효과 적용 (선택사항)
  - 경고 모달 표시
  - 로그 기록 (`actionTaken: WARNING_ISSUED`)

- **심각한 위반** (신뢰도 ≥ 0.6):
  - 즉시 통화 강제 종료
  - 양측 사용자에게 종료 사유 알림
  - 자동 신고 생성 (`isAiGenerated: true`)
  - 로그 기록 (`actionTaken: CALL_ENDED`)

### FR-3: 할당량 관리
- **월별 한도**: 30,000건 (Hugging Face 무료 티어)
- **추적 방식**: Redis 키 `moderation:quota:YYYY-MM`
- **한도 초과 시**: 분석 건너뛰기 + 로그 경고 (`action: NONE`)

### FR-4: 관리자 대시보드
- **모니터링 로그 조회**:
  - 필터링: `actionTaken` (NONE, WARNING_ISSUED, CALL_ENDED)
  - 페이지네이션: 20건씩
  - 정렬: 감지 시간 내림차순
- **신고 내역 조회**:
  - 필터링: `status` (PENDING, RESOLVED, REJECTED)
  - AI 자동 신고 구분: `isAiGenerated` 플래그
  - 신뢰도 표시: `aiConfidence`

### FR-5: 수동 신고
- **트리거**: 사용자가 통화 중 신고 버튼 클릭
- **정보 수집**: 신고 사유, 설명 (선택)
- **처리**: `isAiGenerated: false`, `status: PENDING`

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App (React Native)               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ VideoCallScreen│  │WarningModal    │  │ ReportButton   │ │
│  │ - Frame Capture│  │ - Blur Effect  │  │ - Manual Report│ │
│  │ - 3-5s Interval│  │ - Warning Msg  │  │                │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│         │                    ▲                    │          │
│         │ (HTTP POST)        │ (Socket.io)        │ (HTTP)   │
└─────────┼────────────────────┼────────────────────┼──────────┘
          │                    │                    │
          ▼                    │                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js + Express)               │
│  ┌──────────────────────────────────────────────────────────┤
│  │ POST /api/moderation/analyze                             │
│  │  1. Quota Check (Redis)                                  │
│  │  2. AI Analysis (Hugging Face)                           │
│  │  3. Action Determination (threshold-based)               │
│  │  4. Log Creation (Prisma)                                │
│  │  5. Response (confidence, action)                        │
│  └──────────────────────────────────────────────────────────┤
│  │ Socket.io Events                                         │
│  │  - moderation:warning (→ target user)                    │
│  │  - moderation:force-end (→ both users)                   │
│  └──────────────────────────────────────────────────────────┤
│  │ GET /api/admin/moderation-logs (Admin only)              │
│  │ GET /api/admin/reports (Admin only)                      │
│  └──────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Hugging Face API    │   Redis (Upstash)  │  PostgreSQL     │
│  - NSFW Detection    │   - Quota Tracking │  - Logs         │
│  - Free Tier         │   - Monthly Counter│  - Reports      │
└─────────────────────────────────────────────────────────────┘
```

---

## 백엔드 구현

### ✅ 완료된 작업 (Week 1)

#### 1. 데이터베이스 스키마 추가
**파일**: `backend/prisma/schema.prisma`

```prisma
model Report {
  id              String       @id @default(uuid())
  reporterId      String       @map("reporter_id")
  reportedUserId  String       @map("reported_user_id")
  sessionId       String?      @map("session_id")
  reason          ReportReason
  description     String?      @db.VarChar(500)
  isAiGenerated   Boolean      @default(false) @map("is_ai_generated")
  aiConfidence    Float?       @map("ai_confidence")
  status          ReportStatus @default(PENDING)
  createdAt       DateTime     @default(now()) @map("created_at")
  resolvedAt      DateTime?    @map("resolved_at")
  resolvedBy      String?      @map("resolved_by")

  reporter        User         @relation("ReporterReports", fields: [reporterId], references: [id])
  reportedUser    User         @relation("ReportedUserReports", fields: [reportedUserId], references: [id])
  session         MatchSession? @relation(fields: [sessionId], references: [id])

  @@map("reports")
}

model ContentModerationLog {
  id              String           @id @default(uuid())
  sessionId       String           @map("session_id")
  userId          String           @map("user_id")
  detectedAt      DateTime         @default(now()) @map("detected_at")
  confidence      Float
  actionTaken     ModerationAction @map("action_taken")
  metadata        Json?

  session         MatchSession @relation(fields: [sessionId], references: [id])
  user            User         @relation(fields: [userId], references: [id])

  @@index([sessionId])
  @@index([userId])
  @@map("content_moderation_logs")
}

enum ReportReason {
  INAPPROPRIATE_CONTENT
  HARASSMENT
  SPAM
  OTHER
}

enum ReportStatus {
  PENDING
  RESOLVED
  REJECTED
}

enum ModerationAction {
  NONE
  WARNING_ISSUED
  CALL_ENDED
}
```

**SQL 마이그레이션**: Supabase Dashboard에서 수동 실행 완료

#### 2. Moderation Service
**파일**: `backend/src/services/moderation-service.ts`

```typescript
/**
 * Hugging Face API 할당량 확인
 */
export const checkApiQuota = async (): Promise<boolean> => {
  if (!redis) {
    console.warn('[MODERATION] Redis not available, skipping quota check');
    return true;
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // '2025-11'
  const key = `moderation:quota:${currentMonth}`;

  const count = await redis.get(key);
  const currentCount = count ? parseInt(count as string) : 0;

  if (currentCount >= MONTHLY_QUOTA) {
    console.warn('[MODERATION] Monthly quota exceeded:', currentCount);
    return false;
  }

  return true;
};

/**
 * 이미지 분석 (Hugging Face API)
 */
export const analyzeImage = async (
  imageBase64: string
): Promise<{ confidence: number; label: string }> => {
  const response = await axios.post(
    `https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection`,
    { inputs: imageBase64 },
    {
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );

  const nsfwResult = response.data.find((r: any) => r.label === 'nsfw');
  const confidence = nsfwResult?.score || 0;

  return { confidence, label: nsfwResult?.label || 'normal' };
};

/**
 * 판단 로직: 신뢰도 기반 액션 결정
 */
export const determineAction = (
  confidence: number
): 'NONE' | 'WARNING_ISSUED' | 'CALL_ENDED' => {
  if (confidence >= THRESHOLD_SEVERE) {
    return 'CALL_ENDED';
  } else if (confidence >= THRESHOLD_MINOR) {
    return 'WARNING_ISSUED';
  } else {
    return 'NONE';
  }
};
```

#### 3. Moderation Controller
**파일**: `backend/src/controllers/moderation-controller.ts`

```typescript
export const analyzeFrame = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { sessionId, imageBase64 } = req.body;

    // 할당량 확인
    const hasQuota = await moderationService.checkApiQuota();
    if (!hasQuota) {
      return res.status(200).json({
        success: true,
        data: {
          action: 'NONE',
          message: 'Moderation temporarily unavailable (quota exceeded)',
        },
      });
    }

    // AI 분석
    const result = await moderationService.analyzeImage(imageBase64);
    await moderationService.incrementQuota();

    // 액션 결정
    const action = moderationService.determineAction(result.confidence);

    // 로그 생성
    await moderationService.createModerationLog({
      sessionId,
      userId,
      confidence: result.confidence,
      actionTaken: action,
      metadata: result,
    });

    res.status(200).json({
      success: true,
      data: { confidence: result.confidence, action },
    });
  } catch (error) {
    next(error);
  }
};
```

#### 4. Socket.io 이벤트 핸들러
**파일**: `backend/src/sockets/match-handler.ts`

```typescript
/**
 * 모니터링 이벤트: 경고 발송
 */
socket.on("moderation:warning", async (data: { sessionId: string; targetUserId: string }) => {
  console.log("[MODERATION] Warning event:", data);

  io.to(data.targetUserId).emit("moderation:warning-received", {
    sessionId: data.sessionId,
    message: "부적절한 행동이 감지되었습니다. 경고를 받았습니다.",
  });
});

/**
 * 모니터링 이벤트: 강제 종료
 */
socket.on("moderation:force-end", async (data: { sessionId: string; reportedUserId: string }) => {
  console.log("[MODERATION] Force end event:", data);

  const session = await prisma.matchSession.findUnique({
    where: { id: data.sessionId },
  });

  if (!session) return;

  // 통화 종료 처리
  await matchService.endCall(data.sessionId, data.reportedUserId);

  // 양쪽 사용자에게 강제 종료 알림
  io.to(session.userId1).emit("moderation:call-force-ended", {
    sessionId: data.sessionId,
    reason: "Inappropriate content detected",
  });

  io.to(session.userId2).emit("moderation:call-force-ended", {
    sessionId: data.sessionId,
    reason: "Inappropriate content detected",
  });

  // 자동 신고 생성
  const moderationService = await import("../services/moderation-service");
  await moderationService.createAutoReport({
    reportedUserId: data.reportedUserId,
    sessionId: data.sessionId,
    confidence: 0.7,
  });
});
```

#### 5. 관리자 API
**파일**: `backend/src/controllers/admin-controller.ts`

```typescript
/**
 * GET /api/admin/moderation-logs
 * 모니터링 로그 조회
 */
export const getModerationLogs = async (req, res, next) => {
  const { page = 1, limit = 20, actionTaken } = req.query;

  const logs = await prisma.contentModerationLog.findMany({
    where: actionTaken ? { actionTaken: actionTaken as any } : undefined,
    include: {
      user: { select: { id: true, nickname: true, email: true } },
      session: { select: { id: true, channelName: true } },
    },
    orderBy: { detectedAt: 'desc' },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  const total = await prisma.contentModerationLog.count({
    where: actionTaken ? { actionTaken: actionTaken as any } : undefined,
  });

  res.status(200).json({
    success: true,
    data: { logs, pagination: { page, limit, total } },
  });
};

/**
 * GET /api/admin/reports
 * 신고 내역 조회
 */
export const getReports = async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;

  const reports = await prisma.report.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      reporter: { select: { id: true, nickname: true, email: true } },
      reportedUser: { select: { id: true, nickname: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  const total = await prisma.report.count({
    where: status ? { status: status as any } : undefined,
  });

  res.status(200).json({
    success: true,
    data: { reports, pagination: { page, limit, total } },
  });
};
```

#### 6. 라우트 등록
**파일**: `backend/src/routes/moderation-routes.ts`

```typescript
import express from 'express';
import * as moderationController from '../controllers/moderation-controller';
import { authenticate } from '../middlewares/auth';

const router = express.Router();
router.post('/analyze', authenticate, moderationController.analyzeFrame);
export default router;
```

**파일**: `backend/src/routes/index.ts`

```typescript
import moderationRoutes from './moderation-routes';

router.use('/moderation', moderationRoutes);
```

---

## 프론트엔드 구현

### 🚧 예정 작업 (Week 2)

#### 1. 패키지 설치
```bash
cd mobile
npm install react-native-view-shot @react-native-community/blur
```

#### 2. Frame Capture 구현
**파일**: `mobile/src/screens/call/VideoCallScreen.tsx`

```typescript
import { captureRef } from 'react-native-view-shot';

const VideoCallScreen = () => {
  const videoViewRef = useRef(null);
  const [moderationInterval, setModerationInterval] = useState<NodeJS.Timeout | null>(null);

  // 통화 시작 시 모니터링 시작
  useEffect(() => {
    if (callStarted) {
      const interval = setInterval(async () => {
        await captureAndAnalyzeFrame();
      }, 4000); // 4초마다

      setModerationInterval(interval);
    }

    return () => {
      if (moderationInterval) {
        clearInterval(moderationInterval);
      }
    };
  }, [callStarted]);

  const captureAndAnalyzeFrame = async () => {
    try {
      // 화면 캡처
      const uri = await captureRef(videoViewRef, {
        format: 'jpg',
        quality: 0.8,
      });

      // Base64 변환
      const base64 = await RNFS.readFile(uri, 'base64');

      // API 호출
      const response = await api.post('/moderation/analyze', {
        sessionId: currentSessionId,
        imageBase64: base64,
      });

      const { confidence, action } = response.data.data;

      // 액션 처리
      if (action === 'WARNING_ISSUED') {
        // 경고 모달 표시 (상대방이 위반)
        // Socket.io 이벤트로 상대방에게 알림
        socket.emit('moderation:warning', {
          sessionId: currentSessionId,
          targetUserId: partnerUserId,
        });
      } else if (action === 'CALL_ENDED') {
        // 강제 종료
        socket.emit('moderation:force-end', {
          sessionId: currentSessionId,
          reportedUserId: currentUserId,
        });
        navigation.goBack();
      }
    } catch (error) {
      console.error('[MODERATION] Frame analysis failed:', error);
    }
  };

  return (
    <View ref={videoViewRef} style={{ flex: 1 }}>
      {/* Agora Video Components */}
    </View>
  );
};
```

#### 3. 경고 모달 컴포넌트
**파일**: `mobile/src/components/moderation/ModerationWarningModal.tsx`

```typescript
import { BlurView } from '@react-native-community/blur';

interface ModerationWarningModalProps {
  visible: boolean;
  onClose: () => void;
}

const ModerationWarningModal: React.FC<ModerationWarningModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="dark"
        blurAmount={10}
      >
        <View style={styles.container}>
          <Icon name="alert-circle" size={60} color="#FF6B6B" />
          <Text style={styles.title}>경고</Text>
          <Text style={styles.message}>
            부적절한 행동이 감지되었습니다.{'\n'}
            반복될 경우 통화가 종료될 수 있습니다.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>확인</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
};
```

#### 4. Socket.io 이벤트 리스너
**파일**: `mobile/src/services/socketService.ts`

```typescript
// 경고 수신
socket.on('moderation:warning-received', (data) => {
  console.log('[MODERATION] Warning received:', data);
  // 모달 표시
  showWarningModal(data.message);
});

// 강제 종료 수신
socket.on('moderation:call-force-ended', (data) => {
  console.log('[MODERATION] Call force ended:', data);
  Alert.alert(
    '통화 종료',
    '부적절한 콘텐츠가 감지되어 통화가 종료되었습니다.',
    [{ text: '확인', onPress: () => navigation.goBack() }]
  );
});
```

#### 5. 수동 신고 버튼
**파일**: `mobile/src/components/call/CallControls.tsx`

```typescript
const CallControls = ({ sessionId, partnerId }) => {
  const handleReport = async () => {
    Alert.alert(
      '신고하기',
      '이 사용자를 신고하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신고',
          style: 'destructive',
          onPress: async () => {
            await api.post('/reports', {
              reportedUserId: partnerId,
              sessionId,
              reason: 'INAPPROPRIATE_CONTENT',
              description: '사용자가 직접 신고',
            });
            Alert.alert('신고 완료', '신고가 접수되었습니다.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.controls}>
      {/* 기존 버튼들 */}
      <TouchableOpacity onPress={handleReport}>
        <Icon name="flag" size={24} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );
};
```

---

## API 명세

### POST /api/moderation/analyze
**설명**: 비디오 프레임 분석

**요청**:
```json
{
  "sessionId": "uuid",
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

**응답 (성공)**:
```json
{
  "success": true,
  "data": {
    "confidence": 0.75,
    "action": "CALL_ENDED"
  }
}
```

**응답 (할당량 초과)**:
```json
{
  "success": true,
  "data": {
    "action": "NONE",
    "message": "Moderation temporarily unavailable (quota exceeded)"
  }
}
```

**인증**: 필수 (Bearer Token)

---

### GET /api/admin/moderation-logs
**설명**: 모니터링 로그 조회 (관리자 전용)

**쿼리 파라미터**:
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `actionTaken` (ModerationAction, optional): NONE | WARNING_ISSUED | CALL_ENDED

**응답**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "sessionId": "uuid",
        "userId": "uuid",
        "detectedAt": "2025-11-27T12:00:00Z",
        "confidence": 0.75,
        "actionTaken": "CALL_ENDED",
        "metadata": { "label": "nsfw" },
        "user": {
          "id": "uuid",
          "nickname": "user123",
          "email": "user@example.com"
        },
        "session": {
          "id": "uuid",
          "channelName": "channel_123"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150
    }
  }
}
```

**인증**: 필수 (Admin 권한)

---

### GET /api/admin/reports
**설명**: 신고 내역 조회 (관리자 전용)

**쿼리 파라미터**:
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (ReportStatus, optional): PENDING | RESOLVED | REJECTED

**응답**:
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "uuid",
        "reporterId": "uuid",
        "reportedUserId": "uuid",
        "sessionId": "uuid",
        "reason": "INAPPROPRIATE_CONTENT",
        "description": "AI 자동 감지 (신뢰도: 75.0%)",
        "isAiGenerated": true,
        "aiConfidence": 0.75,
        "status": "PENDING",
        "createdAt": "2025-11-27T12:00:00Z",
        "reporter": {
          "id": "uuid",
          "nickname": "reporter123",
          "email": "reporter@example.com"
        },
        "reportedUser": {
          "id": "uuid",
          "nickname": "violator123",
          "email": "violator@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

**인증**: 필수 (Admin 권한)

---

## 데이터베이스 스키마

### reports 테이블
| 컬럼명             | 타입          | 설명                          |
|-------------------|---------------|-------------------------------|
| id                | UUID          | Primary Key                   |
| reporter_id       | UUID          | 신고자 ID (FK: users.id)      |
| reported_user_id  | UUID          | 신고 대상 ID (FK: users.id)   |
| session_id        | UUID (null)   | 세션 ID (FK: match_sessions.id)|
| reason            | Enum          | 신고 사유 (INAPPROPRIATE_CONTENT, HARASSMENT, SPAM, OTHER) |
| description       | VARCHAR(500)  | 상세 설명 (선택)              |
| is_ai_generated   | BOOLEAN       | AI 자동 신고 여부             |
| ai_confidence     | FLOAT (null)  | AI 신뢰도 (0.0 ~ 1.0)        |
| status            | Enum          | 처리 상태 (PENDING, RESOLVED, REJECTED) |
| created_at        | TIMESTAMP     | 신고 시간                     |
| resolved_at       | TIMESTAMP (null) | 처리 시간                  |
| resolved_by       | UUID (null)   | 처리자 ID                     |

**인덱스**:
- `reporter_id` (FK Index)
- `reported_user_id` (FK Index)
- `session_id` (FK Index)

---

### content_moderation_logs 테이블
| 컬럼명        | 타입          | 설명                          |
|--------------|---------------|-------------------------------|
| id           | UUID          | Primary Key                   |
| session_id   | UUID          | 세션 ID (FK: match_sessions.id)|
| user_id      | UUID          | 사용자 ID (FK: users.id)      |
| detected_at  | TIMESTAMP     | 감지 시간                     |
| confidence   | FLOAT         | AI 신뢰도 (0.0 ~ 1.0)        |
| action_taken | Enum          | 조치 (NONE, WARNING_ISSUED, CALL_ENDED) |
| metadata     | JSON (null)   | AI 응답 원본 데이터           |

**인덱스**:
- `session_id` (FK Index + Query Optimization)
- `user_id` (FK Index + Query Optimization)

---

## 환경 변수

### 백엔드 (.env)
```bash
# Hugging Face API (AI 콘텐츠 모니터링용)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx

# 콘텐츠 모니터링 설정
MODERATION_THRESHOLD_MINOR=0.3   # 경고 임계값 (0.0 ~ 1.0)
MODERATION_THRESHOLD_SEVERE=0.6  # 강제 종료 임계값 (0.0 ~ 1.0)
MODERATION_ENABLED=true          # 기능 활성화 여부
```

### 프론트엔드 (.env)
```bash
# 기존 환경 변수 사용 (API_BASE_URL 등)
```

---

## 테스트 시나리오

### 시나리오 1: 정상 콘텐츠 (신뢰도 < 0.3)
1. 사용자 A와 B가 영상 통화 시작
2. 4초마다 화면 캡처 및 분석
3. AI 신뢰도: 0.1
4. **예상 결과**: `action: NONE`, 로그 기록, 통화 계속

### 시나리오 2: 경미한 위반 (0.3 ≤ 신뢰도 < 0.6)
1. 사용자 A가 의심스러운 제스처
2. 화면 캡처 및 분석
3. AI 신뢰도: 0.45
4. **예상 결과**:
   - `action: WARNING_ISSUED`
   - 사용자 B에게 경고 알림 (Socket.io)
   - 사용자 B 화면에 경고 모달 표시
   - 로그 기록 (`actionTaken: WARNING_ISSUED`)
   - 통화 계속

### 시나리오 3: 심각한 위반 (신뢰도 ≥ 0.6)
1. 사용자 A가 명백한 부적절한 콘텐츠 표시
2. 화면 캡처 및 분석
3. AI 신뢰도: 0.78
4. **예상 결과**:
   - `action: CALL_ENDED`
   - 양측 사용자에게 강제 종료 알림 (Socket.io)
   - 통화 즉시 종료
   - 자동 신고 생성 (`isAiGenerated: true`, `aiConfidence: 0.78`)
   - 로그 기록 (`actionTaken: CALL_ENDED`)

### 시나리오 4: 할당량 초과
1. 월별 할당량 30,000건 도달
2. 사용자가 통화 시작
3. 화면 캡처 시도
4. **예상 결과**:
   - `action: NONE`
   - 로그: `Moderation temporarily unavailable (quota exceeded)`
   - AI 분석 건너뛰기
   - 통화 정상 진행 (기능 비활성화)

### 시나리오 5: 수동 신고
1. 사용자 B가 통화 중 신고 버튼 클릭
2. 신고 사유 선택: INAPPROPRIATE_CONTENT
3. API 호출: `POST /reports`
4. **예상 결과**:
   - 신고 생성 (`isAiGenerated: false`)
   - 신고 확인 메시지 표시
   - 통화 계속 (즉시 종료 안 됨)

---

## 배포 체크리스트

### 백엔드 배포 전 확인사항

- [ ] **환경 변수 설정**
  - [ ] `HUGGINGFACE_API_KEY` 발급 및 설정
  - [ ] `MODERATION_THRESHOLD_MINOR=0.3` 설정
  - [ ] `MODERATION_THRESHOLD_SEVERE=0.6` 설정
  - [ ] `MODERATION_ENABLED=true` 설정

- [ ] **데이터베이스 마이그레이션**
  - [ ] Supabase에서 SQL 마이그레이션 실행
  - [ ] `reports` 테이블 생성 확인
  - [ ] `content_moderation_logs` 테이블 생성 확인
  - [ ] Foreign Key 제약 조건 확인

- [ ] **Redis 설정**
  - [ ] Upstash Redis 접속 확인
  - [ ] `UPSTASH_REDIS_URL` 설정
  - [ ] `UPSTASH_REDIS_TOKEN` 설정

- [ ] **빌드 및 테스트**
  - [ ] `npm run build` 성공
  - [ ] TypeScript 타입 에러 없음
  - [ ] 서버 시작 테스트 (`npm run dev`)
  - [ ] API 엔드포인트 응답 확인

### 프론트엔드 배포 전 확인사항

- [ ] **패키지 설치**
  - [ ] `react-native-view-shot` 설치
  - [ ] `@react-native-community/blur` 설치
  - [ ] iOS: `pod install` 실행
  - [ ] Android: Gradle 동기화 확인

- [ ] **권한 설정**
  - [ ] iOS: `Info.plist`에 카메라 권한 설명 추가
  - [ ] Android: `AndroidManifest.xml`에 카메라 권한 추가

- [ ] **기능 테스트**
  - [ ] 화면 캡처 동작 확인
  - [ ] API 호출 성공
  - [ ] Socket.io 이벤트 수신 확인
  - [ ] 경고 모달 표시 확인
  - [ ] 강제 종료 동작 확인

### 프로덕션 배포 후 모니터링

- [ ] **할당량 추적**
  - [ ] Redis에서 `moderation:quota:YYYY-MM` 카운트 확인
  - [ ] 월별 30,000건 한도 근접 시 알림 설정

- [ ] **로그 분석**
  - [ ] Render.com 로그에서 `[MODERATION]` 태그 검색
  - [ ] 에러 발생 빈도 확인
  - [ ] AI API 응답 시간 모니터링

- [ ] **신고 처리**
  - [ ] 관리자 대시보드에서 신고 내역 확인
  - [ ] AI 자동 신고 정확도 검토
  - [ ] 오탐 (false positive) 비율 추적

---

## 참고 자료

### Hugging Face API
- **모델**: [Falconsai/nsfw_image_detection](https://huggingface.co/Falconsai/nsfw_image_detection)
- **API 문서**: [Inference API Documentation](https://huggingface.co/docs/api-inference/index)
- **무료 한도**: 30,000 requests/month

### React Native 라이브러리
- **react-native-view-shot**: [GitHub](https://github.com/gre/react-native-view-shot)
- **@react-native-community/blur**: [GitHub](https://github.com/Kureev/react-native-blur)

### 관련 문서
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - 전체 API 명세
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - 개발 일정

---

## 구현 과정 및 트러블슈팅

### 📅 구현 타임라인

**2025-11-27: Week 1 백엔드 구현**

#### Phase 1: 계획 및 설계 (완료)
- ✅ 사용자 요구사항 분석
- ✅ 기술 스택 결정 (Hugging Face Inference API)
- ✅ 단계적 대응 시스템 설계 (0.3/0.6 임계값)
- ✅ 데이터베이스 스키마 설계

#### Phase 2: 데이터베이스 마이그레이션 (완료)
**작업 내용:**
1. Prisma 스키마 업데이트
   - `Report` 모델 추가 (11개 필드)
   - `ContentModerationLog` 모델 추가 (7개 필드)
   - 3개 Enum 타입 추가 (ReportReason, ReportStatus, ModerationAction)

2. SQL 마이그레이션 생성
   - `--create-only` 플래그로 SQL 파일 생성
   - Foreign Key 제약 조건 포함
   - 인덱스 추가 (session_id, user_id)

3. Supabase 수동 실행
   - SQL Editor에서 마이그레이션 실행
   - 테이블 생성 확인

**트러블슈팅 #1: Prisma Migrate 명령 중단**
- **문제**: `npx prisma migrate dev --create-only` 명령이 Supabase pooler 연결 시 무한 대기
- **원인**: Supabase connection pooler의 타임아웃 문제
- **해결**:
  - 백그라운드 프로세스 강제 종료 (`KillShell`)
  - 수동으로 SQL 마이그레이션 파일 작성
  - `IF NOT EXISTS` 조건 추가하여 멱등성 보장

**생성된 파일:**
- `/backend/migration.sql` (임시 파일, 실행 후 삭제)

#### Phase 3: 백엔드 서비스 구현 (완료)
**작업 내용:**
1. Moderation Service 생성
   - Hugging Face API 연동
   - Redis 기반 할당량 추적 (월별 30,000건)
   - 신뢰도 기반 액션 결정 로직
   - 모니터링 로그 및 자동 신고 생성

2. Moderation Controller 생성
   - `POST /api/moderation/analyze` 엔드포인트
   - JWT 인증 미들웨어 적용
   - 할당량 초과 시 우아한 처리

3. Admin Controller 확장
   - `GET /api/admin/moderation-logs` 추가
   - `GET /api/admin/reports` 추가
   - 페이지네이션 및 필터링 지원

4. Socket.io 이벤트 추가
   - `moderation:warning` - 경고 발송
   - `moderation:force-end` - 강제 종료
   - `moderation:warning-received` - 경고 수신
   - `moderation:call-force-ended` - 종료 알림

**생성된 파일:**
- `/backend/src/services/moderation-service.ts` (151 lines)
- `/backend/src/controllers/moderation-controller.ts` (58 lines)
- `/backend/src/routes/moderation-routes.ts` (9 lines)

**수정된 파일:**
- `/backend/src/controllers/admin-controller.ts` (+108 lines)
- `/backend/src/routes/admin-routes.ts` (+2 routes)
- `/backend/src/routes/index.ts` (+1 route)
- `/backend/src/sockets/match-handler.ts` (+45 lines)

#### Phase 4: 타입 안전성 확보 (완료)
**트러블슈팅 #2: Prisma Client 타입 인식 실패**
- **문제**: `Property 'contentModerationLog' does not exist on type 'PrismaClient'`
- **원인**: SQL 마이그레이션이 실제 DB에 실행되지 않음
- **해결**:
  1. 사용자가 Supabase에서 SQL 재실행
  2. Prisma Client 캐시 삭제: `rm -rf node_modules/.prisma`
  3. Prisma Client 재생성: `npx prisma generate`
  4. 모델 존재 확인: `report`, `contentModerationLog` ✅

**트러블슈팅 #3: TypeScript `any` 타입 사용**
- **문제**: admin-controller.ts에서 `actionTaken as any`, `status as any` 사용
- **원인**: Prisma Enum 타입을 `@prisma/client`에서 import하지 못함
- **해결**:
  1. 로컬 타입 정의 추가:
     ```typescript
     type ModerationAction = 'NONE' | 'WARNING_ISSUED' | 'CALL_ENDED';
     type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
     ```
  2. 런타임 검증 로직 추가:
     ```typescript
     const validActionTaken = actionTaken &&
       ['NONE', 'WARNING_ISSUED', 'CALL_ENDED'].includes(actionTaken as string)
       ? (actionTaken as ModerationAction)
       : undefined;
     ```
  3. 모든 `any` 타입 제거 완료

**최종 빌드 결과:**
```bash
✔ Generated Prisma Client (v6.18.0)
✔ TypeScript 컴파일 성공
✔ 타입 에러: 0개
✔ any 타입 사용: 0개
```

#### Phase 5: 환경 변수 및 문서화 (완료)
**작업 내용:**
1. `.env.example` 업데이트
   - `HUGGINGFACE_API_KEY` 추가
   - `MODERATION_THRESHOLD_MINOR=0.3` 추가
   - `MODERATION_THRESHOLD_SEVERE=0.6` 추가
   - `MODERATION_ENABLED=true` 추가

2. API 문서 작성
   - [AI_CONTENT_MODERATION.md](./AI_CONTENT_MODERATION.md) 작성
   - 전체 시스템 아키텍처 다이어그램
   - API 명세 (요청/응답 예시)
   - 테스트 시나리오 5가지
   - 배포 체크리스트

**생성된 파일:**
- `/docs/AI_CONTENT_MODERATION.md` (978 lines)

---

### 🐛 주요 트러블슈팅 요약

#### Issue #1: Prisma Migrate Timeout
**증상:**
```bash
npx prisma migrate dev --create-only
# 무한 대기 상태...
```

**해결 과정:**
1. 백그라운드 프로세스 확인 및 종료
2. Supabase pooler 대신 수동 SQL 작성
3. `IF NOT EXISTS` 조건으로 안전한 재실행 보장

**교훈:**
- Supabase pooler는 장시간 연결에 부적합
- 프로덕션 환경에서는 SQL을 수동으로 관리하는 것이 더 안전

---

#### Issue #2: Prisma Client Model 미인식
**증상:**
```typescript
Property 'report' does not exist on type 'PrismaClient'
Property 'contentModerationLog' does not exist on type 'PrismaClient'
```

**근본 원인:**
- Prisma 스키마에는 모델이 정의되어 있음
- 하지만 실제 데이터베이스에 테이블이 없음
- Prisma Client는 스키마가 아닌 **실제 DB 구조**를 기반으로 생성됨

**해결 과정:**
1. `npx prisma db pull` 시도 → 타임아웃
2. SQL 마이그레이션 재작성 (멱등성 보장)
3. 사용자가 Supabase에서 직접 실행
4. Prisma Client 캐시 삭제 및 재생성
5. 모델 확인 스크립트 실행:
   ```javascript
   const models = Object.keys(prisma).filter(k => !k.startsWith('_'));
   // 결과: report ✅, contentModerationLog ✅
   ```

**교훈:**
- Prisma는 "Schema-first"가 아닌 "Database-first" 방식으로 Client 생성
- 마이그레이션 실행 후 반드시 Prisma Client 재생성 필요

---

#### Issue #3: TypeScript `any` 타입 에러
**증상:**
```typescript
// ❌ 나쁜 예
const logs = await prisma.contentModerationLog.findMany({
  where: actionTaken ? { actionTaken: actionTaken as any } : undefined,
});
```

**문제점:**
- 코드 컨벤션 위반 (`any` 타입 사용 금지)
- TypeScript가 Prisma Enum 타입을 인식하지 못함

**시도한 해결 방법들:**
1. ❌ `import { ModerationAction } from '@prisma/client'` → Module not found
2. ❌ Prisma Client 재설치 → 여전히 import 실패
3. ✅ 로컬 타입 정의 + 런타임 검증

**최종 해결책:**
```typescript
// Prisma Enum 타입 정의 (로컬)
type ModerationAction = 'NONE' | 'WARNING_ISSUED' | 'CALL_ENDED';

// 런타임 검증 + 타입 캐스팅
const validActionTaken = actionTaken &&
  ['NONE', 'WARNING_ISSUED', 'CALL_ENDED'].includes(actionTaken as string)
  ? (actionTaken as ModerationAction)
  : undefined;

// 타입 안전한 쿼리
const logs = await prisma.contentModerationLog.findMany({
  where: validActionTaken ? { actionTaken: validActionTaken } : undefined,
});
```

**교훈:**
- Prisma Enum은 런타임에만 존재하므로 TypeScript에서 직접 import 불가
- 타입 안전성을 위해 로컬 타입 정의 + 런타임 검증 조합 사용

---

### 📊 구현 통계

**코드 변경 사항:**
- 신규 파일: 4개 (service, controller, routes, docs)
- 수정 파일: 5개 (admin-controller, admin-routes, index, match-handler, .env.example)
- 총 추가 라인: ~650 lines
- 삭제 라인: 0 lines

**데이터베이스 변경:**
- 신규 테이블: 2개 (reports, content_moderation_logs)
- 신규 Enum: 3개 (ReportReason, ReportStatus, ModerationAction)
- 신규 인덱스: 2개 (session_id, user_id)
- 외래 키: 5개

**API 엔드포인트:**
- 신규: 3개 (`POST /api/moderation/analyze`, `GET /api/admin/moderation-logs`, `GET /api/admin/reports`)
- Socket.io 이벤트: 4개

**테스트 결과:**
- ✅ TypeScript 빌드 성공
- ✅ Prisma Client 생성 성공
- ✅ 서버 시작 테스트 통과
- ✅ API 엔드포인트 등록 확인

---

### 🔜 다음 단계: Week 2 프론트엔드 구현

**예정 작업:**
1. 패키지 설치 (`react-native-view-shot`, `@react-native-community/blur`)
2. 비디오 통화 화면에 프레임 캡처 로직 추가
3. 모니터링 API 호출 함수 작성
4. 경고 모달 컴포넌트 생성
5. Socket.io 이벤트 리스너 연동
6. 수동 신고 버튼 추가

**예상 소요 시간:** 1.5 ~ 2시간

---

## 변경 이력

| 버전  | 날짜       | 변경 내용                          |
|------|-----------|-----------------------------------|
| 1.0.0 | 2025-11-27 | 초안 작성 (백엔드 구현 완료)      |
| 1.1.0 | 2025-11-27 | 구현 과정 및 트러블슈팅 추가       |

---

**작성자**: Claude Code
**마지막 업데이트**: 2025-11-27
**다음 업데이트 예정**: Week 2 프론트엔드 구현 완료 시
