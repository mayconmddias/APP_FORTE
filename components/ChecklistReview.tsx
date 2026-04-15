import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
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

    const inputClasses = "w-full bg-[#eef2f7] border-none rounded-xl py-4 px-5 text-on-surface placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-sm outline-none";
    const labelClasses = "text-[11px] font-bold text-[#004a88] uppercase tracking-widest mb-2 block";

    return (
        <div className="fixed inset-0 bg-background z-[10000] overflow-y-auto animate-in slide-in-from-bottom-4 flex flex-col">

            {/* Header */}
            <header className="sticky top-0 z-10 bg-background border-b border-slate-100 flex items-center justify-between px-6 py-4 flex-shrink-0">
                <button onClick={onBack} className="p-2 text-[#004a88] hover:bg-blue-50 rounded-full transition-all">
                    <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '24px' }}>arrow_back</span>
                </button>
                <h3 className="font-headline font-bold text-base text-blue-950 uppercase tracking-widest text-center flex-1">
                    REVISÃO FINAL
                </h3>
                <div className="w-10" />
            </header>

            <div className="flex-1 px-4 py-6 space-y-6 max-w-2xl mx-auto w-full pb-20">

                {/* Lista de itens */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h4 className="font-headline font-bold text-sm text-blue-950 uppercase">Itens Inspecionados</h4>
                        <span className="bg-[#eef2f7] text-[#004a88] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                            {items.length} ITENS
                        </span>
                    </div>
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className={`bg-white rounded-xl border p-4 flex items-start justify-between gap-4 ${
                                    item.isOk === true ? 'border-emerald-100' : item.isOk === false ? 'border-red-100' : 'border-slate-100'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{item.category}</p>
                                    <h5 className="font-body font-bold text-blue-950 text-[11px] leading-snug uppercase">
                                        <span className="text-slate-300 mr-1">{String(index + 1).padStart(2, '0')}</span>
                                        {item.label}
                                    </h5>
                                    {item.observation && (
                                        <p className="text-[10px] text-slate-500 font-body bg-slate-50 px-3 py-1.5 rounded-lg mt-2">
                                            {item.observation}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {item.isOk === true && (
                                        <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                                        </div>
                                    )}
                                    {item.isOk === false && (
                                        <div className="w-7 h-7 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px', fontVariationSettings: "'wght' 700" }}>close</span>
                                        </div>
                                    )}
                                    {item.photos && item.photos.length > 0 && (
                                        <div className="w-7 h-7 bg-blue-100 text-[#004a88] rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Seção de assinaturas */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] p-6 space-y-6">

                    {/* Data da Inspeção */}
                    <div>
                        <label className={labelClasses}>DATA DA INSPEÇÃO</label>
                        <input
                            type="date"
                            value={inspectionDate}
                            onChange={(e) => onDateChange(e.target.value)}
                            className={inputClasses}
                        />
                    </div>

                    {/* Responsável Técnico */}
                    <div>
                        <label className={labelClasses}>RESPONSÁVEL TÉCNICO</label>
                        <div className="w-full bg-[#eef2f7] rounded-xl py-4 px-5 font-body font-bold text-sm text-blue-950 uppercase">
                            {technicianName || currentUser?.name || 'Técnico'}
                        </div>
                    </div>

                    {/* Responsável Cliente */}
                    <div className="space-y-4">
                        <div>
                            <label className={labelClasses}>RESPONSÁVEL CLIENTE</label>
                            <input
                                type="text"
                                placeholder="NOME COMPLETO DO REPRESENTANTE"
                                value={clientName}
                                onChange={(e) => onClientNameChange(e.target.value.toUpperCase())}
                                className={inputClasses}
                            />
                        </div>

                        {/* Área de assinatura */}
                        <div>
                            <label className={labelClasses}>ASSINATURA DO CLIENTE</label>
                            <div
                                onClick={() => setShowSignaturePad(true)}
                                className={`w-full aspect-[4/2] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative ${
                                    clientSignature
                                        ? 'border-[#004a88]/30 bg-blue-50/20'
                                        : 'border-slate-200 bg-[#eef2f7] hover:border-[#004a88]/30'
                                }`}
                            >
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
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique para assinar</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botão Gerar Relatório */}
                <button
                    onClick={onFinalSave}
                    disabled={!isReadyToSave}
                    className={`w-full h-14 rounded-full font-headline font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                        isReadyToSave
                            ? 'bg-[#004a88] text-white shadow-lg shadow-blue-900/20 active:scale-95'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                >
                    {isSubmitting ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            GERAR RELATÓRIO
                            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                        </>
                    )}
                </button>
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
