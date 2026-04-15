import React from 'react';
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
        <div className="animate-in slide-in-from-right-4 duration-300 space-y-3 pb-48">
            {assets.map((asset) => {
                const isSelected = selectedId === asset.id;
                return (
                    <div
                        key={asset.id}
                        onClick={() => onSelect(asset.id === selectedId ? null : asset.id)}
                        className={`cursor-pointer transition-all rounded-2xl p-5 flex items-center justify-between gap-4 group bg-white border ${
                            isSelected
                                ? 'border-[#004a88] shadow-[0_8px_30px_rgba(0,74,136,0.15)] ring-1 ring-[#004a88]/20'
                                : 'border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] hover:shadow-md hover:border-slate-200'
                        }`}
                    >
                        {/* Checkbox / Seleção */}
                        <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                isSelected ? 'bg-[#004a88] border-[#004a88]' : 'border-slate-200'
                            }`}>
                                {isSelected && (
                                    <span className="material-symbols-outlined text-white select-none notranslate" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-headline font-bold text-sm text-blue-950 uppercase truncate">{asset.name}</h3>
                                    {recentOsAssetIds?.has(asset.id) && (
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" title="OS Recente" />
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className="font-body text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                        SN: {asset.serialNumber || 'N/A'}
                                    </span>
                                    <span className="font-body text-[9px] font-bold text-[#004a88] uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                        {asset.location || 'SEM LOCAL'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Ações (admin) */}
                        {isAdmin && (
                            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => onEdit(asset)}
                                    className="p-2 text-slate-300 hover:text-[#004a88] hover:bg-blue-50 rounded-full transition-all"
                                >
                                    <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>edit</span>
                                </button>
                                <button
                                    onClick={() => onDelete(asset)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                >
                                    <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>delete</span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Rodapé fixo com ações */}
            <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-background border-t border-slate-100 z-[100] animate-in slide-in-from-bottom-5">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <button
                        disabled={!selectedId}
                        onClick={() => selectedId && onCorrective(selectedId)}
                        className={`flex-1 h-14 rounded-full font-headline font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                            selectedId
                                ? 'bg-white text-[#004a88] border-2 border-[#004a88] shadow-md active:scale-95'
                                : 'bg-slate-100 text-slate-300 border-2 border-transparent cursor-not-allowed'
                        }`}
                    >
                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>build</span>
                        CORRETIVA
                    </button>
                    <button
                        disabled={!selectedId}
                        onClick={() => selectedId && onInspect(selectedId)}
                        className={`flex-1 h-14 rounded-full font-headline font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                            selectedId
                                ? 'bg-[#004a88] text-white shadow-lg shadow-blue-900/20 active:scale-95'
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                    >
                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>handyman</span>
                        PREVENTIVA
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetList;
