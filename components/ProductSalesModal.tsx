
import React, { useState, useMemo } from 'react';
import { SaleRecord } from '../types';
import { filterByDate } from '../utils/dataParser';
import StoreProductModal from './StoreProductModal';

interface ProductSalesModalProps {
  records: SaleRecord[];
  onClose: () => void;
}

const ProductSalesModal: React.FC<ProductSalesModalProps> = ({ records, onClose }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedMall, setSelectedMall] = useState<string | null>(null);

  // 날짜 초기값 설정
  useMemo(() => {
    if (records.length > 0 && (!startDate || !endDate)) {
      const dates = records.map(r => r.date).sort();
      setStartDate(dates[0]);
      setEndDate(dates[dates.length - 1]);
    }
  }, [records]);

  // 스토어별 집계 데이터 생성 (기존 상품별에서 변경됨)
  const aggregatedData = useMemo(() => {
    let filtered = filterByDate(records, startDate, endDate);
    
    // 상품명 검색 필터 적용 (집계 전)
    if (productSearchTerm.trim()) {
      const term = productSearchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        (r.koreanName && r.koreanName.toLowerCase().includes(term)) ||
        (r.englishName && r.englishName.toLowerCase().includes(term))
      );
    }

    const map = new Map<string, { name: string, revenue: number, quantity: number, count: number }>();

    filtered.forEach(r => {
      const key = r.mallName;
      const existing = map.get(key) || { name: r.mallName, revenue: 0, quantity: 0, count: 0 };
      map.set(key, {
        ...existing,
        revenue: existing.revenue + r.totalPrice,
        quantity: existing.quantity + r.quantity,
        count: existing.count + 1
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue);
  }, [records, startDate, endDate, productSearchTerm]);

  const totalRevenue = aggregatedData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalOrders = aggregatedData.reduce((acc, curr) => acc + curr.count, 0);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ko-KR', { 
      style: 'currency', currency: 'KRW', minimumFractionDigits: 0, maximumFractionDigits: 0 
    }).format(value);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <i className="fas fa-store text-blue-600"></i>
              상품별 매출 리포트
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">쇼핑몰을 클릭하면 해당 쇼핑몰의 상품별 판매 내역을 확인할 수 있습니다.</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* 필터 바 */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">조회 기간</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="border-none ring-1 ring-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-slate-300">~</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="border-none ring-1 ring-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[180px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">상품명 검색 (필터)</label>
            <div className="relative">
              <i className="fas fa-box absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input 
                type="text" 
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                placeholder="상품명 입력..."
                className="w-full border-none ring-1 ring-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 min-w-[150px]">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">선택 기간 총 매출</p>
            <p className="text-lg font-black text-blue-600">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2.5">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-slate-400 font-bold uppercase tracking-widest">
                <th className="pb-4 px-4 font-black w-20">순위</th>
                <th className="pb-4 px-4 font-black">쇼핑몰명</th>
                <th className="pb-4 px-4 text-right font-black">
                  <div className="flex items-center justify-end gap-1 cursor-help" title="조회 기간 내 발생한 주문(데이터 행)의 총 개수입니다.">
                    주문수 <i className="fas fa-info-circle text-slate-300 text-xs"></i>
                  </div>
                </th>
                <th className="pb-4 px-4 text-right font-black">총 매출액</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="group bg-slate-50/40 hover:bg-blue-50/50 transition-all rounded-2xl cursor-pointer"
                  onClick={() => setSelectedMall(item.name)}
                >
                  <td className="py-4 px-4 rounded-l-2xl">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                      idx < 3 ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-700 group-hover:text-blue-600 group-hover:underline decoration-blue-400">
                    <div className="flex items-center gap-2">
                       {item.name}
                       <i className="fas fa-chevron-right text-xs opacity-0 group-hover:opacity-100 transition-opacity text-blue-400"></i>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-slate-500 font-bold">
                    {item.count.toLocaleString()} 건
                  </td>
                  <td className="py-4 px-4 text-right font-black text-blue-600 rounded-r-2xl">
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-slate-300 font-bold">
                    <i className="fas fa-search-minus text-4xl mb-4 block"></i>
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 총계 요약 */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-8">
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">총 주문수</p>
                <p className="text-2xl font-black text-slate-800">{totalOrders.toLocaleString()} <span className="text-sm font-bold text-slate-400">건</span></p>
            </div>
        </div>

      </div>

      {/* 스토어 상품 리스트 팝업 (2단계) */}
      {selectedMall && (
        <StoreProductModal 
          records={records}
          mallName={selectedMall}
          startDate={startDate}
          endDate={endDate}
          initialSearchTerm={productSearchTerm}
          onClose={() => setSelectedMall(null)}
        />
      )}
    </div>
  );
};

export default ProductSalesModal;
    