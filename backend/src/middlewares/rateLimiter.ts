/**
 * Rate Limiting 미들웨어
 */

import rateLimit from "express-rate-limit";

/**
 * 일반 API Rate Limiter
 * - 15분 동안 최대 100번 요청
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100번 요청
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.",
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * 인증 API Rate Limiter (더 엄격함)
 * - 15분 동안 최대 5번 요청
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5번 요청
  message: {
    success: false,
    error: {
      code: "TOO_MANY_AUTH_ATTEMPTS",
      message: "로그인 시도 횟수가 초과되었습니다. 15분 후 다시 시도해주세요.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // IP 기반으로 추적
  skipSuccessfulRequests: true, // 성공한 요청은 카운트하지 않음
});

/**
 * 비밀번호 재설정 Rate Limiter (매우 엄격함)
 * - 1시간 동안 최대 3번 요청
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 3, // 최대 3번 요청
  message: {
    success: false,
    error: {
      code: "TOO_MANY_PASSWORD_RESET_ATTEMPTS",
      message:
        "비밀번호 재설정 요청이 너무 많습니다. 1시간 후 다시 시도해주세요.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 파일 업로드 Rate Limiter
 * - 1시간 동안 최대 10번 업로드
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 10, // 최대 10번 업로드
  message: {
    success: false,
    error: {
      code: "TOO_MANY_UPLOAD_ATTEMPTS",
      message: "파일 업로드 횟수가 초과되었습니다. 1시간 후 다시 시도해주세요.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 관리자 API Rate Limiter
 * - 15분 동안 최대 50번 요청
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 50, // 최대 50번 요청
  message: {
    success: false,
    error: {
      code: "TOO_MANY_ADMIN_REQUESTS",
      message: "관리자 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 이메일 인증 재발송 Rate Limiter
 * - 5분 동안 최대 3번 요청
 */
export const verificationResendLimiter = rateLimit({
  windowMs: 10 * 30 * 1000, // 5분
  max: 10, // 최대 10번 요청
  message: {
    success: false,
    error: {
      code: "TOO_MANY_RESEND_ATTEMPTS",
      message:
        "인증 코드 재발송 요청이 너무 많습니다. 5분 후 다시 시도해주세요.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
