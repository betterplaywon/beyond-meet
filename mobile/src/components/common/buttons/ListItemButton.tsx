/**
 * 리스트 아이템 버튼 컴포넌트
 * 프로필 메뉴, 설정 화면 등 리스트형 네비게이션 아이템에 사용
 */

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, typography, spacing } from '../../../styles/theme';
import { BaseButtonProps } from './types';
import { REDUCED_PADDING, MIN_TOUCH_TARGET, getDisabledStyle } from './styles';

interface ListItemButtonProps extends BaseButtonProps {
  label: string;
  leftIcon?: React.ReactNode;
  rightValue?: string;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  backgroundColor?: string;
}

export const ListItemButton: React.FC<ListItemButtonProps> = ({
  label,
  leftIcon,
  rightValue,
  rightElement,
  showChevron = false,
  backgroundColor = colors.white,
  disabled,
  style,
  ...props
}) => {
  const buttonStyle = [
    styles.container,
    { backgroundColor },
    getDisabledStyle(disabled),
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      <Text style={styles.label}>{label}</Text>
      {rightValue && <Text style={styles.rightValue}>{rightValue}</Text>}
      {rightElement && rightElement}
      {showChevron && (
        <Icon name="chevron-right" size={24} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: REDUCED_PADDING.medium,
    borderRadius: 8,
    minHeight: MIN_TOUCH_TARGET,
  },
  leftIcon: {
    marginRight: spacing.md,
  },
  label: {
    ...typography.body1,
    color: colors.textPrimary,
    flex: 1,
  },
  rightValue: {
    ...typography.body1,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
});
