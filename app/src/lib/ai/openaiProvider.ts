import { AIProvider, CoachingInput, CoachingResult } from './types';
import { buildSystemWithContext, CONCLUSION_PROMPT } from './systemPrompt';
import { AI_CONFIG } from './config';

const { model, maxTokens, maxTokensConclusion } = AI_CONFIG.openai;

const API_KEY = process.env.OPENAI_API_KEY ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

async function callOpenAI(params: object): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export const openaiProvider: AIProvider = {
  id: `openai/${model}`,

  async sendMessage(input: CoachingInput): Promise<string> {
    const system = buildSystemWithContext(input);
    return callOpenAI({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...input.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
  },

  async generateConclusion(input: CoachingInput): Promise<CoachingResult> {
    const system = buildSystemWithContext(input);
    const text = await callOpenAI({
      model,
      max_tokens: maxTokensConclusion,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        ...input.messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: CONCLUSION_PROMPT },
      ],
    });
    return JSON.parse(text) as CoachingResult;
  },
};
