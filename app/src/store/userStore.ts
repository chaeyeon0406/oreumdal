import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  principles: 'user_principles',
  personality: 'user_personality',
  isLoggedIn: 'user_is_logged_in',
  nickname: 'user_nickname',
  hasCompletedOnboarding: 'user_onboarding_done',
  userId: 'user_id',
  accessToken: 'user_access_token',
  refreshToken: 'user_refresh_token',
  provider: 'user_provider',
};

interface LoginParams {
  nickname: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  provider: string;
}

interface UserStore {
  principles: string;
  personalityType: string;
  isLoggedIn: boolean;
  nickname: string;
  hasCompletedOnboarding: boolean;
  userId: string;
  accessToken: string;
  refreshToken: string;
  provider: string;

  setPrinciples: (v: string) => void;
  setPersonalityType: (v: string) => void;
  completeOnboarding: () => void;
  login: (params: LoginParams) => void;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set) => ({
  principles: '',
  personalityType: '',
  isLoggedIn: false,
  nickname: '',
  hasCompletedOnboarding: false,
  userId: '',
  accessToken: '',
  refreshToken: '',
  provider: '',

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

  login: ({ nickname, userId, accessToken, refreshToken, provider }) => {
    set({ isLoggedIn: true, nickname, userId, accessToken, refreshToken, provider });
    AsyncStorage.setItem(KEYS.isLoggedIn, 'true');
    AsyncStorage.setItem(KEYS.nickname, nickname);
    AsyncStorage.setItem(KEYS.userId, userId);
    AsyncStorage.setItem(KEYS.accessToken, accessToken);
    AsyncStorage.setItem(KEYS.refreshToken, refreshToken);
    AsyncStorage.setItem(KEYS.provider, provider);
  },

  logout: () => {
    set({ isLoggedIn: false, nickname: '', userId: '', accessToken: '', refreshToken: '', provider: '' });
    AsyncStorage.removeItem(KEYS.isLoggedIn);
    AsyncStorage.removeItem(KEYS.nickname);
    AsyncStorage.removeItem(KEYS.userId);
    AsyncStorage.removeItem(KEYS.accessToken);
    AsyncStorage.removeItem(KEYS.refreshToken);
    AsyncStorage.removeItem(KEYS.provider);
  },

  loadFromStorage: async () => {
    const [principles, personalityType, isLoggedIn, nickname, hasCompletedOnboarding, userId, accessToken, refreshToken, provider] =
      await Promise.all([
        AsyncStorage.getItem(KEYS.principles),
        AsyncStorage.getItem(KEYS.personality),
        AsyncStorage.getItem(KEYS.isLoggedIn),
        AsyncStorage.getItem(KEYS.nickname),
        AsyncStorage.getItem(KEYS.hasCompletedOnboarding),
        AsyncStorage.getItem(KEYS.userId),
        AsyncStorage.getItem(KEYS.accessToken),
        AsyncStorage.getItem(KEYS.refreshToken),
        AsyncStorage.getItem(KEYS.provider),
      ]);
    set({
      principles: principles ?? '',
      personalityType: personalityType ?? '',
      isLoggedIn: isLoggedIn === 'true',
      nickname: nickname ?? '',
      hasCompletedOnboarding: hasCompletedOnboarding === 'true',
      userId: userId ?? '',
      accessToken: accessToken ?? '',
      refreshToken: refreshToken ?? '',
      provider: provider ?? '',
    });
  },
}));
