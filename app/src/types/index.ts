export type TradeDirection = 'buy' | 'sell';

export type EmotionType =
  | 'excited'
  | 'anxious'
  | 'greedy'
  | 'fearful'
  | 'calm'
  | 'confused';

export type TradeOutcome = 'traded' | 'skipped' | null;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionRecord {
  id: string;
  type: 'check' | 'post';
  stock_name: string;
  direction: TradeDirection;
  emotions: EmotionType[];
  emotion_label: string;
  verdict?: 'ok' | 'reconsider';
  impulse_score?: number;
  reason?: string;
  messages: ChatMessage[];
  trade_outcome: TradeOutcome;
  memo?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  investment_principles: string;
  personality_type: string | null;
  created_at: string;
}

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Main: undefined;
};

// Login 제거 — 비로그인 상태로 바로 시작
export type OnboardingStackParamList = {
  PersonalityTest: undefined;
  PersonalityResult: { personalityType: string };
  InvestmentPrinciples: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Records: undefined;
  Report: undefined;
  My: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  CheckChat: {
    stockName: string;
    direction: TradeDirection;
    emotions: EmotionType[];
    emotionLabel: string;
  };
  RecordDetail: { sessionId: string };
  PostTrade: undefined;
  SignUp: { trigger: 'chk' | 'save' | 'report' };
};
