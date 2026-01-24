/**
 * 통화 수신 모달
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../common/Avatar';
import { ModalButton } from '../common';
import { useCallStore } from '../../store/callStore';
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
  const { t } = useTranslation();
  const incomingCall = useCallStore((state) => state.incomingCall);

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
          <Text style={styles.age}>{t('call.age')}</Text>

          <Text style={styles.message}>{t('call.incoming')}</Text>

          {/* 액션 버튼 */}
          <View style={styles.actionsContainer}>
            <ModalButton
              title={t('call.reject')}
              variant="delete"
              layout="circular"
              icon={<Icon name="call-end" size={40} color={colors.white} />}
              onPress={onReject}
            />

            <ModalButton
              title={t('call.accept')}
              variant="confirm"
              layout="circular"
              icon={<Icon name="call" size={40} color={colors.white} />}
              onPress={onAccept}
            />
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
});
