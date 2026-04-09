
import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, X, ChevronRight, Loader2 } from 'lucide-react';
import { alertService, AlertItem } from '../services/alertService';

interface NotificationCenterProps {
  onOpenDocuments: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onOpenDocuments }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    const data = await alertService.getGlobalAlerts();
    setAlerts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const criticalCount = alerts.filter(a => a.status === 'CRITICO').length;
  const warningCount = alerts.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchAlerts(); }}
        className={`relative p-2 rounded-xl transition-all
          ${isOpen ? 'bg-blue-50 text-[#0066CC]' : 'hover:bg-slate-50 text-slate-600'}`}
      >
        <Bell size={24} strokeWidth={2.5} />
        {warningCount > 0 && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-white
            ${criticalCount > 0 ? 'bg-red-500' : 'bg-yellow-400'}`}>
            {warningCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-[200] animate-in slide-in-from-top-2">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Centro de Alertas</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Vencimentos de Documentos</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-slate-200 rounded-xl text-slate-400"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verificando Prazos...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <Bell size={32} />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase">Tudo em ordem!</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Nenhum documento vencendo nos próximos 40 dias.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {alerts.map((alert, idx) => (
                  <button
                    key={idx}
                    onClick={() => { onOpenDocuments(); setIsOpen(false); }}
                    className="w-full p-4 flex items-start gap-4 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className={`p-2 rounded-xl mt-0.5
                      ${alert.status === 'CRITICO' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-600'}`}>
                      <AlertTriangle size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black text-slate-900 uppercase truncate leading-tight">
                        {alert.funcionarioNome.split(' ').slice(0, 2).join(' ')}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 line-clamp-1">
                        {alert.documentoTipo}
                      </div>
                      <div className={`text-[9px] font-black uppercase mt-1.5 inline-block
                        ${alert.status === 'CRITICO' ? 'text-red-500' : 'text-yellow-600'}`}>
                        {alert.diasParaVencer < 0 
                          ? 'VENCIDO' 
                          : alert.diasParaVencer === 0 ? 'VENCE HOJE' : `VENCE EM ${alert.diasParaVencer} DIAS`}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 mt-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => { onOpenDocuments(); setIsOpen(false); }}
            className="w-full p-4 bg-slate-50 text-[#0066CC] text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all border-t border-slate-100"
          >
            Ver todos os documentos
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
