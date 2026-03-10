
import React, { useState, useEffect } from 'react';

interface MarginAnalysisListModalProps {
  onClose: () => void;
  onSelect: (data: any) => void;
  onCreateNew: () => void;
  title?: string;
  storageKey?: string;
}

const MarginAnalysisListModal: React.FC<MarginAnalysisListModalProps> = ({ 
  onClose, 
  onSelect, 
  onCreateNew,
  title = '마진 시뮬레이션 목록',
  storageKey = 'margin_configs'
}) => {
  const [savedList, setSavedList] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Sort by lastUpdated descending
          setSavedList(parsed.sort((a: any, b: any) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()));
        }
      } catch (e) { console.error(e); }
    }
  }, [storageKey]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('정말로 이 시뮬레이션을 삭제하시겠습니까?')) {
      // Ensure we compare strings to strings
      const newList = savedList.filter(item => String(item.id) !== String(id));
      setSavedList(newList);
      localStorage.setItem(storageKey, JSON.stringify(newList));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <div>
                <h2 className="text-xl font-black text-slate-800">{title}</h2>
                <p className="text-xs text-slate-400 font-medium mt-1">저장된 시뮬레이션을 불러오거나 새로 시작하세요.</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition"><i className="fas fa-times text-xl"></i></button>
         </div>
         <div className="p-4 bg-slate-50 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
            <button onClick={onCreateNew} className="w-full py-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2 group">
               <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition">
                 <i className="fas fa-plus"></i>
               </div>
               새로운 시뮬레이션 시작
            </button>
            
            {savedList.map(item => (
               <div key={item.id} onClick={() => onSelect(item)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md cursor-pointer transition relative group overflow-hidden">
                  <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                           {item.productName || '이름 없는 상품'}
                           {item.markets && item.markets.length > 0 && (
                             <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                               {item.markets.length}개 마켓
                             </span>
                           )}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">
                           <i className="far fa-clock mr-1"></i>
                           {new Date(item.lastUpdated).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                         <span className="block text-[10px] font-bold text-slate-400 uppercase">판매가</span>
                         <span className="text-sm font-black text-slate-700">
                            {new Intl.NumberFormat('ko-KR').format(parseInt(item.salePrice || '0'))}
                         </span>
                      </div>
                  </div>
                  
                  <button 
                    onClick={(e) => handleDelete(item.id, e)} 
                    className="absolute right-2 top-2 w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-300 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-100 shadow-sm z-10"
                    title="삭제"
                  >
                     <i className="fas fa-trash-alt text-xs"></i>
                  </button>
               </div>
            ))}

            {savedList.length === 0 && (
               <div className="text-center py-12 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                     <i className="fas fa-folder-open text-2xl"></i>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">저장된 시뮬레이션 내역이 없습니다.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default MarginAnalysisListModal;
