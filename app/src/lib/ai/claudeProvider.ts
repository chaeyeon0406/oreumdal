import { AIProvider, CoachingInput, CoachingResult } from './types';
import { buildSystemWithContext, CONCLUSION_PROMPT } from './systemPrompt';
import { AI_CONFIG } from './config';

const { model, maxTokens, maxTokensConclusion } = AI_CONFIG.claude;

const API_KEY = process.env.ANTHROPIC_API_KEY ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

async function callClaude(params: object): Promise<any> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }
  return res.json();
}

export const claudeProvider: AIProvider = {
  id: `claude/${model}`,

  async sendMessage(input: CoachingInput): Promise<string> {
    const system = buildSystemWithContext(input);
    const data = await callClaude({
      model,
      max_tokens: maxTokens,
      system,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return data.content?.[0]?.text ?? '';
  },

  async generateConclusion(input: CoachingInput): Promise<CoachingResult> {
    const system = buildSystemWithContext(input);
    const messages = [
      ...input.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: CONCLUSION_PROMPT },
    ];
    const data = await callClaude({
      model,
      max_tokens: maxTokensConclusion,
      system,
      messages,
    });
    const text = data.content?.[0]?.text ?? '{}';
    return JSON.parse(text) as CoachingResult;
  },
};
