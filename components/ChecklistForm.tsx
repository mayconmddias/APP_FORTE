import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createPortal } from 'react-dom';
import {
  Loader2,
  CheckCircle,
  ArrowLeft,
  X,
  Search
} from 'lucide-react';
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
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // 0.7 quality
      };
    });
  };

  useEffect(() => {
    let pageTitle = 'MANUTENÇÃO PREVENTIVA';
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
    } catch (error) {
      console.error("Error saving draft:", error);
      setIsSavingProgress(false);
      alert("Erro ao salvar rascunho. Tente novamente.");
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
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl"><CheckCircle size={48} /></div>
        <h2 className="text-3xl font-black text-slate-900 uppercase">Relatório Salvo!</h2>
        <p className="text-slate-500 font-medium max-w-xs mt-2 text-[10px] uppercase">A Ordem de Serviço foi sincronizada com sucesso.</p>
        <button onClick={onCancel} className="mt-10 h-14 px-8 bg-[#0066CC] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Voltar ao Início</button>
      </div>, document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col animate-in slide-in-from-bottom-5 overflow-hidden">
      <header className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-3 hover:bg-slate-200 rounded-full text-slate-500 transition-all"><ArrowLeft size={32} /></button>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase">
              {editingRecord
                ? (editingRecord.type === MaintenanceType.CORRETIVA ? 'INSPEÇÃO CORRETIVA' : 'INSPEÇÃO PREVENTIVA')
                : 'INSPEÇÃO PREVENTIVA'}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedAsset?.name} | {selectedAsset?.client}</p>
          </div>
        </div>
        <div className="w-12"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-4 pb-40">
        {/* Input para galeria (sem capture) */}
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
      {/* Input para câmera (com capture) */}
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

        {editingRecord?.type === MaintenanceType.CORRETIVA && (
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{items.length} Itens Selecionados</h3>
            <button onClick={() => setIsSelectorOpen(true)} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">+ Adicionar mais</button>
          </div>
        )}

        {editingRecord?.type !== MaintenanceType.CORRETIVA && !['Monovia', 'Talha'].includes(selectedAsset?.equipmentType || '') && (
          <div className="bg-slate-100/50 p-1 rounded-2xl flex items-center gap-1">
            {Object.values(Frequency).map((freq) => (
              <button key={freq} onClick={() => setFrequency(freq)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase ${frequency === freq ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>{freq}</button>
            ))}
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

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-200 z-[100] flex gap-3 shadow-2xl">
        {(!editingRecord || editingRecord.status === 'OPEN') && (
          <button onClick={handleSaveProgress} disabled={isSavingProgress} className="h-14 flex-1 rounded-[20px] border-2 border-slate-900 bg-white font-black text-[11px] uppercase tracking-widest text-slate-900 flex items-center justify-center gap-2">
            {isSavingProgress ? <Loader2 size={18} className="animate-spin" /> : 'SALVAR'}
          </button>
        )}
        <button onClick={() => setIsPreview(true)} disabled={!isFormComplete} className={`h-14 flex-1 rounded-[20px] font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${isFormComplete ? 'bg-[#0066CC] text-white' : 'bg-slate-100 text-slate-400'}`}>REVISAR</button>
      </div>

      {/* Modal de escolha: câmera ou galeria */}
      {showPhotoModal && (
        <div
          className="fixed inset-0 z-[10002] flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowPhotoModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-[40px] p-6 pb-10 space-y-3 animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Anexar Foto</p>
            <button
              onClick={() => { setShowPhotoModal(false); setTimeout(() => cameraInputRef.current?.click(), 100); }}
              className="w-full h-16 bg-[#0066CC] text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-100 active:scale-95 transition-all"
            >
              <span className="text-xl">📷</span> Usar Câmera
            </button>
            <button
              onClick={() => { setShowPhotoModal(false); setTimeout(() => fileInputRef.current?.click(), 100); }}
              className="w-full h-16 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <span className="text-xl">🖼️</span> Galeria de Fotos
            </button>
            <button
              onClick={() => setShowPhotoModal(false)}
              className="w-full h-12 text-slate-400 font-black text-xs uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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

      {isSelectorOpen && createPortal(
        <div className="fixed inset-0 bg-white z-[10000] flex items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl h-full sm:h-[85vh] sm:rounded-[48px] flex flex-col overflow-hidden border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Selecionar Itens</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de dados NR-11/12</p>
              </div>
              <button onClick={() => setIsSelectorOpen(false)} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={32} /></button>
            </div>
            <div className="p-6 bg-white border-b border-slate-50">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="text" placeholder="Filtrar por nome ou categoria..." className="w-full h-14 pl-14 pr-6 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all" value={selectorSearch} onChange={e => setSelectorSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-slate-50/50">
              {availableItems.filter(i => i.label.toLowerCase().includes(selectorSearch.toLowerCase()) || i.category.toLowerCase().includes(selectorSearch.toLowerCase())).map((item, idx) => {
                const isSelected = !!items.find(s => s.label === item.label);
                return (
                  <button key={idx} onClick={() => toggleItemSelection(item)} className={`w-full p-5 rounded-[20px] border transition-all flex items-center justify-between text-left group ${isSelected ? 'bg-blue-50/50 border-[#0066CC] shadow-md ring-1 ring-[#0066CC]/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#0066CC] border-[#0066CC] text-white' : 'border-slate-200 group-hover:border-slate-300'}`}>
                        {isSelected && <CheckCircle size={14} strokeWidth={4} className="text-white" />}
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{item.category}</p>
                        <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">{item.label}</h4>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
              <button onClick={() => setIsSelectorOpen(false)} className="w-1/2 h-14 bg-[#0066CC] text-white rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">CONFIRMAR ({items.length})</button>
            </div>
          </div>
        </div>, document.body
      )}

      {infoModalText && createPortal(
        <div className="fixed inset-0 bg-white z-[10001] flex items-center justify-center p-6" onClick={() => setInfoModalText(null)}>
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center border border-slate-200 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <p className="text-slate-700 font-bold text-sm leading-relaxed mb-8">{infoModalText}</p>
            <button onClick={() => setInfoModalText(null)} className="w-full h-14 bg-[#0066CC] text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Entendido</button>
          </div>
        </div>, document.body
      )}
    </div>, document.body
  );
};

export default ChecklistForm;
