/**
 * 나이 계산 유틸리티
 * 생년월일을 기준으로 만 나이를 계산합니다.
 */

/**
 * 생년월일로부터 만 나이를 계산
 * @param birthDate 생년월일
 * @returns 만 나이
 */
export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1;
  }
  return age;
};
