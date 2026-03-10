
import React, { useState, useMemo } from 'react';
import { SaleRecord } from '../types';
import { filterByDate } from '../utils/dataParser';

interface DateSalesModalProps {
  records: SaleRecord[];
  onClose: () => void;
}

type SortKey = 'date' | 'count' | 'revenue';
type SortDirection = 'asc' | 'desc';

const DateSalesModal: React.FC<DateSalesModalProps> = ({ records, onClose }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });

  // 날짜 초기값 설정
  useMemo(() => {
    if (records.length > 0 && (!startDate || !endDate)) {
      const dates = records.map(r => r.date).sort();
      setStartDate(dates[0]);
      setEndDate(dates[dates.length - 1]);
    }
  }, [records]);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const toggleDate = (date: string) => {
    const next = new Set(expandedDates);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    setExpandedDates(next);
  };

  const dailyData = useMemo(() => {
    let filtered = filterByDate(records, startDate, endDate);

    // 상품 검색 필터
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        (r.koreanName && r.koreanName.toLowerCase().includes(term)) ||
        (r.englishName && r.englishName.toLowerCase().includes(term))
      );
    }

    const map = new Map<string, { 
      date: string, 
      revenue: number, 
      quantity: number, 
      orderCount: number,
      products: Map<string, { quantity: number, revenue: number, count: number }>
    }>();

    filtered.forEach(r => {
      if (!map.has(r.date)) {
        map.set(r.date, { date: r.date, revenue: 0, quantity: 0, orderCount: 0, products: new Map() });
      }
      const dayEntry = map.get(r.date)!;
      dayEntry.revenue += r.totalPrice;
      dayEntry.quantity += r.quantity;
      dayEntry.orderCount += 1;

      const prodEntry = dayEntry.products.get(r.koreanName) || { quantity: 0, revenue: 0, count: 0 };
      dayEntry.products.set(r.koreanName, {
        quantity: prodEntry.quantity + r.quantity,
        revenue: prodEntry.revenue + r.totalPrice,
        count: prodEntry.count + 1
      });
    });

    const result = Array.from(map.values());

    // Sorting
    result.sort((a, b) => {
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      if (sortConfig.key === 'date') return multiplier * a.date.localeCompare(b.date);
      if (sortConfig.key === 'count') return multiplier * (a.orderCount - b.orderCount);
      if (sortConfig.key === 'revenue') return multiplier * (a.revenue - b.revenue);
      return 0;
    });

    return result;
  }, [records, startDate, endDate, sortConfig, searchTerm]);

  const totalRevenue = dailyData.reduce((acc, curr) => acc + curr.revenue, 0);
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ko-KR', { 
      style: 'currency', currency: 'KRW', minimumFractionDigits: 0, maximumFractionDigits: 0 
    }).format(value);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <i className="fas fa-sort text-slate-300 ml-1 text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"></i>;
    return sortConfig.direction === 'asc' 
      ? <i className="fas fa-sort-up text-blue-600 ml-1 relative top-[3px]"></i>
      : <i className="fas fa-sort-down text-blue-600 ml-1 relative bottom-[3px]"></i>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <i className="far fa-calendar-alt text-blue-600"></i>
              날짜별 매출 리포트
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">날짜를 클릭하면 해당 일자의 상품별 판매 상세 내역을 확인할 수 있습니다.</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Filter */}
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

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">상품명 검색</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="상품명 검색..."
                className="w-full border-none ring-1 ring-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
           <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 min-w-[150px]">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">선택 기간 총 매출</p>
            <p className="text-lg font-black text-blue-600">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2.5">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-slate-400 font-bold uppercase tracking-widest">
                <th 
                  className="pb-4 px-4 font-black cursor-pointer hover:text-blue-600 transition-colors group select-none"
                  onClick={() => handleSort('date')}
                >
                  판매 일자 <SortIcon column="date" />
                </th>
                <th 
                  className="pb-4 px-4 text-right font-black cursor-pointer hover:text-blue-600 transition-colors group select-none"
                  onClick={() => handleSort('count')}
                >
                  주문수 <SortIcon column="count" />
                </th>
                <th 
                  className="pb-4 px-4 text-right font-black cursor-pointer hover:text-blue-600 transition-colors group select-none"
                  onClick={() => handleSort('revenue')}
                >
                  총 매출액 <SortIcon column="revenue" />
                </th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((item, idx) => (
                <React.Fragment key={idx}>
                  <tr 
                    className={`cursor-pointer transition-all rounded-2xl ${
                        expandedDates.has(item.date) ? 'bg-blue-50/70 shadow-sm' : 'bg-slate-50/40 hover:bg-blue-50/50'
                    }`}
                    onClick={() => toggleDate(item.date)}
                  >
                    <td className="py-4 px-4 font-black text-slate-700 rounded-l-2xl flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center bg-white border border-slate-100 transition-transform duration-200 ${expandedDates.has(item.date) ? 'rotate-90' : ''}`}>
                             <i className={`fas fa-chevron-right text-[8px] ${expandedDates.has(item.date) ? 'text-blue-500' : 'text-slate-300'}`}></i>
                        </div>
                        {item.date}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-500 font-bold">
                      {item.orderCount.toLocaleString()} 건
                    </td>
                    <td className="py-4 px-4 text-right font-black text-blue-600 rounded-r-2xl">
                      {formatCurrency(item.revenue)}
                    </td>
                  </tr>

                  {expandedDates.has(item.date) && (
                    <tr>
                      <td colSpan={3} className="px-4 pb-4 pt-1">
                        <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-lg shadow-blue-50/50 p-5 space-y-4 animate-in slide-in-from-top-3 duration-200">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-50 pb-3">
                            {item.date} 상품별 판매 상세
                          </p>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                             {Array.from(item.products.entries())
                                .sort((a, b) => b[1].revenue - a[1].revenue)
                                .map(([prodName, stats], i) => (
                               <div key={i} className="flex justify-between items-center gap-4 text-xs group hover:bg-slate-50 p-2 rounded-lg transition">
                                 <span className="text-slate-700 font-bold flex-1 leading-relaxed flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-black">{i + 1}</span>
                                    {prodName}
                                 </span>
                                 <div className="flex gap-6 items-center flex-shrink-0">
                                   <span className="text-slate-400 font-medium w-16 text-right">{stats.count.toLocaleString()} 건</span>
                                   <span className="font-black text-slate-800 w-24 text-right">{formatCurrency(stats.revenue)}</span>
                                 </div>
                               </div>
                             ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {dailyData.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-20 text-center text-slate-300 font-bold">
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

export default DateSalesModal;
