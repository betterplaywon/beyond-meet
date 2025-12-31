/**
 * Email Service
 * Handles email verification code sending via Resend
 */
import resend, { RESEND_FROM_EMAIL } from '../config/resend';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate 6-digit verification code
 */
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification email
 */
export const sendVerificationEmail = async (userId: string, email: string): Promise<void> => {
  // Check cooldown (prevent spam)
  const recentVerification = await prisma.emailVerification.findFirst({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
      },
    },
  });

  if (recentVerification) {
    const waitSeconds = Math.ceil(
      (RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - recentVerification.createdAt.getTime())) / 1000
    );
    throw new AppError(
      429,
      'RESEND_COOLDOWN',
      `${waitSeconds}초 후에 다시 시도해주세요`
    );
  }

  // Generate new code
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate previous codes
  await prisma.emailVerification.updateMany({
    where: { userId, verified: false },
    data: { verified: true },
  });

  // Create new verification record
  await prisma.emailVerification.create({
    data: {
      userId,
      code,
      expiresAt,
    },
  });

  // Send email via Resend
  if (!resend) {
    console.warn('[EMAIL] Resend not configured, skipping email. Code:', code);
    return;
  }

  const { error } = await resend.emails.send({
    from: `Beyond Meet <${RESEND_FROM_EMAIL}>`,
    to: email,
    subject: '[Beyond Meet] 이메일 인증 코드',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #FF8383; margin-bottom: 24px;">Beyond Meet</h2>
        <p style="font-size: 16px; color: #333;">안녕하세요!</p>
        <p style="font-size: 16px; color: #333;">아래 인증 코드를 입력하여 이메일을 인증해주세요:</p>
        <div style="background-color: #f5f5f5; padding: 24px; text-align: center; margin: 24px 0; border-radius: 8px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FF8383;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #666;">이 코드는 ${VERIFICATION_CODE_EXPIRY_MINUTES}분 후에 만료됩니다.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">본인이 요청하지 않은 경우, 이 이메일을 무시하세요.</p>
      </div>
    `,
  });

  if (error) {
    console.error('[EMAIL] Failed to send verification email:', error);
    throw new AppError(500, 'EMAIL_SEND_FAILED', '이메일 전송에 실패했습니다');
  }
};

/**
 * Send verification email for pre-registration (no userId yet)
 * Uses email as temporary identifier
 */
export const sendPreRegistrationVerificationEmail = async (email: string): Promise<void> => {
  // Check cooldown using email-based lookup
  const recentVerification = await prisma.emailVerification.findFirst({
    where: {
      user: { email },
      createdAt: {
        gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
      },
    },
  });

  if (recentVerification) {
    const waitSeconds = Math.ceil(
      (RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - recentVerification.createdAt.getTime())) / 1000
    );
    throw new AppError(
      429,
      'RESEND_COOLDOWN',
      `${waitSeconds}초 후에 다시 시도해주세요`
    );
  }

  // For pre-registration, we use a temporary verification table or store code in memory/redis
  // Since we don't have a user yet, we'll store the code temporarily
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

  // Store in Redis for pre-registration verification
  const redis = (await import('../config/redis')).default;

  if (!redis) {
    console.error('[EMAIL] Redis not configured. Cannot store verification code.');
    throw new AppError(500, 'REDIS_NOT_CONFIGURED', '서버 설정 오류입니다. 관리자에게 문의하세요.');
  }

  const key = `email_verification:${email}`;
  await redis.set(key, JSON.stringify({ code, expiresAt: expiresAt.toISOString(), attempts: 0 }), { ex: VERIFICATION_CODE_EXPIRY_MINUTES * 60 });

  // Send email via Resend
  if (!resend) {
    console.warn('[EMAIL] Resend not configured, skipping email. Code:', code);
    return;
  }

  const { error } = await resend.emails.send({
    from: `Beyond Meet <${RESEND_FROM_EMAIL}>`,
    to: email,
    subject: '[Beyond Meet] 이메일 인증 코드',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #FF8383; margin-bottom: 24px;">Beyond Meet</h2>
        <p style="font-size: 16px; color: #333;">안녕하세요!</p>
        <p style="font-size: 16px; color: #333;">아래 인증 코드를 입력하여 이메일을 인증해주세요:</p>
        <div style="background-color: #f5f5f5; padding: 24px; text-align: center; margin: 24px 0; border-radius: 8px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FF8383;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #666;">이 코드는 ${VERIFICATION_CODE_EXPIRY_MINUTES}분 후에 만료됩니다.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">본인이 요청하지 않은 경우, 이 이메일을 무시하세요.</p>
      </div>
    `,
  });

  if (error) {
    console.error('[EMAIL] Failed to send verification email:', error);
    throw new AppError(500, 'EMAIL_SEND_FAILED', '이메일 전송에 실패했습니다');
  }
};

