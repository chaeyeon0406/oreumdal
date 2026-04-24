import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { MainStackParamList, SessionRecord, TradeOutcome } from '../../types';
import { useRecordStore } from '../../store/recordStore';
import ScaleButton from '../../components/common/ScaleButton';

type Nav = NativeStackNavigationProp<MainStackParamList>;

type Filter = 'all' | 'buy' | 'sell' | 'ok' | 'reconsider' | 'traded' | 'skipped';

const FILTER_PILLS: { value: Filter; label: string }[] = [
  { value: 'all',        label: '전체' },
  { value: 'buy',        label: '매수' },
  { value: 'sell',       label: '매도' },
  { value: 'ok',         label: '괜찮아요' },
  { value: 'reconsider', label: '다시생각해봐요' },
  { value: 'traded',     label: '매매함' },
  { value: 'skipped',    label: '참았어요' },
];

function formatDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (h < 1) return '방금 전';
  if (h < 24) return `${h}시간 전`;
  if (d === 1) return '어제';
  if (d < 7) return `${d}일 전`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 코칭 결과 — 텍스트 색상만 (배경 없음)
const VERDICT_STYLE: Record<'ok' | 'reconsider', { label: string; color: string }> = {
  ok:         { label: '괜찮아요',      color: Colors.ok },
  reconsider: { label: '다시 생각해봐요', color: Colors.reconsider },
};

// 실제 매매 여부 — 배경 + 텍스트 색상
const OUTCOME_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  traded:  { label: '매매함',   bg: '#FFF4E6', color: '#C97A3A' },
  skipped: { label: '참았어요', bg: '#EBF4FF', color: '#1A6FA8' },
  null:    { label: '미입력',   bg: '#F2F4F6', color: '#8B95A1' },
};

function OutcomeBadge({ outcome }: { outcome: TradeOutcome }) {
  const key = outcome ?? 'null';
  const cfg = OUTCOME_STYLE[key] ?? OUTCOME_STYLE['null'];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function applyFilter(records: SessionRecord[], filter: Filter): SessionRecord[] {
  switch (filter) {
    case 'buy':        return records.filter((r) => r.direction === 'buy');
    case 'sell':       return records.filter((r) => r.direction === 'sell');
    case 'ok':         return records.filter((r) => r.type === 'check' && r.verdict === 'ok');
    case 'reconsider': return records.filter((r) => r.type === 'check' && r.verdict === 'reconsider');
    case 'traded':     return records.filter((r) => r.trade_outcome === 'traded');
    case 'skipped':    return records.filter((r) => r.trade_outcome === 'skipped');
    default:           return records;
  }
}

export default function RecordsScreen() {
  const navigation = useNavigation<Nav>();
  const records = useRecordStore((s) => s.records);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    let result = applyFilter(records, activeFilter);
    if (search.trim()) {
      result = result.filter((r) => r.stock_name.includes(search.trim()));
    }
    return result;
  }, [records, activeFilter, search]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>기록</Text>
      </View>

      {/* 검색 */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="종목명 검색"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* 필터 — 가로 스크롤 한 줄 */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_PILLS.map(({ value, label }) => {
            const active = activeFilter === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setActiveFilter(value)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 목록 */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>조건에 맞는 기록이 없어요.</Text>
          </View>
        ) : (
          filtered.map((record) => (
            <ScaleButton
              key={record.id}
              style={styles.card}
              onPress={() => navigation.navigate('RecordDetail', { sessionId: record.id })}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardStock}>{record.stock_name}</Text>
                  <Text style={styles.cardMeta}>
                    {record.direction === 'buy' ? '매수' : '매도'} · {formatDate(record.created_at)}
                    {record.type === 'post' ? ' · 직접 기록' : ''}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  {record.verdict && (
                    <Text style={[
                      styles.verdictText,
                      { color: VERDICT_STYLE[record.verdict].color },
                    ]}>
                      {VERDICT_STYLE[record.verdict].label}
                    </Text>
                  )}
                  {record.impulse_score !== undefined && (
                    <Text style={styles.scoreText}>충동도 {record.impulse_score}%</Text>
                  )}
                  <OutcomeBadge outcome={record.trade_outcome} />
                </View>
              </View>
              {record.memo ? (
                <Text style={styles.cardMemo} numberOfLines={1}>{record.memo}</Text>
              ) : null}
            </ScaleButton>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '600', color: Colors.textPrimary },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: Colors.surface, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary,
    borderWidth: 0.5, borderColor: Colors.border,
  },

  // 가로 스크롤 필터
  filterWrap: { height: 40, marginBottom: 8 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.cta,
    borderColor: Colors.cta,
  },
  pillText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: '#FFF' },

  // 목록
  list: { paddingHorizontal: 16, gap: 10 },
  emptyWrap: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 0.5, borderColor: Colors.border, gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { gap: 3, flex: 1, marginRight: 12 },
  cardStock: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  cardMeta: { fontSize: 13, color: Colors.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  verdictText: { fontSize: 13, fontWeight: '500' },
  scoreText: { fontSize: 12, color: Colors.textMuted },
  cardMemo: { fontSize: 13, color: Colors.textSecondary, lineHeight: 13 * 1.5 },

  badge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
