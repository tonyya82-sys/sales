import React, { useState, useEffect } from 'react';

export interface LogisticsSettings {
  expressMin: string;
  expressPerKg: string;
  packingPrice: string;
  miscTiers: { limit: number; price: string }[];
  isGeneralCustoms: boolean;
}

interface LogisticsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: LogisticsSettings) => void;
  initialSettings: LogisticsSettings;
  title?: string;
}

const LogisticsSettingsModal: React.FC<LogisticsSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  title = '물류비 기본값 설정'
}) => {
  const [settings, setSettings] = useState<LogisticsSettings>(initialSettings);

  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings);
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  const handleChange = (field: keyof LogisticsSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleTierChange = (index: number, field: 'limit' | 'price', value: string) => {
    const newTiers = [...settings.miscTiers];
    if (field === 'limit') {
       newTiers[index].limit = Number(value);
    } else {
       newTiers[index].price = value;
    }
    setSettings(prev => ({ ...prev, miscTiers: newTiers }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[250] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
             <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <i className="fas fa-cog text-slate-400"></i> {title}
             </h3>
             <p className="text-xs text-slate-400 mt-0.5">여기서 설정한 값은 다음에 시뮬레이터를 열 때 기본값으로 사용됩니다.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition"><i className="fas fa-times"></i></button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
           {/* General Customs */}
           <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm font-bold text-slate-600">일반통관 (+330원) 기본 적용</span>
              <input 
                type="checkbox" 
                checked={settings.isGeneralCustoms}
                onChange={e => handleChange('isGeneralCustoms', e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
              />
           </div>

           {/* Express */}
           <div className="space-y-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-500 uppercase flex items-center gap-2">
                 <i className="fas fa-plane"></i> 특송비 (Express, EUR)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">MIN (최소)</label>
                    <input 
                      type="text" 
                      value={settings.expressMin}
                      onChange={e => handleChange('expressMin', e.target.value)}
                      className="w-full border border-indigo-200 rounded px-2 py-2 text-right font-bold text-indigo-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">KG당 단가</label>
                    <input 
                      type="text" 
                      value={settings.expressPerKg}
                      onChange={e => handleChange('expressPerKg', e.target.value)}
                      className="w-full border border-indigo-200 rounded px-2 py-2 text-right font-bold text-indigo-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                 </div>
              </div>
           </div>

           {/* Packing */}
           <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">3PL/포장 (건당, EUR)</label>
              <input 
                type="text" 
                value={settings.packingPrice}
                onChange={e => handleChange('packingPrice', e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-right font-bold text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
           </div>

           {/* Misc Tiers */}
           <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">기타배송 (구간별 고정, KRW)</label>
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                 {settings.miscTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                       <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-1.5 flex-1 shadow-sm">
                          <span className="text-xs text-slate-400 mr-1">~</span>
                          <input 
                             type="number"
                             value={tier.limit}
                             onChange={e => handleTierChange(idx, 'limit', e.target.value)}
                             className="w-full bg-transparent text-center font-bold text-slate-700 outline-none text-xs"
                          />
                          <span className="text-xs text-slate-400 ml-1">kg</span>
                       </div>
                       <input 
                          type="text" 
                          value={tier.price}
                          onChange={e => handleTierChange(idx, 'price', e.target.value)}
                          className="w-24 border border-slate-200 rounded px-2 py-1.5 text-right font-bold text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                       />
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition text-sm">취소</button>
           <button onClick={() => onSave(settings)} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition text-sm shadow-lg shadow-slate-300">
             <i className="fas fa-check mr-2"></i> 저장 및 적용
           </button>
        </div>
      </div>
    </div>
  );
};

export default LogisticsSettingsModal;