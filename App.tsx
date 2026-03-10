import React, { useState, useEffect } from 'react';
import { SaleRecord, TimeGranularity, User } from './types';
import { parseCSV, filterByDate } from './utils/dataParser';
import Dashboard from './components/Dashboard';
import ProfitAnalysis from './components/ProfitAnalysis';
import MallStatus from './components/MallStatus';
import InventoryManagement from './components/InventoryManagement';
import { getSalesInsights } from './services/geminiService';
import { initAuth, getCurrentUser, logoutUser, getInventoryData } from './services/authService';
import { LoginScreen, ChangePasswordModal } from './components/AuthScreens';
import UserManagement from './components/UserManagement';
import { REPORT_TEMPLATES } from './constants/reportTemplates';
import ProfitStatusModal from './components/ProfitStatusModal';
import ProductSalesModal from './components/ProductSalesModal';
import MarginCalculatorModal from './components/MarginCalculatorModal';
import MarginAnalysisListModal from './components/MarginAnalysisListModal';
import PriceTrendAnalysis from './components/PriceTrendAnalysis';

type ViewType = 'Dashboard' | 'Profit' | 'Inventory' | 'MallStatus' | 'Admin' | 'PriceTrendAnalysis';

// 사용자가 요청한 기본 고정 구글 시트 URL
const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1YfPzYVrbBLbt8a8UYa691JBh1KzJ94kM8higUOuGzT0/edit?gid=0#gid=0";

