/**
 * AI 모델 설정
 *
 * 프로바이더 전환: EXPO_PUBLIC_AI_PROVIDER 환경변수 또는 아래 provider 값 변경
 *   'claude'  → Anthropic Claude (기본값)
 *   'openai'  → OpenAI GPT (openai 패키지 설치 필요: npm i openai)
 *
 * 비교 테스트: cd app && node scripts/compare.js
 */
export const AI_CONFIG = {
  provider: (process.env.EXPO_PUBLIC_AI_PROVIDER ?? 'claude') as 'claude' | 'openai',

  claude: {
    model: 'claude-sonnet-4-6',
    maxTokens: 300,
    maxTokensConclusion: 200,
  },

  openai: {
    model: 'gpt-4o-mini',
    maxTokens: 500,
    maxTokensConclusion: 300,
    temperature: 0.7,
  },
} as const;

export type AIProviderKey = typeof AI_CONFIG.provider;
