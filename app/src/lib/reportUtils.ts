import { SessionRecord, EmotionType, ChatMessage } from '../types';

export type ReportTier = 'insufficient' | 'basic' | 'full';

export interface GraphPoint {
  sessionId: string;
  date: string;   // MM/DD
  score: number;  // 0~100
}

export interface OutcomeStats {
  skippedCount: number;
  tradedCount: number;
  skippedAvgImpulse: number;
  tradedAvgImpulse: number;
}

export interface EmotionStat {
  type: EmotionType;
  label: string;
  count: number;
  percent: number;
}

export interface ReportData {
  tier: ReportTier;
  checkCount: number;           // check 타입 기록 수
  totalAvgImpulse: number;      // 전체 충동도 평균

  // 성장 요약 (섹션 1)
  thisWeekAvg: number | null;
  lastWeekAvg: number | null;

  // 그래프 (섹션 2)
  graphPoints: GraphPoint[];    // 최근 10회 check 기록

  // 참았을 때 vs 했을 때 (섹션 3)
  outcomeStats: OutcomeStats;

  // 감정 패턴 (섹션 4)
  emotionStats: EmotionStat[];  // top 3
}

const EMOTION_LABEL: Record<EmotionType, string> = {
  excited: '흥분', anxious: '불안', greedy: '욕심',
  fearful: '두려움', calm: '차분', confused: '혼란',
};

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // 일요일 기준
  return d;
}

