
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  UserPlus,
  Pencil,
  Search,
  X,
  Save,
  ShieldCheck,
  Shield,
  Trash2,
  AlertTriangle,
  Loader2,
  Settings
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';

interface UserManagementProps {
  users: UserProfile[];
  setUsers: (users: UserProfile[]) => void;
  userRole: 'ADMIN' | 'TECNICO';
  onTitleChange?: (title: string | null) => void;
  onHeaderActionChange?: (action: React.ReactNode) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  setUsers,
  userRole,
  onTitleChange,
  onHeaderActionChange
}) => {
  const isAdmin = userRole === 'ADMIN';
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const [form, setForm] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    role: 'TECNICO',
    password: ''
  });

  const handleOpenAdd = useCallback(() => {
    if (!isAdmin) return;
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'TECNICO', password: '' });
    setIsNewUser(true);
    setShowModal(true);
  }, [isAdmin]);

  useEffect(() => {
    onTitleChange?.('USUÁRIOS');
    if (isAdmin) {
      onHeaderActionChange?.(
        <button onClick={handleOpenAdd} className="bg-[#0066CC] text-white h-10 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-xl shadow-slate-900/10">NOVO</button>
      );
    } else {
      onHeaderActionChange?.(null);
    }
    return () => onHeaderActionChange?.(null);
  }, [isAdmin, onTitleChange, onHeaderActionChange, handleOpenAdd]);

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setForm(user);
    setIsNewUser(false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewUser) {
      const lastNum = users.reduce((max, u) => {
        const numPart = u.id.includes('-') ? parseInt(u.id.split('-')[1]) : 0;
        return isNaN(numPart) ? max : Math.max(max, numPart);
      }, 0);
      const nextId = `FE-${String(lastNum + 1).padStart(3, '0')}`;
      const newUser = { ...form, id: nextId } as UserProfile;
      setUsers([...users, newUser]);
    } else {
      setUsers(users.map(u => u.id === editingUser?.id ? { ...form, id: u.id } as UserProfile : u));
    }
    setShowModal(false);
  };

  const handleDeleteUser = async () => {
    if (!editingUser || isDeleting) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('user_profiles').delete().eq('id', editingUser.id);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== editingUser.id));
      setShowConfirmDelete(false);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  const inputClasses = "w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all font-bold text-slate-800 text-sm";
  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block";

  const renderOverlays = () => {
    const overlays = [];

    if (showModal) {
      overlays.push(createPortal(
        <div key="user-form" className="fixed inset-0 top-0 left-0 w-full h-full bg-white z-[9999] flex flex-col animate-in slide-in-from-bottom-5 duration-500 overflow-hidden">
          <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{isNewUser ? 'NOVO PERFIL' : 'EDITAR PERFIL'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de Credenciais</p>
              </div>
            </div>
            <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={32} /></button>
          </div>
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8 pb-32">
              <div><label className={labelClasses}>Nome Completo</label><input required type="text" className={inputClasses} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className={labelClasses}>E-mail Corporativo</label><input required type="email" className={inputClasses} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className={labelClasses}>Senha</label><input type="password" className={inputClasses} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></div>
              <div><label className={labelClasses}>Nível de Acesso</label>
                <select className={inputClasses} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'ADMIN' | 'TECNICO' })} disabled={!isAdmin}>
                  <option value="TECNICO">Técnico de Campo</option>
                  <option value="ADMIN">Administrador Geral</option>
                </select>
              </div>
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 z-10">
              <div className="max-w-3xl mx-auto flex gap-4">
                {!isNewUser && isAdmin && (
                  <button type="button" onClick={() => setShowConfirmDelete(true)} className="flex-1 h-16 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2"><Trash2 size={24} /> Excluir</button>
                )}
                <button type="submit" className="flex-1 h-16 bg-[#0066CC] text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-2"><Save size={24} className="text-white" /> Salvar</button>
              </div>
            </div>
          </form>
        </div>, document.body));
    }

    if (showConfirmDelete) {
      overlays.push(createPortal(
        <div key="user-del" className="fixed inset-0 bg-white z-[10000] flex items-center justify-center p-6" onClick={() => setShowConfirmDelete(false)}>
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center border-2 border-slate-900 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertTriangle size={48} /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Excluir Perfil?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-4 mb-10 leading-relaxed px-4">Deseja remover o acesso de <span className="font-black text-slate-800">"{editingUser?.name}"</span>?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirmDelete(false)} className="flex-1 h-16 bg-slate-50 text-slate-500 rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all">Sair</button>
              <button onClick={handleDeleteUser} disabled={isDeleting} className="flex-1 h-16 bg-red-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-lg shadow-red-200 flex items-center justify-center gap-2 active:scale-95 transition-all">
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>, document.body));
    }

    return overlays;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500 px-1">
      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Buscar por nome ou e-mail..." className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#0066CC]/5 focus:border-[#0066CC] font-bold text-slate-800 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr><th className="px-5 py-5">Usuário</th><th className="px-5 py-5 w-24 text-center">Ações</th><th className="px-5 py-5 text-right">Permissão</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-5"><div className="font-black text-slate-800 text-sm">{user.name}</div><div className="text-[10px] text-slate-400 font-medium">{user.email}</div></td>
                  <td className="px-5 py-5 text-center"><button onClick={() => handleOpenEdit(user)} className="p-2 text-slate-300 hover:text-[#0066CC] transition-all"><Pencil size={18} /></button></td>
                  <td className="px-5 py-5 text-right">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${user.role === 'ADMIN' ? 'bg-blue-50 text-[#0066CC] border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>{user.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {renderOverlays()}
    </div>
  );
};

export default UserManagement;
