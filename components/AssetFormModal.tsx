import React from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ChevronRight } from 'lucide-react';
import { CraneAsset, AssetStatus } from '../types';

interface AssetFormModalProps {
    isOpen: boolean;
    isSaving: boolean;
    editingAsset: CraneAsset | null;
    selectedClient: string | null;
    assetForm: Partial<CraneAsset>;
    onClose: () => void;
    onSave: (e: React.FormEvent) => void;
    onFormChange: (form: Partial<CraneAsset>) => void;
}

const AssetFormModal: React.FC<AssetFormModalProps> = ({
    isOpen,
    isSaving,
    editingAsset,
    selectedClient,
    assetForm,
    onClose,
    onSave,
    onFormChange
}) => {
    if (!isOpen) return null;

    const inputClasses = "w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] outline-none transition-all font-bold text-slate-800 text-sm appearance-none";
    const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1.5 block";

    return createPortal(
        <div className="fixed inset-0 top-0 left-0 w-full h-full bg-white z-[9999] flex flex-col animate-in slide-in-from-bottom-5 duration-500 overflow-hidden rounded-none">
            <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0 rounded-none">
                <div className="flex items-center gap-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                            {editingAsset ? 'EDITAR ATIVO' : (selectedClient ? 'NOVO ATIVO' : 'NOVO CLIENTE')}
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações Técnicas</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={32} /></button>
            </div>
            <form onSubmit={onSave} className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-transparent">
                <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8 pb-32">
                    <div className="sm:col-span-2">
                        <label className={labelClasses}>Cliente</label>
                        <input required type="text" className={inputClasses} value={assetForm.client || ''} onChange={e => onFormChange({ ...assetForm, client: e.target.value })} placeholder="Ex: Metalúrgica Gerdau" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClasses}>Nome do Ativo (TAG)</label>
                        <input required type="text" className={inputClasses} value={assetForm.name || ''} onChange={e => onFormChange({ ...assetForm, name: e.target.value })} placeholder="Ex: Ponte Rolante 01" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClasses}>Tipo de Equipamento</label>
                        <div className="relative">
                            <select required className={inputClasses} value={assetForm.equipmentType || 'Ponte'} onChange={e => onFormChange({ ...assetForm, equipmentType: e.target.value })}>
                                <option value="Ponte">PONTE</option>
                                <option value="Talha">TALHA</option>
                                <option value="Monovia">MONOVIA</option>
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronRight size={18} className="rotate-90 text-slate-400" /></div>
                        </div>
                    </div>
                    <div><label className={labelClasses}>Nº de Série</label><input required type="text" className={inputClasses} value={assetForm.serialNumber || ''} onChange={e => onFormChange({ ...assetForm, serialNumber: e.target.value })} /></div>
                    <div><label className={labelClasses}>Localização</label><input required type="text" className={inputClasses} value={assetForm.location || ''} onChange={e => onFormChange({ ...assetForm, location: e.target.value })} /></div>
                    <div><label className={labelClasses}>Fabricante</label><input required type="text" className={inputClasses} value={assetForm.manufacturer || ''} onChange={e => onFormChange({ ...assetForm, manufacturer: e.target.value })} /></div>
                    <div><label className={labelClasses}>Capacidade</label><input required type="text" className={inputClasses} value={assetForm.capacity || ''} onChange={e => onFormChange({ ...assetForm, capacity: e.target.value })} placeholder="Ex: 10 Ton" /></div>
                    <div><label className={labelClasses}>Vão (M)</label><input required type="text" className={inputClasses} value={assetForm.span || ''} onChange={e => onFormChange({ ...assetForm, span: e.target.value })} placeholder="Ex: 22m" /></div>
                    <div><label className={labelClasses}>Data de Comissionamento</label><input required type="date" className={inputClasses} value={assetForm.commissioningDate || ''} onChange={e => onFormChange({ ...assetForm, commissioningDate: e.target.value })} /></div>
                </div>
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 z-10">
                    <div className="max-w-3xl mx-auto flex gap-4">
                        <button type="button" onClick={onClose} className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-[20px] font-black text-xs uppercase tracking-widest">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="flex-1 h-14 bg-emerald-600 text-white rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                            {isSaving ? <Loader2 size={24} className="animate-spin" /> : 'SALVAR'}
                        </button>
                    </div>
                </div>
            </form>
        </div>, document.body
    );
};

export default AssetFormModal;
