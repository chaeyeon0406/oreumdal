import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { MainStackParamList, EmotionType, TradeDirection, SessionRecord } from '../../types';
import ScaleButton from '../../components/common/ScaleButton';
import CheckBottomSheet from '../../components/check/CheckBottomSheet';
import { useRecordStore } from '../../store/recordStore';
import { useUserStore } from '../../store/userStore';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const EMOTION_LABEL: Record<EmotionType, string> = {
  excited: '흥분', anxious: '불안', greedy: '욕심',
  fearful: '두려움', calm: '차분', confused: '혼란',
};

const DAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

// ── 날짜 유틸 ────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 이번 주 월요일 00:00
function getThisMonday(today: Date): Date {
  const d = startOfDay(new Date(today));
  const dow = d.getDay(); // 0=일, 1=월, ..., 6=토
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}

// 이번 주 (월~오늘) 날짜 배열
function getThisWeekDays(today: Date): Date[] {
  const monday = getThisMonday(today);
  const days: Date[] = [];
  for (let d = new Date(monday); d <= today; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

// 지난 주 월~일 범위
function getLastWeekRange(today: Date): { start: Date; end: Date } {
  const monday = getThisMonday(today);
  const start = new Date(monday);
  start.setDate(monday.getDate() - 7);
  const end = new Date(monday);
  end.setDate(monday.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function inRange(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

function avgImpulse(records: SessionRecord[]): number | null {
  const scored = records.filter((r) => r.impulse_score !== undefined);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((s, r) => s + r.impulse_score!, 0) / scored.length);
}

// ── 요약 데이터 계산 ──────────────────────────────────────────────────────────

function computeSummary(records: SessionRecord[]) {
  const today = new Date();
  const thisMonday = getThisMonday(today);
  const { start: lastStart, end: lastEnd } = getLastWeekRange(today);

  const checkRecords = records.filter((r) => r.type === 'check');

  const thisWeek = checkRecords.filter((r) => new Date(r.created_at) >= thisMonday);
  const lastWeek = checkRecords.filter((r) => inRange(new Date(r.created_at), lastStart, lastEnd));

  const thisWeekAvg = avgImpulse(thisWeek);
  const lastWeekAvg = avgImpulse(lastWeek);

  const skippedCount = thisWeek.filter((r) => r.trade_outcome === 'skipped').length;

  // 이번 주 감정 빈도 (3회 이상인 경우만)
  let topEmotion: EmotionType | null = null;
  if (thisWeek.length >= 3) {
    const freq: Partial<Record<EmotionType, number>> = {};
    thisWeek.forEach((r) => {
      r.emotions.forEach((e) => {
        freq[e] = (freq[e] ?? 0) + 1;
      });
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) topEmotion = sorted[0][0] as EmotionType;
  }

  return {
    today,
    thisWeek,
    thisWeekCount: thisWeek.length,
    thisWeekAvg,
    lastWeekAvg,
    skippedCount,
    topEmotion,
    hasAnyRecord: checkRecords.length > 0,
  };
}

// ── 빈 상태 카드 ─────────────────────────────────────────────────────────────

function EmptyCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.emptyCardTitle}>첫 코칭을 시작하면{'\n'}나의 패턴이 보여요</Text>
      <ScaleButton style={styles.emptyCardBtn} onPress={onPress}>
        <Text style={styles.emptyCardBtnText}>매매 전 체크하기</Text>
      </ScaleButton>
    </View>
  );
}

// ── 요약 카드 ─────────────────────────────────────────────────────────────────

function SummaryCard({ records, onStartCheck }: { records: SessionRecord[]; onStartCheck: () => void }) {
  const summary = useMemo(() => computeSummary(records), [records]);
  const {
    today, thisWeek, thisWeekCount, thisWeekAvg, lastWeekAvg,
    skippedCount, topEmotion, hasAnyRecord,
  } = summary;

  if (!hasAnyRecord) {
    return <EmptyCard onPress={onStartCheck} />;
  }

  const weekDays = getThisWeekDays(today);

  // 충동도 변화
  let impulseChange: { diff: number; better: boolean } | null = null;
  if (thisWeekAvg !== null && lastWeekAvg !== null && thisWeekAvg !== lastWeekAvg) {
    const diff = Math.abs(thisWeekAvg - lastWeekAvg);
    impulseChange = { diff, better: thisWeekAvg < lastWeekAvg };
  }

  return (
    <View style={styles.summaryCard}>
      {/* 섹션 1 — 주간 코칭 현황 */}
      <View style={styles.section1}>
        <View style={styles.dotsRow}>
          {weekDays.map((day, i) => {
            const coached = thisWeek.some((r) => isSameDay(new Date(r.created_at), day));
            const isToday = isSameDay(day, today);
            return (
              <View key={i} style={styles.dotWrap}>
                <View style={[
                  styles.dot,
                  coached ? styles.dotFilled : styles.dotEmpty,
                  isToday && styles.dotToday,
                ]} />
                <Text style={[styles.dotLabel, isToday && styles.dotLabelToday]}>
                  {DAY_KR[day.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.weekSummaryText}>
          이번 주{' '}
          <Text style={styles.weekSummaryBold}>{thisWeekCount}번</Text>{' '}
          코칭했어요
        </Text>
      </View>

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 섹션 2 — 핵심 수치 */}
      <View style={styles.section2}>

        {/* Row: 충동도 + 참은 횟수 */}
        <View style={styles.metricsRow}>
          {/* 충동도 */}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>이번 주 평균 충동도</Text>
            <Text style={styles.metricValue}>
              {thisWeekAvg !== null ? `${thisWeekAvg}%` : '-'}
            </Text>
            {impulseChange ? (
              <Text style={[
                styles.metricSub,
                { color: impulseChange.better ? Colors.ok : Colors.impulse },
              ]}>
                {`지난주보다 ${impulseChange.diff}% ${impulseChange.better ? '낮아졌어요 ↓' : '높아졌어요 ↑'}`}
              </Text>
            ) : (
              <Text style={styles.metricSub}>
                {lastWeekAvg === null ? '지난주 데이터 없음' : '지난주와 동일해요'}
              </Text>
            )}
          </View>

          <View style={styles.metricDivider} />

          {/* 참은 횟수 */}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>이번 주 참은 횟수</Text>
            <Text style={styles.metricValue}>
              {skippedCount > 0 ? `${skippedCount}번` : '-'}
            </Text>
            <Text style={styles.metricSub}>
              {thisWeekCount > 0
                ? `총 ${thisWeekCount}번 중 ${skippedCount}번`
                : '기록 없음'}
            </Text>
          </View>
        </View>

        {/* 감정 (3회 이상일 때만) */}
        {topEmotion && (
          <>
            <View style={styles.divider} />
            <View style={styles.emotionRow}>
              <Text style={styles.metricLabel}>이번 주 주요 감정</Text>
              <Text style={styles.emotionText}>
                <Text style={styles.emotionBold}>{EMOTION_LABEL[topEmotion]}</Text>이 가장 많이 왔어요
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ── 홈 ───────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (h < 24) return '오늘';
  if (d === 1) return '어제';
  if (d < 7) return `${d}일 전`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getTodayLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [sheetVisible, setSheetVisible] = useState(false);
  const records = useRecordStore((s) => s.records);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const recentSessions = records.filter((r) => r.type === 'check').slice(0, 2);

  const handleStart = ({
    stockName, direction, emotions,
  }: {
    stockName: string; direction: TradeDirection; emotions: EmotionType[];
  }) => {
    setSheetVisible(false);
    setTimeout(() => {
      navigation.navigate('CheckChat', {
        stockName, direction, emotions,
        emotionLabel: emotions.map((e) => EMOTION_LABEL[e]).join(', '),
      });
    }, 300);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.logo}>오름달</Text>
          <Text style={styles.date}>{getTodayLabel()}</Text>
        </View>

        {/* 요약 카드 */}
        <SummaryCard records={records} onStartCheck={() => setSheetVisible(true)} />

        {/* 최근 코칭 */}
        {recentSessions.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>최근 코칭</Text>
            {recentSessions.map((s) => (
              <ScaleButton
                key={s.id}
                style={styles.sessionCard}
                onPress={() => navigation.navigate('RecordDetail', { sessionId: s.id })}
              >
                <View>
                  <Text style={styles.sessionStock}>{s.stock_name}</Text>
                  <Text style={styles.sessionMeta}>
                    {s.direction === 'buy' ? '매수' : '매도'} · {formatDate(s.created_at)}
                  </Text>
                </View>
                <View style={styles.sessionRight}>
                  {s.verdict && (
                    <Text style={[
                      styles.verdictText,
                      s.verdict === 'ok' ? styles.textOk : styles.textReconsider,
                    ]}>
                      {s.verdict === 'ok' ? '괜찮아요' : '다시 생각해봐요'}
                    </Text>
                  )}
                  {s.impulse_score !== undefined && (
                    <Text style={styles.scoreText}>충동도 {s.impulse_score}%</Text>
                  )}
                </View>
              </ScaleButton>
            ))}
          </View>
        )}

      </ScrollView>

      {/* 하단 CTA */}
      <View style={styles.bottomBar}>
        <ScaleButton
          style={styles.primaryBtn}
          onPress={() => isLoggedIn ? setSheetVisible(true) : navigation.navigate('SignUp')}
        >
          <Text style={styles.primaryBtnText}>매매 전 체크하기</Text>
        </ScaleButton>
        <ScaleButton
          style={styles.secondaryBtn}
          onPress={() => isLoggedIn ? navigation.navigate('PostTrade') : navigation.navigate('SignUp')}
        >
          <Text style={styles.secondaryBtnText}>매매 기록하기</Text>
        </ScaleButton>
      </View>

      <CheckBottomSheet
        visible={sheetVisible}
        onStart={handleStart}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingBottom: 24, gap: 28 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 8,
  },
  logo: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  date: { fontSize: 13, color: Colors.textMuted },

  // ── 요약 카드 공통
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 20,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginHorizontal: -24,
    marginVertical: 0,
  },

  // ── 섹션 1
  section1: { gap: 12 },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dotWrap: { alignItems: 'center', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotFilled: { backgroundColor: Colors.cta },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dotToday: {
    borderWidth: 2,
    borderColor: Colors.cta,
  },
  dotLabel: { fontSize: 10, color: Colors.textMuted },
  dotLabelToday: { color: Colors.cta, fontWeight: '600' },
  weekSummaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  weekSummaryBold: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // ── 섹션 2
  section2: { gap: 20 },
  metricsRow: {
    flexDirection: 'row',
    gap: 0,
  },
  metricItem: {
    flex: 1,
    gap: 4,
  },
  metricDivider: {
    width: 0.5,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  metricSub: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 12 * 1.5,
  },
  emotionRow: { gap: 6 },
  emotionText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emotionBold: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // ── 빈 상태 카드
  emptyCardTitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 15 * 1.7,
  },
  emptyCardBtn: {
    backgroundColor: Colors.cta,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyCardBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // ── 최근 코칭
  recentSection: { gap: 12 },
  sectionLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  sessionCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 0.5, borderColor: Colors.border,
  },
  sessionStock: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  sessionMeta: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  sessionRight: { alignItems: 'flex-end', gap: 3 },
  verdictText: { fontSize: 13, fontWeight: '500' },
  textOk: { color: Colors.ok },
  textReconsider: { color: Colors.reconsider },
  scoreText: { fontSize: 12, color: Colors.textMuted },

  // ── 하단 CTA
  bottomBar: {
    padding: 20, paddingBottom: 32, gap: 12,
    borderTopWidth: 0.5, borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  primaryBtn: {
    backgroundColor: Colors.cta, borderRadius: 12, padding: 18, alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 18, alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },
});
