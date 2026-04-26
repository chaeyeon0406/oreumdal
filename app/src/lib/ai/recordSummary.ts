import { SessionRecord, EmotionType } from '../../types';

const EMOTION_LABEL: Record<EmotionType, string> = {
  excited: '흥분', anxious: '불안', greedy: '욕심',
  fearful: '두려움', calm: '차분', confused: '혼란',
};

export function buildRecordSummary(records: SessionRecord[], currentStock: string): string {
  const checks = records.filter((r) => r.type === 'check');
  if (checks.length === 0) return '';

  const lines: string[] = [];

  // 전체 통계
  const scored = checks.filter((r) => r.impulse_score !== undefined);
  const avgImpulse = scored.length > 0
    ? Math.round(scored.reduce((s, r) => s + r.impulse_score!, 0) / scored.length)
    : null;
  lines.push(`총 코칭 횟수: ${checks.length}번${avgImpulse !== null ? ` | 전체 평균 충동도: ${avgImpulse}%` : ''}`);

  // 최근 10번 기준 주요 감정 Top 3
  const freq: Partial<Record<EmotionType, number>> = {};
  checks.slice(0, 10).forEach((r) => r.emotions.forEach((e) => { freq[e] = (freq[e] ?? 0) + 1; }));
  const topEmotions = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e, n]) => `${EMOTION_LABEL[e as EmotionType]}(${n}회)`);
  if (topEmotions.length > 0) {
    lines.push(`최근 주요 감정: ${topEmotions.join(', ')}`);
  }

  // 충동도 60% 이상일 때 실제 매매 비율
  const highImpulse = scored.filter((r) => r.impulse_score! >= 60);
  if (highImpulse.length > 0) {
    const tradedCount = highImpulse.filter((r) => r.trade_outcome === 'traded').length;
    const rate = Math.round((tradedCount / highImpulse.length) * 100);
    lines.push(`충동도 60% 이상일 때 실제 매매 비율: ${rate}% (${tradedCount}/${highImpulse.length}번)`);
  }

  // 같은 종목 이력 (부분 일치)
  const sameStock = checks.filter((r) =>
    r.stock_name.includes(currentStock) || currentStock.includes(r.stock_name)
  );
  if (sameStock.length > 0) {
    const traded = sameStock.filter((r) => r.trade_outcome === 'traded').length;
    const skipped = sameStock.filter((r) => r.trade_outcome === 'skipped').length;
    const sameScored = sameStock.filter((r) => r.impulse_score !== undefined);
    const sameAvg = sameScored.length > 0
      ? Math.round(sameScored.reduce((s, r) => s + r.impulse_score!, 0) / sameScored.length)
      : null;
    const detail = [
      `매매 ${traded}회`,
      `참음 ${skipped}회`,
      sameAvg !== null ? `평균 충동도 ${sameAvg}%` : null,
    ].filter(Boolean).join('·');
    lines.push(`${currentStock} 코칭 이력: ${sameStock.length}번 (${detail})`);
  }

  return lines.join('\n');
}
