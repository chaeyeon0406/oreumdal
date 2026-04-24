import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { OutcomeStats } from '../../lib/reportUtils';

interface Props {
  stats: OutcomeStats;
  insight: string | null;
  loading: boolean;
}

function ImpulseBar({ value }: { value: number }) {
  const color = value >= 50 ? Colors.reconsider : Colors.ok;
  return (
    <View style={styles.barWrap}>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${value}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barLabel, { color }]}>{value}%</Text>
    </View>
  );
}

export default function OutcomeComparisonCard({ stats, insight, loading }: Props) {
  const { skippedCount, tradedCount, skippedAvgImpulse, tradedAvgImpulse } = stats;
  const total = skippedCount + tradedCount;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>참았을 때 vs 했을 때</Text>

      {total === 0 ? (
        <Text style={styles.empty}>실제 매매 여부를 기록하면 여기서 비교해드려요.</Text>
      ) : (
        <>
          {/* 테이블 헤더 */}
          <View style={styles.tableRow}>
            <View style={styles.colLabel} />
            <View style={styles.colItem}>
              <Text style={[styles.colHeader, { color: Colors.ok }]}>참았어요</Text>
            </View>
            <View style={styles.colItem}>
              <Text style={[styles.colHeader, { color: Colors.reconsider }]}>했어요</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 횟수 행 */}
          <View style={styles.tableRow}>
            <View style={styles.colLabel}>
              <Text style={styles.rowLabel}>횟수</Text>
            </View>
            <View style={styles.colItem}>
              <Text style={styles.cellValue}>{skippedCount}번</Text>
            </View>
            <View style={styles.colItem}>
              <Text style={styles.cellValue}>{tradedCount}번</Text>
            </View>
          </View>

          {/* 평균 충동도 행 */}
          <View style={styles.tableRow}>
            <View style={styles.colLabel}>
              <Text style={styles.rowLabel}>평균 충동도</Text>
            </View>
            <View style={styles.colItem}>
              {skippedCount > 0
                ? <ImpulseBar value={skippedAvgImpulse} />
                : <Text style={styles.naText}>-</Text>}
            </View>
            <View style={styles.colItem}>
              {tradedCount > 0
                ? <ImpulseBar value={tradedAvgImpulse} />
                : <Text style={styles.naText}>-</Text>}
            </View>
          </View>

          <View style={styles.divider} />

          {/* AI 인사이트 */}
          <View style={styles.insightWrap}>
            {loading ? (
              <Text style={styles.insightLoading}>분석 중...</Text>
            ) : insight ? (
              <Text style={styles.insightText}>{insight}</Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: Colors.border, gap: 12,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  empty: { fontSize: 14, color: Colors.textMuted, lineHeight: 14 * 1.6 },

  tableRow: { flexDirection: 'row', alignItems: 'center' },
  colLabel: { width: 72 },
  colItem: { flex: 1 },
  colHeader: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  rowLabel: { fontSize: 12, color: Colors.textMuted },
  cellValue: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  naText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center' },

  barWrap: { alignItems: 'center', gap: 4 },
  barBg: { width: '80%', height: 4, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barLabel: { fontSize: 12, fontWeight: '600' },

  divider: { height: 0.5, backgroundColor: Colors.border },

  insightWrap: { minHeight: 20 },
  insightText: {
    fontSize: 13, color: Colors.accent, lineHeight: 13 * 1.7,
    fontStyle: 'italic',
  },
  insightLoading: { fontSize: 13, color: Colors.textMuted },
});
