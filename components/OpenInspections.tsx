import React, { useEffect, useState } from 'react';
import GenericModal from './GenericModal';
import { CraneAsset, MaintenanceRecord } from '../types';
import { db } from '../services/offlineDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncEngine } from '../services/syncEngine';
import { Loader2 } from 'lucide-react';

interface OpenInspectionsProps {
  onContinue: (record: MaintenanceRecord) => void;
  assets: CraneAsset[];
  onTitleChange?: (title: string | null) => void;
}

const OpenInspections: React.FC<OpenInspectionsProps> = ({ onContinue, assets, onTitleChange }) => {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [idToDelete, setIdToDelete] = React.useState<string | null>(null);

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDesc, setAlertDesc] = useState('');

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
        if (record?.server_id) {
          await db.exclusoes_pendentes.add({
            server_id: record.server_id,
            table_name: 'maintenance_records',
            timestamp: new Date().toISOString()
          });
        }
        await db.ordens_servico.delete(idToDelete);
        syncEngine.triggerSync();
        setShowDeleteModal(false);
        setIdToDelete(null);
      } catch (error: any) {
        console.error('Error deleting draft:', error);
        setAlertTitle('Erro na Exclusão');
        setAlertDesc(error.message || 'Não foi possível excluir o rascunho.');
        setShowAlert(true);
      }
    }
  };

  const getAssetName = (assetId: string) =>
    assets.find(a => a.id === assetId)?.name || 'Ativo Desconhecido';

  const getClientName = (assetId: string) =>
    assets.find(a => a.id === assetId)?.client || 'Cliente Desconhecido';

  if (drafts === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-[#004a88]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto px-1 pb-8 animate-in fade-in duration-500">
      {drafts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-3xl py-20 flex flex-col items-center justify-center text-center px-6 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-slate-300 select-none notranslate" style={{ fontSize: '32px' }}>schedule</span>
          </div>
          <h3 className="font-headline font-bold text-lg text-blue-950 uppercase">Nenhuma OS em aberto</h3>
          <p className="text-slate-400 text-[11px] font-body font-bold mt-2 max-w-xs uppercase tracking-wide">
            Todos os checklists estão concluídos ou ainda não foram iniciados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {drafts.map((draft) => (
            <div
              key={draft.local_id || draft.id}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_16px_rgb(0,0,0,0.04)] hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              {/* Ícone de status */}
              <div className="hidden sm:flex w-12 h-12 rounded-xl bg-amber-50 text-amber-500 items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '24px' }}>pending</span>
              </div>

              {/* Informações */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[8px] font-bold uppercase bg-amber-500 text-white px-2 py-0.5 rounded-full tracking-wider">EM ABERTO</span>
                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                    draft.type === 'CORRETIVA' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-[#004a88]'
                  }`}>
                    {draft.type}
                  </span>
                  <span className="text-[8px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full tracking-wider">
                    {draft.technician}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-base text-blue-950 uppercase leading-tight truncate">
                  {getAssetName(draft.assetId)}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[10px] text-slate-400 font-body font-bold uppercase">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '12px' }}>factory</span>
                    {getClientName(draft.assetId)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '12px' }}>calendar_today</span>
                    {new Date(draft.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Botões */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => { setIdToDelete(draft.local_id || draft.id); setShowDeleteModal(true); }}
                  className="p-2.5 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all active:scale-90"
                  title="Excluir Rascunho"
                >
                  <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>delete</span>
                </button>
                <button
                  onClick={() => onContinue(draft)}
                  className="flex items-center justify-center gap-2 h-10 px-5 bg-[#004a88] text-white rounded-full font-headline font-bold text-[11px] uppercase tracking-widest shadow-md shadow-blue-900/20 active:scale-95 transition-all"
                >
                  RETOMAR
                  <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
          onClick={() => { setShowDeleteModal(false); setIdToDelete(null); }}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-red-500 select-none notranslate" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <h3 className="font-headline font-bold text-xl text-blue-950 uppercase">Excluir Rascunho?</h3>
            <p className="text-slate-400 text-[11px] font-body font-bold uppercase mt-3 mb-8 leading-relaxed px-2">
              Esta ação removerá permanentemente os dados desta OS incompleta.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setIdToDelete(null); }}
                className="flex-1 h-12 font-headline font-bold text-[11px] uppercase tracking-widest text-[#004a88] hover:bg-blue-50 rounded-full transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 h-12 bg-red-500 text-white rounded-full font-headline font-bold text-[11px] uppercase tracking-widest shadow-md shadow-red-200 active:scale-95 transition-all"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

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

export default OpenInspections;
