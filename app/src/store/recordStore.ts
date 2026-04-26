import { create } from 'zustand';
import { SessionRecord, TradeOutcome, ChatMessage } from '../types';

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}

const M: ChatMessage[] = []; // 빈 대화 (post 타입용)

const MOCK_RECORDS: SessionRecord[] = [
  // ─── 이번 주 (0~6일 전) ───────────────────────────────────────────────────
  {
    id: '1', type: 'check', stock_name: '삼성전자', direction: 'buy',
    emotions: ['anxious', 'greedy'], emotion_label: '불안, 욕심',
    verdict: 'reconsider', impulse_score: 78, reason: '원칙과 어긋난 판단일 가능성이 높아요',
    messages: [
      { role: 'assistant', content: '삼성전자 매수를 고려하고 있군요. 이유가 뭔가요?' },
      { role: 'user', content: '감이 좋아서' },
      { role: 'assistant', content: '지금 이 느낌, 어디서 왔을 것 같아요?' },
      { role: 'user', content: '왠지 불안해서요' },
      { role: 'assistant', content: '투자 원칙이랑 맞는 것 같아요?' },
      { role: 'user', content: '솔직히 아닌 것 같아요' },
    ],
    trade_outcome: 'traded', created_at: daysAgo(0),
  },
  {
    id: '2', type: 'check', stock_name: '카카오', direction: 'sell',
    emotions: ['fearful'], emotion_label: '두려움',
    verdict: 'ok', impulse_score: 30, reason: '원칙에 기반한 판단으로 보여요',
    messages: [
      { role: 'assistant', content: '카카오 매도를 고려하고 있군요.' },
      { role: 'user', content: '내 원칙에 따라' },
      { role: 'assistant', content: '지금 이 느낌, 어디서 왔을 것 같아요?' },
      { role: 'user', content: '시장 흐름을 보고 판단했어요' },
      { role: 'assistant', content: '투자 원칙이랑 맞는 것 같아요?' },
      { role: 'user', content: '원칙이랑 맞아요' },
    ],
    trade_outcome: 'skipped', created_at: daysAgo(1),
  },
  {
    id: '3', type: 'check', stock_name: 'NVIDIA', direction: 'buy',
    emotions: ['excited', 'greedy'], emotion_label: '흥분, 욕심',
    verdict: 'reconsider', impulse_score: 82, reason: '흥분 상태에서의 충동적 판단 가능성',
    messages: [
      { role: 'assistant', content: 'NVIDIA 매수를 고려하고 있군요.' },
      { role: 'user', content: '가격 흐름이 좋아서' },
      { role: 'assistant', content: '지금 이 느낌, 어디서 왔을 것 같아요?' },
      { role: 'user', content: '다들 하는 것 같아서요' },
      { role: 'assistant', content: '투자 원칙이랑 맞는 것 같아요?' },
      { role: 'user', content: '잘 모르겠어요' },
    ],
    trade_outcome: 'traded', created_at: daysAgo(2),
  },
  {
    id: '4', type: 'check', stock_name: 'SK하이닉스', direction: 'buy',
    emotions: ['confused', 'anxious'], emotion_label: '혼란, 불안',
    verdict: 'reconsider', impulse_score: 55, reason: '확신 없는 상태에서의 매매는 위험할 수 있어요',
    messages: [
      { role: 'assistant', content: 'SK하이닉스 매수를 고려하고 있군요.' },
      { role: 'user', content: '뉴스·이슈 봤어요' },
      { role: 'assistant', content: '지금 이 느낌, 어디서 왔을 것 같아요?' },
      { role: 'user', content: '다들 하는 것 같아서요' },
      { role: 'assistant', content: '투자 원칙이랑 맞는 것 같아요?' },
      { role: 'user', content: '잘 모르겠어요' },
    ],
    trade_outcome: null, created_at: daysAgo(4),
  },
  // ─── 지난 주 (7~13일 전) ─────────────────────────────────────────────────
  {
    id: '5', type: 'check', stock_name: '현대차', direction: 'buy',
    emotions: ['calm'], emotion_label: '차분',
    verdict: 'ok', impulse_score: 28, reason: '원칙에 기반한 판단으로 보여요',
    messages: [
      { role: 'assistant', content: '현대차 매수를 고려하고 있군요.' },
      { role: 'user', content: '내 원칙에 따라' },
      { role: 'assistant', content: '지금 이 느낌, 어디서 왔을 것 같아요?' },
      { role: 'user', content: '시장 흐름을 보고 판단했어요' },
      { role: 'assistant', content: '투자 원칙이랑 맞는 것 같아요?' },
      { role: 'user', content: '원칙이랑 맞아요' },
    ],
    trade_outcome: 'traded', created_at: daysAgo(8),
  },
  {
    id: '6', type: 'check', stock_name: '네이버', direction: 'sell',
    emotions: ['anxious'], emotion_label: '불안',
    verdict: 'reconsider', impulse_score: 71, reason: '불안 기반 충동 매도 가능성이 있어요',
    messages: [
      { role: 'assistant', content: '네이버 매도를 고려하고 있군요.' },
      { role: 'user', content: '감이 좋아서' },
      { role: 'assistant', content: '지금 이 느낌, 어디서 왔을 것 같아요?' },
      { role: 'user', content: '왠지 불안해서요' },
      { role: 'assistant', content: '투자 원칙이랑 맞는 것 같아요?' },
      { role: 'user', content: '솔직히 아닌 것 같아요' },
    ],
    trade_outcome: 'skipped', created_at: daysAgo(9),
  },
  {
    id: '7', type: 'check', stock_name: '삼성바이오', direction: 'buy',
    emotions: ['excited'], emotion_label: '흥분',
    verdict: 'reconsider', impulse_score: 88, reason: '흥분 상태에서의 충동적 판단 가능성',
    messages: [
      { role: 'assistant', content: '삼성바이오 매수를 고려하고 있군요.' },
      { role: 'user', content: '가격 흐름이 좋아서' },
      { role: 'assistant', content: '지금 이 느낌, 어디서 왔을 것 같아요?' },
      { role: 'user', content: '다들 하는 것 같아서요' },
      { role: 'assistant', content: '투자 원칙이랑 맞는 것 같아요?' },
      { role: 'user', content: '솔직히 아닌 것 같아요' },
    ],
    trade_outcome: 'traded', created_at: daysAgo(10),
  },
  {
    id: '8', type: 'check', stock_name: 'LG에너지솔루션', direction: 'sell',
    emotions: ['calm', 'fearful'], emotion_label: '차분, 두려움',
    verdict: 'ok', impulse_score: 35, reason: '원칙에 기반한 판단으로 보여요',
    messages: [
      { role: 'assistant', content: 'LG에너지솔루션 매도를 고려하고 있군요.' },
      { role: 'user', content: '내 원칙에 따라' },
      { role: 'assistant', content: '지금 이 느낌, 어디서 왔을 것 같아요?' },
      { role: 'user', content: '시장 흐름을 보고 판단했어요' },
      { role: 'assistant', content: '투자 원칙이랑 맞는 것 같아요?' },
      { role: 'user', content: '원칙이랑 맞아요' },
    ],
    trade_outcome: 'skipped', created_at: daysAgo(11),
  },
  {
    id: '9', type: 'check', stock_name: '카카오뱅크', direction: 'buy',
    emotions: ['anxious', 'confused'], emotion_label: '불안, 혼란',
    verdict: 'reconsider', impulse_score: 64, reason: '확신 없는 상태에서의 매매는 위험할 수 있어요',
    messages: [
      { role: 'assistant', content: '카카오뱅크 매수를 고려하고 있군요.' },
      { role: 'user', content: '뉴스·이슈 봤어요' },
      { role: 'assistant', content: '지금 이 느낌, 어디서 왔을 것 같아요?' },
      { role: 'user', content: '왠지 불안해서요' },
      { role: 'assistant', content: '투자 원칙이랑 맞는 것 같아요?' },
      { role: 'user', content: '잘 모르겠어요' },
    ],
    trade_outcome: 'skipped', created_at: daysAgo(12),
  },
  {
    id: '10', type: 'post', stock_name: 'TSLA', direction: 'buy',
    emotions: ['excited'], emotion_label: '흥분',
    messages: M,
    trade_outcome: 'traded', memo: '실적 발표 기대',
    created_at: daysAgo(13),
  },
];

interface RecordStore {
  records: SessionRecord[];
  addRecord: (record: Omit<SessionRecord, 'id' | 'created_at'>) => void;
  updateTradeOutcome: (id: string, outcome: TradeOutcome) => void;
  clearRecords: () => void;
}

export const useRecordStore = create<RecordStore>((set) => ({
  records: MOCK_RECORDS,
  addRecord: (record) => {
    const newRecord: SessionRecord = {
      ...record,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    set((state) => ({ records: [newRecord, ...state.records] }));
  },
  updateTradeOutcome: (id, outcome) => {
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, trade_outcome: outcome } : r
      ),
    }));
  },
  clearRecords: () => set({ records: [] }),
}));
