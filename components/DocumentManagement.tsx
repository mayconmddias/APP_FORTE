
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { Funcionario, Documento, EmpresaMaster, FuncionarioIntegracao } from '../types';
import { 
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  User,
  X,
  FileText,
  AlertTriangle,
  ListFilter
} from 'lucide-react';
import { db } from '../services/offlineDb';
import { format, differenceInDays, parseISO } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [globalAlerts, setGlobalAlerts] = useState<(Documento | FuncionarioIntegracao)[]>([]);
  
  const [activeTab, setActiveTab] = useState<'DOC' | 'INTEGRACAO'>('DOC');
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

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
      const users = await db.usuarios.orderBy('name').toArray();
      
      const mapped: Funcionario[] = (users || []).map(u => ({
        id: u.server_id || u.id,
        nome: u.name,
        funcao: (u as any).funcao || ''
      }));
      
      setFuncionarios(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentos = async (funcId: string) => {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('funcionario_id', funcId);
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
        .select('*')
        .eq('funcionario_id', funcId);

      if (error) throw error;

      const mappedInts = (data || []).map(i => ({
          ...i,
          empresa: { nome: i.empresa_nome } // Map to expected object format
      }));

      setIntegracoes(mappedInts as any || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllAlerts = async () => {
    setLoading(true);
    try {
      const today = new Date();
      
      const [docsRes, intsRes, usersData] = await Promise.all([
          supabase.from('documentos').select('*'),
          supabase.from('funcionario_integracoes').select('*'),
          db.usuarios.toArray()
      ]);

      const userMap: Record<string, any> = {};
      usersData.forEach(u => { 
        userMap[u.server_id || u.id] = u; 
      });
      
      const filteredDocs = (docsRes.data || []).filter(doc => {
        if (doc.data_vencimento) {
          const dias = differenceInDays(parseISO(doc.data_vencimento), today);
          return dias <= 40;
        }
        return doc.status_permanente === 'INAPTO' || doc.status_permanente === 'NA';
      }).map(d => ({
          ...d,
          funcionario: userMap[d.funcionario_id]
      }));

      const filteredInts = (intsRes.data || []).filter(integ => {
        if (integ.data_vencimento) {
          const dias = differenceInDays(parseISO(integ.data_vencimento), today);
          return dias <= 40;
        }
        return (integ as any).status === 'INAPTO' || (integ as any).status === 'NA';
      }).map(i => ({
          ...i,
          empresa: { nome: i.empresa_nome || i.empresa_id },
          empresa_nome: i.empresa_nome || i.empresa_id,
          funcionario: userMap[i.funcionario_id]
      }));
      const sortedAlerts = [...filteredDocs, ...filteredInts].sort((a,b) => {
        const nomeA = (a as any).funcionario?.name || '';
        const nomeB = (b as any).funcionario?.name || '';
        if (nomeA !== nomeB) return nomeA.localeCompare(nomeB);
        const isIntegA = 'empresa_id' in a;
        const isIntegB = 'empresa_id' in b;
        if (!isIntegA && isIntegB) return -1;
        if (isIntegA && !isIntegB) return 1;
        return 0;
      });

      setGlobalAlerts(sortedAlerts as any);
    } catch (err) {
      console.error('Erro ao buscar alertas globais:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFuncId === 'ALERTS') {
      fetchAllAlerts();
    } else if (selectedFuncId) {
      fetchDocumentos(selectedFuncId);
      fetchIntegracoes(selectedFuncId);
    }
  }, [selectedFuncId]);

  useEffect(() => {
    onHeaderActionChange?.(
      <div className="flex gap-1 items-center">
        <button
          onClick={() => setSelectedFuncId('ALERTS')}
          className={`md:hidden p-2 rounded-full active:scale-95 transition-all ${selectedFuncId === 'ALERTS' ? 'text-red-500 bg-red-50' : 'text-[#004a88] hover:bg-slate-100'}`}
        >
          <span className="material-symbols-outlined font-bold" style={{ fontSize: '22px' }}>warning</span>
        </button>
      </div>
    );
    return () => onHeaderActionChange?.(null);
  }, [onHeaderActionChange, selectedFuncId]);

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

    if (statusPermanente === 'REGULAR') statusPermanente = 'APTO';

    const isTextDoc = !isStatusDoc && !vencimento && statusPermanente;
    if (isStatusDoc || isTextDoc) return { label: statusPermanente || 'APTO', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Check size={14}/> };
    if (!vencimento) return { label: 'APTO', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Check size={14}/> };
    
    const hoje = new Date();
    const dataVenc = parseISO(vencimento);
    const diasParaVencer = differenceInDays(dataVenc, hoje);
    if (diasParaVencer <= 0) return { label: 'VENCIDO', color: 'text-red-500', bg: 'bg-red-50', icon: <AlertTriangle size={14}/> };
    if (diasParaVencer <= 40) return { label: 'ALERTA', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: <AlertCircle size={14}/> };
    return { label: statusPermanente || 'APTO', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Check size={14}/> };
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-slate-50 gap-4 overflow-hidden">
      {/* Sidebar */}
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

        <div className="p-6 border-b border-slate-50 text-left pt-2"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usuários</h3></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {loading && selectedFuncId !== 'ALERTS' ? <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div> : 
           funcionarios.length === 0 ? <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase">Nenhum usuário cadastrado</div> : (
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
        <div className="md:hidden p-4 border-b border-slate-50 bg-white">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Selecionar Usuário</label>
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
                      <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50">Usuário</th>
                      <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50">Documento / Empresa</th>
                      <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 text-left">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {globalAlerts.map((item, idx) => {
                      const isInteg = 'empresa_id' in item;
                      const label = isInteg ? ((item as any).empresa_nome || (item as any).empresa?.nome || (item as any).empresa_id) : (item as any).tipo_documento;
                      const status = getStatusInfo(item.data_vencimento, isInteg ? (item as any).status : null);
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 sm:px-6 py-4">
                            <span className="text-[11px] font-black text-slate-900 uppercase">{(item as any).funcionario?.name ? formatName((item as any).funcionario.name) : '---'}</span>
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
                    {integracoes.map(int => {
                      const status = getStatusInfo(int.data_vencimento, int.status);
                      return (
                        <tr key={int.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 sm:px-6 py-4">
                            <span className="text-[11px] font-black text-slate-700 uppercase">
                              {(int as any).empresa_nome || int.empresa?.nome || int.empresa_id}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-left">
                            <div className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${status.bg} ${status.color} ring-1 ring-inset ring-current/10`}>
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight">
                                {int.data_vencimento ? format(parseISO(int.data_vencimento), 'dd/MM/yyyy') : '---'}
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
           <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6">
               <User size={40} />
             </div>
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Nenhum Selecionado</h3>
             <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 max-w-[200px] leading-relaxed">Selecione um usuário na lista lateral para ver o status dos documentos.</p>
           </div>
        )}
      </div>

      {/* Select Modal Mobile */}
      {isSelectModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end md:hidden bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="bg-white w-full rounded-t-[2.5rem] shadow-2xl flex flex-col p-6 pt-2 animate-in slide-in-from-bottom duration-300 max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-2 mb-6" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Selecionar Usuário</h3>
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
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Lista de Usuários</h4>
              </div>

              {funcionarios.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-[10px] font-bold uppercase ring-1 ring-slate-100 rounded-3xl">Nenhum usuário encontrado</div>
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
