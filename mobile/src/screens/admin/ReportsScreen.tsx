/**
 * 신고 내역 화면 (어드민)
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
import { Report } from '../../services/adminApi';
import { useReports } from '../../hooks/useAdmin';
import { parseApiError } from '../../utils/errorHandler';

const ReportsScreen: React.FC = () => {
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
  } = useReports(filter);

  // 에러 발생 시 Alert 표시
  useEffect(() => {
    if (error) {
      Alert.alert('오류', parseApiError(error));
    }
  }, [error]);

  // 모든 페이지의 reports를 flat하게 합침
  const reports = data?.pages.flatMap((page) => page.reports) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return colors.success;
      case 'REVIEWING':
        return colors.warning;
      case 'DISMISSED':
        return colors.textSecondary;
      case 'PENDING':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '대기 중';
      case 'REVIEWING':
        return '검토 중';
      case 'RESOLVED':
        return '해결됨';
      case 'DISMISSED':
        return '기각됨';
      default:
        return status;
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
          filter === 'PENDING' && styles.filterButtonActive,
        ]}
        onPress={() => setFilter('PENDING')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'PENDING' && styles.filterTextActive,
          ]}
        >
          대기
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'REVIEWING' && styles.filterButtonActive,
        ]}
        onPress={() => setFilter('REVIEWING')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'REVIEWING' && styles.filterTextActive,
          ]}
        >
          검토
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'RESOLVED' && styles.filterButtonActive,
        ]}
        onPress={() => setFilter('RESOLVED')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'RESOLVED' && styles.filterTextActive,
          ]}
        >
          해결
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: Report }) => {
    const date = new Date(item.createdAt);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(
      date.getHours()
    ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    return (
      <View style={styles.reportItem}>
        <View style={styles.reportHeader}>
          <View style={styles.reportUsers}>
            <Text style={styles.reporterText}>
              신고자: {item.reporter.nickname || item.reporter.email}
            </Text>
            <Text style={styles.reportedText}>
              피신고자: {item.reportedUser.nickname || item.reportedUser.email}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text style={{ color: getStatusColor(item.status) }}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.reportDetails}>
          <Text style={styles.reasonText}>사유: {item.reason}</Text>
          {item.description && (
            <Text style={styles.descriptionText}>{item.description}</Text>
          )}
          <View style={styles.reportMeta}>
            <Text style={styles.metaText}>
              {item.isAiGenerated ? 'AI 자동 신고' : '수동 신고'}
            </Text>
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>
        </View>
      </View>
    );
  };

  const isInitialLoading = isLoading && !isRefetching;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>신고 내역</Text>
        <Text style={styles.headerSubtitle}>총 {total}개</Text>
      </View>

      {renderFilter()}

      <FlatList
        data={reports}
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
              <Text style={styles.emptyText}>신고 내역이 없습니다</Text>
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
  reportItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportUsers: {
    flex: 1,
    gap: 4,
  },
  reporterText: {
    fontSize: 14,
    color: colors.text,
  },
  reportedText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  reportDetails: {
    gap: 8,
  },
  reasonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  reportMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
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

export default ReportsScreen;
