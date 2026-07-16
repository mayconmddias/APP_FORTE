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
  onPreviewPdf?: (html: string, title: string) => void;
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
  loading,
  onPreviewPdf
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
    const [day, month, year] = (record.date || '').split('-').reverse();
    const formattedDate = `${day}/${month}/${year}`;
    const pdfTitle = `Relatório Diário - RD #${record.rdoNumber} - ${formattedDate}`;

    let photosHtml = '';
    if (record.photos && record.photos.length > 0) {
      photosHtml = `
        <section class="rdo-photos-section">
          <h4 class="rdo-section-title">Registro Fotográfico</h4>
          <div class="photos-grid">
            ${record.photos.map(photo => `
              <div class="photo-card">
                <img src="${photo}" class="photo-img" width="440" height="200" style="object-fit: contain; max-width: 100%; max-height: 100%;" />
              </div>
            `).join('')}
          </div>
        </section>`;
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta content="width=1024" name="viewport"/>
  <title>${pdfTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap');

    /* ===== RESET & BASE ===== */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-variant-ligatures: none !important;
      -webkit-font-variant-ligatures: none !important;
    }
    body {
      font-family: 'Manrope', system-ui, -apple-system, sans-serif;
      color: #334155;
      background-color: #f1f5f9;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* ===== CONTENT CONTAINER ===== */
    .content-container {
      max-width: 1000px;
      margin: 32px auto;
      background: #ffffff;
      min-height: 100vh;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      padding: 40px;
    }

    /* ===== HEADER ===== */
    .report-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      border-bottom: 2px solid #004a88;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .header-logo-wrap { display: flex; align-items: center; gap: 12px; }
    .header-logo-box { width: 130px; height: 65px; display: flex; align-items: center; justify-content: center; }
    .header-logo-box img { width: 100%; height: 100%; object-fit: contain; }
    .header-title-wrap { display: flex; flex-direction: column; gap: 4px; text-align: center; }
    .header-company {
      font-family: 'Space Grotesk', system-ui, sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #004a88;
      text-transform: uppercase;
      letter-spacing: -0.025em;
      line-height: 1;
    }
    .header-company-light { font-weight: 400; opacity: 0.7; }
    .header-report-title {
      font-family: 'Space Grotesk', system-ui, sans-serif;
      font-size: 16px;
      color: #004a88;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.25;
    }
    .header-os-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 0; }
    .header-os-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      line-height: 1;
    }
    .header-os-number {
      font-family: 'Space Grotesk', system-ui, sans-serif;
      font-size: 18px;
      color: #004a88;
      line-height: 1.25;
    }
    .header-date {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-top: 4px;
      font-family: 'Manrope', sans-serif;
    }

    /* ===== INFO GRID ===== */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px 16px;
      margin-bottom: 40px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 32px;
    }
    .info-item { display: flex; flex-direction: column; }
    .info-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 4px;
    }
    .info-value {
      font-weight: 700;
      font-size: 14px;
      color: #334155;
      text-transform: uppercase;
      font-family: 'Manrope', sans-serif;
    }

    /* ===== SECTIONS ===== */
    .rdo-section { margin-bottom: 40px; break-inside: avoid; }
    .rdo-section-title {
      font-size: 11px;
      font-weight: 700;
      color: #004a88;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 16px;
      border-left: 4px solid #004a88;
      padding-left: 12px;
    }
    .rdo-content-box {
      padding: 24px;
      background-color: #f8fafc;
      border-radius: 16px;
      border: 1px solid #f1f5f9;
      min-height: 120px;
    }
    .rdo-content-text {
      font-size: 11px;
      color: #334155;
      line-height: 1.625;
      text-transform: uppercase;
      white-space: pre-wrap;
      font-family: 'Manrope', sans-serif;
    }

    /* ===== PHOTOS ===== */
    .rdo-photos-section { margin-top: 32px; break-inside: avoid; }
    .photos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .photo-card {
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      padding: 8px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      overflow: hidden;
      height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-img { max-width: 100%; max-height: 100%; border-radius: 8px; object-fit: contain; }

    /* ===== SIGNATURE ===== */
    .rdo-signature-section {
      margin-top: 64px;
      padding-top: 40px;
      border-top: 1px solid #f1f5f9;
      break-inside: avoid;
    }
    .signature-center { display: flex; justify-content: center; }
    .signature-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 448px;
      width: 100%;
    }
    .signature-area {
      height: 48px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      margin-bottom: 8px;
      white-space: nowrap;
    }
    .signature-name {
      font-family: 'Manrope', sans-serif;
      font-size: 13px;
      color: #004a88;
      font-weight: 500;
      font-style: italic;
      letter-spacing: 0.5px;
    }
    .signature-line { width: 100%; border-bottom: 1px solid #334155; }
    .signature-role {
      font-size: 10px;
      text-align: center;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      margin-top: 8px;
    }
    .signature-person {
      font-size: 9px;
      text-align: center;
      color: #334155;
      text-transform: uppercase;
      font-weight: 500;
      margin-top: 4px;
      font-family: 'Manrope', sans-serif;
    }

    /* ===== FOOTER ===== */
    .rdo-footer {
      margin-top: 80px;
      padding-top: 32px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
    }
    .rdo-footer-text {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
      font-family: 'Manrope', sans-serif;
    }

    /* ===== PRINT STYLES ===== */
    @media print {
      body { background-color: white !important; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
      .content-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 5mm !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  <main class="content-container">
    <header class="report-header">
      <div class="header-logo-wrap">
        <div class="header-logo-box">
          <img src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png" width="130" height="65" alt="Forte Logo" />
        </div>
      </div>
      <div class="header-title-wrap">
        <span class="header-company">FORTE <span class="header-company-light">ENGENHARIA</span></span>
        <h1 class="header-report-title">Relatório Diário de Obra</h1>
      </div>
      <div class="header-os-wrap">
        <p class="header-os-label">RD Nº</p>
        <p class="header-os-number">#${String(record.rdoNumber).padStart(4, '0')}</p>
        <p class="header-date">${formattedDate}</p>
      </div>
    </header>

    <section class="info-grid">
      <div class="info-item">
        <label class="info-label">Cliente</label>
        <span class="info-value">${record.clientName}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Descrição do Serviço</label>
        <span class="info-value">${record.siteName}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Horário de Fechamento</label>
        <span class="info-value">${record.endTime || '--:--'}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Responsável</label>
        <span class="info-value">${record.technicianName}</span>
      </div>
    </section>

    <section class="rdo-section">
      <h4 class="rdo-section-title">Atividades Realizadas</h4>
      <div class="rdo-content-box">
        <div class="rdo-content-text">${record.activities.join('\n')}</div>
      </div>
    </section>

    ${photosHtml}

    <section class="rdo-signature-section">
      <div class="signature-center">
        <div class="signature-block">
          <div class="signature-area">
            <span class="signature-name">${record.technicianName}</span>
          </div>
          <div class="signature-line"></div>
          <p class="signature-role">Responsável Técnico / Finalização RD</p>
          <p class="signature-person">${record.technicianName}</p>
        </div>
      </div>
    </section>

    <footer class="rdo-footer">
      <p class="rdo-footer-text">Forte Engenharia - Controle de Campo - Em conformidade com Normas de Segurança</p>
    </footer>
  </main>
</body>
</html>`;

    if (onPreviewPdf) {
      onPreviewPdf(html, pdfTitle);
    } else {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

      if (isMobile) {
        // Estilos específicos para forçar repetição de cabeçalho no mobile (iOS/Android)
        const mobileHtml = html.replace('</head>', `
    <style>
      @page { margin: 10mm 5mm !important; }
      .content-container { min-height: auto !important; box-shadow: none !important; margin: 0 !important; padding: 8mm 4mm !important; }
      body { background-color: white !important; }
    </style>
  </head>`);
        
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(mobileHtml);
          win.document.close();
        }
      } else {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();

          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
          }, 1000);
        }
      }
    }
  };

  const clientsWithCompletedRdos = useMemo(() => {
    const clients = new Set<string>();
    records.forEach(r => { 
      if (r.status === 'COMPLETED' && r.clientName) {
        clients.add(r.clientName.trim().toUpperCase()); 
      }
    });
    return Array.from(clients).sort();
  }, [records]);

  const filteredReports = useMemo(() => {
    const baseFiltered = records.filter(rec => {
      const matchesSearch =
        rec.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.technicianName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClient = mode === 'OPEN' || !selectedClient || rec.clientName?.trim().toUpperCase() === selectedClient?.trim().toUpperCase();
      if (!matchesClient || !matchesSearch) return false;
      
      // If client is selected, completed mode, and dates are provided, filter by range
      if (mode === 'COMPLETED' && selectedClient && startDate && endDate) {
        return rec.date >= startDate && rec.date <= endDate;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // If client is selected, completed mode, and no date filter is applied, return last 5 reports
    if (mode === 'COMPLETED' && selectedClient && (!startDate || !endDate)) {
      return baseFiltered.slice(0, 5);
    }

    return baseFiltered;
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
                    {records.filter(r => r.clientName?.trim().toUpperCase() === client?.trim().toUpperCase() && r.status === 'COMPLETED').length} RELATÓRIOS
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
              <span className="font-body text-[9px] font-bold text-blue-950 uppercase truncate max-w-[120px]">{rdo.clientName}</span>
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
