import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { CraneAsset, AssetStatus, MaintenanceRecord } from '../types';
import ClientList from './ClientList';
import AssetList from './AssetList';
import AssetFormModal from './AssetFormModal';
import GenericModal from './GenericModal';

interface AssetManagementProps {
  history: MaintenanceRecord[];
  userRole: 'ADMIN' | 'TECNICO' | 'TECNICO_EQUIPAMENTO';
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

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDesc, setAlertDesc] = useState('');

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
      onTitleChange?.(`ATIVOS | ${selectedClient}`);
    } else {
      onTitleChange?.('CLIENTES');
      setSelectedAssetIdForAction(null);
    }
    setSearchTerm('');
  }, [selectedClient, onTitleChange, setSelectedAssetIdForAction]);

  useEffect(() => {
    if (isAdmin) {
      onHeaderActionChange?.(
        <div className="flex items-center gap-1">
          {!selectedClient && (
            <button
              onClick={() => setShowDeleteSelectionModal(true)}
              className="text-[#004a88] hover:bg-slate-100 transition-colors p-2 rounded-full active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined font-bold">delete</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="text-[#004a88] hover:bg-slate-100 transition-colors p-2 rounded-full active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined font-bold">add</span>
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
    } catch (error: any) {
      console.error(error);
      setAlertTitle('Erro no Salvamento');
      setAlertDesc(error.message || 'Não foi possível salvar os dados do ativo.');
      setShowAlert(true);
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
        <div
          key="del-sel"
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => { setShowDeleteSelectionModal(false); setClientToDeleteName(null); }}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl p-8 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Ícone */}
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-red-500 select-none notranslate" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>

            {/* Título */}
            <h3 className="font-headline font-bold text-xl text-blue-950 uppercase text-center mb-6">
              Excluir Cliente
            </h3>

            {/* Lista de clientes */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-6">
              {clientGroups.map(client => (
                <button
                  key={client.name}
                  onClick={() => setClientToDeleteName(client.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left border ${
                    clientToDeleteName === client.name
                      ? 'bg-red-50 border-red-200'
                      : 'bg-[#eef2f7] border-transparent hover:border-red-100'
                  }`}
                >
                  <span className={`material-symbols-outlined select-none notranslate flex-shrink-0 ${
                    clientToDeleteName === client.name ? 'text-red-500' : 'text-slate-400'
                  }`} style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>corporate_fare</span>
                  <span className={`font-headline font-bold text-sm uppercase ${
                    clientToDeleteName === client.name ? 'text-red-700' : 'text-blue-950'
                  }`}>
                    {client.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteSelectionModal(false); setClientToDeleteName(null); }}
                className="flex-1 h-12 font-headline font-bold text-[11px] uppercase tracking-widest text-[#004a88] hover:bg-blue-50 rounded-full transition-all"
              >
                SAIR
              </button>
              <button
                onClick={handleDeleteClientAction}
                disabled={isDeleting || !clientToDeleteName}
                className={`flex-1 h-12 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  !clientToDeleteName || isDeleting
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-red-500 text-white shadow-md shadow-red-200 active:scale-95'
                }`}
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ));
    }

    if (showDeleteModal) {
      overlays.push(createPortal(
        <div
          key="asset-del"
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-red-500 select-none notranslate" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <h3 className="font-headline font-bold text-xl text-blue-950 uppercase">
              Excluir {assetToDelete?.name}?
            </h3>
            <p className="font-body text-[11px] font-bold text-slate-400 uppercase mt-3 mb-8 leading-relaxed px-2">
              Esta ação apagará todos os dados técnicos de <span className="text-slate-700">{assetToDelete?.name}</span> do cliente {assetToDelete?.client}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-12 font-headline font-bold text-[11px] uppercase tracking-widest text-[#004a88] hover:bg-blue-50 rounded-full transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 h-12 bg-red-500 text-white rounded-full font-headline font-bold text-[11px] uppercase tracking-widest shadow-md shadow-red-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ));
    }

    return overlays;
  };

  return (
    <div className="space-y-6">
      {selectedClient && (
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedClient(null)} className="p-2 text-[#004a88] hover:bg-blue-50 rounded-full transition-all">
            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }}>arrow_back</span>
          </button>
        </div>
      )}

      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="relative group w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
          <input
            type="text"
            placeholder={selectedClient ? "Filtrar ativos deste cliente..." : "Filtrar clientes..."}
            className="w-full bg-surface-container-low border-none rounded-full py-4 pl-12 pr-6 text-on-surface focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline font-medium text-base"
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

      <GenericModal 
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertTitle}
        description={alertDesc}
        type="WARNING"
      />

      {renderOverlays()}
    </div>
  );
};

export default AssetManagement;
