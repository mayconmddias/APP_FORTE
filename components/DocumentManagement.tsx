
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Funcionario, Documento } from '../types';
import { 
  Plus, 
  Trash2, 
  Search, 
  UserPlus, 
  Calendar as CalendarIcon,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import DocumentCard from './DocumentCard';
import { format, differenceInDays, parseISO } from 'date-fns';

const DOCUMENT_TYPES = [
  'ASO',
  'CERTIFICADO SOLDADOR MIG/MAG E ELETRODO REVESTIDO',
  'NR-12 FERRAMENTAS ELETROPORTATEIS, MAQUINAS ROTATIVAS E FERRAMENTAS',
  'NR-10 SEGURANÇA EM SERVIÇOS ELETRICOS',
  'NR-06 CERTIFICADO DE USO DE EPI',
  'CERTIFICADO PTA',
  'NR-33 ESPAÇO CONFINADO',
  'NR-35 TRABALHO EM ALTURA',
  'NR-18 MAÇARICO / OXICORTE MANUAL',
  'NR-18 BASICO DE SEG COM TRABALHO A QUENTE',
  'CERTIFICADO PONTE ROLANTE',
  'FICHA DE EPI'
];

interface DocumentManagementProps {
  onTitleChange: (title: string) => void;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ onTitleChange }) => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedFuncId, setSelectedFuncId] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingFunc, setIsAddingFunc] = useState(false);
  const [newFuncName, setNewFuncName] = useState('');
  const [newFuncRole, setNewFuncRole] = useState('');

  useEffect(() => {
    onTitleChange('GESTÃO DE DOCUMENTOS');
    fetchFuncionarios();
  }, []);

  useEffect(() => {
    if (selectedFuncId) {
      fetchDocumentos(selectedFuncId);
    } else {
      setDocumentos([]);
    }
  }, [selectedFuncId]);

  const fetchFuncionarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .order('nome');
    
    if (error) console.error('Erro ao buscar funcionários:', error);
    else setFuncionarios(data || []);
    setLoading(false);
  };

  const fetchDocumentos = async (funcId: string) => {
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('funcionario_id', funcId);
    
    if (error) console.error('Erro ao buscar documentos:', error);
    else setDocumentos(data || []);
  };

  const handleAddFuncionario = async () => {
    if (!newFuncName.trim()) return;

    const { data, error } = await supabase
      .from('funcionarios')
      .insert([{ nome: newFuncName, funcao: newFuncRole }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar funcionário:', error);
      alert('Erro ao adicionar funcionário');
    } else {
      // Criar documentos padrão automaticamente
      const docsToInsert = DOCUMENT_TYPES.map(tipo => ({
        funcionario_id: data.id,
        tipo_documento: tipo,
        data_vencimento: null,
        status_permanente: tipo.includes('CERTIFICADO') ? 'APT' : null
      }));

      await supabase.from('documentos').insert(docsToInsert);
      
      setNewFuncName('');
      setNewFuncRole('');
      setIsAddingFunc(false);
      fetchFuncionarios();
      setSelectedFuncId(data.id);
    }
  };

  const handleDeleteFuncionario = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário e todos os seus documentos?')) return;

    const { error } = await supabase
      .from('funcionarios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar funcionário:', error);
    } else {
      if (selectedFuncId === id) setSelectedFuncId(null);
      fetchFuncionarios();
    }
  };

  const handleUpdateDocDate = async (docId: string, date: string | null) => {
    const { error } = await supabase
      .from('documentos')
      .update({ data_vencimento: date, status_permanente: null })
      .eq('id', docId);

    if (error) console.error('Erro ao atualizar data:', error);
    else if (selectedFuncId) fetchDocumentos(selectedFuncId);
  };

  const handleSetPermanent = async (docId: string, status: string) => {
    const { error } = await supabase
      .from('documentos')
      .update({ data_vencimento: null, status_permanente: status })
      .eq('id', docId);

    if (error) console.error('Erro ao atualizar status:', error);
    else if (selectedFuncId) fetchDocumentos(selectedFuncId);
  };

  const formatName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length <= 1) return fullName;
    return `${parts[0]} ${parts[1]}`;
  };

  const filteredFuncionarios = useMemo(() => {
    return funcionarios.filter(f => 
      f.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [funcionarios, searchTerm]);

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50 gap-4 overflow-hidden">
      {/* Sidebar - Lista de Funcionários */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Funcionários</h3>
            <button 
              onClick={() => setIsAddingFunc(true)}
              className="p-2 bg-[#0066CC] text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              <UserPlus size={18} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin text-blue-500" />
            </div>
          ) : filteredFuncionarios.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase">Nenhum funcionário encontrado</div>
          ) : (
            filteredFuncionarios.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFuncId(f.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all group relative flex items-center justify-between
                  ${selectedFuncId === f.id 
                    ? 'bg-blue-50 text-[#0066CC]' 
                    : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <div>
                  <div className="text-xs font-black uppercase tracking-tight">{formatName(f.nome)}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{f.funcao || 'Sem função'}</div>
                </div>
                <ChevronRight size={16} className={`transition-transform ${selectedFuncId === f.id ? 'translate-x-1' : 'opacity-0'}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área Principal - Cards de Documentos */}
      <div className="flex-1 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
        {selectedFuncId ? (
          <>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase">
                  {funcionarios.find(f => f.id === selectedFuncId)?.nome}
                </h2>
                <p className="text-[10px] font-bold text-[#0066CC] uppercase tracking-widest mt-1">
                  Painel de Controle de Validade
                </p>
              </div>
              <button 
                onClick={() => handleDeleteFuncionario(selectedFuncId)}
                className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                title="Excluir Funcionário"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {documentos.map(doc => (
                  <DocumentCard 
                    key={doc.id} 
                    documento={doc} 
                    onUpdateDate={(date) => handleUpdateDocDate(doc.id, date)}
                    onSetPermanent={(status) => handleSetPermanent(doc.id, status)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100">
              <AlertCircle size={40} className="text-slate-200" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-2">Selecione um funcionário</h3>
            <p className="text-[10px] font-bold uppercase leading-relaxed max-w-xs">
              Selecione um funcionário na lista à esquerda para gerenciar seus documentos e vencimentos.
            </p>
          </div>
        )}
      </div>

      {/* Modal Adicionar Funcionário */}
      {isAddingFunc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 bg-[#0066CC] text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">Novo Funcionário</h3>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">Preencha os dados básicos abaixo</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  autoFocus
                  type="text"
                  placeholder="DIGITE O NOME..."
                  value={newFuncName}
                  onChange={(e) => setNewFuncName(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Função</label>
                <input 
                  type="text"
                  placeholder="EX: ELETRICISTA, SOLDADOR..."
                  value={newFuncRole}
                  onChange={(e) => setNewFuncRole(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsAddingFunc(false)}
                  className="flex-1 px-6 py-4 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddFuncionario}
                  disabled={!newFuncName.trim()}
                  className="flex-1 bg-[#0066CC] text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
