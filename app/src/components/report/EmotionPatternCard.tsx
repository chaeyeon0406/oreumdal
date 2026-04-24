import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../constants/colors';
import { EmotionStat } from '../../lib/reportUtils';

const SCREEN_W = Dimensions.get('window').width;
const BAR_MAX_W = SCREEN_W - 48 - 40 - 72 - 48; // content padding, card padding, label col, percent col

const EMOTION_COLORS = ['#0D2137', '#1A6FA8', '#8B95A1'];

interface Props {
  stats: EmotionStat[];
  insight: string | null;
  loading: boolean;
}

export default function EmotionPatternCard({ stats, insight, loading }: Props) {
  if (!stats.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>나의 감정 패턴</Text>
        <Text style={styles.empty}>코칭 기록이 쌓이면 자주 온 감정을 분석해드려요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>나의 감정 패턴</Text>
      <Text style={styles.subLabel}>자주 온 감정 Top {stats.length}</Text>

      <View style={styles.bars}>
        {stats.map((stat, i) => (
          <View key={stat.type} style={styles.barRow}>
            {/* 순위 + 감정명 */}
            <View style={styles.labelCol}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Text style={styles.emotionLabel}>{stat.label}</Text>
            </View>

            {/* 가로 막대 */}
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: (stat.percent / 100) * BAR_MAX_W,
                    backgroundColor: EMOTION_COLORS[i],
                  },
                ]}
              />
            </View>

            {/* 퍼센트 */}
            <Text style={[styles.percent, { color: EMOTION_COLORS[i] }]}>
              {stat.percent}%
            </Text>
          </View>
        ))}
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
  subLabel: { fontSize: 12, color: Colors.textMuted, marginTop: -4 },
  empty: { fontSize: 14, color: Colors.textMuted, lineHeight: 14 * 1.6 },

  bars: { gap: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelCol: { width: 56, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rank: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, width: 14 },
  emotionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  barTrack: {
    flex: 1, height: 8, backgroundColor: Colors.border,
    borderRadius: 4, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  percent: { width: 36, fontSize: 12, fontWeight: '600', textAlign: 'right' },

  divider: { height: 0.5, backgroundColor: Colors.border },

  insightWrap: { minHeight: 20 },
  insightText: {
    fontSize: 13, color: Colors.accent, lineHeight: 13 * 1.7,
    fontStyle: 'italic',
  },
  insightLoading: { fontSize: 13, color: Colors.textMuted },
});
