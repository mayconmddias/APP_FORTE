import React from 'react';
import { CheckCircle, Pencil, Trash2, Settings, Wrench } from 'lucide-react';
import { CraneAsset } from '../types';

interface AssetListProps {
    assets: CraneAsset[];
    selectedId: string | null;
    isAdmin: boolean;
    recentOsAssetIds?: Set<string>;
    onSelect: (id: string | null) => void;
    onEdit: (asset: CraneAsset) => void;
    onDelete: (asset: CraneAsset) => void;
    onInspect: (id: string) => void;
    onCorrective: (id: string) => void;
}

const AssetList: React.FC<AssetListProps> = ({
    assets,
    selectedId,
    isAdmin,
    recentOsAssetIds,
    onSelect,
    onEdit,
    onDelete,
    onInspect,
    onCorrective
}) => {
    return (
        <div className="animate-in slide-in-from-right-4 duration-300 space-y-3 pb-24">
            {assets.map((asset) => (
                <div
                    key={asset.id}
                    onClick={() => onSelect(asset.id === selectedId ? null : asset.id)}
                    className={`cursor-pointer transition-all p-5 rounded-[24px] border flex items-center justify-between gap-4 group ${selectedId === asset.id ? 'bg-blue-50/50 border-[#0066CC] shadow-md ring-1 ring-[#0066CC]/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                >
                    <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedId === asset.id ? 'bg-[#0066CC] border-[#0066CC] text-white' : 'border-slate-200 group-hover:border-slate-300'}`}>
                            {selectedId === asset.id && <CheckCircle size={16} strokeWidth={4} />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <h3 className="font-black text-slate-900 text-sm uppercase truncate leading-none">{asset.name}</h3>
                                {recentOsAssetIds?.has(asset.id) && (
                                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="OS Recente" />
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="font-black text-slate-400 text-[8px] uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">SN: {asset.serialNumber || 'N/A'}</span>
                                <span className="font-black text-blue-600 text-[8px] uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    {asset.location || 'SEM LOCAL'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {isAdmin && (
                            <>
                                <button onClick={() => onEdit(asset)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil size={18} /></button>
                                <button onClick={() => onDelete(asset)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                            </>
                        )}
                    </div>
                </div>
            ))}

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-[100] animate-in slide-in-from-bottom-5">
                <div className="max-w-4xl mx-auto flex gap-4">
                    <button
                        disabled={!selectedId}
                        onClick={() => selectedId && onCorrective(selectedId)}
                        className={`flex-1 h-14 rounded-[20px] font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 border ${selectedId ? 'bg-white border-slate-900 text-slate-900 shadow-lg' : 'bg-slate-100 text-slate-400 border-transparent opacity-60'}`}
                    >
                        <Wrench size={20} /> CORRETIVA
                    </button>
                    <button
                        disabled={!selectedId}
                        onClick={() => selectedId && onInspect(selectedId)}
                        className={`flex-1 h-14 rounded-[20px] font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 border ${selectedId ? 'bg-white border-slate-900 text-slate-900 shadow-lg' : 'bg-slate-100 text-slate-400 border-transparent opacity-60'}`}
                    >
                        <Settings size={20} className={selectedId ? "text-slate-900" : "text-slate-400"} /> PREVENTIVA
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetList;
