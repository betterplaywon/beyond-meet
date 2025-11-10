/**
 * 푸시 알림 권한 요청 모달
 *
 * 사용자에게 푸시 알림의 필요성을 설명하고 권한을 요청합니다.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Button } from './Button';
import { colors, typography, spacing } from '../../styles/theme';

interface NotificationPermissionModalProps {
  visible: boolean;
  onRequestPermission: () => void;
  onDismiss: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  visible,
  onRequestPermission,
  onDismiss,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 아이콘 */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔔</Text>
          </View>

          {/* 제목 */}
          <Text style={styles.title}>알림 허용</Text>

          {/* 설명 */}
          <Text style={styles.description}>
            새로운 매칭과 통화 요청을 실시간으로 받아보세요
          </Text>

          {/* 혜택 리스트 */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✨</Text>
              <Text style={styles.benefitText}>새로운 매칭 알림</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📞</Text>
              <Text style={styles.benefitText}>친구의 통화 요청</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>💬</Text>
              <Text style={styles.benefitText}>중요한 안내 메시지</Text>
            </View>
          </View>

          {/* 버튼 */}
          <Button
            title="알림 허용하기"
            variant="primary"
            fullWidth
            onPress={onRequestPermission}
            style={styles.allowButton}
          />

          <TouchableOpacity onPress={onDismiss} style={styles.skipButton}>
            <Text style={styles.skipText}>나중에 하기</Text>
          </TouchableOpacity>

          {/* iOS 설정 안내 */}
          {Platform.OS === 'ios' && (
            <Text style={styles.iosHint}>
              설정 {'>'} Beyond Meet {'>'} 알림에서 언제든 변경 가능합니다
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  benefitText: {
    ...typography.body2,
    color: colors.textPrimary,
  },
  allowButton: {
    marginBottom: spacing.md,
  },
  skipButton: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  iosHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
