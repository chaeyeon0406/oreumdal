import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Modal, Animated,
  Dimensions, TouchableWithoutFeedback, TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { EmotionType, TradeDirection } from '../../types';
import ScaleButton from '../common/ScaleButton';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.72;

const EMOTIONS: { type: EmotionType; label: string }[] = [
  { type: 'excited', label: '흥분' }, { type: 'anxious', label: '불안' },
  { type: 'greedy', label: '욕심' }, { type: 'fearful', label: '두려움' },
  { type: 'calm', label: '차분' }, { type: 'confused', label: '혼란' },
];

interface Props {
  visible: boolean;
  onStart: (p: { stockName: string; direction: TradeDirection; emotions: EmotionType[] }) => void;
  onClose: () => void;
}

export default function CheckBottomSheet({ visible, onStart, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [stockName, setStockName] = useState('');
  const [direction, setDirection] = useState<TradeDirection | null>(null);
  const [emotions, setEmotions] = useState<EmotionType[]>([]);

  const canStart = stockName.trim().length > 0 && direction !== null && emotions.length > 0;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
      ]).start();
      setStockName(''); setDirection(null); setEmotions([]);
    }
  }, [visible]);

  const toggleEmotion = (type: EmotionType) =>
    setEmotions(prev => prev.includes(type) ? prev.filter(e => e !== type) : [...prev, type]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handleWrap}><View style={styles.handle} /></View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>어떤 종목이 마음에 걸려요?</Text>

            <View style={styles.section}>
              <TextInput
                style={styles.input}
                placeholder="예. 삼성전자, 테슬라"
                placeholderTextColor={Colors.textMuted}
                value={stockName}
                onChangeText={setStockName}
                returnKeyType="done"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>방향</Text>
              <View style={styles.pillRow}>
                {(['buy', 'sell'] as TradeDirection[]).map((d) => (
                  <TouchableOpacity key={d} style={[styles.pill, direction === d && styles.pillActive]} onPress={() => setDirection(d)}>
                    <Text style={[styles.pillText, direction === d && styles.pillTextActive]}>{d === 'buy' ? '매수' : '매도'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>지금 감정 (복수 선택)</Text>
              <View style={styles.emotionGrid}>
                {EMOTIONS.map((e) => (
                  <TouchableOpacity key={e.type} style={[styles.pill, emotions.includes(e.type) && styles.pillActive]} onPress={() => toggleEmotion(e.type)}>
                    <Text style={[styles.pillText, emotions.includes(e.type) && styles.pillTextActive]}>{e.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <ScaleButton
              style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
              onPress={() => canStart && direction && onStart({ stockName: stockName.trim(), direction, emotions })}
              disabled={!canStart}
            >
              <Text style={styles.startBtnText}>코칭 시작</Text>
            </ScaleButton>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT, backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  scrollContent: { padding: 24, gap: 24, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.3 },
  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '500', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  input: { backgroundColor: Colors.surface, borderRadius: 10, padding: 14, fontSize: 16, color: Colors.textPrimary, borderWidth: 0.5, borderColor: Colors.border },
  pillRow: { flexDirection: 'row', gap: 8 },
  emotionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.cta },
  pillText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  pillTextActive: { color: Colors.cta, fontWeight: '600' },
  footer: { padding: 20, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: Colors.border },
  startBtn: { backgroundColor: Colors.cta, borderRadius: 12, padding: 17, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
