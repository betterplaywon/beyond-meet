/**
 * 모니터링 로그 화면 (어드민)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/theme';
import { ModerationLog } from '../../services/adminApi';
import { useModerationLogs } from '../../hooks/useAdmin';
import { parseApiError } from '../../utils/errorHandler';

const ModerationLogsScreen: React.FC = () => {
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const {
    data,
    isLoading,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    error,
  } = useModerationLogs(filter);

  // 에러 발생 시 Alert 표시
  useEffect(() => {
    if (error) {
      Alert.alert('오류', parseApiError(error));
    }
  }, [error]);

  // 모든 페이지의 logs를 flat하게 합침
  const logs = data?.pages.flatMap((page) => page.logs) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CALL_ENDED':
        return colors.error;
      case 'WARNING_ISSUED':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'CALL_ENDED':
        return '통화 강제 종료';
      case 'WARNING_ISSUED':
        return '경고 발송';
      case 'NONE':
        return '조치 없음';
      default:
        return action;
    }
  };

  const renderFilter = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, !filter && styles.filterButtonActive]}
        onPress={() => setFilter(undefined)}
      >
        <Text style={[styles.filterText, !filter && styles.filterTextActive]}>
          전체
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'WARNING_ISSUED' && styles.filterButtonActive,
        ]}
        onPress={() => setFilter('WARNING_ISSUED')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'WARNING_ISSUED' && styles.filterTextActive,
          ]}
        >
          경고
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'CALL_ENDED' && styles.filterButtonActive,
        ]}
        onPress={() => setFilter('CALL_ENDED')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'CALL_ENDED' && styles.filterTextActive,
          ]}
        >
          강제종료
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: ModerationLog }) => {
    const date = new Date(item.detectedAt);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(
      date.getHours()
    ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    return (
      <View style={styles.logItem}>
        <View style={styles.logHeader}>
          <Text style={styles.userName}>
            {item.user.nickname || item.user.email}
          </Text>
          <Text
            style={[
              styles.actionBadge,
              { backgroundColor: getActionColor(item.actionTaken) + '20' },
            ]}
          >
            <Text style={{ color: getActionColor(item.actionTaken) }}>
              {getActionText(item.actionTaken)}
            </Text>
          </Text>
        </View>

        <View style={styles.logDetails}>
          <Text style={styles.detailText}>
            신뢰도: {(item.confidence * 100).toFixed(1)}%
          </Text>
          <Text style={styles.detailText}>세션: {item.session.channelName}</Text>
        </View>

        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>
    );
  };

  const isInitialLoading = isLoading && !isRefetching;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>모니터링 로그</Text>
        <Text style={styles.headerSubtitle}>총 {total}개</Text>
      </View>

      {renderFilter()}

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.loader} />
          ) : null
        }
        ListEmptyComponent={
          !isInitialLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>로그가 없습니다</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" />
            </View>
          )
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.white,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: 16,
  },
  logItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  actionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  loader: {
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default ModerationLogsScreen;
