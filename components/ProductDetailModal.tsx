
import React, { useMemo } from 'react';
import { SaleRecord } from '../types';
import { filterByDate } from '../utils/dataParser';

interface ProductDetailModalProps {
  records: SaleRecord[];
  productName: string;
  mallName: string;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ 
  records, 
  productName, 
  mallName, 
  startDate, 
  endDate, 
  onClose 
}) => {
  // 해당 상품 + (전체 혹은 특정 쇼핑몰) + 기간으로 필터링 후 일자별 집계
  const dailyDetails = useMemo(() => {
    const filtered = filterByDate(records, startDate, endDate).filter(
      r => r.koreanName === productName && (mallName === 'All' || r.mallName === mallName)
    );

    const map = new Map<string, { 
      date: string, 
      quantity: number, 
      revenue: number,
      count: number,
      settlement: number,
      profit: number
    }>();

    filtered.forEach(r => {
      if (!map.has(r.date)) {
        map.set(r.date, { date: r.date, quantity: 0, revenue: 0, count: 0, settlement: 0, profit: 0 });
      }
      const dayEntry = map.get(r.date)!;
      dayEntry.quantity += r.quantity;
      dayEntry.revenue += r.totalPrice;
      dayEntry.count += 1;
      dayEntry.settlement += r.settlementPrice || 0;
      dayEntry.profit += r.profitSettlement || 0;
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, productName, mallName, startDate, endDate]);

  const totalQty = dailyDetails.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalRev = dailyDetails.reduce((acc, curr) => acc + curr.revenue, 0);
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[160] p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div className="pr-8">
            <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider mb-2 inline-block shadow-sm">
              {mallName === 'All' ? '전체 쇼핑몰 합산' : mallName}
            </span>
            <h3 className="text-xl font-black text-slate-800 leading-tight">
              {productName}
            </h3>
            <p className="text-slate-400 text-xs font-medium mt-1">일자별 판매 상세 내역 ({startDate} ~ {endDate})</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition flex-shrink-0"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-4 bg-white grid grid-cols-2 md:grid-cols-5 gap-4 border-b border-slate-50 px-8">
          <div className="text-center p-2 bg-slate-50 rounded-xl">
            <p className="text-[10px] font-black text-slate-400 uppercase">총 판매 수량</p>
            <p className="text-lg font-black text-slate-800">{totalQty.toLocaleString()} 개</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-xl">
            <p className="text-[10px] font-black text-slate-400 uppercase">총 판매 금액</p>
            <p className="text-lg font-black text-slate-800">{formatCurrency(totalRev)}</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[10px] font-black text-blue-400 uppercase">총 정산가(EUR)</p>
            <p className="text-lg font-black text-blue-600">{formatEUR(totalSettlement)}</p>
          </div>
          <div className="text-center p-2 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-400 uppercase">총 수익(EUR)</p>
            <p className="text-lg font-black text-emerald-600">{formatEUR(totalProfit)}</p>
          </div>
          <div className="text-center p-2 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-400 uppercase">평균 수익률</p>
            <p className="text-lg font-black text-indigo-600">{formatPercent(totalMargin)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 pt-2">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead className="sticky top-0 bg-white z-10 shadow-sm shadow-white">
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                <th className="pb-3 px-4 w-1/4">판매 일자</th>
                <th className="pb-3 px-4 text-right">주문수</th>
                <th className="pb-3 px-4 text-right">매출액 (KRW)</th>
                <th className="pb-3 px-4 text-right text-blue-500">정산가 (EUR)</th>
                <th className="pb-3 px-4 text-right text-emerald-600">수익 (EUR)</th>
                <th className="pb-3 px-4 text-right text-indigo-500">수익률</th>
              </tr>
            </thead>
            <tbody>
              {dailyDetails.map((item, idx) => {
                const itemMargin = item.settlement > 0 ? (item.profit / item.settlement) * 100 : 0;
                return (
                  <tr 
                    key={idx}
                    className="bg-slate-50/50 hover:bg-slate-100 transition-all rounded-xl"
                  >
                    <td className="py-4 px-4 font-bold text-slate-600 rounded-l-xl">
                      {item.date}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-slate-500">
                      {item.count.toLocaleString()} 건
                    </td>
                    <td className="py-4 px-4 text-right font-black text-slate-700">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-blue-600">
                      {formatEUR(item.settlement)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-600">
                      {formatEUR(item.profit)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-indigo-600 rounded-r-xl">
                      {formatPercent(itemMargin)}
                    </td>
                  </tr>
                );
              })}
              {dailyDetails.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-300 font-bold">내역이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button 
            onClick={onClose}
            className="bg-slate-800 text-white px-8 py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
