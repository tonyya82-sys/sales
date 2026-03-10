
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import { filterByDate } from '../utils/dataParser';

interface DateDetailModalProps {
  records: SaleRecord[];
  date: string;
  initialSearchTerm?: string;
  onClose: () => void;
}

const DateDetailModal: React.FC<DateDetailModalProps> = ({ 
  records, 
  date, 
  initialSearchTerm = '',
  onClose 
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const productList = useMemo(() => {
    // 해당 날짜의 레코드만 필터링
    const filtered = records.filter(r => r.date === date);

    // 상품별 집계
    const map = new Map<string, { name: string, quantity: number, revenue: number, count: number, settlement: number, profit: number }>();

    filtered.forEach(r => {
      const key = r.koreanName;
      const existing = map.get(key) || { name: r.koreanName, quantity: 0, revenue: 0, count: 0, settlement: 0, profit: 0 };
      map.set(key, {
        ...existing,
        quantity: existing.quantity + r.quantity,
        revenue: existing.revenue + r.totalPrice,
        count: existing.count + 1,
        settlement: existing.settlement + (r.settlementPrice || 0),
        profit: existing.profit + (r.profitSettlement || 0)
      });
    });

    return Array.from(map.values())
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.revenue - a.revenue);
  }, [records, date, searchTerm]);

  const totalRevenue = productList.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalQty = productList.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalOrders = productList.reduce((acc, curr) => acc + curr.count, 0);
  const totalSettlement = productList.reduce((acc, curr) => acc + curr.settlement, 0);
  const totalProfit = productList.reduce((acc, curr) => acc + curr.profit, 0);
  const totalMargin = totalSettlement > 0 ? (totalProfit / totalSettlement) * 100 : 0;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ko-KR', { 
      style: 'currency', currency: 'KRW', minimumFractionDigits: 0, maximumFractionDigits: 0 
    }).format(value);

  const formatEUR = (value: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                {date}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-800">
              일자별 상품 판매 상세
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-1">해당 일자에 판매된 상품 내역입니다.</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Summary & Filter */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col gap-4">
           <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xs">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="상품명 검색..."
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                <div>총 주문: <span className="text-slate-800">{totalOrders.toLocaleString()}건</span></div>
                <div>총 수량: <span className="text-slate-800">{totalQty.toLocaleString()}개</span></div>
              </div>
           </div>
           
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
               <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] text-slate-400 uppercase">총 매출</p>
                  <p className="text-blue-600 text-sm font-black">{formatCurrency(totalRevenue)}</p>
               </div>
               <div className="bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm text-center">
                  <p className="text-[10px] text-blue-400 uppercase">총 정산가</p>
                  <p className="text-blue-600 text-sm font-black">{formatEUR(totalSettlement)}</p>
               </div>
               <div className="bg-white px-3 py-2 rounded-lg border border-emerald-100 shadow-sm text-center">
                  <p className="text-[10px] text-emerald-400 uppercase">총 수익</p>
                  <p className="text-emerald-600 text-sm font-black">{formatEUR(totalProfit)}</p>
               </div>
               <div className="bg-white px-3 py-2 rounded-lg border border-indigo-100 shadow-sm text-center">
                  <p className="text-[10px] text-indigo-400 uppercase">수익률</p>
                  <p className="text-indigo-600 text-sm font-black">{formatPercent(totalMargin)}</p>
               </div>
           </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                <th className="pb-3 px-4 w-16">순위</th>
                <th className="pb-3 px-4">상품명</th>
                <th className="pb-3 px-4 text-right">주문수</th>
                <th className="pb-3 px-4 text-right">수량</th>
                <th className="pb-3 px-4 text-right">매출액</th>
                <th className="pb-3 px-4 text-right text-emerald-600">수익 (EUR)</th>
                <th className="pb-3 px-4 text-right text-indigo-500">수익률</th>
              </tr>
            </thead>
            <tbody>
              {productList.map((item, idx) => {
                const itemMargin = item.settlement > 0 ? (item.profit / item.settlement) * 100 : 0;
                return (
                  <tr 
                    key={idx} 
                    className="bg-slate-50/50 hover:bg-blue-50/30 transition-all rounded-xl hover:shadow-sm"
                  >
                    <td className="py-3 px-4 rounded-l-xl">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                        idx < 3 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      {item.count.toLocaleString()} 건
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      {item.quantity.toLocaleString()} 개
                    </td>
                    <td className="py-3 px-4 text-right font-black text-blue-600">
                      {formatCurrency(item.revenue)}
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
              {productList.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-300 font-bold">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DateDetailModal;
