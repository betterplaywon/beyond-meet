/**
 * 이미지 검증 유틸리티
 * AI 모델에 전송하기 전 이미지 유효성 검사
 */

import sizeOf from 'image-size';
import { AppError } from '../middlewares/errorHandler';

/**
 * 이미지 최소 요구사항
 * Hugging Face Falconsai/nsfw_image_detection 모델 기준
 */
export const IMAGE_REQUIREMENTS = {
  MIN_WIDTH: 224,
  MIN_HEIGHT: 224,
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
} as const;

/**
 * Base64 이미지를 AI 모델 분석에 사용할 수 있는지 검증
 *
 * @param imageBase64 - Base64 인코딩된 이미지 문자열
 * @throws AppError - 이미지가 요구사항을 충족하지 못할 경우
 */
export const validateImageForModeration = (imageBase64: string): void => {
  try {
    // Base64 데이터 추출
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 이미지 크기 및 포맷 확인
    const dimensions = sizeOf(buffer);

    if (!dimensions.width || !dimensions.height) {
      throw new AppError(
        400,
        'INVALID_IMAGE_FORMAT',
        '이미지 크기를 확인할 수 없습니다. 유효한 이미지 파일인지 확인해주세요.'
      );
    }

    // 최소 크기 검증
    if (dimensions.width < IMAGE_REQUIREMENTS.MIN_WIDTH || dimensions.height < IMAGE_REQUIREMENTS.MIN_HEIGHT) {
      throw new AppError(
        400,
        'IMAGE_TOO_SMALL',
        `이미지가 너무 작습니다. 최소 크기: ${IMAGE_REQUIREMENTS.MIN_WIDTH}x${IMAGE_REQUIREMENTS.MIN_HEIGHT}px (현재: ${dimensions.width}x${dimensions.height}px)`
      );
    }

    // 포맷 검증
    const format = dimensions.type?.toLowerCase();
    if (!format || !(IMAGE_REQUIREMENTS.SUPPORTED_FORMATS as readonly string[]).includes(format)) {
      throw new AppError(
        400,
        'UNSUPPORTED_IMAGE_FORMAT',
        `지원하지 않는 이미지 형식입니다. 지원 형식: ${IMAGE_REQUIREMENTS.SUPPORTED_FORMATS.join(', ')} (현재: ${format || 'unknown'})`
      );
    }

    // 검증 성공
    console.log(
      `[IMAGE_VALIDATOR] ✓ 이미지 검증 성공: ${dimensions.width}x${dimensions.height}px, ${format.toUpperCase()}`
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    // image-size 라이브러리 에러
    console.error('[IMAGE_VALIDATOR] 이미지 검증 실패:', error);
    throw new AppError(400, 'INVALID_IMAGE', '이미지를 처리할 수 없습니다. 유효한 이미지인지 확인해주세요.');
  }
};

/**
 * 이미지 정보 조회 (검증 없이 정보만 반환)
 *
 * @param imageBase64 - Base64 인코딩된 이미지 문자열
 * @returns 이미지 크기 및 포맷 정보
 */
export const getImageInfo = (
  imageBase64: string
): { width: number; height: number; format: string } | null => {
  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const dimensions = sizeOf(buffer);

    if (!dimensions.width || !dimensions.height || !dimensions.type) {
      return null;
    }

    return {
      width: dimensions.width,
      height: dimensions.height,
      format: dimensions.type,
    };
  } catch (error) {
    console.error('[IMAGE_VALIDATOR] getImageInfo 에러:', error);
    return null;
  }
};
