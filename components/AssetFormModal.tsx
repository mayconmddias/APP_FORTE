import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { CraneAsset } from '../types';

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

    const inputClasses = "w-full bg-[#eef2f7] border-none rounded-xl py-4 px-5 text-on-surface placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-base outline-none";
    const labelClasses = "text-[11px] font-bold text-[#004a88] uppercase tracking-widest mb-2 block";
    const title = editingAsset ? 'EDITAR ATIVO' : (selectedClient ? 'NOVO ATIVO' : 'NOVO CLIENTE');

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
                    <div className="w-8" />
                    <h3 className="font-headline font-bold text-lg text-blue-950 tracking-widest uppercase text-center flex-1">
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }} aria-hidden="true">close</span>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={onSave} className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6 space-y-5">

                    {/* Cliente */}
                    <div>
                        <label className={labelClasses}>CLIENTE</label>
                        <input
                            required
                            type="text"
                            className={inputClasses}
                            value={assetForm.client || ''}
                            onChange={e => onFormChange({ ...assetForm, client: e.target.value })}
                            placeholder="Nome do cliente"
                        />
                    </div>

                    {/* Nome do Ativo (TAG) */}
                    <div>
                        <label className={labelClasses}>NOME DO ATIVO (TAG)</label>
                        <input
                            required
                            type="text"
                            className={inputClasses}
                            value={assetForm.name || ''}
                            onChange={e => onFormChange({ ...assetForm, name: e.target.value })}
                            placeholder="Ex: PT-01"
                        />
                    </div>

                    {/* Tipo de Equipamento */}
                    <div>
                        <label className={labelClasses}>TIPO DE EQUIPAMENTO</label>
                        <div className="relative">
                            <select
                                required
                                className={`${inputClasses} appearance-none pr-10 cursor-pointer`}
                                value={assetForm.equipmentType || 'Ponte'}
                                onChange={e => onFormChange({ ...assetForm, equipmentType: e.target.value })}
                            >
                                <option value="Ponte">PONTE</option>
                                <option value="Talha">TALHA</option>
                                <option value="Elevador de Carga">ELEVADOR DE CARGA</option>
                                <option value="Encaixotadora">ENCAIXOTADORA</option>
                                <option value="Desencaixotadora">DESENCAIXOTADORA</option>
                                <option value="Pórtico">PÓRTICO</option>
                            </select>
                            <span
                                className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none notranslate"
                                style={{ fontSize: '20px' }}
                                aria-hidden="true"
                            >expand_more</span>
                        </div>
                    </div>

                    {/* Nº de Série */}
                    <div>
                        <label className={labelClasses}>Nº DE SÉRIE</label>
                        <input
                            required
                            type="text"
                            className={inputClasses}
                            value={assetForm.serialNumber || ''}
                            onChange={e => onFormChange({ ...assetForm, serialNumber: e.target.value })}
                            placeholder="000000000"
                        />
                    </div>

                    {/* Localização */}
                    <div>
                        <label className={labelClasses}>LOCALIZAÇÃO</label>
                        <input
                            required
                            type="text"
                            className={inputClasses}
                            value={assetForm.location || ''}
                            onChange={e => onFormChange({ ...assetForm, location: e.target.value })}
                            placeholder="Setor ou área"
                        />
                    </div>

                    {/* Fabricante */}
                    <div>
                        <label className={labelClasses}>FABRICANTE</label>
                        <input
                            required
                            type="text"
                            className={inputClasses}
                            value={assetForm.manufacturer || ''}
                            onChange={e => onFormChange({ ...assetForm, manufacturer: e.target.value })}
                            placeholder="Nome da fabricante"
                        />
                    </div>

                    {/* Capacidade */}
                    <div>
                        <label className={labelClasses}>CAPACIDADE</label>
                        <input
                            required
                            type="text"
                            className={inputClasses}
                            value={assetForm.capacity || ''}
                            onChange={e => onFormChange({ ...assetForm, capacity: e.target.value })}
                            placeholder="Ex: 10 Ton"
                        />
                    </div>

                    {/* Vão */}
                    <div>
                        <label className={labelClasses}>VÃO (M)</label>
                        <input
                            required
                            type="text"
                            className={inputClasses}
                            value={assetForm.span || ''}
                            onChange={e => onFormChange({ ...assetForm, span: e.target.value })}
                            placeholder="Ex: 22m"
                        />
                    </div>

                    {/* Data de Comissionamento */}
                    <div>
                        <label className={labelClasses}>DATA DE COMISSIONAMENTO</label>
                        <input
                            required
                            type="date"
                            className={inputClasses}
                            value={assetForm.commissioningDate || ''}
                            onChange={e => onFormChange({ ...assetForm, commissioningDate: e.target.value })}
                        />
                    </div>

                    <div className="h-2" />
                </form>

                {/* Footer Buttons */}
                <div className="px-6 pb-8 pt-4 flex items-center justify-between flex-shrink-0 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="font-headline font-bold text-sm text-[#004a88] uppercase tracking-widest px-4 py-3 rounded-full hover:bg-blue-50 active:scale-95 transition-all"
                    >
                        CANCELAR
                    </button>
                    <button
                        type="submit"
                        form="asset-form"
                        onClick={onSave as any}
                        disabled={isSaving}
                        className="bg-[#004a88] text-white font-headline font-bold text-sm uppercase tracking-widest px-10 py-4 rounded-full shadow-lg shadow-blue-900/20 hover:bg-primary active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'SALVAR'}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default AssetFormModal;
