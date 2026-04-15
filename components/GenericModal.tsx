import React from 'react';
import { createPortal } from 'react-dom';

interface GenericModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: 'INFO' | 'WARNING' | 'DANGER' | 'INPUT';
  inputValue?: string;
  onInputChange?: (val: string) => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  onInputConfirm?: (val: string) => void;
  confirmColor?: string;
}

const GenericModal: React.FC<GenericModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  type = 'INFO',
  inputValue,
  onInputChange,
  confirmLabel = 'CONFIRMAR',
  onConfirm,
  onInputConfirm,
  confirmColor
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'DANGER': return { icon: 'warning', bg: 'bg-red-50', color: 'text-red-500' };
      case 'WARNING': return { icon: 'warning', bg: 'bg-amber-50', color: 'text-amber-500' };
      case 'INPUT': return { icon: 'edit_square', bg: 'bg-blue-50', color: 'text-[#004a88]' };
      default: return { icon: 'info', bg: 'bg-blue-50', color: 'text-[#004a88]' };
    }
  };

  const theme = getIcon();
  const finalConfirmColor = confirmColor || (type === 'DANGER' ? 'bg-red-500' : 'bg-[#004a88]');

  return createPortal(
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-3xl p-8 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 text-center" onClick={e => e.stopPropagation()}>
        <div className={`w-16 h-16 ${theme.bg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
          <span className={`material-symbols-outlined ${theme.color} select-none notranslate`} style={{ fontSize: '32px' }}>{theme.icon}</span>
        </div>
        
        <h3 className="font-headline font-bold text-xl text-blue-950 uppercase mb-3">{title}</h3>
        
        {description && (
          <p className="font-body text-[11px] font-bold text-slate-400 uppercase leading-relaxed mb-8 px-2">
            {description}
          </p>
        )}

        {type === 'INPUT' && (
          <div className="mb-8">
            <input 
              autoFocus
              type="text" 
              value={inputValue} 
              onChange={e => onInputChange?.(e.target.value)}
              placeholder="DIGITE AQUI..."
              className="w-full h-12 px-5 bg-[#eef2f7] border-none rounded-xl font-body text-sm text-blue-950 uppercase outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
              onKeyDown={e => {
                if (e.key === 'Enter' && inputValue?.trim()) {
                  onInputConfirm?.(inputValue);
                }
              }}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 h-12 font-headline font-bold text-[11px] uppercase tracking-widest text-[#004a88] hover:bg-blue-50 rounded-full transition-all"
          >
            CANCELAR
          </button>
          <button 
            onClick={() => {
              if (type === 'INPUT') {
                if (inputValue?.trim()) onInputConfirm?.(inputValue);
              } else {
                onConfirm?.();
              }
            }}
            disabled={type === 'INPUT' && !inputValue?.trim()}
            className={`flex-1 h-12 ${finalConfirmColor} text-white rounded-full font-headline font-bold text-[11px] uppercase tracking-widest shadow-md active:scale-95 disabled:opacity-50 transition-all`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GenericModal;
