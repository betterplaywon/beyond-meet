/**
 * 통화 관리 서비스
 */

import prisma from "../config/database";
import { AppError } from "../middlewares/errorHandler";
import { CallEventType } from "@prisma/client";

interface StartCallInput {
  sessionId: string;
  callerId: string;
  receiverId: string;
}

interface EndCallInput {
  endTime: Date;
  duration?: number;
}

interface RecordEventInput {
  eventType: CallEventType;
  timestamp: Date;
  metadata?: any;
}

interface PaginationInput {
  page: number;
  limit: number;
}

/**
 * 통화 시작
 */
export const startCall = async (data: StartCallInput) => {
  const { sessionId, callerId, receiverId } = data;

  // 1. 세션 존재 및 상태 확인
  const session = await prisma.matchSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(
      404,
      "SESSION_NOT_FOUND",
      "매칭 세션을 찾을 수 없습니다"
    );
  }

  if (session.status === "COMPLETED" || session.status === "CANCELLED") {
    throw new AppError(400, "SESSION_ENDED", "이미 종료된 세션입니다");
  }

  // 2. 이미 진행 중인 통화가 있는지 확인
  const existingCall = await prisma.callRecord.findFirst({
    where: {
      sessionId,
      status: { in: ["INITIATED", "RINGING", "ONGOING"] },
    },
  });

  if (existingCall) {
    throw new AppError(
      400,
      "CALL_ALREADY_EXISTS",
      "이미 진행 중인 통화가 있습니다"
    );
  }

  // 3. 통화 기록 생성 및 세션 상태 업데이트
  const call = await prisma.$transaction(async (tx) => {
    // 통화 기록 생성
    const newCall = await tx.callRecord.create({
      data: {
        sessionId,
        callerId,
        receiverId,
        status: "ONGOING",
        startTime: new Date(),
      },
    });

    // 세션 상태 업데이트
    await tx.matchSession.update({
      where: { id: sessionId },
      data: {
        status: "ACTIVE",
        startTime: new Date(),
      },
    });

    // 사용자 온라인 상태 업데이트
    await tx.user.updateMany({
      where: {
        id: { in: [callerId, receiverId] },
      },
      data: {
        onlineStatus: "IN_CALL",
      },
    });

    // 통화 시작 이벤트 기록
    await tx.callEvent.create({
      data: {
        sessionId,
        eventType: "CALL_STARTED",
        timestamp: new Date(),
      },
    });

    return newCall;
  });

  return call;
};

/**
 * 통화 종료
 */
export const endCall = async (callId: string, data: EndCallInput) => {
  const { endTime, duration } = data;

  // 1. 통화 기록 조회
  const call = await prisma.callRecord.findUnique({
    where: { id: callId },
    include: {
      session: true,
    },
  });

  if (!call) {
    throw new AppError(404, "CALL_NOT_FOUND", "통화 기록을 찾을 수 없습니다");
  }

  if (call.status === "COMPLETED") {
    throw new AppError(400, "CALL_ALREADY_ENDED", "이미 종료된 통화입니다");
  }

  // 2. 실제 통화 시간 계산
  let actualDuration = duration;
  if (!actualDuration && call.startTime) {
    actualDuration = Math.floor(
      (endTime.getTime() - call.startTime.getTime()) / 1000
    );
  }

  // 3. 통화 종료 처리
  const updatedCall = await prisma.$transaction(async (tx) => {
    // 통화 기록 업데이트
    const updated = await tx.callRecord.update({
      where: { id: callId },
      data: {
        status: "COMPLETED",
        endTime,
        duration: actualDuration,
      },
    });

    // 세션 상태 업데이트
    await tx.matchSession.update({
      where: { id: call.sessionId },
      data: {
        status: "COMPLETED",
        endTime,
        duration: actualDuration,
      },
    });

    // 사용자 온라인 상태 업데이트
    await tx.user.updateMany({
      where: {
        id: { in: [call.callerId, call.receiverId] },
      },
      data: {
        onlineStatus: "ONLINE",
        lastActive: new Date(),
      },
    });

    // 통화 종료 이벤트 기록
    await tx.callEvent.create({
      data: {
        sessionId: call.sessionId,
        eventType: "CALL_ENDED",
        timestamp: endTime,
        metadata: {
          duration: actualDuration,
        },
      },
    });

    return updated;
  });

  return updatedCall;
};

