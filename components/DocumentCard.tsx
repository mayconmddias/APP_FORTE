
import React, { useState } from 'react';
import { Documento } from '../types';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentCardProps {
  documento: Documento;
  onUpdateDate: (date: string | null) => void;
  onSetPermanent: (status: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ documento, onUpdateDate, onSetPermanent }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getStatus = () => {
    if (documento.status_permanente === 'APT') {
      return {
        label: 'APT / PERMANENTE',
        color: 'bg-white border-slate-200',
        textColor: 'text-slate-600',
        badge: 'bg-emerald-50 text-emerald-600',
        icon: <CheckCircle2 size={16} />
      };
    }

    if (!documento.data_vencimento) {
      return {
        label: 'DATA NÃO INFORMADA',
        color: 'bg-white border-slate-100',
        textColor: 'text-slate-400',
        badge: 'bg-slate-50 text-slate-400',
        icon: <Clock size={16} />
      };
    }

    const today = new Date();
    const expiryDate = parseISO(documento.data_vencimento);
    const daysRemaining = differenceInDays(expiryDate, today);

    if (daysRemaining <= 30) {
      return {
        label: daysRemaining < 0 ? 'VENCIDO' : `VENCE EM ${daysRemaining} DIAS`,
        color: 'bg-red-500 border-red-600',
        textColor: 'text-white',
        badge: 'bg-white/20 text-white',
        icon: <AlertTriangle size={16} />,
        critical: true
      };
    }

    if (daysRemaining <= 40) {
      return {
        label: `VENCE EM ${daysRemaining} DIAS`,
        color: 'bg-yellow-400 border-yellow-500',
        textColor: 'text-slate-900',
        badge: 'bg-white/40 text-slate-900',
        icon: <AlertTriangle size={16} />
      };
    }

    return {
      label: `VENCE EM ${format(expiryDate, 'dd/MM/yyyy')}`,
      color: 'bg-white border-slate-200',
      textColor: 'text-slate-600',
      badge: 'bg-blue-50 text-[#0066CC]',
      icon: <CheckCircle2 size={16} />
    };
  };

  const status = getStatus();

  return (
    <div className={`relative flex flex-col p-5 rounded-[2rem] border-2 transition-all group hover:scale-[1.02] shadow-sm
      ${status.color} ${status.textColor}`}>
      
      <div className="flex-1 space-y-3">
        <h4 className="text-[11px] font-black uppercase tracking-tight leading-tight min-h-[2.5rem] line-clamp-2">
          {documento.tipo_documento}
        </h4>

        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${status.badge}`}>
          {status.icon}
          {status.label}
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <button 
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
              ${status.critical ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <span>{documento.data_vencimento ? format(parseISO(documento.data_vencimento), 'dd/MM/yyyy') : 'ALTERAR DATA'}</span>
            <Calendar size={14} />
          </button>

          {showDatePicker && (
            <div className="absolute bottom-full mb-2 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-20 animate-in slide-in-from-bottom-2">
              <input 
                type="date"
                onChange={(e) => {
                  onUpdateDate(e.target.value);
                  setShowDatePicker(false);
                }}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 uppercase"
              />
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={() => {
                    onSetPermanent('APT');
                    setShowDatePicker(false);
                  }}
                  className="flex-1 bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100"
                >
                  Definir APT
                </button>
                <button 
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1 bg-slate-50 text-slate-400 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
