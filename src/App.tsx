/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, AlertTriangle, Search, Filter, TrendingUp, TrendingDown, Info, ChevronRight, Upload, Image as ImageIcon, Trash2, Cpu, Loader2, Sparkles, History, LayoutDashboard, Clock, Calendar } from 'lucide-react';
import { STOCKS_DATA, Rating, StockOpinion } from './data';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AnalysisHistory {
  id: string;
  timestamp: number;
  stocks: StockOpinion[];
  imageCount: number;
}

const RatingIndicator = ({ rating }: { rating: Rating }) => {
  switch (rating) {
    case 'BUY':
      return (
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]" id="rating-o">
          O
        </div>
      );
    case 'WAIT':
      return (
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm bg-[#fef9c3] text-[#854d0e] border border-[#fef08a]" id="rating-x-yellow">
          X
        </div>
      );
    case 'ALERT':
      return (
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]" id="rating-x-red">
          X
        </div>
      );
  }
};

const ConsensusBadge = ({ stocks }: { stocks: StockOpinion }) => {
  const ratings = [stocks.appA, stocks.appB, stocks.appC];
  const allBuy = ratings.every(r => r === 'BUY');
  const allAvoid = ratings.every(r => r !== 'BUY');
  
  if (allBuy) {
    return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider">高度共識: 強烈買進</span>;
  }
  if (allAvoid) {
    return <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold uppercase tracking-wider">高度共識: 避開警告</span>;
  }
  return <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-bold uppercase tracking-wider">意見相左: 分歧觀察</span>;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'HISTORY'>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CONSENSUS' | 'DIVERGENT'>('ALL');
  const [uploadedImages, setUploadedImages] = useState<{ id: string; url: string; mimeType: string; base64: string }[]>([]);
  const [stocks, setStocks] = useState<StockOpinion[]>(STOCKS_DATA);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('stock_analysis_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('stock_analysis_history', JSON.stringify(history));
  }, [history]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const base64Content = (event.target!.result as string).split(',')[1];
            setUploadedImages(prev => [...prev, { 
              id: Math.random().toString(36).substr(2, 9), 
              url: event.target!.result as string,
              mimeType: file.type,
              base64: base64Content
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const runAnalysis = async () => {
    if (uploadedImages.length === 0) return;
    setIsAnalyzing(true);
    
    try {
      const imageCount = uploadedImages.length;
      const imageParts = uploadedImages.map(img => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64
        }
      }));

      const prompt = `你是一個專業的股市分析專家助理。請徹底、完整地分析上傳的截圖，並【絕對嚴格】遵循以下評級轉換優先級，這是最優先指令：

【視覺識別最高判準：色溫與飽和度】
- **'WAIT' (X) 的顏色包含**：鮮黃色、暗黃色、橙色、棕色、土黃色、琥珀色。
- **'BUY' (O) 的顏色僅限**：鮮綠色、亮綠色、或深青綠色 (Teal)。
- **'ALERT' (X) 的顏色包含**：紅色、深紅色。

【核心規則：禁止過度解釋文字】
1. **只要底色或右側價格區塊是「黃/橙/棕」色系**：不論文字寫什麼（如：可續抱、多頭波段、漲勢待續），一律判定為 'WAIT' (X)。
2. **只要底色是「紅色」**：一律判定為 'ALERT' (X)。
3. **判定為 'BUY' (O) 的嚴格條件**：必須同時滿足「背景為綠色系」且「文字含有『買進』或『多頭』」。

【個別工具細節 - 請針對性辨識】
- **員工 A (台股分析儀)**：最容易誤判。請無視左側描述文字，**只看右側「建議區間」或「價格」的背景顏色**。
  - 右側背景是 黃/橙/琥珀 -> **WAIT** (X)
  - 右側背景是 鮮綠 -> **BUY** (O)
- **員工 B (Momentum Core)**：看卡片整體的色塊顏色。
- **員工 C (Zenith Intelligence)**：深藍綠(Teal)=**BUY** (O), 深棕色=**WAIT** (X)。

【任務要求】
- 從上到下掃描所有股票，確保 8074 鉅橡等不漏掉。
- 提取 ID, Name, appA, appB, appC。
- 輸出格式為 JSON 陣列。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [...imageParts, { text: prompt }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                appA: { type: Type.STRING, enum: ['BUY', 'WAIT', 'ALERT'] },
                appB: { type: Type.STRING, enum: ['BUY', 'WAIT', 'ALERT'] },
                appC: { type: Type.STRING, enum: ['BUY', 'WAIT', 'ALERT'] },
                price: { type: Type.STRING },
                comment: { type: Type.STRING }
              },
              required: ['id', 'name', 'appA', 'appB', 'appC']
            }
          }
        }
      });

      const result = JSON.parse(response.text || "[]") as StockOpinion[];
      if (result.length > 0) {
        setStocks(result);
        
        // Add to history
        const newRecord: AnalysisHistory = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          stocks: result,
          imageCount
        };
        
        setHistory(prev => {
          const updated = [newRecord, ...prev];
          return updated.slice(0, 100); // Max 100 items
        });

        setUploadedImages([]); // Clear images after successful analysis
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("分析失敗，請稍後再試。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadFromHistory = (record: AnalysisHistory) => {
    setStocks(record.stocks);
    setActiveTab('DASHBOARD');
  };

  const deleteHistoryRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(r => r.id !== id));
  };

  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      const matchesSearch = stock.id.includes(searchTerm) || stock.name.includes(searchTerm);
      const ratings = [stock.appA, stock.appB, stock.appC];
      const isConsensus = ratings.every(r => r === 'BUY') || ratings.every(r => r !== 'BUY');
      
      if (filter === 'CONSENSUS') return matchesSearch && isConsensus;
      if (filter === 'DIVERGENT') return matchesSearch && !isConsensus;
      return matchesSearch;
    });
  }, [searchTerm, filter, stocks]);

  const stats = useMemo(() => {
    const total = stocks.length;
    const consensus = stocks.filter(s => {
      const r = [s.appA, s.appB, s.appC];
      return r.every(v => v === 'BUY') || r.every(v => v !== 'BUY');
    }).length;
    const buyConsensusCount = stocks.filter(s => [s.appA, s.appB, s.appC].every(r => r === 'BUY')).length;
    return { total, consensus, divergent: total - consensus, buyConsensusCount };
  }, [stocks]);

  return (
    <div className="h-screen bg-[#f8fafc] text-[#1e293b] p-8 flex flex-col gap-6 overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center pb-4 border-b border-slate-200 shrink-0 gap-8">
        <div className="space-y-1 shrink-0">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            股票意見統合系統 <span className="text-slate-400 font-light text-xl ml-2">Stock Insights Aggregator</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
            {activeTab === 'DASHBOARD' ? (
              <>上傳員工報告截圖，進行 AI 共識分析判斷</>
            ) : (
              <>查閱過往的分析紀錄 (上限 100 筆)</>
            )}
          </p>
        </div>

        {activeTab === 'DASHBOARD' && (
          <div className="flex-grow max-w-2xl">
            <div 
              className="group relative flex items-center justify-between gap-4 px-6 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-white transition-all overflow-hidden"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={handleFileUpload}
              />
              
              <div className="flex items-center gap-4 flex-grow cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {uploadedImages.length === 0 ? (
                  <>
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">點擊或拖放員工報告截圖</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">AI 將自動辨認內容</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1 max-w-[400px]">
                    {uploadedImages.map((img) => (
                      <div key={img.id} className="relative shrink-0 group/img">
                        <img src={img.url} className="h-10 w-10 object-cover rounded-lg ring-2 ring-white shadow-sm" alt="Preview" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                          className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 transition-colors">
                      <Upload size={14} />
                    </div>
                  </div>
                )}
              </div>

              {uploadedImages.length > 0 && (
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      開始 AI 分辨
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('DASHBOARD')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'DASHBOARD' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutDashboard size={14} /> 即時分析
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <History size={14} /> 歷史紀錄
            </button>
          </div>
          
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="搜尋名稱或代碼..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Content View */}
      <AnimatePresence mode="wait">
        {activeTab === 'DASHBOARD' ? (
          <motion.main 
            key="dashboard"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="bg-white border border-slate-200 rounded-xl shadow-sm flex-grow flex flex-col overflow-hidden"
          >
            {/* Table Header */}
            <div className="bg-slate-50 border-b border-slate-200 grid grid-cols-12 px-6 py-4 font-bold text-[#64748b] uppercase text-[10px] tracking-widest shrink-0">
              <div className="col-span-3">股票標的 / 代號</div>
              <div className="col-span-2 text-center">員工 A (台股分析儀)</div>
              <div className="col-span-2 text-center">員工 B (Momentum Core)</div>
              <div className="col-span-2 text-center">員工 C (Zenith)</div>
              <div className="col-span-3 text-right">統合判斷</div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
              <AnimatePresence mode="popLayout">
                {filteredStocks.map((stock) => (
                  <motion.div
                    key={stock.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-12 px-6 py-5 border-b border-slate-50 items-center hover:bg-slate-50 transition-colors group"
                  >
                    <div className="col-span-3">
                      <div className="font-bold text-slate-900 flex items-baseline gap-2">
                        {stock.name} <span className="font-mono text-slate-400 text-xs tracking-tight">{stock.id}.TW</span>
                      </div>
                      {stock.price && (
                        <div className="text-[10px] text-slate-400 font-medium">建議區間: {stock.price}</div>
                      )}
                    </div>

                    <div className="col-span-2 flex justify-center">
                      <RatingIndicator rating={stock.appA} />
                    </div>
                    
                    <div className="col-span-2 flex justify-center">
                      <RatingIndicator rating={stock.appB} />
                    </div>
                    
                    <div className="col-span-2 flex justify-center">
                      <RatingIndicator rating={stock.appC} />
                    </div>

                    <div className="col-span-3 text-right">
                      <ConsensusBadge stocks={stock} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredStocks.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-slate-400 text-sm italic">未找到符合搜尋條件的股票資訊</p>
                </div>
              )}
            </div>

            {/* List Filter Rail */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">檢視過濾條件</div>
              <div className="flex gap-2">
                {(['ALL', 'CONSENSUS', 'DIVERGENT'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`py-1.5 px-4 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                      filter === f 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {f === 'ALL' ? '全部標的' : f === 'CONSENSUS' ? '高度共識' : '意見分歧'}
                  </button>
                ))}
              </div>
            </div>
          </motion.main>
        ) : (
          <motion.main 
            key="history"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex-grow flex flex-col gap-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto p-1 scrollbar-thin">
              {history.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                  <Clock size={48} className="opacity-20" />
                  <p className="text-sm">尚未有任何分析歷史紀錄</p>
                </div>
              ) : (
                history
                .filter(record => 
                  record.stocks.some(s => s.id.includes(searchTerm) || s.name.includes(searchTerm)) ||
                  new Date(record.timestamp).toLocaleString().includes(searchTerm)
                )
                .map((record) => (
                  <motion.div 
                    key={record.id}
                    layoutId={record.id}
                    onClick={() => loadFromHistory(record)}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group relative"
                  >
                    <button 
                      onClick={(e) => deleteHistoryRecord(record.id, e)}
                      className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <ImageIcon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">分析紀錄 #{record.id}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Calendar size={10} /> {new Date(record.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">辨識標的數</span>
                        <span className="font-bold text-slate-900">{record.stocks.length} 檔</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">使用截圖數</span>
                        <span className="font-bold text-slate-900">{record.imageCount} 張</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-slate-100">
                        {record.stocks.slice(0, 3).map(s => (
                          <span key={s.id} className="px-2 py-1 bg-slate-50 text-slate-600 rounded text-[10px] font-medium">
                            {s.name}
                          </span>
                        ))}
                        {record.stocks.length > 3 && (
                          <span className="px-2 py-1 text-slate-400 text-[10px] font-medium italic">
                            +{record.stocks.length - 3} 檔
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-center py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold gap-2 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      查看詳細報告 <ChevronRight size={14} />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Footer Stats Grid */}
      <footer className="grid grid-cols-3 gap-6 shrink-0 h-28">
        <div className="bg-slate-50 border-dashed border-2 border-slate-200 rounded-xl p-5 flex flex-col justify-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">高度一致標的</div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.consensus} <span className="text-xs font-normal text-slate-400">/ {stats.total} 檔</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">● 含共識買進及共識觀望</div>
        </div>

        <div className="bg-slate-50 border-dashed border-2 border-slate-200 rounded-xl p-5 flex flex-col justify-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">意見分歧標的</div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.divergent} <span className="text-xs font-normal text-slate-400">/ {stats.total} 檔</span>
          </div>
          <div className="text-[10px] text-amber-600 font-semibold mt-1">● 決策不一致需額外判斷</div>
        </div>

        <div className="bg-indigo-600 text-white rounded-xl p-5 shadow-lg shadow-indigo-100 flex flex-col justify-center">
          <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">決策分析摘要</div>
          <div className="text-xs leading-snug font-medium text-indigo-50">
            目前有 {stats.total > 0 ? Math.round((stats.consensus/stats.total)*100) : 0}% 的標的處於共識區間，
            其中 {stats.buyConsensusCount} 檔具備明確買進訊號。
          </div>
        </div>
      </footer>
    </div>
  );
}
