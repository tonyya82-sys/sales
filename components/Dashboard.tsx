
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { SaleRecord, TimeGranularity } from '../types';
import { aggregateByMall, aggregateByProduct, aggregateByTime, filterByDate, aggregateMallsByTime } from '../utils/dataParser';

interface DashboardProps {
  records: SaleRecord[];
  granularity: TimeGranularity;
  startDate: string;
  endDate: string;
  selectedMall: string;
  onFilterChange: (filters: { startDate?: string; endDate?: string; selectedMall?: string }) => void;
  onOpenProductSales: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

const Dashboard: React.FC<DashboardProps> = ({ 
  records, 
  granularity, 
  startDate, 
  endDate, 
  selectedMall, 
  onFilterChange,
  onOpenProductSales
}) => {
  // 날짜 범위 필터링 적용
  const recordsInDateRange = useMemo(() => filterByDate(records, startDate, endDate), [records, startDate, endDate]);
  
  // 선택된 쇼핑몰 필터링 (카드 수치 및 일별 차트용)
  const filteredRecords = useMemo(() => 
    selectedMall === 'All' ? recordsInDateRange : recordsInDateRange.filter(r => r.mallName === selectedMall), 
    [recordsInDateRange, selectedMall]
  );
  
  // 전체 쇼핑몰 리스트
  const mallList = useMemo(() => ['All', ...Array.from(new Set(records.map(r => r.mallName)))], [records]);
  
  // 통계 집계 (필터 변경 시 자동 재계산)
  const mallStats = useMemo(() => aggregateByMall(recordsInDateRange), [recordsInDateRange]);
  const productStats = useMemo(() => aggregateByProduct(filteredRecords).slice(0, 10), [filteredRecords]);
  const timeStats = useMemo(() => aggregateByTime(filteredRecords, granularity), [filteredRecords, granularity]);
  
  // 쇼핑몰별 시간 시계열 집계 (일별/주별/월별 누적 차트용) -> 필터된 레코드 사용으로 변경하여 선택된 쇼핑몰만 보이게 수정
  const mallTimeTrend = useMemo(() => aggregateMallsByTime(filteredRecords, granularity), [filteredRecords, granularity]);

  // 총 수치 계산 (엄격하게 합계행 totalPrice 합산)
  const totalRevenue = useMemo(() => filteredRecords.reduce((acc, r) => acc + r.totalPrice, 0), [filteredRecords]);
  const totalOrders = filteredRecords.length;
  // 총 수익 계산 (M열 profitSettlement 합산)
  const totalProfit = useMemo(() => filteredRecords.reduce((acc, r) => acc + (r.profitSettlement || 0), 0), [filteredRecords]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ko-KR', { 
      style: 'currency', currency: 'KRW', minimumFractionDigits: 0, maximumFractionDigits: 0 
    }).format(value);

