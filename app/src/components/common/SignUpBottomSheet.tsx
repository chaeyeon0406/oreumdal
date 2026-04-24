import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import ScaleButton from './ScaleButton';

type Nav = NativeStackNavigationProp<MainStackParamList>;

interface Props {
  visible: boolean;
  trigger: 'chk' | 'save' | 'report';
  onClose: () => void;
}

const CONTENT: Record<Props['trigger'], { title: string; desc: string }> = {
  chk: {
    title: '기록이 저장됐어요',
    desc: '가입하면 기기를 바꿔도\n코칭 기록이 그대로 남아요',
  },
  save: {
    title: '기록이 저장됐어요',
    desc: '가입하면 기기를 바꿔도\n매매 기록이 그대로 남아요',
  },
  report: {
    title: '리포트를 보려면 가입이 필요해요',
    desc: '가입하면 AI가 내 투자 패턴을\n분석해서 리포트를 보내줘요',
  },
};

export default function SignUpBottomSheet({ visible, trigger, onClose }: Props) {
  const navigation = useNavigation<Nav>();
  const { title, desc } = CONTENT[trigger];

  const handleSignUp = () => {
    onClose();
    navigation.navigate('SignUp', { trigger });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>

        <ScaleButton style={styles.signUpBtn} onPress={handleSignUp}>
          <Text style={styles.signUpBtnText}>가입하기</Text>
        </ScaleButton>

        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>나중에 할게요</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  desc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 14 * 1.7,
    marginTop: -4,
  },
  signUpBtn: {
    backgroundColor: Colors.cta,
    borderRadius: 10,
    padding: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  signUpBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
