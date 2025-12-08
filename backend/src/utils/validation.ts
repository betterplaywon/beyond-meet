/**
 * Zod 입력 검증 스키마
 * - 모든 사용자 입력은 이 스키마를 통해 검증됨
 * - XSS 방지를 위한 HTML 태그 제거 포함
 */

import { z } from 'zod';

/**
 * HTML 태그 제거 (XSS 방지)
 */
const sanitizeHtml = (str: string): string => {
  return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * 비밀번호 규칙:
 * - 최소 8자
 * - 대문자 1개 이상
 * - 숫자 1개 이상
 * - 특수문자 1개 이상
 */
const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .regex(/[A-Z]/, '비밀번호에 대문자가 최소 1개 포함되어야 합니다')
  .regex(/[0-9]/, '비밀번호에 숫자가 최소 1개 포함되어야 합니다')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, '비밀번호에 특수문자가 최소 1개 포함되어야 합니다');

/**
 * 이메일 스키마 (RFC 5322 준수)
 */
const emailSchema = z
  .string()
  .email('유효한 이메일 형식이 아닙니다')
  .max(255, '이메일은 255자를 초과할 수 없습니다')
  .transform((email) => email.toLowerCase().trim());

/**
 * 닉네임 스키마
 * - 2-20자
 * - 영문, 한글, 숫자, 언더스코어만 허용
 */
const nicknameSchema = z
  .string()
  .min(2, '닉네임은 최소 2자 이상이어야 합니다')
  .max(20, '닉네임은 20자를 초과할 수 없습니다')
  .regex(/^[a-zA-Z0-9가-힣_]+$/, '닉네임은 영문, 한글, 숫자, 언더스코어만 사용 가능합니다')
  .transform(sanitizeHtml);

/**
 * 생년월일 스키마
 * - ISO 8601 형식 (YYYY-MM-DD)
 * - 18세 이상, 100세 이하
 */
const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '생년월일은 YYYY-MM-DD 형식이어야 합니다')
  .refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    return actualAge >= 18;
  }, '18세 이상만 가입할 수 있습니다')
  .refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age <= 100;
  }, '유효하지 않은 생년월일입니다');

/**
 * 성별 스키마
 */
const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER'], {
  error: '성별은 MALE, FEMALE, OTHER 중 하나여야 합니다',
});

/**
 * 선호 성별 스키마 (매칭용)
 */
const preferredGenderSchema = z.enum(['MALE', 'FEMALE', 'ANYONE'], {
  error: '선호 성별은 MALE, FEMALE, ANYONE 중 하나여야 합니다',
});

/**
 * 국가 코드 스키마 (ISO 3166-1 alpha-2)
 */
const countrySchema = z
  .string()
  .length(2, '국가 코드는 2자리여야 합니다 (ISO 3166-1 alpha-2)')
  .regex(/^[A-Z]{2}$/, '국가 코드는 대문자 2자리여야 합니다')
  .transform((code) => code.toUpperCase());

/**
 * 초대 코드 스키마
 */
const inviteCodeSchema = z
  .string()
  .min(1, '초대 코드를 입력해주세요')
  .max(20, '초대 코드는 20자를 초과할 수 없습니다')
  .transform((code) => code.toUpperCase().trim());

/**
 * 자기소개 스키마
 */
const bioSchema = z
  .string()
  .max(200, '자기소개는 200자를 초과할 수 없습니다')
  .transform(sanitizeHtml)
  .optional();

/**
 * 관심사 배열 스키마
 */
const interestsSchema = z
  .array(z.string().max(30, '각 관심사는 30자를 초과할 수 없습니다').transform(sanitizeHtml))
  .max(10, '관심사는 최대 10개까지 등록 가능합니다')
  .optional();

/**
 * 나이 범위 스키마
 */
const ageRangeSchema = z
  .object({
    minAge: z.number().int().min(18, '최소 나이는 18세 이상이어야 합니다').max(100),
    maxAge: z.number().int().min(18).max(100, '최대 나이는 100세 이하여야 합니다'),
  })
  .refine((data) => data.minAge <= data.maxAge, {
    message: '최소 나이는 최대 나이보다 작거나 같아야 합니다',
    path: ['minAge'],
  });

/**
 * 선호 국가 배열 스키마
 */
const preferredCountriesSchema = z
  .array(countrySchema)
  .max(20, '선호 국가는 최대 20개까지 선택 가능합니다')
  .optional();

/**
 * 회원가입 요청 스키마
 */
export const registerSchema = z
  .object({
    inviteCode: inviteCodeSchema,
    email: emailSchema,
    password: passwordSchema,
    nickname: nicknameSchema,
    birthDate: birthDateSchema,
    gender: genderSchema,
    country: countrySchema,
    bio: bioSchema,
    interests: interestsSchema,
    preferredGender: preferredGenderSchema,
    minAge: z.number().int().min(18).max(100),
    maxAge: z.number().int().min(18).max(100),
    preferredCountries: preferredCountriesSchema,
  })
  .refine((data) => data.minAge <= data.maxAge, {
    message: '최소 나이는 최대 나이보다 작거나 같아야 합니다',
    path: ['minAge'],
  });

/**
 * 로그인 요청 스키마
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

/**
 * 비밀번호 재설정 스키마
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
  newPassword: passwordSchema,
});

/**
 * 프로필 업데이트 스키마
 */
export const updateProfileSchema = z
  .object({
    nickname: nicknameSchema.optional(),
    bio: bioSchema,
    interests: interestsSchema,
    preferredGender: preferredGenderSchema.optional(),
    minAge: z.number().int().min(18).max(100).optional(),
    maxAge: z.number().int().min(18).max(100).optional(),
    preferredCountries: preferredCountriesSchema,
    pushEnabled: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.minAge !== undefined && data.maxAge !== undefined) {
        return data.minAge <= data.maxAge;
      }
      return true;
    },
    {
      message: '최소 나이는 최대 나이보다 작거나 같아야 합니다',
      path: ['minAge'],
    }
  );

/**
 * Zod 에러를 사용자 친화적 메시지로 변환
 */
export const formatZodError = (error: z.ZodError): string => {
  const issues = error.issues;
  if (issues && issues.length > 0) {
    return issues[0].message;
  }
  return '입력값이 올바르지 않습니다';
};

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
