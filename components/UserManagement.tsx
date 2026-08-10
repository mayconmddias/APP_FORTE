import React, { useState, useEffect, useCallback } from 'react';
import GenericModal from './GenericModal';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { UserProfile, Documento, FuncionarioIntegracao, EmpresaMaster } from '../types';
import { supabase } from '../supabaseClient';
import { db } from '../services/offlineDb';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, parseISO } from 'date-fns';
import { 
  FileText, 
  User as UserIcon, 
  Calendar, 
  Check, 
  Trash2, 
  Plus, 
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';

const DATE_DOCS = [
  'ASO', 
  'CERTIFICADO PONTE ROLANTE', 
  'CERTIFICADO PTA', 
  'NR 06', 
  'NR 10', 
  'NR 18 - BASICO SEG TRABALHO A QUENTE', 
  'NR 33', 
  'NR 35'
];

const STATUS_DOCS = [
  'CERTIFICADO SOLDADOR', 
  'NR 12', 
  'NR 18 - MAÇARICO - OXICORTE MANUAL'
];

const DOCUMENT_OPTIONS = [...DATE_DOCS, ...STATUS_DOCS];

interface UserManagementProps {
  users: UserProfile[];
  onSave: (user: UserProfile, docs?: any[], integrations?: any[]) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  userRole: 'ADMIN' | 'TECNICO' | 'TECNICO_EQUIPAMENTO';
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
    password: '',
    funcao: ''
  });

  const [activeTab, setActiveTab] = useState<'PERFIL' | 'DOCS' | 'INTEGRACAO'>('PERFIL');
  const [isSaving, setIsSaving] = useState(false);
  const [empresasMaster, setEmpresasMaster] = useState<EmpresaMaster[]>([]);
  
  const [docsConfig, setDocsConfig] = useState<Record<string, { 
    selected: boolean, 
    date?: string, 
    status?: string, 
    otherType?: 'DATE' | 'STATUS',
    isCustom?: boolean
  }>>({});

  const [integracoesConfig, setIntegracoesConfig] = useState<Record<string, { 
    selected: boolean, 
    date?: string, 
    status?: string 
  }>>({});

  const [existingDocs, setExistingDocs] = useState<Documento[]>([]);
  const [existingInts, setExistingInts] = useState<FuncionarioIntegracao[]>([]);
  const [customDocs, setCustomDocs] = useState<string[]>([]);
  const [customIntegrations, setCustomIntegrations] = useState<string[]>([]);
  const [showAddCustomDoc, setShowAddCustomDoc] = useState(false);
  const [showAddCustomInt, setShowAddCustomInt] = useState(false);
  const [newCustomDocName, setNewCustomDocName] = useState('');
  const [newCustomIntName, setNewCustomIntName] = useState('');

  useEffect(() => {
    fetchEmpresasMaster();
  }, []);

  const fetchEmpresasMaster = async () => {
    try {
      const { data, error } = await supabase.from('empresas_master').select('*').order('nome');
      if (error) throw error;
      setEmpresasMaster(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [docsRes, intsRes] = await Promise.all([
        supabase.from('documentos').select('*').eq('funcionario_id', userId),
        supabase.from('funcionario_integracoes').select('*').eq('funcionario_id', userId)
      ]);

      if (docsRes.error) throw docsRes.error;
      if (intsRes.error) throw intsRes.error;

      const userDocs = docsRes.data || [];
      const userIntegrations = intsRes.data || [];

      setExistingDocs(userDocs);
      setExistingInts(userIntegrations);
  
      const newDocsConfig: Record<string, any> = {};
      const fetchedCustomDocs: string[] = [];
      
      userDocs.forEach((d: any) => {
        const tipo = d.tipo_documento;
        if (!DOCUMENT_OPTIONS.includes(tipo)) {
          fetchedCustomDocs.push(tipo);
        }
        
        newDocsConfig[tipo] = {
          selected: true,
          date: d.data_vencimento || '',
          status: d.status_permanente === 'REGULAR' ? 'APTO' : (d.status_permanente || 'APTO'),
          otherType: d.data_vencimento ? 'DATE' : 'STATUS'
        };
      });
      setCustomDocs(fetchedCustomDocs);
      setDocsConfig(newDocsConfig);
  
      // Usar integrações já buscadas acima (intsRes)

      const newIntsConfig: Record<string, any> = {};
      const fetchedCustomInts: string[] = [];
      
      (userIntegrations || []).forEach(i => {
        if (i.empresa_nome) {
          fetchedCustomInts.push(i.empresa_nome);
          newIntsConfig[i.empresa_nome] = {
            selected: true,
            date: i.data_vencimento || ''
          };
        }
      });

      setCustomIntegrations(fetchedCustomInts);
      setIntegracoesConfig(newIntsConfig);
      setExistingInts(userIntegrations || []);
  
    } catch (err) {
      console.error("Erro ao buscar dados do usuário no Supabase:", err);
    }
  }, []);

  const handleOpenAdd = useCallback(() => {
    if (!isAdmin) return;
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'TECNICO', password: '', funcao: '' });
    
    const initialConfig: any = {};
    DOCUMENT_OPTIONS.forEach(doc => {
      const isStatusDoc = STATUS_DOCS.includes(doc);
      initialConfig[doc] = { 
        selected: false, 
        status: isStatusDoc ? 'APTO' : undefined,
        otherType: isStatusDoc ? 'STATUS' : 'DATE'
      };
    });
    setDocsConfig(initialConfig);
    
    // Init integrations from Master
    const initialIntConfig: any = {};
    empresasMaster.forEach(emp => {
      initialIntConfig[emp.nome] = { selected: false, date: '' };
    });
    setIntegracoesConfig(initialIntConfig);
    
    setCustomDocs([]);
    setShowAddCustomDoc(false);
    setIsNewUser(true);
    setActiveTab('PERFIL');
    setShowModal(true);
  }, [isAdmin, empresasMaster]);

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
    setCustomDocs([]);
    setShowAddCustomDoc(false);
    setShowAddCustomInt(false);
    setIsNewUser(false);
    setActiveTab('PERFIL');
    fetchUserData(user.id);
    setShowModal(true);
  };

  const getNextUserId = (userList: UserProfile[]): string => {
    let maxId = 0;
    (userList || []).forEach(u => {
      if (!u || !u.id) return;
      const match = u.id.match(/FE-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    });
    return `FE-${String(maxId + 1).padStart(3, '0')}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const serverId = editingUser?.server_id || editingUser?.id;
      const userId = isNewUser 
        ? (form.id || getNextUserId(users)) 
        : (editingUser?.id);
         
      if (!userId) throw new Error("ID do usuário não definido");

      const userToSave = {
        ...form,
        id: userId,
        server_id: serverId || userId,
        name: form.name?.toUpperCase(),
        funcao: form.funcao?.toUpperCase()
      } as UserProfile;

      const supabaseUserId = serverId || userId;

      const docsToUpsert = Object.entries(docsConfig)
        .filter(([_, cfg]) => cfg.selected)
        .map(([tipo, cfg]) => ({
          id: existingDocs.find(d => d.tipo_documento === tipo)?.id || uuidv4(),
          funcionario_id: userId,
          tipo_documento: tipo,
          data_vencimento: cfg.date || null,
          status_permanente: cfg.status || 'REGULAR'
        }));

      const originalDocIds = existingDocs.map(d => d.id);
      const newDocIds = docsToUpsert.map(d => d.id);
      const docsToDelete = originalDocIds.filter(id => !newDocIds.includes(id));

      const intsToUpsert = Object.entries(integracoesConfig)
        .filter(([_, cfg]) => cfg.selected)
        .map(([empName, cfg]) => {
          const existing = existingInts.find(i => i.empresa_nome === empName);
          return {
            id: existing?.id || uuidv4(),
            funcionario_id: supabaseUserId,
            empresa_nome: empName,
            data_vencimento: cfg.date || null,
            status: 'APTO'
          };
        });

      const intsToDelete = existingInts
        .filter(ei => !integracoesConfig[ei.empresa_nome]?.selected)
        .map(ei => ei.id);

      await onSave(userToSave);

      if (docsToUpsert.length > 0) await supabase.from('documentos').upsert(docsToUpsert);
      if (docsToDelete.length > 0) await supabase.from('documentos').delete().in('id', docsToDelete);

      if (intsToUpsert.length > 0) {
        const { error: iErr } = await supabase.from('funcionario_integracoes').upsert(intsToUpsert);
        if (iErr) throw iErr;
      }
      if (intsToDelete.length > 0) {
        const { error: dErr } = await supabase.from('funcionario_integracoes').delete().in('id', intsToDelete);
        if (dErr) throw dErr;
      }

      setShowModal(false);
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      setAlertTitle('Erro no Cadastro');
      setAlertDesc(`Erro: ${err.message || 'Erro ao salvar.'}`);
      setShowAlert(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomInt = (name: string) => {
    if (!name.trim()) return;
    const upperName = name.trim().toUpperCase();
    setCustomIntegrations(prev => [...prev, upperName]);
    setIntegracoesConfig(prev => ({
      ...prev,
      [upperName]: { selected: true, date: '' }
    }));
    setNewCustomIntName('');
    setShowAddCustomInt(false);
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
        <div key="user-form" className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-background rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

            {/* Tabs */}
            <div className="px-6 flex bg-slate-50 border-b border-slate-100 flex-shrink-0">
              <button 
                onClick={() => setActiveTab('PERFIL')}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'PERFIL' ? 'border-[#004a88] text-[#004a88]' : 'border-transparent text-slate-400'}`}
              >
                Perfil
              </button>
              <button 
                onClick={() => setActiveTab('DOCS')}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'DOCS' ? 'border-[#004a88] text-[#004a88]' : 'border-transparent text-slate-400'}`}
              >
                Documentos
              </button>
              <button 
                onClick={() => setActiveTab('INTEGRACAO')}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'INTEGRACAO' ? 'border-[#004a88] text-[#004a88]' : 'border-transparent text-slate-400'}`}
              >
                Integração
              </button>
            </div>

            {/* Header Title */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
              <div className="w-16" />
              <h3 className="font-headline font-bold text-lg text-blue-950 tracking-widest uppercase text-center flex-1">
                {isNewUser ? 'NOVO USUÁRIO' : 'EDITAR USUÁRIO'}
              </h3>
              <div className="flex items-center gap-1 w-16 justify-end">
                {(activeTab === 'DOCS' || activeTab === 'INTEGRACAO') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'DOCS') {
                        setShowAddCustomDoc(true);
                      } else {
                        setShowAddCustomInt(true);
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center text-[#004a88] hover:bg-blue-50 rounded-full transition-all active:scale-95"
                    title={activeTab === 'DOCS' ? "Adicionar novo tipo de documento" : "Adicionar nova empresa"}
                  >
                    <Plus size={20} className="stroke-[3]" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }} aria-hidden="true">close</span>
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide">
              {activeTab === 'PERFIL' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-left-2">
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
                    <label className={labelClasses}>FUNÇÃO / CARGO</label>
                    <input
                      type="text"
                      className={inputClasses}
                      value={form.funcao || ''}
                      onChange={e => setForm({ ...form, funcao: e.target.value })}
                      placeholder="Ex: ELETRICISTA, SOLDADOR"
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
                        onChange={e => setForm({ ...form, role: e.target.value as 'ADMIN' | 'TECNICO' | 'TECNICO_EQUIPAMENTO' })}
                        disabled={!isAdmin}
                      >
                        <option value="TECNICO">TÉCNICO DE CAMPO</option>
                        <option value="TECNICO_EQUIPAMENTO">TÉCNICO DE EQUIPAMENTO</option>
                        <option value="ADMIN">ADMINISTRADOR GERAL</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none notranslate" style={{ fontSize: '20px' }}>expand_more</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'DOCS' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
                  <div className="space-y-2 animate-in fade-in slide-in-from-right-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-blue-500" />
                      Certificações e NR's
                    </p>

                    {showAddCustomDoc && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl animate-in zoom-in-95">
                        <label className="text-[10px] font-bold text-blue-900 uppercase block mb-2">NOME DO NOVO DOCUMENTO</label>
                        <div className="flex gap-2">
                          <input 
                            autoFocus
                            type="text"
                            placeholder="Ex: CURSO DE EMPILHADEIRA"
                            className="flex-1 bg-white border-none rounded-xl py-3 px-4 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-[#004a88]/20"
                            value={newCustomDocName}
                            onChange={e => setNewCustomDocName(e.target.value.toUpperCase())}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              if (!newCustomDocName.trim()) return;
                              const name = newCustomDocName.trim();
                              setCustomDocs(prev => [...prev, name]);
                              setDocsConfig(prev => ({
                                ...prev,
                                [name]: { selected: true, status: 'APTO', otherType: 'DATE' }
                              }));
                              setNewCustomDocName('');
                              setShowAddCustomDoc(false);
                            }}
                            className="bg-[#004a88] text-white px-4 rounded-xl text-[10px] font-bold"
                          >
                            ADD
                          </button>
                          <button 
                            type="button"
                            onClick={() => setShowAddCustomDoc(false)}
                            className="bg-slate-200 text-slate-600 px-3 rounded-xl"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {[...DOCUMENT_OPTIONS, ...customDocs]
                      .filter((v, i, a) => a.indexOf(v) === i) // Unique
                      .sort((a, b) => a.localeCompare(b)) // Alphabetical
                      .map(doc => {
                      const config = docsConfig[doc] || { selected: false, otherType: 'DATE' };
                      return (
                        <div key={doc} className={`px-4 py-3 rounded-xl border transition-all ${config.selected ? 'bg-blue-50/30 border-blue-100 shadow-sm' : 'bg-white border-slate-100'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <label className="flex items-center gap-3 cursor-pointer group min-w-0 flex-1">
                              <div 
                                onClick={() => setDocsConfig({ ...docsConfig, [doc]: { ...config, selected: !config.selected }})}
                                className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${config.selected ? 'bg-[#004a88] border-[#004a88]' : 'border-slate-200 group-hover:border-slate-300'}`}
                              >
                                {config.selected && <Check size={12} className="text-white stroke-[4]" />}
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-tight truncate transition-colors ${config.selected ? 'text-blue-950' : 'text-slate-400'}`}>
                                {doc}
                              </span>
                            </label>

                            {config.selected && (
                              <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                {config.otherType === 'DATE' ? (
                                  <input 
                                    type="date" 
                                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-100 transition-all w-32"
                                    value={config.date || ''}
                                    onChange={e => setDocsConfig({ ...docsConfig, [doc]: { ...config, date: e.target.value }})}
                                  />
                                ) : (
                                  <select 
                                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer w-32"
                                    value={config.status || 'APTO'}
                                    onChange={e => setDocsConfig({ ...docsConfig, [doc]: { ...config, status: e.target.value }})}
                                  >
                                    <option value="APTO">APTO</option>
                                    <option value="NA">NA</option>
                                  </select>
                                )}
                                
                                <button 
                                  type="button"
                                  onClick={() => setDocsConfig({ ...docsConfig, [doc]: { ...config, otherType: config.otherType === 'DATE' ? 'STATUS' : 'DATE' }})}
                                  className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                  title={config.otherType === 'DATE' ? 'Usar Status' : 'Usar Data'}
                                >
                                  <span className="material-symbols-outlined text-[16px] select-none notranslate">swap_horiz</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'INTEGRACAO' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" />
                      Integração em Clientes
                    </p>

                    {showAddCustomInt && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl animate-in zoom-in-95 mb-4">
                        <label className="text-[10px] font-bold text-blue-900 uppercase block mb-2">NOME DA EMPRESA</label>
                        <div className="flex gap-2">
                          <input 
                            autoFocus
                            type="text"
                            placeholder="Ex: VOLVO, SCANIA"
                            className="flex-1 bg-white border-none rounded-xl py-3 px-4 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-[#004a88]/20"
                            value={newCustomIntName}
                            onChange={e => setNewCustomIntName(e.target.value.toUpperCase())}
                          />
                          <button 
                            type="button"
                            onClick={() => handleAddCustomInt(newCustomIntName)}
                            className="bg-[#004a88] text-white px-4 rounded-xl text-[10px] font-bold"
                          >
                            ADD
                          </button>
                          <button 
                            type="button"
                            onClick={() => { setShowAddCustomInt(false); setNewCustomIntName(''); }}
                            className="bg-slate-200 text-slate-600 px-3 rounded-xl"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {customIntegrations.map(empName => {
                      const config = integracoesConfig[empName] || { selected: false };
                      return (
                        <div key={empName} className={`px-4 py-3 rounded-xl border transition-all ${config.selected ? 'bg-blue-50/30 border-blue-100 shadow-sm' : 'bg-white border-slate-100'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <label className="flex items-center gap-3 cursor-pointer group min-w-0 flex-1">
                              <div 
                                onClick={() => setIntegracoesConfig({ ...integracoesConfig, [empName]: { ...config, selected: !config.selected }})}
                                className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${config.selected ? 'bg-[#004a88] border-[#004a88]' : 'border-slate-200 group-hover:border-slate-300'}`}
                              >
                                {config.selected && <Check size={12} className="text-white stroke-[4]" />}
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-tight truncate transition-colors ${config.selected ? 'text-blue-950' : 'text-slate-400'}`}>
                                {empName}
                              </span>
                            </label>

                            {config.selected && (
                              <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                <input 
                                  type="date" 
                                  className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-100 transition-all w-32"
                                  value={config.date || ''}
                                  onChange={e => setIntegracoesConfig({ ...integracoesConfig, [empName]: { ...config, date: e.target.value }})}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {customIntegrations.length === 0 && !showAddCustomInt && (
                      <div className="py-10 text-center text-slate-400 text-[10px] font-bold uppercase border-2 border-dashed border-slate-100 rounded-3xl">
                        Nenhuma integração cadastrada. Clique no + para adicionar.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                        : user.role === 'TECNICO_EQUIPAMENTO'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-50 text-slate-500'
                    }`}>
                      {user.role === 'ADMIN' ? 'ADMIN' : user.role === 'TECNICO_EQUIPAMENTO' ? 'TÉCNICO EQUIPAMENTO' : 'TÉCNICO CAMPO'}
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
