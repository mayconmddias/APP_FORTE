import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { RdoRecord, UserProfile, Weather } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface RdoFormProps {
  onSave: (record: RdoRecord) => void;
  onCancel: () => void;
  currentUser: UserProfile | null;
  editingRdo?: RdoRecord | null;
  nextRdoNumber: number;
  allowFinalize?: boolean;
  onTitleChange?: (title: string | null) => void;
  rdos?: RdoRecord[];
}

const RdoForm: React.FC<RdoFormProps> = ({ onSave, onCancel, currentUser, editingRdo, nextRdoNumber, allowFinalize, onTitleChange, rdos = [] }) => {
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    onTitleChange?.('NOVO RD');
  }, [onTitleChange]);

  const [recordId] = useState(editingRdo?.id || uuidv4());
  const [localId] = useState(editingRdo?.local_id || recordId);
  const [rdoNumber] = useState(editingRdo?.rdoNumber || nextRdoNumber);
  const [siteName, setSiteName] = useState(editingRdo?.siteName || '');
  const [clientName, setClientName] = useState(editingRdo?.clientName || '');
  const [activities, setActivities] = useState<string>(editingRdo?.activities?.join('\n') || '');
  const [photos, setPhotos] = useState<string[]>(editingRdo?.photos || []);
  const [technicianId] = useState(editingRdo?.technicianId || currentUser?.id);
  const [technicianName] = useState(editingRdo?.technicianName || currentUser?.name);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [replaceMode, setReplaceMode] = useState<'camera' | 'gallery' | null>(null);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);

  const clientSuggestions = Array.from(new Set(rdos.map(r => r.clientName))).sort();
  const siteSuggestions = Array.from(new Set(rdos.map(r => r.siteName))).sort();

  const handleReplacePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedPhotoIndex !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhotos = [...photos];
        newPhotos[selectedPhotoIndex] = reader.result as string;
        setPhotos(newPhotos);
        setSelectedPhotoIndex(null);
        setReplaceMode(null);
      };
      reader.readAsDataURL(file);
    }
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const triggerReplace = (mode: 'camera' | 'gallery') => {
    setReplaceMode(mode);
    setTimeout(() => {
      if (replaceInputRef.current) {
        replaceInputRef.current.setAttribute('capture', mode === 'camera' ? 'environment' : '');
        if (mode === 'gallery') replaceInputRef.current.removeAttribute('capture');
        replaceInputRef.current.click();
      }
    }, 50);
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setSelectedPhotoIndex(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos([...photos, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const record: RdoRecord = {
      id: recordId,
      local_id: localId,
      date: currentDate,
      arrivalTime: currentTime,
      startTime: currentTime,
      siteName: siteName.toUpperCase(),
      clientName: clientName.toUpperCase(),
      weather: Weather.SOL,
      teamDescription: '',
      activities: activities.split('\n').filter(a => a.trim() !== '').map(a => a.toUpperCase()),
      materials: [],
      equipment: [],
      occurrences: '',
      photos,
      technicianId,
      technicianName,
      endTime: currentTime,
      rdoNumber,
      status: 'COMPLETED',
      signature: 'SIGNED'
    };

    onSave(record);
    setIsSaving(false);
  };

  const isFormValid = clientName.trim() && siteName.trim() && activities.trim();

  const inputClasses = "w-full bg-[#eef2f7] border-none rounded-xl py-4 px-5 text-on-surface placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-sm outline-none";
  const labelClasses = "text-[11px] font-bold text-[#004a88] uppercase tracking-widest mb-2 block";

  return createPortal(
    <>
      <div className="fixed inset-0 bg-background z-[9999] flex flex-col animate-in fade-in h-screen overflow-hidden">

      {/* Header */}
      <header className="bg-background border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <button onClick={onCancel} className="p-2 text-[#004a88] hover:bg-blue-50 rounded-full transition-all">
          <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '24px' }}>arrow_back</span>
        </button>
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-2">
            <h2 className="font-headline font-bold text-lg text-blue-950 uppercase tracking-widest">NOVO RD</h2>
            <span className="bg-blue-50 text-[#004a88] px-2 py-0.5 rounded-full font-headline font-bold text-[10px] tracking-widest">#{rdoNumber}</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Relatório Diário</p>
        </div>
        <div className="w-10" />
      </header>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-40">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Informações do Local */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#004a88] select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>location_on</span>
              </div>
              <h3 className="font-headline font-bold text-sm text-blue-950 uppercase tracking-widest">Informações do Local</h3>
            </div>
            <div>
              <label className={labelClasses}>CLIENTE</label>
              <input
                list="client-list"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="NOME DO CLIENTE"
                className={`${inputClasses} uppercase`}
              />
              <datalist id="client-list">
                {clientSuggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClasses}>DESCRIÇÃO DO SERVIÇO</label>
              <input
                list="site-list"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                placeholder="EX: MANUTENÇÃO ELÉTRICA EM CABINE"
                className={`${inputClasses} uppercase`}
              />
              <datalist id="site-list">
                {siteSuggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </section>

          {/* Atividades */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#004a88] select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>checklist</span>
              </div>
              <h3 className="font-headline font-bold text-sm text-blue-950 uppercase tracking-widest">Atividades Realizadas</h3>
            </div>
            <div>
              <label className={labelClasses}>DESCREVA AS ATIVIDADES</label>
              <textarea
                value={activities}
                onChange={e => setActivities(e.target.value)}
                placeholder="DESCREVA AS ATIVIDADES REALIZADAS..."
                className={`${inputClasses} h-40 resize-none py-4 uppercase`}
              />
            </div>
          </section>

          {/* Fotos */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#004a88] select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
              </div>
              <h3 className="font-headline font-bold text-sm text-blue-950 uppercase tracking-widest">Registro Fotográfico</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((photo, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md cursor-pointer"
                  onClick={() => setSelectedPhotoIndex(idx)}
                >
                  <img src={photo} alt="Evidência" className="w-full h-full object-cover" />
                  {selectedPhotoIndex === idx && (
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }} />
                      <div className="absolute inset-0 bg-black/70 z-[9999] flex flex-col items-center justify-center gap-2 p-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => triggerReplace('camera')} className="w-full py-2.5 bg-white rounded-xl font-headline font-bold text-[10px] uppercase tracking-widest text-blue-950">📷 Nova Foto</button>
                        <button onClick={() => triggerReplace('gallery')} className="w-full py-2.5 bg-white rounded-xl font-headline font-bold text-[10px] uppercase tracking-widest text-blue-950">🖼️ Galeria</button>
                        <button onClick={() => handleDeletePhoto(idx)} className="w-full py-2.5 bg-red-500 rounded-xl font-headline font-bold text-[10px] uppercase tracking-widest text-white">Excluir</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() => setShowPhotoSelector(true)}
                className="aspect-square bg-[#eef2f7] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-blue-50 hover:border-[#004a88]/30 hover:text-[#004a88] transition-all"
              >
                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '28px' }}>add_a_photo</span>
                <span className="font-bold text-[9px] uppercase tracking-widest">Adicionar</span>
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            <input type="file" ref={replaceInputRef} onChange={handleReplacePhoto} className="hidden" accept="image/*" />
          </section>

          {/* Finalização */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#004a88] select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>fact_check</span>
              </div>
              <h3 className="font-headline font-bold text-sm text-blue-950 uppercase tracking-widest">Responsável Técnico</h3>
            </div>
            <div className="w-full bg-[#eef2f7] rounded-xl py-4 px-5 font-headline font-bold text-sm text-blue-950 uppercase">
              {currentUser?.name || 'CARREGANDO...'}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving || !isFormValid}
              className={`w-full h-14 rounded-full font-headline font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                !isSaving && isFormValid
                  ? 'bg-[#004a88] text-white shadow-lg shadow-blue-900/20 active:scale-95'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  FINALIZAR REGISTRO
                  <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                </>
              )}
            </button>
          </section>

        </div>
      </main>
      </div>

      {/* Photo Selection Modal (Bottom Sheet Style) */}
      {showPhotoSelector && (
        <div className="fixed inset-0 z-[10000] animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setShowPhotoSelector(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[32px] p-8 pb-12 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            
            <h3 className="font-headline font-bold text-[10px] text-slate-400 uppercase tracking-[0.2em] text-center mb-6">
              Anexar Foto
            </h3>
            
            <button 
              onClick={() => { triggerReplace('camera'); setShowPhotoSelector(false); }}
              className="w-full h-16 bg-[#004a88] text-white rounded-2xl font-headline font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-blue-900/10"
            >
              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }}>photo_camera</span>
              Usar Câmera
            </button>
            
            <button 
              onClick={() => { triggerReplace('gallery'); setShowPhotoSelector(false); }}
              className="w-full h-16 bg-[#004a88]/5 text-[#004a88] rounded-2xl font-headline font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }}>image</span>
              Galeria de Fotos
            </button>
            
            <div className="h-2" />
            
            <button 
              onClick={() => setShowPhotoSelector(false)}
              className="w-full py-4 text-slate-400 font-headline font-bold text-[11px] uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default RdoForm;
