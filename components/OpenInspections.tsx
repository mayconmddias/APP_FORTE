import React, { useEffect } from 'react';
import {
  Clock,
  Calendar,
  Trash2,
  Play,
  Factory,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { CraneAsset, MaintenanceRecord } from '../types';
import { db } from '../services/offlineDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncEngine } from '../services/syncEngine';

interface OpenInspectionsProps {
  onContinue: (record: MaintenanceRecord) => void;
  assets: CraneAsset[];
  onTitleChange?: (title: string | null) => void;
}

const OpenInspections: React.FC<OpenInspectionsProps> = ({ onContinue, assets, onTitleChange }) => {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [idToDelete, setIdToDelete] = React.useState<string | null>(null);

  useEffect(() => {
    onTitleChange?.('ORDENS EM ABERTO');
  }, [onTitleChange]);

  const drafts = useLiveQuery(
    () => db.ordens_servico.where('status').equals('OPEN').toArray(),
    []
  );

  const confirmDelete = async () => {
    if (idToDelete) {
      try {
        const record = await db.ordens_servico.get(idToDelete);

        // 1. REGISTRAR NA FILA DE EXCLUSÃO se tiver ID de servidor
        if (record?.server_id) {
          console.log("OpenInspections: Queueing server deletion for:", record.server_id);
          await db.exclusoes_pendentes.add({
            server_id: record.server_id,
            table_name: 'maintenance_records',
            timestamp: new Date().toISOString()
          });
        }

        // 2. Remover localmente
        await db.ordens_servico.delete(idToDelete);
        syncEngine.triggerSync();
        setShowDeleteModal(false);
        setIdToDelete(null);
      } catch (error) {
        console.error('Error deleting draft:', error);
        alert('Erro ao excluir rascunho.');
      }
    }
  };

  const getAssetName = (assetId: string) => {
    return assets.find(a => a.id === assetId)?.name || 'Ativo Desconhecido';
  };

  const getClientName = (assetId: string) => {
    return assets.find(a => a.id === assetId)?.client || 'Cliente Desconhecido';
  };

  if (drafts === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500 px-1">
      {drafts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] py-20 flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6"><Clock size={32} /></div>
          <h3 className="text-lg font-black text-slate-700">Nenhuma OS em aberto</h3>
          <p className="text-slate-400 text-[11px] mt-2 max-w-xs uppercase font-bold tracking-widest">Todos os checklists estão concluídos ou ainda não foram iniciados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {drafts.map((draft) => (
            <div key={draft.local_id || draft.id} className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-xl hidden sm:block"><Clock size={22} /></div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-[8px] font-black uppercase bg-orange-500 text-white px-1.5 py-0.5 rounded tracking-tighter">EM ABERTO</span>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter ${draft.type === 'CORRETIVA' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {draft.type}
                  </span>
                  <span className="text-[8px] font-bold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded tracking-tighter">{draft.technician}</span>
                </div>
                <h3 className="text-base font-black text-slate-800 leading-tight uppercase">{getAssetName(draft.assetId)}</h3>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                  <div className="flex items-center gap-1"><Factory size={12} className="text-slate-300" /> {getClientName(draft.assetId)}</div>
                  <div className="flex items-center gap-1"><Calendar size={12} className="text-slate-300" /> {new Date(draft.date).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-end">
                <button
                  onClick={() => { setIdToDelete(draft.local_id || draft.id); setShowDeleteModal(true); }}
                  className="w-10 h-10 flex items-center justify-center bg-white text-slate-900 border border-slate-100 rounded-xl shadow-sm hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                  title="Excluir Rascunho"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={() => onContinue(draft)} className="w-1/2 sm:w-40 flex items-center justify-center gap-2 h-10 bg-[#0066CC] text-white rounded-[20px] font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all group">
                  RETOMAR <Play size={14} className="fill-current group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-white z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertTriangle size={48} /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Excluir Rascunho?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-4 mb-10 leading-relaxed px-4">Esta ação removerá permanentemente os dados desta OS incompleta.</p>
            <div className="flex gap-4">
              <button onClick={() => { setShowDeleteModal(false); setIdToDelete(null); }} className="flex-1 h-14 bg-slate-50 text-slate-500 rounded-[20px] font-black text-[11px] uppercase tracking-widest transition-all">Sair</button>
              <button onClick={confirmDelete} className="flex-1 h-14 bg-red-600 text-white rounded-[20px] font-black text-[11px] uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenInspections;
