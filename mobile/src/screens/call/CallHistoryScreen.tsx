/**
 * 통화 기록 화면
 * UI_FLOW.md 3.16 참고
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../@types';
import { Avatar } from '../../components/common/Avatar';
import { colors, typography, spacing } from '../../styles/theme';

type CallHistoryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CallHistory'
>;

interface Props {
  navigation: CallHistoryScreenNavigationProp;
}

interface CallHistory {
  id: string;
  user: {
    id: string;
    nickname: string;
    profilePhotos: string[];
  };
  duration: number | null; // null이면 부재중
  createdAt: string;
  type: 'COMPLETED' | 'MISSED';
}

const CallHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);

  // TODO: 실제 API 연동
  const callHistory: CallHistory[] = [];

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: API 호출
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '부재중';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const groupByDate = (history: CallHistory[]) => {
    const grouped: { [key: string]: CallHistory[] } = {};

    history.forEach((item) => {
      const date = new Date(item.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;
      if (date.toDateString() === today.toDateString()) {
        dateKey = '오늘';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = '어제';
      } else {
        dateKey = `${date.getMonth() + 1}월 ${date.getDate()}일`;
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });

    return Object.entries(grouped);
  };

  const renderCallHistoryItem = (item: CallHistory) => {
    const isMissed = item.type === 'MISSED';

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.historyCard}
        onPress={() => {
          // 프로필 상세로 이동하거나 통화 재시도
        }}
        activeOpacity={0.7}
      >
        <Avatar
          source={item.user.profilePhotos[0]}
          name={item.user.nickname}
          size="medium"
        />

        <View style={styles.historyInfo}>
          <Text style={styles.historyName}>{item.user.nickname}</Text>
          <Text style={[styles.historyDuration, isMissed && styles.missedText]}>
            {formatDuration(item.duration)}
          </Text>
          <Text style={styles.historyTime}>{formatTime(item.createdAt)}</Text>
        </View>

        <Text style={styles.historyIcon}>{isMissed ? '⊗' : '📞'}</Text>
      </TouchableOpacity>
    );
  };

  const renderSection = ({ item }: { item: [string, CallHistory[]] }) => {
    const [dateLabel, items] = item;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{dateLabel}</Text>
        {items.map((historyItem) => renderCallHistoryItem(historyItem))}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📞</Text>
      <Text style={styles.emptyTitle}>통화 기록이 없어요</Text>
      <Text style={styles.emptyDescription}>
        새로운 사람과 영상 통화를 시작해보세요
      </Text>
    </View>
  );

  const groupedHistory = groupByDate(callHistory);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>통화 기록</Text>
        <View style={styles.placeholder} />
      </View>

      {/* List */}
      <FlatList
        data={groupedHistory}
        keyExtractor={(item) => item[0]}
        renderItem={renderSection}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          groupedHistory.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  historyName: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  historyDuration: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  missedText: {
    color: colors.error,
  },
  historyTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  historyIcon: {
    fontSize: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default CallHistoryScreen;
