/**
 * 매칭 서비스 (함수형)
 */

import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

/**
 * 매칭에 필요한 사용자 정보 조회
 */
export const getUserMatchInfo = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      profilePhotos: true,
      gender: true,
      country: true,
    },
  });
};

interface MatchRequest {
  userId: string;
  type: 'RANDOM' | 'DIRECT';
  targetUserId?: string;
}

interface MatchSession {
  id: string;
  userId1: string;
  userId2: string;
  channelName: string;
  token: string;
}

// 매칭 대기열 (메모리)
const matchQueue: Map<string, { userId: string; filters: any; timestamp: Date }> = new Map();

/**
 * Agora 토큰 생성
 */
export const generateAgoraToken = (channelName: string, userId: string): string => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new AppError(500, 'AGORA_CONFIG_MISSING', 'Agora 설정이 누락되었습니다');
  }

  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600; // 1시간
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  const uid = 0; // 0 = auto assign

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs,
    privilegeExpiredTs
  );

  return token;
};

/**
 * 매칭 세션 생성
 */
export const createMatchSession = async (
  userId1: string,
  userId2: string,
  type: 'RANDOM' | 'DIRECT'
): Promise<MatchSession> => {
  const channelName = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const session = await prisma.matchSession.create({
    data: {
      userId1,
      userId2,
      channelName,
      matchType: type,
      status: 'PENDING',
    },
  });

  // Agora 토큰 생성
  const token = generateAgoraToken(channelName, userId1);

  // 사용자 상태 업데이트
  await prisma.user.updateMany({
    where: {
      id: {
        in: [userId1, userId2],
      },
    },
    data: {
      onlineStatus: 'IN_CALL',
    },
  });

  return {
    id: session.id,
    userId1: session.userId1,
    userId2: session.userId2,
    channelName: session.channelName,
    token,
  };
};

/**
 * 랜덤 매칭 - 매칭 대기열에 추가
 */
export const addToMatchQueue = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      gender: true,
      birthDate: true,
      country: true,
      preferredGender: true,
      minAge: true,
      maxAge: true,
      preferredCountries: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  // 대기열에 추가
  matchQueue.set(userId, {
    userId,
    filters: {
      gender: user.gender,
      birthDate: user.birthDate,
      country: user.country,
      preferredGender: user.preferredGender,
      minAge: user.minAge,
      maxAge: user.maxAge,
      preferredCountries: user.preferredCountries,
    },
    timestamp: new Date(),
  });

  return { inQueue: true, queueSize: matchQueue.size };
};

/**
 * 매칭 대기열에서 제거
 */
export const removeFromMatchQueue = (userId: string) => {
  matchQueue.delete(userId);
  return { removed: true };
};

/**
 * 매칭 상대 찾기 (티어별 fallback 로직)
 */
export const findMatch = async (userId: string): Promise<string | null> => {
  const currentUser = matchQueue.get(userId);

  if (!currentUser) {
    return null;
  }

  // 나이 계산 함수
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const currentUserAge = calculateAge(currentUser.filters.birthDate);

  // Tier 1: 엄격한 매칭 (모든 필터 적용)
  const strictMatch = await tryMatchWithFilters(userId, currentUser, currentUserAge, {
    checkGender: true,
    checkAge: true,
    checkCountry: true,
  });
  if (strictMatch) {
    return strictMatch;
  }

  // Tier 2: 국가 필터 제외
  const countryRelaxedMatch = await tryMatchWithFilters(userId, currentUser, currentUserAge, {
    checkGender: true,
    checkAge: true,
    checkCountry: false,
  });
  if (countryRelaxedMatch) {
    return countryRelaxedMatch;
  }

  // Tier 3: 나이 범위 ±5년 확대
  const ageRelaxedMatch = await tryMatchWithFilters(userId, currentUser, currentUserAge, {
    checkGender: true,
    checkAge: true,
    checkCountry: false,
    ageBuffer: 5,
  });
  if (ageRelaxedMatch) {
    return ageRelaxedMatch;
  }

  return null;
};

