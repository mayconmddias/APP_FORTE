import React, { useState, useEffect } from 'react';
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
import { supabase } from '../supabaseClient';

interface OpenInspectionsProps {
  onContinue: (record: MaintenanceRecord) => void;
  assets: CraneAsset[];
  onTitleChange?: (title: string | null) => void;
}

const OpenInspections: React.FC<OpenInspectionsProps> = ({ onContinue, assets, onTitleChange }) => {
  const [drafts, setDrafts] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    onTitleChange?.('ORDENS EM ABERTO');
  }, [onTitleChange]);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('signature', 'DRAFT')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedDrafts = data.map((r: any) => ({
          id: r.id,
          inspectionNumber: r.inspection_number || r.inspectionNumber,
          assetId: r.asset_id || r.assetId,
          type: r.type,
          checklistType: r.checklist_type || r.checklistType,
          frequency: r.frequency,
          date: r.date,
          technician: r.technician,
          technicianId: r.technician_id || r.technicianId,
          downtimeHours: r.downtime_hours || r.downtimeHours,
          criticality: r.criticality,
          checklists: r.checklists,
          clientRepresentative: r.client_representative || r.clientRepresentative,
          signature: r.signature,
          status: r.status
        })) as MaintenanceRecord[];

        setDrafts(mappedDrafts);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const confirmDelete = async () => {
    if (idToDelete) {
      try {
        const { error } = await supabase
          .from('maintenance_records')
          .delete()
          .eq('id', idToDelete);

        if (error) throw error;

        loadDrafts();
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

  if (loading) {
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
            <div key={draft.id} className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-xl hidden sm:block"><Clock size={22} /></div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-[8px] font-black uppercase bg-orange-500 text-white px-1.5 py-0.5 rounded tracking-tighter">EM ABERTO</span>
                  <span className="text-[8px] font-bold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded tracking-tighter">{draft.technician}</span>
                </div>
                <h3 className="text-base font-black text-slate-800 leading-tight uppercase">{getAssetName(draft.assetId)}</h3>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                  <div className="flex items-center gap-1"><Factory size={12} className="text-slate-300" /> {getClientName(draft.assetId)}</div>
                  <div className="flex items-center gap-1"><Calendar size={12} className="text-slate-300" /> {new Date(draft.date).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={() => { setIdToDelete(draft.id); setShowDeleteModal(true); }} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                <button onClick={() => onContinue(draft)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#0066CC] text-white rounded-xl font-black text-[11px] uppercase hover:bg-[#0055AA] transition-all shadow-md group">
                  Retomar <Play size={14} className="fill-current group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-white z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center border-2 border-slate-900 shadow-2xl animate-in zoom-in-95">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertTriangle size={48} /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Excluir Rascunho?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-4 mb-10 leading-relaxed px-4">Esta ação removerá permanentemente os dados desta OS incompleta.</p>
            <div className="flex gap-4">
              <button onClick={() => { setShowDeleteModal(false); setIdToDelete(null); }} className="flex-1 h-16 bg-slate-50 text-slate-500 rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all">Sair</button>
              <button onClick={confirmDelete} className="flex-1 h-16 bg-red-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenInspections;
