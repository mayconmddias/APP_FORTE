
import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
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
      {/* Botão do sino */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchAlerts(); }}
        className={`relative p-2 rounded-full transition-all ${isOpen ? 'bg-blue-50 text-[#004a88]' : 'hover:bg-slate-100 text-slate-500'}`}
      >
        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '24px', fontVariationSettings: isOpen ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>
        {warningCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-white ${criticalCount > 0 ? 'bg-red-500' : 'bg-amber-400'}`}>
            {warningCount > 9 ? '9+' : warningCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[200] animate-in slide-in-from-top-2 duration-200">

          {/* Header do dropdown */}
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-headline font-bold text-sm text-blue-950 uppercase tracking-widest">Central de Alertas</h3>
              <p className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Vencimentos de Documentos</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>

          {/* Conteúdo */}
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="animate-spin text-[#004a88]" size={28} />
                <span className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verificando prazos...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-emerald-500 select-none notranslate" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                </div>
                <h4 className="font-headline font-bold text-sm text-blue-950 uppercase">Tudo em ordem!</h4>
                <p className="font-body text-[10px] font-bold text-slate-400 uppercase mt-2 leading-relaxed">Nenhum documento vencendo nos próximos 40 dias.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {alerts.map((alert, idx) => (
                  <button
                    key={idx}
                    onClick={() => { onOpenDocuments(); setIsOpen(false); }}
                    className="w-full px-5 py-4 flex items-start gap-4 hover:bg-slate-50/80 transition-all text-left group"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      alert.status === 'CRITICO' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                    }`}>
                      <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                        {alert.status === 'CRITICO' ? 'error' : 'warning'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-bold text-[11px] text-blue-950 uppercase truncate">
                        {alert.funcionarioNome.split(' ').slice(0, 2).join(' ')}
                      </p>
                      <p className="font-body text-[10px] text-slate-400 uppercase tracking-tight mt-0.5 truncate">
                        {alert.documentoTipo}
                      </p>
                      <span className={`font-body text-[9px] font-bold uppercase mt-1.5 inline-block ${
                        alert.status === 'CRITICO' ? 'text-red-500' : 'text-amber-500'
                      }`}>
                        {alert.diasParaVencer < 0
                          ? 'VENCIDO'
                          : alert.diasParaVencer === 0 ? 'VENCE HOJE' : `VENCE EM ${alert.diasParaVencer} DIAS`}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-slate-200 group-hover:text-[#004a88] transition-colors select-none notranslate flex-shrink-0 mt-3" style={{ fontSize: '18px' }}>chevron_right</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé */}
          <button
            onClick={() => { onOpenDocuments(); setIsOpen(false); }}
            className="w-full px-5 py-4 font-headline font-bold text-[11px] text-[#004a88] uppercase tracking-widest hover:bg-blue-50 transition-all border-t border-slate-50 text-center"
          >
            Ver todos os documentos
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
