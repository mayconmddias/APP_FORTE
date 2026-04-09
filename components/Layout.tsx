
import React, { useState, useEffect, useRef } from 'react';
import {
  Construction,
  LogOut,
  ShieldCheck,
  History,
  Users,
  Clock,
  Menu,
  X,
  Wrench,
  RefreshCw,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { UserProfile } from '../types';
import SyncStatus from './SyncStatus';
import { alertService, DOCS_CHANGED_EVENT } from '../services/alertService';
import { useLiveQuery } from 'dexie-react-hooks';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  currentUser: UserProfile;
  pageTitle?: string | null;
  headerAction?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout, currentUser, pageTitle, headerAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAlertCount = async () => {
      const alerts = await alertService.getGlobalAlerts();
      setCriticalAlerts(alerts.length);
    };

    fetchAlertCount();
    
    // Ouvir mudanças nos documentos
    window.addEventListener(DOCS_CHANGED_EVENT, fetchAlertCount);

    const interval = setInterval(fetchAlertCount, 10 * 60 * 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DOCS_CHANGED_EVENT, fetchAlertCount);
    };
  }, []);

  const openDraftsCount = useLiveQuery(
    async () => {
      try {
        return await db.ordens_servico.where('status').equals('OPEN').count();
      } catch (e) {
        return 0;
      }
    },
    []
  ) || 0;

  const menuItems = [
    { id: 'assets', label: 'CLIENTES', icon: <Construction size={22} /> },
    { id: 'history', label: 'HISTÓRICO', icon: <History size={22} /> },
    { id: 'open-orders', label: 'OS EM ABERTAS', icon: <Clock size={22} />, badge: openDraftsCount > 0 ? (
      <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full">{openDraftsCount}</span>
    ) : undefined },
    { id: 'rdo', label: 'RELATÓRIO DIÁRIO', icon: <FileText size={22} /> },
    { id: 'sync-pendencies', label: 'SINCRONIZAÇÃO', icon: <RefreshCw size={22} /> },
    ...(currentUser.role === 'ADMIN' ? [
      { id: 'documents', label: 'DOCUMENTOS', icon: <ShieldAlert size={22} />, badge: criticalAlerts > 0 ? (
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
      ) : undefined },
      { id: 'users', label: 'USUÁRIOS', icon: <Users size={22} /> }
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {isExpanded && (
        <div
          className="fixed inset-0 bg-transparent z-[100] transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full bg-white text-[#0066CC] flex flex-col border-r border-slate-200 shadow-xl z-[110] transition-transform duration-300 ease-in-out w-64
          ${isExpanded ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center justify-center w-full">
            <img
              src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png"
              alt="Logo Forte"
              className="h-16 w-auto object-contain transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-2 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsExpanded(false); }}
              className={`w-full flex items-center px-4 py-4 rounded-2xl transition-all relative group 
                ${activeTab === item.id
                  ? 'bg-blue-50 text-[#0066CC] font-bold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-[#0066CC]'}`}
            >
              <div className="flex-shrink-0 relative">
                {item.icon}
              </div>
              <div className="ml-4 font-black flex-1 flex items-center justify-between text-xs uppercase tracking-tight">
                <span>{item.label}</span>
                {item.badge}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-50">
          <button
            onClick={onLogout}
            className="w-full flex items-center px-4 py-4 rounded-2xl bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group"
          >
            <LogOut size={22} />
            <span className="ml-4 text-xs font-black uppercase">Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors mr-1"
            >
              <Menu size={26} strokeWidth={2.5} />
            </button>

            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] ml-1">
              {pageTitle || 'GESTÃO DE CLIENTES'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <SyncStatus />
            {headerAction}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
