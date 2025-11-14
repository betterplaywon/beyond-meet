/**
 * 매칭 Socket.io 핸들러 (함수형)
 */

import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import * as matchService from "../services/match-service";
import prisma from "../config/database";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

/**
 * Socket 인증 미들웨어
 */
export const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("인증 토큰이 필요합니다"));
    }

    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.id) {
      return next(new Error("유효하지 않은 토큰입니다"));
    }

    socket.userId = decoded.id;
    socket.userEmail = decoded.email;

    // 사용자 온라인 상태 업데이트
    await prisma.user.update({
      where: { id: decoded.id },
      data: {
        onlineStatus: "ONLINE",
        lastActive: new Date(),
      },
    });

    next();
  } catch (error) {
    next(new Error("인증 실패"));
  }
};

/**
 * 매칭 핸들러 설정
 */
export const setupMatchHandlers = (io: Server, socket: AuthenticatedSocket) => {
  const userId = socket.userId!;

  console.log(`User connected: ${userId}`);

  // Socket을 사용자 ID room에 join
  socket.join(userId);

  // 모든 이벤트 로깅 (디버깅용)
  socket.onAny((eventName, ...args) => {
    console.log(`[SOCKET] User ${userId} sent event: ${eventName}`, args);
  });

  /**
   * 랜덤 매칭 요청
   */
  socket.on(
    "match:request",
    async (data: { type: "RANDOM" | "DIRECT"; targetUserId?: string }) => {
      try {
        if (data.type === "RANDOM") {
          // 대기열에 추가
          const queueResult = await matchService.addToMatchQueue(userId);

          // 매칭 상대 찾기
          const matchedUserId = await matchService.findMatch(userId);

          if (matchedUserId) {
            // 매칭 성공!

            // 세션 생성
            const session = await matchService.createMatchSession(
              userId,
              matchedUserId,
              "RANDOM"
            );

            // 대기열에서 제거
            matchService.removeFromMatchQueue(userId);
            matchService.removeFromMatchQueue(matchedUserId);

            // 사용자 정보 가져오기
            const [user1, user2] = await Promise.all([
              prisma.user.findUnique({
                where: { id: userId },
                select: {
                  id: true,
                  nickname: true,
                  profilePhotos: true,
                  gender: true,
                  country: true,
                },
              }),
              prisma.user.findUnique({
                where: { id: matchedUserId },
                select: {
                  id: true,
                  nickname: true,
                  profilePhotos: true,
                  gender: true,
                  country: true,
                },
              }),
            ]);

            // 두 사용자에게 매칭 성공 알림
            io.to(userId).emit("match:found", {
              session: {
                id: session.id,
                channelName: session.channelName,
              },
              partner: user2,
              token: session.token,
            });

            io.to(matchedUserId).emit("match:found", {
              session: {
                id: session.id,
                channelName: session.channelName,
              },
              partner: user1,
              token: matchService.generateAgoraToken(
                session.channelName,
                matchedUserId
              ),
            });
          } else {
            // 매칭 대기 중
            socket.emit("match:waiting", {
              message: "매칭 상대를 찾고 있습니다...",
            });
          }
        } else if (data.type === "DIRECT" && data.targetUserId) {
          // 선택 매칭
          const session = await matchService.requestDirectMatch(
            userId,
            data.targetUserId
          );

          // 발신자 정보
          const caller = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              nickname: true,
              profilePhotos: true,
              gender: true,
              country: true,
            },
          });

          // 수신자에게 통화 요청 알림
          io.to(data.targetUserId).emit("call:incoming", {
            session: {
              id: session.id,
              channelName: session.channelName,
            },
            caller,
          });

          // 발신자에게 확인
          socket.emit("call:requested", {
            sessionId: session.id,
            receiverId: data.targetUserId,
          });
        }
      } catch (error: any) {
        console.error("Match request error:", error);
        socket.emit("match:failed", {
          reason: error.message || "매칭 요청 실패",
        });
      }
    }
  );

  /**
   * 매칭 취소
   */
  socket.on("match:cancel", () => {
    matchService.removeFromMatchQueue(userId);
    console.log(`User ${userId} cancelled match request`);

    socket.emit("match:cancelled", {
      message: "매칭 요청이 취소되었습니다",
    });
  });

  /**
   * 통화 수락
   */
  socket.on("call:accept", async (data: { sessionId: string }) => {
    try {
      const session = await matchService.acceptMatch(data.sessionId, userId);

      // 토큰 생성
      const token = matchService.generateAgoraToken(
        session.channelName,
        userId
      );

      // 수락한 사용자에게
      socket.emit("call:accepted", {
        session: {
          id: session.id,
          channelName: session.channelName,
        },
        token,
      });

      // 발신자에게 수락 알림
      io.to(session.userId1).emit("call:accepted", {
        sessionId: session.id,
      });

      console.log(`Call accepted: session ${session.id}`);
    } catch (error: any) {
      console.error("Call accept error:", error);
      socket.emit("call:failed", {
        reason: error.message || "통화 수락 실패",
      });
    }
  });

  /**
   * 통화 거절
   */
  socket.on("call:reject", async (data: { sessionId: string }) => {
    try {
      await matchService.rejectMatch(data.sessionId, userId);

      const session = await prisma.matchSession.findUnique({
        where: { id: data.sessionId },
      });

      if (session) {
        // 발신자에게 거절 알림
        io.to(session.userId1).emit("call:rejected", {
          sessionId: session.id,
        });
      }

      console.log(`Call rejected: session ${data.sessionId}`);
    } catch (error: any) {
      console.error("Call reject error:", error);
    }
  });

  /**
   * 통화 종료
   */
  socket.on("call:end", async (data: { sessionId: string }) => {
    try {
      const result = await matchService.endCall(data.sessionId, userId);

      const session = await prisma.matchSession.findUnique({
        where: { id: data.sessionId },
      });

      if (session) {
        // 두 사용자에게 통화 종료 알림
        io.to(session.userId1).emit("call:ended", {
          sessionId: session.id,
          duration: result.duration,
        });

        io.to(session.userId2).emit("call:ended", {
          sessionId: session.id,
          duration: result.duration,
        });
      }

      console.log(
        `Call ended: session ${data.sessionId}, duration: ${result.duration}s`
      );
    } catch (error: any) {
      console.error("Call end error:", error);
    }
  });

  /**
   * 연결 해제
   */
  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${userId}`);

    // 대기열에서 제거
    matchService.removeFromMatchQueue(userId);

    // 사용자 상태 업데이트
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          onlineStatus: "OFFLINE",
          lastActive: new Date(),
        },
      });
    } catch (error) {
      console.error("Disconnect update error:", error);
    }
  });
};

/**
 * 주기적 재매칭 시스템 시작
 * 10초마다 큐의 모든 사용자를 재매칭 시도
 */
let periodicMatchingInterval: NodeJS.Timeout | null = null;

export const startPeriodicMatching = (io: Server) => {
  // 이미 실행 중이면 중복 실행 방지
  if (periodicMatchingInterval) {
    return;
  }

  periodicMatchingInterval = setInterval(async () => {
    try {
      const matches = await matchService.matchAllUsersInQueue();

      // 매칭된 사용자들에게 알림 전송
      for (const match of matches) {
        const { user1, user2 } = match;

        // 세션 생성
        const session = await matchService.createMatchSession(
          user1,
          user2,
          "RANDOM"
        );

        // 대기열에서 제거
        matchService.removeFromMatchQueue(user1);
        matchService.removeFromMatchQueue(user2);

        // 사용자 정보 가져오기
        const [userData1, userData2] = await Promise.all([
          prisma.user.findUnique({
            where: { id: user1 },
            select: {
              id: true,
              nickname: true,
              profilePhotos: true,
              gender: true,
              country: true,
            },
          }),
          prisma.user.findUnique({
            where: { id: user2 },
            select: {
              id: true,
              nickname: true,
              profilePhotos: true,
              gender: true,
              country: true,
            },
          }),
        ]);

        // 두 사용자에게 매칭 성공 알림
        io.to(user1).emit("match:found", {
          session: {
            id: session.id,
            channelName: session.channelName,
          },
          partner: userData2,
          token: session.token,
        });

        io.to(user2).emit("match:found", {
          session: {
            id: session.id,
            channelName: session.channelName,
          },
          partner: userData1,
          token: matchService.generateAgoraToken(session.channelName, user2),
        });
      }
    } catch (error) {
      console.error(
        "[PERIODIC_MATCHING] Error during periodic matching:",
        error
      );
    }
  }, 10000); // 10초마다 실행
};

/**
 * 주기적 재매칭 시스템 중지
 */
export const stopPeriodicMatching = () => {
  if (periodicMatchingInterval) {
    clearInterval(periodicMatchingInterval);
    periodicMatchingInterval = null;
  }
};
