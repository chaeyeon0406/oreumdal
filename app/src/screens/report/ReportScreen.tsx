import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { MainStackParamList } from '../../types';
import { useRecordStore } from '../../store/recordStore';
import { useUserStore } from '../../store/userStore';
import {
  computeReport, computeAdvancedInsights, ReportTier,
} from '../../lib/reportUtils';
import { generateInsight } from '../../lib/ai';
import SignUpBottomSheet from '../../components/common/SignUpBottomSheet';
import GrowthSummaryCard from '../../components/report/GrowthSummaryCard';
import ImpulseGraph from '../../components/report/ImpulseGraph';
import OutcomeComparisonCard from '../../components/report/OutcomeComparisonCard';
import EmotionPatternCard from '../../components/report/EmotionPatternCard';

type Nav = NativeStackNavigationProp<MainStackParamList>;

// ── 잠금 섹션 ──────────────────────────────────────────────────────────────────
function LockedSection({
  locked,
  lockMessage,
  children,
}: {
  locked: boolean;
  lockMessage: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.lockedWrap}>
      <View style={locked ? styles.lockedContent : undefined}>{children}</View>
      {locked && (
        <View style={styles.lockedOverlay}>
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>잠금</Text>
          </View>
          <Text style={styles.lockedText}>{lockMessage}</Text>
        </View>
      )}
    </View>
  );
}

