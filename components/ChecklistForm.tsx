
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Save,
  Loader2,
  CheckCircle,
  ArrowLeft,
  FileText,
  Signature,
  HelpCircle,
  X,
  Check
} from 'lucide-react';
import { CHECKLIST_PONTE, CHECKLIST_TALHA } from '../constants';
import { ChecklistItem, CraneAsset, MaintenanceRecord, MaintenanceType, UserProfile, Frequency, ChecklistType } from '../types';

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
  const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [infoModalText, setInfoModalText] = useState<string | null>(null);
  const [clientName, setClientName] = useState(editingRecord?.clientRepresentative || '');
  const [frequency, setFrequency] = useState<Frequency>(editingRecord?.frequency || Frequency.MENSAL);

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
  }, [selectedAsset, checklistType, editingRecord, onTitleChange]);

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const visibleItems = useMemo(() => {
    if (frequency === Frequency.MENSAL) return items.slice(0, 69);
    if (frequency === Frequency.SEMESTRAL) return items.slice(0, 76);
    return items;
  }, [items, frequency]);

  const isFormComplete = visibleItems.length > 0 && visibleItems.every(i => i.isOk !== null);
  const nokCount = visibleItems.filter(i => i.isOk === false).length;
  const okCount = visibleItems.filter(i => i.isOk === true).length;

  const [isSavingProgress, setIsSavingProgress] = useState(false);

  const handleSaveProgress = async () => {
    if (!selectedAsset || !currentUser) return;
    setIsSavingProgress(true);

    // Create draft record
    const draftRecord: MaintenanceRecord = {
      id: editingRecord?.id || `draft-${Date.now()}`,
      inspectionNumber: editingRecord?.inspectionNumber || nextOsNumber,
      assetId: selectedAsset.id,
      type: editingRecord ? editingRecord.type : MaintenanceType.PREVENTIVE,
      checklistType: checklistType!,
      frequency: frequency,
      date: new Date().toISOString().split('T')[0],
      technician: currentUser.name,
      technicianId: currentUser.id,
      downtimeHours: 0,
      checklists: items,
      clientRepresentative: clientName,
      signature: 'DRAFT',
      status: 'OPEN'
    };

    try {
      await onSave(draftRecord);
      setTimeout(() => {
        setIsSavingProgress(false);
        onCancel();
      }, 800);
    } catch (error) {
      console.error("Error saving draft:", error);
      setIsSavingProgress(false);
      alert("Erro ao salvar rascunho. Tente novamente.");
    }
  };

  const handleFinalSave = async () => {
    if (!selectedAsset || !currentUser) return;
    setIsSubmitting(true);
    const newRecord: MaintenanceRecord = {
      id: editingRecord?.id || `h-${Date.now()}`,
      inspectionNumber: editingRecord?.inspectionNumber || nextOsNumber,
      assetId: selectedAsset.id,
      type: editingRecord ? editingRecord.type : MaintenanceType.PREVENTIVE,
      checklistType: checklistType!,
      frequency: frequency,
      date: new Date().toISOString().split('T')[0],
      technician: currentUser.name,
      technicianId: currentUser.id,
      downtimeHours: 2.5,
      checklists: items,
      clientRepresentative: clientName,
      signature: `Técnico: ${currentUser.name} | Cliente: ${clientName}`
    };

    await onSave(newRecord);
    // No explicit navigation needed here if onSave handles it, 
    // but in App.tsx handleAddRecord sets activeTab to 'history', 
    // which unmounts this component. 
    // So we just wait for onSave to complete.
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
            <h3 className="text-xl font-black text-slate-900 uppercase">INSPEÇÃO PREVENTIVA</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedAsset?.name} | {selectedAsset?.client}</p>
          </div>
        </div>
        <div className="w-12"></div> {/* Espaçador no lugar do X */}
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-4 pb-40">
        <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && activePhotoItemId) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const compressed = await compressImage(reader.result as string);
              updateItem(activePhotoItemId, { photos: [compressed] });
              setActivePhotoItemId(null);
            };
            reader.readAsDataURL(file);
          }
        }} />

        <div className="bg-slate-100/50 p-1 rounded-2xl flex items-center gap-1">
          {Object.values(Frequency).map((freq) => (
            <button key={freq} onClick={() => setFrequency(freq)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase ${frequency === freq ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>{freq}</button>
          ))}
        </div>

        {visibleItems.map((item, index) => (
          <div key={item.id} className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">{item.category}</p>
                  <h4 className="font-black text-slate-800 text-[11px] leading-snug uppercase"><span className="text-slate-300 mr-2">{String(index + 1).padStart(2, '0')}</span>{item.label}</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setInfoModalText(item.instruction || 'Inspeção padrão.')} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center"><HelpCircle size={16} /></button>
                  <button onClick={() => updateItem(item.id, { isOk: true })} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${item.isOk === true ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}><Check size={18} strokeWidth={4} /></button>
                  <button onClick={() => updateItem(item.id, { isOk: false })} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${item.isOk === false ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}><X size={18} strokeWidth={4} /></button>
                  <button onClick={() => { setActivePhotoItemId(item.id); fileInputRef.current?.click(); }} className={`w-9 h-9 rounded-xl flex items-center justify-center border ${item.photos?.length ? 'bg-[#0066CC] text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}><Camera size={16} /></button>
                </div>
              </div>
              <input type="text" placeholder="Observações técnicas..." value={item.observation} onChange={(e) => updateItem(item.id, { observation: e.target.value })} className="w-full h-11 px-5 border border-slate-100 rounded-xl text-[10px] bg-slate-50/30 focus:bg-white outline-none font-bold text-slate-600 uppercase" />
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-200 z-[100] flex gap-3 shadow-2xl">
        <button onClick={handleSaveProgress} disabled={isSavingProgress} className="h-16 flex-1 rounded-2xl border-2 border-slate-900 bg-white font-black text-[11px] uppercase tracking-widest text-slate-900 flex items-center justify-center gap-2">
          {isSavingProgress ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> SALVAR</>}
        </button>
        <button onClick={() => setIsPreview(true)} disabled={!isFormComplete} className={`h-16 flex-1 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${isFormComplete ? 'bg-[#0066CC] text-white' : 'bg-slate-100 text-slate-400'}`}><FileText size={18} /> Revisar</button>
      </div>

      {isPreview && (
        <div className="fixed inset-0 bg-white z-[10000] overflow-y-auto animate-in slide-in-from-bottom-10 flex flex-col">
          <header className="h-20 border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
            <button onClick={() => setIsPreview(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all"><ArrowLeft size={32} /></button>
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-900">REVISÃO</h3>
            <div className="w-10" />
          </header>
          <div className="flex-1 p-8 space-y-8 max-w-2xl mx-auto w-full">

            {/* Lista de Itens do Checklist para Revisão */}
            <div className="space-y-4">
              <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-4">Itens Inspecionados</h4>
              {visibleItems.map((item, index) => (
                <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.category}</p>
                    <h5 className="font-black text-slate-800 text-[11px] leading-snug uppercase mb-1"><span className="text-slate-300 mr-2">{String(index + 1).padStart(2, '0')}</span>{item.label}</h5>
                    {item.observation && (
                      <p className="text-[10px] text-slate-600 font-bold bg-white p-2 rounded-lg border border-slate-100 mt-2">OBS: {item.observation}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    {item.isOk === true && <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><Check size={16} strokeWidth={3} /></div>}
                    {item.isOk === false && <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center"><X size={16} strokeWidth={3} /></div>}
                    {item.photos && item.photos.length > 0 && (
                      <div className="w-8 h-8 bg-blue-100 text-[#0066CC] rounded-lg flex items-center justify-center"><Camera size={16} /></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#0066CC] p-10 rounded-[40px] shadow-2xl space-y-8">
              {/* Card Responsável Técnico */}
              <div>
                <div className="flex items-center gap-4 mb-4 text-white"><Signature size={24} /><h3 className="font-black text-white text-xs uppercase tracking-widest">Responsável Técnico</h3></div>
                <div className="w-full h-14 bg-white/10 border border-white/20 rounded-2xl text-white px-6 font-black uppercase text-xs flex items-center">
                  {currentUser?.name || 'Técnico'}
                </div>
              </div>

              {/* Card Responsável Cliente */}
              <div>
                <div className="flex items-center gap-4 mb-4 text-white"><Signature size={24} /><h3 className="font-black text-white text-xs uppercase tracking-widest">Responsável Cliente</h3></div>
                <input type="text" placeholder="Nome Completo do Representante" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full h-14 bg-white/10 border border-white/20 rounded-2xl text-white px-6 font-black uppercase text-xs outline-none focus:ring-2 focus:ring-white/40 placeholder:text-white/40" />
              </div>
            </div>

            <button onClick={handleFinalSave} disabled={!clientName || isSubmitting} className={`w-full h-20 rounded-[32px] font-black uppercase text-sm tracking-widest shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all ${clientName ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              {isSubmitting ? <Loader2 className="animate-spin text-slate-500" /> : 'GERAR OS'}
            </button>
          </div>
        </div>
      )}

      {infoModalText && createPortal(
        <div className="fixed inset-0 bg-white z-[10001] flex items-center justify-center p-6" onClick={() => setInfoModalText(null)}>
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center border-2 border-slate-900 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <p className="text-slate-700 font-bold text-sm leading-relaxed mb-8">{infoModalText}</p>
            <button onClick={() => setInfoModalText(null)} className="w-full h-14 bg-[#0066CC] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Entendido</button>
          </div>
        </div>, document.body
      )}
    </div>, document.body
  );
};

export default ChecklistForm;