/**
 * 통화 기록 조회 (페이지네이션)
 */
export const getCallHistory = async (
  userId: string,
  pagination: PaginationInput
) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  // 1. 사용자 존재 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다");
  }

  // 2. 통화 기록 조회 (caller 또는 receiver로 참여한 통화)
  const [calls, total] = await Promise.all([
    prisma.callRecord.findMany({
      where: {
        OR: [{ callerId: userId }, { receiverId: userId }],
      },
      include: {
        caller: {
          select: {
            id: true,
            nickname: true,
            profilePhotos: true,
          },
        },
        receiver: {
          select: {
            id: true,
            nickname: true,
            profilePhotos: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.callRecord.count({
      where: {
        OR: [{ callerId: userId }, { receiverId: userId }],
      },
    }),
  ]);

  // 3. 응답 포맷팅
  const formattedCalls = calls.map((call) => {
    const isCallerMe = call.callerId === userId;
    const partner = isCallerMe ? call.receiver : call.caller;

    return {
      id: call.id,
      partner: partner
        ? {
            id: partner.id,
            nickname: partner.nickname,
            profilePhotos: partner.profilePhotos,
          }
        : {
            id: null,
            nickname: '탈퇴한 사용자',
            profilePhotos: [],
          },
      // status는 명확한 값만 반환 (COMPLETED, MISSED, REJECTED 등)
      status: call.status,
      // startTime이 없으면 createdAt 사용 (항상 유효한 값 보장)
      callTime: call.startTime || call.createdAt,
      // duration은 완료된 통화만 있음, 부재중/거절은 null
      duration: call.status === "COMPLETED" ? call.duration || 0 : null,
      // UI에서 사용할 타입 (COMPLETED vs MISSED/REJECTED)
      type: call.status === "COMPLETED" ? "COMPLETED" : "MISSED",
    };
  });

  return {
    calls: formattedCalls,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * 세션 정보 조회 (통화 종료 후 상대방 정보 확인용)
 */
export const getSessionInfo = async (sessionId: string, userId: string) => {
  const session = await prisma.matchSession.findUnique({
    where: { id: sessionId },
    include: {
      user1: {
        select: {
          id: true,
          nickname: true,
          profilePhotos: true,
        },
      },
      user2: {
        select: {
          id: true,
          nickname: true,
          profilePhotos: true,
        },
      },
    },
  });

  if (!session) {
    throw new AppError(404, "SESSION_NOT_FOUND", "세션을 찾을 수 없습니다");
  }

  // 요청한 사용자가 세션 참여자인지 확인
  if (session.userId1 !== userId && session.userId2 !== userId) {
    throw new AppError(403, "FORBIDDEN", "이 세션에 접근할 수 없습니다");
  }

  // 상대방 정보 추출 (탈퇴한 사용자는 NULL일 수 있음)
  const partnerUser = session.userId1 === userId ? session.user2 : session.user1;
  const partner = partnerUser ?? {
    id: null,
    nickname: '탈퇴한 사용자',
    profilePhotos: [],
  };

  return {
    session: {
      id: session.id,
      status: session.status,
      matchType: session.matchType,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
    },
    partner,
  };
};

/**
 * 통화 이벤트 기록
 */
export const recordCallEvent = async (
  callId: string,
  data: RecordEventInput
) => {
  const { eventType, timestamp, metadata } = data;

  // 1. 통화 기록 조회
  const call = await prisma.callRecord.findUnique({
    where: { id: callId },
  });

  if (!call) {
    throw new AppError(404, "CALL_NOT_FOUND", "통화 기록을 찾을 수 없습니다");
  }

  // 2. 이벤트 기록
  await prisma.callEvent.create({
    data: {
      sessionId: call.sessionId,
      eventType,
      timestamp,
      metadata,
    },
  });
};