  const formatEUR = (value: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  // 차트 툴팁 커스터마이징 (매출 합계 + 주문 건수)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[200px] z-50">
          <p className="text-sm font-black text-slate-800 mb-2 border-b border-slate-50 pb-1">{label}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">전체 매출 합계</span>
              <span className="text-xs font-black text-blue-600">{formatCurrency(data.revenue)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">전체 주문 건수</span>
              <span className="text-xs font-black text-emerald-600">{data.count.toLocaleString()}건</span>
            </div>
            
            {/* 누적 막대 차트인 경우 개별 쇼핑몰 상세 내역 표시 */}
            {payload.length > 1 && (
              <div className="mt-2 pt-2 border-t border-slate-50 space-y-1 max-h-[150px] overflow-y-auto">
                {payload
                  .filter((p: any) => p.name !== '총 합계' && p.value > 0)
                  .sort((a: any, b: any) => b.value - a.value)
                  .map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[10px]">
                      <span className="font-semibold truncate max-w-[80px]" style={{ color: p.color }}>{p.name}</span>
                      <span className="font-bold">{formatCurrency(p.value)}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 검색 필터 컨트롤 - 날짜만 남김 (쇼핑몰 선택은 버튼으로 이동) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">조회 시작일</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => onFilterChange({ startDate: e.target.value })} 
            className="w-full border-none ring-1 ring-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 hover:bg-white transition-all" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">조회 종료일</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => onFilterChange({ endDate: e.target.value })} 
            className="w-full border-none ring-1 ring-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 hover:bg-white transition-all" 
          />
        </div>
      </div>

      {/* 스토어 바로가기 버튼 (필터) */}
      <div className="flex flex-wrap gap-3 items-center">
        {mallList.map(mall => (
          <button
            key={mall}
            onClick={() => onFilterChange({ selectedMall: mall })}
            className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all shadow-sm flex items-center gap-2 ${
              selectedMall === mall
                ? 'bg-slate-800 text-white shadow-lg scale-105 ring-2 ring-slate-800 ring-offset-2'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {mall === 'All' ? <i className="fas fa-layer-group"></i> : <i className="fas fa-store"></i>}
            {mall === 'All' ? '전체 통합' : mall}
          </button>
        ))}
      </div>

      {/* KPI 카드 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Revenue */}
        <div 
          onClick={onOpenProductSales}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
             <i className="fas fa-external-link-alt text-slate-200"></i>
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-md shadow-blue-100 group-hover:scale-110 transition-transform">
              <i className="fas fa-won-sign text-xl"></i>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Total Revenue</span>
          </div>
          <p className="text-xs font-bold text-slate-400 mb-1 uppercase">총 매출 (합계행 합산)</p>
          <h3 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{formatCurrency(totalRevenue)}</h3>
        </div>

        {/* Card 2 (Swapped): Total Profit */}
        <div 
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 hover:shadow-lg transition-all transform hover:-translate-y-1"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-md shadow-emerald-100">
              <i className="fas fa-hand-holding-usd text-xl"></i>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Total Profit</span>
          </div>
          <p className="text-xs font-bold text-slate-400 mb-1 uppercase">총 수익 (M열 합계)</p>
          <h3 className="text-2xl font-black text-emerald-600 leading-tight">{formatEUR(totalProfit)}</h3>
        </div>

        {/* Card 3 (Swapped): Total Orders */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 hover:shadow-lg transition-all transform hover:-translate-y-1">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-md shadow-amber-100">
              <i className="fas fa-list-ol text-xl"></i>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Total Orders</span>
          </div>
          <p className="text-xs font-bold text-slate-400 mb-1 uppercase">총 주문 건수</p>
          <h3 className="text-2xl font-black text-slate-900 leading-tight">{totalOrders.toLocaleString()} 건</h3>
        </div>

        {/* Card 4: Popular Product */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 hover:shadow-lg transition-all transform hover:-translate-y-1">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-500 text-white p-3 rounded-2xl shadow-md shadow-purple-100">
              <i className="fas fa-bolt text-xl"></i>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Popular Product</span>
          </div>
          <p className="text-xs font-bold text-slate-400 mb-1 uppercase">베스트셀러 상품</p>
          <h3 className="text-xl font-black text-slate-900 truncate">{productStats[0]?.label || '-'}</h3>
        </div>
      </div>

      {/* 분석 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 전체 매출 분석 차트 */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            전체 쇼핑몰 매출 분석 ({granularity === 'Daily' ? '일별' : granularity === 'Weekly' ? '주별' : '월별'})
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mallTimeTrend.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" fontSize={11} tickMargin={12} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `${(val / 10000).toFixed(0)}만`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                {/* 쇼핑몰별 라인 */}
                {mallTimeTrend.mallNames.map((mall, idx) => (
                  <Line 
                    key={mall} 
                    type="monotone" 
                    dataKey={mall} 
                    name={mall} 
                    stroke={COLORS[idx % COLORS.length]} 
                    strokeWidth={1.5} 
                    dot={{ r: 2, fill: COLORS[idx % COLORS.length], strokeWidth: 0 }} 
                    activeDot={{ r: 4, strokeWidth: 0 }} 
                  />
                ))}
                {/* 총 합계 라인 (Indigo, 직관적, 비-빨강) - 전체 보기일 때만 표시 */}
                {selectedMall === 'All' && (
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="총 합계" 
                    stroke="#4F46E5" 
                    strokeWidth={2} 
                    dot={{ r: 3, fill: '#4F46E5', strokeWidth: 0 }} 
                    activeDot={{ r: 5, strokeWidth: 0 }} 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 쇼핑몰별 성과 비교 차트 (시간 기반 누적 막대) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
            쇼핑몰별 성과 비교 리포트 ({granularity === 'Daily' ? '일별' : granularity === 'Weekly' ? '주별' : '월별'})
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mallTimeTrend.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" fontSize={11} tickMargin={12} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `${(val / 10000).toFixed(0)}만`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                {mallTimeTrend.mallNames.map((mall, idx) => (
                  <Bar 
                    key={mall} 
                    dataKey={mall} 
                    name={mall} 
                    stackId="a" 
                    fill={COLORS[idx % COLORS.length]} 
                    radius={idx === mallTimeTrend.mallNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top 5 Best-Selling Products (Quantity) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
            가장 많이 팔린 상품 TOP 5 (수량 기준)
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                layout="vertical" 
                data={[...productStats].sort((a, b) => b.quantity - a.quantity).slice(0, 5)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="label" width={100} fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="quantity" name="판매 수량" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Unit Price by Product */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
            상품별 평균 단가 (매출 상위 10개)
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={productStats.slice(0, 10).map(p => ({
                  ...p,
                  avgPrice: p.quantity > 0 ? Math.round(p.productRevenue / p.quantity) : 0
                }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" fontSize={11} tickMargin={12} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `${(val / 10000).toFixed(0)}만`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), '평균 단가']}
                />
                <Bar dataKey="avgPrice" name="평균 단가" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-8">주문 점유율 분석 (현재 필터 기준)</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={mallStats} 
                  dataKey="count" 
                  nameKey="label" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={80} 
                  outerRadius={110} 
                  paddingAngle={10} 
                  stroke="none" 
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {mallStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-800">Top 10 판매 상품 (매출액 기준)</h3>
            <div className="bg-slate-100 text-slate-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
              {selectedMall === 'All' ? '전체 쇼핑몰' : selectedMall}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-separate border-spacing-y-3">
              <thead>
                <tr className="text-slate-400 font-bold uppercase tracking-widest border-b border-slate-50">
                  <th className="pb-2 px-3">상품명</th>
                  <th className="pb-2 px-3 text-right">주문수</th>
                  <th className="pb-2 px-3 text-right">합계 매출</th>
                </tr>
              </thead>
              <tbody>
                {/* 전체 합계 행 추가 (Indigo 강조) */}
                <tr className="bg-slate-100 hover:bg-slate-200/70 transition-all rounded-2xl shadow-sm">
                  <td className="py-4 px-3 font-black text-slate-800 truncate max-w-[280px] rounded-l-2xl">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white rounded-lg text-[10px] mr-3">
                      <i className="fas fa-sigma"></i>
                    </span>
                    전체 합계
                  </td>
                  <td className="py-4 px-3 text-right text-slate-700 font-black">{totalOrders.toLocaleString()} 건</td>
                  <td className="py-4 px-3 text-right font-black text-slate-900 rounded-r-2xl">{formatCurrency(totalRevenue)}</td>
                </tr>

                {productStats.map((p, idx) => (
                  <tr key={idx} className="group bg-slate-50/50 hover:bg-slate-50 transition-all rounded-2xl">
                    <td className="py-4 px-3 font-bold text-slate-700 truncate max-w-[280px] rounded-l-2xl">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-200 text-slate-600 rounded-lg text-[10px] mr-3">{idx + 1}</span>
                      {p.label}
                    </td>
                    <td className="py-4 px-3 text-right text-slate-500 font-black">{p.count.toLocaleString()} 건</td>
                    <td className="py-4 px-3 text-right font-black text-blue-600 rounded-r-2xl">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
                {productStats.length === 0 && (
                  <tr><td colSpan={3} className="py-12 text-center text-slate-300 font-bold">표시할 데이터가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
