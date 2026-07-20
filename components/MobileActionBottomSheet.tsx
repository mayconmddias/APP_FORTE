import React, { useEffect, useState } from 'react';

interface MobileActionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNewClient: () => void;
  onDelete: () => void;
  showDeleteOption: boolean;
}

const MobileActionBottomSheet: React.FC<MobileActionBottomSheetProps> = ({
  isOpen,
  onClose,
  onNewClient,
  onDelete,
  showDeleteOption
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setAnimate(true), 20);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop de fundo escuro com fecho ao clicar fora */}
      <div 
        className={`fixed inset-0 bg-black/40 z-[150] transition-opacity duration-300 ease-out
          ${animate ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Conteiner deslizante inferior (Bottom Sheet) */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[160] flex flex-col px-6 pt-4 pb-10 shadow-2xl transition-transform duration-300 ease-out max-h-[80vh]
          ${animate ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Barra de arraste superior */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

        {/* Título de seção */}
        <h3 className="text-slate-900 font-headline font-black text-xs uppercase tracking-wider mb-4 px-4">
          Ações Rápidas
        </h3>

        {/* Lista de Ações */}
        <div className="space-y-1">
          <button
            onClick={() => {
              onClose();
              onNewClient();
            }}
            className="w-full flex items-center space-x-4 px-4 py-4 rounded-2xl active:bg-slate-100 transition-all duration-150 text-left text-slate-700 hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-2xl select-none notranslate text-blue-600">
              add_circle
            </span>
            <span className="text-xs font-bold uppercase tracking-wider">
              Novo Cliente
            </span>
          </button>

          {showDeleteOption && (
            <button
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="w-full flex items-center space-x-4 px-4 py-4 rounded-2xl active:bg-red-50 text-red-600 transition-all duration-150 text-left hover:bg-red-50/50"
            >
              <span className="material-symbols-outlined text-2xl select-none notranslate">
                delete
              </span>
              <span className="text-xs font-bold uppercase tracking-wider">
                Excluir Clientes
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileActionBottomSheet;
