import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, SafeAreaView,
  KeyboardAvoidingView, Platform, Animated, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { MainStackParamList, ChatMessage } from '../../types';
import ScaleButton from '../../components/common/ScaleButton';
import { useRecordStore } from '../../store/recordStore';
import { useUserStore } from '../../store/userStore';
import SignUpBottomSheet from '../../components/common/SignUpBottomSheet';

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
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('q1');
  const [customText, setCustomText] = useState('');
  const [result, setResult] = useState<ResultData | null>(null);
  const [tradeOutcome, setTradeOutcome] = useState<TradeOutcome>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const outcomeFadeAnim = useRef(new Animated.Value(0)).current;

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

  const showTypingThen = async (msg: string, delay = 1000) => {
    setIsTyping(true);
    scrollToBottom();
    await new Promise(r => setTimeout(r, delay));
    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    scrollToBottom();
  };

  const addUser = (content: string) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
    scrollToBottom();
  };

  useEffect(() => {
    showTypingThen(
      `${stockName} ${directionText}를 고려하고 있군요.\n\n이 종목을 ${directionText}하려는 이유가 뭔가요?`,
      1200
    );
  }, []);

  const submit = async (userText: string, nextQ: () => Promise<void>) => {
    addUser(userText);
    setCustomText('');
    setInputMode('done');
    await nextQ();
  };

  const handleQ1 = (choice: string) => {
    submit(choice, async () => {
      await showTypingThen(
        `지금 이 느낌, 어디서 왔을 것 같아요?\n\n감정("${emotionLabel}")이 판단에 얼마나 영향을 줬을지 함께 생각해봐요.`,
        1000
      );
      setInputMode('q2');
    });
  };

  const handleQ2 = (choice: string) => {
    submit(choice, async () => {
      await showTypingThen(
        '잘 들었어요.\n\n마지막으로, 지금 이 결정이 내가 세운 투자 원칙이랑 맞는 것 같아요?',
        1000
      );
      setInputMode('q3');
    });
  };

  const handleQ3 = async (choice: string) => {
    const userText = customText.trim() ? `${choice} — ${customText.trim()}` : choice;
    addUser(userText);
    setCustomText('');
    setInputMode('done');

    await new Promise(r => setTimeout(r, 1200));

    const score =
      choice === '솔직히 아닌 것 같아요' ? 78
      : choice === '잘 모르겠어요' ? 55
      : 30;

    setResult({
      score,
      verdict: score >= 55 ? '다시 생각해봐요' : '괜찮아요',
      reason:
        choice === '솔직히 아닌 것 같아요' ? '원칙과 어긋난 판단일 가능성이 높아요'
        : choice === '잘 모르겠어요' ? '확신 없는 상태에서의 매매는 위험할 수 있어요'
        : '원칙에 기반한 판단으로 보여요',
    });

    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    scrollToBottom();
  };

  const handleCustomSubmit = (mode: InputMode) => {
    if (!customText.trim()) return;
    if (mode === 'q1') handleQ1(customText.trim());
    else if (mode === 'q2') handleQ2(customText.trim());
    else if (mode === 'q3') handleQ3(customText.trim());
  };

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

  const handleLaterNotify = () => {
    // TODO: expo-notifications 스케줄링
    Alert.alert('알림 예약', '나중에 결과를 알려드릴게요. (알림 기능은 곧 추가 예정)');
    navigation.goBack();
  };

  const handleTradeOutcome = (outcome: TradeOutcome) => {
    setTradeOutcome(outcome);
    Animated.timing(outcomeFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    scrollToBottom();
  };

  const handleLaterOutcomeNotify = () => {
    // TODO: expo-notifications — 당일 저녁 8시 스케줄
    Alert.alert(
      '알림 예약',
      `오늘 저녁 8시에 "${stockName} ${directionText}, 결국 어떻게 하셨나요?" 알림을 보내드릴게요.\n(알림 기능은 곧 추가 예정)`
    );
  };

  const renderChoiceArea = (mode: InputMode, options: string[], onSelect: (v: string) => void) => (
    <View style={styles.inputArea}>
      <View style={styles.choiceGrid}>
        {options.map(opt => (
          <TouchableOpacity key={opt} style={styles.choiceBtn} onPress={() => onSelect(opt)}>
            <Text style={styles.choiceBtnText}>{opt}</Text>
          </TouchableOpacity>
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
          onSubmitEditing={() => handleCustomSubmit(mode)}
        />
        <ScaleButton
          style={[styles.sendBtn, !customText.trim() && styles.sendBtnDisabled]}
          onPress={() => handleCustomSubmit(mode)}
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
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

              {/* 결국 어떻게 하셨어요? */}
              <View style={styles.outcomeSectionDivider} />
              <Text style={styles.outcomeSectionLabel}>결국 어떻게 하셨어요?</Text>

              {tradeOutcome === null ? (
                <View style={styles.outcomeButtons}>
                  {(['아직 안 했어요', '했어요', '안 하기로 했어요', '나중에 알려주기'] as const).map((label, i) => (
                    <TouchableOpacity
                      key={label}
                      style={styles.outcomeBtn}
                      onPress={() => {
                        if (i === 3) { handleLaterOutcomeNotify(); return; }
                        handleTradeOutcome(i === 0 ? 'pending' : i === 1 ? 'done' : 'cancelled');
                      }}
                    >
                      <Text style={styles.outcomeBtnText}>{label}</Text>
                    </TouchableOpacity>
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

              {/* 액션 버튼 */}
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
            {inputMode === 'q1' && renderChoiceArea('q1', Q1_OPTIONS, handleQ1)}
            {inputMode === 'q2' && renderChoiceArea('q2', Q2_OPTIONS, handleQ2)}
            {inputMode === 'q3' && (
              <View style={styles.inputArea}>
                <View style={styles.choiceGrid}>
                  {Q3_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt} style={styles.choiceBtn} onPress={() => handleQ3(opt)}>
                      <Text style={styles.choiceBtnText}>{opt}</Text>
                    </TouchableOpacity>
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
                    onSubmitEditing={() => handleCustomSubmit('q3')}
                  />
                  <ScaleButton
                    style={[styles.sendBtn, !customText.trim() && styles.sendBtnDisabled]}
                    onPress={() => handleCustomSubmit('q3')}
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

  chatContent: { padding: 20, gap: 12, paddingBottom: 8 },
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
  outcomeSectionLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.textPrimary,
  },
  outcomeButtons: { gap: 8 },
  outcomeBtn: {
    paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: Colors.background, borderWidth: 0.5, borderColor: Colors.border,
    alignItems: 'center',
  },
  outcomeBtnText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  outcomeLaterText: {
    fontSize: 13, color: Colors.textMuted, textAlign: 'center',
    paddingVertical: 6,
  },
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
  laterBtn: {
    backgroundColor: Colors.surface, borderRadius: 10,
    padding: 15, alignItems: 'center',
    borderWidth: 0.5, borderColor: Colors.border,
  },
  laterBtnText: { fontSize: 15, color: Colors.textSecondary },

  // 입력 영역
  inputArea: {
    borderTopWidth: 0.5, borderTopColor: Colors.border,
    padding: 16, gap: 10, backgroundColor: Colors.background,
  },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceBtn: {
    paddingVertical: 10, paddingHorizontal: 16,
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
