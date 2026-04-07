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
  const [recordId] = useState(editingRdo?.id || `rdo-${Date.now()}`);
  const [localId] = useState(editingRdo?.local_id || recordId);
  const [rdoNumber] = useState(editingRdo?.rdoNumber || nextRdoNumber);
  const [siteName, setSiteName] = useState(editingRdo?.siteName || '');
  const [clientName, setClientName] = useState(editingRdo?.clientName || '');
  const [date, setDate] = useState(editingRdo?.date || new Date().toISOString().split('T')[0]);
  const [arrivalTime, setArrivalTime] = useState(editingRdo?.arrivalTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [startTime, setStartTime] = useState(editingRdo?.startTime || '');
  const [weather, setWeather] = useState<Weather>(editingRdo?.weather || Weather.SOL);
  const [teamDescription, setTeamDescription] = useState(editingRdo?.teamDescription || '');
  const [activities, setActivities] = useState<string[]>(editingRdo?.activities || ['']);
  const [occurrences, setOccurrences] = useState(editingRdo?.occurrences || '');
  const [photos, setPhotos] = useState<string[]>(editingRdo?.photos || []);
  
  // Simplified Checklist (Fixed 2 items as requested)
  const defaultMaterials = [
    { category: 'CHECKLIST', label: 'MATERIAIS DISPONÍVEIS (CONSUMÍVEIS DA OBRA)', isOk: null, observation: '' },
    { category: 'CHECKLIST', label: 'EQUIPAMENTOS E FERRAMENTAS DISPONÍVEIS (ESCADAS, ANDAIMES, PLATAFORMA, MÁQUINA DE SOLDA, ETC)', isOk: null, observation: '' }
  ];
  const [materials, setMaterials] = useState(editingRdo?.materials || defaultMaterials);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addActivity = () => setActivities([...activities, '']);
  const updateActivity = (index: number, val: string) => {
    const newItems = [...activities];
    newItems[index] = val;
    setActivities(newItems);
  };
  const removeActivity = (index: number) => {
    if (activities.length === 1) return;
    setActivities(activities.filter((_, i) => i !== index));
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

  const handleSave = async (isFinal: boolean) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    const record: RdoRecord = {
      id: recordId,
      local_id: localId,
      date,
      arrivalTime,
      startTime: startTime || undefined,
      siteName: siteName.toUpperCase(),
      clientName: clientName.toUpperCase(),
      weather,
      teamDescription: teamDescription.toUpperCase(),
      activities: activities.filter(a => a.trim() !== '').map(a => a.toUpperCase()),
      materials,
      equipment: [], // Replaced by the 2 materials items
      occurrences: occurrences.toUpperCase(),
      photos,
      technicianId: currentUser.id,
      technicianName: currentUser.name,
      endTime: isFinal ? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : (editingRdo?.endTime || undefined),
      rdoNumber,
      status: isFinal ? 'COMPLETED' : 'OPEN',
      signature: isFinal ? 'SIGNED' : undefined
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="pointer-events-none opacity-80">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Data</label>
                 <div className="relative">
                   <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-[#0066CC]/40" size={18} />
                   <div className="w-full h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center font-black uppercase text-sm text-slate-900 shadow-sm">
                      {date.split('-').reverse().join('/')}
                   </div>
                 </div>
              </div>
              <div className="pointer-events-none opacity-80">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Chegada Empresa</label>
                 <div className="relative">
                   <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-[#0066CC]/40" size={18} />
                   <div className="w-full h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center font-black uppercase text-sm text-slate-900 shadow-sm">
                      {arrivalTime}
                   </div>
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Início dos Trabalhos</label>
                <div className="relative h-16">
                  {/* Camada Visual (Igual ao Chegada Empresa) */}
                  <div className="absolute inset-0 w-full h-full bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-black uppercase text-sm text-slate-900 shadow-sm pointer-events-none">
                    <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-[#0066CC]/40" size={18} />
                    <span>{startTime || '--:--'}</span>
                  </div>
                  
                  {/* Camada de Interação (Invisível) */}
                  <input 
                    type="time" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Clima Predominante</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#0066CC]/40 pointer-events-none">
                    {weather === Weather.SOL && <Sun size={20} />}
                    {weather === Weather.CHUVA_FRACA && <CloudRain size={20} />}
                    {weather === Weather.CHUVA_FORTE && <CloudLightning size={20} />}
                  </div>
                  <select 
                    value={weather} 
                    onChange={e => setWeather(e.target.value as Weather)}
                    className="w-full h-16 bg-white border border-slate-200 rounded-2xl pl-16 pr-6 font-black uppercase text-sm outline-none focus:ring-4 focus:ring-[#0066CC]/10 transition-all appearance-none shadow-sm"
                  >
                    <option value={Weather.SOL}>SOL</option>
                    <option value={Weather.CHUVA_FRACA}>CHUVA FRACA</option>
                    <option value={Weather.CHUVA_FORTE}>CHUVA FORTE</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={20} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Seção 2: EQUIPE */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-4">
              <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><Users size={20} /></div>
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Equipe de Trabalho</h3>
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Liste os técnicos presentes na obra hoje.</p>
            <textarea 
              value={teamDescription} 
              onChange={e => setTeamDescription(e.target.value.toUpperCase())} 
              placeholder="EX: CARLOS SILVA, JOÃO SANTOS..." 
              className="w-full h-32 bg-white border border-slate-200 rounded-[28px] p-6 font-black uppercase text-sm outline-none focus:ring-4 focus:ring-[#0066CC]/10 transition-all resize-none placeholder:text-slate-300 shadow-sm" 
            />
          </section>

          {/* Seção 3: CHECKLIST */}
          <section className="space-y-6">
             <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-4">
                <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><Package size={20} /></div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Checklist de Materiais e Equipamentos</h3>
             </div>
             
             <div className="space-y-4">
               {materials.map((item, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm group hover:border-[#0066CC]/30 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                      <h4 className="flex-1 font-black text-slate-800 text-[11px] uppercase leading-tight tracking-[0.05em]">{item.label}</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newM = [...materials];
                            newM[idx].isOk = true;
                            setMaterials(newM);
                          }}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2 ${item.isOk === true ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                        >
                          <CheckCircle size={24} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => {
                            const newM = [...materials];
                            newM[idx].isOk = false;
                            setMaterials(newM);
                          }}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2 ${item.isOk === false ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                        >
                          <X size={24} strokeWidth={4} />
                        </button>
                      </div>
                    </div>
                    <input 
                      placeholder="OBSERVAÇÃO (OPCIONAL)" 
                      value={item.observation}
                      onChange={(e) => {
                        const newM = [...materials];
                        newM[idx].observation = e.target.value.toUpperCase();
                        setMaterials(newM);
                      }}
                      className="w-full h-14 bg-slate-50/50 border border-slate-100 rounded-2xl px-6 text-[10px] font-black uppercase transition-all focus:bg-white focus:border-[#0066CC]/30 outline-none"
                    />
                 </div>
               ))}
             </div>
          </section>

          {/* Seção 4: OCORRÊNCIAS (MOVE TO TOP OF SECTION GROUP) */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-4">
              <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><AlertCircle size={20} /></div>
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Ocorrências / Imprevistos</h3>
            </div>
            <textarea 
              value={occurrences} 
              onChange={e => setOccurrences(e.target.value.toUpperCase())} 
              placeholder="DESCREVA PROBLEMAS, ATRASOS OU OBSERVAÇÕES RELEVANTES DO DIA..." 
              className="w-full h-32 bg-white border border-slate-200 rounded-2xl p-6 font-black uppercase text-sm outline-none focus:ring-4 focus:ring-[#0066CC]/10 transition-all resize-none placeholder:text-slate-300 shadow-sm" 
            />
          </section>

          {/* Seção 5: ATIVIDADES */}
          <section className="space-y-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><ListTodo size={20} /></div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Atividades Realizadas</h3>
              </div>
              <button onClick={addActivity} className="w-12 h-12 bg-[#0066CC]/5 text-[#0066CC] rounded-2xl flex items-center justify-center hover:bg-[#0066CC] hover:text-white transition-all shadow-sm">
                <Plus size={24} />
              </button>
            </div>
            <div className="space-y-3">
              {activities.map((act, index) => (
                <div key={index} className="flex gap-3 group">
                   <input 
                    value={act} 
                    onChange={e => updateActivity(index, e.target.value.toUpperCase())} 
                    placeholder={`ATIVIDADE #${index + 1}`} 
                    className="flex-1 h-14 bg-white border border-slate-200 rounded-2xl px-6 font-black uppercase text-xs outline-none focus:ring-2 focus:ring-[#0066CC]/10 transition-all placeholder:text-slate-300 shadow-sm" 
                   />
                   <button onClick={() => removeActivity(index)} className="w-14 h-14 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 size={20} />
                   </button>
                </div>
              ))}
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
                  <div key={idx} className="relative group aspect-square rounded-[32px] overflow-hidden border-4 border-white shadow-md">
                    <img src={photo} alt="Evidência" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos(photos.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-3 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} className="aspect-square bg-white border-2 border-dashed border-slate-300 rounded-[32px] flex flex-col items-center justify-center gap-3 text-slate-400 hover:bg-blue-50 hover:border-[#0066CC]/30 hover:text-[#0066CC] transition-all group shadow-sm">
                   <Camera size={32} strokeWidth={1.5} />
                   <span className="font-black text-[9px] uppercase tracking-widest">Adicionar Foto</span>
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            </div>
          </section>

          {/* Seção 7: FINALIZAÇÃO (REMOVED BLUE CARD) */}
          <section className="space-y-6 pt-12 border-t border-slate-200">
             <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl space-y-6">
                <div>
                   <div className="flex items-center gap-4 mb-4 text-slate-800">
                    <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><Signature size={20} /></div>
                    <h3 className="font-black uppercase text-xs tracking-widest">Responsável Técnico</h3>
                   </div>
                   <div className="w-full h-16 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 px-6 font-black uppercase text-sm flex items-center">{currentUser?.name || "CARREGANDO..."}</div>
                </div>
                
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 border-dashed text-center">
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                    {allowFinalize 
                      ? "Ao finalizar, este relatório será bloqueado para edições e enviado oficialmente." 
                      : "SALVE ESTE RELATÓRIO PARA PODER FINALIZÁ-LO POSTERIORMENTE NA TELA DE RELATÓRIOS ABERTOS."}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => handleSave(false)} 
                    disabled={isSaving || !clientName.trim() || !siteName.trim()}
                    className={`w-full h-16 border rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 ${(!clientName.trim() || !siteName.trim()) ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-50' : 'bg-white border-slate-200 text-slate-800'}`}
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : 'SALVAR'}
                  </button>

                  <button 
                    onClick={() => handleSave(true)} 
                    disabled={isSaving || !allowFinalize || !clientName.trim() || !siteName.trim()}
                    className={`w-full h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-4 ${allowFinalize && !isSaving && clientName.trim() && siteName.trim() ? 'bg-[#0066CC] text-white shadow-xl shadow-blue-100 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
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
