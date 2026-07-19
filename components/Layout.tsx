
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
import { db } from '../services/offlineDb';
import { alertService, DOCS_CHANGED_EVENT } from '../services/alertService';
import { useLiveQuery } from 'dexie-react-hooks';
import InstructionsModal from './InstructionsModal';

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
  const [showInstructions, setShowInstructions] = useState(false);
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

  const pendingSyncCount = useLiveQuery(
    async () => {
      try {
        const assetsCount = await db.ativos.where('sync_status').anyOf(['PENDING', 'ERROR']).count();
        const recordsCount = await db.ordens_servico.where('sync_status').anyOf(['PENDING', 'ERROR']).count();
        const rdoCount = await db.rdo.where('sync_status').anyOf(['PENDING', 'ERROR']).count();
        const anexosCount = await db.anexos.where('sync_status').anyOf(['PENDING', 'ERROR']).count();
        return assetsCount + recordsCount + rdoCount + anexosCount;
      } catch (e) {
        return 0;
      }
    },
    []
  ) || 0;

  const menuItems = [
    ...((currentUser.role === 'ADMIN' || currentUser.role === 'TECNICO_EQUIPAMENTO') ? [
      { id: 'assets', label: 'CLIENTES', icon: 'group' },
      { id: 'history', label: 'HISTÓRICO', icon: 'history' },
      { id: 'open-orders', label: 'ORDENS EM ABERTO', icon: 'engineering', badge: openDraftsCount > 0 ? (
        <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold ml-auto">{openDraftsCount}</span>
      ) : undefined }
    ] : []),
    { id: 'rdo', label: 'RELATÓRIOS DIÁRIOS', icon: 'event_note' },
    { id: 'sync-pendencies', label: 'SINCRONIZAÇÃO', icon: 'sync', badge: pendingSyncCount > 0 ? (
      <div className="w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white shadow-sm animate-pulse ml-auto" />
    ) : undefined },
    ...(currentUser.role === 'ADMIN' ? [
      { id: 'documents', label: 'DOCUMENTOS', icon: 'description', badge: criticalAlerts > 0 ? (
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse ml-auto" />
      ) : undefined },
      { id: 'users', label: 'USUÁRIOS', icon: 'manage_accounts' }
    ] : []),
    { id: 'instructions', label: 'INSTRUÇÕES', icon: 'menu_book' }
  ];

  return (
    <div className="flex h-screen bg-surface overflow-hidden font-body">
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar / NavigationDrawer */}
      <aside
        ref={sidebarRef}
        className={`fixed lg:relative top-0 left-0 h-full z-[110] flex flex-col py-8 bg-white w-72 rounded-r-2xl shadow-2xl shadow-blue-900/5 transition-all duration-300 ease-in-out
          ${isExpanded ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header: Profile Section */}
        <div className="px-6 mb-10">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-primary tracking-tighter font-headline">FORTE - PRO 4.0</h1>
            <span className="text-[10px] font-bold tracking-wide uppercase text-slate-400 font-label mt-1">
              {currentUser.name || 'Engenheiro Responsável'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { 
                if (item.id === 'instructions') {
                  setShowInstructions(true);
                } else {
                  setActiveTab(item.id);
                }
                setIsExpanded(false); 
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ease-in-out hover:translate-x-1 active:scale-95
                ${activeTab === item.id
                  ? 'bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] nav-item-active text-[#0062B1]'
                  : 'text-slate-400 border-transparent hover:bg-slate-50'}`}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontSize: '24px' }}>{item.icon}</span>
              <span className="font-bold tracking-wide uppercase text-[11px] font-label text-left flex-1">{item.label}</span>
              {item.badge}
            </button>
          ))}
        </nav>

        {/* Footer: Logout */}
        <div className="px-6 mt-auto">
          <button 
            onClick={onLogout}
            className="w-full py-4 flex items-center justify-center space-x-2 rounded-xl bg-[#e9eff6] text-slate-600 border border-transparent hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="font-headline font-bold tracking-widest text-xs uppercase pt-0.5">SAIR</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="w-full top-0 sticky z-40 bg-background flex justify-between items-center px-6 py-4">
          <div className="w-12">
            <button
              onClick={() => setIsExpanded(true)}
              className="text-primary hover:bg-surface-container transition-colors p-2 rounded-full active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>

          <h1 className="font-headline font-bold uppercase tracking-widest text-lg text-blue-950 text-center flex-1">
            {pageTitle || 'CLIENTES'}
          </h1>

          <div className="flex items-center gap-1 w-12 justify-end">
            {headerAction}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
      </main>
      <InstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </div>
  );
};

export default Layout;
