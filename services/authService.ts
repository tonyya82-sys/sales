import { User } from "../types";

// ==============================================================================
// [설정 1] 기존 기능용 (재고, 로그인 등) - 기본값
// ==============================================================================
const MAIN_API_URL = "https://script.google.com/macros/s/AKfycbz_pj34IClIEQpPDCokD_ZXTj9T_UMKTvwxmVCne-_pq207mW4gNeWplrIWP0mpyF8yWw/exec"; 

// ==============================================================================
// [설정 2] 시뮬레이션 저장용 - 기본값 (소스코드 레벨)
// * 주의: 사용자가 웹 앱 설정 메뉴에서 API URL을 직접 입력하면, 그 값이 우선 적용됩니다. (LocalStorage)
// ==============================================================================
const SIMULATION_API_URL = "https://script.google.com/macros/s/AKfycbz6nNINa-zkz9UIQ26KBti8Vf94PcUk04Hh-qqUNGG3okzxmhJXLZQnmzU-jbVw53UegA/exec";


const USERS_KEY = 'app_users';
const CURRENT_USER_KEY = 'app_current_user';
const ADMIN_EMAIL = 'tonyya82@gmail.com';
const INITIAL_ADMIN_PW = '1234';

// [신규] 기본 URL 가져오기 헬퍼
// LocalStorage에 저장된 값이 있으면 그것을 사용하고, 없으면 위 코드 상단의 기본값을 사용합니다.
export const getDefaultSimulationUrl = () => {
    return localStorage.getItem('SIMULATION_API_URL') || SIMULATION_API_URL;
};

// [신규] URL 유효성 검사 함수
export const validateApiUrl = (url: string) => {
    if (!url) return { valid: false, msg: "URL이 비어있습니다." };
    if (url.includes("script.google.com") && url.includes("/edit")) {
        return { valid: false, msg: "⛔ '편집기 주소(/edit)'는 사용할 수 없습니다. 배포된 '웹 앱 URL(/exec)'을 사용하세요." };
    }
    if (!url.includes("script.google.com")) {
        return { valid: false, msg: "올바른 구글 스크립트 주소가 아닙니다." };
    }
    if (!url.endsWith("/exec")) {
         return { valid: false, msg: "URL은 반드시 '/exec'로 끝나야 합니다. (배포 -> 새 배포 -> 웹 앱 URL 복사)" };
    }
    return { valid: true, msg: "OK" };
};

// [신규] 연결 테스트 함수 (Timeout 30초로 증량)
export const testConnection = async (url: string) => {
    const validation = validateApiUrl(url);
    if (!validation.valid) return { success: false, message: validation.msg };

    try {
        const controller = new AbortController();
        // Google Apps Script 콜드 스타트 대응을 위해 타임아웃 30초로 설정
        const timeoutId = setTimeout(() => controller.abort(), 30000); 

        // 캐시 방지를 위해 timestamp 파라미터 추가
        const fetchUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;

        const response = await fetch(fetchUrl, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'ping_test', groupId: 'TEST_CONN' }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
             const text = await response.text();
             try {
                 const data = JSON.parse(text);
                 if (data.status === 'success' || data.result === 'success') {
                     return { success: true, message: "연결 성공!" };
                 }
                 return { success: true, message: "연결됨 (응답: " + (data.message || "OK") + ")" }; 
             } catch (e) {
                 if (text.includes("<!DOCTYPE html>") || text.includes("Google Docs")) {
                     return { success: false, message: "권한 오류: 배포 시 '액세스 권한'을 '모든 사용자(Anyone)'로 설정했는지 확인하세요." };
                 }
                 return { success: true, message: "연결 성공 (JSON 파싱 경고 - 데이터는 저장될 수 있음)" };
             }
        } else {
             return { success: false, message: `HTTP 오류: ${response.status} ${response.statusText}` };
        }
    } catch (e: any) {
        console.error("Test Connection Error:", e);
        
        const errString = e ? String(e).toLowerCase() : "";
        const errMsg = e instanceof Error ? e.message.toLowerCase() : errString;

        // AbortError 또는 'aborted' 메시지가 포함된 경우 타임아웃으로 처리
        if (e.name === 'AbortError' || errMsg.includes('aborted') || errMsg.includes('signal is aborted')) {
             return { success: false, message: "시간 초과 (30초): 스크립트가 초기 구동(Cold Start) 중일 수 있습니다. 1분 후 다시 시도해주세요." };
        }
        return { success: false, message: "네트워크 오류: " + (e.message || "인터넷 연결을 확인하세요.") };
    }
};

