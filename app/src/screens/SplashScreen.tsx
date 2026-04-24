import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Colors } from '../constants/colors';
import { useUserStore } from '../store/userStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export default function SplashScreen({ navigation }: Props) {
  const loadFromStorage = useUserStore((s) => s.loadFromStorage);

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadFromStorage(),
        new Promise<void>((r) => setTimeout(r, 1800)),
      ]);
      const { hasCompletedOnboarding } = useUserStore.getState();
      navigation.replace(hasCompletedOnboarding ? 'Main' : 'Onboarding');
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>오름달</Text>
      <Text style={styles.subtitle}>INVEST WITH CLARITY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
});
