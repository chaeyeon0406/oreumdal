/**
 * OpenAI 프로바이더 (선택적 — 런타임에만 로드)
 *
 * 사용 전 설치 필요:
 *   cd app && npm install openai
 *
 * .env에 추가:
 *   OPENAI_API_KEY=your_openai_api_key
 *   EXPO_PUBLIC_AI_PROVIDER=openai
 */
import { AIProvider, CoachingInput, CoachingResult } from './types';
import { buildSystemWithContext, CONCLUSION_PROMPT } from './systemPrompt';
import { AI_CONFIG } from './config';

const { model, maxTokens, maxTokensConclusion } = AI_CONFIG.openai;

async function callOpenAI(params: object): Promise<string> {
  // openai 패키지 미설치 시 명확한 메시지로 실패
  let OpenAI: any;
  try {
    const mod = await import(/* webpackIgnore: true */ 'openai');
    OpenAI = mod.default ?? mod;
  } catch {
    throw new Error('openai 패키지 없음. npm install openai 후 재시도');
  }
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });
  const res = await client.chat.completions.create(params);
  return res.choices[0]?.message?.content ?? '';
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
