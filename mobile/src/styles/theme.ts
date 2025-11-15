/**
 * 디자인 시스템 테마 설정
 * UI_FLOW.md에 정의된 컬러 팔레트와 타이포그래피 적용
 */

export const colors = {
  // Primary Colors
  primary: '#FF6B6B',
  primaryLight: '#FF9999',
  secondary: '#4ECDC4',
  accent: '#FFE66D',

  // Background
  background: '#F7F7F7',
  surface: '#FFFFFF',

  // Text
  textPrimary: '#2D3436',
  textSecondary: '#636E72',
  textTertiary: '#95A5A6',

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
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 38,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 29,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 24,
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
