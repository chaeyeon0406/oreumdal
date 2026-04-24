import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import ScaleButton from '../../components/common/ScaleButton';
import { useUserStore } from '../../store/userStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PRESET_PRINCIPLES = [
  '손절은 -10% 이내로 한다',
  '뉴스/공시 확인 후에만 매매한다',
  '한 종목에 30% 이상 넣지 않는다',
  '충동이 오면 하루 기다린다',
  '수익률보다 원칙을 먼저 지킨다',
];

const MAX_SELECT = 3;

export default function InvestmentPrinciplesScreen() {
  const navigation = useNavigation<Nav>();
  const setPrinciples = useUserStore((s) => s.setPrinciples);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);

  const [selected, setSelected] = useState<string[]>([]);
  const [customEnabled, setCustomEnabled] = useState(false);
  const [customText, setCustomText] = useState('');

  const totalCount = selected.length + (customEnabled ? 1 : 0);

  const togglePreset = (item: string) => {
    if (selected.includes(item)) {
      setSelected(selected.filter((s) => s !== item));
    } else {
      if (totalCount >= MAX_SELECT) return;
      setSelected([...selected, item]);
    }
  };

  const toggleCustom = () => {
    if (customEnabled) {
      setCustomEnabled(false);
      setCustomText('');
    } else {
      if (totalCount >= MAX_SELECT) return;
      setCustomEnabled(true);
    }
  };

  const canAddMore = totalCount < MAX_SELECT;

  const handleSave = () => {
    const all = [...selected];
    if (customEnabled && customText.trim()) {
      all.push(customText.trim());
    }
    setPrinciples(all.join('\n'));
    completeOnboarding();
    navigation.replace('Main');
  };

  const handleSkip = () => {
    completeOnboarding();
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepLabel}>투자 원칙 설정</Text>
        <Text style={styles.title}>나만의 투자 원칙이{'\n'}있나요?</Text>
        <Text style={styles.desc}>AI 코칭 때 이 원칙을 기준으로 함께 생각해드려요</Text>

        <View style={styles.countRow}>
          <Text style={styles.countText}>최대 3개 선택</Text>
          <Text style={styles.countBadge}>{totalCount} / {MAX_SELECT}</Text>
        </View>

        <View style={styles.pills}>
          {PRESET_PRINCIPLES.map((item) => {
            const active = selected.includes(item);
            const disabled = !active && !canAddMore;
            return (
              <ScaleButton
                key={item}
                style={[
                  styles.pill,
                  active && styles.pillActive,
                  disabled && styles.pillDisabled,
                ]}
                onPress={() => togglePreset(item)}
                disabled={disabled}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive, disabled && styles.pillTextDisabled]}>
                  {item}
                </Text>
              </ScaleButton>
            );
          })}

          {/* 직접 입력 pill */}
          <ScaleButton
            style={[
              styles.pill,
              customEnabled && styles.pillActive,
              !customEnabled && !canAddMore && styles.pillDisabled,
            ]}
            onPress={toggleCustom}
            disabled={!customEnabled && !canAddMore}
          >
            <Text style={[
              styles.pillText,
              customEnabled && styles.pillTextActive,
              !customEnabled && !canAddMore && styles.pillTextDisabled,
            ]}>
              직접 입력
            </Text>
          </ScaleButton>
        </View>

        {customEnabled && (
          <TextInput
            style={styles.customInput}
            value={customText}
            onChangeText={setCustomText}
            placeholder="나만의 원칙을 입력해주세요"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            returnKeyType="done"
          />
        )}

        <ScaleButton
          style={[styles.saveBtn, totalCount === 0 && styles.saveBtnSecondary]}
          onPress={handleSave}
        >
          <Text style={[styles.saveBtnText, totalCount === 0 && styles.saveBtnTextSecondary]}>
            {totalCount > 0 ? '저장하고 시작하기' : '원칙 없이 시작하기'}
          </Text>
        </ScaleButton>

        {totalCount > 0 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingBottom: 48, gap: 20 },

  stepLabel: {
    fontSize: 11, fontWeight: '500', color: Colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', paddingTop: 8,
  },
  title: {
    fontSize: 26, fontWeight: '600', color: Colors.textPrimary,
    lineHeight: 26 * 1.4, letterSpacing: -0.3,
  },
  desc: {
    fontSize: 15, color: Colors.textSecondary, lineHeight: 15 * 1.7,
    marginTop: -4,
  },

  countRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: -8,
  },
  countText: { fontSize: 12, color: Colors.textMuted },
  countBadge: { fontSize: 12, fontWeight: '600', color: Colors.cta },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 0.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    borderWidth: 1.5, borderColor: Colors.cta,
    backgroundColor: Colors.background,
  },
  pillDisabled: {
    opacity: 0.4,
  },
  pillText: { fontSize: 14, color: Colors.textSecondary },
  pillTextActive: { color: Colors.cta, fontWeight: '600' },
  pillTextDisabled: { color: Colors.textMuted },

  customInput: {
    borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 10, padding: 14,
    fontSize: 15, color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    lineHeight: 15 * 1.5,
  },

  saveBtn: {
    backgroundColor: Colors.cta, borderRadius: 10,
    padding: 17, alignItems: 'center', marginTop: 4,
  },
  saveBtnSecondary: {
    backgroundColor: Colors.surface,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  saveBtnTextSecondary: { color: Colors.textPrimary },

  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: { fontSize: 14, color: Colors.textMuted },
});