/**
 * 필터 조건으로 매칭 시도
 */
async function tryMatchWithFilters(
  userId: string,
  currentUser: { userId: string; filters: any; timestamp: Date },
  currentUserAge: number,
  options: {
    checkGender: boolean;
    checkAge: boolean;
    checkCountry: boolean;
    ageBuffer?: number;
  }
): Promise<string | null> {
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const ageBuffer = options.ageBuffer || 0;

  for (const [candidateId, candidate] of matchQueue) {
    if (candidateId === userId) continue;

    const candidateAge = calculateAge(candidate.filters.birthDate);
    const reasons: string[] = [];

    // 성별 필터
    if (options.checkGender) {
      // ANYONE 체크: 한쪽이라도 ANYONE이면 성별 무시
      const currentUserAcceptsAny = currentUser.filters.preferredGender === 'ANYONE';
      const candidateAcceptsAny = candidate.filters.preferredGender === 'ANYONE';

      // 양방향 성별 체크
      if (!currentUserAcceptsAny &&
          candidate.filters.gender !== currentUser.filters.preferredGender) {
        reasons.push(`gender mismatch (wants ${currentUser.filters.preferredGender}, got ${candidate.filters.gender})`);
        continue;
      }

      if (!candidateAcceptsAny &&
          currentUser.filters.gender !== candidate.filters.preferredGender) {
        reasons.push(`reverse gender mismatch (candidate wants ${candidate.filters.preferredGender}, got ${currentUser.filters.gender})`);
        continue;
      }
    }

    // 나이 필터
    if (options.checkAge) {
      const minAge = currentUser.filters.minAge - ageBuffer;
      const maxAge = currentUser.filters.maxAge + ageBuffer;
      const candidateMinAge = candidate.filters.minAge - ageBuffer;
      const candidateMaxAge = candidate.filters.maxAge + ageBuffer;

      if (candidateAge < minAge || candidateAge > maxAge) {
        reasons.push(`age out of range (${candidateAge} not in ${minAge}-${maxAge})`);
        continue;
      }

      if (currentUserAge < candidateMinAge || currentUserAge > candidateMaxAge) {
        reasons.push(`reverse age out of range (${currentUserAge} not in ${candidateMinAge}-${candidateMaxAge})`);
        continue;
      }
    }

    // 국가 필터
    if (options.checkCountry) {
      if (currentUser.filters.preferredCountries.length > 0 &&
          !currentUser.filters.preferredCountries.includes(candidate.filters.country)) {
        reasons.push(`country not in preferred list`);
        continue;
      }

      if (candidate.filters.preferredCountries.length > 0 &&
          !candidate.filters.preferredCountries.includes(currentUser.filters.country)) {
        reasons.push(`reverse country not in preferred list`);
        continue;
      }
    }

    // 차단 여부 확인
    const isBlocked = await prisma.blockList.findFirst({
      where: {
        OR: [
          { userId: userId, blockedUserId: candidateId },
          { userId: candidateId, blockedUserId: userId },
        ],
      },
    });

    if (isBlocked) {
      reasons.push('blocked');
      continue;
    }

    // 매칭 성공!
    return candidateId;
  }

  return null;
}

/**
 * 선택 매칭 (친구에게 통화 요청)
 */
export const requestDirectMatch = async (callerId: string, receiverId: string): Promise<MatchSession> => {
  // 수신자 확인
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: {
      id: true,
      onlineStatus: true,
    },
  });

  if (!receiver) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  if (receiver.onlineStatus !== 'ONLINE') {
    throw new AppError(400, 'USER_NOT_ONLINE', '사용자가 온라인 상태가 아닙니다');
  }

  // 차단 여부 확인
  const isBlocked = await prisma.blockList.findFirst({
    where: {
      OR: [
        { userId: callerId, blockedUserId: receiverId },
        { userId: receiverId, blockedUserId: callerId },
      ],
    },
  });

  if (isBlocked) {
    throw new AppError(403, 'USER_BLOCKED', '차단된 사용자입니다');
  }

  // 매칭 세션 생성
  return await createMatchSession(callerId, receiverId, 'DIRECT');
};

