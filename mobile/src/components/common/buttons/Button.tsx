/**
 * 주요 액션 버튼 컴포넌트
 * 로그인, 회원가입, 매칭 시작 등 주요 CTA 버튼에 사용
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { colors, typography, spacing } from '../../../styles/theme';
import { BaseButtonProps, ButtonSize, ButtonVariant } from './types';
import {
  REDUCED_PADDING,
  REDUCED_FONT_SIZE,
  MIN_TOUCH_TARGET,
  getDisabledStyle,
} from './styles';

interface ButtonProps extends BaseButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  borderRadius?: 'pill' | 'rounded';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  borderRadius = 'rounded',
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primary;
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
      case 'text':
        return styles.text;
      case 'danger':
        return styles.danger;
      default:
        return styles.primary;
    }
  };

  const getTextVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'text':
        return styles.textText;
      case 'danger':
        return styles.dangerText;
      default:
        return styles.primaryText;
    }
  };

  const buttonStyle = [
    styles.base,
    getVariantStyle(),
    styles[`${size}Size`],
    borderRadius === 'pill' ? styles.pill : styles.rounded,
    fullWidth && styles.fullWidth,
    getDisabledStyle(disabled || loading),
    { minHeight: MIN_TOUCH_TARGET },
    style,
  ];

  const textStyle = [
    styles.textBase,
    getTextVariantStyle(),
    styles[`${size}Text`],
  ];

  const getLoadingColor = () => {
    if (variant === 'primary' || variant === 'secondary' || variant === 'danger') {
      return colors.white;
    }
    return colors.primary;
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getLoadingColor()} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={textStyle}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },

  // Border Radius
  pill: {
    borderRadius: 50,
  },
  rounded: {
    borderRadius: 8,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  text: {
    backgroundColor: colors.transparent,
  },
  danger: {
    backgroundColor: colors.error,
  },

  // Sizes
  smallSize: {
    paddingVertical: REDUCED_PADDING.small,
  },
  mediumSize: {
    paddingVertical: REDUCED_PADDING.medium,
  },
  largeSize: {
    paddingVertical: REDUCED_PADDING.large,
  },

  // Text Base
  textBase: {
    ...typography.button,
  },

  // Text Variants
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.primary,
  },
  textText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.white,
  },

  // Text Sizes
  smallText: {
    fontSize: REDUCED_FONT_SIZE.small,
  },
  mediumText: {
    fontSize: REDUCED_FONT_SIZE.medium,
  },
  largeText: {
    fontSize: REDUCED_FONT_SIZE.large,
  },
});
