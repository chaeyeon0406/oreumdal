const FG_LABEL: Record<string, string> = {
  'Extreme Fear': '극단적 공포',
  Fear: '공포',
  Neutral: '중립',
  Greed: '탐욕',
  'Extreme Greed': '극단적 탐욕',
};

// 주요 국내 종목 ticker 테이블 (KOSPI/KOSDAQ)
const KR_TICKERS: Record<string, string> = {
  '삼성전자': '005930.KS',
  'SK하이닉스': '000660.KS',
  'LG에너지솔루션': '373220.KS',
  '삼성바이오': '207940.KS',
  '삼성바이오로직스': '207940.KS',
  '현대차': '005380.KS',
  '기아': '000270.KS',
  '셀트리온': '068270.KS',
  '포스코홀딩스': '005490.KS',
  '카카오': '035720.KS',
  '네이버': '035420.KS',
  'NAVER': '035420.KS',
  '카카오뱅크': '323410.KS',
  '카카오페이': '377300.KS',
  'KB금융': '105560.KS',
  '신한지주': '055550.KS',
  '하나금융지주': '086790.KS',
  '우리금융지주': '316140.KS',
  'LG화학': '051910.KS',
  '삼성SDI': '006400.KS',
  'SK이노베이션': '096770.KS',
  'SK텔레콤': '017670.KS',
  'KT': '030200.KS',
  'LG': '003550.KS',
  'SK': '034730.KS',
  '현대모비스': '012330.KS',
  '고려아연': '010130.KS',
  '두산에너빌리티': '034020.KS',
  'HMM': '011200.KS',
  '한국조선해양': '009540.KS',
};

async function fetchFearGreed(): Promise<string | null> {
  const res = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Accept': 'application/json',
      'Referer': 'https://edition.cnn.com/markets/fear-and-greed',
      'Origin': 'https://edition.cnn.com',
    },
  });
  const json = await res.json();
  const fg = json?.fear_and_greed;
  if (!fg) return null;
  const score = Math.round(fg.score);
  const label = FG_LABEL[fg.rating] ?? fg.rating;
  return `공포탐욕지수: ${score} (${label})`;
}

async function fetchPriceByTicker(ticker: string, displayName: string): Promise<string | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } }
  );
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;

  const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
  const latest = closes[closes.length - 1];
  const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
  if (!latest) return null;

  const isKorean = ticker.endsWith('.KS') || ticker.endsWith('.KQ');
  const priceStr = isKorean
    ? `${Math.round(latest).toLocaleString()}원`
    : `$${latest.toFixed(2)}`;

  if (prev) {
    const change = ((latest - prev) / prev * 100).toFixed(1);
    const sign = parseFloat(change) >= 0 ? '+' : '';
    return `${displayName} 현재가: ${priceStr} (${sign}${change}%)`;
  }
  return `${displayName} 현재가: ${priceStr}`;
}

async function fetchStockPrice(stockName: string): Promise<string | null> {
  const hasKorean = /[가-힣]/.test(stockName);

  if (hasKorean) {
    // 국내 주식: lookup table에서 ticker 찾기
    const ticker = KR_TICKERS[stockName];
    if (!ticker) return null;
    return fetchPriceByTicker(ticker, stockName);
  } else {
    // 해외 주식: 입력값을 ticker로 직접 시도 (TSLA, NVDA 등)
    const ticker = stockName.toUpperCase().trim();
    return fetchPriceByTicker(ticker, stockName);
  }
}

export async function fetchMarketContext(stockName: string): Promise<string> {
  const TIMEOUT = 4000;
  const withTimeout = <T>(p: Promise<T>): Promise<T | null> =>
    Promise.race([
      p,
      new Promise<null>((res) => setTimeout(() => res(null), TIMEOUT)),
    ]);

  const [fg, price] = await Promise.all([
    withTimeout(fetchFearGreed().catch(() => null)),
    withTimeout(fetchStockPrice(stockName).catch(() => null)),
  ]);

  return [fg, price].filter(Boolean).join('\n');
}
