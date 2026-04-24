import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { GraphPoint } from '../../lib/reportUtils';

const SCREEN_W = Dimensions.get('window').width;
const CARD_PADDING = 20;
const GRAPH_PADDING = { top: 16, bottom: 36, left: 28, right: 12 };
const GRAPH_W = SCREEN_W - 48 - CARD_PADDING * 2; // screen - content padding - card padding
const GRAPH_H = 180;
const PLOT_W = GRAPH_W - GRAPH_PADDING.left - GRAPH_PADDING.right;
const PLOT_H = GRAPH_H - GRAPH_PADDING.top - GRAPH_PADDING.bottom;

const Y_MIN = 0;
const Y_MAX = 100;
const Y_TICKS = [0, 25, 50, 75, 100];

function toX(i: number, total: number): number {
  if (total <= 1) return GRAPH_PADDING.left + PLOT_W / 2;
  return GRAPH_PADDING.left + (i / (total - 1)) * PLOT_W;
}

function toY(score: number): number {
  return GRAPH_PADDING.top + PLOT_H - ((score - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;
}

interface Props {
  points: GraphPoint[];
  onPointPress?: (sessionId: string) => void;
}

export default function ImpulseGraph({ points, onPointPress }: Props) {
  if (!points.length) return null;

  // SVG path — line
  const linePath = points
    .map((p, i) => {
      const x = toX(i, points.length);
      const y = toY(p.score);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // SVG path — area fill (closes to bottom)
  const lastX = toX(points.length - 1, points.length);
  const firstX = toX(0, points.length);
  const bottomY = GRAPH_PADDING.top + PLOT_H;
  const areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

  // 위험선 (50% 기준)
  const dangerY = toY(50);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>충동도 변화</Text>
      <Text style={styles.subLabel}>최근 {points.length}회 코칭</Text>

      <View style={styles.graphWrap}>
        <Svg width={GRAPH_W} height={GRAPH_H}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={Colors.cta} stopOpacity="0.12" />
              <Stop offset="100%" stopColor={Colors.cta} stopOpacity="0.01" />
            </LinearGradient>
          </Defs>

          {/* Y축 보조선 */}
          {Y_TICKS.map((tick) => {
            const y = toY(tick);
            return (
              <React.Fragment key={tick}>
                <Line
                  x1={GRAPH_PADDING.left}
                  y1={y}
                  x2={GRAPH_PADDING.left + PLOT_W}
                  y2={y}
                  stroke={Colors.border}
                  strokeWidth={0.5}
                  strokeDasharray={tick === 0 ? '0' : '3,3'}
                />
                <SvgText
                  x={GRAPH_PADDING.left - 6}
                  y={y + 4}
                  fontSize={9}
                  fill={Colors.textMuted}
                  textAnchor="end"
                >
                  {tick}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* 충동도 50% 위험선 */}
          <Line
            x1={GRAPH_PADDING.left}
            y1={dangerY}
            x2={GRAPH_PADDING.left + PLOT_W}
            y2={dangerY}
            stroke={Colors.reconsider}
            strokeWidth={0.8}
            strokeDasharray="4,3"
            strokeOpacity={0.6}
          />

          {/* 영역 채우기 */}
          <Path d={areaPath} fill="url(#areaGrad)" />

          {/* 라인 */}
          <Path
            d={linePath}
            stroke={Colors.cta}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* 데이터 포인트 */}
          {points.map((p, i) => {
            const x = toX(i, points.length);
            const y = toY(p.score);
            const isHigh = p.score >= 50;
            return (
              <Circle
                key={p.sessionId}
                cx={x}
                cy={y}
                r={5}
                fill={isHigh ? Colors.reconsider : Colors.ok}
                stroke={Colors.background}
                strokeWidth={2}
              />
            );
          })}

          {/* X축 날짜 레이블 — 첫/마지막 + 최대 3개 중간 */}
          {points
            .filter((_, i) => {
              if (points.length <= 4) return true;
              return i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2);
            })
            .map((p, _, arr) => {
              const origIdx = points.indexOf(p);
              const x = toX(origIdx, points.length);
              return (
                <SvgText
                  key={p.sessionId + '_label'}
                  x={x}
                  y={GRAPH_PADDING.top + PLOT_H + 18}
                  fontSize={9}
                  fill={Colors.textMuted}
                  textAnchor="middle"
                >
                  {p.date}
                </SvgText>
              );
            })}
        </Svg>

        {/* 터치 오버레이 — 각 포인트 영역 */}
        {points.map((p, i) => {
          const x = toX(i, points.length);
          const y = toY(p.score);
          const hitSize = 32;
          return (
            <TouchableOpacity
              key={p.sessionId + '_touch'}
              style={[
                styles.pointHit,
                { left: x - hitSize / 2, top: y - hitSize / 2, width: hitSize, height: hitSize },
              ]}
              onPress={() => onPointPress?.(p.sessionId)}
              activeOpacity={0.7}
            />
          );
        })}
      </View>

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.reconsider }]} />
          <Text style={styles.legendText}>50% 이상</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.ok }]} />
          <Text style={styles.legendText}>50% 미만</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine]} />
          <Text style={styles.legendText}>충동도 50% 기준선</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: CARD_PADDING,
    borderWidth: 0.5, borderColor: Colors.border, gap: 4,
  },
  label: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  subLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },

  graphWrap: { position: 'relative', height: GRAPH_H },
  pointHit: { position: 'absolute' },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8,
    paddingTop: 12, borderTopWidth: 0.5, borderTopColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLine: {
    width: 14, height: 1.5, backgroundColor: Colors.reconsider, opacity: 0.6,
  },
  legendText: { fontSize: 11, color: Colors.textMuted },
});
