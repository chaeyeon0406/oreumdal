import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from './config';
import { claudeProvider } from './claudeProvider';
import { openaiProvider } from './openaiProvider';

export { SYSTEM_PROMPT, CONCLUSION_PROMPT, buildSystemWithContext } from './systemPrompt';
export { AI_CONFIG } from './config';
export type { CoachingInput, CoachingResult, AIProvider } from './types';

export const aiProvider = AI_CONFIG.provider === 'openai' ? openaiProvider : claudeProvider;

// 기존 호출 방식 유지 (CheckChatScreen에서 직접 사용 시)
export const sendCoachingMessage = aiProvider.sendMessage.bind(aiProvider);
export const generateConclusion = aiProvider.generateConclusion.bind(aiProvider);

// ── 리포트 인사이트 생성 ─────────────────────────────────────────────────────
const INSIGHT_SYSTEM = `당신은 투자 심리 코치입니다.
아래 유저 데이터를 보고 따뜻하고 명확한 한 줄 인사이트를 주세요.
- 판단하지 말고 관찰한 것을 말해주세요
- 1문장, 40자 이내
- 투자 조언 절대 금지
- 한국어로만 답하세요`;

// OpenAI는 선택적 패키지이므로 타입만 lazy하게 처리
type OpenAIClient = {
  chat: {
    completions: {
      create: (params: object) => Promise<{ choices: { message: { content: string } }[] }>;
    };
  };
};

let _openaiClient: OpenAIClient | null = null;

async function getOpenAIClient(): Promise<OpenAIClient | null> {
  if (_openaiClient) return _openaiClient;
  try {
    // openai 패키지가 없으면 catch로 빠짐
    const mod = await import(/* webpackIgnore: true */ 'openai');
    const OpenAI = mod.default ?? mod;
    _openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    }) as OpenAIClient;
    return _openaiClient;
  } catch {
    return null;
  }
}

const _anthropicInsightClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const HOME_INSIGHT_SYSTEM = `당신은 투자 심리 코치입니다.
유저의 최근 코칭 데이터를 보고 오늘의 한 줄 인사이트를 주세요.
- 1문장, 30자 이내
- 따뜻하고 구체적으로
- 투자 조언 절대 금지
- 판단하지 말고 관찰한 것을 말할 것
- 한국어로만 답하세요`;

export async function generateHomeInsight(dataDescription: string): Promise<string> {
  try {
    if (AI_CONFIG.provider === 'openai') {
      const client = await getOpenAIClient();
      if (!client) throw new Error('openai not available');
      const res = await client.chat.completions.create({
        model: AI_CONFIG.openai.model,
        max_tokens: 80,
        messages: [
          { role: 'system', content: HOME_INSIGHT_SYSTEM },
          { role: 'user', content: dataDescription },
        ],
      });
      return res.choices[0]?.message?.content?.trim() ?? '';
    }
    const res = await _anthropicInsightClient.messages.create({
      model: AI_CONFIG.claude.model,
      max_tokens: 80,
      system: HOME_INSIGHT_SYSTEM,
      messages: [{ role: 'user', content: dataDescription }],
    });
    return res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
  } catch {
    return '';
  }
}

export async function generateInsight(dataDescription: string): Promise<string> {
  try {
    if (AI_CONFIG.provider === 'openai') {
      const client = await getOpenAIClient();
      if (!client) throw new Error('openai not available');
      const res = await client.chat.completions.create({
        model: AI_CONFIG.openai.model,
        max_tokens: 100,
        messages: [
          { role: 'system', content: INSIGHT_SYSTEM },
          { role: 'user', content: dataDescription },
        ],
      });
      return res.choices[0]?.message?.content?.trim() ?? '';
    }

    // Claude (기본)
    const res = await _anthropicInsightClient.messages.create({
      model: AI_CONFIG.claude.model,
      max_tokens: 100,
      system: INSIGHT_SYSTEM,
      messages: [{ role: 'user', content: dataDescription }],
    });
    return res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
  } catch {
    return '';
  }
}
