/**
 * 공유 버튼 스타일 유틸리티
 * 사이즈 축소 상수 및 공통 스타일 함수 정의
 */

import { ViewStyle } from 'react-native';

// 사이즈 축소 상수 (10-20% 축소)
export const REDUCED_PADDING = {
  small: 8,      // 원래 10-12px에서 축소
  medium: 12,    // 원래 14-16px에서 -25% 축소
  large: 14,     // 원래 16px에서 -12% 축소
};

export const REDUCED_FONT_SIZE = {
  small: 14,     // 원래 16px에서 -12% 축소
  medium: 16,    // 원래 18px에서 -11% 축소
  large: 18,     // 가독성 유지를 위해 유지
};

export const ICON_BUTTON_SIZES = {
  small: 48,     // 접근성 최소값 (44px) 유지하며 20% 축소
  medium: 60,    // 통화 컨트롤 - 변경 없음
  large: 80,     // 모달 원형 버튼 - 100px에서 -20% 축소
};

// iOS/Android 접근성 최소 터치 영역
export const MIN_TOUCH_TARGET = 44;

// Disabled 상태 스타일 헬퍼 함수
export const getDisabledStyle = (disabled?: boolean): ViewStyle => ({
  opacity: disabled ? 0.6 : 1,
});
