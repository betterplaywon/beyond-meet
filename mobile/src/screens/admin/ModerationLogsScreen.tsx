/**
 * 모니터링 로그 화면 (어드민)
 */

import React, { useState, useEffect } from 'react';
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
import { getModerationLogs, ModerationLog } from '../../services/adminApi';
import { parseApiError } from '../../services/api';

const ModerationLogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const fetchLogs = async (pageNum: number, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getModerationLogs({
        page: pageNum,
        limit: 20,
        actionTaken: filter,
      });

      if (refresh || pageNum === 1) {
        setLogs(data.logs);
      } else {
        setLogs((prev) => [...prev, ...data.logs]);
      }

      setTotal(data.pagination.total);
      setPage(pageNum);
    } catch (error) {
      Alert.alert('오류', parseApiError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filter]);

  const onRefresh = () => {
    fetchLogs(1, true);
  };

  const loadMore = () => {
    if (!loading && logs.length < total) {
      fetchLogs(page + 1);
    }
  };

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator style={styles.loader} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>로그가 없습니다</Text>
            </View>
          ) : null
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
