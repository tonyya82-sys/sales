
import { SaleRecord, AggregatedStat, TimeGranularity } from '../types';

const splitCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(currentField.trim());
      currentField = '';
    } else currentField += char;
  }
  result.push(currentField.trim());
  return result;
};

const cleanNumber = (val: string): number => {
  if (!val) return 0;
  const sanitized = val.replace(/[^0-9.-]+/g, "");
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
};

export const parseCSV = (csv: string): SaleRecord[] => {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return [];
  
  // 요청된 컬럼 순서 (0-Based Index)
  // 0: 날짜
  // 1: 쇼핑몰명
  // 2: 영문상품명
  // 3: 한글상품명
  // 4: 수량
  // 5: 단가
  // 6: 배송비
  // 7: 합계
  // 8 (I열): 정산가
  // 9 (J열): 구매원가
  // 10 (K열): 배송비용 (지출)
  // 11 (L열): 포장비용 (지출)
  // 12 (M열): 수익
  // 13 (N열): 수익률

  return lines.slice(1).filter(line => line.trim() !== '').map(line => {
    const values = splitCSVLine(line);
    
    return {
      date: values[0] || '',
      mallName: values[1] || '기타',
      englishName: (values[2] || '').replace(/^"|"$/g, ''),
      koreanName: (values[3] || '').replace(/^"|"$/g, ''),
      quantity: Math.floor(cleanNumber(values[4] || '0')),
      unitPrice: cleanNumber(values[5] || '0'),
      shippingFee: cleanNumber(values[6] || '0'),
      totalPrice: cleanNumber(values[7] || '0'),
      // 확장 필드 매핑
      settlementPrice: cleanNumber(values[8] || '0'),
      unitCost: cleanNumber(values[9] || '0'),
      shippingCost: cleanNumber(values[10] || '0'),
      packagingCost: cleanNumber(values[11] || '0'),
      profitSettlement: cleanNumber(values[12] || '0') 
    };
  });
};

export const filterByDate = (records: SaleRecord[], start: string, end: string): SaleRecord[] => {
  return records.filter(r => {
    const d = r.date;
    if (!d) return false;
    return (!start || d >= start) && (!end || d <= end);
  });
};

export const aggregateByMall = (records: SaleRecord[]): AggregatedStat[] => {
  const map = new Map<string, { revenue: number, count: number, quantity: number }>();
  records.forEach(r => {
    const key = r.mallName;
    const existing = map.get(key) || { revenue: 0, count: 0, quantity: 0 };
    map.set(key, { 
      revenue: existing.revenue + r.totalPrice, 
      count: existing.count + 1,
      quantity: existing.quantity + r.quantity
    });
  });
  return Array.from(map.entries()).map(([label, stats]) => ({ label, ...stats })).sort((a, b) => b.revenue - a.revenue);
};

export const aggregateByProduct = (records: SaleRecord[]): AggregatedStat[] => {
  const map = new Map<string, { revenue: number, count: number, quantity: number, productRevenue: number }>();
  records.forEach(r => {
    const key = r.koreanName || '이름 없음';
    const existing = map.get(key) || { revenue: 0, count: 0, quantity: 0, productRevenue: 0 };
    map.set(key, { 
      revenue: existing.revenue + r.totalPrice, 
      count: existing.count + 1,
      quantity: existing.quantity + r.quantity,
      productRevenue: existing.productRevenue + (r.unitPrice * r.quantity)
    });
  });
  return Array.from(map.entries()).map(([label, stats]) => ({ label, ...stats })).sort((a, b) => b.revenue - a.revenue);
};

export const aggregateByTime = (records: SaleRecord[], granularity: TimeGranularity): AggregatedStat[] => {
  const map = new Map<string, { revenue: number, count: number, quantity: number }>();
  records.forEach(r => {
    const dateObj = new Date(r.date);
    if (isNaN(dateObj.getTime())) return;
    let key = '';
    if (granularity === 'Daily') key = r.date;
    else if (granularity === 'Weekly') {
      const d = new Date(dateObj);
      const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
      key = new Date(d.setDate(diff)).toISOString().split('T')[0] + ' 주';
    } else key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

    const existing = map.get(key) || { revenue: 0, count: 0, quantity: 0 };
    map.set(key, { 
      revenue: existing.revenue + r.totalPrice, 
      count: existing.count + 1,
      quantity: existing.quantity + r.quantity
    });
  });
  return Array.from(map.entries()).map(([label, stats]) => ({ label, ...stats })).sort((a, b) => a.label.localeCompare(b.label));
};

export const aggregateMallsByTime = (records: SaleRecord[], granularity: TimeGranularity) => {
  const timeMap = new Map<string, any>();
  const malls = Array.from(new Set(records.map(r => r.mallName)));

  records.forEach(r => {
    const dateObj = new Date(r.date);
    if (isNaN(dateObj.getTime())) return;
    let timeKey = '';
    if (granularity === 'Daily') timeKey = r.date;
    else if (granularity === 'Weekly') {
      const d = new Date(dateObj);
      const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
      timeKey = new Date(d.setDate(diff)).toISOString().split('T')[0] + ' 주';
    } else timeKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

    if (!timeMap.has(timeKey)) {
      const entry: any = { label: timeKey, count: 0, revenue: 0 };
      malls.forEach(m => entry[m] = 0);
      timeMap.set(timeKey, entry);
    }
    const current = timeMap.get(timeKey);
    current[r.mallName] = (current[r.mallName] || 0) + r.totalPrice;
    current.revenue += r.totalPrice;
    current.count += 1;
  });

  return {
    data: Array.from(timeMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
    mallNames: malls
  };
};

export const generateCSVWithCosts = (records: SaleRecord[]): string => {
  // 헤더 매핑
  const header = "날짜,쇼핑몰명,영문상품명,한글상품명,수량,단가,배송비,합계,정산가,구매원가,배송비용,포장비용,수익,기타\n";
  const rows = records.map(r => {
    return [
      r.date,
      r.mallName,
      `"${r.englishName}"`,
      `"${r.koreanName}"`,
      r.quantity,
      r.unitPrice,
      r.shippingFee,
      r.totalPrice,
      r.settlementPrice || 0,
      r.unitCost || 0,
      r.shippingCost || 0,
      r.packagingCost || 0,
      r.profitSettlement || 0,
      0 // N열(수익률) 예비
    ].join(',');
  }).join('\n');
  return header + rows;
};
