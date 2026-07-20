import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';

interface MobileMoreBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile;
  criticalAlerts: number;
  onLogout: () => void;
  onOpenInstructions: () => void;
}

const MobileMoreBottomSheet: React.FC<MobileMoreBottomSheetProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  currentUser,
  criticalAlerts,
  onLogout,
  onOpenInstructions
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

  const role = currentUser.role;

  const menuItems = [
    { id: 'instructions', label: 'Guia', icon: 'menu_book' },
    { id: 'sync-pendencies', label: 'Sincronização', icon: 'sync' },
    ...(role === 'ADMIN' ? [
      { id: 'documents', label: 'Documentos', icon: 'description', badge: criticalAlerts > 0 ? criticalAlerts : undefined },
      { id: 'users', label: 'Usuários', icon: 'manage_accounts' }
    ] : [])
  ];

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
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[160] flex flex-col px-6 pt-4 pb-10 shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] overflow-y-auto
          ${animate ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Barra de arraste superior */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

        {/* Itens do menu */}
        <div className="space-y-1 mb-6">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onClose();
                  if (item.id === 'instructions') {
                    onOpenInstructions();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center space-x-4 px-4 py-4 rounded-2xl active:bg-slate-100 transition-all duration-150 text-left
                  ${isActive ? 'bg-[#e0f2fe]/60 text-[#0062B1]' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <span className="material-symbols-outlined text-2xl select-none notranslate">
                  {item.icon}
                </span>
                
                <span className={`flex-1 text-xs font-bold uppercase tracking-wider
                  ${isActive ? 'font-black' : 'font-semibold'}`}
                >
                  {item.label}
                </span>

                {item.badge !== undefined && (
                  <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Divisor */}
        <div className="h-[1px] bg-slate-100 my-2" />

        {/* Botão Sair */}
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="w-full flex items-center space-x-4 px-4 py-4 rounded-2xl active:bg-red-50 text-red-600 transition-all duration-150 text-left"
        >
          <span className="material-symbols-outlined text-2xl select-none notranslate">
            logout
          </span>
          <span className="text-xs font-black uppercase tracking-widest">
            Sair da Conta
          </span>
        </button>
      </div>
    </>
  );
};

export default MobileMoreBottomSheet;
