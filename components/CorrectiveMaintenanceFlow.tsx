
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { getChecklistTemplate } from '../constants';
import { ChecklistItem, CraneAsset, MaintenanceRecord, MaintenanceType, UserProfile, Frequency } from '../types';
import SignaturePad from './SignaturePad';

interface CorrectiveMaintenanceFlowProps {
  onSave: (record: MaintenanceRecord) => void;
  onCancel: () => void;
  currentUser: UserProfile | null;
  assets: CraneAsset[];
  nextOsNumber: number;
  onTitleChange?: (title: string | null) => void;
  initialAssetId?: string | null;
  editingRecord?: MaintenanceRecord | null;
}

enum FlowStep {
  SELECT_CLIENT,
  SELECT_ASSET,
  BUILD_CHECKLIST,
  FILL_CHECKLIST,
  SUCCESS
}

const CorrectiveMaintenanceFlow: React.FC<CorrectiveMaintenanceFlowProps> = ({
  onSave,
  onCancel,
  currentUser,
  assets,
  nextOsNumber,
  onTitleChange,
  initialAssetId,
  editingRecord
}) => {
  const [recordId] = useState(() => editingRecord?.id || uuidv4());
  const [localId] = useState(() => editingRecord?.local_id || recordId);

  const [step, setStep] = useState<FlowStep>(() => {
    try {
      const saved = localStorage.getItem(`forte_draft_corrective_${recordId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.step !== undefined) return parsed.step;
      }
    } catch {}
    return editingRecord ? FlowStep.FILL_CHECKLIST : FlowStep.SELECT_CLIENT;
  });
  const hasSubmitted = useRef(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(`forte_draft_corrective_${recordId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.selectedClient !== undefined) return parsed.selectedClient;
      }
    } catch {}
    return null;
  });
  const [selectedAsset, setSelectedAsset] = useState<CraneAsset | null>(() => {
    try {
      const saved = localStorage.getItem(`forte_draft_corrective_${recordId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.selectedAsset !== undefined) return parsed.selectedAsset;
      }
    } catch {}
    return null;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemsTemplate, setSelectedItemsTemplate] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(`forte_draft_corrective_${recordId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.selectedItemsTemplate)) return parsed.selectedItemsTemplate;
      }
    } catch {}
    return editingRecord?.checklists || [];
  });
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [infoModalText, setInfoModalText] = useState<string | null>(null);
  const [clientName, setClientName] = useState(() => {
    try {
      const saved = localStorage.getItem(`forte_draft_corrective_${recordId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.clientName === 'string') return parsed.clientName;
      }
    } catch {}
    return editingRecord?.clientRepresentative || '';
  });
  const [clientSignature, setClientSignature] = useState(() => {
    try {
      const saved = localStorage.getItem(`forte_draft_corrective_${recordId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.clientSignature === 'string') return parsed.clientSignature;
      }
    } catch {}
    return editingRecord?.clientSignature || '';
  });
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspectionDate, setInspectionDate] = useState(() => {
    try {
      const saved = localStorage.getItem(`forte_draft_corrective_${recordId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.inspectionDate) return parsed.inspectionDate;
      }
    } catch {}
    return editingRecord?.date || new Date().toISOString().split('T')[0];
  });
  const [lastOsNumber, setLastOsNumber] = useState<number>(0);

  // Auto-save form state to localStorage
  useEffect(() => {
    try {
      const state = {
        step,
        selectedClient,
        selectedAsset,
        selectedItemsTemplate,
        clientName,
        clientSignature,
        inspectionDate
      };
      localStorage.setItem(`forte_draft_corrective_${recordId}`, JSON.stringify(state));
    } catch (error) {
      console.warn('[CorrectiveMaintenanceFlow] Limite do localStorage excedido ao salvar rascunho:', error);
    }
  }, [step, selectedClient, selectedAsset, selectedItemsTemplate, clientName, clientSignature, inspectionDate, recordId]);

  const clearDraft = () => {
    localStorage.removeItem(`forte_draft_corrective_${recordId}`);
  };

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
        else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  useEffect(() => {
    if (initialAssetId && assets.length > 0 && !selectedAsset) {
      const asset = assets.find(a => a.id === initialAssetId);
      if (asset) {
        setSelectedAsset(asset);
        setSelectedClient(asset.client);
        if (!editingRecord) setStep(FlowStep.BUILD_CHECKLIST);
      }
    }
  }, [initialAssetId, assets, selectedAsset, editingRecord]);

  useEffect(() => {
    if (step === FlowStep.SELECT_CLIENT || step === FlowStep.FILL_CHECKLIST) onTitleChange?.('INSPEÇÃO CORRETIVA');
  }, [step, onTitleChange]);

  const clientGroups = useMemo(() => {
    const groups: Record<string, { name: string; count: number }> = {};
    assets.forEach(asset => {
      const name = asset.client.trim();
      if (!groups[name]) groups[name] = { name, count: 0 };
      groups[name].count += 1;
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (!selectedClient) return [];
    return assets.filter(asset =>
      asset.client === selectedClient &&
      (asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [assets, selectedClient, searchTerm]);

  const availableItems = useMemo(() => {
    if (!selectedAsset) return [];
    const base = getChecklistTemplate(selectedAsset.equipmentType);
    return base.map((item, idx) => ({ ...item, id: `template-${idx}`, isOk: null, observation: '', photos: [] } as ChecklistItem));
  }, [selectedAsset]);

  const toggleItemSelection = (item: ChecklistItem) => {
    if (editingRecord?.checklists?.find(i => i.label === item.label)) return;
    if (selectedItemsTemplate.find(i => i.label === item.label)) {
      setSelectedItemsTemplate(selectedItemsTemplate.filter(i => i.label !== item.label));
    } else {
      setSelectedItemsTemplate([...selectedItemsTemplate, { ...item, id: `corrective-${Date.now()}-${selectedItemsTemplate.length}` }]);
    }
  };

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setSelectedItemsTemplate(selectedItemsTemplate.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleFinalSave = (isDraft = false) => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;
    
    if (!selectedAsset || !currentUser) {
      hasSubmitted.current = false;
      return;
    }
    
    setIsSubmitting(true);
    setLastOsNumber(nextOsNumber);
    const finalTechnician = currentUser.name;
    const finalTechnicianId = currentUser.id;
    const isTalhaType = ['Talha', 'Elevador de Carga', 'Encaixotadora', 'Desencaixotadora'].includes(selectedAsset.equipmentType || '');
    const newRecord: MaintenanceRecord = {
      id: recordId, local_id: localId,
      inspectionNumber: editingRecord?.inspectionNumber || nextOsNumber,
      assetId: selectedAsset.id, type: MaintenanceType.CORRETIVA,
      checklistType: isTalhaType ? 'TALHA_PRINCIPAL' : 'PONTE_PRINCIPAL',
      frequency: Frequency.MENSAL, date: inspectionDate,
      technician: finalTechnician, technicianId: finalTechnicianId,
      downtimeHours: 0,
      checklists: selectedItemsTemplate.map(i => ({ ...i })),
      clientRepresentative: clientName.toUpperCase(),
      clientSignature: clientSignature,
      signature: (clientName && clientSignature && !isDraft) ? `TÉCNICO: ${finalTechnician} | CLIENTE: ${clientName.toUpperCase()}` : 'DRAFT',
      status: (clientName && clientSignature && !isDraft) ? 'COMPLETED' : 'OPEN'
    };
    onSave(newRecord);
    clearDraft();
    setIsSubmitting(false);
    if (!isDraft) setStep(FlowStep.SUCCESS); else onCancel();
  };

  const inputClasses = "w-full bg-[#eef2f7] border-none rounded-xl py-4 px-5 text-on-surface placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-base outline-none";
  const labelClasses = "text-[11px] font-bold text-[#004a88] uppercase tracking-widest mb-2 block";

  /* --- SUCCESS --- */
  if (step === FlowStep.SUCCESS) {
    return createPortal(
      <div className="fixed inset-0 bg-background z-[9999] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
        <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-emerald-500 select-none notranslate" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>task_alt</span>
        </div>
        <h2 className="font-headline font-bold text-2xl text-blue-950 uppercase">OS #{lastOsNumber} criada!</h2>
        <p className="font-body text-sm text-slate-400 max-w-xs mt-2 uppercase">A manutenção corretiva foi registrada com sucesso.</p>
        <button onClick={() => { clearDraft(); onCancel(); }} className="mt-10 h-14 px-10 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
          Voltar ao Início
        </button>
      </div>,
      document.body
    );
  }

  /* --- SELEÇÃO DE CLIENTE / ATIVO / CONSTRUÇÃO DO CHECKLIST --- */
  if ([FlowStep.SELECT_CLIENT, FlowStep.SELECT_ASSET, FlowStep.BUILD_CHECKLIST].includes(step)) {
    return createPortal(
      <div className="fixed inset-0 bg-background z-[9999] flex flex-col animate-in slide-in-from-bottom-4 overflow-hidden">
        {/* Header */}
        <header className="bg-background border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => {
              if (step === FlowStep.BUILD_CHECKLIST) {
                if (initialAssetId) {
                  clearDraft();
                  onCancel();
                } else {
                  setStep(FlowStep.SELECT_ASSET);
                }
              }
              else if (step === FlowStep.SELECT_ASSET) setStep(FlowStep.SELECT_CLIENT);
              else {
                clearDraft();
                onCancel();
              }
            }}
            className="p-2 text-[#004a88] hover:bg-blue-50 rounded-full transition-all"
          >
            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '24px' }}>arrow_back</span>
          </button>
          <h3 className="font-headline font-bold text-base text-blue-950 uppercase tracking-widest text-center flex-1">
            {step === FlowStep.SELECT_CLIENT ? 'SELECIONAR CLIENTE' : step === FlowStep.SELECT_ASSET ? 'SELECIONAR ATIVO' : 'MONTAR CORRETIVA'}
          </h3>
          <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 max-w-4xl mx-auto w-full pb-32">
          {/* Busca */}
          {step !== FlowStep.BUILD_CHECKLIST && (
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none notranslate pointer-events-none" style={{ fontSize: '18px' }}>search</span>
              <input
                type="text"
                placeholder={step === FlowStep.SELECT_CLIENT ? 'Buscar cliente...' : 'Buscar ativo...'}
                className="w-full h-12 pl-11 pr-5 bg-[#eef2f7] border-none rounded-full font-body text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          {/* Lista de Clientes */}
          {step === FlowStep.SELECT_CLIENT && (
            <div className="space-y-2">
              {clientGroups.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                <button
                  key={client.name}
                  onClick={() => { setSelectedClient(client.name); setStep(FlowStep.SELECT_ASSET); setSearchTerm(''); }}
                  className="group w-full bg-white rounded-2xl border border-slate-100 p-5 hover:border-[#004a88]/30 hover:shadow-md transition-all shadow-[0_4px_16px_rgb(0,0,0,0.04)] flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#004a88] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-white select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>corporate_fare</span>
                    </div>
                    <div>
                      <h3 className="font-headline font-bold text-sm text-blue-950 uppercase">{client.name}</h3>
                      <p className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{client.count} ATIVOS</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-200 group-hover:text-[#004a88] select-none notranslate transition-colors" style={{ fontSize: '22px' }}>chevron_right</span>
                </button>
              ))}
            </div>
          )}

          {/* Lista de Ativos */}
          {step === FlowStep.SELECT_ASSET && (
            <div className="space-y-2">
              {filteredAssets.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => { setSelectedAsset(asset); setStep(FlowStep.BUILD_CHECKLIST); }}
                  className="group w-full bg-white rounded-2xl border border-slate-100 p-5 hover:border-[#004a88]/30 hover:shadow-md transition-all shadow-[0_4px_16px_rgb(0,0,0,0.04)] flex items-center justify-between text-left"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-body text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">{asset.client}</p>
                    <h3 className="font-headline font-bold text-sm text-blue-950 uppercase truncate">{asset.name}</h3>
                  </div>
                  <span className="material-symbols-outlined text-slate-200 group-hover:text-[#004a88] select-none notranslate flex-shrink-0 transition-colors" style={{ fontSize: '22px' }}>chevron_right</span>
                </button>
              ))}
            </div>
          )}

          {/* Construção do Checklist */}
          {step === FlowStep.BUILD_CHECKLIST && (
            <div className="space-y-4">
              {selectedItemsTemplate.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-100 py-20 flex flex-col items-center text-center px-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-slate-300 select-none notranslate" style={{ fontSize: '32px' }}>checklist</span>
                  </div>
                  <h4 className="font-headline font-bold text-sm text-blue-950 uppercase">Checklist Vazio</h4>
                  <p className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 mb-6">Adicione os itens que serão inspecionados.</p>
                  <button
                    onClick={() => setIsSelectorOpen(true)}
                    className="px-8 py-4 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>add</span> Adicionar Itens
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-headline font-bold text-sm text-blue-950 uppercase">{selectedItemsTemplate.length} Itens</h3>
                    <button onClick={() => setIsSelectorOpen(true)} className="flex items-center gap-1 text-[#004a88] font-headline font-bold text-[11px] uppercase tracking-widest hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all">
                      <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '14px' }}>add</span> Adicionar mais
                    </button>
                  </div>
                  <div className="space-y-2 pb-32">
                    {selectedItemsTemplate.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between shadow-[0_4px_16px_rgb(0,0,0,0.04)]">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-body text-[10px] font-bold text-slate-300">{String(idx + 1).padStart(2, '0')}</span>
                          <div className="min-w-0">
                            <p className="font-body text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">{item.category}</p>
                            <h4 className="font-body font-bold text-[11px] text-blue-950 uppercase truncate">{item.label}</h4>
                          </div>
                        </div>
                        <button onClick={() => toggleItemSelection(item)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all flex-shrink-0">
                          <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Rodapé fixo (Build Checklist) */}
        {step === FlowStep.BUILD_CHECKLIST && selectedItemsTemplate.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-background border-t border-slate-100 flex gap-3">
            <button onClick={() => handleFinalSave(true)} className="flex-1 h-14 bg-white border-2 border-[#004a88] text-[#004a88] rounded-full font-headline font-bold text-sm uppercase tracking-widest active:scale-95 transition-all">
              SALVAR
            </button>
            <button onClick={() => setStep(FlowStep.FILL_CHECKLIST)} className="flex-1 h-14 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>play_arrow</span> INICIAR
            </button>
          </div>
        )}

        {/* Modal seletor */}
        {isSelectorOpen && createPortal(
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-0 sm:p-6">
            <div className="bg-white w-full max-w-2xl h-full sm:h-[85vh] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                <div className="w-8" />
                <div className="text-center flex-1">
                  <h3 className="font-headline font-bold text-base text-blue-950 uppercase">Selecionar Itens</h3>
                  <p className="font-body text-[10px] font-bold text-[#004a88] uppercase tracking-widest">Base NR-11/12</p>
                </div>
                <button onClick={() => setIsSelectorOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }}>close</span>
                </button>
              </div>
              <div className="px-6 py-4 border-b border-slate-50">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none notranslate pointer-events-none" style={{ fontSize: '18px' }}>search</span>
                  <input type="text" placeholder="Filtrar por item ou categoria..." className="w-full h-11 pl-11 pr-5 bg-[#eef2f7] border-none rounded-full font-body text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 outline-none transition-all" value={selectorSearch} onChange={e => setSelectorSearch(e.target.value)} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {availableItems.filter(i => i.label.toLowerCase().includes(selectorSearch.toLowerCase()) || i.category.toLowerCase().includes(selectorSearch.toLowerCase())).map((item, idx) => {
                  const isSelected = !!selectedItemsTemplate.find(s => s.label === item.label);
                  const isOriginal = !!editingRecord?.checklists?.find(s => s.label === item.label);
                  return (
                    <button key={idx} onClick={() => !isOriginal && toggleItemSelection(item)} disabled={isOriginal}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left ${isSelected ? 'bg-blue-50/50 border-[#004a88]/30' : 'bg-white border-slate-100 hover:border-slate-200'} ${isOriginal ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#004a88] border-[#004a88]' : 'border-slate-200'}`}>
                        {isSelected && <span className="material-symbols-outlined text-white select-none notranslate" style={{ fontSize: '14px', fontVariationSettings: "'wght' 700" }}>check</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-body text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.category} {isOriginal && '(ORIGINAL)'}</p>
                        <h4 className="font-body font-bold text-xs text-blue-950 uppercase">{item.label}</h4>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="px-6 py-5 border-t border-slate-50">
                <button onClick={() => setIsSelectorOpen(false)} className="w-full h-13 py-4 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                  CONFIRMAR ({selectedItemsTemplate.length})
                </button>
              </div>
            </div>
          </div>, document.body
        )}
      </div>,
      document.body
    );
  }

  /* --- PREENCHER CHECKLIST --- */
  if (step === FlowStep.FILL_CHECKLIST) {
    const isReadyToFinish = !!clientName && !!clientSignature && !selectedItemsTemplate.some(i => i.isOk === null);
    return createPortal(
      <div className="fixed inset-0 bg-background z-[9999] flex flex-col animate-in fade-in overflow-hidden">
        {/* Header */}
        <header className="bg-background border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setStep(FlowStep.BUILD_CHECKLIST)} className="p-2 text-[#004a88] hover:bg-blue-50 rounded-full transition-all">
            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '24px' }}>arrow_back</span>
          </button>
          <div className="text-center flex-1">
            <h3 className="font-headline font-bold text-base text-blue-950 uppercase">INSPEÇÃO CORRETIVA</h3>
            {selectedAsset && <p className="font-headline text-[10px] font-bold text-[#004a88] uppercase tracking-widest">{selectedAsset.name} · {selectedAsset.client}</p>}
          </div>
          <div className="w-10" />
        </header>

        {/* Inputs ocultos */}
        <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0 && activePhotoItemId) {
            const reader = new FileReader();
            // Since we need to read multiple files sequentially, we can create a promise loop or process them
            const processFiles = async () => {
              try {
                const newPhotos: string[] = [];
                for (let i = 0; i < files.length; i++) {
                  const file = files[i];
                  const base64 = await new Promise<string>((resolve) => {
                    const r = new FileReader();
                    r.onloadend = () => resolve(r.result as string);
                    r.readAsDataURL(file);
                  });
                  const compressed = await compressImage(base64);
                  newPhotos.push(compressed);
                }
                const item = selectedItemsTemplate.find(i => i.id === activePhotoItemId);
                const currentPhotos = item?.photos || [];
                updateItem(activePhotoItemId, { photos: [...currentPhotos, ...newPhotos] });
              } catch (err) {
                console.error('[CorrectiveFlow] Erro ao anexar múltiplas imagens da galeria:', err);
              } finally {
                setActivePhotoItemId(null); e.target.value = '';
              }
            };
            processFiles();
          }
        }} />
        <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activePhotoItemId) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              try {
                if (typeof reader.result === 'string') {
                  const compressed = await compressImage(reader.result);
                  const item = selectedItemsTemplate.find(i => i.id === activePhotoItemId);
                  const currentPhotos = item?.photos || [];
                  updateItem(activePhotoItemId, { photos: [...currentPhotos, compressed] });
                }
              } catch (err) {
                console.error('[CorrectiveFlow] Erro ao anexar imagem da câmera:', err);
              } finally {
                setActivePhotoItemId(null); e.target.value = '';
              }
            };
            reader.readAsDataURL(file);
          }
        }} />

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3 pb-40">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Items do checklist */}
            {selectedItemsTemplate.map((item, index) => (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-[0_4px_16px_rgb(0,0,0,0.04)] p-4 ${item.isOk === true ? 'border-emerald-100' : item.isOk === false ? 'border-red-100' : 'border-slate-100'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-body text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{item.category}</p>
                    <h4 className="font-body font-bold text-blue-950 text-[11px] leading-snug uppercase">
                      <span className="text-slate-300 mr-2">{String(index + 1).padStart(2, '0')}</span>{item.label}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setInfoModalText(item.instruction || 'Inspeção técnica padrão.')} className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 hover:bg-blue-50 hover:text-[#004a88] transition-all flex items-center justify-center">
                      <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>help</span>
                    </button>
                    <button onClick={() => updateItem(item.id, { isOk: true })} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${item.isOk === true ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-300 hover:bg-emerald-50 hover:text-emerald-500'}`}>
                      <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                    </button>
                    <button onClick={() => updateItem(item.id, { isOk: false })} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${item.isOk === false ? 'bg-red-500 text-white shadow-md' : 'bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500'}`}>
                      <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'wght' 700" }}>close</span>
                    </button>
                    <button onClick={() => { setActivePhotoItemId(item.id); setShowPhotoModal(true); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${item.photos?.length ? 'bg-[#004a88] text-white shadow-md' : 'bg-slate-50 text-slate-300 hover:bg-blue-50 hover:text-[#004a88]'}`}>
                      <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>photo_camera</span>
                    </button>
                  </div>
                </div>
                {/* Thumbnails (Múltiplas fotos) */}
                {item.photos && item.photos.length > 0 && (
                  <div className="mt-2 mb-3 flex flex-wrap gap-2">
                    {item.photos.map((photo, pIdx) => (
                      <div key={pIdx} className="relative inline-block">
                        <img src={photo} className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-sm" />
                        <button 
                          onClick={() => {
                            const newPhotos = item.photos ? item.photos.filter((_, idx) => idx !== pIdx) : [];
                            updateItem(item.id, { photos: newPhotos });
                          }} 
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '12px' }}>close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Campo de observação */}
                <input
                  type="text"
                  placeholder="OBSERVAÇÕES"
                  value={item.observation || ''}
                  onChange={(e) => updateItem(item.id, { observation: e.target.value })}
                  className="w-full h-10 px-4 bg-[#eef2f7] border-none rounded-xl text-[10px] font-body font-bold text-slate-600 uppercase placeholder:text-[8px] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            ))}

            {/* Seção de assinaturas */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] p-6 space-y-6 mt-4">
              <div>
                <label className={labelClasses}>DATA DA INSPEÇÃO</label>
                <input type="date" className={inputClasses} value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} />
              </div>
              <div>
                <label className={labelClasses}>RESPONSÁVEL TÉCNICO</label>
                <div className="w-full bg-[#eef2f7] rounded-xl py-4 px-5 font-headline font-bold text-sm text-blue-950 uppercase">
                  {editingRecord?.technician || currentUser?.name || 'TÉCNICO NÃO IDENTIFICADO'}
                </div>
              </div>
              <div>
                <label className={labelClasses}>RESPONSÁVEL CLIENTE</label>
                <input type="text" placeholder="NOME COMPLETO DO REPRESENTANTE" className={inputClasses} value={clientName} onChange={e => setClientName(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className={labelClasses}>ASSINATURA DO CLIENTE</label>
                <div onClick={() => setShowSignaturePad(true)} className={`w-full aspect-[4/2] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative transition-all ${clientSignature ? 'border-[#004a88]/30 bg-blue-50/20' : 'border-slate-200 bg-[#eef2f7] hover:border-[#004a88]/30'}`}>
                  {clientSignature ? (
                    <>
                      <img src={clientSignature} alt="Assinatura" className="w-full h-full object-contain p-4" />
                      <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm text-[#004a88]">
                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>edit</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-slate-300 select-none notranslate mb-2" style={{ fontSize: '32px' }}>draw</span>
                      <span className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique para assinar</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-background border-t border-slate-100 flex gap-3 z-[100]">
          <button onClick={() => handleFinalSave(true)} className="h-14 flex-1 bg-white border-2 border-[#004a88] text-[#004a88] rounded-full font-headline font-bold text-sm uppercase tracking-widest active:scale-95 transition-all">
            SALVAR
          </button>
          <button
            disabled={!isReadyToFinish || isSubmitting}
            onClick={() => handleFinalSave(false)}
            className={`h-14 flex-1 rounded-full font-headline font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isReadyToFinish && !isSubmitting ? 'bg-[#004a88] text-white shadow-lg shadow-blue-900/20 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'GERAR CORRETIVA'}
          </button>
        </div>

        {/* Modal de foto */}
        {showPhotoModal && (
          <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowPhotoModal(false)}>
            <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10 space-y-3 animate-in slide-in-from-bottom-4" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              <p className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">Anexar Foto</p>
              <button onClick={() => { setShowPhotoModal(false); setTimeout(() => cameraInputRef.current?.click(), 100); }} className="w-full h-14 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>photo_camera</span> Usar Câmera
              </button>
              <button onClick={() => { setShowPhotoModal(false); setTimeout(() => fileInputRef.current?.click(), 100); }} className="w-full h-14 bg-[#eef2f7] text-blue-950 rounded-full font-headline font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>photo_library</span> Galeria de Fotos
              </button>
              <button onClick={() => setShowPhotoModal(false)} className="w-full h-10 text-slate-400 font-headline font-bold text-[11px] uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        )}

        {/* Modal info */}
        {infoModalText && createPortal(
          <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={() => setInfoModalText(null)}>
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-[#004a88] select-none notranslate" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>info</span>
              </div>
              <p className="font-body text-slate-600 text-sm leading-relaxed mb-8">{infoModalText}</p>
              <button onClick={() => setInfoModalText(null)} className="w-full h-12 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest active:scale-95 transition-all">ENTENDIDO</button>
            </div>
          </div>, document.body
        )}

        {showSignaturePad && (
          <SignaturePad onSave={(sig) => { setClientSignature(sig); setShowSignaturePad(false); }} onCancel={() => setShowSignaturePad(false)} />
        )}
      </div>,
      document.body
    );
  }

  return null;
};

export default CorrectiveMaintenanceFlow;
