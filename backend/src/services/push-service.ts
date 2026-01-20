/**
 * 푸시 알림 서비스
 */

import prisma from '../config/database';
import admin from '../config/firebase';
import { AppError } from '../middlewares/errorHandler';
import { Platform } from '@prisma/client';

interface RegisterDeviceTokenInput {
  userId: string;
  deviceToken: string;
  platform: Platform;
}

/**
 * 디바이스 토큰 등록
 */
export const registerDeviceToken = async (data: RegisterDeviceTokenInput) => {
  const { userId, deviceToken, platform } = data;

  // 1. 사용자 존재 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  // 2. 이미 등록된 토큰이 있는지 확인
  const existingToken = await prisma.deviceToken.findUnique({
    where: { token: deviceToken },
  });

  if (existingToken) {
    // 기존 토큰이 있으면 업데이트
    await prisma.deviceToken.update({
      where: { token: deviceToken },
      data: {
        userId,
        platform,
        lastUpdated: new Date(),
      },
    });
  } else {
    // 새로운 토큰 등록
    await prisma.deviceToken.create({
      data: {
        userId,
        token: deviceToken,
        platform,
      },
    });
  }
};

/**
 * 디바이스 토큰 제거
 */
export const unregisterDeviceToken = async (deviceToken: string) => {
  const token = await prisma.deviceToken.findUnique({
    where: { token: deviceToken },
  });

  if (!token) {
    throw new AppError(404, 'TOKEN_NOT_FOUND', '디바이스 토큰을 찾을 수 없습니다');
  }

  await prisma.deviceToken.delete({
    where: { token: deviceToken },
  });
};

/**
 * 사용자에게 푸시 알림 전송
 */
export const sendPushNotification = async (
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
) => {
  // 1. 사용자의 디바이스 토큰 조회 (필요한 필드만 select)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      pushEnabled: true,
      deviceTokens: {
        select: { token: true },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  // 2. 푸시 알림 설정 확인
  if (!user.pushEnabled) {
    return;
  }

  // 3. 디바이스 토큰이 없으면 종료
  if (user.deviceTokens.length === 0) {
    return;
  }

  // 4. Firebase를 통해 푸시 알림 전송
  const tokens = user.deviceTokens.map((dt) => dt.token);

  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // 5. 실패한 토큰 제거 (invalid token)
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      if (failedTokens.length > 0) {
        await prisma.deviceToken.deleteMany({
          where: {
            token: { in: failedTokens },
          },
        });
      }
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw new AppError(500, 'PUSH_NOTIFICATION_FAILED', '푸시 알림 전송에 실패했습니다');
  }
};

/**
 * 여러 사용자에게 푸시 알림 전송 (배치 처리로 N+1 쿼리 해결)
 */
export const sendPushNotificationToMultipleUsers = async (
  userIds: string[],
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
) => {
  if (userIds.length === 0) return;

  // 단일 쿼리로 모든 유저 데이터 가져오기 (N+1 쿼리 해결)
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      pushEnabled: true,
    },
    select: {
      id: true,
      deviceTokens: {
        select: { token: true },
      },
    },
  });

  if (users.length === 0) return;

  // 모든 토큰 수집
  const allTokens: string[] = [];
  users.forEach((user) => {
    user.deviceTokens.forEach((dt) => allTokens.push(dt.token));
  });

  if (allTokens.length === 0) return;

  // FCM multicast 메시지 생성
  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: notification.data,
  };

  try {
    // 한번에 배치 전송 (FCM은 최대 500개 토큰까지 지원)
    const batchSize = 500;
    const failedTokens: string[] = [];

    for (let i = 0; i < allTokens.length; i += batchSize) {
      const batch = allTokens.slice(i, i + batchSize);
      const response = await admin.messaging().sendEachForMulticast({
        ...message,
        tokens: batch,
      });

      // 실패한 토큰 수집
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(batch[idx]);
          }
        });
      }
    }

    // 실패한 토큰 일괄 삭제
    if (failedTokens.length > 0) {
      await prisma.deviceToken.deleteMany({
        where: {
          token: { in: failedTokens },
        },
      });
    }
  } catch (error) {
    console.error('Batch push notification failed:', error);
    // 배치 전송 실패 시에도 에러를 던지지 않고 로그만 남김
  }
};
