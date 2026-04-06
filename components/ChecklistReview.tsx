import React from 'react';
import { ArrowLeft, Check, X, Camera, Signature, Loader2, Calendar } from 'lucide-react';
import { ChecklistItem, UserProfile } from '../types';

interface ChecklistReviewProps {
    items: ChecklistItem[];
    currentUser: UserProfile | null;
    clientName: string;
    isSubmitting: boolean;
    onBack: () => void;
    onClientNameChange: (name: string) => void;
    inspectionDate: string;
    onDateChange: (date: string) => void;
    onFinalSave: () => void;
    technicianName?: string;
}

const ChecklistReview: React.FC<ChecklistReviewProps> = ({
    items,
    currentUser,
    clientName,
    isSubmitting,
    onBack,
    onClientNameChange,
    inspectionDate,
    onDateChange,
    onFinalSave,
    technicianName
}) => {

    return (
        <div className="fixed inset-0 bg-white z-[10000] overflow-y-auto animate-in slide-in-from-bottom-10 flex flex-col">
            <header className="h-20 border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <button onClick={onBack} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all"><ArrowLeft size={32} /></button>
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-900">REVISÃO</h3>
                <div className="w-10" />
            </header>
            <div className="flex-1 p-8 space-y-8 max-w-3xl mx-auto w-full">
                <div className="space-y-4">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-4">Itens Inspecionados</h4>
                    {items.map((item, index) => (
                        <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.category}</p>
                                <h5 className="font-black text-slate-800 text-[11px] leading-snug uppercase mb-1">
                                    <span className="text-slate-300 mr-2">{String(index + 1).padStart(2, '0')}</span>
                                    {item.label}
                                </h5>
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

                <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-200 shadow-xl space-y-8">
                    <div>
                        <div className="flex items-center gap-4 mb-4 text-slate-900"><Calendar size={24} className="text-[#0066CC]" /><h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Data da Inspeção</h3></div>
                        <input
                            type="date"
                            value={inspectionDate}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="w-full h-14 bg-white border border-slate-200 rounded-2xl text-slate-900 px-6 font-black uppercase text-xs outline-none focus:ring-2 focus:ring-[#0066CC]/20 transition-all"
                        />
                    </div>

                    <div>
                        <div className="flex items-center gap-4 mb-4 text-slate-900"><Signature size={24} className="text-[#0066CC]" /><h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Responsável Técnico</h3></div>
                        <div className="w-full h-14 bg-white border border-slate-200 rounded-2xl text-slate-900 px-6 font-black uppercase text-xs flex items-center">
                            {technicianName || currentUser?.name || 'Técnico'}
                        </div>

                    </div>

                    <div>
                        <div className="flex items-center gap-4 mb-4 text-slate-900"><Signature size={24} className="text-[#0066CC]" /><h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Responsável Cliente</h3></div>
                        <input
                            type="text"
                            placeholder="Nome Completo do Representante"
                            value={clientName}
                            onChange={(e) => onClientNameChange(e.target.value)}
                            className="w-full h-14 bg-white border border-slate-200 rounded-2xl text-slate-900 px-6 font-black uppercase text-xs outline-none focus:ring-2 focus:ring-[#0066CC]/20 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex justify-center pb-20">
                    <button
                        onClick={onFinalSave}
                        disabled={!clientName || isSubmitting}
                        className={`w-1/2 h-14 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all ${clientName ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin text-slate-500" /> : 'GERAR OS'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChecklistReview;
