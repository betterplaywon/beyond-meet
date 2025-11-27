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

    console.log('[SOCKET_AUTH] Token received:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

    if (!token) {
      console.error('[SOCKET_AUTH] ❌ No token provided');
      return next(new Error("인증 토큰이 필요합니다"));
    }

    const decoded = verifyAccessToken(token);
    console.log('[SOCKET_AUTH] Decoded token:', decoded ? `userId=${decoded.id}` : 'INVALID');

    if (!decoded || !decoded.id) {
      console.error('[SOCKET_AUTH] ❌ Invalid token');
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

    console.log('[SOCKET_AUTH] ✅ Authentication successful:', decoded.id);
    next();
  } catch (error) {
    console.error('[SOCKET_AUTH] ❌ Authentication error:', error);
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

  /**
   * 랜덤 매칭 요청
   */
  socket.on(
    "match:request",
    async (data: { type: "RANDOM" | "DIRECT"; targetUserId?: string }) => {
      try {
        console.log("[MATCH] Match request received:", {
          userId,
          type: data.type,
        });

        if (data.type === "RANDOM") {
          // 대기열에 추가
          const queueResult = await matchService.addToMatchQueue(userId);
          console.log("[MATCH] User added to queue:", { userId, queueResult });

          // 매칭 상대 찾기
          const matchedUserId = await matchService.findMatch(userId);
          console.log("[MATCH] Find match result:", { userId, matchedUserId });

          if (matchedUserId) {
            // 매칭 성공!
            console.log("[MATCH] Match found!", { userId, matchedUserId });

            // 세션 생성
            const session = await matchService.createMatchSession(
              userId,
              matchedUserId,
              "RANDOM"
            );
            console.log("[MATCH] Session created:", {
              sessionId: session.id,
              channelName: session.channelName,
            });

            // 대기열에서 제거
            matchService.removeFromMatchQueue(userId);
            matchService.removeFromMatchQueue(matchedUserId);
            console.log("[MATCH] Users removed from queue");

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
            console.log("[MATCH] Emitting match:found to userId:", userId);
            io.to(userId).emit("match:found", {
              session: {
                id: session.id,
                channelName: session.channelName,
              },
              partner: user2,
              token: user1TokenData.token,
              uid: user1TokenData.uid,
            });

            console.log(
              "[MATCH] Emitting match:found to matchedUserId:",
              matchedUserId
            );
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
            console.log("[MATCH] No match found, waiting...", { userId });
            socket.emit("match:waiting", {
              message: "매칭 상대를 찾고 있습니다...",
            });
          }
        } else if (data.type === "DIRECT" && data.targetUserId) {
          // 선택 매칭
          console.log("[MATCH] Direct match request:", {
            userId,
            targetUserId: data.targetUserId,
          });

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
  socket.on("moderation:warning", async (data: { sessionId: string; targetUserId: string }) => {
    try {
      console.log("[MODERATION] Warning event:", data);

      // 상대방에게 경고 알림
      io.to(data.targetUserId).emit("moderation:warning-received", {
        sessionId: data.sessionId,
        message: "부적절한 행동이 감지되었습니다. 경고를 받았습니다.",
      });
    } catch (error) {
      console.error("[MODERATION] Warning error:", error);
    }
  });

  /**
   * 모니터링 이벤트: 강제 종료
   */
  socket.on("moderation:force-end", async (data: { sessionId: string; reportedUserId: string }) => {
    try {
      console.log("[MODERATION] Force end event:", data);

      // 세션 가져오기
      const session = await prisma.matchSession.findUnique({
        where: { id: data.sessionId },
      });

      if (!session) {
        return;
      }

      // 통화 종료 처리
      const result = await matchService.endCall(data.sessionId, data.reportedUserId);

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
        confidence: 0.7, // 임시 값 (실제로는 analyze에서 전달받아야 함)
      });
    } catch (error) {
      console.error("[MODERATION] Force end error:", error);
    }
  });

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
    } catch (error) {
      console.error("[SOCKET] disconnect - failed to update user status:", error);
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
      console.log("[PERIODIC_MATCHING] Starting periodic matching...");
      const matches = await matchService.matchAllUsersInQueue();
      console.log("[PERIODIC_MATCHING] Matches found:", matches.length);

      // 매칭된 사용자들에게 알림 전송
      for (const match of matches) {
        const { user1, user2 } = match;
        console.log("[PERIODIC_MATCHING] Processing match:", {
          user1,
          user2,
        });

        // 세션 생성
        const session = await matchService.createMatchSession(
          user1,
          user2,
          "RANDOM"
        );
        console.log("[PERIODIC_MATCHING] Session created:", session.id);

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
        console.log("[PERIODIC_MATCHING] Emitting match:found to user1:", user1);
        io.to(user1).emit("match:found", {
          session: {
            id: session.id,
            channelName: session.channelName,
          },
          partner: userData2,
          token: user1TokenData.token,
          uid: user1TokenData.uid,
        });

        console.log("[PERIODIC_MATCHING] Emitting match:found to user2:", user2);
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
