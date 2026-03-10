
import React, { useState, useMemo } from 'react';
import { SaleRecord } from '../types';
import { filterByDate } from '../utils/dataParser';
import ProductDetailModal from './ProductDetailModal';
import MallDetailModal from './MallDetailModal';
import DateDetailModal from './DateDetailModal';

interface ProfitStatusModalProps {
  records: SaleRecord[];
  startDate: string;
  endDate: string;
  onClose: () => void;
}

type TabType = 'Product' | 'Date' | 'Mall';

const ProfitStatusModal: React.FC<ProfitStatusModalProps> = ({ records, startDate: initialStartDate, endDate: initialEndDate, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('Product');
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [searchTerm, setSearchTerm] = useState('');

  // Drill-down states
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMall, setSelectedMall] = useState<string | null>(null);

  // 데이터 집계
  const aggregatedData = useMemo(() => {
    const filtered = filterByDate(records, startDate, endDate);
    
    // 검색어 필터링
    const searchLower = searchTerm.toLowerCase();
    const searched = filtered.filter(r => {
      if (!searchTerm) return true;
      
      const productMatch = (r.koreanName && r.koreanName.toLowerCase().includes(searchLower)) ||
                           (r.englishName && r.englishName.toLowerCase().includes(searchLower));

      if (activeTab === 'Product') {
        return productMatch;
      }
      if (activeTab === 'Mall') {
        // 쇼핑몰 탭에서도 상품명 검색 지원 (요청사항 반영) + 쇼핑몰명 검색
        return r.mallName.toLowerCase().includes(searchLower) || productMatch;
      }
      if (activeTab === 'Date') {
         // 날짜 탭에서도 상품명 검색 지원
         return productMatch;
      }
      return true;
    });

    const map = new Map<string, { 
      key: string, 
      count: number, 
      quantity: number, // 판매 수량 추가
      revenue: number, 
      settlement: number, 
      purchaseCost: number, // 구매원가
      logisticsCost: number, // 배송비+포장비
      profit: number 
    }>();

    searched.forEach(r => {
      let key = '';
      if (activeTab === 'Product') key = r.koreanName || '상품명 없음';
      else if (activeTab === 'Date') key = r.date;
      else if (activeTab === 'Mall') key = r.mallName;

      // 데이터 필드 (CSV 파서에서 매핑된 값)
      const revenue = r.totalPrice || 0;
      const settlement = r.settlementPrice || 0;
      
      // 비용 분리: 구매원가 vs 물류비(배송+포장)
      // 사용자 요청: J열 값만 가져오고 수량은 곱하지 않음 (단순 합산)
      const purchaseCost = r.unitCost; 
      const logisticsCost = (r.shippingCost || 0) + (r.packagingCost || 0);
      
      // M열(profitSettlement) 수익 데이터 사용
      const profit = r.profitSettlement || 0;

      const current = map.get(key) || { key, count: 0, quantity: 0, revenue: 0, settlement: 0, purchaseCost: 0, logisticsCost: 0, profit: 0 };
      map.set(key, {
        ...current,
        count: current.count + 1, // 주문 건수 (행 수)
        quantity: current.quantity + r.quantity, // 판매 수량 누적
        revenue: current.revenue + revenue,
        settlement: current.settlement + settlement,
        purchaseCost: current.purchaseCost + purchaseCost,
        logisticsCost: current.logisticsCost + logisticsCost,
        profit: current.profit + profit
      });
    });

    // 정렬 (기본: 수익 높은 순, 날짜는 날짜 내림차순)
    const result = Array.from(map.values());
    if (activeTab === 'Date') {
      return result.sort((a, b) => b.key.localeCompare(a.key));
    }
    return result.sort((a, b) => b.profit - a.profit);
  }, [records, startDate, endDate, searchTerm, activeTab]);

  // 총계 계산
  const totalRevenue = aggregatedData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalSettlement = aggregatedData.reduce((acc, curr) => acc + curr.settlement, 0);
  const totalPurchaseCost = aggregatedData.reduce((acc, curr) => acc + curr.purchaseCost, 0);
  const totalLogisticsCost = aggregatedData.reduce((acc, curr) => acc + curr.logisticsCost, 0);
  const totalProfit = aggregatedData.reduce((acc, curr) => acc + curr.profit, 0);
  const totalCount = aggregatedData.reduce((acc, curr) => acc + curr.count, 0);
  const totalQuantity = aggregatedData.reduce((acc, curr) => acc + curr.quantity, 0);
  
  // 평균 수익률 = (총 수익 / 총 정산가) * 100
  const totalMargin = totalSettlement > 0 ? (totalProfit / totalSettlement) * 100 : 0;

  // 원화 포맷터 (매출액용)
  const formatKRW = (val: number) => 
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val);

  // 유로 포맷터 (정산가, 비용, 수익용)
  const formatEUR = (val: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  // 퍼센트 포맷터
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  const handleRowClick = (item: any) => {
    if (activeTab === 'Product') setSelectedProduct(item.key);
    else if (activeTab === 'Date') setSelectedDate(item.key);
    else if (activeTab === 'Mall') setSelectedMall(item.key);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[1400px] h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 헤더 */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <i className="fas fa-file-invoice-dollar text-slate-700"></i>
              통합 분석 리포트 (판매/수익)
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">
              판매 현황(주문/수량)과 수익 현황(정산/비용)을 한눈에 통합 분석합니다. 항목을 클릭하여 상세 내용을 확인하세요.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* 탭 & 필터 */}
        <div className="bg-slate-50 border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* 탭 버튼 */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              {(['Product', 'Date', 'Mall'] as TabType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab 
                      ? 'bg-slate-800 text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'Product' ? '상품별' : tab === 'Date' ? '날짜별' : '쇼핑몰별'}
                </button>
              ))}
            </div>

            {/* 날짜 필터 */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold text-slate-600 outline-none"
              />
              <span className="text-slate-300">~</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold text-slate-600 outline-none"
              />
            </div>

            {/* 검색 */}
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="상품명 검색..."
                className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-slate-500 outline-none w-56 shadow-sm"
              />
            </div>
          </div>

          {/* 총계 요약 */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
             <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">총 주문 건수</span>
              <span className="text-base font-black text-slate-700">{totalCount.toLocaleString()} <span className="text-[10px] text-slate-400 font-medium">건</span></span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">총 판매 수량</span>
              <span className="text-base font-black text-slate-700">{totalQuantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-medium">개</span></span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">총 매출 (KRW)</span>
              <span className="text-base font-black text-slate-800">{formatKRW(totalRevenue)}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col px-4">
              <span className="text-[10px] font-bold text-blue-400 uppercase">총 정산가 (EUR)</span>
              <span className="text-base font-black text-blue-600">{formatEUR(totalSettlement)}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col px-4">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">총 수익 (EUR)</span>
              <span className="text-base font-black text-emerald-600">{formatEUR(totalProfit)}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col px-4">
              <span className="text-[10px] font-bold text-indigo-400 uppercase">평균 수익률</span>
              <span className="text-base font-black text-indigo-600">{formatPercent(totalMargin)}</span>
            </div>
          </div>
        </div>

        {/* 테이블 데이터 */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                <th className="pb-3 px-4 w-12">순위</th>
                <th className="pb-3 px-4">
                  {activeTab === 'Product' ? '상품명' : activeTab === 'Date' ? '날짜' : '쇼핑몰명'}
                </th>
                <th className="pb-3 px-4 text-right">주문수</th>
                <th className="pb-3 px-4 text-right">수량</th>
                <th className="pb-3 px-4 text-right">매출액 (KRW)</th>
                <th className="pb-3 px-4 text-right text-blue-500">정산가 (EUR)</th>
                
                {/* 툴팁이 추가된 구매원가 헤더 */}
                <th className="pb-3 px-4 text-right text-slate-400">
                  <div className="flex items-center justify-end gap-1 group relative cursor-help">
                    구매원가 (EUR)
                    <i className="fas fa-info-circle text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"></i>
                    <div className="absolute bottom-full mb-2 right-0 w-max px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-medium tracking-normal">
                      계산식: 데이터 원본(J열) 구매원가 합계
                      <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </th>
                
                <th className="pb-3 px-4 text-right text-slate-400">배송비 합계 (EUR)</th>
                <th className="pb-3 px-4 text-right text-emerald-600">수익 (EUR)</th>
                <th className="pb-3 px-4 text-right">수익률</th>
              </tr>
            </thead>
            <tbody>
              {/* 전체 합계 행 */}
              <tr className="bg-slate-100 hover:bg-slate-200/70 transition-all rounded-xl shadow-sm border border-slate-200">
                <td className="py-3 px-4 rounded-l-xl">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-800 text-white rounded-lg text-[10px]">
                    <i className="fas fa-sigma"></i>
                  </span>
                </td>
                <td className="py-3 px-4 font-black text-slate-800">
                  전체 합계
                </td>
                <td className="py-3 px-4 text-right font-black text-slate-800">
                  {totalCount.toLocaleString()}건
                </td>
                <td className="py-3 px-4 text-right font-black text-slate-800">
                  {totalQuantity.toLocaleString()}개
                </td>
                <td className="py-3 px-4 text-right font-black text-slate-800">
                  {formatKRW(totalRevenue)}
                </td>
                <td className="py-3 px-4 text-right font-black text-blue-600">
                  {formatEUR(totalSettlement)}
                </td>
                <td className="py-3 px-4 text-right font-black text-slate-500">
                  {formatEUR(totalPurchaseCost)}
                </td>
                <td className="py-3 px-4 text-right font-black text-slate-500">
                  {formatEUR(totalLogisticsCost)}
                </td>
                <td className="py-3 px-4 text-right font-black text-emerald-600">
                  {formatEUR(totalProfit)}
                </td>
                <td className="py-3 px-4 text-right font-black text-indigo-600 rounded-r-xl">
                  {formatPercent(totalMargin)}
                </td>
              </tr>

              {aggregatedData.map((item, idx) => {
                const itemMargin = item.settlement > 0 ? (item.profit / item.settlement) * 100 : 0;
                
                return (
                  <tr 
                    key={idx} 
                    className="bg-slate-50/50 hover:bg-emerald-50/30 transition-all rounded-xl hover:shadow-sm cursor-pointer group"
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="py-3 px-4 rounded-l-xl">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                        idx < 3 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">
                      {item.key}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-600">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-600">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {formatKRW(item.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-500">
                      {formatEUR(item.settlement)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-400">
                      {formatEUR(item.purchaseCost)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-400">
                      {formatEUR(item.logisticsCost)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600">
                      {formatEUR(item.profit)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-600 rounded-r-xl">
                      {formatPercent(itemMargin)}
                    </td>
                  </tr>
                );
              })}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-slate-300 font-bold">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modals */}
      {selectedProduct && (
        <ProductDetailModal 
          records={records}
          productName={selectedProduct}
          mallName="All"
          startDate={startDate}
          endDate={endDate}
          onClose={() => setSelectedProduct(null)}
        />
      )}
      {selectedDate && (
        <DateDetailModal 
          records={records}
          date={selectedDate}
          initialSearchTerm={searchTerm}
          onClose={() => setSelectedDate(null)}
        />
      )}
      {selectedMall && (
        <MallDetailModal 
          records={records}
          mallName={selectedMall}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setSelectedMall(null)}
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
};

export default ProfitStatusModal;
