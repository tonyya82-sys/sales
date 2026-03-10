
import React, { useState, useMemo } from 'react';
import { SaleRecord } from '../types';
import { filterByDate } from '../utils/dataParser';
import ProductDetailModal from './ProductDetailModal';

interface StoreProductModalProps {
  records: SaleRecord[];
  mallName: string;
  startDate: string;
  endDate: string;
  onClose: () => void;
  initialSearchTerm?: string;
}

const StoreProductModal: React.FC<StoreProductModalProps> = ({ 
  records, 
  mallName, 
  startDate, 
  endDate, 
  onClose,
  initialSearchTerm = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const aggregatedData = useMemo(() => {
    const filtered = filterByDate(records, startDate, endDate).filter(r => r.mallName === mallName);
    const map = new Map<string, { name: string, englishName: string, revenue: number, quantity: number, count: number }>();

    filtered.forEach(r => {
      const key = r.koreanName;
      const existing = map.get(key) || { name: r.koreanName, englishName: r.englishName || '', revenue: 0, quantity: 0, count: 0 };
      map.set(key, {
        ...existing,
        revenue: existing.revenue + r.totalPrice,
        quantity: existing.quantity + r.quantity,
        count: existing.count + 1
      });
    });

    return Array.from(map.values())
      .filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.englishName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.revenue - a.revenue);
  }, [records, mallName, startDate, endDate, searchTerm]);

  const totalRevenue = aggregatedData.reduce((acc, curr) => acc + curr.revenue, 0);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ko-KR', { 
      style: 'currency', currency: 'KRW', minimumFractionDigits: 0, maximumFractionDigits: 0 
    }).format(value);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[150] p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                {mallName}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-800">
              스토어 판매 상품 리포트
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-1">상품을 클릭하면 일자별 상세 판매 내역을 확인할 수 있습니다.</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Search & Summary */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
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
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold text-slate-400">총 매출액:</span>
             <span className="text-lg font-black text-blue-600">{formatCurrency(totalRevenue)}</span>
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
                <th className="pb-3 px-4 text-right">매출액</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedData.map((item, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => setSelectedProduct(item.name)}
                  className="group bg-slate-50/50 hover:bg-blue-50/50 transition-all rounded-xl cursor-pointer"
                >
                  <td className="py-3 px-4 rounded-l-xl">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                      idx < 3 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 font-bold">
                    {item.count.toLocaleString()} 건
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-800 rounded-r-xl">
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-300 font-bold">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailModal 
          records={records}
          productName={selectedProduct}
          mallName={mallName}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default StoreProductModal;
