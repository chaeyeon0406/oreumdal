import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { MainStackParamList, TradeOutcome } from '../../types';
import { useRecordStore } from '../../store/recordStore';
import ScaleButton from '../../components/common/ScaleButton';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'RecordDetail'>;

const OUTCOME_OPTIONS: { value: TradeOutcome; label: string }[] = [
  { value: 'traded', label: '매매했어요' },
  { value: 'skipped', label: '참았어요' },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 ${hour}:${min}`;
}

export default function RecordDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionId } = route.params;

  const { records, updateTradeOutcome } = useRecordStore();
  const record = records.find((r) => r.id === sessionId);

  const [localOutcome, setLocalOutcome] = useState<TradeOutcome>(
    record?.trade_outcome ?? null
  );

  if (!record) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>기록을 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const directionText = record.direction === 'buy' ? '매수' : '매도';

  const handleOutcomeSelect = (outcome: TradeOutcome) => {
    setLocalOutcome(outcome);
    updateTradeOutcome(sessionId, outcome);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{record.stock_name} · {directionText}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 메타 정보 */}
        <View style={styles.metaRow}>
          <Text style={styles.metaDate}>{formatDate(record.created_at)}</Text>
          <Text style={styles.metaEmotion}>{record.emotion_label}</Text>
        </View>

        {/* CHK 코칭 결과 카드 */}
        {record.type === 'check' && record.verdict && (
          <View style={styles.resultCard}>
            <Text style={styles.sectionLabel}>코칭 결과</Text>
            <Text style={[
              styles.verdictText,
              record.verdict === 'ok' ? styles.textOk : styles.textReconsider,
            ]}>
              {record.verdict === 'ok' ? '괜찮아요' : '다시 생각해봐요'}
            </Text>
            <View style={styles.gaugeSection}>
              <View style={styles.gaugeHeader}>
                <Text style={styles.gaugeLabel}>충동도</Text>
                <Text style={[
                  styles.gaugeScore,
                  (record.impulse_score ?? 0) >= 55 ? styles.textReconsider : styles.textOk,
                ]}>
                  {record.impulse_score}
                </Text>
              </View>
              <View style={styles.gaugeBg}>
                <View style={[styles.gaugeFill, { width: `${record.impulse_score}%` as any }]} />
              </View>
            </View>
            <Text style={styles.reason}>{record.reason}</Text>
          </View>
        )}

        {/* POST 기록 메모 */}
        {record.type === 'post' && record.memo && (
          <View style={styles.memoCard}>
            <Text style={styles.sectionLabel}>메모</Text>
            <Text style={styles.memoText}>{record.memo}</Text>
          </View>
        )}

        {/* 대화 내용 */}
        {record.type === 'check' && record.messages.length > 0 && (
          <View style={styles.chatSection}>
            <Text style={styles.sectionLabel}>코칭 대화</Text>
            <View style={styles.chatBubbles}>
              {record.messages.map((msg, i) => (
                <View
                  key={i}
                  style={msg.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAI}
                >
                  <View style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI}>
                    <Text style={msg.role === 'user' ? styles.textUser : styles.textAI}>
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 실제 매매 여부 */}
        <View style={styles.outcomeSection}>
          <Text style={styles.outcomeSectionTitle}>
            {localOutcome === null ? '결국 어떻게 하셨어요?' : '실제 매매 여부'}
          </Text>
          {localOutcome === null && (
            <Text style={styles.outcomeDesc}>
              기록해두면 나중에 내 패턴을 분석하는데 도움이 돼요.
            </Text>
          )}
          <View style={styles.outcomeButtons}>
            {OUTCOME_OPTIONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.outcomeBtn,
                  localOutcome === value && styles.outcomeBtnActive,
                ]}
                onPress={() => handleOutcomeSelect(value)}
              >
                <Text style={[
                  styles.outcomeBtnText,
                  localOutcome === value && styles.outcomeBtnTextActive,
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {localOutcome !== null && (
            <TouchableOpacity onPress={() => handleOutcomeSelect(null)}>
              <Text style={styles.clearOutcome}>입력 취소</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: Colors.textMuted },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 16, color: Colors.accent, fontWeight: '500' },
  headerTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },

  content: { padding: 20, gap: 20 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaDate: { fontSize: 13, color: Colors.textMuted },
  metaEmotion: { fontSize: 13, color: Colors.textSecondary },

  sectionLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },

  resultCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: Colors.border, gap: 12,
  },
  verdictText: { fontSize: 20, fontWeight: '600', letterSpacing: -0.3 },
  textOk: { color: Colors.ok },
  textReconsider: { color: Colors.reconsider },
  gaugeSection: { gap: 8 },
  gaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  gaugeLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  gaugeScore: { fontSize: 20, fontWeight: '600' },
  gaugeBg: { height: 4, backgroundColor: Colors.impulseBar, borderRadius: 4, overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: Colors.impulse, borderRadius: 4 },
  reason: { fontSize: 13, color: Colors.textSecondary, lineHeight: 13 * 1.7 },

  memoCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  memoText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 15 * 1.7 },

  chatSection: { gap: 4 },
  chatBubbles: { gap: 10 },
  bubbleWrapAI: { alignSelf: 'flex-start', maxWidth: '85%' },
  bubbleWrapUser: { alignSelf: 'flex-end', maxWidth: '85%' },
  bubbleAI: {
    backgroundColor: Colors.surface,
    borderTopRightRadius: 12, borderBottomRightRadius: 12, borderBottomLeftRadius: 12,
    padding: 14, borderWidth: 0.5, borderColor: Colors.border,
  },
  bubbleUser: {
    backgroundColor: Colors.cta,
    borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderTopRightRadius: 12,
    padding: 14,
  },
  textAI: { fontSize: 14, color: Colors.textPrimary, lineHeight: 14 * 1.7 },
  textUser: { fontSize: 14, color: '#FFF', lineHeight: 14 * 1.7 },

  outcomeSection: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: Colors.border, gap: 12,
  },
  outcomeSectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  outcomeDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 13 * 1.7, marginTop: -4 },
  outcomeButtons: { flexDirection: 'row', gap: 10 },
  outcomeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 0.5, borderColor: Colors.border,
    alignItems: 'center',
  },
  outcomeBtnActive: { borderColor: Colors.cta, borderWidth: 1.5 },
  outcomeBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  outcomeBtnTextActive: { color: Colors.cta, fontWeight: '600' },
  clearOutcome: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
