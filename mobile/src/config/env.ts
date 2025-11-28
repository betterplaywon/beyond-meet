import { Platform } from 'react-native';
import {
  API_BASE_URL_IOS,
  API_BASE_URL_ANDROID,
  API_BASE_URL,
  AGORA_APP_ID,
} from '@env';

/**
 * 필수 환경 변수 검증
 * 값이 없으면 앱 시작 시 즉시 에러 발생
 */
const requireEnvVar = (value: string | undefined, name: string): string => {
  if (!value || value.trim() === '') {
    throw new Error(
      `❌ Missing required environment variable: ${name}\n` +
        `Please check your .env file and ensure ${name} is properly set.`,
    );
  }
  return value;
};

export const ENV = {
  // API Base URL
  // 개발 환경: iOS/Android별 URL 사용 (localhost vs 10.0.2.2)
  // 프로덕션: 통합 URL 사용
  API_BASE_URL: __DEV__
    ? Platform.select({
        ios: requireEnvVar(API_BASE_URL_IOS, 'API_BASE_URL_IOS'),
        android: requireEnvVar(API_BASE_URL_ANDROID, 'API_BASE_URL_ANDROID'),
      })!
    : requireEnvVar(API_BASE_URL, 'API_BASE_URL'),

  // Agora WebRTC App ID
  AGORA_APP_ID: requireEnvVar(AGORA_APP_ID, 'AGORA_APP_ID'),

  // 기타 설정
  TIMEOUT: 10000, // API 요청 타임아웃 (10초)
  MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 최대 사진 크기: 5MB
  MAX_PHOTOS: 5, // 최대 업로드 사진 수
};

// 개발 환경에서 설정 출력
if (__DEV__) {
  console.log('📱 [ENV] Configuration loaded from .env:');
  console.log(`  Platform: ${Platform.OS}`);
  console.log(`  API URL: ${ENV.API_BASE_URL}`);
  console.log(`  Agora ID: ${ENV.AGORA_APP_ID}`);
}
