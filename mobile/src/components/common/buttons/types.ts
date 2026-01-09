/**
 * 공유 버튼 타입 정의
 */

import { TouchableOpacityProps } from 'react-native';

export interface BaseButtonProps extends TouchableOpacityProps {
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
export type IconButtonState = 'default' | 'active' | 'danger' | 'warning';
export type ModalButtonVariant = 'confirm' | 'cancel' | 'delete';
export type ModalButtonLayout = 'circular' | 'rectangular';
