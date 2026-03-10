
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import LogisticsSettingsModal, { LogisticsSettings } from './LogisticsSettingsModal';

interface MarginCalculatorModalProps {
  onClose: () => void;
  initialData?: any;
  title?: string;
  storageKey?: string;
  exchangeRates?: { USD: number; EUR: number } | null;
}

interface Scenario {
  id: number;
  qty: string;
  weightOverride: string;
  revenueOverride: string; // Legacy/Total override
  productRevenueOverride: string;
  shippingRevenueOverride: string;
}

const MARKET_PRESETS = [
  { id: '1', name: '네이버' },
  { id: '2', name: '쿠팡' },
  { id: '3', name: '11번가' },
  { id: '4', name: '지마켓' },
  { id: '5', name: '옥션' },
];

const MarginCalculatorModal: React.FC<MarginCalculatorModalProps> = ({ 
  onClose, 
  initialData, 
  title = '마진 시뮬레이터 (다중 수량 분석)',
  storageKey = 'margin_configs',
  exchangeRates
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Determine mode based on title
  const isSupplyMode = title.includes('공급가');
  
  // Settings Storage Key
  const settingsStorageKey = isSupplyMode ? 'logistics_settings_supply' : 'logistics_settings_margin';

  // Helper to get default settings
  const getDefaultSettings = (): LogisticsSettings => {
    try {
      const saved = localStorage.getItem(settingsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          expressMin: parsed.expressMin || (isSupplyMode ? '2.0' : '1.8'),
          expressPerKg: parsed.expressPerKg || (isSupplyMode ? '2.0' : '1.8'),
          packingPrice: parsed.packingPrice || (isSupplyMode ? '2.5' : '2.0'),
          miscTiers: parsed.miscTiers || [
            { limit: 2, price: '2300' },
            { limit: 5, price: '2500' },
            { limit: 10, price: '3000' },
            { limit: 20, price: '5200' },
          ],
          isGeneralCustoms: parsed.isGeneralCustoms !== undefined ? parsed.isGeneralCustoms : true,
        };
      }
    } catch (e) { console.error(e); }
    
    // Default Fallback
    return {
        expressMin: isSupplyMode ? '2.0' : '1.8',
        expressPerKg: isSupplyMode ? '2.0' : '1.8',
        packingPrice: isSupplyMode ? '2.5' : '2.0',
        miscTiers: [
            { limit: 2, price: '2300' },
            { limit: 5, price: '2500' },
            { limit: 10, price: '3000' },
            { limit: 20, price: '5200' },
        ],
        isGeneralCustoms: true
    };
  };

  // Product Basic Info
  const [productName, setProductName] = useState<string>('');
  const [salePrice, setSalePrice] = useState<string>('0');
  const [purchasePrice, setPurchasePrice] = useState<string>('0'); // EUR
  const [weight, setWeight] = useState<string>('0'); // KG
  const [boxWeight, setBoxWeight] = useState<string>('0'); // KG (포장 무게 추가)
  const [custShipping, setCustShipping] = useState<string>('0');
  const [exchangeRate, setExchangeRate] = useState<string>('0'); // EUR-KRW 환율 (초기값 0)

  // Profit Sharing (Supplier : Customer)
  const [ratioUs, setRatioUs] = useState<string>('7');
  const [ratioCustomer, setRatioCustomer] = useState<string>('3');

  // Target Margin State
  const [targetMargin, setTargetMargin] = useState<string>('');

  // Market Settings
  const [markets, setMarkets] = useState<{id: string, name: string, feeRate: string, shippingFeeRate: string, salePrice: string, shippingFee: string}[]>(
      isSupplyMode 
      ? [{ id: '1', name: '네이버', feeRate: '6.63', shippingFeeRate: '2.00', salePrice: '0', shippingFee: '' }]
      : [
          { id: '1', name: '네이버', feeRate: '0', shippingFeeRate: '0', salePrice: '0', shippingFee: '' },
          { id: '2', name: '쿠팡', feeRate: '0', shippingFeeRate: '0', salePrice: '0', shippingFee: '' },
          { id: '3', name: '11번가', feeRate: '0', shippingFeeRate: '0', salePrice: '0', shippingFee: '' },
          { id: '4', name: '지마켓', feeRate: '0', shippingFeeRate: '0', salePrice: '0', shippingFee: '' },
          { id: '5', name: '옥션', feeRate: '0', shippingFeeRate: '0', salePrice: '0', shippingFee: '' },
        ]
  );
  
  // Use array for multiple selected markets
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>(
      isSupplyMode ? ['1'] : ['1', '2', '3', '4', '5']
  );
  
  // Logistics State (Initialized with defaults logic)
  const [expressMin, setExpressMin] = useState<string>(''); // Will be set in useEffect
  const [expressPerKg, setExpressPerKg] = useState<string>('');
  const [packingPrice, setPackingPrice] = useState<string>('');
  const [isGeneralCustoms, setIsGeneralCustoms] = useState<boolean>(true);
  // Initialize with safe defaults to prevent render errors before useEffect runs
  const [miscTiers, setMiscTiers] = useState<{ limit: number; price: string }[]>([
    { limit: 2, price: '2300' },
    { limit: 5, price: '2500' },
    { limit: 10, price: '3000' },
    { limit: 20, price: '5200' },
  ]);

  // Logistics Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>(
    isSupplyMode 
      ? [{ id: 1, qty: '1', weightOverride: '', revenueOverride: '', productRevenueOverride: '', shippingRevenueOverride: '' }]
      : [
        { id: 1, qty: '1', weightOverride: '', revenueOverride: '', productRevenueOverride: '', shippingRevenueOverride: '' },
        { id: 2, qty: '2', weightOverride: '', revenueOverride: '', productRevenueOverride: '', shippingRevenueOverride: '' },
        { id: 3, qty: '3', weightOverride: '', revenueOverride: '', productRevenueOverride: '', shippingRevenueOverride: '' },
      ]
  );

  // Save Feedback State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [isApplying, setIsApplying] = useState(false);

  // Load Initial Data or Defaults
  useEffect(() => {
    if (initialData) {
      setProductName(initialData.productName || '');
      const loadedSalePrice = initialData.salePrice || '0';
      setSalePrice(loadedSalePrice);
      setPurchasePrice(initialData.purchasePrice || '0');
      setWeight(initialData.weight || '0');
      setBoxWeight(initialData.boxWeight || '0');
      setCustShipping(initialData.custShipping || '0');
      setExchangeRate(initialData.exchangeRate || '0');
      
      if (initialData.markets) {
          const loadedMarkets = initialData.markets.map((m: any) => ({
              ...m,
              salePrice: m.salePrice !== undefined ? m.salePrice : loadedSalePrice,
              shippingFee: m.shippingFee !== undefined ? m.shippingFee : ''
          }));
          setMarkets(loadedMarkets);
      }
      
      if (initialData.activeMarketId) {
          setSelectedMarketIds([initialData.activeMarketId]);
      } else if (initialData.selectedMarketIds && Array.isArray(initialData.selectedMarketIds)) {
          setSelectedMarketIds(initialData.selectedMarketIds);
      }

      setExpressMin(initialData.expressMin || '0'); 
      setExpressPerKg(initialData.expressPerKg || '0');
      setPackingPrice(initialData.packingPrice || '0');
      if (initialData.miscTiers) setMiscTiers(initialData.miscTiers);
      if (initialData.scenarios) setScenarios(initialData.scenarios);
      if (initialData.profitSharing) {
          const parts = initialData.profitSharing.split(':');
          if (parts.length === 2) {
              setRatioUs(parts[0]);
              setRatioCustomer(parts[1]);
          }
      }
      setIsGeneralCustoms(initialData.isGeneralCustoms !== undefined ? !!initialData.isGeneralCustoms : true);
    } else {
      // New Session: Load defaults from local storage
      const defaults = getDefaultSettings();
      setExpressMin(defaults.expressMin);
      setExpressPerKg(defaults.expressPerKg);
      setPackingPrice(defaults.packingPrice);
      setMiscTiers(defaults.miscTiers);
      setIsGeneralCustoms(defaults.isGeneralCustoms);
    }
  }, [initialData, isSupplyMode]); 
  
  // Helpers
  const parseNum = (s: string) => {
      if (!s) return 0;
      const val = parseFloat(s.replace(/[^0-9.-]/g, ''));
      return isNaN(val) ? 0 : val;
  };
  const formatNum = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n || 0));
  const formatEUR = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const currentXRate = parseNum(exchangeRate) || 1;

  const getConvertedText = (valStr: string) => {
      const val = parseNum(valStr);
      if (!val || currentXRate <= 1) return null;
      return `≈ ${formatEUR(val / currentXRate)}`;
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const getProfitSplit = (amount: number, r1: number, r2: number) => {
    const total = r1 + r2;
    if (total === 0) return null;
    const share1 = amount * (r1 / total); // Us
    const share2 = amount * (r2 / total); // Customer
    return { us: share1, customer: share2, r1, r2 };
  };

  const primaryMarketId = selectedMarketIds.length > 0 ? selectedMarketIds[0] : markets[0]?.id;
  const primaryMarket = markets.find(m => m.id === primaryMarketId) || markets[0];

  // Handlers
  const handleMarketSelect = (marketId: string) => {
      setSelectedMarketIds(prev => {
          if (prev.includes(marketId)) {
              if (prev.length === 1) return prev; // Prevent empty
              return prev.filter(id => id !== marketId);
          }
          return [...prev, marketId];
      });
  };

  const handlePresetClick = (presetId: string, presetName: string) => {
      setMarkets(prev => {
        if (!prev.find(m => m.id === presetId)) {
          return [...prev, { id: presetId, name: presetName, feeRate: '0', shippingFeeRate: '0', salePrice: salePrice, shippingFee: '' }];
        }
        return prev;
      });

      setSelectedMarketIds(prev => {
          if (prev.includes(presetId)) {
              return prev.filter(id => id !== presetId);
          } else {
              return [...prev, presetId];
          }
      });
  };

  const handleAddCustomMarket = () => {
      const newId = Date.now().toString();
      setMarkets(prev => [...prev, { id: newId, name: '사용자 정의 마켓', feeRate: '0', shippingFeeRate: '0', salePrice: salePrice, shippingFee: '' }]);
      setSelectedMarketIds(prev => [...prev, newId]);
  };

  const handleGlobalSalePriceChange = (val: string) => {
      setSalePrice(val);
      setMarkets(prev => prev.map(m => ({ ...m, salePrice: val })));
  };

  const handleRatioUsChange = (val: string) => {
    setRatioUs(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 10) {
        setRatioCustomer(parseFloat((10 - num).toFixed(1)).toString());
    }
  };

  const handleRatioCustomerChange = (val: string) => {
    setRatioCustomer(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 10) {
        setRatioUs(parseFloat((10 - num).toFixed(1)).toString());
    }
  };

  const adjustRatio = (delta: number) => {
    let val = parseFloat(ratioUs);
    if (isNaN(val)) val = 0;
    let next = val + delta;
    if (next > 10) next = 10;
    if (next < 0) next = 0;
    
    // Avoid float precision errors
    next = Math.round(next * 100) / 100;
    
    setRatioUs(next.toString());
    setRatioCustomer((10 - next).toString()); 
  };

  const handleReverseCalcMargin = () => {
    const targetM = parseFloat(targetMargin) / 100;
    if (isNaN(targetM) || targetM >= 1) {
        alert('유효한 마진율을 입력해주세요.');
        return;
    }

    const qty = 1;
    const xRate = parseNum(exchangeRate) || 1;
    const uCost = parseNum(purchasePrice);
    const uWeight = parseNum(weight);
    const uBoxWeight = parseNum(boxWeight);
    const lExpressMin = parseNum(expressMin);
    const lExpressKg = parseNum(expressPerKg);
    const lPack = parseNum(packingPrice);
    
    const totalW = (uWeight * qty) + uBoxWeight;
    const costPurchaseKRW = Math.round(uCost * qty * xRate);
    
    const calcExpressEUR = totalW * lExpressKg;
    const finalExpressEUR = calcExpressEUR < lExpressMin ? lExpressMin : calcExpressEUR;
    const costExpressKRW = Math.round(finalExpressEUR * xRate);
    
    const costPackKRW = Math.round(lPack * xRate);
    
    let miscKRW = 0;
    if (miscTiers.length > 0) {
        const tier = miscTiers.find(t => totalW <= t.limit);
        if (tier) {
            miscKRW = parseNum(tier.price);
        } else {
            miscKRW = parseNum(miscTiers[miscTiers.length - 1].price);
        }
    }
    
    if (isGeneralCustoms) miscKRW += 330;
    
    const totalCostKRW = costPurchaseKRW + costExpressKRW + costPackKRW + miscKRW;
    const reqSettlement = totalCostKRW / (1 - targetM);
    
    const market = primaryMarket; 
    const feeRate = parseNum(market.feeRate) / 100;
    const shipFeeRate = parseNum(market.shippingFeeRate) / 100;
    
    // Use market specific shipping fee if available, otherwise global
    const marketShipFee = market.shippingFee && market.shippingFee !== '' ? parseNum(market.shippingFee) : parseNum(custShipping);
    const shipRev = marketShipFee; 
    
    const netShipRev = shipRev * (1 - shipFeeRate);
    const reqNetProdRev = reqSettlement - netShipRev;
    const reqProdRev = reqNetProdRev / (1 - feeRate);
    
    const newSalePrice = Math.round(reqProdRev);
    
    setSalePrice(newSalePrice.toString());
    setMarkets(prev => prev.map(m => ({ ...m, salePrice: newSalePrice.toString() })));
  };

  const updateScenario = (id: number, field: keyof Scenario, value: string) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addScenario = () => {
    const lastId = scenarios.length > 0 ? Math.max(...scenarios.map(s => s.id)) : 0;
    let nextQty = '1';
    if (scenarios.length > 0) {
        const lastScenario = scenarios[scenarios.length - 1];
        const lastQty = parseFloat(lastScenario.qty);
        if (!isNaN(lastQty)) nextQty = (lastQty + 1).toString();
    }
    setScenarios([...scenarios, { id: lastId + 1, qty: nextQty, weightOverride: '', revenueOverride: '', productRevenueOverride: '', shippingRevenueOverride: '' }]);
  };

  const removeScenario = (id: number) => {
    setScenarios(scenarios.filter(s => s.id !== id));
  };

  const handleApplyGlobalSettings = () => {
    setIsApplying(true);
    setScenarios(prev => prev.map(s => ({ 
        ...s, 
        weightOverride: '', 
        revenueOverride: '',
        productRevenueOverride: '',
        shippingRevenueOverride: ''
    })));
    setTimeout(() => setIsApplying(false), 500);
  };
  
  const handleSave = async () => {
    if (!productName.trim()) {
      alert('저장하려면 상품명을 입력해주세요.');
      return;
    }
    
    const profitSharing = `${ratioUs}:${ratioCustomer}`;

    const dataToSave = {
      id: initialData?.id || Date.now().toString(),
      lastUpdated: new Date().toISOString(),
      productName,
      salePrice,
      purchasePrice,
      weight,
      boxWeight,
      custShipping,
      exchangeRate,
      markets,
      selectedMarketIds, 
      activeMarketId: selectedMarketIds[0], 
      expressMin,
      expressPerKg,
      packingPrice,
      miscTiers,
      scenarios,
      profitSharing,
      isGeneralCustoms
    };

    const saved = localStorage.getItem(storageKey);
    let list = saved ? JSON.parse(saved) : [];
    list = list.filter((item: any) => String(item.id) !== String(dataToSave.id));
    list.push(dataToSave);
    
    localStorage.setItem(storageKey, JSON.stringify(list));
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleCapture = async () => {
    const target = resultsRef.current || modalRef.current;
    if (!target) return;
    try {
        const canvas = await html2canvas(target, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            ignoreElements: (element) => element.classList.contains('no-capture')
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `${title.replace(/\s+/g, '_')}_Chart_${new Date().toISOString().slice(0,10)}.png`;
        link.click();
    } catch (err) {
        console.error("Capture failed:", err);
        alert("캡처 저장에 실패했습니다.");
    }
  };

  const handleExportExcel = () => {
    let headers = [
        '마켓',
        '수량', '총 무게(kg)', '판매매출(KRW)', '배송매출(KRW)', '총 매출(KRW)', '정산금액(KRW)', '정산금액(EUR)',
        '구매원가(KRW)', '구매원가(EUR)', 
        '물류비합계(KRW)', '물류비합계(EUR)',
        '원가합계(KRW)', '원가합계(EUR)', '순수익(KRW)', '순수익(EUR)'
    ];

    if (isSupplyMode) {
        headers.push('우리 수익(KRW)', '우리 수익(EUR)', '고객 수익(KRW)', '고객 수익(EUR)', '공급가(KRW)', '공급가(EUR)');
    }
    
    headers.push('마진율(%)');
    if (isSupplyMode) {
        headers.push('우리 마진(%)', '고객 마진(%)');
    }
    
    const rows: string[] = [];

    selectedMarketIds.forEach(marketId => {
        const market = markets.find(m => m.id === marketId);
        if (!market) return;

        scenarios.forEach(s => {
            const res = calculateRow(s, market);
            const splitProfit = getProfitSplit(res.profit, parseNum(ratioUs), parseNum(ratioCustomer));
            
            const logisticsKRW = res.details.express + res.details.pack + res.details.misc;
            const logisticsEUR = res.details.logisticsEUR;

            let supplyPriceEUR = 0;
            let supplyPriceKRW = 0;
            let splitProfitEUR = { us: 0, customer: 0 };
            let splitProfitKRW = { us: 0, customer: 0 };

            if (splitProfit) {
                const ratioTotal = splitProfit.r1 + splitProfit.r2;
                if (ratioTotal > 0) {
                    splitProfitEUR.us = res.profitEUR * (splitProfit.r1 / ratioTotal);
                    splitProfitEUR.customer = res.profitEUR * (splitProfit.r2 / ratioTotal);
                    splitProfitKRW.us = res.profit * (splitProfit.r1 / ratioTotal);
                    splitProfitKRW.customer = res.profit * (splitProfit.r2 / ratioTotal);
                    
                    const splitProfitEUR_US = res.profitEUR * (splitProfit.r1 / ratioTotal);
                    supplyPriceEUR = res.totalExpenseEUR + splitProfitEUR_US; // Cost(EUR) + Us Profit(EUR)
                    supplyPriceKRW = res.totalExpense + splitProfitKRW.us; // Cost(KRW) + Us Profit(KRW)
                }
            }

            const row = [
                market.name,
                s.qty, res.totalWeight.toFixed(2), 
                Math.round(res.productRevenue), Math.round(res.shippingRevenue), Math.round(res.totalRevenue),
                Math.round(res.settlement), res.settlementEUR.toFixed(2),
                Math.round(res.details.purchase), res.details.purchaseEUR.toFixed(2),
                Math.round(logisticsKRW), logisticsEUR.toFixed(2),
                Math.round(res.totalExpense), res.totalExpenseEUR.toFixed(2),
                Math.round(res.profit), res.profitEUR.toFixed(2)
            ];

            if (isSupplyMode) {
                row.push(
                    Math.round(splitProfitKRW?.us || 0), (splitProfitEUR?.us || 0).toFixed(2),
                    Math.round(splitProfitKRW?.customer || 0), (splitProfitEUR?.customer || 0).toFixed(2),
                    Math.round(supplyPriceKRW), supplyPriceEUR.toFixed(2)
                );
            }
            
            row.push(res.margin.toFixed(2));
            if (isSupplyMode) {
                const denominator = res.settlement > 0 ? res.settlement : res.totalRevenue;
                if (denominator > 0) {
                    const usMargin = (( (splitProfitKRW?.us || 0) / denominator) * 100).toFixed(2);
                    const custMargin = (( (splitProfitKRW?.customer || 0) / denominator) * 100).toFixed(2);
                    row.push(usMargin, custMargin);
                } else {
                    row.push('0.00', '0.00');
                }
            }
            rows.push(row.join(','));
        });
    });

    const titleRow = `상품명 : ${productName}`;
    const csvContent = "\ufeff" + titleRow + "\n" + headers.join(',') + "\n" + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const calculateRow = (scenario: Scenario, marketOverride?: any) => {
    const qty = parseNum(scenario.qty);
    const market = marketOverride || primaryMarket;
    const uSale = parseNum(market.salePrice !== undefined ? market.salePrice : salePrice);
    
    const uCost = parseNum(purchasePrice);
    const uWeight = parseNum(weight);
    const uBoxWeight = parseNum(boxWeight);
    const uShipInc = parseNum(custShipping);
    const xRate = parseNum(exchangeRate) || 1; 
    
    const rMarket = parseNum(market.feeRate);
    const rShipFee = parseNum(market.shippingFeeRate);

    const lExpressMin = parseNum(expressMin);
    const lExpressKg = parseNum(expressPerKg);
    const lPack = parseNum(packingPrice);

    const calcWeight = (uWeight * qty) + uBoxWeight;
    const totalWeight = scenario.weightOverride ? parseNum(scenario.weightOverride) : calcWeight;

    const defaultProductRev = uSale * qty;
    const productRevenue = scenario.productRevenueOverride 
        ? parseNum(scenario.productRevenueOverride) 
        : defaultProductRev;

    // Modified Logic: Use market specific shipping fee if available, otherwise global
    const marketShipFee = market.shippingFee && market.shippingFee !== '' ? parseNum(market.shippingFee) : uShipInc;
    const defaultShippingRev = marketShipFee; 

    const shippingRevenue = scenario.shippingRevenueOverride
        ? parseNum(scenario.shippingRevenueOverride)
        : defaultShippingRev;

    const totalRevenue = productRevenue + shippingRevenue;
    
    const feeMarket = Math.round(Math.max(0, productRevenue) * (rMarket / 100)); 
    const feeShip = Math.round(shippingRevenue * (rShipFee / 100));
    
    const totalFee = feeMarket + feeShip;
    const settlement = totalRevenue - totalFee;

    const costPurchaseEUR = uCost * qty;
    const costPurchaseKRW = Math.round(costPurchaseEUR * xRate);
    
    const calcExpressEUR = totalWeight * lExpressKg;
    const finalExpressEUR = calcExpressEUR < lExpressMin ? lExpressMin : calcExpressEUR;
    const costExpressKRW = Math.round(finalExpressEUR * xRate);

    const costPackEUR = lPack;
    const costPackKRW = Math.round(costPackEUR * xRate);

    let miscKRW = 0;
    if (miscTiers.length > 0) {
        const tier = miscTiers.find(t => totalWeight <= t.limit);
        if (tier) {
            miscKRW = parseNum(tier.price);
        } else {
            miscKRW = parseNum(miscTiers[miscTiers.length - 1].price);
        }
    }
    
    if (isGeneralCustoms) {
        miscKRW += 330;
    }

    const costMiscEUR = miscKRW / xRate;
    const costMiscKRW = miscKRW;
    
    const totalLogisticsEUR = finalExpressEUR + costPackEUR + costMiscEUR;
    const totalExpenseEUR = costPurchaseEUR + finalExpressEUR + costPackEUR + costMiscEUR;
    
    const totalExpense = Math.round(totalExpenseEUR * xRate);

    const profit = settlement - totalExpense;
    const margin = settlement > 0 ? (profit / settlement) * 100 : 0;
    
    const settlementEUR = settlement / xRate;
    const profitEUR = profit / xRate;

    return {
      qty,
      totalWeight,
      calcWeight,
      totalRevenue,
      productRevenue,
      shippingRevenue,
      settlement,
      settlementEUR,
      totalExpense,
      totalExpenseEUR,
      profit,
      profitEUR,
      margin,
      details: {
        purchase: costPurchaseKRW,
        purchaseEUR: costPurchaseEUR,
        express: costExpressKRW,
        expressEUR: finalExpressEUR,
        pack: costPackKRW,
        packEUR: costPackEUR, 
        misc: costMiscKRW,
        miscEUR: costMiscEUR, 
        logisticsEUR: totalLogisticsEUR
      }
    };
  };

  const removeMarket = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (markets.length > 1) {
        const newMarkets = markets.filter(m => m.id !== id);
        setMarkets(newMarkets);
        setSelectedMarketIds(prev => prev.filter(mid => mid !== id));
        if (selectedMarketIds.length === 1 && selectedMarketIds[0] === id) {
             setSelectedMarketIds([newMarkets[0].id]);
        }
    }
  };
  
  const updateMarketSetting = (id: string, field: 'feeRate' | 'shippingFeeRate' | 'salePrice' | 'shippingFee', value: string) => {
    setMarkets(markets.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  // Helper for column widths based on mode
  const colWidth = (normal: string, supply: string) => isSupplyMode ? supply : normal;

  // Define visible presets based on mode
  const visiblePresets = isSupplyMode 
    ? MARKET_PRESETS.filter(p => p.name === '네이버') 
    : MARKET_PRESETS;

  // Handle Save from Settings Modal
  const handleSettingsSave = (newSettings: LogisticsSettings) => {
    localStorage.setItem(settingsStorageKey, JSON.stringify(newSettings));
    setExpressMin(newSettings.expressMin);
    setExpressPerKg(newSettings.expressPerKg);
    setPackingPrice(newSettings.packingPrice);
    setMiscTiers(newSettings.miscTiers);
    setIsGeneralCustoms(newSettings.isGeneralCustoms);
    setShowSettingsModal(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div 
        ref={modalRef} 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-[1450px] max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <i className="fas fa-calculator text-indigo-600"></i>
              {title}
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">
              판매 수량별 마진 변화를 시뮬레이션합니다. 비용 구조(무게 기반)를 설정하여 최적의 판매 전략을 수립하세요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {exchangeRates && (
              <div className="hidden xl:flex items-center gap-3 mr-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                 <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">
                       <i className="fas fa-dollar-sign"></i>
                    </div>
                    <div className="flex flex-col leading-none">
                       <span className="text-[9px] font-bold text-slate-400">USD</span>
                       <span className="text-xs font-black text-slate-700">{Math.round(exchangeRates.USD).toLocaleString()}</span>
                    </div>
                 </div>
                 <div className="w-px h-5 bg-slate-200"></div>
                 <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                       <i className="fas fa-euro-sign"></i>
                    </div>
                    <div className="flex flex-col leading-none">
                       <span className="text-[9px] font-bold text-slate-400">EUR</span>
                       <span className="text-xs font-black text-slate-700">{Math.round(exchangeRates.EUR).toLocaleString()}</span>
                    </div>
                 </div>
              </div>
            )}
            
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-xs font-bold flex items-center gap-2 shadow-sm no-capture"
              title="물류비 기본 설정"
            >
              <i className="fas fa-cog"></i> 
              <span className="hidden sm:inline">설정</span>
            </button>

            <button 
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-100 no-capture"
              title="현재 시뮬레이션 결과를 엑셀(CSV) 파일로 저장합니다."
            >
              <i className="fas fa-file-excel"></i> 
              <span className="hidden sm:inline">엑셀 저장</span>
            </button>
            <button 
              onClick={handleCapture}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition text-xs font-bold flex items-center gap-2 shadow-md shadow-slate-200 no-capture"
              title="현재 시뮬레이션 결과 화면(테이블)을 이미지로 저장합니다."
            >
              <i className="fas fa-camera"></i> 
              <span className="hidden sm:inline">차트 캡처</span>
            </button>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition no-capture">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-slate-50 p-6 md:p-8 flex flex-col">
            {/* Top Section: Global Product Settings (Refined) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-6 pb-6 border-b border-slate-100">
                    <div className="flex-1 space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            상품명 (저장 식별용) <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={productName} 
                            onChange={e => setProductName(e.target.value)} 
                            onFocus={handleFocus} 
                            className="w-full text-2xl font-black text-slate-800 placeholder-slate-200 outline-none border-none bg-transparent p-0 focus:ring-0"
                            placeholder="상품명을 입력하세요"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                         <button
                            onClick={handleApplyGlobalSettings}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                                isApplying 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                            }`}
                        >
                            <i className={`fas ${isApplying ? 'fa-check' : 'fa-sync-alt'} ${isApplying ? '' : ''}`}></i>
                            {isApplying ? '전체 적용됨' : '전체 적용'}
                        </button>
                        <button 
                            onClick={handleSave} 
                            className={`px-8 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
                              saveStatus === 'saved' 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' 
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                            }`}
                        >
                           {saveStatus === 'saved' ? <><i className="fas fa-check"></i> 저장됨</> : <><i className="fas fa-save"></i> 저장</>}
                        </button>
                    </div>
                </div>

                <div className={`grid grid-cols-2 md:grid-cols-4 ${isSupplyMode ? 'lg:grid-cols-8' : 'lg:grid-cols-7'} gap-6 items-end`}>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400">판매가(KRW)</label>
                        <div className="relative group">
                            <input 
                               type="text" 
                               value={salePrice} 
                               onChange={e => handleGlobalSalePriceChange(e.target.value)} 
                               onFocus={handleFocus} 
                               className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-right font-black text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-normal tracking-tight pointer-events-none">
                                {getConvertedText(salePrice)}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400">수취 배송비(KRW)</label>
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={custShipping} 
                                onChange={e => setCustShipping(e.target.value)} 
                                onFocus={handleFocus} 
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-right font-black text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-normal tracking-tight pointer-events-none">
                                {getConvertedText(custShipping)}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400">무게(KG/개당)</label>
                        <input type="text" value={weight} onChange={e => setWeight(e.target.value)} onFocus={handleFocus} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-right font-black text-slate-700 text-sm focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-rose-500">포장무게(KG/건)</label>
                        <input 
                             type="text" 
                             value={boxWeight} 
                             onChange={e => setBoxWeight(e.target.value)} 
                             onFocus={handleFocus} 
                             className="w-full border border-rose-200 bg-rose-50/50 rounded-xl px-3 py-2.5 text-right font-black text-rose-600 text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all" 
                             placeholder="박스" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-amber-500">구매원가(EUR)</label>
                        <input type="text" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} onFocus={handleFocus} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-right font-black text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all" placeholder="EUR" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400">환율(EUR/KRW)</label>
                        <input type="text" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} onFocus={handleFocus} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-right font-black text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-purple-500">목표 마진(%)</label>
                        <div className="flex gap-1">
                            <input 
                                type="text" 
                                value={targetMargin} 
                                onChange={e => setTargetMargin(e.target.value)} 
                                onFocus={handleFocus} 
                                onKeyDown={e => e.key === 'Enter' && handleReverseCalcMargin()}
                                className="w-full border border-purple-200 bg-purple-50 rounded-xl px-3 py-2.5 text-center font-black text-purple-700 focus:ring-2 focus:ring-purple-500 outline-none text-sm placeholder-purple-200 transition-all" 
                                placeholder="20"
                            />
                            <button 
                                onClick={handleReverseCalcMargin} 
                                className="w-11 h-[42px] bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 text-sm font-bold transition flex items-center justify-center shadow-sm flex-shrink-0"
                                title="판매가 역산"
                            >
                                <i className="fas fa-calculator"></i>
                            </button>
                        </div>
                    </div>

                    {isSupplyMode && (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-indigo-500">수익 배분 (우리:고객)</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={ratioUs} 
                                    onChange={e => handleRatioUsChange(e.target.value)} 
                                    onFocus={handleFocus} 
                                    className="w-full border border-indigo-200 bg-indigo-50/50 rounded-xl px-1 py-2.5 text-center font-black text-indigo-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                    placeholder="7"
                                />
                                <span className="text-slate-400 font-bold">:</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={ratioCustomer} 
                                    onChange={e => handleRatioCustomerChange(e.target.value)} 
                                    onFocus={handleFocus} 
                                    className="w-full border border-indigo-200 bg-indigo-50/50 rounded-xl px-1 py-2.5 text-center font-black text-indigo-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                    placeholder="3"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-200 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-lg">수량 옵션 추가</div>
                        <button onClick={addScenario} className="bg-slate-800 text-white w-9 h-9 rounded-xl hover:bg-slate-900 transition flex items-center justify-center shadow-lg shadow-slate-200">
                            <i className="fas fa-plus text-xs"></i>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ml-4 overflow-x-auto max-w-[600px] pb-2 pt-1 scrollbar-hide">
                        {[...visiblePresets, ...markets.filter(m => !visiblePresets.some(p => p.id === m.id))].map(btnItem => {
                            const isAdded = markets.some(m => m.id === btnItem.id);
                            const isSelected = selectedMarketIds.includes(btnItem.id);
                            return (
                            <button
                                key={btnItem.id}
                                onClick={() => handlePresetClick(btnItem.id, btnItem.name)}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border whitespace-nowrap flex-shrink-0 ${
                                isSelected
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105'
                                    : isAdded 
                                    ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 border-dashed hover:bg-white hover:border-blue-300 hover:text-blue-500'
                                }`}
                            >
                                {btnItem.name}
                                {isSelected 
                                ? <i className="fas fa-check ml-1.5 text-[10px] text-white"></i> 
                                : !isAdded && <i className="fas fa-plus ml-1.5 text-[10px] opacity-70"></i>
                                }
                            </button>
                            );
                        })}
                        <button
                            onClick={handleAddCustomMarket}
                            className="px-4 py-2 text-xs font-bold rounded-xl transition-all border border-dashed border-slate-300 text-slate-400 hover:bg-white hover:border-blue-300 hover:text-blue-500 whitespace-nowrap"
                        >
                            <i className="fas fa-plus mr-1"></i> 직접 추가
                        </button>
                    </div>
                </div>
            </div>

            {/* Market List */}
            <div className="space-y-8" ref={resultsRef}>
                {selectedMarketIds.map(marketId => {
                    const market = markets.find(m => m.id === marketId);
                    if (!market) return null;
                    return (
                    <div key={marketId} className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                        {/* Market Header & Settings (Refined) */}
                        <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/30 gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600 text-lg">
                                   <i className="fas fa-store"></i>
                                </div>
                                <input 
                                    type="text" 
                                    value={market.name} 
                                    onFocus={handleFocus}
                                    onChange={(e) => {
                                        setMarkets(markets.map(m => m.id === market.id ? { ...m, name: e.target.value } : m));
                                    }}
                                    className="font-black text-slate-800 text-xl bg-transparent outline-none border-b-2 border-transparent focus:border-indigo-200 transition-colors w-full placeholder-slate-300"
                                    placeholder="마켓명"
                                />
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 bg-white pl-4 pr-2 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                                    <label className="text-[10px] font-bold text-slate-400 whitespace-nowrap">판매가</label>
                                    <input 
                                        type="text" 
                                        value={market.salePrice}
                                        onChange={(e) => updateMarketSetting(market.id, 'salePrice', e.target.value)}
                                        onFocus={handleFocus}
                                        className="w-24 text-right font-black text-slate-700 text-sm outline-none bg-transparent"
                                        placeholder="0"
                                    />
                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">KRW</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white pl-4 pr-2 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                                    <label className="text-[10px] font-bold text-slate-400 whitespace-nowrap">배송비</label>
                                    <input 
                                        type="text" 
                                        value={market.shippingFee}
                                        onChange={(e) => updateMarketSetting(market.id, 'shippingFee', e.target.value)}
                                        onFocus={handleFocus}
                                        className="w-20 text-right font-black text-slate-700 text-sm outline-none bg-transparent"
                                        placeholder={custShipping || "0"}
                                    />
                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">KRW</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white pl-4 pr-2 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                                    <label className="text-[10px] font-bold text-slate-400 whitespace-nowrap">판매수수료</label>
                                    <input 
                                        type="text" 
                                        value={market.feeRate}
                                        onChange={(e) => updateMarketSetting(market.id, 'feeRate', e.target.value)}
                                        onFocus={handleFocus}
                                        className="w-14 text-right font-black text-red-500 text-sm outline-none bg-transparent"
                                        placeholder="0"
                                    />
                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">%</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white pl-4 pr-2 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                                    <label className="text-[10px] font-bold text-slate-400 whitespace-nowrap">배송수수료</label>
                                    <input 
                                        type="text" 
                                        value={market.shippingFeeRate}
                                        onChange={(e) => updateMarketSetting(market.id, 'shippingFeeRate', e.target.value)}
                                        onFocus={handleFocus}
                                        className="w-14 text-right font-black text-teal-500 text-sm outline-none bg-transparent"
                                        placeholder="0"
                                    />
                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">%</span>
                                </div>
                                <button 
                                    onClick={(e) => removeMarket(market.id, e)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-100 transition shadow-sm ml-2"
                                    title="마켓 제거"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                        
                        <table className="w-full text-sm text-left border-separate border-spacing-0 table-fixed">
                             <thead className="bg-white border-b border-slate-100">
                                <tr>
                                   <th className={`py-4 px-4 font-bold text-slate-400 text-center border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[5%]', 'w-[4%]')}`}>수량</th>
                                   <th className={`py-4 px-4 font-bold text-slate-400 text-right border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[7%]', 'w-[5%]')}`}>총 무게</th>
                                   <th className={`py-4 px-4 font-bold text-slate-400 text-right border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[9%]', 'w-[6%]')}`}>판매매출</th>
                                   <th className={`py-4 px-4 font-bold text-slate-400 text-right border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[9%]', 'w-[6%]')}`}>배송매출</th>
                                   <th className={`py-4 px-4 font-black text-slate-800 text-right border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[10%]', 'w-[7%]')}`}>총 매출</th>
                                   <th className={`py-4 px-4 font-bold text-blue-500 text-right bg-blue-50/30 border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[11%]', 'w-[8%]')}`}>
                                      정산금액<br/>
                                      <span className="text-[9px] font-normal opacity-70">
                                         (KRW){exchangeRate && Number(exchangeRate) > 0 ? ` @ ${formatNum(Number(exchangeRate))}` : ''}
                                      </span>
                                   </th>
                                   
                                   <th className={`py-4 px-4 font-bold text-slate-400 text-right border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[10%]', 'w-[7%]')}`}>
                                      구매원가<br/>
                                      <span className="text-[9px] font-normal opacity-70">(EUR)</span>
                                   </th>
                                   <th className={`py-4 px-4 font-bold text-slate-400 text-right border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[11%]', 'w-[8%]')}`}>
                                      물류비<br/>
                                      <span className="text-[9px] font-normal opacity-70">(특송+포장+기타)</span>
                                   </th>
                                   <th className={`py-4 px-4 font-black text-slate-600 text-right border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[10%]', 'w-[7%]')}`}>
                                      원가합계<br/>
                                      <span className="text-[9px] font-normal opacity-70">(EUR)</span>
                                   </th>

                                   <th className={`py-4 px-4 font-black text-emerald-600 text-right bg-emerald-50/30 border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[10%]', 'w-[7%]')}`}>
                                      순수익<br/>
                                      <span className="text-[9px] font-normal opacity-70">(EUR)</span>
                                   </th>
                                   <th className={`py-4 px-4 font-black text-indigo-600 text-right bg-indigo-50/30 border-b border-slate-100 text-[10px] uppercase tracking-widest ${colWidth('w-[8%]', 'w-[5%]')}`}>마진율</th>
                                   
                                   {isSupplyMode && (
                                     <>
                                       <th className="py-4 px-4 font-bold text-slate-400 text-center w-[10%] border-l border-slate-100 border-b text-[10px] uppercase tracking-widest">수익 배분<br/><span className="text-[9px] font-normal">(EUR)</span></th>
                                       <th className="py-4 px-4 font-bold text-slate-400 text-right w-[10%] border-b border-slate-100 text-[10px] uppercase tracking-widest">공급가<br/><span className="text-[9px] font-normal">(EUR)</span></th>
                                       <th className="py-4 px-4 font-bold text-slate-400 text-center w-[10%] border-b border-slate-100 text-[10px] uppercase tracking-widest">마진 배분<br/><span className="text-[9px] font-normal">(%)</span></th>
                                     </>
                                   )}
                                </tr>
                             </thead>
                             <tbody>
                                {scenarios.map((scenario) => {
                                   const res = calculateRow(scenario, market);
                                   const splitProfit = getProfitSplit(res.profit, parseNum(ratioUs), parseNum(ratioCustomer));
                                   
                                   let supplyPriceEUR = 0;
                                   let supplyPriceKRW = 0;
                                   let splitProfitKRW = { us: 0, customer: 0 };
                                   let splitProfitEUR = { us: 0, customer: 0 };
                                   let usMargin = '0.00';
                                   let custMargin = '0.00';

                                   if (isSupplyMode && splitProfit) {
                                        const ratioTotal = splitProfit.r1 + splitProfit.r2;
                                        if (ratioTotal > 0) {
                                            splitProfitKRW.us = res.profit * (splitProfit.r1 / ratioTotal);
                                            splitProfitKRW.customer = res.profit * (splitProfit.r2 / ratioTotal);
                                            
                                            splitProfitEUR.us = res.profitEUR * (splitProfit.r1 / ratioTotal);
                                            splitProfitEUR.customer = res.profitEUR * (splitProfit.r2 / ratioTotal);
                                            
                                            const splitProfitEUR_US = res.profitEUR * (splitProfit.r1 / ratioTotal);
                                            supplyPriceEUR = res.totalExpenseEUR + splitProfitEUR_US; // Cost(EUR) + Us Profit(EUR)
                                            supplyPriceKRW = res.totalExpense + splitProfitKRW.us; // Cost(KRW) + Us Profit(KRW)
                                            
                                            const denominator = res.settlement > 0 ? res.settlement : res.totalRevenue;
                                            if (denominator > 0) {
                                                usMargin = ((splitProfitKRW.us / denominator) * 100).toFixed(2);
                                                custMargin = ((splitProfitKRW.customer / denominator) * 100).toFixed(2);
                                            }
                                        }
                                   }

                                   const totalLogisticsKRW = res.details.express + res.details.pack + res.details.misc;
                                   const totalLogisticsEUR = res.details.logisticsEUR;

                                   return (
                                      <tr key={scenario.id} className="hover:bg-slate-50 transition-colors group">
                                         <td className="py-5 px-4 border-b border-slate-100 align-middle">
                                            <div className="flex items-center gap-1 justify-center">
                                               <input 
                                                  type="text" 
                                                  value={scenario.qty} 
                                                  onChange={(e) => updateScenario(scenario.id, 'qty', e.target.value)}
                                                  onFocus={handleFocus}
                                                  className="w-10 text-center font-bold text-slate-700 border border-slate-200 rounded-lg py-1.5 focus:border-blue-500 outline-none text-xs bg-slate-50 focus:bg-white transition-colors"
                                               />
                                               <button onClick={() => removeScenario(scenario.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity absolute ml-12">
                                                  <i className="fas fa-times text-xs"></i>
                                               </button>
                                            </div>
                                         </td>
                                         <td className="py-5 px-4 text-right border-b border-slate-100 font-medium text-slate-600 text-xs align-middle">
                                            <div className="flex items-center justify-end gap-1">
                                               <input 
                                                  type="text" 
                                                  placeholder={res.calcWeight.toFixed(2)} 
                                                  value={scenario.weightOverride} 
                                                  onChange={(e) => updateScenario(scenario.id, 'weightOverride', e.target.value)}
                                                  onFocus={handleFocus}
                                                  className={`w-16 text-right bg-transparent border-b outline-none transition-colors placeholder-slate-400 font-bold ${
                                                      scenario.weightOverride 
                                                      ? 'border-blue-400 text-blue-600' 
                                                      : 'border-transparent focus:border-slate-300 text-slate-600'
                                                  }`}
                                               />
                                               <span className="text-[10px] text-slate-400">kg</span>
                                            </div>
                                         </td>
                                         
                                         {/* Editable Product Revenue */}
                                         <td className="py-5 px-4 text-right border-b border-slate-100 text-slate-600 text-xs align-middle font-medium">
                                            <input 
                                               type="text" 
                                               placeholder={formatNum(parseNum(market.salePrice || salePrice) * parseNum(scenario.qty))}
                                               value={scenario.productRevenueOverride}
                                               onChange={(e) => updateScenario(scenario.id, 'productRevenueOverride', e.target.value)}
                                               onFocus={handleFocus}
                                               className="w-full text-right bg-transparent border-b border-transparent focus:border-blue-400 outline-none placeholder-slate-400 transition-colors"
                                            />
                                         </td>
                                         
                                         {/* Editable Shipping Revenue */}
                                         <td className="py-5 px-4 text-right border-b border-slate-100 text-slate-600 text-xs align-middle font-medium">
                                            <input 
                                               type="text" 
                                               placeholder={formatNum(market.shippingFee && market.shippingFee !== '' ? parseNum(market.shippingFee) : parseNum(custShipping))}
                                               value={scenario.shippingRevenueOverride}
                                               onChange={(e) => updateScenario(scenario.id, 'shippingRevenueOverride', e.target.value)}
                                               onFocus={handleFocus}
                                               className="w-full text-right bg-transparent border-b border-transparent focus:border-blue-400 outline-none placeholder-slate-400 transition-colors"
                                            />
                                         </td>

                                         {/* Calculated Total Revenue */}
                                         <td className="py-5 px-4 text-right border-b border-slate-100 font-black text-slate-800 text-sm align-middle">
                                            {formatNum(res.totalRevenue)}
                                         </td>

                                         <td className="py-5 px-4 text-right border-b border-slate-100 font-bold text-blue-600 bg-blue-50/30 text-sm align-middle">
                                            <div>{formatNum(res.settlement)}</div>
                                            <div className="text-[10px] text-blue-400 font-normal mt-0.5">{formatEUR(res.settlementEUR)}</div>
                                         </td>
                                         
                                         <td className="py-5 px-4 text-right border-b border-slate-100 text-slate-500 text-xs align-middle font-medium">
                                            <div>{formatEUR(res.details.purchaseEUR)}</div>
                                            <div className="text-[10px] opacity-60 font-normal mt-0.5">{formatNum(res.details.purchase)}</div>
                                         </td>
                                         <td className="py-5 px-4 text-right border-b border-slate-100 font-medium text-slate-500 text-xs align-middle">
                                            <div className="leading-tight">
                                              {formatNum(totalLogisticsKRW)}<br/>
                                              <span className="text-[10px] opacity-60 font-normal">{formatEUR(totalLogisticsEUR)}</span>
                                            </div>
                                         </td>
                                         <td className="py-5 px-4 text-right border-b border-slate-100 font-black text-slate-700 text-xs align-middle">
                                            <div>{formatEUR(res.totalExpenseEUR)}</div>
                                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{formatNum(res.totalExpense)}</div>
                                         </td>

                                         <td className={`py-5 px-4 text-right border-b border-slate-100 font-black text-sm bg-emerald-50/30 align-middle ${res.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            <div>{formatEUR(res.profitEUR)}</div>
                                            <div className={`text-[10px] font-normal mt-0.5 ${res.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatNum(res.profit)}</div>
                                         </td>
                                         <td className="py-5 px-4 text-right border-b border-slate-100 font-black text-indigo-600 bg-indigo-50/30 text-sm align-middle">
                                            {res.margin.toFixed(2)}%
                                         </td>
                                         
                                         {isSupplyMode && (
                                           <>
                                             <td className="py-5 px-4 text-center border-b border-slate-100 border-l text-xs align-middle">
                                                <div className="flex flex-col gap-1">
                                                   <span className="text-indigo-600 font-bold">{formatEUR(splitProfitEUR.us)}</span>
                                                   <span className="text-slate-400 font-bold border-t border-slate-200 pt-1">{formatEUR(splitProfitEUR.customer)}</span>
                                                </div>
                                             </td>
                                             <td className="py-5 px-4 text-right border-b border-slate-100 font-black text-slate-800 text-xs align-middle">
                                                {formatEUR(supplyPriceEUR)}
                                             </td>
                                             <td className="py-5 px-4 text-center border-b border-slate-100 text-xs align-middle">
                                                <div className="flex flex-col gap-1">
                                                   <span className="text-indigo-600 font-bold">{usMargin}%</span>
                                                   <span className="text-slate-400 font-bold border-t border-slate-200 pt-1">{custMargin}%</span>
                                                </div>
                                             </td>
                                           </>
                                         )}
                                      </tr>
                                   );
                                })}
                             </tbody>
                          </table>
                       </div>
                       );
                    })}
                 </div>
            </div>
      </div>
      
      {/* Settings Modal */}
      <LogisticsSettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSettingsSave}
        initialSettings={{
            expressMin,
            expressPerKg,
            packingPrice,
            miscTiers,
            isGeneralCustoms
        }}
        title={isSupplyMode ? '공급가 시뮬레이션 기본 설정' : '마진 시뮬레이션 기본 설정'}
      />
    </div>
  );
};

export default MarginCalculatorModal;