/**
 * 매칭 수락
 */
export const acceptMatch = async (sessionId: string, userId: string) => {
  const session = await prisma.matchSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', '세션을 찾을 수 없습니다');
  }

  if (session.userId2 !== userId) {
    throw new AppError(403, 'FORBIDDEN', '권한이 없습니다');
  }

  // 세션 상태 업데이트
  const updatedSession = await prisma.matchSession.update({
    where: { id: sessionId },
    data: {
      status: 'ACTIVE',
      startTime: new Date(),
    },
  });

  // 통화 기록 생성
  await prisma.callRecord.create({
    data: {
      sessionId: session.id,
      callerId: session.userId1,
      receiverId: session.userId2,
      status: 'ONGOING',
      startTime: new Date(),
    },
  });

  return updatedSession;
};

/**
 * 매칭 거절
 */
export const rejectMatch = async (sessionId: string, userId: string) => {
  const session = await prisma.matchSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', '세션을 찾을 수 없습니다');
  }

  if (session.userId2 !== userId) {
    throw new AppError(403, 'FORBIDDEN', '권한이 없습니다');
  }

  // 세션 상태 업데이트
  await prisma.matchSession.update({
    where: { id: sessionId },
    data: {
      status: 'REJECTED',
      endTime: new Date(),
    },
  });

  // 사용자 상태 복구
  await prisma.user.updateMany({
    where: {
      id: {
        in: [session.userId1, session.userId2],
      },
    },
    data: {
      onlineStatus: 'ONLINE',
    },
  });

  return { rejected: true };
};

/**
 * 큐 전체 재매칭 (주기적 실행용)
 * 대기열의 모든 사용자를 순회하며 매칭 시도
 */
export const matchAllUsersInQueue = async (): Promise<Array<{ user1: string; user2: string }>> => {
  const matches: Array<{ user1: string; user2: string }> = [];
  const processedUsers = new Set<string>();

  // 큐의 모든 사용자를 순회
  for (const [userId] of matchQueue) {
    // 이미 매칭된 사용자는 건너뛰기
    if (processedUsers.has(userId)) {
      continue;
    }

    // 매칭 상대 찾기
    const matchedUserId = await findMatch(userId);

    if (matchedUserId && !processedUsers.has(matchedUserId)) {
      // 양쪽 사용자를 처리 완료로 표시
      processedUsers.add(userId);
      processedUsers.add(matchedUserId);

      matches.push({
        user1: userId,
        user2: matchedUserId,
      });
    }
  }

  return matches;
};

/**
 * 큐 상태 조회
 */
export const getQueueStatus = () => {
  return {
    size: matchQueue.size,
    users: Array.from(matchQueue.keys()),
  };
};

/**
 * 통화 종료
 */
export const endCall = async (sessionId: string, userId: string) => {
  const session = await prisma.matchSession.findUnique({
    where: { id: sessionId },
    include: {
      callRecords: {
        where: {
          status: 'ONGOING',
        },
      },
    },
  });

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', '세션을 찾을 수 없습니다');
  }

  if (session.userId1 !== userId && session.userId2 !== userId) {
    throw new AppError(403, 'FORBIDDEN', '권한이 없습니다');
  }

  const endTime = new Date();
  const startTime = session.startTime || new Date();
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  // 세션 종료
  await prisma.matchSession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      endTime,
      duration,
    },
  });

  // 통화 기록 업데이트
  if (session.callRecords.length > 0) {
    await prisma.callRecord.update({
      where: { id: session.callRecords[0].id },
      data: {
        status: 'COMPLETED',
        endTime,
        duration,
      },
    });
  }

  // 사용자 상태 복구
  await prisma.user.updateMany({
    where: {
      id: {
        in: [session.userId1, session.userId2],
      },
    },
    data: {
      onlineStatus: 'ONLINE',
    },
  });

  return { ended: true, duration };
};
