
export interface SaleRecord {
  date: string;         // 날짜
  mallName: string;     // 쇼핑몰명
  englishName: string;  // 영문상품명
  koreanName: string;   // 한글상품명
  quantity: number;     // 수량
  unitPrice: number;    // 단가 (판매가)
  shippingFee: number;  // 배송비 (매출)
  totalPrice: number;   // 합계 (판매가+배송비)
  settlementPrice: number; // 정산가 (플랫폼 수수료 제외 입금액)
  unitCost: number;     // 구매원가
  shippingCost: number; // 배송비용 (지출)
  packagingCost: number; // 포장비용 (지출)
  profitSettlement: number; // 수익 정산가
}

export interface AggregatedStat {
  label: string;
  revenue: number;
  count: number;
  quantity: number;
  [key: string]: any;
}

export type TimeGranularity = 'Daily' | 'Weekly' | 'Monthly';

export interface DashboardData {
  records: SaleRecord[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    topMall: string;
    topProduct: string;
  };
}

// 인증 시스템을 위한 사용자 타입 정의
export interface User {
  email: string;
  password: string; // 실제 서비스에서는 해싱해야 함
  role: 'admin' | 'user';
  isApproved: boolean; // 관리자 승인 여부
  name?: string;
  createdAt: string;
}
