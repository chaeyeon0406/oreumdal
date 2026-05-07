import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Alert, Modal, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import ScaleButton from '../../components/common/ScaleButton';
import { useUserStore, NotifSettings } from '../../store/userStore';
import { useRecordStore } from '../../store/recordStore';
import { RootStackParamList } from '../../types';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  scheduleWeeklyReport,
  cancelWeeklyReport,
} from '../../lib/notifications';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PERSONALITY_LABEL: Record<string, string> = {
  analytical: '신중한 분석형',
  reactive: '감정적 반응형',
  optimistic: '낙관적 직관형',
  hesitant: '우유부단 보류형',
};

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  kakao: '카카오',
  apple: 'Apple',
};

export default function MyPageScreen() {
  const navigation = useNavigation<Nav>();
  const { principles, setPrinciples, personalityType, nickname, provider, logout, notifSettings, setNotifSettings } = useUserStore();
  const clearRecords = useRecordStore((s) => s.clearRecords);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(principles);
  const [showAccount, setShowAccount] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(nickname);

  const handleNotifToggleDaily = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('알림 권한 필요', '설정 > 오름달에서 알림을 허용해주세요.');
        return;
      }
      await scheduleDailyReminder(9);
    } else {
      await cancelDailyReminder();
    }
    setNotifSettings({ ...notifSettings, dailyEnabled: val });
  };

  const handleNotifToggleWeekly = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('알림 권한 필요', '설정 > 오름달에서 알림을 허용해주세요.');
        return;
      }
      await scheduleWeeklyReport(2, 9); // 2=월요일, 9시
    } else {
      await cancelWeeklyReport();
    }
    setNotifSettings({ ...notifSettings, weeklyEnabled: val });
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          logout();
          clearRecords();
          navigation.replace('Main');
        },
      },
    ]);
  };

  const handleSaveNickname = () => {
    if (!nicknameDraft.trim()) return;
    useUserStore.getState().login({
      nickname: nicknameDraft.trim(),
      userId: useUserStore.getState().userId,
      accessToken: useUserStore.getState().accessToken,
      refreshToken: useUserStore.getState().refreshToken,
      provider: useUserStore.getState().provider,
    });
    setEditingNickname(false);
  };

  const menuItems = [
    { label: '알림 설정', onPress: () => { setNotifDraft(notifSettings); setShowNotif(true); } },
    { label: '계정 설정', onPress: () => { setNicknameDraft(nickname); setShowAccount(true); } },
    { label: '로그아웃', danger: true, onPress: handleLogout },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>마이</Text>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>투자 성향</Text>
            <Text style={styles.personalityType}>
              {personalityType ? PERSONALITY_LABEL[personalityType] ?? personalityType : '아직 테스트 전이에요'}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>나의 투자 원칙</Text>
              <ScaleButton onPress={() => {
                if (editing) { setPrinciples(draft); setEditing(false); }
                else { setDraft(principles); setEditing(true); }
              }}>
                <Text style={styles.editBtn}>{editing ? '저장' : '수정'}</Text>
              </ScaleButton>
            </View>
            {editing ? (
              <TextInput
                style={styles.principlesInput}
                value={draft}
                onChangeText={setDraft}
                multiline
                placeholder={'예) 손절 -10% 이상은 반드시 실행\n예) 모르는 종목은 절대 사지 않는다'}
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={principles ? styles.principlesText : styles.principlesEmpty}>
                {principles || 'AI 코칭의 기준이 되는 나만의 원칙을 적어봐요.\n원칙이 있으면 더 정확한 코칭을 받을 수 있어요.'}
              </Text>
            )}
          </View>

          <View style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <ScaleButton
                key={item.label}
                style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
                onPress={item.onPress}
              >
                <Text style={[styles.menuLabel, item.danger && { color: Colors.reconsider }]}>{item.label}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </ScaleButton>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 알림 설정 모달 */}
      <Modal visible={showNotif} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>알림 설정</Text>
            <ScaleButton onPress={() => setShowNotif(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </ScaleButton>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>

            {/* 매일 리마인더 */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ gap: 4 }}>
                  <Text style={styles.cardLabel}>매일 리마인더</Text>
                  <Text style={styles.notifTime}>매일 오전 9시</Text>
                </View>
                <Switch
                  value={notifSettings.dailyEnabled}
                  onValueChange={handleNotifToggleDaily}
                  trackColor={{ true: Colors.cta }}
                  thumbColor="#FFF"
                />
              </View>
              <Text style={styles.principlesEmpty}>매매 전 체크를 잊지 않도록 매일 알려드려요</Text>
            </View>

            {/* 주간 리포트 */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ gap: 4 }}>
                  <Text style={styles.cardLabel}>주간 리포트</Text>
                  <Text style={styles.notifTime}>매주 월요일 오전 9시</Text>
                </View>
                <Switch
                  value={notifSettings.weeklyEnabled}
                  onValueChange={handleNotifToggleWeekly}
                  trackColor={{ true: Colors.cta }}
                  thumbColor="#FFF"
                />
              </View>
              <Text style={styles.principlesEmpty}>지난주 나의 투자 심리 패턴을 알려드려요</Text>
            </View>

            {/* 코칭 후 결과 추적 */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>코칭 후 결과 추적</Text>
              <Text style={styles.principlesEmpty}>
                코칭 화면에서 "나중에 알려주기"를 선택하면 8시간 후 자동으로 알림을 보내드려요
              </Text>
            </View>

          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 계정 설정 모달 */}
      <Modal visible={showAccount} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>계정 설정</Text>
            <ScaleButton onPress={() => { setShowAccount(false); setEditingNickname(false); }} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </ScaleButton>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>닉네임</Text>
                {!editingNickname && (
                  <ScaleButton onPress={() => setEditingNickname(true)}>
                    <Text style={styles.editBtn}>수정</Text>
                  </ScaleButton>
                )}
              </View>
              {editingNickname ? (
                <View style={{ gap: 10 }}>
                  <TextInput
                    style={styles.principlesInput}
                    value={nicknameDraft}
                    onChangeText={(v) => setNicknameDraft(v.slice(0, 10))}
                    autoFocus
                    maxLength={10}
                    returnKeyType="done"
                  />
                  <ScaleButton
                    style={[styles.saveNicknameBtn, !nicknameDraft.trim() && { opacity: 0.4 }]}
                    onPress={handleSaveNickname}
                    disabled={!nicknameDraft.trim()}
                  >
                    <Text style={styles.saveNicknameBtnText}>저장</Text>
                  </ScaleButton>
                </View>
              ) : (
                <Text style={styles.principlesText}>{nickname || '-'}</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>소셜 로그인</Text>
              <Text style={styles.principlesText}>{PROVIDER_LABEL[provider] || provider || '-'}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, gap: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 26, fontWeight: '600', color: Colors.textPrimary, paddingTop: 8, paddingBottom: 4 },

  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 22, gap: 14, borderWidth: 0.5, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 11, fontWeight: '500', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  personalityType: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  editBtn: { fontSize: 13, color: Colors.accent, fontWeight: '500' },
  principlesInput: { fontSize: 15, color: Colors.textPrimary, lineHeight: 15 * 1.7, minHeight: 80, textAlignVertical: 'top', borderWidth: 0.5, borderColor: Colors.border, borderRadius: 10, padding: 12, backgroundColor: Colors.background },
  principlesText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 15 * 1.7 },
  principlesEmpty: { fontSize: 15, color: Colors.textMuted, lineHeight: 15 * 1.7 },

  menuCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  menuLabel: { fontSize: 15, color: Colors.textPrimary },
  menuArrow: { fontSize: 18, color: Colors.textMuted },

  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  modalClose: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  modalCloseText: { fontSize: 18, color: Colors.textSecondary },
  modalContent: { padding: 24, gap: 16 },

  saveNicknameBtn: { backgroundColor: Colors.cta, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveNicknameBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  notifTime: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
});
