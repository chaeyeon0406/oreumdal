import { ChatMessage, EmotionType, TradeDirection } from '../../types';

export interface CoachingInput {
  stockName: string;
  direction: TradeDirection;
  emotions: EmotionType[];
  emotionLabel: string;
  investmentPrinciples?: string;
  messages: ChatMessage[];
}

export interface CoachingResult {
  conclusion: 'ok' | 'reconsider';
  impulseScore: number;
  reason: string;
}

export interface AIProvider {
  id: string;
  sendMessage(input: CoachingInput): Promise<string>;
  generateConclusion(input: CoachingInput): Promise<CoachingResult>;
}
