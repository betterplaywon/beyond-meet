/**
 * 통화 컨트롤 컴포넌트
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton } from '../common';
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
      <IconButton
        icon={<Icon name={isMuted ? 'mic-off' : 'mic'} size={28} color={colors.white} />}
        size="medium"
        state={isMuted ? 'active' : 'default'}
        onPress={onToggleMute}
      />

      {/* 비디오 */}
      <IconButton
        icon={<Icon name={isVideoOff ? 'videocam-off' : 'videocam'} size={28} color={colors.white} />}
        size="medium"
        state={isVideoOff ? 'active' : 'default'}
        onPress={onToggleVideo}
      />

      {/* 카메라 전환 */}
      <IconButton
        icon={<Icon name="flip-camera-ios" size={28} color={colors.white} />}
        size="medium"
        state="default"
        onPress={onSwitchCamera}
      />

      {/* 신고 버튼 */}
      {onReport && (
        <IconButton
          icon={<Icon name="flag" size={28} color={colors.white} />}
          size="medium"
          state="warning"
          onPress={onReport}
        />
      )}

      {/* 통화 종료 */}
      <IconButton
        icon={<Icon name="call-end" size={28} color={colors.white} />}
        size="medium"
        state="danger"
        onPress={onEndCall}
      />
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
});
