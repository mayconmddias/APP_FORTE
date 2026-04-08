import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Sun, 
  CloudRain, 
  CloudLightning, 
  Users, 
  ListTodo, 
  Package, 
  Truck, 
  AlertCircle, 
  Camera, 
  Signature, 
  CheckCircle, 
  X, 
  Loader2,
  Plus,
  Trash2,
  ChevronDown
} from 'lucide-react';
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
}

const RdoForm: React.FC<RdoFormProps> = ({ onSave, onCancel, currentUser, editingRdo, nextRdoNumber, allowFinalize, onTitleChange }) => {
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    onTitleChange?.('NOVO RD');
  }, [onTitleChange]);
  
  // State for RDO fields
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
      arrivalTime: currentTime, // User requested removal from UI, but type might still require or use as 'completion'
      startTime: currentTime,
      siteName: siteName.toUpperCase(),
      clientName: clientName.toUpperCase(),
      weather: Weather.SOL, // Default
      teamDescription: '', // Simplified out
      activities: activities.split('\n').filter(a => a.trim() !== '').map(a => a.toUpperCase()),
      materials: [], // Simplified out
      equipment: [], 
      occurrences: '', // Simplified out
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

  return createPortal(
    <div className="fixed inset-0 bg-slate-100 z-[9999] flex flex-col animate-in animate-out fade-in h-screen overflow-hidden text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-6 flex items-center justify-between sticky top-0 z-[10010] shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={onCancel} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all focus:ring-2 focus:ring-[#0066CC]/20 outline-none"><ArrowLeft size={32} /></button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">NOVO RD</h2>
              <span className="bg-blue-50 text-[#0066CC] px-3 py-1 rounded-lg font-black text-[10px] tracking-widest">#{rdoNumber}</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Relatório Diário</p>
          </div>
        </div>
      </header>

      {/* Main Content (Continuous Form - Unified) */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-40">
        <div className="max-w-3xl mx-auto space-y-12 pb-32">
          
          {/* Seção 1: DADOS GERAIS */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-4">
              <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><MapPin size={20} /></div>
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Informações do Local</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Cliente</label>
                <input 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value.toUpperCase())} 
                  placeholder="DIGITE O NOME DO CLIENTE" 
                  className="w-full h-16 bg-white border border-slate-200 rounded-2xl px-6 font-black uppercase text-sm outline-none focus:ring-4 focus:ring-[#0066CC]/10 transition-all placeholder:text-slate-300 shadow-sm" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Descrição do Serviço</label>
                <input 
                  value={siteName} 
                  onChange={e => setSiteName(e.target.value.toUpperCase())} 
                  placeholder="EX: MANUTENÇÃO ELÉTRICA EM CABINE" 
                  className="w-full h-16 bg-white border border-slate-200 rounded-2xl px-6 font-black uppercase text-sm outline-none focus:ring-4 focus:ring-[#0066CC]/10 transition-all placeholder:text-slate-300 shadow-sm" 
                />
              </div>
            </div>
          </section>

          {/* Seção 2: ATIVIDADES */}
          <section className="space-y-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><ListTodo size={20} /></div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Atividades Realizadas</h3>
              </div>
            </div>
            <div className="space-y-3">
              <textarea 
                value={activities} 
                onChange={e => setActivities(e.target.value.toUpperCase())} 
                placeholder="DESCREVA AS ATIVIDADES REALIZADAS..." 
                className="w-full h-48 bg-white border border-slate-200 rounded-2xl p-6 font-black uppercase text-xs outline-none focus:ring-4 focus:ring-[#0066CC]/10 transition-all resize-none placeholder:text-slate-300 shadow-sm" 
              />
            </div>
          </section>

          {/* Seção 6: FOTOS */}
          <section className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-4">
                <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><Camera size={20} /></div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Registro Fotográfico</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-[32px] overflow-hidden border-4 border-white shadow-md cursor-pointer" onClick={() => setSelectedPhotoIndex(idx)}>
                    <img src={photo} alt="Evidência" className="w-full h-full object-cover" />
                    
                    {/* Popup de Ações */}
                    {selectedPhotoIndex === idx && (
                      <>
                        {/* Overlay para fechar ao clicar fora */}
                        <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }} />
                        
                        {/* Menu de Ações */}
                        <div className="absolute inset-0 bg-black/70 z-[9999] flex flex-col items-center justify-center gap-3 p-4" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => triggerReplace('camera')}
                            className="w-full py-3 bg-white rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-800 hover:bg-blue-50 transition-all"
                          >
                            Nova Foto
                          </button>
                          <button 
                            onClick={() => triggerReplace('gallery')}
                            className="w-full py-3 bg-white rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-800 hover:bg-blue-50 transition-all"
                          >
                            Galeria
                          </button>
                          <button 
                            onClick={() => handleDeletePhoto(idx)}
                            className="w-full py-3 bg-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-red-600 transition-all"
                          >
                            Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} className="aspect-square bg-white border-2 border-dashed border-slate-300 rounded-[32px] flex flex-col items-center justify-center gap-3 text-slate-400 hover:bg-blue-50 hover:border-[#0066CC]/30 hover:text-[#0066CC] transition-all group shadow-sm">
                   <Camera size={32} strokeWidth={1.5} />
                   <span className="font-black text-[9px] uppercase tracking-widest">Adicionar Foto</span>
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
              <input type="file" ref={replaceInputRef} onChange={handleReplacePhoto} className="hidden" accept="image/*" />
            </div>
          </section>

          {/* Seção 7: FINALIZAÇÃO */}
          <section className="space-y-6 pt-12 border-t border-slate-200">
             <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl space-y-6">
                <div>
                   <div className="flex items-center gap-4 mb-4 text-slate-800">
                    <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><Signature size={20} /></div>
                    <h3 className="font-black uppercase text-xs tracking-widest">Responsável Técnico</h3>
                   </div>
                   <div className="w-full h-16 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 px-6 font-black uppercase text-sm flex items-center">{currentUser?.name || "CARREGANDO..."}</div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving || !clientName.trim() || !siteName.trim() || !activities.trim()}
                    className={`w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-4 ${!isSaving && clientName.trim() && siteName.trim() && activities.trim() ? 'bg-[#0066CC] text-white shadow-xl shadow-blue-100 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <>FINALIZAR REGISTRO <CheckCircle size={18} /></>}
                  </button>
                </div>
             </div>
          </section>

        </div>
      </main>

    </div>, document.body
  );
};

export default RdoForm;
