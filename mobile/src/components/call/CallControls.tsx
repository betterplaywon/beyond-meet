/**
 * 통화 컨트롤 컴포넌트
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../styles/theme';

interface Props {
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
}

export const CallControls: React.FC<Props> = ({
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onEndCall,
}) => {
  return (
    <View style={styles.container}>
      {/* 마이크 */}
      <TouchableOpacity
        style={[styles.button, isMuted && styles.buttonActive]}
        onPress={onToggleMute}
      >
        <Text style={styles.icon}>{isMuted ? '🔇' : '🎤'}</Text>
      </TouchableOpacity>

      {/* 비디오 */}
      <TouchableOpacity
        style={[styles.button, isVideoOff && styles.buttonActive]}
        onPress={onToggleVideo}
      >
        <Text style={styles.icon}>{isVideoOff ? '📹' : '📷'}</Text>
      </TouchableOpacity>

      {/* 카메라 전환 */}
      <TouchableOpacity style={styles.button} onPress={onSwitchCamera}>
        <Text style={styles.icon}>🔄</Text>
      </TouchableOpacity>

      {/* 통화 종료 */}
      <TouchableOpacity style={styles.endButton} onPress={onEndCall}>
        <Text style={styles.icon}>❌</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    gap: spacing.md,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: colors.error + '80',
  },
  endButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
  },
});
