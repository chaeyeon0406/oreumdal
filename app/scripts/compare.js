#!/usr/bin/env node
/**
 * Claude vs GPT-4o mini 코칭 응답 비교 스크립트
 *
 * 사용법:
 *   cd app
 *   node scripts/compare.js
 *
 * OpenAI 비교를 위한 사전 준비:
 *   npm install openai
 *   .env 에 OPENAI_API_KEY=... 추가
 *
 * 커스텀 시나리오:
 *   SCENARIO=fearful node scripts/compare.js
 */

require('dotenv').config();

const Anthropic = require('@anthropic-ai/sdk');

// ── 시스템 프롬프트 (app/src/lib/ai/systemPrompt.ts와 동일) ──────────────────
const SYSTEM_PROMPT = `당신은 오름달의 AI 투자 심리 코치입니다.

역할:
- 판단하지 않는다. 질문으로 사용자가 스스로 깨닫게 한다
- 차갑지 않고 따뜻하되, 신뢰감 있는 톤
- 투자 조언이나 수익률 예측은 절대 하지 않는다
- 심리적 상태와 의사결정 패턴에만 집중한다

코칭 방식:
- 질문은 총 3개만 한다 (하나씩 순서대로)
- 각 질문은 짧고 핵심을 찌른다
- 사용자 답변을 토대로 다음 질문을 이어간다
- 3번째 질문에 대한 답변을 받으면 코칭을 마무리한다

첫 질문은 감정의 근원을 짚는 것으로 시작하라.`;

const CONCLUSION_PROMPT = `지금까지의 대화를 바탕으로 아래 JSON 형식으로만 응답하라. 다른 텍스트 없이 JSON만.

{
  "conclusion": "ok" 또는 "reconsider",
  "impulseScore": 0~100 사이 정수 (감정적 충동 정도),
  "reason": "판단 근거 한 줄 (20자 이내)"
}`;

// ── 테스트 시나리오 ───────────────────────────────────────────────────────────
const SCENARIOS = {
  default: {
    name: '기본 (삼성전자 매수 / 불안+욕심)',
    stockName: '삼성전자',
    direction: '매수',
    emotionLabel: '불안, 욕심',
    conversation: [
      // [user, expected_next_role]
      '가격 흐름이 좋아서',   // Q1 답변
      '왠지 불안해서요',       // Q2 답변
      '솔직히 아닌 것 같아요', // Q3 답변
    ],
  },
  fearful: {
    name: '두려움 (카카오 매도 / 두려움)',
    stockName: '카카오',
    direction: '매도',
    emotionLabel: '두려움',
    conversation: [
      '내 원칙에 따라',
      '시장 흐름을 보고 판단했어요',
      '원칙이랑 맞아요',
    ],
  },
};

const scenario = SCENARIOS[process.env.SCENARIO] ?? SCENARIOS.default;

function buildSystem(scenario) {
  return `${SYSTEM_PROMPT}\n\n[사용자 정보]\n종목: ${scenario.stockName}\n방향: ${scenario.direction}\n지금 감정: ${scenario.emotionLabel}`;
}

// ── Claude ───────────────────────────────────────────────────────────────────
async function runClaude(scenario) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = buildSystem(scenario);
  const log = [];
  const messages = [];

  // 코칭 시작
  const intro = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system,
    messages: [{ role: 'user', content: `${scenario.stockName} ${scenario.direction}를 고려 중이에요.` }],
  });
  const introText = intro.content[0].text;
  log.push({ role: 'assistant', label: 'AI', text: introText });
  messages.push(
    { role: 'user', content: `${scenario.stockName} ${scenario.direction}를 고려 중이에요.` },
    { role: 'assistant', content: introText }
  );

  // 3개 질문 순환
  for (const userAnswer of scenario.conversation) {
    messages.push({ role: 'user', content: userAnswer });
    log.push({ role: 'user', label: '사용자', text: userAnswer });

    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system,
      messages,
    });
    const aiText = res.content[0].text;
    messages.push({ role: 'assistant', content: aiText });
    log.push({ role: 'assistant', label: 'AI', text: aiText });
  }

  // 결론
  const conclusionRes = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system,
    messages: [...messages, { role: 'user', content: CONCLUSION_PROMPT }],
  });
  const conclusionText = conclusionRes.content[0].text;
  let conclusion;
  try { conclusion = JSON.parse(conclusionText); } catch { conclusion = conclusionText; }

  return { log, conclusion };
}

