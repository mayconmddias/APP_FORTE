import React from 'react';
import { UserProfile } from '../types';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile;
  openDraftsCount: number;
  pendingSyncCount: number;
  onOpenMoreMenu: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  openDraftsCount,
  pendingSyncCount,
  onOpenMoreMenu
}) => {
  const role = currentUser.role;

  // Permissões de acordo com o nível de acesso
  const hasAccessToAdminTech = role === 'ADMIN' || role === 'TECNICO_EQUIPAMENTO';

  const items = [
    { id: 'assets', label: 'Clientes', icon: 'group', enabled: hasAccessToAdminTech },
    { id: 'history', label: 'Relatórios', icon: 'history', enabled: hasAccessToAdminTech },
    { id: 'open-orders', label: 'Os Abertas', icon: 'engineering', enabled: hasAccessToAdminTech, badge: openDraftsCount > 0 ? openDraftsCount : undefined },
    { id: 'rdo', label: 'Diário', icon: 'event_note', enabled: true },
    { id: 'more', label: 'Mais', icon: 'more_horiz', enabled: true, badge: pendingSyncCount > 0 ? true : undefined }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center justify-around z-50 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.03)] lg:hidden">
      {items.map((item) => {
        const isActive = item.id === 'more' 
          ? ['sync-pendencies', 'documents', 'users', 'instructions'].includes(activeTab)
          : activeTab === item.id;

        return (
          <button
            key={item.id}
            disabled={!item.enabled}
            onClick={() => {
              if (item.id === 'more') {
                onOpenMoreMenu();
              } else {
                setActiveTab(item.id);
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative
              ${!item.enabled ? 'opacity-30 pointer-events-none' : 'active:scale-95'}`}
          >
            {/* Container do ícone com indicador de estado ativo (Material Design 3 style) */}
            <div className={`flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200 mb-1
              ${isActive ? 'bg-[#e0f2fe] text-[#0062B1]' : 'text-slate-400'}`}
            >
              <span className="material-symbols-outlined text-xl select-none notranslate" style={{ fontSize: '24px' }}>
                {item.icon}
              </span>
              
              {/* Badges de contagem e sincronização */}
              {item.badge !== undefined && (
                <span className={`absolute ${item.badge === true ? 'top-1.5 right-[32%] w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white shadow-sm animate-pulse' : 'top-0.5 right-[22%] bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm'}`}>
                  {item.badge === true ? '' : item.badge}
                </span>
              )}
            </div>
            
            <span className={`text-[10px] font-bold tracking-tight
              ${isActive ? 'text-[#0062B1] font-extrabold' : 'text-slate-400'}`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
