import React from 'react';
import { HelpCircle, Check, X, Camera } from 'lucide-react';
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
        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">{item.category}</p>
                        <h4 className="font-black text-slate-800 text-[11px] leading-snug uppercase">
                            <span className="text-slate-300 mr-2">{String(index + 1).padStart(2, '0')}</span>
                            {item.label}
                        </h4>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onShowInfo(item.instruction || 'Inspeção padrão.')}
                            className="w-9 h-9 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-slate-100 transition-colors"
                        >
                            <HelpCircle size={16} />
                        </button>
                        <button
                            onClick={() => onUpdate(item.id, { isOk: true })}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${item.isOk === true ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                        >
                            <Check size={18} strokeWidth={4} />
                        </button>
                        <button
                            onClick={() => onUpdate(item.id, { isOk: false })}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${item.isOk === false ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                        >
                            <X size={18} strokeWidth={4} />
                        </button>
                        <button
                            onClick={() => onTakeRef(item.id)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${item.photos?.length ? 'bg-[#0066CC] text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}
                        >
                            <Camera size={16} />
                        </button>
                    </div>
                </div>
                <input
                    type="text"
                    placeholder="Observações técnicas..."
                    value={item.observation}
                    onChange={(e) => onUpdate(item.id, { observation: e.target.value })}
                    className="w-full h-11 px-5 border border-slate-100 rounded-xl text-[10px] bg-slate-50/30 focus:bg-white outline-none font-bold text-slate-600 uppercase transition-all"
                />
            </div>
        </div>
    );
};

export default ChecklistItemCard;