// ── OpenAI ───────────────────────────────────────────────────────────────────
async function runOpenAI(scenario) {
  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch {
    return { error: 'openai 패키지 없음. cd app && npm install openai 후 재시도' };
  }
  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OPENAI_API_KEY 환경변수 없음. .env에 OPENAI_API_KEY=... 추가' };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const system = buildSystem(scenario);
  const log = [];
  const messages = [{ role: 'system', content: system }];

  const intro = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [...messages, { role: 'user', content: `${scenario.stockName} ${scenario.direction}를 고려 중이에요.` }],
  });
  const introText = intro.choices[0].message.content;
  log.push({ role: 'assistant', label: 'AI', text: introText });
  messages.push(
    { role: 'user', content: `${scenario.stockName} ${scenario.direction}를 고려 중이에요.` },
    { role: 'assistant', content: introText }
  );

  for (const userAnswer of scenario.conversation) {
    messages.push({ role: 'user', content: userAnswer });
    log.push({ role: 'user', label: '사용자', text: userAnswer });

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages,
    });
    const aiText = res.choices[0].message.content;
    messages.push({ role: 'assistant', content: aiText });
    log.push({ role: 'assistant', label: 'AI', text: aiText });
  }

  const conclusionRes = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    response_format: { type: 'json_object' },
    messages: [...messages, { role: 'user', content: CONCLUSION_PROMPT }],
  });
  const conclusionText = conclusionRes.choices[0].message.content;
  let conclusion;
  try { conclusion = JSON.parse(conclusionText); } catch { conclusion = conclusionText; }

  return { log, conclusion };
}

// ── 출력 유틸 ─────────────────────────────────────────────────────────────────
const W = process.stdout.columns || 100;
const DIVIDER = '─'.repeat(W);
const HALF = Math.floor((W - 3) / 2);

function printHeader(title) {
  console.log('\n' + '═'.repeat(W));
  console.log(' ' + title);
  console.log('═'.repeat(W));
}

function wrap(text, width) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + word).length > width) { lines.push(line.trimEnd()); line = ''; }
    line += word + ' ';
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

function printSideBySide(leftTitle, leftResult, rightTitle, rightResult) {
  console.log('\n' + '─'.repeat(W));
  const lHead = ` ${leftTitle} `.padEnd(HALF);
  const rHead = ` ${rightTitle}`;
  console.log(lHead + ' │ ' + rHead);
  console.log('─'.repeat(W));

  const pairs = [];
  const allLogs = leftResult.log || [];
  const allRight = rightResult.log || [];
  const maxLen = Math.max(allLogs.length, allRight.length);

  for (let i = 0; i < maxLen; i++) {
    const l = allLogs[i];
    const r = allRight[i];
    const lLines = l ? wrap(`[${l.label}] ${l.text}`, HALF - 2) : [''];
    const rLines = r ? wrap(`[${r.label}] ${r.text}`, HALF - 2) : [''];
    const maxLines = Math.max(lLines.length, rLines.length);
    for (let j = 0; j < maxLines; j++) {
      const lLine = (lLines[j] || '').padEnd(HALF);
      const rLine = rLines[j] || '';
      console.log(lLine + ' │ ' + rLine);
    }
    console.log(DIVIDER);
  }
}

function printConclusion(label, result) {
  if (result.error) {
    console.log(`  [${label}] ${result.error}`);
    return;
  }
  const c = result.conclusion;
  if (typeof c === 'object') {
    console.log(`  [${label}] 판정: ${c.conclusion} | 충동도: ${c.impulseScore} | 근거: ${c.reason}`);
  } else {
    console.log(`  [${label}] ${c}`);
  }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  printHeader(`오름달 AI 코칭 모델 비교 — 시나리오: ${scenario.name}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n[오류] ANTHROPIC_API_KEY 환경변수 없음. app/.env 파일을 확인하세요.\n');
    process.exit(1);
  }

  console.log('\n모델 응답 수집 중...\n');

  const [claudeResult, openaiResult] = await Promise.allSettled([
    runClaude(scenario),
    runOpenAI(scenario),
  ]).then((results) => results.map((r) =>
    r.status === 'fulfilled' ? r.value : { error: r.reason?.message ?? '알 수 없는 오류' }
  ));

  printSideBySide(
    'claude-sonnet-4-6',
    claudeResult,
    'gpt-4o-mini',
    openaiResult
  );

  console.log('\n[최종 결론]');
  printConclusion('Claude', claudeResult);
  printConclusion('OpenAI', openaiResult);
  console.log();
}

main().catch((err) => {
  console.error('\n[오류]', err.message);
  process.exit(1);
});
