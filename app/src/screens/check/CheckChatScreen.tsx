import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, SafeAreaView,
  KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { MainStackParamList, ChatMessage } from '../../types';
import ScaleButton from '../../components/common/ScaleButton';
import { useRecordStore } from '../../store/recordStore';
import { useUserStore } from '../../store/userStore';
import SignUpBottomSheet from '../../components/common/SignUpBottomSheet';
import { sendCoachingMessage, generateConclusion } from '../../lib/ai';
import { buildRecordSummary } from '../../lib/ai/recordSummary';
import { fetchMarketContext } from '../../lib/ai/marketContext';

type Nav = NativeStackNavigationProp<MainStackParamList, 'CheckChat'>;
type Route = RouteProp<MainStackParamList, 'CheckChat'>;

type InputMode = 'q1' | 'q2' | 'q3' | 'done';
type TradeOutcome = 'pending' | 'done' | 'cancelled' | null;

const Q1_OPTIONS = ['가격 흐름이 좋아서', '뉴스·이슈 봤어요', '감이 좋아서', '내 원칙에 따라'];
const Q2_OPTIONS = ['시장 흐름을 보고 판단했어요', '뉴스나 정보를 봤어요', '왠지 불안해서요', '다들 하는 것 같아서요'];
const Q3_OPTIONS = ['원칙이랑 맞아요', '잘 모르겠어요', '솔직히 아닌 것 같아요'];

interface ResultData {
  score: number;
  verdict: '다시 생각해봐요' | '괜찮아요';
  reason: string;
}

function TypingBubble() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 200),
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        Animated.delay(600 - i * 200),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={styles.bubbleAI}>
      <View style={styles.typingRow}>
        {dots.map((dot, i) => <Animated.View key={i} style={[styles.typingDot, { opacity: dot }]} />)}
      </View>
    </View>
  );
}

