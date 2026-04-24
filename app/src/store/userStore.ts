import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  principles: 'user_principles',
  personality: 'user_personality',
  isLoggedIn: 'user_is_logged_in',
  nickname: 'user_nickname',
  hasCompletedOnboarding: 'user_onboarding_done',
};

interface UserStore {
  principles: string;
  personalityType: string;
  isLoggedIn: boolean;
  nickname: string;
  hasCompletedOnboarding: boolean;

  setPrinciples: (v: string) => void;
  setPersonalityType: (v: string) => void;
  completeOnboarding: () => void;
  login: (nickname: string) => void;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set) => ({
  principles: '',
  personalityType: '',
  isLoggedIn: false,
  nickname: '',
  hasCompletedOnboarding: false,

  setPrinciples: (v) => {
    set({ principles: v });
    AsyncStorage.setItem(KEYS.principles, v);
  },

  setPersonalityType: (v) => {
    set({ personalityType: v });
    AsyncStorage.setItem(KEYS.personality, v);
  },

  completeOnboarding: () => {
    set({ hasCompletedOnboarding: true });
    AsyncStorage.setItem(KEYS.hasCompletedOnboarding, 'true');
  },

  login: (nickname) => {
    set({ isLoggedIn: true, nickname });
    AsyncStorage.setItem(KEYS.isLoggedIn, 'true');
    AsyncStorage.setItem(KEYS.nickname, nickname);
  },

  logout: () => {
    set({ isLoggedIn: false, nickname: '' });
    AsyncStorage.removeItem(KEYS.isLoggedIn);
    AsyncStorage.removeItem(KEYS.nickname);
  },

  loadFromStorage: async () => {
    const [principles, personalityType, isLoggedIn, nickname, hasCompletedOnboarding] =
      await Promise.all([
        AsyncStorage.getItem(KEYS.principles),
        AsyncStorage.getItem(KEYS.personality),
        AsyncStorage.getItem(KEYS.isLoggedIn),
        AsyncStorage.getItem(KEYS.nickname),
        AsyncStorage.getItem(KEYS.hasCompletedOnboarding),
      ]);
    set({
      principles: principles ?? '',
      personalityType: personalityType ?? '',
      isLoggedIn: isLoggedIn === 'true',
      nickname: nickname ?? '',
      hasCompletedOnboarding: hasCompletedOnboarding === 'true',
    });
  },
}));
