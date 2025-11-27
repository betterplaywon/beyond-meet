/**
 * 콘텐츠 모니터링 서비스
 */

import axios from 'axios';
import prisma from '../config/database';
import redis from '../config/redis';
import { AppError } from '../middlewares/errorHandler';

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_MODEL = 'Falconsai/nsfw_image_detection';
const THRESHOLD_MINOR = parseFloat(process.env.MODERATION_THRESHOLD_MINOR || '0.3');
const THRESHOLD_SEVERE = parseFloat(process.env.MODERATION_THRESHOLD_SEVERE || '0.6');
const MONTHLY_QUOTA = 30000;

// Prisma Enum 타입 정의
type ModerationAction = 'NONE' | 'WARNING_ISSUED' | 'CALL_ENDED';
type ReportReason = 'INAPPROPRIATE_CONTENT' | 'HARASSMENT' | 'SPAM' | 'FAKE_PROFILE' | 'OTHER';
type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

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
 * 할당량 증가
 */
export const incrementQuota = async (): Promise<void> => {
  if (!redis) {
    console.warn('[MODERATION] Redis not available, skipping quota increment');
    return;
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const key = `moderation:quota:${currentMonth}`;

  await redis.incr(key);
  await redis.expire(key, 60 * 60 * 24 * 31); // 31일 후 만료
};

/**
 * 이미지 분석 (Hugging Face API)
 */
export const analyzeImage = async (
  imageBase64: string
): Promise<{ confidence: number; label: string }> => {
  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${HUGGINGFACE_MODEL}`,
      { inputs: imageBase64 },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10초
      }
    );

    // Hugging Face 응답 형식: [{ label: 'nsfw', score: 0.95 }, { label: 'normal', score: 0.05 }]
    const nsfwResult = response.data.find((r: any) => r.label === 'nsfw');
    const confidence = nsfwResult?.score || 0;

    return {
      confidence,
      label: nsfwResult?.label || 'normal',
    };
  } catch (error: any) {
    console.error('[MODERATION] Hugging Face API error:', error.message);
    throw new AppError(500, 'AI_ANALYSIS_FAILED', 'AI 분석 실패');
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
  // 시스템 관리자 계정으로 신고 생성 (reporterId는 첫 번째 사용자의 ID 사용)
  // 실제로는 시스템 계정 UUID가 필요하지만, 일단 reportedUserId를 사용
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