// ── 데이터 부족 안내 ──────────────────────────────────────────────────────────
function InsufficientCard({ count }: { count: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>아직 데이터가 부족해요</Text>
      <Text style={styles.cardDesc}>
        코칭을 5번 이상 하면 나만의 패턴을 볼 수 있어요.
      </Text>
      <View style={styles.progressBarWrap}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min((count / 5) * 100, 100)}%` as any },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>{count} / 5회</Text>
      </View>
    </View>
  );
}

// ── 기본 통계 ─────────────────────────────────────────────────────────────────
function BasicStats({ count, avgImpulse }: { count: number; avgImpulse: number }) {
  return (
    <View style={[styles.card, styles.statsRow]}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{count}회</Text>
        <Text style={styles.statLabel}>총 코칭</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: Colors.impulse }]}>{avgImpulse}%</Text>
        <Text style={styles.statLabel}>평균 충동도</Text>
      </View>
    </View>
  );
}

// ── AI 인사이트 카드 ──────────────────────────────────────────────────────────
function InsightCard({
  title,
  mainText,
  subText,
  locked,
  lockMessage,
  comment,
  commentLoading,
}: {
  title: string;
  mainText: string;
  subText?: string;
  locked: boolean;
  lockMessage: string;
  comment: string | null;
  commentLoading: boolean;
}) {
  return (
    <LockedSection locked={locked} lockMessage={lockMessage}>
      <View style={styles.card}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightMain}>{mainText}</Text>
        {subText ? <Text style={styles.insightSub}>{subText}</Text> : null}
        {(comment || commentLoading) && (
          <View style={styles.aiCommentBox}>
            {commentLoading ? (
              <ActivityIndicator size="small" color={Colors.textMuted} />
            ) : (
              <Text style={styles.aiCommentText}>{comment}</Text>
            )}
          </View>
        )}
      </View>
    </LockedSection>
  );
}

// ── 공포탐욕지수 카드 ─────────────────────────────────────────────────────────
interface FearGreedData {
  score: number;
  rating: string;
  timestamp: string;
}

const FG_LABEL: Record<string, string> = {
  'Extreme Fear': '극단적 공포',
  Fear: '공포',
  Neutral: '중립',
  Greed: '탐욕',
  'Extreme Greed': '극단적 탐욕',
};

function fgColor(score: number): string {
  if (score <= 25) return '#C97A3A';
  if (score <= 45) return '#C97A3A';
  if (score <= 55) return '#8B95A1';
  if (score <= 75) return Colors.ok;
  return Colors.ok;
}

function FearGreedCard() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
      .then((r) => r.json())
      .then((json) => {
        const fg = json?.fear_and_greed;
        if (fg) {
          setData({
            score: Math.round(fg.score),
            rating: fg.rating,
            timestamp: fg.timestamp,
          });
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} 기준`;
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeader}>시장 맥락</Text>
      <Text style={styles.cardTitle}>공포·탐욕 지수</Text>

      {loading ? (
        <ActivityIndicator size="small" color={Colors.textMuted} style={{ marginTop: 12 }} />
      ) : error || !data ? (
        <Text style={styles.cardDesc}>지수를 불러오지 못했어요.</Text>
      ) : (
        <>
          <View style={styles.fgRow}>
            <Text style={[styles.fgScore, { color: fgColor(data.score) }]}>
              {data.score}
            </Text>
            <View>
              <Text style={[styles.fgRating, { color: fgColor(data.score) }]}>
                {FG_LABEL[data.rating] ?? data.rating}
              </Text>
              <Text style={styles.fgTime}>{formatTime(data.timestamp)}</Text>
            </View>
          </View>

          {/* 게이지 바 */}
          <View style={styles.gaugeBg}>
            <View
              style={[
                styles.gaugeFill,
                {
                  width: `${data.score}%` as any,
                  backgroundColor: fgColor(data.score),
                },
              ]}
            />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={styles.gaugeLabel}>극단적 공포</Text>
            <Text style={styles.gaugeLabel}>극단적 탐욕</Text>
          </View>

          <Text style={styles.fgNote}>
            시장이 극단적 탐욕일 때 충동 매매가 늘어나는 경향이 있어요.
          </Text>
        </>
      )}
    </View>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function ReportScreen() {
  const navigation = useNavigation<Nav>();
  const records = useRecordStore((s) => s.records);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);

  const report = useMemo(() => computeReport(records), [records]);
  const advanced = useMemo(() => computeAdvancedInsights(records), [records]);

  const {
    tier, checkCount, totalAvgImpulse,
    thisWeekAvg, lastWeekAvg,
    graphPoints, outcomeStats, emotionStats,
  } = report;

  const { complianceRate, complianceOkCount, complianceTotal,
    emotionImpulse, vulnerableStock, q1Impulse } = advanced;

  const remaining5  = Math.max(5  - checkCount, 0);
  const remaining10 = Math.max(10 - checkCount, 0);

  // ── 회원가입 프롬프트 ─────────────────────────────────────────────────────
  const [showSignUp, setShowSignUp] = useState(false);
  const hasShownSignUp = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn && !hasShownSignUp.current) {
        hasShownSignUp.current = true;
        setShowSignUp(true);
      }
    }, [isLoggedIn]),
  );

  // ── 기존 AI 인사이트 (섹션 3·4) ──────────────────────────────────────────
  const [outcomeInsight, setOutcomeInsight] = useState<string | null>(null);
  const [emotionInsightText, setEmotionInsightText] = useState<string | null>(null);
  const [oldInsightLoading, setOldInsightLoading] = useState(false);
  const oldCacheKey = useRef('');

  useEffect(() => {
    if (tier !== 'full') return;
    const key = `${outcomeStats.skippedCount}|${outcomeStats.tradedCount}|${emotionStats.map(e => e.type + e.percent).join(',')}`;
    if (oldCacheKey.current === key) return;
    oldCacheKey.current = key;
    setOldInsightLoading(true);
    Promise.all([
      generateInsight(
        `참은 횟수: ${outcomeStats.skippedCount}번(평균충동도 ${outcomeStats.skippedAvgImpulse}%), 매매한 횟수: ${outcomeStats.tradedCount}번(평균충동도 ${outcomeStats.tradedAvgImpulse}%). 한 줄 인사이트를 주세요.`,
      ),
      generateInsight(
        `가장 자주 온 감정: ${emotionStats.map(e => `${e.label}(${e.percent}%)`).join(', ')}. 한 줄 인사이트를 주세요.`,
      ),
    ])
      .then(([o, e]) => { setOutcomeInsight(o); setEmotionInsightText(e); })
      .finally(() => setOldInsightLoading(false));
  }, [tier, outcomeStats, emotionStats]);

  // ── 심화 AI 코멘트 (인사이트 1~4) ────────────────────────────────────────
  const [i1Comment, setI1Comment] = useState<string | null>(null);
  const [i2Comment, setI2Comment] = useState<string | null>(null);
  const [i3Comment, setI3Comment] = useState<string | null>(null);
  const [i4Comment, setI4Comment] = useState<string | null>(null);
  const [advLoading, setAdvLoading] = useState(false);
  const advCacheKey = useRef('');

  useEffect(() => {
    const parts: string[] = [];
    if (complianceRate !== null) parts.push(`i1:${complianceRate}`);
    if (emotionImpulse) parts.push(`i2:${emotionImpulse.emotion}${emotionImpulse.avgImpulse}`);
    if (vulnerableStock) parts.push(`i3:${vulnerableStock.name}${vulnerableStock.avgImpulse}`);
    if (q1Impulse) parts.push(`i4:${q1Impulse.reason}${q1Impulse.avgImpulse}`);
    if (!parts.length) return;
    const key = parts.join('|');
    if (advCacheKey.current === key) return;
    advCacheKey.current = key;
    setAdvLoading(true);
    Promise.all([
      complianceRate !== null
        ? generateInsight(`원칙 준수율 ${complianceRate}%, 총 ${complianceTotal}번 중 ${complianceOkCount}번 OK 판정. 한 줄 코멘트.`)
        : Promise.resolve(null),
      emotionImpulse
        ? generateInsight(`${emotionImpulse.label}일 때 평균 충동도 ${emotionImpulse.avgImpulse}%로 가장 높음. 한 줄 코멘트.`)
        : Promise.resolve(null),
      vulnerableStock
        ? generateInsight(`${vulnerableStock.name} 코칭 시 평균 충동도 ${vulnerableStock.avgImpulse}%, ${vulnerableStock.count}번 코칭. 한 줄 코멘트.`)
        : Promise.resolve(null),
      q1Impulse
        ? generateInsight(`'${q1Impulse.reason}' 선택 시 평균 충동도 ${q1Impulse.avgImpulse}%로 높음. 한 줄 코멘트.`)
        : Promise.resolve(null),
    ])
      .then(([c1, c2, c3, c4]) => {
        if (c1) setI1Comment(c1);
        if (c2) setI2Comment(c2);
        if (c3) setI3Comment(c3);
        if (c4) setI4Comment(c4);
      })
      .finally(() => setAdvLoading(false));
  }, [complianceRate, emotionImpulse, vulnerableStock, q1Impulse]);

  // ── tier 뱃지 레이블 ('기본 분석' 제거) ─────────────────────────────────
  const tierBadgeLabel =
    tier === 'insufficient' ? '데이터 수집 중' : tier === 'full' ? '전체 분석' : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>리포트</Text>
          {tierBadgeLabel && (
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>{tierBadgeLabel}</Text>
            </View>
          )}
        </View>

        {/* 데이터 부족 안내 */}
        {tier === 'insufficient' && <InsufficientCard count={checkCount} />}

        {/* 기본 통계 */}
        {checkCount > 0 && (
          <BasicStats count={checkCount} avgImpulse={totalAvgImpulse} />
        )}

        {/* 섹션 1 — 성장 요약 */}
        <LockedSection
          locked={tier === 'insufficient'}
          lockMessage={`코칭 ${remaining5}번 더 하면 열려요`}
        >
          <GrowthSummaryCard
            thisWeekAvg={thisWeekAvg}
            lastWeekAvg={lastWeekAvg}
            totalAvgImpulse={totalAvgImpulse}
          />
        </LockedSection>

        {/* 섹션 2 — 충동도 그래프 */}
        <LockedSection
          locked={tier === 'insufficient'}
          lockMessage={`코칭 ${remaining5}번 더 하면 열려요`}
        >
          <ImpulseGraph
            points={graphPoints}
            onPointPress={(sessionId) =>
              navigation.navigate('RecordDetail', { sessionId })
            }
          />
        </LockedSection>

        {/* 섹션 3 — 참았을 때 vs 했을 때 */}
        <LockedSection
          locked={tier !== 'full'}
          lockMessage={`코칭 ${remaining10}번 더 하면 열려요`}
        >
          <OutcomeComparisonCard
            stats={outcomeStats}
            insight={outcomeInsight}
            loading={oldInsightLoading}
          />
        </LockedSection>

        {/* 섹션 4 — 감정 패턴 */}
        <LockedSection
          locked={tier !== 'full'}
          lockMessage={`코칭 ${remaining10}번 더 하면 열려요`}
        >
          <EmotionPatternCard
            stats={emotionStats}
            insight={emotionInsightText}
            loading={oldInsightLoading}
          />
        </LockedSection>

        {/* ── AI 심화 인사이트 ── */}
        <Text style={styles.sectionHeader}>AI 심화 분석</Text>

        {/* 인사이트 1 — 원칙 준수율 */}
        <InsightCard
          title="투자 원칙 준수율"
          mainText={
            complianceRate !== null
              ? `이번 달 투자 원칙 준수율은 ${complianceRate}%예요.`
              : '데이터를 분석 중이에요.'
          }
          subText={
            complianceRate !== null
              ? `총 ${complianceTotal}번 중 ${complianceOkCount}번 원칙대로 판단했어요`
              : undefined
          }
          locked={checkCount < 10}
          lockMessage={`코칭 ${remaining10}번 더 하면 열려요`}
          comment={i1Comment}
          commentLoading={advLoading && complianceRate === null && checkCount >= 10}
        />

        {/* 인사이트 2 — 감정-충동도 상관관계 */}
        <InsightCard
          title="감정별 충동도"
          mainText={
            emotionImpulse
              ? `${emotionImpulse.label}일 때 충동도가 평균 ${emotionImpulse.avgImpulse}%로 가장 높아요.`
              : '아직 패턴이 보이지 않아요.'
          }
          locked={checkCount < 5}
          lockMessage={`코칭 ${remaining5}번 더 하면 열려요`}
          comment={i2Comment}
          commentLoading={advLoading && !emotionImpulse && checkCount >= 5}
        />

        {/* 인사이트 3 — 취약 종목 */}
        <InsightCard
          title="취약 종목"
          mainText={
            vulnerableStock
              ? `최근 ${vulnerableStock.name} 코칭 시 평균 충동도가 ${vulnerableStock.avgImpulse}%예요.`
              : '아직 같은 종목을 3번 이상 코칭하지 않았어요.'
          }
          subText={vulnerableStock ? `총 ${vulnerableStock.count}번 코칭` : undefined}
          locked={!vulnerableStock && checkCount < 10}
          lockMessage="같은 종목 3번 이상 코칭하면 열려요"
          comment={i3Comment}
          commentLoading={advLoading && !vulnerableStock && checkCount >= 10}
        />

        {/* 인사이트 4 — 매매이유-충동도 상관관계 */}
        <InsightCard
          title="매매이유별 충동도"
          mainText={
            q1Impulse
              ? `'${q1Impulse.reason}'를 선택했을 때 충동도가 평균 ${q1Impulse.avgImpulse}%로 높아요.`
              : '아직 패턴 분석에 데이터가 부족해요.'
          }
          locked={checkCount < 10}
          lockMessage={`코칭 ${remaining10}번 더 하면 열려요`}
          comment={i4Comment}
          commentLoading={advLoading && !q1Impulse && checkCount >= 10}
        />

        {/* 공포탐욕지수 */}
        <FearGreedCard />

        <View style={{ height: 32 }} />
      </ScrollView>

      <SignUpBottomSheet
        visible={showSignUp}
        trigger="report"
        onClose={() => setShowSignUp(false)}
      />
    </SafeAreaView>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, gap: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 8,
  },
  title: { fontSize: 26, fontWeight: '600', color: Colors.textPrimary },
  tierBadge: {
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 12,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  tierBadgeText: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted, letterSpacing: 0.5,
  },

  // 공통 카드
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: Colors.border, gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 14 * 1.6 },

  progressBarWrap: { gap: 6 },
  progressBarBg: {
    height: 4, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: { height: '100%' as any, backgroundColor: Colors.cta, borderRadius: 4 },
  progressLabel: { fontSize: 12, color: Colors.textMuted, textAlign: 'right' },

  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 0.5, backgroundColor: Colors.border, marginVertical: 4 },
  statValue: { fontSize: 24, fontWeight: '600', color: Colors.textPrimary },
  statLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase',
  },

  // 잠금
  lockedWrap: { borderRadius: 16, overflow: 'hidden' },
  lockedContent: { opacity: 0.1 },
  lockedOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(235,240,248,0.93)',
  },
  lockBadge: {
    backgroundColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  lockBadgeText: {
    fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.8,
  },
  lockedText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  // 섹션 헤더
  sectionHeader: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4,
  },

  // AI 인사이트 카드
  insightTitle: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  insightMain: {
    fontSize: 15, fontWeight: '500', color: Colors.textPrimary,
    lineHeight: 15 * 1.6,
  },
  insightSub: { fontSize: 13, color: Colors.textMuted },
  aiCommentBox: {
    backgroundColor: Colors.background, borderRadius: 10,
    padding: 12, marginTop: 2,
    borderWidth: 0.5, borderColor: Colors.border,
    minHeight: 40, justifyContent: 'center',
  },
  aiCommentText: {
    fontSize: 13, color: Colors.textSecondary, lineHeight: 13 * 1.7,
  },

  // Fear & Greed
  fgRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4,
  },
  fgScore: {
    fontSize: 40, fontWeight: '700', letterSpacing: -1,
  },
  fgRating: { fontSize: 15, fontWeight: '600' },
  fgTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  gaugeBg: {
    height: 8, backgroundColor: Colors.border,
    borderRadius: 4, overflow: 'hidden',
  },
  gaugeFill: { height: '100%' as any, borderRadius: 4 },
  gaugeLabels: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 4,
  },
  gaugeLabel: { fontSize: 10, color: Colors.textMuted },
  fgNote: {
    fontSize: 13, color: Colors.textSecondary,
    lineHeight: 13 * 1.6,
    borderTopWidth: 0.5, borderTopColor: Colors.border,
    paddingTop: 10, marginTop: 2,
  },
});
