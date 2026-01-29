/**
 * 원형 아이콘 버튼 컴포넌트
 * 통화 컨트롤(음소거, 비디오, 종료) 등 아이콘 전용 버튼에 사용
 */

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/theme';
import { BaseButtonProps, ButtonSize, IconButtonState } from './types';
import { ICON_BUTTON_SIZES, getDisabledStyle } from './styles';

interface IconButtonProps extends BaseButtonProps {
  icon: React.ReactNode;
  size?: ButtonSize;
  state?: IconButtonState;
  backgroundColor?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'medium',
  state = 'default',
  backgroundColor,
  disabled,
  style,
  ...props
}) => {
  const sizeValue = ICON_BUTTON_SIZES[size];
  const borderRadius = sizeValue / 2;

  const getStateBackground = () => {
    if (backgroundColor) return backgroundColor;
    switch (state) {
      case 'active':
        return colors.error + '80'; // 80% opacity
      case 'danger':
        return colors.error;
      case 'warning':
        return '#FF9800'; // Orange for warning/report
      case 'default':
      default:
        return colors.white + '30'; // 30% opacity
    }
  };

  const buttonStyle = [
    {
      width: sizeValue,
      height: sizeValue,
      borderRadius,
      backgroundColor: getStateBackground(),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
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
      {icon}
    </TouchableOpacity>
  );
};
