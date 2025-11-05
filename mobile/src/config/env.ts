/**
 * 환경 변수 설정
 */

export const ENV = {
  API_BASE_URL: __DEV__
    ? 'http://localhost:3000/api'
    : 'https://your-production-api.com/api',

  // Agora (나중에 실제 값으로 교체)
  AGORA_APP_ID: '',

  // 기타 설정
  TIMEOUT: 10000,
  MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_PHOTOS: 5,
};
