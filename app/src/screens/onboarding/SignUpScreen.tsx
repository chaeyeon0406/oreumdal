import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { useUserStore } from '../../store/userStore';
import ScaleButton from '../../components/common/ScaleButton';

type Nav = NativeStackNavigationProp<MainStackParamList, 'SignUp'>;
type Route = RouteProp<MainStackParamList, 'SignUp'>;

type Step = 'social' | 'profile';

export default function SignUpScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const login = useUserStore((s) => s.login);

  const [step, setStep] = useState<Step>('social');
  const [nickname, setNickname] = useState('');
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const canComplete = nickname.trim().length > 0 && agreeRequired;

  const handleSocial = (_provider: 'google' | 'apple') => {
    setStep('profile');
  };

  const handleComplete = () => {
    if (!canComplete) return;
    login(nickname.trim());
    navigation.navigate('Tabs');
  };

  if (step === 'social') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.top}>
            <Text style={styles.title}>오름달 가입</Text>
            <Text style={styles.desc}>
              가입하면 코칭 기록이 저장되고{'\n'}더 정확한 분석을 받을 수 있어요
            </Text>
          </View>

          <View style={styles.buttons}>
            <ScaleButton
              style={styles.googleBtn}
              onPress={() => handleSocial('google')}
            >
              <Text style={styles.googleBtnText}>Google로 계속하기</Text>
            </ScaleButton>

            <ScaleButton
              style={styles.appleBtn}
              onPress={() => handleSocial('apple')}
            >
              <Text style={styles.appleBtnText}>Apple로 계속하기</Text>
            </ScaleButton>

            <Text style={styles.terms}>
              시작하면 이용약관 및 개인정보처리방침에 동의하게 됩니다
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.profileContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => setStep('social')} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title}>닉네임을 정해봐요</Text>
          <Text style={styles.desc}>앱 안에서 사용할 이름이에요</Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder="최대 10자"
              placeholderTextColor={Colors.textMuted}
              value={nickname}
              onChangeText={(v) => setNickname(v.slice(0, 10))}
              autoFocus
              returnKeyType="done"
            />
            <Text style={styles.charCount}>{nickname.length} / 10</Text>
          </View>

          <View style={styles.consentSection}>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setAgreeRequired(!agreeRequired)}
            >
              <View style={[styles.checkbox, agreeRequired && styles.checkboxActive]}>
                {agreeRequired && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>
                <Text style={styles.required}>[필수] </Text>
                이용약관 및 개인정보처리방침 동의
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setAgreeMarketing(!agreeMarketing)}
            >
              <View style={[styles.checkbox, agreeMarketing && styles.checkboxActive]}>
                {agreeMarketing && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>
                <Text style={styles.optional}>[선택] </Text>
                마케팅 정보 수신 동의
              </Text>
            </TouchableOpacity>
          </View>

          <ScaleButton
            style={[styles.completeBtn, !canComplete && styles.completeBtnDisabled]}
            onPress={handleComplete}
            disabled={!canComplete}
          >
            <Text style={styles.completeBtnText}>가입 완료</Text>
          </ScaleButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    padding: 24,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  profileContent: {
    padding: 24,
    paddingBottom: 48,
    gap: 24,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 8,
  },
  closeBtnText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  top: { gap: 14, flex: 1, justifyContent: 'center' },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  desc: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 15 * 1.7,
  },
  buttons: { gap: 10 },
  googleBtn: {
    borderRadius: 10,
    padding: 17,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  appleBtn: {
    borderRadius: 10,
    padding: 17,
    alignItems: 'center',
    backgroundColor: Colors.cta,
  },
  appleBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
  },
  terms: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  inputWrap: { gap: 6 },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  consentSection: { gap: 14 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: Colors.cta,
    backgroundColor: Colors.cta,
  },
  checkmark: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  required: { color: Colors.cta, fontWeight: '600' },
  optional: { color: Colors.textMuted },
  completeBtn: {
    backgroundColor: Colors.cta,
    borderRadius: 10,
    padding: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  completeBtnDisabled: { opacity: 0.35 },
  completeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
