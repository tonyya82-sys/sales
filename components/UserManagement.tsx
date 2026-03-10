
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getAllUsers, toggleUserApproval, deleteUser, changePassword } from '../services/authService';

const PasswordCell: React.FC<{ user: User; onUpdate: () => void }> = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [tempPassword, setTempPassword] = useState(user.password);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (tempPassword.trim().length < 4) {
      alert('비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    setSaving(true);
    const success = await changePassword(user.email, tempPassword);
    setSaving(false);
    
    if (success) {
      setIsEditing(false);
      onUpdate();
      alert('비밀번호가 변경되었습니다.');
    } else {
      alert('비밀번호 변경에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempPassword(user.password);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type={isVisible ? "text" : "password"}
          value={isEditing ? tempPassword : user.password}
          onChange={(e) => setTempPassword(e.target.value)}
          disabled={!isEditing}
          className={`w-32 px-3 py-1.5 text-xs rounded-lg border outline-none transition-all ${
            isEditing 
              ? "bg-white border-blue-400 ring-2 ring-blue-100 text-slate-800 font-bold" 
              : "bg-slate-50 border-transparent text-slate-500 font-medium"
          }`}
        />
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 text-xs"
          title={isVisible ? "숨기기" : "보기"}
        >
          <i className={`fas fa-eye${isVisible ? '-slash' : ''}`}></i>
        </button>
      </div>

      {isEditing ? (
        <>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition shadow-sm"
            title="저장"
          >
            {saving ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-check text-xs"></i>}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition shadow-sm"
            title="취소"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </>
      ) : (
        <button
          onClick={() => {
            setTempPassword(user.password);
            setIsEditing(true);
            setIsVisible(true); 
          }}
          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-blue-600 hover:border-blue-200 transition shadow-sm"
          title="비밀번호 변경"
        >
          <i className="fas fa-pen text-xs"></i>
        </button>
      )}
    </div>
  );
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleToggleApproval = async (email: string) => {
    if (confirm('사용자의 승인 상태를 변경하시겠습니까?')) {
      setLoading(true);
      const updated = await toggleUserApproval(email);
      setUsers(updated);
      setLoading(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (confirm('정말로 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.\n삭제 후에는 해당 이메일로 다시 가입할 수 있습니다.')) {
      setLoading(true);
      const updated = await deleteUser(email);
      setUsers(updated);
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl">
            <i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 text-white p-3 rounded-2xl">
               <i className="fas fa-users-cog text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">회원 관리 (Admin)</h2>
              <p className="text-slate-400 text-sm font-medium">가입 신청한 회원을 승인하거나 관리할 수 있습니다.</p>
            </div>
          </div>
          <button 
            onClick={loadUsers} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition text-sm font-bold"
          >
            <i className="fas fa-sync-alt"></i> 목록 새로고침
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                <th className="pb-2 px-4">이름 / 이메일</th>
                <th className="pb-2 px-4">가입일</th>
                <th className="pb-2 px-4">권한</th>
                <th className="pb-2 px-4">비밀번호 관리</th>
                <th className="pb-2 px-4">상태 (승인여부)</th>
                <th className="pb-2 px-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="bg-slate-50/50 hover:bg-slate-50 transition-all rounded-2xl">
                  <td className="py-4 px-4 font-bold text-slate-700 rounded-l-2xl">
                    <div className="flex flex-col">
                      <span className="text-base">{u.name}</span>
                      <span className="text-xs text-slate-400 font-medium">{u.email}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-500 font-medium">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-black uppercase ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <PasswordCell user={u} onUpdate={loadUsers} />
                  </td>
                  <td className="py-4 px-4">
                    {u.isApproved ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-full">
                        <i className="fas fa-check-circle"></i> 승인됨
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded-full animate-pulse">
                        <i className="fas fa-clock"></i> 대기중
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right rounded-r-2xl">
                    {u.role !== 'admin' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleApproval(u.email)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            u.isApproved 
                              ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100'
                          }`}
                        >
                          {u.isApproved ? '승인 해제' : '승인 처리'}
                        </button>
                        <button
                          onClick={() => handleDelete(u.email)}
                          className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-bold transition"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">
                    등록된 회원이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