// API 호출 헬퍼
const apiCall = async (action: string, payload: any = {}, targetUrl: string = MAIN_API_URL) => {
  if (!targetUrl || targetUrl.includes("새로운_URL")) {
      throw new Error("API URL이 설정되지 않았습니다.");
  }
  
  console.log(`[API Request] ${action} -> ${targetUrl}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      mode: 'cors', 
      credentials: 'omit',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (parseError) {
        console.error("JSON Parse Error. Raw text:", text);
        if (text.includes("Google Docs") || text.includes("script.google.com")) {
             throw new Error("스크립트 권한 오류: '모든 사용자(Anyone)' 권한으로 배포되었는지 확인하세요.");
        }
        throw new Error("서버 응답 형식이 올바르지 않습니다.");
    }

  } catch (e: any) {
    clearTimeout(timeoutId);
    const errMsg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
    
    if (e.name === 'AbortError' || errMsg.includes('aborted')) {
        throw new Error("서버 응답 시간 초과 (30초).");
    }
    throw new Error(`연결 실패: ${e.message}`);
  }
};

// ... (User Auth helper functions omitted for brevity, keeping existing logic) ...
// (기존 코드 유지: getLocalUsers, saveLocalUsers, initAuth, loginUser, registerUser, logoutUser, getCurrentUser, getAllUsers, toggleUserApproval, deleteUser, changePassword)
const getLocalUsers = (): User[] => {
  try {
    const usersJson = localStorage.getItem(USERS_KEY);
    if (!usersJson) return [];
    const parsed = JSON.parse(usersJson);
    return Array.isArray(parsed) ? parsed.filter(u => u && u.email) : [];
  } catch { return []; }
};
const saveLocalUsers = (users: User[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

export const initAuth = async () => {
  const normalizedAdminEmail = ADMIN_EMAIL.trim().toLowerCase();
  if (MAIN_API_URL) {
    try {
      const response = await apiCall('getUsers', {}, MAIN_API_URL);
      if (response.status === 'success') {
        const users = response.users || [];
        const adminExists = users.find((u: User) => u.email.toLowerCase() === normalizedAdminEmail);
        if (!adminExists) {
          await apiCall('register', {
            email: normalizedAdminEmail, password: INITIAL_ADMIN_PW, name: 'Super Admin', role: 'admin', isApproved: true
          }, MAIN_API_URL);
        }
      }
    } catch (e) { console.error("Server init error:", e); }
  } else {
    const users = getLocalUsers();
    if (!users.find(u => u.email.toLowerCase() === normalizedAdminEmail)) {
      users.push({ email: normalizedAdminEmail, password: INITIAL_ADMIN_PW, role: 'admin', isApproved: true, name: 'Super Admin', createdAt: new Date().toISOString() });
      saveLocalUsers(users);
    }
  }
};

export const loginUser = async (email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (MAIN_API_URL) {
    try {
      const result = await apiCall('login', { email: normalizedEmail, password }, MAIN_API_URL);
      if (result.status === 'success' && result.user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
        return { success: true, message: '로그인 성공', user: result.user };
      } else {
        return { success: false, message: result.message || '이메일 또는 비밀번호를 확인해주세요.' };
      }
    } catch (e: any) { return { success: false, message: e.message || '서버 통신 오류' }; }
  } else {
    const users = getLocalUsers();
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);
    if (!user) return { success: false, message: '이메일 또는 비밀번호 불일치' };
    if (!user.isApproved) return { success: false, message: '승인 대기 중입니다.' };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true, message: '로그인 성공', user };
  }
};

export const registerUser = async (email: string, password: string, name: string): Promise<{ success: boolean; message: string }> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (MAIN_API_URL) {
    try {
      const result = await apiCall('register', { email: normalizedEmail, password, name: name.trim() }, MAIN_API_URL);
      return result.status === 'success' ? { success: true, message: '가입 신청 완료. 승인 대기.' } : { success: false, message: result.message || '가입 실패' };
    } catch (e: any) { return { success: false, message: e.message }; }
  } else {
    const users = getLocalUsers();
    if (users.find(u => u.email.toLowerCase() === normalizedEmail)) return { success: false, message: '이미 등록된 이메일' };
    users.push({ email: normalizedEmail, password, role: 'user', isApproved: false, name: name.trim(), createdAt: new Date().toISOString() });
    saveLocalUsers(users);
    return { success: true, message: '가입 신청 완료 (로컬)' };
  }
};

export const logoutUser = () => localStorage.removeItem(CURRENT_USER_KEY);
export const getCurrentUser = (): User | null => { const u = localStorage.getItem(CURRENT_USER_KEY); return u ? JSON.parse(u) : null; };
export const getAllUsers = async (): Promise<User[]> => {
  if (MAIN_API_URL) { try { const res = await apiCall('getUsers', {}, MAIN_API_URL); return res.users || []; } catch { return []; } }
  return getLocalUsers();
};
export const toggleUserApproval = async (email: string): Promise<User[]> => {
  if (MAIN_API_URL) { await apiCall('toggleApproval', { email }, MAIN_API_URL); return getAllUsers(); }
  let users = getLocalUsers().map(u => u.email === email && u.role !== 'admin' ? { ...u, isApproved: !u.isApproved } : u);
  saveLocalUsers(users); return users;
};
export const deleteUser = async (email: string): Promise<User[]> => {
  if (MAIN_API_URL) { await apiCall('deleteUser', { email }, MAIN_API_URL); return getAllUsers(); }
  let users = getLocalUsers().filter(u => u.email !== email); saveLocalUsers(users); return users;
};
export const changePassword = async (email: string, newPw: string): Promise<boolean> => {
  if (MAIN_API_URL) { const res = await apiCall('changePassword', { email, newPassword: newPw }, MAIN_API_URL); return res.status === 'success'; }
  let users = getLocalUsers(); const idx = users.findIndex(u => u.email === email); if (idx !== -1) { users[idx].password = newPw; saveLocalUsers(users); return true; } return false;
};

// ... (Inventory helpers) ...
export const getInventoryData = async () => {
  if (!MAIN_API_URL) return { inventory: [] };
  try {
    const response = await apiCall('getInventoryData', {}, MAIN_API_URL);
    if (response.status === 'success') {
      const rawData = response.inventory || response.data || [];
      const safeArray = Array.isArray(rawData) ? rawData : [];
      return { inventory: safeArray.filter((item: any) => item && typeof item === 'object'), lastUpdated: response.lastUpdated };
    }
    return { inventory: [] };
  } catch (e: any) { console.error("Data Fetch Error:", e); return { inventory: [] }; }
};

export const updateInventorySettings = async (ean: string, leadTime: number, minStock: number, purchaseQty: number, name: string) => {
  if (!MAIN_API_URL) return false;
  try {
    return await updateProductCostsInSheet(name, undefined, undefined, undefined, undefined, ean, leadTime, minStock, purchaseQty);
  } catch (e) { return false; }
};

export const updateProductCostsInSheet = async (name: string, unitCost?: number, shippingCost?: number, packagingCost?: number, settlementPrice?: number, ean?: string, leadTime?: number, minStock?: number, purchaseQty?: number) => {
  if (!MAIN_API_URL) return false;
  try {
    const payload: any = { name: String(name) };
    if (unitCost !== undefined) payload.unitCost = Number(unitCost);
    if (shippingCost !== undefined) payload.shippingCost = Number(shippingCost);
    if (packagingCost !== undefined) payload.packagingCost = Number(packagingCost);
    if (settlementPrice !== undefined) payload.settlementPrice = Number(settlementPrice);
    if (ean !== undefined) payload.ean = String(ean);
    if (leadTime !== undefined) payload.leadTime = Number(leadTime);
    if (minStock !== undefined) payload.minStock = Number(minStock);
    if (purchaseQty !== undefined) payload.purchaseQty = Number(purchaseQty);
    const response = await apiCall('updateProductSettings', payload, MAIN_API_URL);
    return response.status === 'success';
  } catch (e) { return false; }
};

// [신규] 마진 시뮬레이션 데이터 저장
export const saveSimulationData = async (payload: any) => {
  const storedUrl = localStorage.getItem('SIMULATION_API_URL');
  // 사용자가 설정한 URL이 있으면 그것을 쓰고, 없으면 소스코드 기본값을 사용
  const targetUrl = storedUrl && storedUrl.startsWith('http') ? storedUrl : SIMULATION_API_URL;

  const validation = validateApiUrl(targetUrl);
  if (!validation.valid) {
      return { success: false, message: validation.msg };
  }
  
  try {
    // 1. NaN 및 Infinity 값을 0으로 변환 (JSON 전송 오류 방지)
    const safePayload = JSON.parse(JSON.stringify(payload, (key, value) => {
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
            return 0; 
        }
        return value;
    }));

    // 2. 디버깅을 위해 콘솔에 페이로드 출력
    console.log("💾 Sending Safe Payload:", safePayload);

    const response = await apiCall('saveSimulationData', safePayload, targetUrl);
    if (response.status === 'success') {
      return { success: true, message: response.message || '저장되었습니다.' };
    } else {
      return { success: false, message: response.message || '저장 실패' };
    }
  } catch (e: any) {
    console.error("Simulation Save Error:", e);
    return { success: false, message: e.message };
  }
};