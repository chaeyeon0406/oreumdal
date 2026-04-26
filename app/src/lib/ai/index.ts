import { AI_CONFIG } from './config';
import { claudeProvider } from './claudeProvider';
import { openaiProvider } from './openaiProvider';

export { SYSTEM_PROMPT, CONCLUSION_PROMPT, buildSystemWithContext } from './systemPrompt';
export { AI_CONFIG } from './config';
export type { CoachingInput, CoachingResult, AIProvider } from './types';

export const aiProvider = AI_CONFIG.provider === 'openai' ? openaiProvider : claudeProvider;

export const sendCoachingMessage = aiProvider.sendMessage.bind(aiProvider);
export const generateConclusion = aiProvider.generateConclusion.bind(aiProvider);

const INSIGHT_SYSTEM = `당신은 투자 심리 코치입니다.
아래 유저 데이터를 보고 따뜻하고 명확한 한 줄 인사이트를 주세요.
- 판단하지 말고 관찰한 것을 말해주세요
- 1문장, 40자 이내
- 투자 조언 절대 금지
- 한국어로만 답하세요`;

const HOME_INSIGHT_SYSTEM = `당신은 투자 심리 코치입니다.
유저의 최근 코칭 데이터를 보고 오늘의 한 줄 인사이트를 주세요.
- 1문장, 30자 이내
- 따뜻하고 구체적으로
- 투자 조언 절대 금지
- 판단하지 말고 관찰한 것을 말할 것
- 한국어로만 답하세요`;

async function callClaudeFetch(system: string, content: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_CONFIG.claude.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? '';
}

async function callOpenAIFetch(system: string, content: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_CONFIG.openai.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function callAI(system: string, content: string, maxTokens: number): Promise<string> {
  if (AI_CONFIG.provider === 'openai') {
    return callOpenAIFetch(system, content, maxTokens);
  }
  return callClaudeFetch(system, content, maxTokens);
}

export async function generateHomeInsight(dataDescription: string): Promise<string> {
  try {
    return await callAI(HOME_INSIGHT_SYSTEM, dataDescription, 80);
  } catch {
    return '';
  }
}

export async function generateInsight(dataDescription: string): Promise<string> {
  try {
    return await callAI(INSIGHT_SYSTEM, dataDescription, 100);
  } catch {
    return '';
  }
}
