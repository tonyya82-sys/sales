
import React, { useState } from 'react';

interface ImportModalProps {
  onImport: (csv: string, url?: string) => void;
  onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
  const [url, setUrl] = useState('');
  const [pastedData, setPastedData] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUrlImport = async () => {
    if (!url) return;
    setLoading(true);
    try {
      let csvUrl = url;
      if (url.includes('docs.google.com/spreadsheets')) {
        const match = url.match(/\/d\/(.+?)\//);
        if (match) {
          const id = match[1];
          csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
        }
      }
      const response = await fetch(csvUrl);
      const csv = await response.text();
      onImport(csv, url);
    } catch (err) {
      alert('데이터를 가져오는데 실패했습니다. 시트가 "웹에 게시"되어 있는지 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">데이터 소스 연결</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 space-y-6">
          <section>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Google Sheets CSV URL (웹에 게시됨)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleUrlImport}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? '연결 중...' : '연결 및 적용'}
              </button>
            </div>
          </section>
          <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">OR</span></div></div>
          <section>
            <label className="block text-sm font-semibold text-gray-700 mb-2">데이터 직접 붙여넣기</label>
            <textarea
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              className="w-full h-40 border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="날짜,쇼핑몰명,영문상품명,한글상품명,수량,단가,배송비,합계..."
            ></textarea>
            <button
              onClick={() => onImport(pastedData)}
              className="w-full mt-4 bg-gray-800 text-white py-2 rounded-lg font-medium hover:bg-gray-900 transition"
            >
              텍스트 데이터 적용
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
