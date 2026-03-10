import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Product {
  id: number;
  name: string;
  sku: string;
  target_price: number;
  created_at: string;
}

interface ProductLink {
  id: number;
  product_id: number;
  url: string;
  memo: string;
  active: boolean;
  created_at: string;
}

interface PriceHistory {
  id: number;
  link_id: number;
  price: number;
  seller_name: string;
  review_count: number;
  rating: number;
  delivery_date: string;
  timestamp: string;
}

const PriceTrendAnalysis: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [selectedLink, setSelectedLink] = useState<ProductLink | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);

  // Form states
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductTargetPrice, setNewProductTargetPrice] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkMemo, setNewLinkMemo] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchLinks(selectedProduct.id);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedLink) {
      fetchHistory(selectedLink.id);
    }
  }, [selectedLink]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchLinks = async (productId: number) => {
    try {
      const res = await fetch(`/api/products/${productId}/links`);
      const data = await res.json();
      setLinks(data);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    }
  };

  const fetchHistory = async (linkId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history/${linkId}`);
      const data = await res.json();
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProductName) return;
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName,
          sku: newProductSku,
          targetPrice: parseFloat(newProductTargetPrice) || 0
        })
      });
      if (res.ok) {
        fetchProducts();
        setNewProductName('');
        setNewProductSku('');
        setNewProductTargetPrice('');
      }
    } catch (error) {
      console.error('Failed to add product:', error);
    }
  };

  const handleAddLink = async () => {
    if (!selectedProduct || !newLinkUrl) return;
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newLinkUrl,
          memo: newLinkMemo
        })
      });
      if (res.ok) {
        fetchLinks(selectedProduct.id);
        setNewLinkUrl('');
        setNewLinkMemo('');
      }
    } catch (error) {
      console.error('Failed to add link:', error);
    }
  };

  const handleManualCrawl = async () => {
    setCrawling(true);
    try {
      const res = await fetch('/api/crawl/start', { method: 'POST' });
      if (res.ok) {
        alert('크롤링이 백그라운드에서 시작되었습니다. 데이터가 수집되면 차트에 자동 반영됩니다.');
        
        // Start polling for updates for 60 seconds
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (selectedLink) {
            fetchHistory(selectedLink.id);
          }
          if (attempts >= 12) { // 12 * 5s = 60s
            clearInterval(interval);
          }
        }, 5000);
      } else {
        alert('크롤링 시작에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to start crawl:', error);
      alert('서버 통신 오류가 발생했습니다.');
    } finally {
      setCrawling(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">상품별 가격 추이 분석</h2>
          <p className="text-slate-500 text-sm mt-1">경쟁사 URL을 등록하여 가격 변동을 모니터링하세요.</p>
        </div>
        <button 
          onClick={handleManualCrawl}
          disabled={crawling}
          className={`px-4 py-2 rounded-xl font-bold transition shadow-sm flex items-center gap-2 ${
            crawling 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {crawling ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-play"></i>}
          {crawling ? '크롤링 중...' : '즉시 크롤링 시작'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Product & Link Management */}
        <div className="space-y-6">
          {/* Product List */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fas fa-box text-indigo-500"></i> 모니터링 상품 목록
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {products.map(product => (
                <div 
                  key={product.id}
                  onClick={() => {
                    setSelectedProduct(product);
                    setSelectedLink(null);
                    setHistory([]);
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition border ${
                    selectedProduct?.id === product.id 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-slate-50 border-transparent hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <div className="font-bold text-sm">{product.name}</div>
                  <div className="text-xs opacity-70 flex justify-between mt-1">
                    <span>{product.sku || 'No SKU'}</span>
                    <span>Target: {product.target_price.toLocaleString()}원</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add Product Form */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <input 
                type="text" 
                placeholder="상품명" 
                value={newProductName}
                onChange={e => setNewProductName(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="SKU" 
                  value={newProductSku}
                  onChange={e => setNewProductSku(e.target.value)}
                  className="w-1/2 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input 
                  type="number" 
                  placeholder="목표가" 
                  value={newProductTargetPrice}
                  onChange={e => setNewProductTargetPrice(e.target.value)}
                  className="w-1/2 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button 
                onClick={handleAddProduct}
                className="w-full bg-slate-800 text-white text-sm font-bold py-2 rounded-lg hover:bg-slate-900 transition"
              >
                상품 추가
              </button>
            </div>
          </div>

          {/* Link List (Visible when product selected) */}
          {selectedProduct && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-left-4 duration-300">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <i className="fas fa-link text-emerald-500"></i> 모니터링 URL 목록
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {links.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">등록된 URL이 없습니다.</p>
                ) : (
                  links.map(link => (
                    <div 
                      key={link.id}
                      onClick={() => setSelectedLink(link)}
                      className={`p-3 rounded-xl cursor-pointer transition border ${
                        selectedLink?.id === link.id 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                          : 'bg-slate-50 border-transparent hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <div className="font-bold text-xs truncate">{link.url}</div>
                      <div className="text-xs opacity-70 mt-1">{link.memo || '메모 없음'}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Link Form */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <input 
                  type="text" 
                  placeholder="URL (https://...)" 
                  value={newLinkUrl}
                  onChange={e => setNewLinkUrl(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input 
                  type="text" 
                  placeholder="메모 (예: 판매자 A)" 
                  value={newLinkMemo}
                  onChange={e => setNewLinkMemo(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button 
                  onClick={handleAddLink}
                  className="w-full bg-emerald-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  URL 추가
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chart & History */}
        <div className="lg:col-span-2 space-y-6">
          {selectedLink ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 text-lg">가격 변동 추이</h3>
                <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                  {selectedProduct?.name} - {selectedLink.memo || 'URL'}
                </span>
              </div>
              
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <i className="fas fa-spinner fa-spin text-2xl"></i>
                </div>
              ) : history.length > 0 ? (
                <>
                  <div className="h-80 w-full mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="timestamp" 
                          tick={{fontSize: 10}} 
                          tickFormatter={(val) => new Date(val).toLocaleDateString()}
                          stroke="#94a3b8"
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          tick={{fontSize: 10}} 
                          stroke="#94a3b8"
                          tickFormatter={(val) => `₩${val.toLocaleString()}`}
                        />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          labelFormatter={(val) => new Date(val).toLocaleString()}
                          formatter={(val: number) => [`₩${val.toLocaleString()}`, '가격']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#4f46e5" 
                          strokeWidth={3} 
                          dot={{r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}} 
                          activeDot={{r: 6}}
                          name="판매가"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-lg">일시</th>
                          <th className="px-4 py-3">가격</th>
                          <th className="px-4 py-3">판매자</th>
                          <th className="px-4 py-3">리뷰 수</th>
                          <th className="px-4 py-3 rounded-tr-lg">배송 예정</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice().reverse().map((record, idx) => (
                          <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td className="px-4 py-3 font-medium">{new Date(record.timestamp).toLocaleString()}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">₩{record.price.toLocaleString()}</td>
                            <td className="px-4 py-3">{record.seller_name}</td>
                            <td className="px-4 py-3">{record.review_count}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{record.delivery_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                  <i className="fas fa-chart-line text-4xl mb-4 opacity-20"></i>
                  <p>수집된 데이터가 없습니다.</p>
                  <p className="text-xs mt-2">크롤링을 시작하거나 잠시 후 다시 확인해주세요.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-full flex flex-col items-center justify-center text-slate-400 p-12">
              <i className="fas fa-mouse-pointer text-4xl mb-4 opacity-50"></i>
              <p className="font-bold">왼쪽에서 모니터링할 URL을 선택해주세요.</p>
              <p className="text-sm mt-2">상품을 먼저 선택한 후 URL을 클릭하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceTrendAnalysis;
