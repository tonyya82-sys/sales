
import React, { useMemo, useState } from 'react';
import { SaleRecord, TimeGranularity } from '../types';
import { filterByDate } from '../utils/dataParser';
import MallDetailModal from './MallDetailModal';

interface MallStatusProps {
  records: SaleRecord[];
  granularity: TimeGranularity;
  startDate: string;
  endDate: string;
  selectedMall: string;
  onFilterChange: (filters: { startDate?: string; endDate?: string; selectedMall?: string }) => void;
}

const MallStatus: React.FC<MallStatusProps> = ({ 
  records, 
  startDate, 
  endDate, 
  onFilterChange 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMallForDetail, setSelectedMallForDetail] = useState<string | null>(null);

  const recordsInDateRange = useMemo(() => filterByDate(records, startDate, endDate), [records, startDate, endDate]);
  
  const aggregatedData = useMemo(() => {
    const map = new Map<string, { name: string, revenue: number, quantity: number, orderCount: number }>();

    recordsInDateRange.forEach(r => {
      const existing = map.get(r.mallName) || { name: r.mallName, revenue: 0, quantity: 0, orderCount: 0 };
      map.set(r.mallName, {
        ...existing,
        revenue: existing.revenue + r.totalPrice,
        quantity: existing.quantity + r.quantity,
        orderCount: existing.orderCount + 1
      });
    });

    return Array.from(map.values())
      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.revenue - a.revenue);
  }, [recordsInDateRange, searchTerm]);

  const totalRevenue = aggregatedData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalOrders = aggregatedData.reduce((acc, curr) => acc + curr.orderCount, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ko-KR', { 
      style: 'currency', currency: 'KRW', minimumFractionDigits: 0, maximumFractionDigits: 0 
    }).format(value);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <i className="fas fa-store text-blue-600"></i>
              쇼핑몰별 성과 리포트
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">
              쇼핑몰 이름을 클릭하면 해당 쇼핑몰의 일자별 및 상품별 판매 상세 내역을 확인할 수 있습니다.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
             <div className="bg-blue-50 px-6 py-4 rounded-2xl border border-blue-100 min-w-[200px]">
                <p className="text-[10px] font-black text-blue-400 uppercase mb-1">선택 기간 총 매출액</p>
                <p className="text-xl font-black text-blue-600">{formatCurrency(totalRevenue)}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">조회 시작일</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => onFilterChange({ startDate: e.target.value })} 
              className="w-full border-none ring-1 ring-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">조회 종료일</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => onFilterChange({ endDate: e.target.value })} 
              className="w-full border-none ring-1 ring-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">쇼핑몰 검색</label>
            <div className="relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="쇼핑몰명을 입력하세요..."
                className="w-full border-none ring-1 ring-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
           <div className="border border-slate-100 rounded-2xl p-5 hover:bg-slate-50 transition-colors">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">운영 쇼핑몰</p>
              <p className="text-xl font-black text-slate-800">{aggregatedData.length} 개</p>
           </div>
           <div className="border border-slate-100 rounded-2xl p-5 hover:bg-slate-50 transition-colors">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">총 주문 건수</p>
              <p className="text-xl font-black text-slate-800">{totalOrders.toLocaleString()} 건</p>
           </div>
           <div className="border border-slate-100 rounded-2xl p-5 hover:bg-slate-50 transition-colors">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">전체 평균 객단가</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(avgOrderValue)}</p>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                <th className="pb-2 px-4">순위</th>
                <th className="pb-2 px-4">쇼핑몰명</th>
                <th className="pb-2 px-4 text-right">주문수</th>
                <th className="pb-2 px-4 text-right">매출액</th>
                <th className="pb-2 px-4 text-right">점유율</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedData.map((m, idx) => (
                <tr key={idx} className="bg-slate-50/50 hover:bg-blue-50/50 transition-all rounded-2xl group cursor-pointer" onClick={() => setSelectedMallForDetail(m.name)}>
                  <td className="py-5 px-4 rounded-l-2xl">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-[10px] font-black ${
                      idx < 3 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-5 px-4 font-black text-slate-700 group-hover:text-blue-600 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       {m.name}
                    </div>
                  </td>
                  <td className="py-5 px-4 text-right text-slate-500 font-bold">
                    {m.orderCount.toLocaleString()} 건
                  </td>
                  <td className="py-5 px-4 text-right font-black text-slate-800">
                    {formatCurrency(m.revenue)}
                  </td>
                  <td className="py-5 px-4 text-right rounded-r-2xl">
                    <div className="flex items-center justify-end gap-3">
                       <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-blue-600 shadow-sm">
                         {((m.revenue / (totalRevenue || 1)) * 100).toFixed(1)}%
                       </span>
                       <i className="fas fa-chevron-right text-slate-300 group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </td>
                </tr>
              ))}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center text-slate-300 font-bold">
                    <div className="flex flex-col items-center gap-4">
                       <i className="fas fa-store-slash text-5xl opacity-20"></i>
                       <p>데이터가 존재하지 않거나 검색 결과가 없습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMallForDetail && (
        <MallDetailModal 
          records={records}
          mallName={selectedMallForDetail}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setSelectedMallForDetail(null)}
        />
      )}
    </div>
  );
};

export default MallStatus;
