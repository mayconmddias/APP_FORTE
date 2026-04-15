import React, { useState, useEffect, useCallback } from 'react';
import GenericModal from './GenericModal';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';

interface UserManagementProps {
  users: UserProfile[];
  onSave: (user: UserProfile) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  userRole: 'ADMIN' | 'TECNICO';
  onTitleChange?: (title: string | null) => void;
  onHeaderActionChange?: (action: React.ReactNode) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onSave,
  onDelete,
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

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDesc, setAlertDesc] = useState('');

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
        <button
          onClick={handleOpenAdd}
          className="text-[#004a88] hover:bg-slate-100 p-2 rounded-full transition-all active:scale-95"
        >
          <span className="material-symbols-outlined select-none notranslate font-bold" style={{ fontSize: '24px' }}>add</span>
        </button>
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
    try {
      const userToSave = {
        ...form,
        id: isNewUser ? `FE-${String(users.length + 1).padStart(3, '0')}` : editingUser?.id
      } as UserProfile;
      await onSave(userToSave);
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      setAlertTitle('Erro no Cadastro');
      setAlertDesc(err.message || 'Não foi possível salvar os dados do usuário.');
      setShowAlert(true);
    }
  };

  const handleDeleteUser = async () => {
    if (!editingUser || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(editingUser.id);
      setShowConfirmDelete(false);
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      setAlertTitle('Erro na Exclusão');
      setAlertDesc(err.message || 'Não foi possível excluir o usuário.');
      setShowAlert(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = (users || [])
    .filter(u => {
      const name = u.name || '';
      const email = u.email || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const inputClasses = "w-full bg-[#eef2f7] border-none rounded-xl py-4 px-5 text-on-surface placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-sm outline-none";
  const labelClasses = "text-[11px] font-bold text-[#004a88] uppercase tracking-widest mb-2 block";

  const renderOverlays = () => {
    const overlays = [];

    if (showModal) {
      overlays.push(createPortal(
        <div key="user-form" className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95dvh] animate-in slide-in-from-bottom-4 duration-300">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
              <div className="w-8" />
              <h3 className="font-headline font-bold text-lg text-blue-950 tracking-widest uppercase text-center flex-1">
                {isNewUser ? 'NOVO PERFIL' : 'EDITAR PERFIL'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }} aria-hidden="true">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <div>
                <label className={labelClasses}>NOME COMPLETO</label>
                <input
                  required
                  type="text"
                  className={inputClasses}
                  value={form.name || ''}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className={labelClasses}>E-MAIL CORPORATIVO</label>
                <input
                  required
                  type="email"
                  className={inputClasses}
                  value={form.email || ''}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="nome@empresa.com.br"
                />
              </div>
              <div>
                <label className={labelClasses}>SENHA</label>
                <input
                  type="password"
                  className={inputClasses}
                  value={form.password || ''}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className={labelClasses}>NÍVEL DE ACESSO</label>
                <div className="relative">
                  <select
                    className={`${inputClasses} appearance-none pr-10 cursor-pointer`}
                    value={form.role || 'TECNICO'}
                    onChange={e => setForm({ ...form, role: e.target.value as 'ADMIN' | 'TECNICO' })}
                    disabled={!isAdmin}
                  >
                    <option value="TECNICO">TÉCNICO DE CAMPO</option>
                    <option value="ADMIN">ADMINISTRADOR GERAL</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none notranslate" style={{ fontSize: '20px' }}>expand_more</span>
                </div>
              </div>
              <div className="h-2" />
            </form>

            {/* Rodapé */}
            <div className="px-6 pb-8 pt-4 border-t border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                {!isNewUser && isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="font-headline font-bold text-sm text-red-500 uppercase tracking-widest px-4 py-3 rounded-full hover:bg-red-50 active:scale-95 transition-all"
                  >
                    EXCLUIR
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="font-headline font-bold text-sm text-[#004a88] uppercase tracking-widest px-4 py-3 rounded-full hover:bg-blue-50 active:scale-95 transition-all"
                  >
                    CANCELAR
                  </button>
                )}
                <button
                  type="submit"
                  form="user-form"
                  onClick={handleSave as any}
                  className="bg-[#004a88] text-white font-headline font-bold text-sm uppercase tracking-widest px-10 py-4 rounded-full shadow-lg shadow-blue-900/20 hover:bg-primary active:scale-95 transition-all"
                >
                  SALVAR
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ));
    }

    if (showConfirmDelete) {
        overlays.push(
          <GenericModal 
            key="user-del"
            isOpen={showConfirmDelete}
            onClose={() => setShowConfirmDelete(false)}
            title="Excluir Perfil?"
            description={`Deseja remover o acesso de "${editingUser?.name}"?`}
            type="DANGER"
            onConfirm={handleDeleteUser}
          />
        );
    }

    return overlays;
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-500 px-1">

      {/* Barra de busca */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none notranslate pointer-events-none" style={{ fontSize: '20px' }}>search</span>
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          className="w-full h-12 pl-12 pr-5 bg-[#eef2f7] border-none rounded-full font-body text-sm text-on-surface placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-3 sm:px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">USUÁRIO</th>
                <th className="px-3 sm:px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-center">AÇÕES</th>
                <th className="px-3 sm:px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">PERMISSÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 sm:px-5 py-4">
                    <div className="font-headline font-bold text-sm text-blue-950 uppercase">{user.name}</div>
                    <div className="font-body text-[10px] text-slate-400 mt-0.5">{user.email}</div>
                  </td>
                  <td className="px-3 sm:px-5 py-4 text-center">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-2 text-slate-300 hover:text-[#004a88] hover:bg-blue-50 rounded-full transition-all"
                    >
                      <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>edit</span>
                    </button>
                  </td>
                  <td className="px-3 sm:px-5 py-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                      user.role === 'ADMIN'
                        ? 'bg-blue-50 text-[#004a88]'
                        : 'bg-slate-50 text-slate-500'
                    }`}>
                      {user.role === 'ADMIN' ? 'ADMIN' : 'TÉCNICO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {renderOverlays()}

      <GenericModal 
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertTitle}
        description={alertDesc}
        type="WARNING"
      />
    </div>
  );
};

export default UserManagement;
