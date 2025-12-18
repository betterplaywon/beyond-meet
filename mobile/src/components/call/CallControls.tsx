/**
 * 통화 컨트롤 컴포넌트
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
  onReport?: () => void;
}

export const CallControls: React.FC<Props> = ({
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onEndCall,
  onReport,
}) => {
  return (
    <View style={styles.container}>
      {/* 마이크 */}
      <TouchableOpacity
        style={[styles.button, isMuted && styles.buttonActive]}
        onPress={onToggleMute}
      >
        <Icon name={isMuted ? 'mic-off' : 'mic'} size={28} color={colors.white} />
      </TouchableOpacity>

      {/* 비디오 */}
      <TouchableOpacity
        style={[styles.button, isVideoOff && styles.buttonActive]}
        onPress={onToggleVideo}
      >
        <Icon name={isVideoOff ? 'videocam-off' : 'videocam'} size={28} color={colors.white} />
      </TouchableOpacity>

      {/* 카메라 전환 */}
      <TouchableOpacity style={styles.button} onPress={onSwitchCamera}>
        <Icon name="flip-camera-ios" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* 신고 버튼 */}
      {onReport && (
        <TouchableOpacity style={styles.reportButton} onPress={onReport}>
          <Icon name="flag" size={28} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* 통화 종료 */}
      <TouchableOpacity style={styles.endButton} onPress={onEndCall}>
        <Icon name="call-end" size={28} color={colors.white} />
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
  reportButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
