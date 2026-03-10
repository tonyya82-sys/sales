
import React, { useState, useMemo } from 'react';
import { SaleRecord } from '../types';
import { filterByDate } from '../utils/dataParser';
import ProductDetailModal from './ProductDetailModal';
import MallDetailModal from './MallDetailModal';
import DateDetailModal from './DateDetailModal';

interface SalesStatusModalProps {
  records: SaleRecord[];
  startDate: string;
  endDate: string;
  onClose: () => void;
}

type TabType = 'Product' | 'Date' | 'Mall';

const SalesStatusModal: React.FC<SalesStatusModalProps> = ({ records, startDate: initialStartDate, endDate: initialEndDate, onClose }) => {
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
    const searchLower = searchTerm.toLowerCase();

    // 탭별 검색 필터링
    const searched = filtered.filter(r => {
      if (!searchTerm) return true;
      
      const productMatch = (r.koreanName && r.koreanName.toLowerCase().includes(searchLower)) ||
                           (r.englishName && r.englishName.toLowerCase().includes(searchLower));

      // 모든 탭(쇼핑몰 포함)에서 상품명 검색 적용
      return productMatch;
    });

    const map = new Map<string, { 
      key: string, 
      count: number, // 주문 건수
      revenue: number, // 매출액
      quantity: number // 판매수량
    }>();

    searched.forEach(r => {
      let key = '';
      if (activeTab === 'Product') key = r.koreanName || '상품명 없음';
      else if (activeTab === 'Date') key = r.date;
      else if (activeTab === 'Mall') key = r.mallName;

      const current = map.get(key) || { key, count: 0, revenue: 0, quantity: 0 };
      map.set(key, {
        ...current,
        count: current.count + 1,
        revenue: current.revenue + r.totalPrice,
        quantity: current.quantity + r.quantity
      });
    });

    const result = Array.from(map.values());
    
    // 정렬
    if (activeTab === 'Date') {
      return result.sort((a, b) => b.key.localeCompare(a.key)); // 최신 날짜 순
    }
    return result.sort((a, b) => b.revenue - a.revenue); // 매출액 순
  }, [records, startDate, endDate, searchTerm, activeTab]);

  // 총계 계산
  const totalRevenue = aggregatedData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalCount = aggregatedData.reduce((acc, curr) => acc + curr.count, 0);
  const totalQuantity = aggregatedData.reduce((acc, curr) => acc + curr.quantity, 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val);

  const formatPercent = (val: number, total: number) => total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '0%';

  const handleRowClick = (item: any) => {
    if (activeTab === 'Product') setSelectedProduct(item.key);
    else if (activeTab === 'Date') setSelectedDate(item.key);
    else if (activeTab === 'Mall') setSelectedMall(item.key);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 헤더 */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <i className="fas fa-chart-bar text-blue-600"></i>
              통합 판매 현황 리포트
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">상품, 날짜, 쇼핑몰별 매출 현황을 통합 분석합니다. 항목을 클릭하여 상세 내역을 확인하세요.</p>
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
                  onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab 
                      ? 'bg-blue-600 text-white shadow-md' 
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
                className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none w-48 shadow-sm"
              />
            </div>
          </div>

          {/* 총계 요약 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col px-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">총 매출액</span>
              <span className="text-xl font-black text-blue-600">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col px-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">총 주문 건수</span>
              <span className="text-xl font-black text-slate-800">{totalCount.toLocaleString()} <span className="text-sm font-medium text-slate-400">건</span></span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col px-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">총 판매 수량</span>
              <span className="text-xl font-black text-slate-800">{totalQuantity.toLocaleString()} <span className="text-sm font-medium text-slate-400">개</span></span>
            </div>
          </div>
        </div>

        {/* 테이블 데이터 */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                <th className="pb-3 px-4 w-16">순위</th>
                <th className="pb-3 px-4">
                  {activeTab === 'Product' ? '상품명' : activeTab === 'Date' ? '날짜' : '쇼핑몰명'}
                </th>
                <th className="pb-3 px-4 text-right">주문수</th>
                <th className="pb-3 px-4 text-right">판매수량</th>
                <th className="pb-3 px-4 text-right">매출액</th>
                <th className="pb-3 px-4 text-right">비중</th>
                <th className="pb-3 px-4 w-10"></th>
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
                  {totalCount.toLocaleString()} 건
                </td>
                <td className="py-3 px-4 text-right font-black text-slate-800">
                  {totalQuantity.toLocaleString()} 개
                </td>
                <td className="py-3 px-4 text-right font-black text-blue-600">
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-500 rounded-r-xl">
                  100%
                </td>
                <td></td>
              </tr>

              {aggregatedData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="bg-slate-50/50 hover:bg-blue-50/40 transition-all rounded-xl hover:shadow-sm cursor-pointer group"
                  onClick={() => handleRowClick(item)}
                >
                  <td className="py-3 px-4 rounded-l-xl">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                      idx < 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                    {item.key}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-600">
                    {item.count.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-500">
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-blue-600">
                    {formatCurrency(item.revenue)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-400">
                    {formatPercent(item.revenue, totalRevenue)}
                  </td>
                  <td className="py-3 px-4 text-center rounded-r-xl">
                    <i className="fas fa-chevron-right text-xs text-slate-300 group-hover:text-blue-500 transition-colors"></i>
                  </td>
                </tr>
              ))}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-300 font-bold">
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
          mallName="All" // Product view is aggregated across all malls
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

export default SalesStatusModal;
