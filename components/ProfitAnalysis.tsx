
import React, { useMemo, useState, useEffect } from 'react';
import { SaleRecord } from '../types';
import { filterByDate, generateCSVWithCosts } from '../utils/dataParser';
import { updateProductCostsInSheet } from '../services/authService'; // 신규 API 함수

interface ProfitAnalysisProps {
  records: SaleRecord[];
  startDate: string;
  endDate: string;
  selectedMall: string;
  onFilterChange: (filters: { startDate?: string; endDate?: string; selectedMall?: string }) => void;
  onUpdateCost: (productName: string, cost: number) => void;
}

const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({
  records,
  startDate,
  endDate,
  selectedMall,
  onFilterChange,
  onUpdateCost
}) => {
  const [localCosts, setLocalCosts] = useState<Record<string, number>>({});
  const [updatingProduct, setUpdatingProduct] = useState<string | null>(null); // 업데이트 상태

  // 초기 비용 데이터 로드
  useEffect(() => {
    const savedCosts = JSON.parse(localStorage.getItem('product_costs') || '{}');
    setLocalCosts(savedCosts);
  }, []);

  // 비용 변경 핸들러
  const handleCostChange = async (productName: string, value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9]/g, '')) || 0;
    
    // 1. UI 즉시 반영 (낙관적 업데이트)
    const newCosts = { ...localCosts, [productName]: numValue };
    setLocalCosts(newCosts);
    localStorage.setItem('product_costs', JSON.stringify(newCosts));
    onUpdateCost(productName, numValue);

    // 2. 서버(구글 시트)에 반영
    if (updatingProduct !== productName) {
      setUpdatingProduct(productName);
      // 디바운싱 없이 즉시 호출 (필요시 디바운스 적용 가능)
      // 배송비용(ShippingCost)은 현재 UI에 입력란이 없으므로 0 혹은 기존값 유지 처리가 필요하나,
      // 여기서는 우선 원가(UnitCost) 업데이트에 집중
      await updateProductCostsInSheet(productName, numValue, 0); 
      setUpdatingProduct(null);
    }
  };

  // 필터링된 레코드
  const filteredRecords = useMemo(() => {
    let result = filterByDate(records, startDate, endDate);
    if (selectedMall !== 'All') {
      result = result.filter(r => r.mallName === selectedMall);
    }
    return result;
  }, [records, startDate, endDate, selectedMall]);

  // 상품별 집계
  const productAggregates = useMemo(() => {
    const map = new Map<string, { 
      quantity: number, 
      revenue: number,         // 합계 (Total Price)
      settlement: number,      // 정산가 (Settlement Price)
      shippingIncome: number,  // 배송비 (Revenue)
      totalUnitCost: number,   // 총 원가 (Unit Cost * Qty)
      totalShippingCost: number, // 총 배송비용 (Expense)
      totalPackagingCost: number // 총 포장비용 (Expense)
    }>();

    filteredRecords.forEach(r => {
      const existing = map.get(r.koreanName) || { 
        quantity: 0, 
        revenue: 0, 
        settlement: 0,
        shippingIncome: 0,
        totalUnitCost: 0,
        totalShippingCost: 0,
        totalPackagingCost: 0
      };
      
      // 우선순위: CSV/DB값(r.unitCost) > 로컬입력값 > 0
      // DB에서 가져온 값이 있으면(r.unitCost > 0) 그것을 사용.
      // 하지만 사용자가 방금 입력했다면(localCosts) 그것을 우선시해야 할 수도 있음.
      // 여기서는 DB값이 있으면 DB값 사용하되, 입력 필드는 localCost로 제어
      const effectiveUnitCost = r.unitCost > 0 ? r.unitCost : (localCosts[r.koreanName] || 0);

      map.set(r.koreanName, {
        quantity: existing.quantity + r.quantity,
        revenue: existing.revenue + r.totalPrice, 
        settlement: existing.settlement + r.settlementPrice, // 정산가 누적
        shippingIncome: existing.shippingIncome + r.shippingFee,
        totalUnitCost: existing.totalUnitCost + (effectiveUnitCost * r.quantity),
        totalShippingCost: existing.totalShippingCost + (r.shippingCost || 0), 
        totalPackagingCost: existing.totalPackagingCost + (r.packagingCost || 0)
      });
    });

    return Array.from(map.entries()).map(([name, stats]) => {
      // 총 지출 (원가 + 배송비용 + 포장비용)
      const totalExpense = stats.totalUnitCost + stats.totalShippingCost + stats.totalPackagingCost;

      // 수익(순이익) 계산 로직
      let profit = 0;
      if (stats.settlement > 0) {
        profit = stats.settlement - totalExpense;
      } else {
        profit = stats.revenue - totalExpense;
      }

      // 마진율
      const baseRevenue = stats.settlement > 0 ? stats.settlement : stats.revenue;
      const margin = baseRevenue > 0 ? (profit / baseRevenue) * 100 : 0;
      
      // 표시용 단가
      const matchingRecord = records.find(r => r.koreanName === name && r.unitCost > 0);
      const displayUnitCost = matchingRecord?.unitCost || localCosts[name] || 0;

      return { 
        name, 
        quantity: stats.quantity,
        revenue: stats.revenue,        // 표시용: GMV (매출 합계)
        settlement: stats.settlement,  // 표시용: 정산가 합계
        shipping: stats.shippingIncome, 
        unitCost: displayUnitCost, 
        totalCost: totalExpense, 
        profit, 
        margin
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredRecords, localCosts, records]);

  // 전체 요약 수치
  const summary = useMemo(() => {
    return productAggregates.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.revenue,
      settlement: acc.settlement + curr.settlement,
      profit: acc.profit + curr.profit
    }), { revenue: 0, settlement: 0, profit: 0 });
  }, [productAggregates]);

  // 전체 평균 마진율 (정산가 기준, 없으면 매출 기준)
  const baseTotal = summary.settlement > 0 ? summary.settlement : summary.revenue;
  const totalMargin = baseTotal > 0 ? (summary.profit / baseTotal) * 100 : 0;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ko-KR', { 
      style: 'currency', currency: 'KRW', minimumFractionDigits: 0, maximumFractionDigits: 0 
    }).format(value);

  const mallList = useMemo(() => ['All', ...Array.from(new Set(records.map(r => r.mallName)))], [records]);

  const handleExportCSV = () => {
    const csv = generateCSVWithCosts(records);
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_data_extended_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyCSVToClipboard = () => {
    const csv = generateCSVWithCosts(records);
    navigator.clipboard.writeText(csv).then(() => {
      alert('확장된 데이터 형식(정산가, 비용, 수익 포함)이 클립보드에 복사되었습니다.');
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 필터 바 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">쇼핑몰 선택</label>
          <select 
            value={selectedMall} 
            onChange={(e) => onFilterChange({ selectedMall: e.target.value })} 
            className="w-full border-none ring-1 ring-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 hover:bg-white transition-all cursor-pointer"
          >
            {mallList.map(mall => (
              <option key={mall} value={mall}>{mall === 'All' ? '전체 쇼핑몰 합산' : mall}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">조회 시작일</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => onFilterChange({ startDate: e.target.value })} 
            className="w-full border-none ring-1 ring-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 hover:bg-white transition-all" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">조회 종료일</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => onFilterChange({ endDate: e.target.value })} 
            className="w-full border-none ring-1 ring-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 hover:bg-white transition-all" 
          />
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-300 uppercase mb-1">Total Sales (GMV)</p>
          <p className="text-xs font-bold text-slate-400 mb-1">총 거래액 (판매가 합계)</p>
          <h3 className="text-2xl font-black text-slate-900">{formatCurrency(summary.revenue)}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-blue-300 uppercase mb-1">Total Settlement</p>
          <p className="text-xs font-bold text-slate-400 mb-1">총 정산액 (입금 예정)</p>
          <h3 className="text-2xl font-black text-blue-600">{formatCurrency(summary.settlement)}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-emerald-300 uppercase mb-1">Net Profit</p>
          <p className="text-xs font-bold text-slate-400 mb-1">총 수익 (정산가 - 비용)</p>
          <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(summary.profit)}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-indigo-300 uppercase mb-1">Avg Margin</p>
          <p className="text-xs font-bold text-slate-400 mb-1">평균 마진율</p>
          <h3 className="text-2xl font-black text-indigo-600">{totalMargin.toFixed(1)}%</h3>
        </div>
      </div>

      {/* 수익 분석 테이블 */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
              상품별 수익 분석 상세
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              * 값을 수정하면 구글 시트(판매 데이터)에 즉시 반영됩니다.<br/>
              * 수익 = 정산가 - (원가×수량 + 배송비용 + 포장비용)
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={copyCSVToClipboard}
              className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-100 transition flex items-center gap-2"
              title="새로운 컬럼(정산가, 비용, 수익 등)이 포함된 양식을 복사합니다."
            >
              <i className="fas fa-copy"></i>
              양식 복사
            </button>
            <button 
              onClick={handleExportCSV}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-700 transition flex items-center gap-2 shadow-md shadow-emerald-100"
            >
              <i className="fas fa-file-export"></i>
              CSV 내보내기
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                <th className="pb-2 px-4">상품명</th>
                <th className="pb-2 px-4 text-right">판매수량</th>
                <th className="pb-2 px-4 text-right">총 매출 (판매가)</th>
                <th className="pb-2 px-4 text-right text-blue-400">총 정산가 (입금)</th>
                <th className="pb-2 px-4 text-center">원가 (단가)</th>
                <th className="pb-2 px-4 text-right">수익</th>
                <th className="pb-2 px-4 text-right">마진율</th>
              </tr>
            </thead>
            <tbody>
              {productAggregates.map((p, idx) => (
                <tr key={idx} className="bg-slate-50/50 hover:bg-emerald-50/30 transition-all rounded-2xl group">
                  <td className="py-4 px-4 font-bold text-slate-700 truncate max-w-[200px] rounded-l-2xl">
                    {p.name}
                  </td>
                  <td className="py-4 px-4 text-right text-slate-500 font-medium">
                    {p.quantity.toLocaleString()}개
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-800">
                    {formatCurrency(p.revenue)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-blue-600">
                    {formatCurrency(p.settlement)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <div className="relative group/input">
                        <input 
                          type="text" 
                          value={p.unitCost > 0 ? p.unitCost.toLocaleString() : ''}
                          onChange={(e) => handleCostChange(p.name, e.target.value)}
                          placeholder="0"
                          className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-right font-black text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                        />
                        {updatingProduct === p.name && (
                           <div className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">
                             <i className="fas fa-spinner fa-spin"></i>
                           </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`py-4 px-4 text-right font-black ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(p.profit)}
                  </td>
                  <td className="py-4 px-4 text-right rounded-r-2xl">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                      p.margin > 30 ? 'bg-emerald-100 text-emerald-700' :
                      p.margin > 10 ? 'bg-blue-100 text-blue-700' :
                      p.margin > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {productAggregates.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-300 font-bold">
                    표시할 데이터가 없습니다.
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

export default ProfitAnalysis;
