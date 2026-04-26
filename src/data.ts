
export type Rating = 'BUY' | 'WAIT' | 'ALERT';

export interface StockOpinion {
  id: string;
  name: string;
  appA: Rating; // 台股分析儀
  appB: Rating; // MOMENTUM CORE
  appC: Rating; // ZENITH INTELLIGENCE
  appD: Rating; // 籌碼分析儀
  price?: string;
  comment?: string;
}

export const STOCKS_DATA: StockOpinion[] = [
  { id: '3017', name: '奇鋐', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'WAIT', price: '2350-2450' },
  { id: '2337', name: '旺宏', appA: 'WAIT', appB: 'WAIT', appC: 'WAIT', appD: 'ALERT', price: '113.00' },
  { id: '2344', name: '華邦電', appA: 'WAIT', appB: 'WAIT', appC: 'BUY', appD: 'BUY' },
  { id: '2408', name: '南亞科', appA: 'WAIT', appB: 'WAIT', appC: 'BUY', appD: 'WAIT', price: '215.00' },
  { id: '8131', name: '福懋科', appA: 'WAIT', appB: 'BUY', appC: 'BUY', appD: 'BUY', price: '60.50' },
  { id: '8046', name: '南電', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'BUY' },
  { id: '3211', name: '順達', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'BUY', price: '360.00-365.00' },
  { id: '3491', name: '昇達科', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'WAIT' },
  { id: '3105', name: '穩懋', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'BUY' },
  { id: '2345', name: '智邦', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'BUY' },
  { id: '2313', name: '華通', appA: 'ALERT', appB: 'WAIT', appC: 'BUY', appD: 'WAIT' },
  { id: '1815', name: '富喬', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'BUY', price: '118.80' },
  { id: '3189', name: '景碩', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'BUY' },
  { id: '6789', name: '采鈺', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'BUY' },
  { id: '2449', name: '京元電子', appA: 'WAIT', appB: 'WAIT', appC: 'BUY', appD: 'BUY', price: '282.00' },
  { id: '2481', name: '強茂', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'BUY', price: '104.65-106.50' },
  { id: '8358', name: '金居', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'ALERT', price: '325.00' },
  { id: '6139', name: '亞翔', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'ALERT' },
  { id: '6190', name: '萬泰科', appA: 'BUY', appB: 'BUY', appC: 'WAIT', appD: 'WAIT', price: '62.50' },
  { id: '3380', name: '明泰', appA: 'BUY', appB: 'BUY', appC: 'WAIT', appD: 'ALERT', price: '40.10-40.50' },
  { id: '2484', name: '希華', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'BUY' },
  { id: '2327', name: '國巨', appA: 'BUY', appB: 'BUY', appC: 'BUY', appD: 'ALERT' },
];
