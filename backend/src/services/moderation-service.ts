/**
 * 콘텐츠 모니터링 서비스
 */

import { imageClassification } from '@huggingface/inference';
import prisma from '../config/database';
import redis from '../config/redis';
import { AppError } from '../middlewares/errorHandler';
import { validateImageForModeration } from '../utils/image-validator';

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_MODEL = 'Falconsai/nsfw_image_detection';
const THRESHOLD_MINOR = parseFloat(process.env.MODERATION_THRESHOLD_MINOR || '0.7');
const THRESHOLD_SEVERE = parseFloat(process.env.MODERATION_THRESHOLD_SEVERE || '0.9');
const MONTHLY_QUOTA = 30000;

// Prisma Enum 타입 정의
type ModerationAction = 'NONE' | 'WARNING_ISSUED' | 'CALL_ENDED';
type ReportReason = 'INAPPROPRIATE_CONTENT' | 'HARASSMENT' | 'SPAM' | 'FAKE_PROFILE' | 'OTHER';
type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

/**
 * Hugging Face API 할당량 확인
 */
export const checkApiQuota = async (): Promise<boolean> => {
  if (!redis) return true;

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const key = `moderation:quota:${currentMonth}`;

    const count = await redis.get(key);
    const currentCount = count ? parseInt(count as string) : 0;

    return currentCount < MONTHLY_QUOTA;
  } catch {
    return true;
  }
};

/**
 * 할당량 증가
 */
export const incrementQuota = async (): Promise<void> => {
  if (!redis) return;

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const key = `moderation:quota:${currentMonth}`;

    await redis.incr(key);
    await redis.expire(key, 60 * 60 * 24 * 31);
  } catch {
    // Redis 연결 실패 시 무시
  }
};

/**
 * 이미지 분석 (Hugging Face API)
 */
export const analyzeImage = async (
  imageBase64: string
): Promise<{ confidence: number; label: string }> => {
  if (!HUGGINGFACE_API_KEY) {
    throw new AppError(500, 'API_KEY_MISSING', 'Hugging Face API 키가 설정되지 않았습니다');
  }

  try {
    validateImageForModeration(imageBase64);

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: 'image/jpeg' });

    const result = await imageClassification({
      model: HUGGINGFACE_MODEL,
      inputs: blob,
      accessToken: HUGGINGFACE_API_KEY,
    });

    const nsfwResult = result.find((r: { label: string; score: number }) => r.label === 'nsfw');
    const confidence = nsfwResult?.score || 0;

    return {
      confidence,
      label: nsfwResult?.label || 'normal',
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    const err = error as { message?: string };
    throw new AppError(500, 'AI_ANALYSIS_FAILED', `AI 분석 실패: ${err.message || 'Unknown error'}`);
  }
};

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

/**
 * 자동 신고 생성 (심각한 콘텐츠 감지 시)
 */
export const createAutoReport = async (data: {
  reportedUserId: string;
  sessionId: string;
  confidence: number;
}) => {
  const reporterId = data.reportedUserId;

  const reason: ReportReason = 'INAPPROPRIATE_CONTENT';
  const status: ReportStatus = 'PENDING';

  return await prisma.report.create({
    data: {
      reporterId: reporterId,
      reportedUserId: data.reportedUserId,
      sessionId: data.sessionId,
      reason,
      description: `AI 자동 감지 (신뢰도: ${(data.confidence * 100).toFixed(1)}%)`,
      isAiGenerated: true,
      aiConfidence: data.confidence,
      status,
    },
  });
};

/**
 * 판단 로직: 신뢰도 기반 액션 결정
 */
export const determineAction = (
  confidence: number
): ModerationAction => {
  if (confidence >= THRESHOLD_SEVERE) {
    return 'CALL_ENDED';
  } else if (confidence >= THRESHOLD_MINOR) {
    return 'WARNING_ISSUED';
  } else {
    return 'NONE';
  }
};
