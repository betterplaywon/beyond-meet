/**
 * 통화 수신 모달
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Avatar } from '../common/Avatar';
import { useCallStore } from '../../store/callStore';
import { useAcceptMatch, useRejectMatch } from '../../hooks/useMatch';
import { colors, typography, spacing } from '../../styles/theme';

interface Props {
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<Props> = ({
  visible,
  onAccept,
  onReject,
}) => {
  const incomingCall = useCallStore((state) => state.incomingCall);
  const acceptMutation = useAcceptMatch();
  const rejectMutation = useRejectMatch();

  const [pulseAnim] = useState(new Animated.Value(1));

  // 맥박 애니메이션
  useEffect(() => {
    if (visible) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [visible, pulseAnim]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    acceptMutation.mutate(incomingCall.session.id, {
      onSuccess: () => {
        onAccept();
      },
    });
  };

  const handleReject = () => {
    rejectMutation.mutate(incomingCall.session.id, {
      onSuccess: () => {
        onReject();
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onReject}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 발신자 정보 */}
          <Animated.View
            style={[
              styles.avatarContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Avatar
              source={incomingCall.caller.profilePhotos?.[0]}
              name={incomingCall.caller.nickname}
              size="xlarge"
            />
          </Animated.View>

          <Text style={styles.name}>{incomingCall.caller.nickname}</Text>
          <Text style={styles.age}>{/* 나이 계산 */}세</Text>

          <Text style={styles.message}>영상 통화를 요청했어요</Text>

          {/* 액션 버튼 */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={rejectMutation.isPending}
            >
              <Text style={styles.actionIcon}>❌</Text>
              <Text style={styles.actionLabel}>거절</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={acceptMutation.isPending}
            >
              <Text style={styles.actionIcon}>✅</Text>
              <Text style={styles.actionLabel}>수락</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
  },
  avatarContainer: {
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  age: {
    ...typography.body1,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  message: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  actionButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    ...typography.body2,
    color: colors.white,
    fontWeight: '600',
  },
});
