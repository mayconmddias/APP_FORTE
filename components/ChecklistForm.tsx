import React, { useState, useEffect, useRef, useMemo } from 'react';
import GenericModal from './GenericModal';
import { v4 as uuidv4 } from 'uuid';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { CHECKLIST_PONTE, CHECKLIST_TALHA } from '../constants';
import { ChecklistItem, CraneAsset, MaintenanceRecord, MaintenanceType, UserProfile, Frequency, ChecklistType } from '../types';
import ChecklistItemCard from './ChecklistItemCard';
import ChecklistReview from './ChecklistReview';

interface ChecklistFormProps {
  onSave: (record: MaintenanceRecord) => void;
  onCancel: () => void;
  currentUser: UserProfile | null;
  initialAssetId?: string | null;
  editingRecord?: MaintenanceRecord | null;
  assets: CraneAsset[];
  nextOsNumber: number;
  onTitleChange?: (title: string | null) => void;
}

const ChecklistForm: React.FC<ChecklistFormProps> = ({ onSave, onCancel, currentUser, initialAssetId, editingRecord, assets, nextOsNumber, onTitleChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [infoModalText, setInfoModalText] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [clientName, setClientName] = useState(editingRecord?.clientRepresentative || '');
  const [clientSignature, setClientSignature] = useState(editingRecord?.clientSignature || '');
  const [frequency, setFrequency] = useState<Frequency>(editingRecord?.frequency || Frequency.MENSAL);
  const [inspectionDate, setInspectionDate] = useState(editingRecord?.date || new Date().toISOString().split('T')[0]);

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDesc, setAlertDesc] = useState('');

  const [recordId] = useState(editingRecord?.id || `h-${Date.now()}`);
  const [localId] = useState(editingRecord?.local_id || recordId);
  const [selectedAsset] = useState<CraneAsset | null>(() => {
    if (editingRecord) return assets.find(a => a.id === editingRecord.assetId) || null;
    return assets.find(a => a.id === initialAssetId) || null;
  });

  const [checklistType] = useState<ChecklistType | null>(() => {
    if (editingRecord) return editingRecord.checklistType;
    if (selectedAsset?.equipmentType === 'Talha' || selectedAsset?.equipmentType === 'Monovia') return 'TALHA_PRINCIPAL';
    return 'PONTE_PRINCIPAL';
  });

  const [items, setItems] = useState<ChecklistItem[]>(editingRecord?.checklists || []);

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  useEffect(() => {
    let pageTitle = 'INSPEÇÃO PREVENTIVA';
    if (editingRecord) {
      pageTitle = editingRecord.type === MaintenanceType.CORRETIVA ? 'EDIÇÃO DE CORRETIVA' : 'EDIÇÃO DE PREVENTIVA';
    }
    if (selectedAsset && checklistType && !items.length) {
      const template = checklistType === 'TALHA_PRINCIPAL' ? CHECKLIST_TALHA : CHECKLIST_PONTE;
      setItems(template.map((t, idx) => ({ ...t, id: `item-${idx}`, isOk: null, observation: '', photos: [] })));
    }
    onTitleChange?.(pageTitle);
  }, [selectedAsset, checklistType, editingRecord, onTitleChange, items.length]);

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const availableItems = useMemo(() => {
    if (!selectedAsset) return [];
    const base = (selectedAsset.equipmentType === 'Talha' || selectedAsset.equipmentType === 'Monovia') ? CHECKLIST_TALHA : CHECKLIST_PONTE;
    return base.map((item, idx) => ({
      ...item,
      id: `template-${idx}-${Date.now()}`,
      isOk: null,
      observation: '',
      photos: []
    } as ChecklistItem));
  }, [selectedAsset]);

  const toggleItemSelection = (item: ChecklistItem) => {
    if (items.find(i => i.label === item.label)) {
      setItems(items.filter(i => i.label !== item.label));
    } else {
      setItems([...items, { ...item, id: `add-${Date.now()}-${items.length}` }]);
    }
  };

  const visibleItems = useMemo(() => {
    const isPreventive = editingRecord ? editingRecord.type === MaintenanceType.PREVENTIVE : true;
    if (!isPreventive) return items;
    if (frequency === Frequency.MENSAL) return items.slice(0, 69);
    if (frequency === Frequency.SEMESTRAL) return items.slice(0, 76);
    return items;
  }, [items, frequency, editingRecord]);

  const isFormComplete = visibleItems.length > 0 && visibleItems.every(i => i.isOk !== null);
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  const handleSaveProgress = async () => {
    if (!selectedAsset || !currentUser) return;
    setIsSavingProgress(true);
    const draftRecord: MaintenanceRecord = {
      id: recordId,
      local_id: localId,
      inspectionNumber: editingRecord?.inspectionNumber || nextOsNumber,
      assetId: selectedAsset.id,
      type: editingRecord ? editingRecord.type : MaintenanceType.PREVENTIVE,
      checklistType: checklistType!,
      frequency: frequency,
      date: inspectionDate,
      technician: currentUser.name,
      technicianId: currentUser.id,
      downtimeHours: 0,
      checklists: visibleItems,
      clientRepresentative: clientName,
      clientSignature: clientSignature,
      signature: 'DRAFT',
      status: 'OPEN'
    };
    try {
      await onSave(draftRecord);
      setIsSavingProgress(false);
      onCancel();
    } catch (error: any) {
      console.error('Error saving draft:', error);
      setIsSavingProgress(false);
      setAlertTitle('Erro no Rascunho');
      setAlertDesc(error.message || 'Não foi possível salvar o rascunho no momento.');
      setShowAlert(true);
    }
  };

  const handleFinalSave = async () => {
    if (!selectedAsset || !currentUser) return;
    setIsSubmitting(true);
    const isEditingWithTechnician = editingRecord && editingRecord.technician;
    const finalTechnician = isEditingWithTechnician ? editingRecord.technician : currentUser.name;
    const finalTechnicianId = isEditingWithTechnician ? editingRecord.technicianId : currentUser.id;
    const newRecord: MaintenanceRecord = {
      id: recordId,
      local_id: localId,
      inspectionNumber: editingRecord?.inspectionNumber || nextOsNumber,
      assetId: selectedAsset.id,
      type: editingRecord ? editingRecord.type : MaintenanceType.PREVENTIVE,
      checklistType: checklistType!,
      frequency: frequency,
      date: inspectionDate,
      technician: finalTechnician,
      technicianId: finalTechnicianId,
      downtimeHours: 2.5,
      checklists: visibleItems,
      clientRepresentative: clientName,
      clientSignature: clientSignature,
      signature: `Técnico: ${finalTechnician} | Cliente: ${clientName}`,
      status: 'COMPLETED'
    };
    await onSave(newRecord);
    setIsSubmitting(false);
  };

  if (isSuccess) {
    return createPortal(
      <div className="fixed inset-0 bg-background z-[9999] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>task_alt</span>
        </div>
        <h2 className="font-headline font-bold text-2xl text-blue-950 uppercase">Relatório Salvo!</h2>
        <p className="text-slate-400 font-body font-bold max-w-xs mt-2 text-[11px] uppercase">A Ordem de Serviço foi sincronizada com sucesso.</p>
        <button
          onClick={onCancel}
          className="mt-10 h-14 px-10 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
        >
          Voltar ao Início
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-background z-[9999] flex flex-col animate-in slide-in-from-bottom-4 overflow-hidden">

      {/* Header */}
      <header className="bg-background border-b border-slate-100 flex items-center justify-between px-6 py-4 flex-shrink-0">
        <button onClick={onCancel} className="p-2 text-[#004a88] hover:bg-blue-50 rounded-full transition-all">
          <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '24px' }}>arrow_back</span>
        </button>
        <div className="text-center flex-1">
          <h3 className="font-headline font-bold text-base text-blue-950 uppercase">
            {editingRecord
              ? (editingRecord.type === MaintenanceType.CORRETIVA ? 'INSPEÇÃO CORRETIVA' : 'INSPEÇÃO PREVENTIVA')
              : 'INSPEÇÃO PREVENTIVA'}
          </h3>
          <p className="font-headline text-[10px] font-bold text-[#004a88] uppercase tracking-widest">
            {selectedAsset?.name} · {selectedAsset?.client}
          </p>
        </div>
        <div className="w-10" />
      </header>

      {/* Inputs de câmera/galeria — ocultos */}
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file && activePhotoItemId) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const compressed = await compressImage(reader.result as string);
            updateItem(activePhotoItemId, { photos: [compressed] });
            setActivePhotoItemId(null);
            e.target.value = '';
          };
          reader.readAsDataURL(file);
        }
      }} />
      <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file && activePhotoItemId) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const compressed = await compressImage(reader.result as string);
            updateItem(activePhotoItemId, { photos: [compressed] });
            setActivePhotoItemId(null);
            e.target.value = '';
          };
          reader.readAsDataURL(file);
        }
      }} />

      {/* Lista de itens */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3 pb-32">

        {/* Seleção de periodicidade */}
        {editingRecord?.type !== MaintenanceType.CORRETIVA && !['Monovia', 'Talha'].includes(selectedAsset?.equipmentType || '') && (
          <div className="bg-[#eef2f7] p-1 rounded-full flex items-center gap-1 mb-2">
            {Object.values(Frequency).map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`flex-1 py-2.5 rounded-full text-[10px] font-headline font-bold uppercase tracking-widest transition-all ${
                  frequency === freq ? 'bg-[#004a88] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        )}

        {/* Botão adicionar mais (corretiva) */}
        {editingRecord?.type === MaintenanceType.CORRETIVA && (
          <div className="flex items-center justify-between px-1 mb-1">
            <h3 className="font-headline font-bold text-sm text-blue-950 uppercase">{items.length} Itens</h3>
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="flex items-center gap-1 text-[#004a88] font-headline font-bold text-[11px] uppercase tracking-widest hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all"
            >
              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>add</span>
              Adicionar
            </button>
          </div>
        )}

        {visibleItems.map((item, index) => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            index={index}
            onUpdate={updateItem}
            onShowInfo={setInfoModalText}
            onTakeRef={(id) => { setActivePhotoItemId(id); setShowPhotoModal(true); }}
          />
        ))}
      </div>

      {/* Rodapé fixo */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-background border-t border-slate-100 z-[100] flex gap-3">
        {(!editingRecord || editingRecord.status === 'OPEN') && (
          <button
            onClick={handleSaveProgress}
            disabled={isSavingProgress}
            className="h-14 flex-1 rounded-full border-2 border-[#004a88] bg-white font-headline font-bold text-[11px] uppercase tracking-widest text-[#004a88] flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {isSavingProgress ? <Loader2 size={18} className="animate-spin" /> : 'SALVAR'}
          </button>
        )}
        <button
          onClick={() => setIsPreview(true)}
          disabled={!isFormComplete}
          className={`h-14 flex-1 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            isFormComplete
              ? 'bg-[#004a88] text-white shadow-lg shadow-blue-900/20 active:scale-95'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          REVISAR
          {isFormComplete && (
            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
          )}
        </button>
      </div>

      {/* Modal de escolha de foto */}
      {showPhotoModal && (
        <div
          className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/20 backdrop-blur-sm"
          onClick={() => setShowPhotoModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10 space-y-3 animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Anexar Foto</p>
            <button
              onClick={() => { setShowPhotoModal(false); setTimeout(() => cameraInputRef.current?.click(), 100); }}
              className="w-full h-14 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
              Usar Câmera
            </button>
            <button
              onClick={() => { setShowPhotoModal(false); setTimeout(() => fileInputRef.current?.click(), 100); }}
              className="w-full h-14 bg-[#eef2f7] text-blue-950 rounded-full font-headline font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>photo_library</span>
              Galeria de Fotos
            </button>
            <button
              onClick={() => setShowPhotoModal(false)}
              className="w-full h-10 text-slate-400 font-headline font-bold text-[11px] uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tela de revisão */}
      {isPreview && (
        <ChecklistReview
          items={visibleItems}
          currentUser={currentUser}
          clientName={clientName}
          clientSignature={clientSignature}
          isSubmitting={isSubmitting}
          onBack={() => setIsPreview(false)}
          onClientNameChange={setClientName}
          onClientSignatureChange={setClientSignature}
          inspectionDate={inspectionDate}
          onDateChange={setInspectionDate}
          onFinalSave={handleFinalSave}
          technicianName={editingRecord?.technician || currentUser?.name}
        />
      )}

      {/* Modal seleção de itens adicionais */}
      {isSelectorOpen && createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl h-full sm:h-[85vh] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">

            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
              <div className="w-8" />
              <div className="text-center flex-1">
                <h3 className="font-headline font-bold text-base text-blue-950 uppercase">Selecionar Itens</h3>
                <p className="font-headline text-[10px] font-bold text-[#004a88] uppercase tracking-widest">Base NR-11/12</p>
              </div>
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }}>close</span>
              </button>
            </div>

            {/* Busca */}
            <div className="px-6 py-4 border-b border-slate-50 flex-shrink-0">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none notranslate pointer-events-none" style={{ fontSize: '18px' }}>search</span>
                <input
                  type="text"
                  placeholder="Filtrar por item ou categoria..."
                  className="w-full h-11 pl-11 pr-5 bg-[#eef2f7] border-none rounded-full font-body text-base placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all"
                  value={selectorSearch}
                  onChange={e => setSelectorSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {availableItems
                .filter(i => i.label.toLowerCase().includes(selectorSearch.toLowerCase()) || i.category.toLowerCase().includes(selectorSearch.toLowerCase()))
                .map((item, idx) => {
                  const isSelected = !!items.find(s => s.label === item.label);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleItemSelection(item)}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left ${
                        isSelected
                          ? 'bg-blue-50/50 border-[#004a88]/30 shadow-sm'
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'bg-[#004a88] border-[#004a88]' : 'border-slate-200'
                      }`}>
                        {isSelected && (
                          <span className="material-symbols-outlined text-white select-none notranslate" style={{ fontSize: '14px', fontVariationSettings: "'wght' 700" }}>check</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{item.category}</p>
                        <h4 className="font-body font-bold text-xs text-blue-950 uppercase leading-snug">{item.label}</h4>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Rodapé */}
            <div className="px-6 py-5 border-t border-slate-50 flex-shrink-0">
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="w-full h-13 py-4 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
              >
                CONFIRMAR ({items.length})
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de informação do item */}
      {infoModalText && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
          onClick={() => setInfoModalText(null)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-[#004a88] select-none notranslate" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>info</span>
            </div>
            <p className="font-body text-slate-600 text-sm leading-relaxed mb-8">{infoModalText}</p>
            <button
              onClick={() => setInfoModalText(null)}
              className="w-full h-12 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest active:scale-95 transition-all"
            >
              ENTENDIDO
            </button>
          </div>
        </div>,
        document.body
      )}

      <GenericModal 
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertTitle}
        description={alertDesc}
        type="WARNING"
      />
    </div>,
    document.body
  );
};

export default ChecklistForm;
