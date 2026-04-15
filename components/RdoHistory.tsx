import React, { useState, useMemo, useEffect } from 'react';
import GenericModal from './GenericModal';
import { Loader2 } from 'lucide-react';
import { RdoRecord, UserProfile } from '../types';

interface RdoHistoryProps {
  records: RdoRecord[];
  mode: 'COMPLETED' | 'OPEN';
  userRole?: 'ADMIN' | 'TECNICO';
  selectedClient?: string | null;
  onSelectClient?: (client: string | null) => void;
  onEdit: (record: RdoRecord) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onGeneratePdf: (record: RdoRecord) => void;
  onTitleChange?: (title: string | null) => void;
  loading?: boolean;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const RdoHistory: React.FC<RdoHistoryProps> = ({
  records,
  mode,
  userRole,
  selectedClient,
  onSelectClient,
  onEdit,
  onDelete,
  onNew,
  onGeneratePdf,
  onTitleChange,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDesc, setAlertDesc] = useState('');

  useEffect(() => {
    if (mode === 'OPEN') {
      onTitleChange?.('RELATÓRIOS ABERTOS');
    } else if (selectedClient) {
      onTitleChange?.('HISTÓRICO RELATÓRIOS');
    } else {
      onTitleChange?.('RELATÓRIO DIÁRIO');
    }
  }, [mode, selectedClient, onTitleChange]);

  const handleGeneratePdf = (record: RdoRecord) => {
    let activitiesHtml = '';
    record.activities.forEach((act, idx) => {
      activitiesHtml += `<div style="margin-bottom: 5px; font-size: 11px;"><strong>${idx + 1}.</strong> ${act}</div>`;
    });

    const [day, month, year] = (record.date || '').split('-').reverse();
    const formattedDate = `${day}-${month}-${year?.slice(-2)}`;
    const pdfTitle = `Relatorio Diario - RD ${record.rdoNumber} - ${formattedDate}`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${pdfTitle}</title><style>
      body { font-family: 'Inter', sans-serif; padding: 30px; color: #1e293b; line-height: 1.4; text-transform: uppercase; }
      .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #004a88; padding-bottom: 20px; }
      .logo { height: 50px; }
      .title-box { text-align: center; flex: 1; }
      .title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 0; color: #004a88; }
      .doc-type { font-size: 10px; font-weight: 900; color: #64748b; letter-spacing: 2px; }
      .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #f8fafc; border-radius: 12px; }
      .info-grid td { padding: 12px 15px; border: 1px solid #e2e8f0; }
      .label { font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px; }
      .value { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; }
      .section { margin-bottom: 25px; break-inside: avoid; }
      .section-title { font-size: 11px; font-weight: 900; color: #004a88; text-transform: uppercase; border-left: 4px solid #004a88; padding-left: 10px; margin-bottom: 12px; }
      .signature-box { margin-top: 50px; width: 100%; border-collapse: collapse; }
      .signature-box td { width: 50%; text-align: center; padding: 20px; }
      .sig-line { border-top: 1px solid #000; margin-bottom: 5px; }
      .sig-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
      .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
      .photo-item { break-inside: avoid; margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px; text-align: center; }
      .photo-item img { width: 100%; height: auto; border-radius: 4px; }
      @media print { body { padding: 0; } }
    </style></head><body onload="window.print()">
      <div class="header">
        <img src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png" class="logo" />
        <div class="title-box">
          <h1 class="title">Relatório Diário</h1>
          <span class="doc-type">RD #${record.rdoNumber} - CONTROLE DE CAMPO</span>
        </div>
        <div style="text-align: right"><span class="label">DATA</span><span class="value">${formatDate(record.date)}</span></div>
      </div>
      <table class="info-grid">
        <tr>
          <td colspan="2"><span class="label">CLIENTE</span><span class="value">${record.clientName}</span></td>
          <td colspan="2"><span class="label">DESCRIÇÃO DO SERVIÇO</span><span class="value">${record.siteName}</span></td>
        </tr>
        <tr>
          <td><span class="label">HORÁRIO DE FECHAMENTO</span><span class="value">${record.endTime || '--:--'}</span></td>
          <td colspan="3"><span class="label">RESPONSÁVEL</span><span class="value">${record.technicianName}</span></td>
        </tr>
      </table>
      <div class="section">
        <div class="section-title">Atividades Realizadas</div>
        <div style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px;">${record.activities.join('<br>')}</div>
      </div>
      ${record.photos.length > 0 ? `
      <div class="section">
        <div class="section-title">Registro Fotográfico</div>
        <div class="photo-grid">
          ${record.photos.map(photo => `<div class="photo-item"><img src="${photo}" /></div>`).join('')}
        </div>
      </div>` : ''}
      <table class="signature-box">
        <tr>
          <td style="width: 100%;">
            <div style="margin-bottom: 2px;">${record.technicianName}</div>
            <div class="sig-line"></div>
            <div class="sig-label">Responsável Técnico / Finalização RD</div>
          </td>
        </tr>
      </table>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const clientsWithCompletedRdos = useMemo(() => {
    const clients = new Set<string>();
    records.forEach(r => { if (r.status === 'COMPLETED') clients.add(r.clientName); });
    return Array.from(clients).sort();
  }, [records]);

  const filteredReports = useMemo(() => {
    return records.filter(rec => {
      const matchesSearch =
        rec.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.technicianName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClient = mode === 'OPEN' || !selectedClient || rec.clientName === selectedClient;
      if (!matchesClient || !matchesSearch) return false;
      if (mode === 'COMPLETED' && selectedClient) {
        if (startDate && endDate) {
          return rec.date >= startDate && rec.date <= endDate;
        } else {
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          return rec.date >= twoDaysAgo.toISOString().split('T')[0];
        }
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, searchTerm, startDate, endDate, selectedClient, mode]);

  // View 1: Lista de Clientes
  if (mode === 'COMPLETED' && !selectedClient) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
        <button
          onClick={onNew}
          className="w-full h-14 bg-[#004a88] text-white rounded-full font-headline font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px' }}>add</span>
          NOVO RELATÓRIO
        </button>

        <div className="grid gap-3">
          {clientsWithCompletedRdos.map(client => (
            <button
              key={client}
              onClick={() => onSelectClient?.(client)}
              className="group bg-white rounded-2xl border border-slate-100 p-5 hover:border-[#004a88]/30 hover:shadow-md transition-all shadow-[0_4px_16px_rgb(0,0,0,0.04)] flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#004a88] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white select-none notranslate" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>corporate_fare</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base text-blue-950 uppercase">{client}</h3>
                  <p className="font-headline text-[10px] font-bold text-[#004a88] uppercase tracking-widest mt-0.5">
                    {records.filter(r => r.clientName === client && r.status === 'COMPLETED').length} RELATÓRIOS
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-200 group-hover:text-[#004a88] transition-colors select-none notranslate" style={{ fontSize: '22px' }}>chevron_right</span>
            </button>
          ))}
          {clientsWithCompletedRdos.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-100">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-slate-300 select-none notranslate" style={{ fontSize: '28px' }}>description</span>
              </div>
              <p className="font-headline font-bold text-sm text-slate-400 uppercase">Nenhum cliente com relatório finalizado.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // View 2: Lista de Relatórios
  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">

      {/* Botão Voltar */}
      {mode === 'COMPLETED' && (
        <button
          onClick={() => onSelectClient?.(null)}
          className="flex items-center gap-2 text-[#004a88] font-headline font-bold text-[11px] uppercase tracking-widest hover:bg-blue-50 px-3 py-2 rounded-full transition-all"
        >
          <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>arrow_back</span>
          Voltar aos Clientes
        </button>
      )}

      {/* Filtros */}
      {mode !== 'OPEN' && selectedClient && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] p-4 space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none notranslate pointer-events-none" style={{ fontSize: '18px' }}>search</span>
            <input
              type="text"
              placeholder="Buscar por obra ou descrição..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-5 bg-[#eef2f7] border-none rounded-full font-body text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 select-none notranslate pointer-events-none" style={{ fontSize: '16px' }}>calendar_today</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-10 pl-10 pr-2 bg-[#eef2f7] border-none rounded-xl font-body text-[11px] outline-none transition-all" />
            </div>
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 select-none notranslate pointer-events-none" style={{ fontSize: '16px' }}>calendar_today</span>
              <input type="date" value={endDate} onChange={e => {
                const val = e.target.value;
                if (startDate && val) {
                  const diffDays = Math.ceil(Math.abs(new Date(val).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
                  if (diffDays > 30) { 
                    setAlertTitle('Intervalo Inválido');
                    setAlertDesc('O intervalo máximo para consulta é de 30 dias.');
                    setShowAlert(true);
                    return; 
                  }
                }
                setEndDate(val);
              }} className="w-full h-10 pl-10 pr-2 bg-[#eef2f7] border-none rounded-xl font-body text-[11px] outline-none transition-all" />
            </div>
          </div>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="font-headline font-bold text-[10px] text-[#004a88] uppercase tracking-widest text-center w-full py-1">
              Limpar Filtro de Datas
            </button>
          )}
        </div>
      )}

      {/* Cards de Relatórios */}
      <div className="grid grid-cols-1 gap-3">
        {filteredReports.map((rdo) => (
          <div
            key={rdo.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-body text-[9px] font-bold text-slate-400 uppercase tracking-widest">RD</span>
                <span className="font-headline font-bold text-sm text-blue-950">#{rdo.rdoNumber}</span>
              </div>
              <span className="font-body text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{rdo.clientName}</span>
            </div>

            <h3 className="font-headline font-bold text-sm text-blue-950 uppercase truncate mb-3">
              {rdo.siteName || 'DESCRIÇÃO NÃO INFORMADA'}
            </h3>

            <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
              <span className="font-body text-[10px] font-bold text-slate-400">{rdo.date?.split('-').reverse().join('/')}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(rdo)}
                  className={`p-2 text-slate-300 hover:text-[#004a88] hover:bg-blue-50 rounded-full transition-all ${rdo.status === 'COMPLETED' && userRole !== 'ADMIN' ? 'hidden' : ''}`}
                >
                  <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>edit</span>
                </button>
                <button onClick={() => handleGeneratePdf(rdo)} className="p-2 text-slate-300 hover:text-[#004a88] hover:bg-blue-50 rounded-full transition-all">
                  <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>description</span>
                </button>
                {userRole === 'ADMIN' && (
                  <button onClick={() => onDelete(rdo.local_id || rdo.id)} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                    <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-slate-300 select-none notranslate" style={{ fontSize: '28px' }}>search_off</span>
            </div>
            <p className="font-headline font-bold text-sm text-slate-400 uppercase">Nenhum relatório encontrado.</p>
          </div>
        )}
      </div>

      <GenericModal 
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertTitle}
        description={alertDesc}
        type="WARNING"
      />
    </div>
  );
};

export default RdoHistory;
