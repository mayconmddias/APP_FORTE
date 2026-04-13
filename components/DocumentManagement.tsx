
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Funcionario, Documento, EmpresaMaster, FuncionarioIntegracao } from '../types';
import { 
  Plus, 
  Trash2, 
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  Edit2,
  User,
  X,
  FileText,
  Calendar,
  AlertTriangle,
  Clock,
  ListFilter
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { alertService } from '../services/alertService';

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

interface DocumentManagementProps {
  onTitleChange: (title: string | null) => void;
  onHeaderActionChange?: (action: React.ReactNode) => void;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ onTitleChange, onHeaderActionChange }) => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedFuncId, setSelectedFuncId] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [integracoes, setIntegracoes] = useState<FuncionarioIntegracao[]>([]);
  const [empresasMaster, setEmpresasMaster] = useState<EmpresaMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalAlerts, setGlobalAlerts] = useState<(Documento | FuncionarioIntegracao)[]>([]);
  
  const [activeTab, setActiveTab] = useState<'DOC' | 'INTEGRACAO'>('DOC');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [funcName, setFuncName] = useState('');
  const [funcRole, setFuncRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Config for docs in the modal
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

  const [isAddingEmpresa, setIsAddingEmpresa] = useState(false);
  const [newEmpresaNome, setNewEmpresaNome] = useState('');
  const [newEmpresaData, setNewEmpresaData] = useState('');

  const selectedFunc = useMemo(() => 
    funcionarios.find(f => f.id === selectedFuncId), 
    [funcionarios, selectedFuncId]
  );

  useEffect(() => {
    onTitleChange('DOCUMENTOS');
    fetchFuncionarios();
    return () => onTitleChange(null);
  }, [onTitleChange]);

  const fetchFuncionarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('funcionarios').select('*').order('nome');
      if (error) throw error;
      setFuncionarios(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentos = async (funcId: string) => {
    try {
      const { data, error } = await supabase.from('documentos').select('*').eq('funcionario_id', funcId);
      if (error) throw error;
      setDocumentos(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIntegracoes = async (funcId: string) => {
    try {
      const { data, error } = await supabase
        .from('funcionario_integracoes')
        .select('*, empresa:empresas_master(*)')
        .eq('funcionario_id', funcId);
      if (error) throw error;
      setIntegracoes(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmpresasMaster = async () => {
    try {
      const { data, error } = await supabase.from('empresas_master').select('*').order('nome');
      if (error) throw error;
      setEmpresasMaster(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmpresasMaster();
  }, []);

  const fetchAllAlerts = async () => {
    setLoading(true);
    try {
      const today = new Date();

      // 1. Fetch Docs
      const { data: docsData, error: docsError } = await supabase
        .from('documentos')
        .select('*, funcionario:funcionarios(nome)')
        .not('data_vencimento', 'is', null);
      
      if (docsError) throw docsError;

      // 2. Fetch Integrations
      const { data: intsData, error: intsError } = await supabase
        .from('funcionario_integracoes')
        .select('*, empresa:empresas_master(*), funcionario:funcionarios(nome)')
        .not('data_vencimento', 'is', null);

      if (intsError) throw intsError;

      // Filter localmente para o que for alert (<= 40 dias) ou vencido (<= 0)
      const filteredDocs = (docsData || []).filter(doc => {
        const dias = differenceInDays(parseISO(doc.data_vencimento!), today);
        return dias <= 40;
      });

      const filteredInts = (intsData || []).filter(integ => {
        const dias = differenceInDays(parseISO(integ.data_vencimento!), today);
        return dias <= 40;
      });

      // Sort: Agrupar por funcionário, depois Docs antes de Integrações
      const sortedAlerts = [...filteredDocs, ...filteredInts].sort((a,b) => {
        const nomeA = (a as any).funcionario?.nome || '';
        const nomeB = (b as any).funcionario?.nome || '';
        if (nomeA !== nomeB) return nomeA.localeCompare(nomeB);
        
        // Se for o mesmo funcionário, colocar Docs antes de Integrações
        const isIntegA = 'empresa_id' in a;
        const isIntegB = 'empresa_id' in b;
        if (!isIntegA && isIntegB) return -1;
        if (isIntegA && !isIntegB) return 1;
        
        return 0;
      });

      setGlobalAlerts(sortedAlerts);
    } catch (err) {
      console.error('Erro ao buscar alertas globais:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFuncId === 'ALERTS') {
      fetchAllAlerts();
    }
  }, [selectedFuncId]);

  const handleOpenAddModal = useCallback(() => {
    setModalMode('ADD');
    setFuncName('');
    setFuncRole('');
    const initialConfig: any = {};
    DOCUMENT_OPTIONS.forEach(doc => {
      const isStatusDoc = STATUS_DOCS.includes(doc);
      initialConfig[doc] = { 
        selected: true, 
        status: isStatusDoc ? 'APTO' : undefined,
        otherType: isStatusDoc ? 'STATUS' : 'DATE'
      };
    });
    setDocsConfig(initialConfig);

    const initialIntConfig: any = {};
    empresasMaster.forEach(emp => {
      initialIntConfig[emp.id] = { selected: false, date: undefined, status: 'REGULAR' };
    });
    setIntegracoesConfig(initialIntConfig);

    setIsModalOpen(true);
  }, [empresasMaster]);

  const handleOpenEditModal = (funcionario: Funcionario) => {
    setModalMode('EDIT');
    setFuncName(funcionario.nome);
    setFuncRole(funcionario.funcao || '');
    
    const initialConfig: any = {};
    DOCUMENT_OPTIONS.forEach(doc => {
      const isStatusDoc = STATUS_DOCS.includes(doc);
      initialConfig[doc] = { 
        selected: false, 
        status: isStatusDoc ? 'APTO' : undefined,
        otherType: isStatusDoc ? 'STATUS' : 'DATE'
      };
    });
    
    documentos.forEach(doc => {
      if (doc.tipo_documento === 'OUTROS') return; // Ignore legacy 'OUTROS'
      const isStatusDoc = STATUS_DOCS.includes(doc.tipo_documento);
      const isCustomNode = !DOCUMENT_OPTIONS.includes(doc.tipo_documento);
      
      initialConfig[doc.tipo_documento] = {
        selected: true,
        date: doc.data_vencimento || undefined,
        status: doc.status_permanente || 'APTO',
        otherType: isStatusDoc || (!doc.data_vencimento && doc.status_permanente) ? 'STATUS' : 'DATE',
        isCustom: isCustomNode
      };
    });
    
    setDocsConfig(initialConfig);
    
    const initialIntConfig: any = {};
    empresasMaster.forEach(emp => {
      const existing = integracoes.find(i => i.empresa_id === emp.id);
      initialIntConfig[emp.id] = {
        selected: !!existing,
        date: existing?.data_vencimento || undefined,
        status: existing?.status || 'REGULAR'
      };
    });
    setIntegracoesConfig(initialIntConfig);

    setIsModalOpen(true);
  };

  useEffect(() => {
    onHeaderActionChange?.(
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedFuncId('ALERTS')}
          className={`md:hidden w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm ${selectedFuncId === 'ALERTS' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-white border border-slate-200 text-slate-400'}`}
        >
          <AlertTriangle size={20} />
        </button>
        <button
          onClick={handleOpenAddModal}
          className="bg-white border border-slate-200 text-black w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm"
        >
          <Plus size={24} />
        </button>
      </div>
    );
    return () => onHeaderActionChange?.(null);
  }, [onHeaderActionChange, handleOpenAddModal, selectedFuncId]);

  useEffect(() => {
    if (selectedFuncId) {
        fetchDocumentos(selectedFuncId);
        fetchIntegracoes(selectedFuncId);
    } else {
        setDocumentos([]);
        setIntegracoes([]);
    }
  }, [selectedFuncId]);

  const handleSave = async () => {
    if (!funcName.trim() || isSaving) return;
    setIsSaving(true);
    let funcId = selectedFuncId;
    
    try {
      // 1. SALVAR FUNCIONÁRIO
      if (modalMode === 'ADD') {
        const { data: funcData, error: funcError } = await supabase
          .from('funcionarios')
          .insert([{ nome: funcName.toUpperCase(), funcao: funcRole.toUpperCase() }])
          .select();
        if (funcError) throw funcError;
        funcId = funcData[0].id;
      } else {
        const { error: funcError } = await supabase
          .from('funcionarios')
          .update({ nome: funcName.toUpperCase(), funcao: funcRole.toUpperCase() })
          .eq('id', funcId);
        if (funcError) throw funcError;
      }

      // 2. SALVAR DOCUMENTOS (Se estiver na aba DOC ou se desejar salvar ambos sempre)
      const existingDocs = documentos;
      const selectedDocNames = Object.keys(docsConfig).filter(k => docsConfig[k].selected);
      
      if (modalMode === 'EDIT') {
        // Excluir documentos desmarcados
        const docsToDelete = existingDocs.filter(ed => !selectedDocNames.includes(ed.tipo_documento));
        if (docsToDelete.length > 0) {
          await supabase.from('documentos').delete().in('id', docsToDelete.map(d => d.id));
        }
      }

      const docsToUpsert: any[] = [];
      selectedDocNames.forEach(tipo => {
        const config = docsConfig[tipo];
        const existing = existingDocs.find(ed => ed.tipo_documento === tipo);
        let data_vencimento = config.date || null;
        let status_permanente = config.status || null;

        if (config.otherType === 'STATUS') {
          data_vencimento = null;
          status_permanente = config.status || 'APTO';
        } else {
          data_vencimento = config.date || null;
          // Calcular status para salvar no banco (para automações externas)
          if (data_vencimento) {
            const dataVenc = parseISO(data_vencimento);
            const dias = differenceInDays(dataVenc, new Date());
            if (dias <= 0) status_permanente = 'VENCIDO';
            else if (dias <= 40) status_permanente = 'ALERTA';
            else status_permanente = 'REGULAR';
          } else {
            status_permanente = 'REGULAR';
          }
        }

        const docObj: any = { 
          id: (existing && existing.id) ? existing.id : crypto.randomUUID(),
          funcionario_id: funcId, 
          tipo_documento: tipo, 
          data_vencimento, 
          status_permanente 
        };
        docsToUpsert.push(docObj);
      });

      if (docsToUpsert.length > 0) {
        const { error: updErr } = await supabase.from('documentos').upsert(docsToUpsert);
        if (updErr) throw updErr;
      }

      // 3. SALVAR INTEGRAÇÕES
      const existingInts = integracoes;
      const selectedEmpIds = Object.keys(integracoesConfig).filter(k => integracoesConfig[k].selected);

      if (modalMode === 'EDIT') {
        // Excluir integrações desmarcadas
        const intsToDelete = existingInts.filter(ei => !selectedEmpIds.includes(ei.empresa_id));
        if (intsToDelete.length > 0) {
          await supabase.from('funcionario_integracoes').delete().in('id', intsToDelete.map(i => i.id));
        }
      }

      const intsToUpsert: any[] = [];
      selectedEmpIds.forEach(empId => {
        const config = integracoesConfig[empId];
        const existing = existingInts.find(ei => ei.empresa_id === empId);
        
        let savedStatus = 'REGULAR';
        if (config.date) {
            const dataVenc = parseISO(config.date);
            const dias = differenceInDays(dataVenc, new Date());
            if (dias <= 0) savedStatus = 'VENCIDO';
            else if (dias <= 40) savedStatus = 'ALERTA';
            else savedStatus = 'REGULAR';
        }
        
        const intObj: any = {
          id: (existing && existing.id) ? existing.id : crypto.randomUUID(),
          funcionario_id: funcId,
          empresa_id: empId,
          data_vencimento: config.date || null,
          status: savedStatus
        };
        
        intsToUpsert.push(intObj);
      });

      if (intsToUpsert.length > 0) {
        const { error: intErr } = await supabase.from('funcionario_integracoes').upsert(intsToUpsert);
        if (intErr) throw intErr;
      }

      setIsModalOpen(false);
      await fetchFuncionarios();
      if (funcId) {
        setSelectedFuncId(funcId);
        await fetchDocumentos(funcId);
        await fetchIntegracoes(funcId);
      }
      
      // Notificar sistema de alertas globais
      alertService.notifyChange();

    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMasterEmpresa = () => {
    setIsAddingEmpresa(true);
    setNewEmpresaNome('');
    setNewEmpresaData('');
  };

  const handleConfirmAddMasterEmpresa = async () => {
    if (!newEmpresaNome.trim()) return;
    const upperNome = newEmpresaNome.trim().toUpperCase();
    
    try {
      const { data, error } = await supabase
        .from('empresas_master')
        .insert([{ 
           id: crypto.randomUUID(), 
           nome: upperNome 
        }])
        .select();
      if (error) throw error;
      
      const newEmp = data[0];
      setEmpresasMaster(prev => [...prev, newEmp]);
      setIntegracoesConfig(prev => ({
        ...prev,
        [newEmp.id]: { selected: true, date: newEmpresaData || undefined, status: 'REGULAR' }
      }));
      setIsAddingEmpresa(false);
    } catch (err: any) {
      alert(`Erro ao cadastrar empresa: ${err.message}`);
    }
  };

  const handleDeleteMasterEmpresa = async (empId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir esta empresa permanentemente? Isso removerá os vínculos de todos os funcionários.')) return;
    
    try {
      const { error } = await supabase.from('empresas_master').delete().eq('id', empId);
      if (error) throw error;
      
      setEmpresasMaster(prev => prev.filter(emp => emp.id !== empId));
      setIntegracoesConfig(prev => {
        const newConfig = { ...prev };
        delete newConfig[empId];
        return newConfig;
      });
      // Refresh integrations if needed
      if (selectedFuncId) fetchIntegracoes(selectedFuncId);
    } catch (err: any) {
      alert(`Erro ao excluir empresa: ${err.message}`);
    }
  };

  const handleAddCustomDoc = () => {
    const name = prompt('Nome do novo documento:');
    if (!name || name.trim() === '') return;
    const upperName = name.trim().toUpperCase();
    if (docsConfig[upperName]) return;
    setDocsConfig(prev => ({
      ...prev,
      [upperName]: { selected: true, otherType: 'DATE', isCustom: true, status: 'APTO' }
    }));
  };

  const getStatusInfo = (docOrDate: Documento | string | undefined | null, statusManual?: string | null) => {
    let vencimento: string | null | undefined = null;
    let isStatusDoc = false;
    let statusPermanente: string | null | undefined = statusManual;

    if (typeof docOrDate === 'object' && docOrDate !== null) {
      vencimento = (docOrDate as Documento).data_vencimento;
      isStatusDoc = STATUS_DOCS.includes((docOrDate as Documento).tipo_documento);
      statusPermanente = statusPermanente || (docOrDate as Documento).status_permanente;
    } else {
      vencimento = docOrDate as string;
    }

    const isTextDoc = !isStatusDoc && !vencimento && statusPermanente;
    if (isStatusDoc || isTextDoc) return { label: statusPermanente || 'REGULAR', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Check size={14}/> };
    if (!vencimento) return { label: 'REGULAR', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Check size={14}/> };
    
    const hoje = new Date();
    const dataVenc = parseISO(vencimento);
    const diasParaVencer = differenceInDays(dataVenc, hoje);
    if (diasParaVencer <= 0) return { label: 'VENCIDO', color: 'text-red-500', bg: 'bg-red-50', icon: <AlertTriangle size={14}/> };
    if (diasParaVencer <= 40) return { label: 'ALERTA', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: <AlertCircle size={14}/> };
    return { label: statusPermanente || 'REGULAR', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Check size={14}/> };
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-slate-50 gap-4 overflow-hidden">
      {/* Sidebar - Oculta no Mobile, visível no Desktop */}
      <div className="hidden md:flex w-full md:w-72 bg-white border border-slate-200 flex-col rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 text-left">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visão Geral</h3>
        </div>
        <div className="p-2 pt-4">
          <button 
            onClick={() => setSelectedFuncId('ALERTS')} 
            className={`w-full text-left p-4 rounded-2xl transition-all group flex items-center justify-between ${selectedFuncId === 'ALERTS' ? 'bg-red-50 text-red-600' : 'hover:bg-slate-50 text-slate-600'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${selectedFuncId === 'ALERTS' ? 'bg-red-100' : 'bg-slate-100'}`}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-tight">Visão de Alertas</div>
                <div className="text-[9px] font-bold opacity-60 uppercase mt-0.5">Críticos e Próximos</div>
              </div>
            </div>
          </button>
        </div>

        <div className="p-6 border-b border-slate-50 text-left pt-2"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Funcionários</h3></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {loading && selectedFuncId !== 'ALERTS' ? <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div> : 
           funcionarios.length === 0 ? <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase">Nenhum funcionário cadastrado</div> : (
            funcionarios.map(f => (
              <button key={f.id} onClick={() => setSelectedFuncId(f.id)} className={`w-full text-left p-4 rounded-2xl transition-all group flex items-center justify-between ${selectedFuncId === f.id ? 'bg-blue-50 text-[#0066CC]' : 'hover:bg-slate-50 text-slate-600'}`}>
                <div><div className="text-[11px] font-black uppercase tracking-tight">{f.nome.split(' ').slice(0, 2).join(' ')}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{f.funcao || 'Sem função'}</div></div>
                <ChevronRight size={16} className={`transition-transform ${selectedFuncId === f.id ? 'translate-x-1' : 'opacity-0'}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
        {/* Mobile Selector - Visível apenas no Mobile */}
        <div className="md:hidden p-4 border-b border-slate-50 bg-white">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Selecionar Funcionário</label>
          <div className="relative">
            <select 
              value={selectedFuncId || ''} 
              onChange={(e) => setSelectedFuncId(e.target.value || null)}
              className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black uppercase appearance-none outline-none focus:border-blue-200 transition-colors"
            >
              <optgroup label="Visão Geral">
                <option value="ALERTS">VISÃO DE ALERTAS</option>
              </optgroup>
              <optgroup label="Funcionários">
                <option value="">Selecione na lista...</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nome.toUpperCase()}</option>
                ))}
              </optgroup>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ListFilter size={16} />
            </div>
          </div>
        </div>
        {selectedFuncId === 'ALERTS' ? (
          <>
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between bg-white sticky top-0 z-10 gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Visão de Alertas</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">CRÍTICOS</p>
                    <div className="flex items-center gap-1.5 ml-2">
                       <span className="flex items-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                         <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">
                           {globalAlerts.filter(item => {
                             const isInteg = 'empresa_id' in item;
                             return getStatusInfo(item.data_vencimento, isInteg ? (item as any).status : null).label === 'ALERTA';
                           }).length} ALERTAS
                         </span>
                       </span>
                       <span className="flex items-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                         <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                           {globalAlerts.filter(item => {
                             const isInteg = 'empresa_id' in item;
                             return getStatusInfo(item.data_vencimento, isInteg ? (item as any).status : null).label === 'VENCIDO';
                           }).length} VENCIDOS
                         </span>
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto scrollbar-hide text-left">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-300">
                  <Loader2 className="animate-spin mb-4" size={40} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Buscando alertas...</p>
                </div>
              ) : globalAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-300">
                  <Check size={40} className="text-emerald-400 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Tudo em dia! Nenhum alerta encontrado.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm text-left">
                    <tr>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">Funcionário</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">Documento / Empresa</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 text-left">Vencimento</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {globalAlerts.map((item, idx) => {
                      const isInteg = 'empresa_id' in item;
                      const label = isInteg ? (item as any).empresa?.nome : (item as any).tipo_documento;
                      const status = getStatusInfo(item.data_vencimento, isInteg ? (item as any).status : null);
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-6">
                            <span className="text-[11px] font-black text-slate-900 uppercase">{(item as any).funcionario?.nome || '---'}</span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              {isInteg ? <FileText size={12} className="text-blue-400"/> : <User size={12} className="text-purple-400"/>}
                              <span className="text-[11px] font-bold text-slate-600 uppercase">{label}</span>
                            </div>
                          </td>
                          <td className="p-6 text-left">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                              {item.data_vencimento ? format(parseISO(item.data_vencimento), 'dd/MM/yyyy') : '---'}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${status.bg} ${status.color} ring-1 ring-inset ring-current/10`}>
                              <span className="text-[9px] font-black tracking-widest uppercase">{status.label}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : selectedFuncId && selectedFunc ? (
          <>
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between bg-white sticky top-0 z-10 gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-12 h-12 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{selectedFunc.nome}</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedFunc.funcao || 'FUNÇÃO NÃO DEFINIDA'}</p>
                </div>
              </div>

              {/* TABS */}
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 self-start md:self-center">
                <button 
                  onClick={() => setActiveTab('DOC')}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DOC' ? 'bg-white text-[#0066CC] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  DOC
                </button>
                <button 
                  onClick={() => setActiveTab('INTEGRACAO')}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'INTEGRACAO' ? 'bg-white text-[#0066CC] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  INTEGRAÇÃO
                </button>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button onClick={() => handleOpenEditModal(selectedFunc)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                <button onClick={() => { if(confirm('Excluir funcionário?')) supabase.from('funcionarios').delete().eq('id', selectedFuncId).then(() => fetchFuncionarios()) }} className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto scrollbar-hide text-left">
              {activeTab === 'DOC' ? (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm text-left">
                    <tr><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">Documento</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 text-left">Vencimento</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...documentos].sort((a,b) => a.tipo_documento.localeCompare(b.tipo_documento)).map(doc => {
                      const status = getStatusInfo(doc);
                      return (<tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-6">
                          <span className="text-[11px] font-black text-slate-700 uppercase">{doc.tipo_documento}</span>
                        </td>
                        <td className="p-6 text-left">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                            {doc.data_vencimento ? format(parseISO(doc.data_vencimento), 'dd/MM/yyyy') : (doc.status_permanente || '---')}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${status.bg} ${status.color} ring-1 ring-inset ring-current/10`}>
                            <span className="text-[9px] font-black tracking-widest uppercase">{status.label}</span>
                          </div>
                        </td>
                      </tr>);
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm text-left">
                    <tr>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">Empresa</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 text-left">Vencimento</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...integracoes].sort((a,b) => (a.empresa?.nome || '').localeCompare(b.empresa?.nome || '')).map(integ => {
                      const status = getStatusInfo(integ.data_vencimento, integ.status);
                      return (
                        <tr key={integ.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-6">
                            <span className="text-[11px] font-black text-slate-700 uppercase">{integ.empresa?.nome || 'EMPRESA NÃO ENCONTRADA'}</span>
                          </td>
                          <td className="p-6 text-left">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                              {integ.data_vencimento ? format(parseISO(integ.data_vencimento), 'dd/MM/yyyy') : '---'}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${status.bg} ${status.color} ring-1 ring-inset ring-current/10`}>
                              <span className="text-[9px] font-black tracking-widest uppercase">{status.label}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-300"><div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100"><AlertCircle size={40} className="text-slate-200" /></div><h3 className="text-xs font-black uppercase tracking-widest mb-2">Selecione um funcionário</h3></div>
        )}
      </div>

      {/* Modal - Unificado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh]">
            <div className="p-8 bg-white border-b border-slate-50 flex justify-between items-center"><div><h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{modalMode === 'ADD' ? 'Novo Funcionário' : 'Dados do Funcionário'}</h3><p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Configuração de documentos técnicos</p></div><button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><X size={24}/></button></div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label><input autoFocus type="text" value={funcName} onChange={e => setFuncName(e.target.value)} className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none" /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Função</label><input type="text" value={funcRole} onChange={e => setFuncRole(e.target.value)} className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none" /></div></div>
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {activeTab === 'DOC' ? 'Documentação Técnica' : 'Integrações com Empresas'}
                  </label>
                  <button 
                    onClick={activeTab === 'DOC' ? handleAddCustomDoc : handleAddMasterEmpresa} 
                    className="w-8 h-8 bg-[#0066CC] text-white rounded-lg flex items-center justify-center active:scale-90 shadow-lg shadow-blue-100"
                  >
                    <Plus size={20}/>
                  </button>
                </div>

                <div className="space-y-2">
                  {activeTab === 'DOC' ? (
                    Object.keys(docsConfig)
                      .filter(doc => doc !== 'OUTROS')
                      .sort((a,b) => a.localeCompare(b))
                      .map(doc => {
                        const config = docsConfig[doc];
                        return (
                          <div key={doc} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${config.selected ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-50 opacity-60'}`}>
                            <button onClick={() => setDocsConfig(p => ({...p, [doc]: {...p[doc], selected: !p[doc].selected}}))} className="flex items-center gap-3 flex-1 text-left">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${config.selected ? 'bg-[#0066CC] text-white' : 'bg-slate-100 text-transparent'}`}>
                                <Check size={16} strokeWidth={4}/>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-tight text-slate-700">{doc}</span>
                            </button>
                            
                            {config.selected && (
                              <div className="flex items-center gap-3 animate-in slide-in-from-right-2 duration-300">
                                <div className="flex items-center gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => setDocsConfig(p => ({...p, [doc]: {...p[doc], otherType: p[doc].otherType === 'STATUS' ? 'DATE' : 'STATUS'}}))} 
                                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#0066CC] transition-colors"
                                  >
                                    {config.otherType === 'STATUS' ? <ListFilter size={14}/> : <Calendar size={14}/>}
                                  </button>
                                  {config.otherType === 'STATUS' ? (
                                    <select 
                                      value={config.status || 'APTO'} 
                                      onChange={e => setDocsConfig(p => ({...p, [doc]: {...p[doc], status: e.target.value}}))} 
                                      className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-black outline-none"
                                    >
                                      <option value="APTO">APTO</option>
                                      <option value="NA">NA</option>
                                    </select>
                                  ) : (
                                    <input 
                                      type="date" 
                                      value={config.date || ''} 
                                      onChange={e => setDocsConfig(p => ({...p, [doc]: {...p[doc], date: e.target.value}}))} 
                                      className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-bold outline-none" 
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="space-y-4">
                      {/* Form de Adição Rápida */}
                      {isAddingEmpresa && (
                        <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                           <div className="flex items-center justify-between">
                             <label className="text-[9px] font-black text-[#0066CC] uppercase tracking-widest">Nova Empresa</label>
                             <button onClick={() => setIsAddingEmpresa(false)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <input 
                               autoFocus
                               placeholder="NOME DA EMPRESA"
                               type="text" 
                               value={newEmpresaNome} 
                               onChange={e => setNewEmpresaNome(e.target.value)} 
                               className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:border-[#0066CC]" 
                             />
                             <div className="flex gap-2">
                               <input 
                                 type="date" 
                                 value={newEmpresaData} 
                                 onChange={e => setNewEmpresaData(e.target.value)} 
                                 className="h-10 px-4 flex-1 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-[#0066CC]" 
                               />
                               <button 
                                 onClick={handleConfirmAddMasterEmpresa}
                                 className="h-10 px-4 bg-[#0066CC] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95"
                               >
                                 Add
                               </button>
                             </div>
                           </div>
                        </div>
                      )}

                      {empresasMaster
                        .sort((a,b) => a.nome.localeCompare(b.nome))
                        .map(emp => {
                        const config = integracoesConfig[emp.id] || { selected: false };
                        return (
                          <div key={emp.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${config.selected ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-50 opacity-60'}`}>
                            <div className="flex items-center gap-3 flex-1 text-left">
                              <button onClick={() => setIntegracoesConfig(p => ({...p, [emp.id]: {...(p[emp.id] || {status:'REGULAR'}), selected: !p[emp.id]?.selected}}))} className="flex items-center gap-3 flex-1">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${config.selected ? 'bg-[#0066CC] text-white' : 'bg-slate-100 text-transparent'}`}>
                                  <Check size={16} strokeWidth={4}/>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-700">{emp.nome}</span>
                              </button>
                              <button onClick={(e) => handleDeleteMasterEmpresa(emp.id, e)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={14}/>
                              </button>
                            </div>
                            
                            {config.selected && (
                              <div className="flex items-center gap-3 animate-in slide-in-from-right-2 duration-300">
                                <input 
                                  type="date" 
                                  value={config.date || ''} 
                                  onChange={e => setIntegracoesConfig(p => ({...p, [emp.id]: {...p[emp.id], date: e.target.value}}))} 
                                  className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-bold outline-none w-32" 
                                />
                              </div>
                            )}
                          </div>
                        );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4"><button onClick={() => setIsModalOpen(false)} className="flex-1 h-16 rounded-2xl text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200">Cancelar</button><button onClick={handleSave} disabled={!funcName.trim() || isSaving} className="flex-1 h-16 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white bg-[#0066CC] shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-3">{isSaving ? <Loader2 className="animate-spin" size={20} /> : 'SALVAR'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
