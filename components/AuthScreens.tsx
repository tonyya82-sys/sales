
import React, { useState } from 'react';
import { loginUser, registerUser, changePassword } from '../services/authService';
import { User } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState(''); 
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!email || !password || !name) {
          setError('모든 필드를 입력해주세요.');
          setLoading(false);
          return;
        }
        const result = await registerUser(email, password, name);
        if (result.success) {
          setSuccessMsg(result.message);
          setIsRegistering(false);
          setEmail('');
          setPassword('');
          setName('');
        } else {
          setError(result.message);
        }
      } else {
        const result = await loginUser(email, password);
        if (result.success && result.user) {
          onLoginSuccess(result.user);
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError('작업 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <i className="fas fa-chart-pie text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">MFULEX SALES ANALYTICS</h1>
          <p className="text-blue-100 text-sm font-medium mt-1">스마트한 판매 데이터 분석 솔루션</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            {isRegistering ? (
              <>
                <i className="fas fa-user-plus text-blue-600"></i> 회원가입 신청
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt text-blue-600"></i> 로그인
              </>
            )}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold mb-4 flex items-center gap-2 animate-in slide-in-from-top-2">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}
          
          {successMsg && (
            <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-sm font-bold mb-4 flex items-center gap-2 animate-in slide-in-from-top-2">
              <i className="fas fa-check-circle"></i> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="사용자 이름"
                  disabled={loading}
                />
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="name@company.com"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 mt-2 disabled:bg-blue-400 flex justify-center items-center gap-2"
            >
              {loading && <i className="fas fa-spinner fa-spin"></i>}
              {isRegistering ? '가입 신청하기' : '로그인'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              {isRegistering ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'}
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setSuccessMsg('');
                }}
                className="ml-2 text-blue-600 font-bold hover:underline"
              >
                {isRegistering ? '로그인하기' : '회원가입 신청'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ user, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!newPassword || !confirmPassword) {
      setMsg({ type: 'error', text: '비밀번호를 입력해주세요.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: '비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (newPassword.length < 4) {
      setMsg({ type: 'error', text: '비밀번호는 4자 이상이어야 합니다.' });
      return;
    }

    setLoading(true);
    const success = await changePassword(user.email, newPassword);
    setLoading(false);

    if (success) {
      setMsg({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setTimeout(() => onClose(), 1500);
    } else {
      setMsg({ type: 'error', text: '비밀번호 변경에 실패했습니다.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">비밀번호 변경</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {msg.text && (
            <div className={`px-4 py-2 rounded-lg text-xs font-bold ${
              msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {msg.text}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">새 비밀번호</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">새 비밀번호 확인</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button 
            onClick={handleChange}
            disabled={loading}
            className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-slate-900 transition mt-2 flex justify-center items-center gap-2"
          >
            {loading && <i className="fas fa-spinner fa-spin"></i>}
            변경사항 저장
          </button>
        </div>
      </div>
    </div>
  );
};
