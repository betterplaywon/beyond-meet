/**
 * 통화 타이머 컴포넌트 (순수 표시 컴포넌트)
 *
 * 타이머 로직은 부모 컴포넌트에서 관리하고,
 * 이 컴포넌트는 전달받은 시간을 표시만 합니다.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../styles/theme';

interface Props {
  elapsed: number; // 경과 시간 (초)
  maxDuration: number; // 최대 시간 (초)
}

export const CallTimer: React.FC<Props> = ({ elapsed, maxDuration }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remaining = maxDuration - elapsed;
  const isWarning = remaining <= 60; // 1분 이하

  return (
    <View style={[styles.container, isWarning && styles.containerWarning]}>
      <Text style={[styles.text, isWarning && styles.textWarning]}>
        ⏱ {formatTime(elapsed)} / {formatTime(maxDuration)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  containerWarning: {
    backgroundColor: colors.error + '80',
  },
  text: {
    ...typography.body2,
    color: colors.white,
    fontWeight: '600',
  },
  textWarning: {
    color: colors.white,
  },
});
