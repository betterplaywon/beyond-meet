/**
 * 디자인 시스템 테마 설정
 * UI_FLOW.md에 정의된 컬러 팔레트와 타이포그래피 적용
 */

export const colors = {
  // Primary Colors (Figma: Simple Login design)
  primary: '#FF8383',
  primaryLight: '#FFCCCC',
  secondary: '#4ECDC4',
  accent: '#FFE66D',

  // Background (Figma: 연한 핑크 배경)
  background: '#FFFCFC',
  surface: '#FFFFFF',

  // Text (Figma: 다크 그레이 계열)
  text: '#424242',
  textPrimary: '#424242',
  textSecondary: '#616161',
  textTertiary: '#9E9E9E',

  // Status
  success: '#00B894',
  error: '#FF7675',
  warning: '#FDCB6E',

  // Online Status
  online: '#00D9A3',
  offline: '#B2BEC3',

  // Utility
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
  border: '#E0E0E0',

  // Shadows
  shadowColor: '#000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  small: 4,
  medium: 8,
  large: 16,
  circle: 9999,
};

export const typography = {
  // 기존 variants - 값 수정 (더 많은 케이스 커버)
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 38,
  },
  h2: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  body1: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 21,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 17,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 19,
  },

  // Display variants (대형 타이틀 - Splash 등)
  display1: {
    fontSize: 80,
    fontWeight: 'bold' as const,
    lineHeight: 96,
  },
  display2: {
    fontSize: 60,
    fontWeight: 'bold' as const,
    lineHeight: 72,
  },
  display3: {
    fontSize: 40,
    fontWeight: 'bold' as const,
    lineHeight: 48,
  },
  display4: {
    fontSize: 36,
    fontWeight: 'bold' as const,
    lineHeight: 43,
  },

  // Heading variants
  h4: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 29,
  },
  h5: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  h6: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 22,
  },

  // Body variants (강조)
  body1Medium: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body2Medium: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 21,
  },
  body3: {
    fontSize: 13,
    fontWeight: 'normal' as const,
    lineHeight: 19,
  },
  body3Medium: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 19,
  },

  // Caption variants
  captionMedium: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 17,
  },
  captionSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  microText: {
    fontSize: 10,
    fontWeight: 'normal' as const,
    lineHeight: 14,
  },

  // 특수 목적 variants
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 17,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  input: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 24,
  },
  statLarge: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  statMedium: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 19,
  },
  adminLabel: {
    fontSize: 13,
    fontWeight: 'normal' as const,
    lineHeight: 18,
  },
  adminValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  textLight: {
    fontSize: 14,
    fontWeight: '300' as const,
    lineHeight: 20,
  },
};

export const shadows = {
  small: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};

export type Theme = typeof theme;
