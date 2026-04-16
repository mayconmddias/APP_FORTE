import React from 'react';
import { ChecklistItem } from '../types';

interface ChecklistItemCardProps {
    item: ChecklistItem;
    index: number;
    onUpdate: (id: string, updates: Partial<ChecklistItem>) => void;
    onShowInfo: (text: string) => void;
    onTakeRef: (id: string) => void;
}

const ChecklistItemCard: React.FC<ChecklistItemCardProps> = ({
    item,
    index,
    onUpdate,
    onShowInfo,
    onTakeRef
}) => {
    return (
        <div className={`bg-white rounded-2xl border transition-all ${
            item.isOk === true
                ? 'border-emerald-200 shadow-[0_4px_16px_rgba(5,150,105,0.08)]'
                : item.isOk === false
                ? 'border-red-200 shadow-[0_4px_16px_rgba(239,68,68,0.08)]'
                : 'border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)]'
        }`}>
            <div className="p-4 flex flex-col gap-3">
                {/* Header do card */}
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.category}</p>
                        <h4 className="font-body font-bold text-blue-950 text-[11px] leading-snug uppercase">
                            <span className="text-slate-300 mr-2 font-body">{String(index + 1).padStart(2, '0')}</span>
                            {item.label}
                        </h4>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Info */}
                        <button
                            onClick={() => onShowInfo(item.instruction || 'Inspeção padrão conforme norma NR-11.')}
                            className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-slate-100 transition-colors"
                        >
                            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>help</span>
                        </button>

                        {/* OK */}
                        <button
                            onClick={() => onUpdate(item.id, { isOk: true })}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                item.isOk === true
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-300 hover:bg-emerald-50 hover:text-emerald-500'
                            }`}
                        >
                            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                        </button>

                        {/* NOK */}
                        <button
                            onClick={() => onUpdate(item.id, { isOk: false })}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                item.isOk === false
                                    ? 'bg-red-500 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500'
                            }`}
                        >
                            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'wght' 700" }}>close</span>
                        </button>

                        {/* Câmera */}
                        <button
                            onClick={() => onTakeRef(item.id)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                item.photos?.length
                                    ? 'bg-[#004a88] text-white shadow-md'
                                    : 'bg-slate-50 text-slate-300 hover:bg-blue-50 hover:text-[#004a88]'
                            }`}
                        >
                            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>photo_camera</span>
                        </button>
                    </div>
                </div>

                {/* Thumbnail da foto (Restrito a uma) */}
                {item.photos && item.photos.length > 0 && (
                    <div className="mt-2">
                        <div className="relative inline-block">
                            <img src={item.photos[0]} className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-sm" />
                            <button 
                                onClick={() => onUpdate(item.id, { photos: [] })} 
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '12px' }}>close</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Campo de observação */}
                <input
                    type="text"
                    placeholder="Observações técnicas..."
                    value={item.observation}
                    onChange={(e) => onUpdate(item.id, { observation: e.target.value })}
                    className="w-full h-10 px-4 bg-[#eef2f7] border-none rounded-xl text-[10px] font-body font-bold text-slate-600 uppercase placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
            </div>
        </div>
    );
};

export default ChecklistItemCard;
