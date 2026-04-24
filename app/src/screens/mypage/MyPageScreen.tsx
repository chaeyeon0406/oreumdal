import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import ScaleButton from '../../components/common/ScaleButton';
import { useUserStore } from '../../store/userStore';

export default function MyPageScreen() {
  const { principles, setPrinciples } = useUserStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(principles);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>마이</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>투자 성향</Text>
          <Text style={styles.personalityType}>신중한 분석형</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>나의 투자 원칙</Text>
            <TouchableOpacity onPress={() => {
              if (editing) {
                setPrinciples(draft);
                setEditing(false);
              } else {
                setDraft(principles);
                setEditing(true);
              }
            }}>
              <Text style={styles.editBtn}>{editing ? '저장' : '수정'}</Text>
            </TouchableOpacity>
          </View>
          {editing ? (
            <TextInput
              style={styles.principlesInput}
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder={'손절 -10% 이상은 반드시 실행\n모르는 종목은 절대 사지 않는다'}
              placeholderTextColor={Colors.textMuted}
            />
          ) : (
            <Text style={principles ? styles.principlesText : styles.principlesEmpty}>
              {principles || 'AI 코칭의 기준이 되는 나만의 원칙을 적어봐요.\n원칙이 있으면 더 정확한 코칭을 받을 수 있어요.'}
            </Text>
          )}
        </View>

        <View style={styles.menuCard}>
          {[
            { label: '알림 설정' },
            { label: '계정 설정' },
            { label: '로그아웃', danger: true },
          ].map((item, i, arr) => (
            <TouchableOpacity key={item.label} style={[styles.menuItem, i < arr.length - 1 && styles.menuItemBorder]}>
              <Text style={[styles.menuLabel, item.danger && { color: Colors.reconsider }]}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, gap: 16, paddingBottom: 48 },
  pageTitle: { fontSize: 26, fontWeight: '600', color: Colors.textPrimary, paddingTop: 8, paddingBottom: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, gap: 10, borderWidth: 0.5, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 11, fontWeight: '500', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  personalityType: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  editBtn: { fontSize: 13, color: Colors.accent, fontWeight: '500' },
  principlesInput: { fontSize: 15, color: Colors.textPrimary, lineHeight: 15 * 1.7, minHeight: 100, textAlignVertical: 'top', borderWidth: 0.5, borderColor: Colors.border, borderRadius: 10, padding: 12, backgroundColor: Colors.background },
  principlesText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 15 * 1.7 },
  principlesEmpty: { fontSize: 15, color: Colors.textMuted, lineHeight: 15 * 1.7 },
  menuCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  menuLabel: { fontSize: 15, color: Colors.textPrimary },
  menuArrow: { fontSize: 18, color: Colors.textMuted },
});
