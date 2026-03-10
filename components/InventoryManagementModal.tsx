
import React, { useState, useMemo, useEffect } from 'react';
import { SaleRecord } from '../types';

interface InventoryManagementModalProps {
  records: SaleRecord[];
  onClose: () => void;
}

const InventoryManagementModal: React.FC<InventoryManagementModalProps> = ({ records, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem('inventory_data');
    if (saved) {
      setInventory(JSON.parse(saved));
    }
  }, []);

  const handleStockChange = (productName: string, value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
    const newInventory = { ...inventory, [productName]: isNaN(num) ? 0 : num };
    setInventory(newInventory);
    localStorage.setItem('inventory_data', JSON.stringify(newInventory));
  };

  // 판매 기록과 재고 데이터를 합쳐서 상품 목록 생성
  const productList = useMemo(() => {
    const salesMap = new Map<string, number>();
    
    // 판매 기록에서 총 판매량 계산
    records.forEach(r => {
      salesMap.set(r.koreanName, (salesMap.get(r.koreanName) || 0) + r.quantity);
    });

    // 판매 기록에 있거나 재고 데이터에 있는 모든 상품 목록
    const allProducts = Array.from(new Set([...salesMap.keys(), ...Object.keys(inventory)]));

    return allProducts.map(name => {
      const sold = salesMap.get(name) || 0;
      const stock = inventory[name] || 0;
      let status = '양호';
      let statusColor = 'bg-emerald-100 text-emerald-700';

      if (stock === 0) {
        status = '품절';
        statusColor = 'bg-red-100 text-red-700';
      } else if (stock < 10) {
        status = '재고 부족';
        statusColor = 'bg-amber-100 text-amber-700';
      }

      return { name, sold, stock, status, statusColor };
    })
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.sold - a.sold); // 기본적으로 판매량 순 정렬
  }, [records, inventory, searchTerm]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <i className="fas fa-boxes text-blue-600"></i>
              재고 관리
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">상품별 현재 재고 수량을 입력하고 관리합니다.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-5 bg-slate-50 border-b border-slate-100">
          <div className="relative max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상품명 검색..."
              className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                <th className="pb-3 px-4">상품명</th>
                <th className="pb-3 px-4 text-right">총 판매량</th>
                <th className="pb-3 px-4 text-center">현재 재고</th>
                <th className="pb-3 px-4 text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {productList.map((p, idx) => (
                <tr key={idx} className="bg-slate-50/50 hover:bg-white transition-all rounded-xl hover:shadow-sm">
                  <td className="py-3 px-4 font-bold text-slate-700 rounded-l-xl">
                    {p.name}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 font-medium">
                    {p.sold.toLocaleString()}개
                  </td>
                  <td className="py-3 px-4 text-center">
                    <input 
                      type="text" 
                      value={p.stock}
                      onChange={(e) => handleStockChange(p.name, e.target.value)}
                      className="w-24 text-center bg-white border border-slate-200 rounded-lg py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-3 px-4 text-center rounded-r-xl">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${p.statusColor}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {productList.length === 0 && (
                <tr>
                   <td colSpan={4} className="py-12 text-center text-slate-300 font-bold">
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

export default InventoryManagementModal;