// 날짜 헬퍼 함수
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const getFirstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);

  // App Data State
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [view, setView] = useState<ViewType>('Dashboard');
  const [granularity, setGranularity] = useState<TimeGranularity>('Daily');
  // Modals
  const [showProfitStatusModal, setShowProfitStatusModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false); 
  
  // Margin Logic States
  const [showMarginList, setShowMarginList] = useState(false);
  const [showMarginCalculator, setShowMarginCalculator] = useState(false);
  const [marginConfigToEdit, setMarginConfigToEdit] = useState<any>(null);

  // Supply Logic States
  const [showSupplyList, setShowSupplyList] = useState(false);
  const [showSupplyCalculator, setShowSupplyCalculator] = useState(false);
  const [supplyConfigToEdit, setSupplyConfigToEdit] = useState<any>(null);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiInsightExpanded, setIsAiInsightExpanded] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getToday());
  const [selectedMall, setSelectedMall] = useState('All');
  const [showTemplates, setShowTemplates] = useState(false);
  
  // DB에서 가져온 상품 설정 데이터 (원가, 배송비, 포장비, 정산가 등)
  const [dbProductSettings, setDbProductSettings] = useState<any[]>([]);

  // 환율 정보 상태
  const [exchangeRates, setExchangeRates] = useState<{USD: number, EUR: number} | null>(null);

  // 1. 앱 초기화: Auth 초기화 및 현재 유저 확인
  useEffect(() => {
    const initialize = async () => {
      await initAuth(); 
      const loggedInUser = getCurrentUser();
      if (loggedInUser) {
        setCurrentUser(loggedInUser);
      }
    };
    initialize();
  }, []);

  // 2. 로그인 상태일 때 데이터 로드
  useEffect(() => {
    if (currentUser) {
      setStartDate(getFirstDayOfMonth());
      setEndDate(getToday());
      setGranularity('Daily');

      // (1) 구글 시트(GAS)에서 최신 비용/정산 정보 가져오기
      getInventoryData().then(res => {
        if (res && res.inventory) {
          setDbProductSettings(res.inventory);
        }
      }).catch(err => console.error("Failed to fetch DB settings", err));

      // (2) CSV 데이터 로드 (로컬 캐시 or Fetch)
      const saved = localStorage.getItem('sales_data');
      if (saved) {
        setRecords(JSON.parse(saved));
      } else {
        loadDataFromUrl(DEFAULT_SHEET_URL);
      }

      // (3) 환율 정보 가져오기 (USD 기준)
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(res => res.json())
        .then(data => {
          if (data && data.rates) {
            setExchangeRates({
              USD: data.rates.KRW,
              EUR: data.rates.KRW / data.rates.EUR
            });
          }
        })
        .catch(e => console.error("Exchange rate fetch error:", e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // [핵심] DB 설정(GAS)이 로드되면 레코드의 비용/정산 정보를 업데이트하여 병합
  useEffect(() => {
    if (dbProductSettings.length > 0 && records.length > 0) {
      const updatedRecords = records.map(r => {
        // 상품명 매칭 (koreanName 기준)
        const setting = dbProductSettings.find(item => item.name === r.koreanName);
        if (setting) {
          // GAS에서 가져온 설정값이 있으면 해당 값으로 덮어씀 (일괄 적용 효과)
          // 값이 0이거나 undefined인 경우 기존 레코드 값 유지
          return {
            ...r,
            unitCost: setting.unitCost ?? r.unitCost,
            shippingCost: setting.shippingCost ?? r.shippingCost,
            packagingCost: setting.packagingCost ?? r.packagingCost,
            settlementPrice: setting.settlementPrice ?? r.settlementPrice,
            profitSettlement: setting.profitSettlement ?? r.profitSettlement
          };
        }
        return r;
      });
      
      // 실제 변경이 있을 때만 State 업데이트
      if (JSON.stringify(updatedRecords) !== JSON.stringify(records)) {
        setRecords(updatedRecords);
        localStorage.setItem('sales_data', JSON.stringify(updatedRecords));
      }
    }
  }, [dbProductSettings]); 

  // 데이터 로드 및 파싱 (공통 함수)
  const handleImport = (csv: string, url?: string) => {
    const parsed = parseCSV(csv);
    if (parsed.length > 0) {
      const enriched = parsed.map(r => {
        // DB 설정이 이미 있으면 파싱 단계에서 즉시 병합
        const setting = dbProductSettings.find(item => item.name === r.koreanName);
        if (setting) {
          return {
            ...r,
            unitCost: setting.unitCost ?? r.unitCost,
            shippingCost: setting.shippingCost ?? r.shippingCost,
            packagingCost: setting.packagingCost ?? r.packagingCost,
            settlementPrice: setting.settlementPrice ?? r.settlementPrice,
            profitSettlement: setting.profitSettlement ?? r.profitSettlement
          };
        }
        return r;
      });
      
      setRecords(enriched);
      localStorage.setItem('sales_data', JSON.stringify(enriched));
      if (url) localStorage.setItem('source_url', url);
      
      setAiInsight(null);
    } else {
      console.error('데이터 형식이 올바르지 않거나 비어있습니다.');
    }
  };

  const loadDataFromUrl = async (url: string) => {
    setRefreshing(true);
    try {
      let fetchUrl = url;
      if (url.includes('docs.google.com/spreadsheets')) {
        const match = url.match(/\/d\/(.+?)\//);
        if (match) {
          const id = match[1];
          // 캐시 방지용 timestamp 추가
          fetchUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&timestamp=${Date.now()}`;
        }
      }
      
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Fetch failed');
      const csv = await response.text();
      handleImport(csv, url);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateProductCost = (productName: string, cost: number) => {
    // 로컬 업데이트 (즉시 반영용)
    const nextRecords = records.map(r => 
      r.koreanName === productName ? { ...r, unitCost: cost } : r
    );
    setRecords(nextRecords);
    localStorage.setItem('sales_data', JSON.stringify(nextRecords));
  };

  const refreshData = () => {
    // 1. DB 설정(비용 등) 다시 불러오기
    getInventoryData().then(res => {
      if (res && res.inventory) setDbProductSettings(res.inventory);
    });
    // 2. 시트 데이터(판매 내역) 다시 불러오기
    loadDataFromUrl(DEFAULT_SHEET_URL);
  };

  const handleFilterChange = (filters: { startDate?: string; endDate?: string; selectedMall?: string }) => {
    if (filters.startDate !== undefined) setStartDate(filters.startDate);
    if (filters.endDate !== undefined) setEndDate(filters.endDate);
    if (filters.selectedMall !== undefined) setSelectedMall(filters.selectedMall);
    setAiInsight(null);
  };

  const generateAIInsight = async () => {
    if (records.length === 0) return;
    setLoadingInsight(true);
    setShowTemplates(false);
    const filteredRecords = filterByDate(records, startDate, endDate);
    const dataToAnalyze = filteredRecords.length > 0 ? filteredRecords : records;
    const insight = await getSalesInsights(dataToAnalyze, customPrompt);
    setAiInsight(insight);
    setIsAiInsightExpanded(true);
    setLoadingInsight(false);
  };

  const selectTemplate = (prompt: string) => {
    setCustomPrompt(prompt);
    setShowTemplates(false);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setView('Dashboard');
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('Dashboard')}>
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <i className="fas fa-chart-line text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">MFULEX SALES ANALYTICS</h1>
          </div>
          
          <button 
            onClick={() => setView('PriceTrendAnalysis')}
            className={`ml-6 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              view === 'PriceTrendAnalysis' 
                ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <i className="fas fa-chart-line"></i>
            상품별 가격 추이 분석
          </button>
          
          <div className="flex items-center space-x-2">
            {/* 환율 정보 위젯 */}
            {exchangeRates && (
              <div className="hidden lg:flex items-center gap-3 mr-3 bg-white/50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">
                       <i className="fas fa-dollar-sign"></i>
                    </div>
                    <div className="flex flex-col leading-none">
                       <span className="text-[9px] font-bold text-slate-400">USD</span>
                       <span className="text-xs font-black text-slate-700">{Math.round(exchangeRates.USD).toLocaleString()}</span>
                    </div>
                 </div>
                 <div className="w-px h-5 bg-slate-200"></div>
                 <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                       <i className="fas fa-euro-sign"></i>
                    </div>
                    <div className="flex flex-col leading-none">
                       <span className="text-[9px] font-bold text-slate-400">EUR</span>
                       <span className="text-xs font-black text-slate-700">{Math.round(exchangeRates.EUR).toLocaleString()}</span>
                    </div>
                 </div>
                 <div className="ml-1 pl-2 border-l border-slate-200 text-[9px] font-bold text-slate-400">
                    {new Date().toLocaleDateString().slice(0, -1)}
                 </div>
              </div>
            )}

            {currentUser.role === 'admin' && (
              <button
                onClick={() => setView('Admin')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  view === 'Admin' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <i className="fas fa-users-cog"></i>
                <span className="hidden sm:inline">회원 관리</span>
              </button>
            )}

            {view !== 'Admin' && (
              <button 
                onClick={refreshData}
                disabled={refreshing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-md shadow-blue-100 disabled:bg-blue-400"
              >
                {refreshing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                <span className="hidden sm:inline">{refreshing ? '동기화' : '동기화'}</span>
              </button>
            )}

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">{currentUser.name || currentUser.email}</span>
              <button onClick={() => setShowChangePw(true)} className="p-2 text-slate-400 hover:text-slate-600 transition"><i className="fas fa-key"></i></button>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition"><i className="fas fa-sign-out-alt"></i></button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative">
        {view === 'Admin' && currentUser.role === 'admin' ? (
          <UserManagement />
        ) : (
          <>
            {records.length > 0 ? (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => setView('Dashboard')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${view === 'Dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>판매</button>
                      <button onClick={() => setView('Inventory')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${view === 'Inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>재고</button>
                    </div>
                    
                    {view === 'Dashboard' && (
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                        {(['Daily', 'Weekly', 'Monthly'] as TimeGranularity[]).map((tab) => (
                          <button key={tab} onClick={() => setGranularity(tab)} className={`px-4 py-2 text-sm font-medium rounded-md transition ${granularity === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{tab === 'Daily' ? '일별' : tab === 'Weekly' ? '주별' : '월별'}</button>
                        ))}
                      </div>
                    )}
                    
                    {/* 통합 리포트 버튼 */}
                    <button onClick={() => setShowProfitStatusModal(true)} className="bg-white border border-slate-800 text-slate-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition flex items-center gap-2 shadow-sm">
                      <i className="fas fa-file-invoice-dollar"></i> 통합 리포트 (판매/수익)
                    </button>

                    {/* 마진 계산기 버튼 (리스트 팝업 열기) */}
                    <button onClick={() => setShowMarginList(true)} className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition flex items-center gap-2 shadow-sm">
                      <i className="fas fa-calculator"></i> 마진 계산기
                    </button>

                    {/* 공급가 계산기 버튼 (마진 계산기와 동일 기능, 데이터 분리) */}
                    <button onClick={() => setShowSupplyList(true)} className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-100 transition flex items-center gap-2 shadow-sm">
                      <i className="fas fa-calculator"></i> 공급가 계산기
                    </button>
                  </div>

                  <div className="flex flex-1 items-center gap-2 relative">
                    <div className="relative flex-1">
                      <i className="fas fa-comment-dots absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input type="text" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="데이터 질문하기..." className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" onKeyDown={(e) => e.key === 'Enter' && generateAIInsight()} />
                       <button onClick={() => setShowTemplates(!showTemplates)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1.5"><i className="fas fa-list-alt"></i></button>
                    </div>
                    <button onClick={generateAIInsight} disabled={loadingInsight} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition shadow-md shadow-indigo-100 whitespace-nowrap">{loadingInsight ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sparkles"></i>}<span className="hidden sm:inline">AI 리포트</span></button>
                    {showTemplates && (
                      <div className="absolute top-full right-0 mt-2 w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center"><h4 className="text-sm font-bold text-slate-800">추천 템플릿</h4><button onClick={() => setShowTemplates(false)}><i className="fas fa-times"></i></button></div>
                        <div className="p-2 max-h-[400px] overflow-y-auto">{REPORT_TEMPLATES.map((tpl) => (<button key={tpl.id} onClick={() => selectTemplate(tpl.prompt)} className="w-full text-left p-3 hover:bg-indigo-50 rounded-xl transition-colors group"><p className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 mb-1">{tpl.title}</p><p className="text-xs text-slate-400 line-clamp-2">{tpl.prompt}</p></button>))}</div>
                      </div>
                    )}
                  </div>
                </div>

                {aiInsight && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <button onClick={() => setIsAiInsightExpanded(!isAiInsightExpanded)} className="w-full flex items-center justify-between p-6 text-indigo-700 font-bold hover:bg-indigo-100/50 transition-colors text-left"><div className="flex items-center gap-2"><i className="fas fa-robot"></i><h3>Gemini AI 분석 결과</h3></div><i className={`fas fa-chevron-${isAiInsightExpanded ? 'up' : 'down'}`}></i></button>
                    {isAiInsightExpanded && <div className="px-6 pb-6 text-slate-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base prose prose-slate max-w-none border-t border-indigo-100/50 pt-4">{aiInsight}</div>}
                  </div>
                )}

                {view === 'Dashboard' && <Dashboard records={records} granularity={granularity} startDate={startDate} endDate={endDate} selectedMall={selectedMall} onFilterChange={handleFilterChange} onOpenProductSales={() => setShowProductModal(true)} />}
                {view === 'Profit' && <ProfitAnalysis records={records} startDate={startDate} endDate={endDate} selectedMall={selectedMall} onFilterChange={handleFilterChange} onUpdateCost={handleUpdateProductCost} />}
                {view === 'Inventory' && <InventoryManagement />}
                {view === 'MallStatus' && <MallStatus records={records} granularity={granularity} startDate={startDate} endDate={endDate} selectedMall={selectedMall} onFilterChange={handleFilterChange} />}
                {view === 'PriceTrendAnalysis' && <PriceTrendAnalysis />}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-pulse">
                <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center text-blue-600 mb-6 shadow-inner"><i className="fas fa-sync-alt fa-spin text-4xl"></i></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">데이터를 불러오는 중입니다...</h2>
                <p className="text-slate-500 mb-8 max-w-md">연동된 구글 시트에서 최신 판매 데이터를 가져오고 있습니다.</p>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="bg-white border-t border-slate-200 py-8"><div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-xs sm:text-sm"><p>© 2024 Advanced Sales Analytics Dashboard.</p></div></footer>
      
      {showProductModal && <ProductSalesModal records={records} onClose={() => setShowProductModal(false)} />}
      
      {showProfitStatusModal && (
        <ProfitStatusModal 
          records={records} 
          startDate={startDate} 
          endDate={endDate} 
          onClose={() => setShowProfitStatusModal(false)} 
        />
      )}
      
      {/* 1. 마진 시뮬레이션 목록 팝업 */}
      {showMarginList && (
        <MarginAnalysisListModal
          onClose={() => setShowMarginList(false)}
          onSelect={(config) => {
            setMarginConfigToEdit(config);
            setShowMarginList(false);
            setShowMarginCalculator(true);
          }}
          onCreateNew={() => {
            setMarginConfigToEdit(null);
            setShowMarginList(false);
            setShowMarginCalculator(true);
          }}
        />
      )}

      {/* 2. 마진 계산기 (상세) 팝업 */}
      {showMarginCalculator && (
        <MarginCalculatorModal 
           onClose={() => setShowMarginCalculator(false)} 
           key={marginConfigToEdit ? marginConfigToEdit.id : 'new'} // 강제 리렌더링을 위해 키 부여
           initialData={marginConfigToEdit}
           exchangeRates={exchangeRates}
        />
      )}

      {/* 3. 공급가 시뮬레이션 목록 팝업 (신규) */}
      {showSupplyList && (
        <MarginAnalysisListModal
          title="공급가 시뮬레이션 목록"
          storageKey="supply_configs"
          onClose={() => setShowSupplyList(false)}
          onSelect={(config) => {
            setSupplyConfigToEdit(config);
            setShowSupplyList(false);
            setShowSupplyCalculator(true);
          }}
          onCreateNew={() => {
            setSupplyConfigToEdit(null);
            setShowSupplyList(false);
            setShowSupplyCalculator(true);
          }}
        />
      )}

      {/* 4. 공급가 계산기 (상세) 팝업 (신규) */}
      {showSupplyCalculator && (
        <MarginCalculatorModal 
           title="공급가 시뮬레이터"
           storageKey="supply_configs"
           onClose={() => setShowSupplyCalculator(false)} 
           key={supplyConfigToEdit ? supplyConfigToEdit.id : 'new_supply'}
           initialData={supplyConfigToEdit}
           exchangeRates={exchangeRates}
        />
      )}

      {showChangePw && currentUser && <ChangePasswordModal user={currentUser} onClose={() => setShowChangePw(false)} />}
    </div>
  );
};

export default App;