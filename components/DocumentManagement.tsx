
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import GenericModal from './GenericModal';
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
import { v4 as uuidv4 } from 'uuid';

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

const formatName = (fullName: string) => {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  if (parts.length <= 2) return fullName;
  
  const connectives = ['DE', 'DA', 'DO', 'DAS', 'DOS'];
  if (connectives.includes(parts[1].toUpperCase()) && parts.length >= 3) {
    return `${parts[0]} ${parts[1]} ${parts[2]}`;
  }
  
  return `${parts[0]} ${parts[1]}`;
};

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
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

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
  
  // Custom Modal States
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [onPromptConfirm, setOnPromptConfirm] = useState<(val: string) => void>(() => {});

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDesc, setConfirmDesc] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<() => void>(() => {});

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDesc, setAlertDesc] = useState('');

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
      <div className="flex gap-1 items-center">
        <button
          onClick={() => setSelectedFuncId('ALERTS')}
          className={`md:hidden p-2 rounded-full active:scale-95 transition-all ${selectedFuncId === 'ALERTS' ? 'text-red-500 bg-red-50' : 'text-[#004a88] hover:bg-slate-100'}`}
        >
          <span className="material-symbols-outlined font-bold" style={{ fontSize: '22px' }}>warning</span>
        </button>
        <button
          onClick={handleOpenAddModal}
          className="text-[#004a88] hover:bg-slate-100 p-2 rounded-full active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined font-bold" style={{ fontSize: '24px' }}>add</span>
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
          id: (existing && existing.id) ? existing.id : uuidv4(),
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
          id: (existing && existing.id) ? existing.id : uuidv4(),
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
      setAlertTitle('Erro no Cadastro');
      setAlertDesc(err.message);
      setShowAlert(true);
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
           id: uuidv4(), 
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
    setConfirmTitle('Excluir Empresa?');
    setConfirmDesc('Isso removerá os vínculos de todos os funcionários permanentemente.');
    setOnConfirmAction(() => async () => {
        try {
            const { error } = await supabase.from('empresas_master').delete().eq('id', empId);
            if (error) throw error;
            
            setEmpresasMaster(prev => prev.filter(emp => emp.id !== empId));
            setIntegracoesConfig(prev => {
                const newConfig = { ...prev };
                delete newConfig[empId];
                return newConfig;
            });
            if (selectedFuncId) fetchIntegracoes(selectedFuncId);
            setShowConfirm(false);
        } catch (err: any) {
            alert(`Erro ao excluir empresa: ${err.message}`);
        }
    });
    setShowConfirm(true);
  };

  const handleAddCustomDoc = () => {
    setPromptTitle('Novo Documento');
    setPromptValue('');
    setOnPromptConfirm(() => (val: string) => {
        const upperName = val.trim().toUpperCase();
        if (docsConfig[upperName]) return;
        setDocsConfig(prev => ({
            ...prev,
            [upperName]: { selected: true, otherType: 'DATE', isCustom: true, status: 'APTO' }
        }));
        setShowPrompt(false);
    });
    setShowPrompt(true);
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
                <div><div className="text-[11px] font-black uppercase tracking-tight">{formatName(f.nome)}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{f.funcao || 'Sem função'}</div></div>
                <ChevronRight size={16} className={`transition-transform ${selectedFuncId === f.id ? 'translate-x-1' : 'opacity-0'}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
        {/* Mobile Selector - Custom Implementation */}
        <div className="md:hidden p-4 border-b border-slate-50 bg-white">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Selecionar Funcionário</label>
          <button 
            onClick={() => setIsSelectModalOpen(true)}
            className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-black text-slate-900 uppercase">
                {selectedFuncId === 'ALERTS' ? 'VISÃO DE ALERTAS' : (formatName(selectedFunc?.nome || '') || 'Selecionar na lista...')}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                {selectedFuncId === 'ALERTS' ? 'GERENCIAMENTO DE PRAZOS' : (selectedFunc?.funcao || 'Clique para escolher')}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[#004a88] shadow-sm">
              <ListFilter size={16} />
            </div>
          </button>
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide text-left">
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
                      <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50">Funcionário</th>
                      <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50">Documento / Empresa</th>
                      <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 text-left">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {globalAlerts.map((item, idx) => {
                      const isInteg = 'empresa_id' in item;
                      const label = isInteg ? (item as any).empresa?.nome : (item as any).tipo_documento;
                      const status = getStatusInfo(item.data_vencimento, isInteg ? (item as any).status : null);
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 sm:px-6 py-4">
                            <span className="text-[11px] font-black text-slate-900 uppercase">{(item as any).funcionario?.nome ? formatName((item as any).funcionario.nome) : '---'}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isInteg ? <FileText size={12} className="text-blue-400"/> : <User size={12} className="text-purple-400"/>}
                              <span className="text-[11px] font-bold text-slate-600 uppercase">{label}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-left">
                            <div className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${status.bg} ${status.color} ring-1 ring-inset ring-current/10`}>
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight">
                                {item.data_vencimento ? format(parseISO(item.data_vencimento), 'dd/MM/yyyy') : '---'}
                              </span>
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
            <div className="p-6 border-b border-slate-50 flex flex-wrap items-center justify-between bg-white sticky top-0 z-10 gap-x-8 gap-y-4">
              
              <div className="flex items-center gap-4">
                {/* TABS */}
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
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

                {/* ACTIONS */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenEditModal(selectedFunc)} 
                    className="w-9 h-9 flex items-center justify-center text-[#004a88] hover:bg-blue-50 rounded-xl transition-all"
                    title="Editar Funcionário"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => { 
                      setConfirmTitle('Excluir Funcionário?');
                      setConfirmDesc(`Deseja remover permanentemente os dados de ${selectedFunc.nome}?`);
                      setOnConfirmAction(() => async () => {
                          try {
                              const { error } = await supabase.from('funcionarios').delete().eq('id', selectedFuncId);
                              if (error) throw error;
                              await fetchFuncionarios();
                              setSelectedFuncId(null);
                              setShowConfirm(false);
                          } catch (err: any) {
                              alert(`Erro ao excluir: ${err.message}`);
                          }
                      });
                      setShowConfirm(true);
                    }} 
                    className="w-9 h-9 flex items-center justify-center text-[#004a88] hover:bg-blue-50 rounded-xl transition-all"
                    title="Excluir Funcionário"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide text-left">
              {activeTab === 'DOC' ? (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm text-left">
                    <tr><th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50">Documento</th><th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 text-left">Vencimento</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...documentos].sort((a,b) => a.tipo_documento.localeCompare(b.tipo_documento)).map(doc => {
                      const status = getStatusInfo(doc);
                      return (<tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 sm:px-6 py-4">
                          <span className="text-[11px] font-black text-slate-700 uppercase">{doc.tipo_documento}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-left">
                          <div className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${status.bg} ${status.color} ring-1 ring-inset ring-current/10`}>
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight">
                              {doc.data_vencimento ? format(parseISO(doc.data_vencimento), 'dd/MM/yyyy') : (doc.status_permanente || '---')}
                            </span>
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
                      <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50">Empresa</th>
                      <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 text-left">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...integracoes].sort((a,b) => (a.empresa?.nome || '').localeCompare(b.empresa?.nome || '')).map(integ => {
                      const status = getStatusInfo(integ.data_vencimento, integ.status);
                      return (
                        <tr key={integ.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 sm:px-6 py-4">
                            <span className="text-[11px] font-black text-slate-700 uppercase">{integ.empresa?.nome || 'EMPRESA NÃO ENCONTRADA'}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-left">
                            <div className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${status.bg} ${status.color} ring-1 ring-inset ring-current/10`}>
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight">
                                {integ.data_vencimento ? format(parseISO(integ.data_vencimento), 'dd/MM/yyyy') : '---'}
                              </span>
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
              <div className="w-8" />
              <div className="text-center flex-1">
                <h3 className="font-headline font-bold text-lg text-blue-950 uppercase tracking-widest">{modalMode === 'ADD' ? 'Novo Funcionário' : 'Dados do Funcionário'}</h3>
                <p className="font-body text-[10px] font-bold text-[#004a88] uppercase tracking-widest mt-0.5">Configuração de documentos técnicos</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-950 transition-colors">
                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }}>close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#004a88] uppercase tracking-widest">Nome Completo</label>
                  <input autoFocus type="text" value={funcName} onChange={e => setFuncName(e.target.value)} className="w-full h-12 px-5 bg-[#eef2f7] border-none rounded-xl font-body text-sm text-blue-950 uppercase outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#004a88] uppercase tracking-widest">Função</label>
                  <input type="text" value={funcRole} onChange={e => setFuncRole(e.target.value)} className="w-full h-12 px-5 bg-[#eef2f7] border-none rounded-xl font-body text-sm text-blue-950 uppercase outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
              </div>
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <label className="text-[11px] font-bold text-[#004a88] uppercase tracking-widest">
                    {activeTab === 'DOC' ? 'Documentação Técnica' : 'Integrações com Empresas'}
                  </label>
                  <button 
                    onClick={activeTab === 'DOC' ? handleAddCustomDoc : handleAddMasterEmpresa} 
                    className="w-10 h-10 text-[#004a88] hover:bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-all"
                  >
                    <span className="material-symbols-outlined font-bold select-none notranslate" style={{ fontSize: '24px' }}>add</span>
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
                                 className="h-10 px-4 text-[#004a88] hover:bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
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
            <div className="px-6 pb-8 pt-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="font-headline font-bold text-sm text-[#004a88] uppercase tracking-widest px-4 py-3 rounded-full hover:bg-blue-50 active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={!funcName.trim() || isSaving} 
                className="bg-[#004a88] text-white font-headline font-bold text-sm uppercase tracking-widest px-10 py-4 rounded-full shadow-lg shadow-blue-900/20 hover:bg-primary active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}
      <GenericModal 
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        title={promptTitle}
        type="INPUT"
        inputValue={promptValue}
        onInputChange={setPromptValue}
        onInputConfirm={onPromptConfirm}
      />

      <GenericModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={confirmTitle}
        description={confirmDesc}
        type="DANGER"
        onConfirm={onConfirmAction}
      />

      <GenericModal 
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertTitle}
        description={alertDesc}
        type="WARNING"
      />

      {/* Select Modal Mobile */}
      {isSelectModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end md:hidden bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="bg-white w-full rounded-t-[2.5rem] shadow-2xl flex flex-col p-6 pt-2 animate-in slide-in-from-bottom duration-300 max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-2 mb-6" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Selecionar Funcionário</h3>
              <button 
                onClick={() => setIsSelectModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pb-10 scrollbar-hide">
              <button
                onClick={() => { setSelectedFuncId('ALERTS'); setIsSelectModalOpen(false); }}
                className={`w-full text-left p-5 rounded-3xl transition-all flex items-center gap-4 ${selectedFuncId === 'ALERTS' ? 'bg-red-50 text-red-600 ring-2 ring-red-100' : 'bg-slate-50 text-slate-600'}`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${selectedFuncId === 'ALERTS' ? 'bg-red-100' : 'bg-white shadow-sm'}`}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-tight">Visão de Alertas</div>
                  <div className="text-[9px] font-bold opacity-60 uppercase mt-0.5">Gerenciamento de Prazos</div>
                </div>
              </button>

              <div className="pt-4 pb-2">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Lista de Funcionários</h4>
              </div>

              {funcionarios.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-[10px] font-bold uppercase ring-1 ring-slate-100 rounded-3xl">Nenhum funcionário encontrado</div>
              ) : (
                funcionarios.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFuncId(f.id); setIsSelectModalOpen(false); }}
                    className={`w-full text-left p-5 rounded-3xl transition-all flex items-center justify-between ${selectedFuncId === f.id ? 'bg-blue-50 text-[#0066CC] ring-2 ring-blue-100' : 'bg-slate-50 text-slate-500 hover:bg-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${selectedFuncId === f.id ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
                        <User size={20} />
                      </div>
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-tight">{formatName(f.nome)}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{f.funcao || 'Sem função'}</div>
                      </div>
                    </div>
                    {selectedFuncId === f.id && <div className="w-2 h-2 rounded-full bg-[#0066CC]" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DocumentManagement;