export default function CheckChatScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { stockName, direction, emotions, emotionLabel } = route.params;
  const directionText = direction === 'buy' ? '매수' : '매도';
  const addRecord = useRecordStore((s) => s.addRecord);
  const records = useRecordStore((s) => s.records);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const principles = useUserStore((s) => s.principles);

  // 세션 시작 시 한 번만 수집하는 컨텍스트 (ref로 관리, 리렌더 불필요)
  const sessionCtx = useRef({ recordSummary: '', marketContext: '' });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('done'); // 'done' until Q1 arrives
  const [customText, setCustomText] = useState('');
  const [result, setResult] = useState<ResultData | null>(null);
  const [tradeOutcome, setTradeOutcome] = useState<TradeOutcome>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const outcomeFadeAnim = useRef(new Animated.Value(0)).current;

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

  const callAIQuestion = async (currentMessages: ChatMessage[]) => {
    setIsTyping(true);
    scrollToBottom();
    try {
      const reply = await sendCoachingMessage({
        stockName,
        direction,
        emotions,
        emotionLabel,
        investmentPrinciples: principles || undefined,
        recordSummary: sessionCtx.current.recordSummary || undefined,
        marketContext: sessionCtx.current.marketContext || undefined,
        messages: currentMessages,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      const userCount = currentMessages.filter(m => m.role === 'user').length;
      if (userCount === 0) setInputMode('q1');
      else if (userCount === 1) setInputMode('q2');
      else setInputMode('q3');
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '잠시 연결이 불안정해요. 다시 시도해주세요.',
      }]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const callAIConclusion = async (currentMessages: ChatMessage[]) => {
    setIsTyping(true);
    scrollToBottom();
    try {
      const res = await generateConclusion({
        stockName,
        direction,
        emotions,
        emotionLabel,
        investmentPrinciples: principles || undefined,
        recordSummary: sessionCtx.current.recordSummary || undefined,
        marketContext: sessionCtx.current.marketContext || undefined,
        messages: currentMessages,
      });
      setResult({
        score: res.impulseScore,
        verdict: res.conclusion === 'ok' ? '괜찮아요' : '다시 생각해봐요',
        reason: res.reason,
      });
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch {
      setResult({ score: 55, verdict: '다시 생각해봐요', reason: '결과를 분석하지 못했어요' });
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const handleUserChoice = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setCustomText('');
    setInputMode('done');
    scrollToBottom();

    const userCount = nextMessages.filter(m => m.role === 'user').length;
    if (userCount < 3) {
      callAIQuestion(nextMessages);
    } else {
      callAIConclusion(nextMessages);
    }
  };

  const handleQ3Choice = (choice: string) => {
    const text = customText.trim() ? `${choice} — ${customText.trim()}` : choice;
    handleUserChoice(text);
  };

  useEffect(() => {
    const init = async () => {
      sessionCtx.current.recordSummary = buildRecordSummary(records, stockName);
      sessionCtx.current.marketContext = await fetchMarketContext(stockName).catch(() => '');
      callAIQuestion([]);
    };
    init();
  }, []);

  const doSave = () => {
    if (result) {
      addRecord({
        type: 'check',
        stock_name: stockName,
        direction,
        emotions,
        emotion_label: emotionLabel,
        verdict: result.verdict === '괜찮아요' ? 'ok' : 'reconsider',
        impulse_score: result.score,
        reason: result.reason,
        messages,
        trade_outcome:
          tradeOutcome === 'done' ? 'traded'
          : tradeOutcome === 'cancelled' ? 'skipped'
          : null,
      });
    }
  };

  const handleSaveAndClose = () => {
    doSave();
    if (!isLoggedIn) {
      setShowSignUp(true);
    } else {
      navigation.goBack();
    }
  };

  const handleLaterOutcomeNotify = () => {
    Alert.alert(
      '알림 예약',
      `오늘 저녁 8시에 "${stockName} ${directionText}, 결국 어떻게 하셨나요?" 알림을 보내드릴게요.\n(알림 기능은 곧 추가 예정)`
    );
  };

  const handleTradeOutcome = (outcome: TradeOutcome) => {
    setTradeOutcome(outcome);
    Animated.timing(outcomeFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    scrollToBottom();
  };

  const renderChoiceArea = (options: string[], onSelect: (v: string) => void) => (
    <View style={styles.inputArea}>
      <View style={styles.choiceGrid}>
        {options.map(opt => (
          <ScaleButton key={opt} style={styles.choiceBtn} onPress={() => onSelect(opt)}>
            <Text style={styles.choiceBtnText}>{opt}</Text>
          </ScaleButton>
        ))}
      </View>
      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          placeholder="직접 입력..."
          placeholderTextColor={Colors.textMuted}
          value={customText}
          onChangeText={setCustomText}
          returnKeyType="send"
          onSubmitEditing={() => handleUserChoice(customText.trim())}
        />
        <ScaleButton
          style={[styles.sendBtn, !customText.trim() && styles.sendBtnDisabled]}
          onPress={() => handleUserChoice(customText.trim())}
          disabled={!customText.trim()}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </ScaleButton>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <ScaleButton onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </ScaleButton>
          <Text style={styles.headerTitle}>{stockName} · {directionText}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, i) => (
            <View key={i} style={msg.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAI}>
              <View style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI}>
                <Text style={msg.role === 'user' ? styles.textUser : styles.textAI}>{msg.content}</Text>
              </View>
            </View>
          ))}
          {isTyping && <View style={styles.bubbleWrapAI}><TypingBubble /></View>}

          {result && (
            <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
              <Text style={styles.resultLabel}>코칭 결과</Text>
              <Text style={[styles.resultVerdict, result.verdict === '괜찮아요' ? styles.verdictOk : styles.verdictReconsider]}>
                {result.verdict}
              </Text>

              <View style={styles.gaugeSection}>
                <View style={styles.gaugeHeader}>
                  <Text style={styles.gaugeLabel}>충동도</Text>
                  <Text style={[styles.gaugeScore, result.score >= 55 ? styles.verdictReconsider : styles.verdictOk]}>
                    {result.score}
                  </Text>
                </View>
                <View style={styles.gaugeBg}>
                  <View style={[styles.gaugeFill, { width: `${result.score}%` as any }]} />
                </View>
              </View>

              <Text style={styles.resultReason}>{result.reason}</Text>

              <View style={styles.outcomeSectionDivider} />
              <Text style={styles.outcomeSectionLabel}>결국 어떻게 하셨어요?</Text>

              {tradeOutcome === null ? (
                <View style={styles.outcomeButtons}>
                  {(['아직 안 했어요', '했어요', '안 하기로 했어요', '나중에 알려주기'] as const).map((label, i) => (
                    <ScaleButton
                      key={label}
                      style={styles.outcomeBtn}
                      onPress={() => {
                        if (i === 3) { handleLaterOutcomeNotify(); return; }
                        handleTradeOutcome(i === 0 ? 'pending' : i === 1 ? 'done' : 'cancelled');
                      }}
                    >
                      <Text style={styles.outcomeBtnText}>{label}</Text>
                    </ScaleButton>
                  ))}
                </View>
              ) : (
                <Animated.View style={{ opacity: outcomeFadeAnim }}>
                  <Text style={styles.outcomeConfirm}>
                    {tradeOutcome === 'pending' ? '아직 결정하지 않으셨군요. 충분히 생각해보세요.'
                      : tradeOutcome === 'done' ? '기록해두었어요. 결과는 나중에 돌아봐도 좋아요.'
                      : '잘 하셨어요. 원칙을 지킨 선택이에요.'}
                  </Text>
                </Animated.View>
              )}

              <View style={styles.resultActions}>
                <ScaleButton style={styles.saveBtn} onPress={handleSaveAndClose}>
                  <Text style={styles.saveBtnText}>기록 저장하고 닫기</Text>
                </ScaleButton>
              </View>
            </Animated.View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>

        {!result && inputMode !== 'done' && (
          <>
            {inputMode === 'q1' && renderChoiceArea(Q1_OPTIONS, handleUserChoice)}
            {inputMode === 'q2' && renderChoiceArea(Q2_OPTIONS, handleUserChoice)}
            {inputMode === 'q3' && (
              <View style={styles.inputArea}>
                <View style={styles.choiceGrid}>
                  {Q3_OPTIONS.map(opt => (
                    <ScaleButton key={opt} style={styles.choiceBtn} onPress={() => handleQ3Choice(opt)}>
                      <Text style={styles.choiceBtnText}>{opt}</Text>
                    </ScaleButton>
                  ))}
                </View>
                <View style={styles.customRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="덧붙이고 싶은 말 (선택)"
                    placeholderTextColor={Colors.textMuted}
                    value={customText}
                    onChangeText={setCustomText}
                    returnKeyType="send"
                    onSubmitEditing={() => handleUserChoice(customText.trim())}
                  />
                  <ScaleButton
                    style={[styles.sendBtn, !customText.trim() && styles.sendBtnDisabled]}
                    onPress={() => handleUserChoice(customText.trim())}
                    disabled={!customText.trim()}
                  >
                    <Text style={styles.sendBtnText}>→</Text>
                  </ScaleButton>
                </View>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
      <SignUpBottomSheet
        visible={showSignUp}
        trigger="chk"
        onClose={() => { setShowSignUp(false); navigation.goBack(); }}
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

  chatContent: { padding: 20, gap: 16, paddingBottom: 8 },
  bubbleWrapAI: { alignSelf: 'flex-start', maxWidth: '82%' },
  bubbleWrapUser: { alignSelf: 'flex-end', maxWidth: '82%' },
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
  textAI: { fontSize: 15, color: Colors.textPrimary, lineHeight: 15 * 1.7 },
  textUser: { fontSize: 15, color: '#FFF', lineHeight: 15 * 1.7 },
  typingRow: { flexDirection: 'row', gap: 4, padding: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textMuted },

  // 결과 카드
  resultCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 24, gap: 14,
    borderWidth: 0.5, borderColor: Colors.border, marginTop: 8,
  },
  resultLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  resultVerdict: { fontSize: 24, fontWeight: '600', letterSpacing: -0.3 },
  verdictOk: { color: Colors.ok },
  verdictReconsider: { color: Colors.reconsider },
  gaugeSection: { gap: 8 },
  gaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  gaugeLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  gaugeScore: { fontSize: 22, fontWeight: '600' },
  gaugeBg: { height: 4, backgroundColor: Colors.impulseBar, borderRadius: 4, overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: Colors.impulse, borderRadius: 4 },
  resultReason: { fontSize: 13, color: Colors.textSecondary, lineHeight: 13 * 1.7 },

  // 결국 어떻게 하셨어요?
  outcomeSectionDivider: { height: 0.5, backgroundColor: Colors.border, marginVertical: 2 },
  outcomeSectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  outcomeButtons: { gap: 8 },
  outcomeBtn: {
    paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: Colors.background, borderWidth: 0.5, borderColor: Colors.border,
    alignItems: 'center',
  },
  outcomeBtnText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  outcomeConfirm: {
    fontSize: 13, color: Colors.textSecondary, lineHeight: 13 * 1.7,
    fontStyle: 'italic',
  },

  // 액션 버튼
  resultActions: { gap: 8, marginTop: 4 },
  saveBtn: {
    backgroundColor: Colors.cta, borderRadius: 10,
    padding: 15, alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // 입력 영역
  inputArea: {
    borderTopWidth: 0.5, borderTopColor: Colors.border,
    padding: 20, gap: 12, backgroundColor: Colors.background,
  },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choiceBtn: {
    paddingVertical: 12, paddingHorizontal: 18,
    borderRadius: 20, backgroundColor: Colors.surface,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  choiceBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  sendBtn: {
    backgroundColor: Colors.cta, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
