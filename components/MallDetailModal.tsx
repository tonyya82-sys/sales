
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import { filterByDate } from '../utils/dataParser';

interface MallDetailModalProps {
  records: SaleRecord[];
  mallName: string;
  startDate: string;
  endDate: string;
  searchTerm?: string;
  onClose: () => void;
}

const MallDetailModal: React.FC<MallDetailModalProps> = ({ 
  records, 
  mallName, 
  startDate, 
  endDate, 
  searchTerm = '',
  onClose 
}) => {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const toggleDate = (date: string) => {
    const next = new Set(expandedDates);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    setExpandedDates(next);
  };

  const dailyDetails = useMemo(() => {
    let filtered = filterByDate(records, startDate, endDate).filter(
      r => r.mallName === mallName
    );

    if (localSearchTerm) {
      const lower = localSearchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        (r.koreanName && r.koreanName.toLowerCase().includes(lower)) ||
        (r.englishName && r.englishName.toLowerCase().includes(lower))
      );
    }

    const map = new Map<string, { 
      date: string, 
      quantity: number, 
      revenue: number, 
      orderCount: number,
      settlement: number,
      profit: number,
      products: Map<string, { quantity: number, revenue: number, count: number, settlement: number, profit: number }> 
    }>();

    filtered.forEach(r => {
      if (!map.has(r.date)) {
        map.set(r.date, { date: r.date, quantity: 0, revenue: 0, orderCount: 0, settlement: 0, profit: 0, products: new Map() });
      }
      const dayEntry = map.get(r.date)!;
      dayEntry.quantity += r.quantity;
      dayEntry.revenue += r.totalPrice;
      dayEntry.orderCount += 1;
      dayEntry.settlement += r.settlementPrice || 0;
      dayEntry.profit += r.profitSettlement || 0;

      const prodEntry = dayEntry.products.get(r.koreanName) || { quantity: 0, revenue: 0, count: 0, settlement: 0, profit: 0 };
      dayEntry.products.set(r.koreanName, {
        quantity: prodEntry.quantity + r.quantity,
        revenue: prodEntry.revenue + r.totalPrice,
        count: prodEntry.count + 1,
        settlement: prodEntry.settlement + (r.settlementPrice || 0),
        profit: prodEntry.profit + (r.profitSettlement || 0)
      });
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, mallName, startDate, endDate, localSearchTerm]);

  const totalQty = dailyDetails.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalRev = dailyDetails.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalOrders = dailyDetails.reduce((acc, curr) => acc + curr.orderCount, 0);
  const totalSettlement = dailyDetails.reduce((acc, curr) => acc + curr.settlement, 0);
  const totalProfit = dailyDetails.reduce((acc, curr) => acc + curr.profit, 0);
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
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div className="pr-12">
            <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest mb-3 inline-block shadow-lg shadow-blue-100">
              Mall Detail View
            </span>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">
              {mallName} 상세 실적
            </h3>
            <p className="text-slate-400 text-xs font-bold mt-2">
              <i className="far fa-calendar-alt mr-1"></i> {startDate} ~ {endDate}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition flex-shrink-0"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Search & Stats Section */}
        <div className="p-6 bg-white border-b border-slate-50">
          {/* Search Input */}
          <div className="mb-6 relative max-w-md mx-auto">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder="이 쇼핑몰 내 상품 검색..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center border-r border-slate-100 last:border-0">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">총 주문 건수</p>
              <p className="text-lg font-black text-slate-800">{totalOrders.toLocaleString()} 건</p>
            </div>
            <div className="text-center border-r border-slate-100 last:border-0">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">총 매출액</p>
              <p className="text-lg font-black text-slate-800">{formatCurrency(totalRev)}</p>
            </div>
            <div className="text-center border-r border-slate-100 last:border-0">
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">총 정산가 (EUR)</p>
              <p className="text-lg font-black text-blue-600">{formatEUR(totalSettlement)}</p>
            </div>
            <div className="text-center border-r border-slate-100 last:border-0">
              <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">총 수익 (EUR)</p>
              <p className="text-lg font-black text-emerald-600">{formatEUR(totalProfit)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">평균 수익률</p>
              <p className="text-lg font-black text-indigo-600">{formatPercent(totalMargin)}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 pt-4">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead className="sticky top-0 bg-white z-10 shadow-sm shadow-white">
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                <th className="pb-3 px-4">판매 일자</th>
                <th className="pb-3 px-4 text-right">주문수</th>
                <th className="pb-3 px-4 text-right">매출액 (KRW)</th>
                <th className="pb-3 px-4 text-right text-emerald-600">수익 (EUR)</th>
                <th className="pb-3 px-4 text-right text-indigo-500">수익률</th>
              </tr>
            </thead>
            <tbody>
              {dailyDetails.map((item, idx) => {
                const itemMargin = item.settlement > 0 ? (item.profit / item.settlement) * 100 : 0;
                return (
                <React.Fragment key={idx}>
                  <tr 
                    onClick={() => toggleDate(item.date)}
                    className={`cursor-pointer transition-all rounded-xl ${
                      expandedDates.has(item.date) ? 'bg-blue-50/70 shadow-sm' : 'bg-slate-50/50 hover:bg-blue-50/40'
                    }`}
                  >
                    <td className="py-4 px-4 font-black text-slate-600 rounded-l-xl flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center bg-white border border-slate-100 transition-transform duration-200 ${expandedDates.has(item.date) ? 'rotate-90' : ''}`}>
                         <i className={`fas fa-chevron-right text-[8px] ${expandedDates.has(item.date) ? 'text-blue-500' : 'text-slate-300'}`}></i>
                      </div>
                      {item.date}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-500 font-bold">
                      {item.orderCount.toLocaleString()} 건
                    </td>
                    <td className="py-4 px-4 text-right font-black text-slate-800">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="py-4 px-4 text-right font-black text-emerald-600">
                      {formatEUR(item.profit)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-indigo-600 rounded-r-xl">
                      {formatPercent(itemMargin)}
                    </td>
                  </tr>
                  
                  {expandedDates.has(item.date) && (
                    <tr>
                      <td colSpan={5} className="px-4 pb-4 pt-1">
                        <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-lg shadow-blue-50/50 p-5 space-y-4 animate-in slide-in-from-top-3 duration-200">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-50 pb-3">당일 상품별 판매 상세</p>
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {Array.from(item.products.entries()).map(([prodName, stats]) => {
                                const prodMargin = stats.settlement > 0 ? (stats.profit / stats.settlement) * 100 : 0;
                                return (
                                  <div key={prodName} className="flex justify-between items-start gap-4 text-xs group hover:bg-slate-50 p-2 rounded-lg transition">
                                    <span className="text-slate-600 font-bold flex-1 leading-relaxed flex items-center gap-2">
                                      <i className="fas fa-box-open text-slate-300 text-[10px]"></i>
                                      {prodName}
                                    </span>
                                    <div className="flex gap-4 items-center flex-shrink-0 text-[11px]">
                                      <span className="text-slate-400 font-bold w-12 text-right">{stats.count.toLocaleString()} 건</span>
                                      <span className="font-bold text-slate-600 w-20 text-right">{formatCurrency(stats.revenue)}</span>
                                      <span className="font-bold text-emerald-600 w-16 text-right">{formatEUR(stats.profit)}</span>
                                      <span className="font-bold text-indigo-500 w-12 text-right">{formatPercent(prodMargin)}</span>
                                    </div>
                                  </div>
                                );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )})}
              {dailyDetails.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-12 text-center text-slate-300 font-bold">
                     해당 검색어에 대한 데이터가 없습니다.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button 
            onClick={onClose}
            className="bg-slate-900 text-white px-10 py-3 rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 active:scale-95"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default MallDetailModal;
