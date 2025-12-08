import jwt from 'jsonwebtoken';

/**
 * JWT 시크릿 검증
 * - 환경변수 필수
 * - 최소 32자 이상 (보안 권장사항)
 */
const validateSecret = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`${name} environment variable is required. Server cannot start without it.`);
  }
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters for security. Current length: ${value.length}`);
  }
  return value;
};

const JWT_SECRET = validateSecret('JWT_SECRET', process.env.JWT_SECRET);
const JWT_REFRESH_SECRET = validateSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);

export interface TokenPayload {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h', // 1 hour
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d', // 7 days
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};
