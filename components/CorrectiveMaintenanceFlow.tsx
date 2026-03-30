
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createPortal } from 'react-dom';
import {
  Search,
  ArrowLeft,
  ChevronRight,
  PlusCircle,
  CheckCircle2,
  Camera,
  FileText,
  Loader2,
  Signature,
  HelpCircle,
  X,
  Check,
  ClipboardList,
  Building2,
  CheckCircle
} from 'lucide-react';
import { CHECKLIST_PONTE, CHECKLIST_TALHA } from '../constants';
import { ChecklistItem, CraneAsset, MaintenanceRecord, MaintenanceType, UserProfile, Frequency } from '../types';

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
  const [step, setStep] = useState<FlowStep>(editingRecord ? FlowStep.FILL_CHECKLIST : FlowStep.SELECT_CLIENT);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CraneAsset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedItemsTemplate, setSelectedItemsTemplate] = useState<ChecklistItem[]>(editingRecord?.checklists || []);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(null);
  const [infoModalText, setInfoModalText] = useState<string | null>(null);
  const [clientName, setClientName] = useState(editingRecord?.clientRepresentative || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOsNumber, setLastOsNumber] = useState<number>(0);

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
        if (!editingRecord) {
          setStep(FlowStep.BUILD_CHECKLIST);
        }
      }
    }
  }, [initialAssetId, assets, selectedAsset, editingRecord]);

  useEffect(() => {
    if (step === FlowStep.SELECT_CLIENT) onTitleChange?.('MANUTENÇÃO CORRETIVA');
    if (step === FlowStep.FILL_CHECKLIST) onTitleChange?.('MANUTENÇÃO CORRETIVA');
  }, [step, onTitleChange]);

  const clientGroups = useMemo(() => {
    const groups: Record<string, { name: string; count: number }> = {};
    assets.forEach(asset => {
      const normalizedName = asset.client.trim();
      if (!groups[normalizedName]) groups[normalizedName] = { name: normalizedName, count: 0 };
      groups[normalizedName].count += 1;
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
    const base = (selectedAsset.equipmentType === 'Talha' || selectedAsset.equipmentType === 'Monovia') ? CHECKLIST_TALHA : CHECKLIST_PONTE;
    return base.map((item, idx) => ({
      ...item,
      id: `template-${idx}`,
      isOk: null,
      observation: '',
      photos: []
    } as ChecklistItem));
  }, [selectedAsset]);

  const toggleItemSelection = (item: ChecklistItem) => {
    // Se estiver editando e o item já estava no registro original, não permite desmarcar ou alterar
    if (editingRecord?.checklists?.find(i => i.label === item.label)) {
      return;
    }

    if (selectedItemsTemplate.find(i => i.label === item.label)) {
      setSelectedItemsTemplate(selectedItemsTemplate.filter(i => i.label !== item.label));
    } else {
      setSelectedItemsTemplate([...selectedItemsTemplate, { ...item, id: `corrective-${Date.now()}-${selectedItemsTemplate.length}` }]);
    }
  };

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setSelectedItemsTemplate(selectedItemsTemplate.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleFinalSave = (isDraft: boolean = false) => {
    if (!selectedAsset || !currentUser) return;
    setIsSubmitting(true);
    setLastOsNumber(nextOsNumber);

    const id = editingRecord?.id || `h-${Date.now()}`;
    const localId = editingRecord?.local_id || uuidv4();

    const isEditingWithTechnician = editingRecord && editingRecord.technician;
    const finalTechnician = isEditingWithTechnician ? editingRecord.technician! : currentUser.name;
    const finalTechnicianId = isEditingWithTechnician ? editingRecord.technicianId! : currentUser.id;

    const newRecord: MaintenanceRecord = {
      id: id,
      local_id: localId,
      inspectionNumber: editingRecord?.inspectionNumber || nextOsNumber,
      assetId: selectedAsset.id,
      type: MaintenanceType.CORRETIVA,
      checklistType: (selectedAsset.equipmentType === 'Talha' || selectedAsset.equipmentType === 'Monovia') ? 'TALHA_PRINCIPAL' : 'PONTE_PRINCIPAL',
      frequency: Frequency.MENSAL,
      date: editingRecord?.date || new Date().toISOString().split('T')[0],
      technician: finalTechnician,
      technicianId: finalTechnicianId,
      downtimeHours: 0,
      checklists: selectedItemsTemplate.map(i => ({ ...i })),
      clientRepresentative: clientName,
      signature: (clientName && !isDraft) ? `TÉCNICO: ${finalTechnician} | CLIENTE: ${clientName}` : 'DRAFT',
      status: (clientName && !isDraft) ? 'COMPLETED' : 'OPEN'
    };

    onSave(newRecord);
    setIsSubmitting(false);
    if (!isDraft) {
      setStep(FlowStep.SUCCESS);
    } else {
      onCancel();
    }
  };


  if (step === FlowStep.SUCCESS) {
    return createPortal(
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl"><CheckCircle size={48} /></div>
        <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase">OS CORRETIVA #{lastOsNumber} CRIADA!</h2>
        <p className="text-slate-500 font-medium max-w-sm uppercase text-[10px]">A manutenção foi registrada com sucesso.</p>
        <button onClick={onCancel} className="mt-8 h-14 px-8 bg-[#0066CC] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Voltar ao Início</button>
      </div>, document.body
    );
  }

  const renderHeader = (title: string, onBack?: () => void) => (
    <header className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-3 hover:bg-slate-200 rounded-full text-slate-500 transition-all"><ArrowLeft size={32} /></button>
        )}
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
          {selectedAsset && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedAsset.name} | {selectedAsset.client}</p>}
        </div>
      </div>
      <div className="w-12"></div> {/* Espaçador removendo o X */}
    </header>
  );

  if (step === FlowStep.SELECT_CLIENT || step === FlowStep.SELECT_ASSET || step === FlowStep.BUILD_CHECKLIST) {
    return createPortal(
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col animate-in slide-in-from-bottom-5 overflow-hidden">
        {renderHeader(step === FlowStep.SELECT_CLIENT ? 'NOVO CLIENTE' : (step === FlowStep.SELECT_ASSET ? 'Selecionar Ativo' : 'Montar Corretiva'),
          () => {
            if (step === FlowStep.SELECT_CLIENT) return; // Should not happen as onBack is undefined for this case in the ternary below if we followed original logic, but here we are cleaning up.

            if (step === FlowStep.BUILD_CHECKLIST) {
              if (initialAssetId) {
                onCancel();
              } else {
                setStep(FlowStep.SELECT_ASSET);
              }
            } else if (step === FlowStep.SELECT_ASSET) {
              setStep(FlowStep.SELECT_CLIENT);
            }
          }
        )}

        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-4xl mx-auto space-y-6">
            {step !== FlowStep.BUILD_CHECKLIST && (
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder={step === FlowStep.SELECT_CLIENT ? "Buscar cliente..." : "Buscar ativo..."}
                  className="w-full h-14 pl-14 pr-6 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] font-bold text-slate-800 text-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            {step === FlowStep.SELECT_CLIENT && (
              <div className="grid gap-2">
                {clientGroups.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                  <button key={client.name} onClick={() => { setSelectedClient(client.name); setStep(FlowStep.SELECT_ASSET); setSearchTerm(''); }} className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-[#0066CC] hover:shadow-xl transition-all flex items-center justify-between text-left">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-[#0066CC] group-hover:text-white border border-slate-100 shadow-inner"><Building2 size={20} /></div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{client.name}</h3>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{client.count} ATIVOS</span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-200 group-hover:text-[#0066CC]" />
                  </button>
                ))}
              </div>
            )}

            {step === FlowStep.SELECT_ASSET && (
              <div className="grid gap-2">
                {filteredAssets.map(asset => (
                  <button key={asset.id} onClick={() => { setSelectedAsset(asset); setStep(FlowStep.BUILD_CHECKLIST); }} className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-[#0066CC] hover:shadow-xl transition-all flex items-center justify-between text-left">
                    <div className="min-w-0 pr-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{asset.client}</p>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-[#0055AA] transition-colors uppercase tracking-tight truncate">{asset.name}</h3>
                    </div>
                    <ChevronRight size={20} className="text-slate-200 group-hover:text-[#0066CC]" />
                  </button>
                ))}
              </div>
            )}

            {step === FlowStep.BUILD_CHECKLIST && (
              <div className="space-y-6">
                {selectedItemsTemplate.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white text-slate-200 rounded-full flex items-center justify-center mx-auto mb-6"><ClipboardList size={40} /></div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Checklist Vazio</h4>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Adicione os itens que serão inspecionados.</p>
                    <button onClick={() => setIsSelectorOpen(true)} className="mt-8 px-8 py-4 bg-[#0066CC] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 mx-auto active:scale-95 transition-all"><PlusCircle size={20} className="text-white" /> Adicionar Itens</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{selectedItemsTemplate.length} Itens Selecionados</h3>
                      <button onClick={() => setIsSelectorOpen(true)} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">+ Adicionar mais</button>
                    </div>
                    <div className="grid gap-2 pb-24">
                      {selectedItemsTemplate.map((item, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between text-left shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-300 font-mono">{String(idx + 1).padStart(2, '0')}</span>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{item.category}</p>
                              <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">{item.label}</h4>
                            </div>
                          </div>
                          <button onClick={() => toggleItemSelection(item)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={20} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedItemsTemplate.length > 0 && (
                  <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 flex gap-4">
                    <button onClick={() => handleFinalSave(true)} className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-[20px] font-black text-xs uppercase">SALVAR</button>
                    <button onClick={() => setStep(FlowStep.FILL_CHECKLIST)} className="flex-1 h-14 bg-emerald-600 text-white rounded-[20px] font-black text-xs uppercase shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-95 transition-all"><CheckCircle2 size={24} /> Iniciar</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isSelectorOpen && createPortal(
          <div className="fixed inset-0 bg-white z-[10000] flex items-center justify-center p-0 sm:p-6 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl h-full sm:h-[85vh] sm:rounded-[48px] flex flex-col overflow-hidden border-0 sm:border-2 border-slate-900 shadow-2xl animate-in zoom-in-95">
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
                  const isSelected = !!selectedItemsTemplate.find(s => s.label === item.label);
                  const isOriginal = !!editingRecord?.checklists?.find(s => s.label === item.label);

                  return (
                    <button
                      key={idx}
                      onClick={() => !isOriginal && toggleItemSelection(item)}
                      disabled={isOriginal}
                      className={`w-full p-5 rounded-[20px] border transition-all flex items-center justify-between text-left group ${isSelected ? 'bg-blue-50/50 border-[#0066CC] shadow-md ring-1 ring-[#0066CC]/20' : 'bg-white border-slate-200 hover:border-slate-300'} ${isOriginal ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#0066CC] border-[#0066CC] text-white' : 'border-slate-200 group-hover:border-slate-300'}`}>
                          {isSelected && <Check size={14} strokeWidth={4} />}
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{item.category} {isOriginal && '(ORIGINAL)'}</p>
                          <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">{item.label}</h4>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
                <button onClick={() => setIsSelectorOpen(false)} className="w-1/2 h-14 bg-[#0066CC] text-white rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">CONFIRMAR ({selectedItemsTemplate.length})</button>
              </div>
            </div>
          </div>, document.body
        )}
      </div>, document.body
    );
  }

  if (step === FlowStep.FILL_CHECKLIST) {
    return createPortal(
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col animate-in fade-in duration-500 overflow-hidden">
        <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={(e) => {
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

        {renderHeader('Inspeção Corretiva', () => setStep(FlowStep.BUILD_CHECKLIST))}

        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-3 pb-96">
          <div className="max-w-4xl mx-auto space-y-3">
            {selectedItemsTemplate.map((item, index) => (
              <div key={item.id} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5 leading-none">{item.category}</p>
                      <h4 className="font-black text-slate-800 text-[12px] leading-snug uppercase"><span className="text-slate-200 mr-2 font-mono">{String(index + 1).padStart(2, '0')}</span>{item.label}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => setInfoModalText(item.instruction || 'Inspeção técnica padrão.')} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 hover:bg-blue-50 hover:text-[#0066CC] transition-all flex items-center justify-center shadow-inner"><HelpCircle size={18} /></button>
                      <button onClick={() => updateItem(item.id, { isOk: true })} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${item.isOk === true ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}><Check size={20} strokeWidth={4} /></button>
                      <button onClick={() => updateItem(item.id, { isOk: false })} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${item.isOk === false ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}><X size={20} strokeWidth={4} /></button>
                      <button onClick={() => { setActivePhotoItemId(item.id); fileInputRef.current?.click(); }} className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${item.photos?.length ? 'bg-[#0066CC] border-[#0066CC] text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}><Camera size={18} /></button>
                    </div>
                  </div>
                  <input type="text" placeholder="Observações do defeito ou reparo executado..." value={item.observation} onChange={(e) => updateItem(item.id, { observation: e.target.value })} className="w-full h-12 px-5 bg-slate-50/50 border border-slate-100 rounded-xl text-[11px] outline-none font-bold text-slate-600 uppercase focus:bg-white focus:ring-4 focus:ring-[#0066CC]/5 transition-all" />
                  {item.photos && item.photos.length > 0 && (
                    <div className="flex gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                      {item.photos.map((photo, i) => (
                        <div key={i} className="relative group">
                          <img src={photo} className="w-12 h-12 object-cover rounded-lg border border-white shadow-sm" />
                          <button onClick={() => updateItem(item.id, { photos: [] })} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={8} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-slate-50 p-8 md:p-10 rounded-[40px] border border-slate-200 mt-10 shadow-xl space-y-8">
              {/* Responsável Técnico */}
              <div>
                <div className="flex items-center gap-3 mb-4 text-slate-900">
                  <Signature size={24} className="text-[#0066CC]" />
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Responsável Técnico</h3>
                </div>
                <div className="w-full h-16 bg-white border border-slate-200 rounded-2xl text-slate-900 px-6 flex items-center font-black uppercase text-sm">
                  {currentUser?.name || 'TÉCNICO NÃO IDENTIFICADO'}
                </div>
              </div>

              {/* Responsável Cliente */}
              <div>
                <div className="flex items-center gap-3 mb-4 text-slate-900">
                  <Signature size={24} className="text-[#0066CC]" />
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Responsável Cliente</h3>
                </div>
                <input
                  type="text"
                  placeholder="Nome Completo do Representante"
                  className="w-full h-14 bg-white border border-slate-200 rounded-2xl text-slate-900 px-6 font-black uppercase text-xs outline-none focus:ring-2 focus:ring-[#0066CC]/20 transition-all placeholder:text-slate-400"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                />
              </div>
            </div>

            {/* Spacer para garantir rolagem completa acima da barra fixa */}
            <div className="h-48 md:h-64 w-full"></div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-200 z-[100] flex justify-center gap-3 shadow-2xl">
          <button onClick={() => handleFinalSave(true)} className="h-14 w-32 rounded-[20px] bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-100">
            SALVAR
          </button>
          <button disabled={!clientName || selectedItemsTemplate.some(i => i.isOk === null) || isSubmitting} onClick={() => handleFinalSave(false)} className={`h-14 w-1/2 rounded-[20px] font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${clientName && !selectedItemsTemplate.some(i => i.isOk === null) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'GERAR CORRETIVA'}
          </button>
        </div>

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
  }

  return null;
};

export default CorrectiveMaintenanceFlow;
