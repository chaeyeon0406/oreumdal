import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, CoachingInput, CoachingResult } from './types';
import { buildSystemWithContext, CONCLUSION_PROMPT } from './systemPrompt';
import { AI_CONFIG } from './config';

// ⚠️ 프로덕션에서는 Supabase Edge Function으로 이전할 것.
// dangerouslyAllowBrowser는 개발/프로토타입 전용.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const { model, maxTokens, maxTokensConclusion } = AI_CONFIG.claude;

export const claudeProvider: AIProvider = {
  id: `claude/${model}`,

  async sendMessage(input: CoachingInput): Promise<string> {
    const system = buildSystemWithContext(input);
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  },

  async generateConclusion(input: CoachingInput): Promise<CoachingResult> {
    const system = buildSystemWithContext(input);
    const messages: Anthropic.MessageParam[] = [
      ...input.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: CONCLUSION_PROMPT },
    ];
    const response = await client.messages.create({
      model,
      max_tokens: maxTokensConclusion,
      system,
      messages,
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(text) as CoachingResult;
  },
};
