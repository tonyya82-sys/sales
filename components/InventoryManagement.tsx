
import React, { useState, useMemo, useEffect } from 'react';
import { getInventoryData, updateInventorySettings } from '../services/authService';

interface InventoryManagementProps {}

interface InventoryItem {
  ean: string;
  name: string;
  stock: number;    // Left (H열) - 실제 잔여 재고
  total: number;    // Current Inventory (F열)
  minStock: number; // Min (Safe Stock) - LeadTime C열
  leadTime: number; // LeadTime (Days) - LeadTime B열
  requested: number; // Requested (G열)
  purchaseQty: number; // Purchase (Qty) - LeadTime E열
  _ui_key?: string; // UI 렌더링용 고유 키
}

const InventoryManagement: React.FC<InventoryManagementProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await getInventoryData();
      if (result && Array.isArray(result.inventory)) {
        // 데이터 매핑 및 UI Key 생성
        const mappedInventory = result.inventory
            .filter((item: any) => item && typeof item === 'object') 
            .map((item: any, index: number) => ({
                ...item,
                purchaseQty: item.purchaseQty ?? 0,
                stock: item.stock ?? 0,
                total: item.total ?? 0,
                minStock: item.minStock ?? 0,
                leadTime: item.leadTime ?? 0,
                requested: item.requested ?? 0,
                name: item.name || '',
                ean: item.ean || '',
                _ui_key: `item_${item.ean || 'unknown'}_${index}_${Date.now()}`
            }));
        setInventory(mappedInventory);
        if (result.lastUpdated) setLastSyncTime(result.lastUpdated);
      } else {
        setInventory([]);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (uiKey: string, field: 'leadTime' | 'minStock' | 'purchaseQty' | 'name', value: string) => {
    if (field === 'name') {
        setInventory(prev => prev.map(item => 
          item._ui_key === uiKey ? { ...item, name: value } : item
        ));
        return;
    }

    // 숫자 필드 처리 (빈 값 허용 후 0 처리)
    if (value === '') {
        setInventory(prev => prev.map(item => 
          item._ui_key === uiKey ? { ...item, [field]: 0 } : item
        ));
        return;
    }

    const numValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
    const safeValue = isNaN(numValue) ? 0 : numValue;

    setInventory(prev => prev.map(item => 
      item._ui_key === uiKey ? { ...item, [field]: safeValue } : item
    ));
  };

  const saveSetting = async (item: InventoryItem) => {
    if (isUpdating === item._ui_key) return;
    
    setIsUpdating(item._ui_key || null);
    try {
      // API 호출 시 LeadTime 시트에 저장될 데이터 전달
      const success = await updateInventorySettings(
        item.ean, 
        item.leadTime, 
        item.minStock, 
        item.purchaseQty, 
        item.name
      );
      if (!success) {
        console.error('Save failed');
      }
    } catch (e) {
      console.error('Server error', e);
    } finally {
      setIsUpdating(null);
    }
  };

  const productList = useMemo(() => {
    return inventory
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.ean.includes(searchTerm)
      )
      .map(item => {
        let status = '양호';
        let statusColor = 'bg-emerald-100 text-emerald-700';
        let statusIcon = 'fa-check-circle';

        // 상태 로직: Left가 0 이하이면 품절, Min보다 작으면 재고 부족
        if (item.stock <= 0) {
          status = '품절';
          statusColor = 'bg-red-100 text-red-600';
          statusIcon = 'fa-ban';
        } else if (item.stock <= item.minStock) {
          status = '재고 부족';
          statusColor = 'bg-amber-100 text-amber-700';
          statusIcon = 'fa-exclamation-triangle';
        }

        return { ...item, status, statusColor, statusIcon };
      })
      .sort((a, b) => {
        // 정렬 우선순위: 품절 > 재고부족 > 양호
        const getPriority = (s: string) => {
            if (s === '품절') return 3;
            if (s === '재고 부족') return 2;
            return 1;
        };
        const diff = getPriority(b.status) - getPriority(a.status);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
  }, [inventory, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        
        {/* 헤더 */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <i className="fas fa-boxes text-blue-600"></i>
                  실시간 재고 관리
                </h2>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-slate-400 text-sm font-medium">
                      Inventory 시트(EAN 기준)와 LeadTime 시트 데이터가 결합되었습니다.
                   </p>
                   {lastSyncTime && (
                     <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                       동기화: {lastSyncTime}
                     </span>
                   )}
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <div className="relative flex-1 min-w-[240px]">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="상품명 또는 EAN 검색..."
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:border-blue-300"
                    />
                </div>
                
                <button 
                  onClick={loadData}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-md shadow-blue-100 whitespace-nowrap justify-center disabled:opacity-70"
                >
                  {isLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sync"></i>}
                  새로고침
                </button>
            </div>
        </div>

        {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
                <i className="fas fa-exclamation-triangle mt-1"></i>
                <div className="text-sm">
                    <p className="font-bold">데이터를 가져오지 못했습니다.</p>
                    <p>{errorMsg}</p>
                </div>
            </div>
        )}

        {/* 테이블 */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                <th className="pb-2 px-4 w-[25%]">상품 정보 (Name / EAN)</th>
                <th className="pb-2 px-4 text-center text-purple-600">구매완료 (Purchased)</th>
                <th className="pb-2 px-4 text-center">리드타임 (Days)</th>
                <th className="pb-2 px-4 text-center">안전 재고 (Min)</th>
                <th className="pb-2 px-4 text-center text-slate-700">현재 재고 (Total)</th>
                <th className="pb-2 px-4 text-center text-blue-500">출고 요청 (Requested)</th>
                <th className="pb-2 px-4 text-center text-red-500">출고 후 재고 (Left)</th>
                <th className="pb-2 px-4 text-center">상태</th>
                <th className="pb-2 px-4 text-center">저장</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && productList.length === 0 ? (
                 <tr>
                    <td colSpan={9} className="text-center py-20">
                       <div className="flex flex-col items-center gap-3">
                          <i className="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
                          <p className="text-slate-500 font-bold">데이터 불러오는 중...</p>
                       </div>
                    </td>
                 </tr>
              ) : productList.map((p, idx) => (
                <tr key={p._ui_key || idx} className="bg-slate-50/50 hover:bg-white transition-all rounded-2xl hover:shadow-sm group border border-transparent hover:border-slate-100">
                  {/* 상품 정보 (Name/EAN) */}
                  <td className="py-4 px-4 font-bold text-slate-700 rounded-l-2xl align-middle">
                    <div className="flex flex-col gap-1">
                      <input 
                        type="text" 
                        value={p.name}
                        disabled={isUpdating === p._ui_key}
                        onChange={(e) => handleSettingChange(p._ui_key!, 'name', e.target.value)}
                        onBlur={() => saveSetting(p)}
                        className="text-sm font-bold text-slate-700 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1.5 py-0.5 -ml-1.5 outline-none transition-all placeholder-slate-300 w-full"
                        placeholder="상품명 입력"
                      />
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 pl-0.5">
                        <i className="fas fa-barcode text-[10px]"></i> {p.ean}
                      </span>
                    </div>
                  </td>
                  
                  {/* 구매완료 (Purchased - LeadTime E열) */}
                  <td className="py-4 px-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <input 
                        type="text" 
                        value={p.purchaseQty === 0 ? '' : p.purchaseQty}
                        placeholder="0"
                        disabled={isUpdating === p._ui_key}
                        onChange={(e) => handleSettingChange(p._ui_key!, 'purchaseQty', e.target.value)}
                        onBlur={() => saveSetting(p)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-16 h-8 text-center bg-purple-50 border border-purple-200 rounded-lg font-bold text-purple-600 focus:ring-2 focus:ring-purple-500 outline-none text-xs transition-all disabled:bg-slate-100 focus:bg-white placeholder-purple-200"
                      />
                    </div>
                  </td>

                  {/* 리드타임 (Days - LeadTime B열) */}
                  <td className="py-4 px-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <input 
                        type="text" 
                        value={p.leadTime === 0 ? '' : p.leadTime}
                        placeholder="0"
                        disabled={isUpdating === p._ui_key}
                        onChange={(e) => handleSettingChange(p._ui_key!, 'leadTime', e.target.value)}
                        onBlur={() => saveSetting(p)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-16 h-8 text-center bg-white border border-slate-200 rounded-lg font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all disabled:bg-slate-100 focus:bg-blue-50 placeholder-slate-200"
                      />
                    </div>
                  </td>

                  {/* 안전재고 (Min - LeadTime C열) */}
                  <td className="py-4 px-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <input 
                        type="text" 
                        value={p.minStock === 0 ? '' : p.minStock}
                        placeholder="0"
                        disabled={isUpdating === p._ui_key}
                        onChange={(e) => handleSettingChange(p._ui_key!, 'minStock', e.target.value)}
                        onBlur={() => saveSetting(p)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-16 h-8 text-center bg-white border border-slate-200 rounded-lg font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all disabled:bg-slate-100 focus:bg-blue-50 placeholder-slate-200"
                      />
                    </div>
                  </td>

                  {/* 현재 재고 (Total - Inventory F열) */}
                  <td className="py-4 px-4 text-center align-middle">
                    <div className="inline-block px-4 py-2 rounded-lg font-black text-sm bg-slate-100 border border-slate-200 text-slate-600">
                       {p.total?.toLocaleString() ?? 0}
                    </div>
                  </td>

                  {/* 출고 요청 (Requested - Inventory G열) */}
                  <td className="py-4 px-4 text-center align-middle">
                    <div className="inline-block px-4 py-2 rounded-lg font-black text-sm bg-blue-50 border border-blue-100 text-blue-600">
                       {p.requested?.toLocaleString() ?? 0}
                    </div>
                  </td>

                  {/* 출고 후 재고 (Left - Inventory H열) */}
                  <td className="py-4 px-4 text-center align-middle">
                    <div className={`inline-block px-4 py-2 rounded-lg font-black text-sm shadow-sm border ${
                       p.stock <= p.minStock ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-slate-700 border-slate-200'
                    }`}>
                       {p.stock?.toLocaleString() ?? 0}
                    </div>
                  </td>

                  <td className="py-4 px-4 text-center align-middle">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${p.statusColor}`}>
                      <i className={`fas ${p.statusIcon}`}></i>
                      {p.status}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-center rounded-r-2xl align-middle">
                    {isUpdating === p._ui_key ? (
                        <span className="text-blue-500 text-xs font-bold animate-pulse">
                            <i className="fas fa-spinner fa-spin mr-1"></i>
                        </span>
                    ) : (
                        <span className="text-slate-300 text-xs" title="저장 완료">
                            <i className="fas fa-check"></i>
                        </span>
                    )}
                  </td>
                </tr>
              ))}
              
              {!isLoading && !errorMsg && productList.length === 0 && (
                <tr>
                   <td colSpan={9} className="py-12 text-center text-slate-300 font-bold">
                     <div className="flex flex-col items-center gap-2">
                        <i className="fas fa-box-open text-3xl opacity-20"></i>
                        <p>표시할 데이터가 없습니다.</p>
                        <p className="text-xs font-normal">Inventory 시트의 EAN(E열)과 Name(C열)을 확인해주세요.</p>
                     </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 p-4 bg-slate-50 rounded-xl text-xs text-slate-500 leading-relaxed border border-slate-100">
            <strong><i className="fas fa-info-circle mr-1"></i> 매핑 가이드:</strong><br/>
            1. <strong>상품명(C열)</strong>, <strong>EAN(E열)</strong>은 Inventory 시트에서 가져옵니다.<br/>
            2. <strong>구매완료</strong>, <strong>리드타임</strong>, <strong>안전재고</strong>는 수정 시 LeadTime 시트에 저장됩니다.<br/>
            3. 재고 현황(Total, Requested, Left)은 Inventory 시트의 F, G, H열 데이터를 실시간으로 반영합니다.<br/>
            4. <strong>반드시 제공된 최신 Apps Script 코드를 배포</strong>해야 정상 작동합니다.
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
