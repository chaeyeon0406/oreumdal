import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  thisWeekAvg: number | null;
  lastWeekAvg: number | null;
  totalAvgImpulse: number;
}

export default function GrowthSummaryCard({ thisWeekAvg, lastWeekAvg, totalAvgImpulse }: Props) {
  const hasComparison = thisWeekAvg !== null && lastWeekAvg !== null;
  const diff = hasComparison ? thisWeekAvg! - lastWeekAvg! : 0;

  const improved = diff < 0;
  const worsened = diff > 0;
  const neutral = diff === 0;

  const trendColor = improved ? Colors.ok : worsened ? Colors.reconsider : Colors.textSecondary;
  const arrow = improved ? '↓' : worsened ? '↑' : '→';

  return (
    <View style={styles.card}>
      <Text style={styles.label}>성장 요약</Text>

      {hasComparison ? (
        <View style={styles.body}>
          <View style={styles.compRow}>
            <View style={styles.weekBlock}>
              <Text style={styles.weekLabel}>이번 주</Text>
              <Text style={[styles.weekScore, { color: trendColor }]}>{thisWeekAvg}%</Text>
            </View>
            <Text style={[styles.arrow, { color: trendColor }]}>{arrow}</Text>
            <View style={styles.weekBlock}>
              <Text style={styles.weekLabel}>지난 주</Text>
              <Text style={styles.weekScoreMuted}>{lastWeekAvg}%</Text>
            </View>
          </View>

          <Text style={[styles.insight, { color: trendColor }]}>
            {improved
              ? `이번 주 평균 충동도 ${thisWeekAvg}%, 지난주 ${lastWeekAvg}%보다 낮아졌어요`
              : worsened
              ? `이번 주 평균 충동도 ${thisWeekAvg}%, 지난주 ${lastWeekAvg}%보다 높아졌어요`
              : `이번 주와 지난주 충동도가 ${thisWeekAvg}%로 동일해요`}
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.singleScore}>{totalAvgImpulse}%</Text>
          <Text style={styles.singleLabel}>전체 평균 충동도</Text>
          <Text style={styles.noCompDesc}>
            {thisWeekAvg === null
              ? '이번 주 코칭 기록이 없어요'
              : '지난 주 기록이 쌓이면 변화를 비교해드려요'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: Colors.border, gap: 14,
  },
  label: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  body: { gap: 10 },

  compRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  weekBlock: { alignItems: 'center', gap: 4 },
  weekLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  weekScore: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  weekScoreMuted: { fontSize: 32, fontWeight: '700', color: Colors.textMuted, letterSpacing: -1 },
  arrow: { fontSize: 28, fontWeight: '600', marginTop: 12 },

  insight: { fontSize: 14, lineHeight: 14 * 1.6, fontWeight: '500' },

  singleScore: { fontSize: 40, fontWeight: '700', color: Colors.impulse, letterSpacing: -1 },
  singleLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  noCompDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 13 * 1.6 },
});
