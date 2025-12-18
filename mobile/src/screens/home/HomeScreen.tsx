/**
 * 홈 화면
 * Figma: Cupid Arrow - Home Screen 디자인 적용
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSocket } from '../../hooks/useSocket';
import { useMyProfile } from '../../hooks/useProfile';
import { useFriends } from '../../hooks/useFriends';
import { RootStackParamList } from '../../@types';
import { colors, typography, spacing } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { data: user } = useMyProfile();
  const { data: friends = [] } = useFriends(user?.id);
  const socket = useSocket();

  const handleRandomMatch = () => {
    // Socket 연결 상태 확인
    if (!socket.isConnected()) {
      Toast.show({
        type: 'error',
        text1: '연결 오류',
        text2: '서버와 연결되지 않았습니다. 다시 시도해주세요.',
      });
      return;
    }

    // Socket으로 매칭 요청
    socket.emit('match:request', { type: 'RANDOM' });

    // 매칭 대기 화면으로 이동
    navigation.navigate('Matching');
  };

  // 하트 아이콘
  const HeartIcon = () => (
    <Icon name="favorite" size={60} color={colors.primary} />
  );

  // 비디오 아이콘
  const VideoIcon = () => (
    <Icon name="videocam" size={24} color={colors.primary} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 하단 blur 배경 효과 */}
      <View style={styles.blurBackground}>
        <View style={styles.blurCircle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Icon name="favorite" size={32} color={colors.primary} />
          <Text style={styles.headerTitle}>Beyond Meet</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {user?.nickname}님, 환영합니다!
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.matchCard}>
          <HeartIcon />
          <Text style={styles.matchTitle}>새로운 인연을{'\n'}만나보세요</Text>
          <Text style={styles.matchDescription}>
            랜덤 매칭을 통해 새로운 사람과{'\n'}영상 통화를 시작해보세요
          </Text>

          {/* 랜덤 매칭 버튼 (Pill + 아이콘) */}
          <TouchableOpacity
            style={styles.matchButton}
            activeOpacity={0.8}
            onPress={handleRandomMatch}
          >
            <View style={styles.buttonIconCircle}>
              <VideoIcon />
            </View>
            <Text style={styles.matchButtonText}>랜덤 매칭 시작</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>오늘의 통화</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{friends.length}</Text>
          <Text style={styles.statLabel}>친구</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0분</Text>
          <Text style={styles.statLabel}>총 통화 시간</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  blurBackground: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.15,
    right: -width * 0.15,
    height: height * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurCircle: {
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: width * 0.65,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  headerSubtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    marginLeft: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  matchCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  matchTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    lineHeight: 32,
  },
  matchDescription: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  matchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    paddingLeft: 8,
    width: '100%',
    justifyContent: 'center',
  },
  buttonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 8,
  },
  matchButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.textTertiary + '30',
  },
});

export default HomeScreen;
