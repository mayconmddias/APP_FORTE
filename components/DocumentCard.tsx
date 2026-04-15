
import React, { useState } from 'react';
import { Documento } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';

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
        cardBg: 'bg-white',
        cardBorder: 'border-emerald-100',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-600',
        icon: 'verified',
        critical: false
      };
    }
    if (!documento.data_vencimento) {
      return {
        label: 'DATA NÃO INFORMADA',
        cardBg: 'bg-white',
        cardBorder: 'border-slate-100',
        badgeBg: 'bg-slate-50',
        badgeText: 'text-slate-400',
        icon: 'schedule',
        critical: false
      };
    }
    const today = new Date();
    const expiryDate = parseISO(documento.data_vencimento);
    const daysRemaining = differenceInDays(expiryDate, today);

    if (daysRemaining <= 0) {
      return {
        label: 'VENCIDO',
        cardBg: 'bg-red-500',
        cardBorder: 'border-red-600',
        badgeBg: 'bg-white/20',
        badgeText: 'text-white',
        textColor: 'text-white',
        icon: 'error',
        critical: true
      };
    }
    if (daysRemaining <= 40) {
      return {
        label: `VENCE EM ${daysRemaining} DIAS`,
        cardBg: daysRemaining <= 10 ? 'bg-red-500' : 'bg-amber-400',
        cardBorder: daysRemaining <= 10 ? 'border-red-500' : 'border-amber-400',
        badgeBg: 'bg-white/20',
        badgeText: daysRemaining <= 10 ? 'text-white' : 'text-slate-900',
        textColor: daysRemaining <= 10 ? 'text-white' : 'text-slate-900',
        icon: 'warning',
        critical: true
      };
    }
    return {
      label: format(expiryDate, 'dd/MM/yyyy'),
      cardBg: 'bg-white',
      cardBorder: 'border-slate-100',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-[#004a88]',
      icon: 'event_available',
      critical: false
    };
  };

  const status = getStatus();
  const isColoredCard = status.critical;

  return (
    <div className={`relative flex flex-col p-4 rounded-2xl border-2 transition-all group shadow-sm ${status.cardBg} ${status.cardBorder} ${status.textColor || 'text-blue-950'}`}>

      {/* Nome do documento */}
      <h4 className={`font-body font-bold text-[10px] uppercase tracking-widest leading-snug min-h-[2rem] line-clamp-2 mb-3 ${isColoredCard ? 'text-white' : 'text-blue-950'}`}>
        {documento.tipo_documento}
      </h4>

      {/* Badge de status */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest mb-4 ${status.badgeBg} ${status.badgeText}`}>
        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>{status.icon}</span>
        {status.label}
      </div>

      {/* Controle de data */}
      <div className="relative mt-auto">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
            isColoredCard ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-[#eef2f7] text-slate-500 hover:bg-slate-200'
          }`}
        >
          <span>{documento.data_vencimento ? format(parseISO(documento.data_vencimento), 'dd/MM/yyyy') : 'ALTERAR DATA'}</span>
          <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '14px' }}>calendar_today</span>
        </button>

        {showDatePicker && (
          <div
            className="absolute bottom-full mb-2 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-20 animate-in slide-in-from-bottom-2"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[9px] font-bold text-[#004a88] uppercase tracking-widest mb-2">Selecionar Data</p>
            <input
              type="date"
              onChange={(e) => { onUpdateDate(e.target.value); setShowDatePicker(false); }}
              className="w-full px-3 py-2.5 bg-[#eef2f7] border-none rounded-xl text-xs font-body text-blue-950 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { onSetPermanent('APT'); setShowDatePicker(false); }}
                className="flex-1 bg-emerald-50 text-emerald-600 px-2 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all"
              >
                DEFINIR APT
              </button>
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 bg-slate-50 text-slate-400 px-2 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;