export function computeReport(records: SessionRecord[]): ReportData {
  // check 타입만 통계에 사용
  const checks = records
    .filter((r) => r.type === 'check' && r.impulse_score !== undefined)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const checkCount = checks.length;

  const tier: ReportTier =
    checkCount < 5 ? 'insufficient' : checkCount < 10 ? 'basic' : 'full';

  // 전체 충동도 평균
  const totalAvgImpulse = avg(checks.map((r) => r.impulse_score!));

  // ── 이번 주 / 지난 주 ──────────────────────────────────────────────────────
  const now = new Date();
  const thisWeekStart = startOfWeek(now).getTime();
  const lastWeekStart = thisWeekStart - 7 * 86400000;

  const thisWeekScores = checks
    .filter((r) => new Date(r.created_at).getTime() >= thisWeekStart)
    .map((r) => r.impulse_score!);

  const lastWeekScores = checks
    .filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= lastWeekStart && t < thisWeekStart;
    })
    .map((r) => r.impulse_score!);

  const thisWeekAvg = thisWeekScores.length ? avg(thisWeekScores) : null;
  const lastWeekAvg = lastWeekScores.length ? avg(lastWeekScores) : null;

  // ── 그래프 — 최근 10회 ────────────────────────────────────────────────────
  const recent10 = checks.slice(-10);
  const graphPoints: GraphPoint[] = recent10.map((r) => ({
    sessionId: r.id,
    date: formatDate(r.created_at),
    score: r.impulse_score!,
  }));

  // ── 결과별 통계 ───────────────────────────────────────────────────────────
  const skipped = checks.filter((r) => r.trade_outcome === 'skipped');
  const traded  = checks.filter((r) => r.trade_outcome === 'traded');

  const outcomeStats: OutcomeStats = {
    skippedCount: skipped.length,
    tradedCount: traded.length,
    skippedAvgImpulse: avg(skipped.map((r) => r.impulse_score!)),
    tradedAvgImpulse:  avg(traded.map((r) => r.impulse_score!)),
  };

  // ── 감정 패턴 ─────────────────────────────────────────────────────────────
  const emotionCount: Partial<Record<EmotionType, number>> = {};
  checks.forEach((r) => {
    r.emotions.forEach((e) => {
      emotionCount[e] = (emotionCount[e] ?? 0) + 1;
    });
  });

  const totalEmotions = Object.values(emotionCount).reduce((a, b) => a + b, 0) || 1;
  const emotionStats: EmotionStat[] = (Object.entries(emotionCount) as [EmotionType, number][])
    .map(([type, count]) => ({
      type,
      label: EMOTION_LABEL[type],
      count,
      percent: Math.round((count / totalEmotions) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    tier,
    checkCount,
    totalAvgImpulse,
    thisWeekAvg,
    lastWeekAvg,
    graphPoints,
    outcomeStats,
    emotionStats,
  };
}

// ── 심화 인사이트 ─────────────────────────────────────────────────────────────

export interface AdvancedInsights {
  // 인사이트 1: 원칙 준수율 (checkCount >= 10)
  complianceRate: number | null;
  complianceOkCount: number;
  complianceTotal: number;

  // 인사이트 2: 감정-충동도 상관관계 (checkCount >= 5)
  emotionImpulse: { emotion: EmotionType; label: string; avgImpulse: number } | null;

  // 인사이트 3: 취약 종목 (같은 종목 3회 이상)
  vulnerableStock: { name: string; avgImpulse: number; count: number } | null;

  // 인사이트 4: 매매이유-충동도 (checkCount >= 10)
  q1Impulse: { reason: string; avgImpulse: number } | null;
}

export function computeAdvancedInsights(records: SessionRecord[]): AdvancedInsights {
  const checks = records.filter(
    (r) => r.type === 'check' && r.impulse_score !== undefined,
  );

  // ── 1. 원칙 준수율 ────────────────────────────────────────────────────────
  const withVerdict = checks.filter((r) => r.verdict);
  const okCount = withVerdict.filter((r) => r.verdict === 'ok').length;
  const complianceRate =
    withVerdict.length >= 10
      ? Math.round((okCount / withVerdict.length) * 100)
      : null;

  // ── 2. 감정-충동도 상관관계 ───────────────────────────────────────────────
  let emotionImpulse: AdvancedInsights['emotionImpulse'] = null;
  if (checks.length >= 5) {
    const map: Partial<Record<EmotionType, number[]>> = {};
    checks.forEach((r) =>
      r.emotions.forEach((e) => {
        if (!map[e]) map[e] = [];
        map[e]!.push(r.impulse_score!);
      }),
    );
    const sorted = (Object.entries(map) as [EmotionType, number[]][])
      .map(([emotion, scores]) => ({
        emotion,
        label: EMOTION_LABEL[emotion],
        avgImpulse: avg(scores),
        count: scores.length,
      }))
      .filter((x) => x.count >= 2)
      .sort((a, b) => b.avgImpulse - a.avgImpulse);
    if (sorted.length > 0) emotionImpulse = sorted[0];
  }

  // ── 3. 취약 종목 ──────────────────────────────────────────────────────────
  const stockMap: Record<string, number[]> = {};
  checks.forEach((r) => {
    if (!stockMap[r.stock_name]) stockMap[r.stock_name] = [];
    stockMap[r.stock_name].push(r.impulse_score!);
  });
  const stockCandidates = Object.entries(stockMap)
    .filter(([, scores]) => scores.length >= 3)
    .map(([name, scores]) => ({ name, avgImpulse: avg(scores), count: scores.length }))
    .sort((a, b) => b.avgImpulse - a.avgImpulse);
  const vulnerableStock = stockCandidates[0] ?? null;

  // ── 4. 매매이유-충동도 상관관계 ───────────────────────────────────────────
  let q1Impulse: AdvancedInsights['q1Impulse'] = null;
  if (checks.length >= 10) {
    const reasonMap: Record<string, number[]> = {};
    checks.forEach((r) => {
      const firstUser = r.messages.find((m: ChatMessage) => m.role === 'user');
      if (!firstUser) return;
      const reason = firstUser.content.split(' — ')[0].trim();
      if (!reasonMap[reason]) reasonMap[reason] = [];
      reasonMap[reason].push(r.impulse_score!);
    });
    const sorted = Object.entries(reasonMap)
      .map(([reason, scores]) => ({ reason, avgImpulse: avg(scores), count: scores.length }))
      .filter((x) => x.count >= 3)
      .sort((a, b) => b.avgImpulse - a.avgImpulse);
    if (sorted.length > 0) q1Impulse = sorted[0];
  }

  return {
    complianceRate,
    complianceOkCount: okCount,
    complianceTotal: withVerdict.length,
    emotionImpulse,
    vulnerableStock,
    q1Impulse,
  };
}
