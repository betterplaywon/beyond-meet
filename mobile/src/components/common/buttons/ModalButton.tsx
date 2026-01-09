/**
 * 모달 액션 버튼 컴포넌트
 * 모달 확인/취소/삭제 버튼, 수신 전화 수락/거절 버튼 등에 사용
 * Circular(원형)과 Rectangular(직사각형) 두 가지 레이아웃 지원
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing } from '../../../styles/theme';
import { BaseButtonProps, ModalButtonVariant, ModalButtonLayout } from './types';
import {
  REDUCED_PADDING,
  REDUCED_FONT_SIZE,
  ICON_BUTTON_SIZES,
  MIN_TOUCH_TARGET,
  getDisabledStyle,
} from './styles';

interface ModalButtonProps extends BaseButtonProps {
  title: string;
  variant?: ModalButtonVariant;
  layout?: ModalButtonLayout;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const ModalButton: React.FC<ModalButtonProps> = ({
  title,
  variant = 'confirm',
  layout = 'rectangular',
  icon,
  fullWidth = false,
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const getVariantBackground = () => {
    switch (variant) {
      case 'confirm':
        return colors.primary;
      case 'cancel':
        return colors.background;
      case 'delete':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getVariantTextColor = () => {
    return variant === 'cancel' ? colors.textSecondary : colors.white;
  };

  const getLoadingColor = () => {
    return variant === 'cancel' ? colors.textSecondary : colors.white;
  };

  // Circular layout (for IncomingCallModal)
  if (layout === 'circular') {
    const circularSize = ICON_BUTTON_SIZES.large; // 80px
    return (
      <TouchableOpacity
        style={[
          styles.circularButton,
          {
            width: circularSize,
            height: circularSize,
            borderRadius: circularSize / 2,
            backgroundColor: getVariantBackground(),
          },
          getDisabledStyle(disabled || loading),
          style,
        ]}
        disabled={disabled || loading}
        activeOpacity={0.7}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            {icon && <View style={styles.circularIcon}>{icon}</View>}
            <Text style={[styles.circularText, { color: colors.white }]}>
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Rectangular layout (for modal confirm/cancel buttons)
  return (
    <TouchableOpacity
      style={[
        styles.rectangularButton,
        { backgroundColor: getVariantBackground() },
        fullWidth && styles.fullWidth,
        getDisabledStyle(disabled || loading),
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getLoadingColor()} />
      ) : (
        <Text style={[styles.rectangularText, { color: getVariantTextColor() }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Circular layout
  circularButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  circularIcon: {
    marginBottom: spacing.xs,
  },
  circularText: {
    ...typography.body2,
    fontWeight: '600',
  },

  // Rectangular layout
  rectangularButton: {
    paddingVertical: REDUCED_PADDING.medium,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  rectangularText: {
    ...typography.body1,
    fontSize: REDUCED_FONT_SIZE.medium,
    fontWeight: '600',
  },
  fullWidth: {
    flex: 1,
  },
});
