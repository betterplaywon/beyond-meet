/**
 * 매칭 Socket.io 핸들러 (함수형)
 */

import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import * as matchService from "../services/match-service";
import * as userService from "../services/user-service";
import prisma from "../config/database";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

/**
 * 친구들에게 온라인 상태 브로드캐스트
 */
const broadcastStatusToFriends = async (
  io: Server,
  userId: string,
  status: "ONLINE" | "OFFLINE"
) => {
  try {
    const friendIds = await userService.getFriendIds(userId);

    friendIds.forEach((friendId) => {
      io.to(friendId).emit("friend:status-changed", {
        friendId: userId,
        status,
        lastActive: new Date().toISOString(),
      });
    });

  } catch (error) {
    console.error("[STATUS] Failed to broadcast status:", error);
  }
};

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

  // Socket을 사용자 ID room에 join
  socket.join(userId);

  // 친구들에게 온라인 상태 브로드캐스트
  broadcastStatusToFriends(io, userId, "ONLINE");

  /**
   * 랜덤 매칭 요청
   */
  socket.on(
    "match:request",
    async (data: { type: "RANDOM" | "DIRECT"; targetUserId?: string }) => {
      try {
        if (data.type === "RANDOM") {
          // 대기열에 추가
          await matchService.addToMatchQueue(userId);

          // 매칭 상대 찾기
          const matchedUserId = await matchService.findMatch(userId);

          if (matchedUserId) {
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
              matchService.getUserMatchInfo(userId),
              matchService.getUserMatchInfo(matchedUserId),
            ]);

            // 각 사용자별로 Agora 토큰 및 UID 생성
            const user1TokenData = matchService.generateAgoraToken(
              session.channelName,
              userId
            );
            const user2TokenData = matchService.generateAgoraToken(
              session.channelName,
              matchedUserId
            );

            // 두 사용자에게 매칭 성공 알림 (개별 토큰/UID 전달)
            io.to(userId).emit("match:found", {
              session: {
                id: session.id,
                channelName: session.channelName,
              },
              partner: user2,
              token: user1TokenData.token,
              uid: user1TokenData.uid,
            });

            io.to(matchedUserId).emit("match:found", {
              session: {
                id: session.id,
                channelName: session.channelName,
              },
              partner: user1,
              token: user2TokenData.token,
              uid: user2TokenData.uid,
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
          const caller = await matchService.getUserMatchInfo(userId);

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
        console.error("[MATCH] Match request error:", error);
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

      // 수락한 사용자 (userId2)의 토큰 및 UID 생성
      const user2TokenData = matchService.generateAgoraToken(
        session.channelName,
        userId
      );

      // 발신자 (userId1)의 토큰 및 UID 생성
      const user1TokenData = matchService.generateAgoraToken(
        session.channelName,
        session.userId1
      );

      // 수락한 사용자에게 (본인의 토큰/UID 전달)
      socket.emit("call:accepted", {
        session: {
          id: session.id,
          channelName: session.channelName,
        },
        token: user2TokenData.token,
        uid: user2TokenData.uid,
      });

      // 발신자에게 수락 알림 (발신자의 토큰/UID 전달)
      io.to(session.userId1).emit("call:accepted", {
        session: {
          id: session.id,
          channelName: session.channelName,
        },
        token: user1TokenData.token,
        uid: user1TokenData.uid,
      });
    } catch (error: any) {
      console.error("[SOCKET] call:accept error:", error);
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
      // Service 레이어 사용 (Prisma 직접 호출 제거)
      const result = await matchService.rejectMatch(data.sessionId, userId);

      // 발신자에게 거절 알림
      io.to(result.session.userId1).emit("call:rejected", {
        sessionId: result.session.id,
      });
    } catch (error: any) {
      console.error("[SOCKET] call:reject error:", error);
      socket.emit("error", {
        message: "통화 거절 중 오류가 발생했습니다",
      });
    }
  });

  /**
   * 통화 종료
   */
  socket.on("call:end", async (data: { sessionId: string }) => {
    try {
      // Service 레이어 사용 (Prisma 직접 호출 제거)
      const result = await matchService.endCall(data.sessionId, userId);

      // 두 사용자에게 통화 종료 알림
      io.to(result.session.userId1).emit("call:ended", {
        sessionId: result.session.id,
        duration: result.duration,
      });

      io.to(result.session.userId2).emit("call:ended", {
        sessionId: result.session.id,
        duration: result.duration,
      });
    } catch (error: any) {
      console.error("[SOCKET] call:end error:", error);
      socket.emit("error", {
        message: "통화 종료 중 오류가 발생했습니다",
      });
    }
  });

  /**
   * 모니터링 이벤트: 경고 발송
   */
  socket.on(
    "moderation:warning",
    async (data: { sessionId: string; targetUserId: string }) => {
      try {
        // 상대방에게 경고 알림
        io.to(data.targetUserId).emit("moderation:warning-received", {
          sessionId: data.sessionId,
          message: "부적절한 행동이 감지되었습니다. 경고를 받았습니다.",
        });
      } catch (error) {
        console.error("[MODERATION] Warning error:", error);
      }
    }
  );

  /**
   * 모니터링 이벤트: 강제 종료
   */
  socket.on(
    "moderation:force-end",
    async (data: { sessionId: string; reportedUserId: string }) => {
      try {
        // 세션 가져오기
        const session = await prisma.matchSession.findUnique({
          where: { id: data.sessionId },
        });

        if (!session) {
          return;
        }

        // 통화 종료 처리
        const result = await matchService.endCall(
          data.sessionId,
          data.reportedUserId
        );

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
        const moderationService = await import(
          "../services/moderation-service"
        );
        await moderationService.createAutoReport({
          reportedUserId: data.reportedUserId,
          sessionId: data.sessionId,
          confidence: 0.7, // 임시 값 (실제로는 analyze에서 전달받아야 함)
        });
      } catch (error) {
        console.error("[MODERATION] Force end error:", error);
      }
    }
  );

  /**
   * 연결 해제
   */
  socket.on("disconnect", async () => {
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

      // 친구들에게 오프라인 상태 브로드캐스트
      await broadcastStatusToFriends(io, userId, "OFFLINE");
    } catch (error) {
      console.error(
        "[SOCKET] disconnect - failed to update user status:",
        error
      );
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
          matchService.getUserMatchInfo(user1),
          matchService.getUserMatchInfo(user2),
        ]);

        // 각 사용자별로 Agora 토큰 및 UID 생성
        const user1TokenData = matchService.generateAgoraToken(
          session.channelName,
          user1
        );
        const user2TokenData = matchService.generateAgoraToken(
          session.channelName,
          user2
        );

        // 두 사용자에게 매칭 성공 알림 (개별 토큰/UID 전달)
        io.to(user1).emit("match:found", {
          session: {
            id: session.id,
            channelName: session.channelName,
          },
          partner: userData2,
          token: user1TokenData.token,
          uid: user1TokenData.uid,
        });

        io.to(user2).emit("match:found", {
          session: {
            id: session.id,
            channelName: session.channelName,
          },
          partner: userData1,
          token: user2TokenData.token,
          uid: user2TokenData.uid,
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
