/**
 * 통화 타이머 컴포넌트
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../styles/theme';

interface Props {
  maxDuration?: number; // 초 단위 (기본: 300초 = 5분)
  onTimeUp?: () => void;
  onElapsedChange?: (elapsed: number) => void;
}

export const CallTimer: React.FC<Props> = ({
  maxDuration = 300,
  onTimeUp,
  onElapsedChange,
}) => {
  const [elapsed, setElapsed] = useState(0);
  // 콜백을 ref에 저장하여 의존성 배열에서 제거 (무한 루프 방지)
  const onTimeUpRef = useRef(onTimeUp);
  const onElapsedChangeRef = useRef(onElapsedChange);

  // 콜백이 변경되면 ref 업데이트
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    onElapsedChangeRef.current = onElapsedChange;
  }, [onElapsedChange]);

  // elapsed 변경 시 콜백 호출 (렌더링 후 실행되어 setState-in-render 문제 방지)
  useEffect(() => {
    onElapsedChangeRef.current?.(elapsed);
  }, [elapsed]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;

        // 시간 초과
        if (next >= maxDuration) {
          clearInterval(interval);
          onTimeUpRef.current?.();
          return maxDuration;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [maxDuration]);

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