/**
 * Verify pre-registration email code (no userId yet)
 */
export const verifyPreRegistrationCode = async (email: string, code: string): Promise<boolean> => {
  const redis = (await import('../config/redis')).default;

  if (!redis) {
    throw new AppError(500, 'REDIS_NOT_CONFIGURED', '서버 설정 오류입니다. 관리자에게 문의하세요.');
  }

  const key = `email_verification:${email}`;
  const data = await redis.get(key);

  if (!data) {
    throw new AppError(400, 'NO_PENDING_VERIFICATION', '인증 요청이 없습니다. 인증 코드를 다시 요청해주세요.');
  }

  // Upstash Redis SDK returns parsed JSON object directly (no need for JSON.parse)
  const verification = data as { code: string; expiresAt: string; attempts: number };

  // Check attempts limit
  if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await redis.del(key);
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', '인증 시도 횟수를 초과했습니다. 새 코드를 요청해주세요.');
  }

  // Increment attempts
  verification.attempts += 1;
  await redis.set(key, JSON.stringify(verification), { ex: VERIFICATION_CODE_EXPIRY_MINUTES * 60 });

  // Check expiration
  if (new Date(verification.expiresAt) < new Date()) {
    await redis.del(key);
    throw new AppError(400, 'CODE_EXPIRED', '인증 코드가 만료되었습니다. 새 코드를 요청해주세요.');
  }

  // Verify code
  if (verification.code !== code) {
    const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - verification.attempts;
    throw new AppError(
      400,
      'INVALID_CODE',
      `인증 코드가 올바르지 않습니다. (남은 시도: ${remainingAttempts}회)`
    );
  }

  // Mark email as verified in Redis (will be used during registration)
  await redis.set(`email_verified:${email}`, 'true', { ex: 30 * 60 }); // 30 minutes validity
  await redis.del(key);

  return true;
};

/**
 * Check if email is pre-verified (for registration)
 */
export const isEmailPreVerified = async (email: string): Promise<boolean> => {
  const redis = (await import('../config/redis')).default;

  if (!redis) {
    console.warn('[EMAIL] Redis not configured. Cannot check email pre-verification.');
    return false;
  }

  const verified = await redis.get(`email_verified:${email}`);
  return verified === true;
};

/**
 * Clear pre-verification status after registration
 */
export const clearEmailPreVerification = async (email: string): Promise<void> => {
  const redis = (await import('../config/redis')).default;

  if (!redis) {
    console.warn('[EMAIL] Redis not configured. Cannot clear email pre-verification.');
    return;
  }

  await redis.del(`email_verified:${email}`);
};

/**
 * Verify email code
 */
export const verifyEmailCode = async (userId: string, code: string): Promise<boolean> => {
  // Find latest unverified code for user
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId,
      verified: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    throw new AppError(400, 'NO_PENDING_VERIFICATION', '인증 요청이 없습니다. 인증 코드를 다시 요청해주세요.');
  }

  // Check attempts limit
  if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', '인증 시도 횟수를 초과했습니다. 새 코드를 요청해주세요.');
  }

  // Increment attempts
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: { attempts: { increment: 1 } },
  });

  // Check expiration
  if (verification.expiresAt < new Date()) {
    throw new AppError(400, 'CODE_EXPIRED', '인증 코드가 만료되었습니다. 새 코드를 요청해주세요.');
  }

  // Verify code
  if (verification.code !== code) {
    const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - verification.attempts - 1;
    throw new AppError(
      400,
      'INVALID_CODE',
      `인증 코드가 올바르지 않습니다. (남은 시도: ${remainingAttempts}회)`
    );
  }

  // Mark as verified
  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    }),
  ]);

  return true;
};
