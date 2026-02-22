
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
// Fix: Import icons from 'lucide-react' instead of '../types'
import {
  Search,
  X,
  Pencil,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Settings,
  Plus,
  Factory,
  CheckCircle,
  Wrench,
  Building2
} from 'lucide-react';
import { CraneAsset, AssetStatus, MaintenanceRecord } from '../types';
import { supabase } from '../supabaseClient';

interface AssetManagementProps {
  history: MaintenanceRecord[];
  userRole: 'ADMIN' | 'TECNICO';
  assets: CraneAsset[];
  setAssets: React.Dispatch<React.SetStateAction<CraneAsset[]>>;
  onInspect: (assetId: string) => void;
  onCorrective: (assetId: string) => void;
  onTitleChange?: (title: string | null) => void;
  onHeaderActionChange?: (action: React.ReactNode) => void;
  selectedClient: string | null;
  setSelectedClient: (client: string | null) => void;
  selectedAssetIdForAction: string | null;
  setSelectedAssetIdForAction: (id: string | null) => void;
}

const AssetManagement: React.FC<AssetManagementProps> = ({
  history,
  userRole,
  assets,
  setAssets,
  onInspect,
  onCorrective,
  onTitleChange,
  onHeaderActionChange,
  selectedClient,
  setSelectedClient,
  selectedAssetIdForAction,
  setSelectedAssetIdForAction
}) => {
  const isAdmin = userRole === 'ADMIN';

  const [editingAsset, setEditingAsset] = useState<CraneAsset | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClientDeleteModal, setShowClientDeleteModal] = useState(false);
  const [showDeleteSelectionModal, setShowDeleteSelectionModal] = useState(false);
  const [clientToDeleteName, setClientToDeleteName] = useState<string | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<CraneAsset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assetForm, setAssetForm] = useState<Partial<CraneAsset>>({});

  const handleOpenAdd = useCallback(() => {
    if (!userRole || userRole !== 'ADMIN') return;
    setEditingAsset(null);
    setAssetForm({ client: selectedClient || '', name: '', equipmentType: 'Ponte', capacity: '', span: '', manufacturer: '', serialNumber: '', location: '', status: AssetStatus.OPERATIONAL, commissioningDate: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  }, [selectedClient, userRole]);

  const handleDeleteClient = async () => {
    const targetClient = clientToDeleteName;
    if (!targetClient || isDeleting) return;
    setIsDeleting(true);
    try {
      const clientAssets = assets.filter(a => a.client === targetClient);
      const assetIds = clientAssets.map(a => a.id);

      if (assetIds.length > 0) {
        const { error: errorHistory } = await supabase.from('maintenance_records').delete().in('asset_id', assetIds);
        if (errorHistory) throw errorHistory;
      }

      const { error: errorAssets } = await supabase.from('crane_assets').delete().eq('client', targetClient);
      if (errorAssets) throw errorAssets;

      setAssets(prev => prev.filter(a => a.client !== targetClient));
      if (selectedClient === targetClient) setSelectedClient(null);
      setClientToDeleteName(null);
      setShowDeleteSelectionModal(false);
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
      alert("Não foi possível excluir os dados do cliente.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      onTitleChange?.(`GESTÃO DE ATIVOS | ${selectedClient}`);
    } else {
      onTitleChange?.('GESTÃO DE CLIENTES');
      setSelectedAssetIdForAction(null);
    }
    setSearchTerm('');
  }, [selectedClient, onTitleChange]);

  useEffect(() => {
    if (isAdmin) {
      onHeaderActionChange?.(
        <div className="flex items-center gap-2">
          {!selectedClient && (
            <button
              onClick={() => setShowDeleteSelectionModal(true)}
              className="bg-white border border-slate-200 text-slate-400 w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="bg-white border border-slate-200 text-black w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm"
          >
            <Plus size={24} />
          </button>
        </div>
      );
    } else {
      onHeaderActionChange?.(null);
    }
    return () => onHeaderActionChange?.(null);
  }, [isAdmin, handleOpenAdd, onHeaderActionChange, selectedClient]);

  const clientGroups = useMemo(() => {
    const groups: Record<string, { name: string; count: number }> = {};
    assets.forEach(asset => {
      const normalizedName = asset.client.trim();
      if (!groups[normalizedName]) groups[normalizedName] = { name: normalizedName, count: 0 };
      groups[normalizedName].count += 1;
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  const filteredClients = clientGroups.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const assetsOfSelectedClient = useMemo(() => {
    if (!selectedClient) return [];
    return assets
      .filter(a => a.client === selectedClient)
      .filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, selectedClient, searchTerm]);

  const handleOpenEdit = (asset: CraneAsset) => {
    setEditingAsset(asset);
    setAssetForm({ ...asset });
    setShowModal(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const assetId = editingAsset?.id || `asset-${Date.now()}`;
    const dbAsset = {
      id: assetId,
      client: assetForm.client,
      name: assetForm.name,
      serial_number: assetForm.serialNumber,
      manufacturer: assetForm.manufacturer,
      capacity: assetForm.capacity,
      span: assetForm.span,
      location: assetForm.location,
      status: assetForm.status,
      equipment_type: assetForm.equipmentType,
      commissioning_date: assetForm.commissioningDate
    };

    try {
      const { error } = await supabase.from('crane_assets').upsert(dbAsset);
      if (error) throw error;
      const updatedAsset = { ...assetForm, id: assetId } as CraneAsset;
      if (editingAsset) {
        setAssets(prev => prev.map(a => a.id === editingAsset.id ? updatedAsset : a));
      } else {
        setAssets(prev => [updatedAsset, ...prev]);
      }
      setShowModal(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('crane_assets').delete().eq('id', assetToDelete.id);
      if (error) throw error;
      setAssets(assets.filter(a => a.id !== assetToDelete.id));
      setShowDeleteModal(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClasses = "w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all font-bold text-slate-800 text-sm appearance-none";
  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1.5 block";

  const renderOverlays = () => {
    const overlays = [];

    if (showModal) {
      overlays.push(createPortal(
        <div key="modal-form" className="fixed inset-0 top-0 left-0 w-full h-full bg-white z-[9999] flex flex-col animate-in slide-in-from-bottom-5 duration-500 overflow-hidden rounded-none">
          <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0 rounded-none">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  {editingAsset ? 'EDITAR ATIVO' : (selectedClient ? 'NOVO ATIVO' : 'NOVO CLIENTE')}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações Técnicas</p>
              </div>
            </div>
            <div className="w-12"></div>
          </div>
          <form onSubmit={handleSaveAsset} className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-transparent">
            <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8 pb-32">
              <div className="sm:col-span-2">
                <label className={labelClasses}>Cliente</label>
                <input required type="text" className={inputClasses} value={assetForm.client} onChange={e => setAssetForm({ ...assetForm, client: e.target.value })} placeholder="Ex: Metalúrgica Gerdau" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClasses}>Nome do Ativo (TAG)</label>
                <input required type="text" className={inputClasses} value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="Ex: Ponte Rolante 01" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClasses}>Tipo de Equipamento</label>
                <div className="relative">
                  <select required className={inputClasses} value={assetForm.equipmentType} onChange={e => setAssetForm({ ...assetForm, equipmentType: e.target.value })}>
                    <option value="Ponte">PONTE</option>
                    <option value="Talha">TALHA</option>
                    <option value="Monovia">MONOVIA</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronRight size={18} className="rotate-90 text-slate-400" /></div>
                </div>
              </div>
              <div><label className={labelClasses}>Nº de Série</label><input required type="text" className={inputClasses} value={assetForm.serialNumber} onChange={e => setAssetForm({ ...assetForm, serialNumber: e.target.value })} /></div>
              <div><label className={labelClasses}>Localização</label><input required type="text" className={inputClasses} value={assetForm.location} onChange={e => setAssetForm({ ...assetForm, location: e.target.value })} /></div>
              <div><label className={labelClasses}>Fabricante</label><input required type="text" className={inputClasses} value={assetForm.manufacturer} onChange={e => setAssetForm({ ...assetForm, manufacturer: e.target.value })} /></div>
              <div><label className={labelClasses}>Capacidade</label><input required type="text" className={inputClasses} value={assetForm.capacity} onChange={e => setAssetForm({ ...assetForm, capacity: e.target.value })} placeholder="Ex: 10 Ton" /></div>
              <div><label className={labelClasses}>Vão (M)</label><input required type="text" className={inputClasses} value={assetForm.span} onChange={e => setAssetForm({ ...assetForm, span: e.target.value })} placeholder="Ex: 22m" /></div>
              <div><label className={labelClasses}>Data de Comissionamento</label><input required type="date" className={inputClasses} value={assetForm.commissioningDate} onChange={e => setAssetForm({ ...assetForm, commissioningDate: e.target.value })} /></div>
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 z-10">
              <div className="max-w-3xl mx-auto flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-[20px] font-black text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 h-14 bg-emerald-600 text-white rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {isSaving ? <Loader2 size={24} className="animate-spin" /> : 'SALVAR'}
                </button>
              </div>
            </div>
          </form>
        </div>, document.body));
    }

    if (showDeleteSelectionModal) {
      overlays.push(createPortal(
        <div key="del-sel" className="fixed inset-0 bg-white z-[9999] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 border-2 border-slate-900 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertTriangle size={48} /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight text-center mb-6">Excluir Cliente</h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-transparent mb-8">
              {clientGroups.map(client => (
                <button
                  key={client.name}
                  onClick={() => setClientToDeleteName(client.name)}
                  className={`w-full flex items-center gap-3 p-4 border rounded-2xl transition-all text-left ${clientToDeleteName === client.name
                    ? 'bg-red-50 border-red-200 ring-1 ring-red-200'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                    }`}
                >
                  <Building2 size={18} className={clientToDeleteName === client.name ? 'text-red-500' : 'text-slate-400'} />
                  <span className={`font-black text-sm uppercase ${clientToDeleteName === client.name ? 'text-red-700' : 'text-slate-800'}`}>
                    {client.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => { setShowDeleteSelectionModal(false); setClientToDeleteName(null); }}
                className="flex-1 h-16 bg-slate-50 text-slate-500 rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all"
              >
                Sair
              </button>
              <button
                onClick={handleDeleteClient}
                disabled={isDeleting || !clientToDeleteName}
                className={`flex-1 h-16 rounded-[24px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${!clientToDeleteName || isDeleting
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-red-600 text-white shadow-lg shadow-red-200 active:scale-95'
                  }`}
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>, document.body));
    }

    if (showDeleteModal) {
      overlays.push(createPortal(
        <div key="asset-del" className="fixed inset-0 bg-white z-[9999] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center border-2 border-slate-900 shadow-2xl animate-in zoom-in-95">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8"><AlertTriangle size={48} /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Excluir Ativo?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-4 mb-10 leading-relaxed px-4">Esta ação apagará todos os dados técnicos deste equipamento.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 h-16 bg-slate-50 text-slate-500 rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all">Sair</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 h-16 bg-red-600 text-white rounded-[24px] font-black text-[11px] uppercase shadow-lg shadow-red-200 flex items-center justify-center gap-3 active:scale-95 transition-all">
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>, document.body));
    }

    return overlays;
  };

  return (
    <div className="space-y-6">
      {selectedClient && (
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-white rounded-xl text-slate-500 transition-all border border-slate-200 shadow-sm"><ArrowLeft size={20} /></button>
        </div>
      )}

      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066CC] transition-colors" size={20} />
          <input
            type="text"
            placeholder={selectedClient ? "Filtrar ativos deste cliente..." : "Filtrar clientes..."}
            className="w-full h-14 pl-14 pr-6 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] font-bold text-slate-800 transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {!selectedClient ? (
          <div className="grid gap-3">
            {filteredClients.map((client) => (
              <button key={client.name} onClick={() => setSelectedClient(client.name)} className="group flex items-center justify-between p-5 bg-white border border-slate-200 rounded-[24px] hover:border-[#0066CC] hover:shadow-xl hover:-translate-y-0.5 transition-all text-left">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-[#0066CC] group-hover:text-white transition-all shadow-inner border border-slate-100"><Factory size={22} /></div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-[#0055AA] transition-colors tracking-tight uppercase">{client.name}</h3>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">{client.count} ATIVOS CADASTRADOS</p>
                  </div>
                </div>
                <ChevronRight size={22} className="text-slate-200 group-hover:text-[#0066CC] transition-all" />
              </button>
            ))}
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-300 space-y-3 pb-24">
            {assetsOfSelectedClient.map((asset) => (
              <div key={asset.id} onClick={() => setSelectedAssetIdForAction(asset.id === selectedAssetIdForAction ? null : asset.id)} className={`cursor-pointer transition-all p-5 rounded-[24px] border flex items-center justify-between gap-4 group ${selectedAssetIdForAction === asset.id ? 'bg-blue-50/50 border-[#0066CC] shadow-md ring-1 ring-[#0066CC]/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedAssetIdForAction === asset.id ? 'bg-[#0066CC] border-[#0066CC] text-white' : 'border-slate-200 group-hover:border-slate-300'}`}>
                    {selectedAssetIdForAction === asset.id && <CheckCircle size={16} strokeWidth={4} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-sm uppercase truncate leading-none">{asset.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="font-black text-slate-400 text-[8px] uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">SN: {asset.serialNumber || 'N/A'}</span>
                      <span className="font-black text-blue-600 text-[8px] uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {asset.location || 'SEM LOCAL'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {isAdmin && (
                    <>
                      <button onClick={() => handleOpenEdit(asset)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil size={18} /></button>
                      <button onClick={() => { setAssetToDelete(asset); setShowDeleteModal(true); }} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-[100] animate-in slide-in-from-bottom-5">
              <div className="max-w-4xl mx-auto flex gap-4">
                <button disabled={!selectedAssetIdForAction} onClick={() => selectedAssetIdForAction && onCorrective(selectedAssetIdForAction)} className={`flex-1 h-14 rounded-[20px] font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 border ${selectedAssetIdForAction ? 'bg-white border-slate-900 text-slate-900 shadow-lg' : 'bg-slate-100 text-slate-400 border-transparent opacity-60'}`}><Wrench size={20} /> CORRETIVA</button>
                <button disabled={!selectedAssetIdForAction} onClick={() => selectedAssetIdForAction && onInspect(selectedAssetIdForAction)} className={`flex-1 h-14 rounded-[20px] font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 border ${selectedAssetIdForAction ? 'bg-white border-slate-900 text-slate-900 shadow-lg' : 'bg-slate-100 text-slate-400 border-transparent opacity-60'}`}><Settings size={20} className={selectedAssetIdForAction ? "text-slate-900" : "text-slate-400"} /> PREVENTIVA</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {renderOverlays()}
    </div>
  );
};

export default AssetManagement;
