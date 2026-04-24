import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { MainStackParamList, TradeDirection, EmotionType } from '../../types';
import { useRecordStore } from '../../store/recordStore';
import { useUserStore } from '../../store/userStore';
import ScaleButton from '../../components/common/ScaleButton';
import SignUpBottomSheet from '../../components/common/SignUpBottomSheet';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const EMOTIONS: { type: EmotionType; label: string }[] = [
  { type: 'excited', label: '흥분' },
  { type: 'anxious', label: '불안' },
  { type: 'greedy', label: '욕심' },
  { type: 'fearful', label: '두려움' },
  { type: 'calm', label: '차분' },
  { type: 'confused', label: '혼란' },
];

export default function PostTradeScreen() {
  const navigation = useNavigation<Nav>();
  const addRecord = useRecordStore((s) => s.addRecord);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);

  const [stockName, setStockName] = useState('');
  const [direction, setDirection] = useState<TradeDirection | null>(null);
  const [emotions, setEmotions] = useState<EmotionType[]>([]);
  const [memo, setMemo] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);

  const canSave = stockName.trim().length > 0 && direction !== null && emotions.length > 0;

  const toggleEmotion = (type: EmotionType) => {
    setEmotions((prev) =>
      prev.includes(type) ? prev.filter((e) => e !== type) : [...prev, type]
    );
  };

  const handleSave = () => {
    if (!canSave || !direction) return;
    const emotionLabel = emotions
      .map((e) => EMOTIONS.find((x) => x.type === e)?.label ?? e)
      .join(', ');
    addRecord({
      type: 'post',
      stock_name: stockName.trim(),
      direction,
      emotions,
      emotion_label: emotionLabel,
      messages: [],
      trade_outcome: 'traded',
      memo: memo.trim() || undefined,
    });
    if (!isLoggedIn) {
      setShowSignUp(true);
    } else {
      navigation.navigate('Tabs');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>매매 기록</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 종목명 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>종목명</Text>
            <TextInput
              style={styles.textInput}
              placeholder="예: 삼성전자, TSLA"
              placeholderTextColor={Colors.textMuted}
              value={stockName}
              onChangeText={setStockName}
              autoFocus
              returnKeyType="done"
            />
          </View>

          {/* 매수/매도 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>매수 / 매도</Text>
            <View style={styles.directionRow}>
              {(['buy', 'sell'] as TradeDirection[]).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dirBtn, direction === d && styles.dirBtnActive]}
                  onPress={() => setDirection(d)}
                >
                  <Text style={[styles.dirBtnText, direction === d && styles.dirBtnTextActive]}>
                    {d === 'buy' ? '매수' : '매도'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 감정 상태 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>매매 당시 감정</Text>
            <View style={styles.emotionGrid}>
              {EMOTIONS.map(({ type, label }) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.emotionChip, emotions.includes(type) && styles.emotionChipActive]}
                  onPress={() => toggleEmotion(type)}
                >
                  <Text style={[styles.emotionChipText, emotions.includes(type) && styles.emotionChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 메모 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>한 줄 메모 (선택)</Text>
            <TextInput
              style={[styles.textInput, styles.memoInput]}
              placeholder="매매 이유나 느낌을 짧게 남겨봐요"
              placeholderTextColor={Colors.textMuted}
              value={memo}
              onChangeText={setMemo}
              multiline
              maxLength={100}
            />
          </View>

          <ScaleButton
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveBtnText}>저장하기</Text>
          </ScaleButton>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <SignUpBottomSheet
        visible={showSignUp}
        trigger="save"
        onClose={() => { setShowSignUp(false); navigation.navigate('Tabs'); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: Colors.textSecondary },
  headerTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },

  content: { padding: 24, gap: 28 },

  field: { gap: 12 },
  fieldLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: Colors.surface, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: Colors.textPrimary,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  memoInput: { minHeight: 80, textAlignVertical: 'top' },

  directionRow: { flexDirection: 'row', gap: 10 },
  dirBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.border,
    alignItems: 'center',
  },
  dirBtnActive: { borderColor: Colors.cta, borderWidth: 1.5, backgroundColor: Colors.background },
  dirBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  dirBtnTextActive: { color: Colors.cta, fontWeight: '600' },

  emotionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emotionChip: {
    paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 20, backgroundColor: Colors.surface,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  emotionChipActive: { borderColor: Colors.cta, borderWidth: 1.5, backgroundColor: Colors.background },
  emotionChipText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  emotionChipTextActive: { color: Colors.cta, fontWeight: '600' },

  saveBtn: {
    backgroundColor: Colors.cta, borderRadius: 10,
    padding: 17, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
