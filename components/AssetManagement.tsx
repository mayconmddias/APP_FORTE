import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Trash2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Plus,
  Building2
} from 'lucide-react';
import { CraneAsset, AssetStatus, MaintenanceRecord } from '../types';
import ClientList from './ClientList';
import AssetList from './AssetList';
import AssetFormModal from './AssetFormModal';

interface AssetManagementProps {
  history: MaintenanceRecord[];
  userRole: 'ADMIN' | 'TECNICO';
  assets: CraneAsset[];
  onInspect: (assetId: string) => void;
  onCorrective: (assetId: string) => void;
  onTitleChange?: (title: string | null) => void;
  onHeaderActionChange?: (action: React.ReactNode) => void;
  selectedClient: string | null;
  setSelectedClient: (client: string | null) => void;
  selectedAssetIdForAction: string | null;
  setSelectedAssetIdForAction: (id: string | null) => void;
  onDeleteAsset: (id: string) => Promise<void>;
  onSaveAsset: (asset: CraneAsset) => Promise<void>;
  onDeleteClient: (client: string) => Promise<void>;
}

const AssetManagement: React.FC<AssetManagementProps> = ({
  userRole,
  assets,
  onInspect,
  onCorrective,
  onTitleChange,
  onHeaderActionChange,
  selectedClient,
  setSelectedClient,
  selectedAssetIdForAction,
  setSelectedAssetIdForAction,
  onDeleteAsset,
  onSaveAsset,
  onDeleteClient
}) => {
  const isAdmin = userRole === 'ADMIN';

  const [editingAsset, setEditingAsset] = useState<CraneAsset | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  const handleDeleteClientAction = async () => {
    const targetClient = clientToDeleteName;
    if (!targetClient || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteClient(targetClient);
      setClientToDeleteName(null);
      setShowDeleteSelectionModal(false);
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
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
  }, [selectedClient, onTitleChange, setSelectedAssetIdForAction]);

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
    if (!Array.isArray(assets)) return [];

    assets.forEach(asset => {
      if (!asset || !asset.client) return;
      const normalizedName = asset.client.trim();
      if (!groups[normalizedName]) groups[normalizedName] = { name: normalizedName, count: 0 };
      groups[normalizedName].count += 1;
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  const assetsOfSelectedClient = useMemo(() => {
    if (!selectedClient || !Array.isArray(assets)) return [];
    return assets
      .filter(a => a && a.client === selectedClient)
      .filter(a => {
        const name = a.name || '';
        const sn = a.serialNumber || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sn.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const nameA = (a.name || '').trim();
        const nameB = (b.name || '').trim();
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [assets, selectedClient, searchTerm]);

  const recentOsAssetIds = useMemo(() => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const historyArray = Array.isArray(history) ? history : [];
    const recent = historyArray.filter(h => h.date && new Date(h.date) >= twentyFourHoursAgo);
    return new Set<string>(recent.map(h => String(h.assetId)));
  }, [history]);

  const handleOpenEdit = (asset: CraneAsset) => {
    setEditingAsset(asset);
    setAssetForm({ ...asset });
    setShowModal(true);
  };

  const handleSaveAssetLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const assetToSave = {
        ...assetForm,
        id: editingAsset?.id || `asset-${Date.now()}`
      } as CraneAsset;

      await onSaveAsset(assetToSave);
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
      await onDeleteAsset(assetToDelete.id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderOverlays = () => {
    const overlays = [];

    if (showDeleteSelectionModal) {
      overlays.push(createPortal(
        <div key="del-sel" className="fixed inset-0 bg-white z-[9999] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 border border-slate-200 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertTriangle size={48} /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight text-center mb-6">Excluir {clientToDeleteName || 'Cliente'}</h3>

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
                className="flex-1 h-14 bg-slate-50 text-slate-500 rounded-[20px] font-black text-[11px] uppercase tracking-widest transition-all"
              >
                Sair
              </button>
              <button
                onClick={handleDeleteClientAction}
                disabled={isDeleting || !clientToDeleteName}
                className={`flex-1 h-14 rounded-[20px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${!clientToDeleteName || isDeleting
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
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8"><AlertTriangle size={48} /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Excluir {assetToDelete?.name}?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-4 mb-10 leading-relaxed px-4">Esta ação apagará todos os dados técnicos de {assetToDelete?.name} do cliente {assetToDelete?.client}.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 h-14 bg-slate-50 text-slate-500 rounded-[20px] font-black text-[11px] uppercase tracking-widest transition-all">Sair</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 h-14 bg-red-600 text-white rounded-[20px] font-black text-[11px] uppercase shadow-lg shadow-red-200 flex items-center justify-center gap-3 active:scale-95 transition-all">
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
          <ClientList
            clients={clientGroups}
            searchTerm={searchTerm}
            onSelectClient={setSelectedClient}
          />
        ) : (
          <AssetList
            assets={assetsOfSelectedClient}
            selectedId={selectedAssetIdForAction}
            isAdmin={isAdmin}
            recentOsAssetIds={recentOsAssetIds}
            onSelect={setSelectedAssetIdForAction}
            onEdit={handleOpenEdit}
            onDelete={(asset) => { setAssetToDelete(asset); setShowDeleteModal(true); }}
            onInspect={onInspect}
            onCorrective={onCorrective}
          />
        )}
      </div>

      <AssetFormModal
        isOpen={showModal}
        isSaving={isSaving}
        editingAsset={editingAsset}
        selectedClient={selectedClient}
        assetForm={assetForm}
        onClose={() => setShowModal(false)}
        onSave={handleSaveAssetLocal}
        onFormChange={setAssetForm}
      />

      {renderOverlays()}
    </div>
  );
};

export default AssetManagement;
