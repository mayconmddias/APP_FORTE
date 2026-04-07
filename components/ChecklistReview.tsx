import React, { useState } from 'react';
import { ArrowLeft, Check, X, Camera, Signature, Loader2, Calendar, Eraser } from 'lucide-react';
import { ChecklistItem, UserProfile } from '../types';
import SignaturePad from './SignaturePad';

interface ChecklistReviewProps {
    items: ChecklistItem[];
    currentUser: UserProfile | null;
    clientName: string;
    clientSignature?: string;
    isSubmitting: boolean;
    onBack: () => void;
    onClientNameChange: (name: string) => void;
    onClientSignatureChange: (signature: string) => void;
    inspectionDate: string;
    onDateChange: (date: string) => void;
    onFinalSave: () => void;
    technicianName?: string;
}

const ChecklistReview: React.FC<ChecklistReviewProps> = ({
    items,
    currentUser,
    clientName,
    clientSignature,
    isSubmitting,
    onBack,
    onClientNameChange,
    onClientSignatureChange,
    inspectionDate,
    onDateChange,
    onFinalSave,
    technicianName
}) => {
    const [showSignaturePad, setShowSignaturePad] = useState(false);

    const isReadyToSave = clientName.trim() !== '' && !!clientSignature && !isSubmitting;

    return (
        <div className="fixed inset-0 bg-white z-[10000] overflow-y-auto animate-in slide-in-from-bottom-10 flex flex-col lowercase-none">
            <header className="h-20 border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <button onClick={onBack} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all"><ArrowLeft size={32} /></button>
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-900">REVISÃO FINAL</h3>
                <div className="w-10" />
            </header>

            <div className="flex-1 p-8 space-y-8 max-w-3xl mx-auto w-full">
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Itens Inspecionados</h4>
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">{items.length} ITENS</span>
                    </div>
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
                    {/* DATA */}
                    <div>
                        <div className="flex items-center gap-4 mb-4 text-slate-900">
                            <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><Calendar size={20} /></div>
                            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Data da Inspeção</h3>
                        </div>
                        <input
                            type="date"
                            value={inspectionDate}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="w-full h-14 bg-white border border-slate-200 rounded-2xl text-slate-900 px-6 font-black uppercase text-xs outline-none focus:ring-2 focus:ring-[#0066CC]/20 transition-all shadow-sm"
                        />
                    </div>

                    {/* TÉCNICO */}
                    <div>
                        <div className="flex items-center gap-4 mb-4 text-slate-900">
                            <div className="w-10 h-10 bg-blue-50 text-[#0066CC] rounded-2xl flex items-center justify-center shadow-sm"><Signature size={20} /></div>
                            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Responsável Técnico</h3>
                        </div>
                        <div className="w-full h-14 bg-white border border-slate-200 rounded-2xl text-slate-900 px-6 font-black uppercase text-xs flex items-center shadow-sm">
                            {technicianName || currentUser?.name || 'Técnico'}
                        </div>
                    </div>

                    {/* CLIENTE */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-4 text-slate-900">
                            <div className="w-10 h-10 bg-blue-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm"><Signature size={20} /></div>
                            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Responsável Cliente</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="NOME COMPLETO DO REPRESENTANTE"
                                value={clientName}
                                onChange={(e) => onClientNameChange(e.target.value.toUpperCase())}
                                className="w-full h-14 bg-white border border-slate-200 rounded-2xl text-slate-900 px-6 font-black uppercase text-xs outline-none focus:ring-2 focus:ring-[#0066CC]/20 placeholder:text-slate-300 shadow-sm"
                            />

                            <div 
                                onClick={() => setShowSignaturePad(true)}
                                className={`w-full aspect-[4/2] rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden bg-white relative ${clientSignature ? 'border-[#0066CC]/30 bg-blue-50/20' : 'border-slate-200 hover:border-[#0066CC]/30'}`}
                            >
                                {clientSignature ? (
                                    <>
                                        <img src={clientSignature} alt="Assinatura" className="w-full h-full object-contain p-4" />
                                        <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm text-[#0066CC]">
                                            <Eraser size={16} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Signature size={32} strokeWidth={1} className="text-slate-300 mb-2" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clique para assinar</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pb-20">
                    <button
                        onClick={onFinalSave}
                        disabled={!isReadyToSave}
                        className={`w-full max-w-sm h-16 rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 transition-all ${isReadyToSave ? 'bg-emerald-600 text-white active:scale-95 shadow-emerald-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'}`}
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>GERAR RELATÓRIO <Check size={20} strokeWidth={3} /></>
                        )}
                    </button>
                </div>
            </div>

            {showSignaturePad && (
                <SignaturePad 
                    onSave={(sig) => {
                        onClientSignatureChange(sig);
                        setShowSignaturePad(false);
                    }}
                    onCancel={() => setShowSignaturePad(false)}
                />
            )}
        </div>
    );
};

export default ChecklistReview;
