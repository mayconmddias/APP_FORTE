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
    const [day, month, year] = (record.date || '').split('-').reverse();
    const formattedDate = `${day}/${month}/${year}`;
    const pdfTitle = `Relatório Diário - RD #${record.rdoNumber} - ${formattedDate}`;

    let photosHtml = '';
    if (record.photos && record.photos.length > 0) {
      photosHtml = `
        <section class="mt-8 avoid-break">
          <h4 class="text-[11px] font-bold text-brandBlue uppercase tracking-widest mb-4 border-l-4 border-brandBlue pl-3">Registro Fotográfico</h4>
          <div class="grid grid-cols-2 gap-4">
            ${record.photos.map(photo => `
              <div class="border border-gray-100 rounded-xl p-1 bg-white shadow-sm overflow-hidden">
                <img src="${photo}" class="w-full h-auto rounded-lg object-contain" />
              </div>
            `).join('')}
          </div>
        </section>`;
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <title>${pdfTitle}</title>
  <link href="https://fonts.googleapis.com" rel="preconnect"/>
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet"/>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brandBlue: '#004a88',
            brandLightGrey: '#f8fafc',
            brandDarkGrey: '#334155',
            brandLabel: '#64748b',
          },
          fontFamily: {
            sans: ['Manrope', 'sans-serif'],
            heading: ['Space Grotesk', 'sans-serif'],
          },
        },
      },
    }
  </script>
  <style>
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
    .avoid-break { break-inside: avoid !important; }
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  </style>
</head>
<body class="bg-gray-100 font-sans text-brandDarkGrey antialiased" onload="window.print()">
  <main class="content-container mx-auto max-w-[1000px] bg-white min-h-screen shadow-2xl my-8 p-10">
    <header class="grid grid-cols-[1fr_auto_1fr] items-center border-b-2 border-brandBlue pb-6 mb-8">
      <div class="flex items-center gap-3">
        <div class="w-[130px] h-[65px] flex items-center justify-center">
          <img src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png" class="w-full h-full object-contain" alt="Forte Logo" />
        </div>
      </div>
      <div class="flex flex-col gap-1 text-center">
        <span class="text-2xl font-heading text-brandBlue tracking-tight uppercase font-bold leading-none">FORTE <span class="font-normal opacity-70">ENGENHARIA</span></span>
        <h1 class="text-[16px] font-heading text-brandBlue uppercase tracking-wide leading-tight">Relatório Diário de Obra</h1>
      </div>
      <div class="flex flex-col items-end gap-0">
        <p class="text-brandLabel text-[9px] font-semibold uppercase tracking-widest leading-none">RD Nº</p>
        <p class="text-lg font-heading text-brandBlue leading-tight">#${String(record.rdoNumber).padStart(4, '0')}</p>
        <p class="text-[10px] font-bold text-brandLabel uppercase mt-1 font-sans">${formattedDate}</p>
      </div>
    </header>

    <section class="grid grid-cols-4 gap-y-6 gap-x-4 mb-10 border-b border-gray-100 pb-8">
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Cliente</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${record.clientName}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Descrição do Serviço</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${record.siteName}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Horário de Fechamento</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${record.endTime || '--:--'}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Responsável</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${record.technicianName}</span>
      </div>
    </section>

    <section class="mb-10 avoid-break">
      <h4 class="text-[11px] font-bold text-brandBlue uppercase tracking-widest mb-4 border-l-4 border-brandBlue pl-3">Atividades Realizadas</h4>
      <div class="p-6 bg-brandLightGrey rounded-2xl border border-gray-100 min-h-[120px]">
        <div class="text-[11px] text-brandDarkGrey leading-relaxed uppercase whitespace-pre-wrap font-sans">${record.activities.join('\n')}</div>
      </div>
    </section>

    ${photosHtml}

    <section class="mt-16 pt-10 border-t border-gray-100 avoid-break">
      <div class="flex justify-center">
        <div class="flex flex-col items-center max-w-xs w-full">
          <div class="h-12 flex items-end justify-center mb-2">
            <span style="font-family: 'Manrope', sans-serif; font-size: 16px; color: #004a88; font-weight: 500; font-style: italic; letter-spacing: 1px;">${record.technicianName}</span>
          </div>
          <div class="w-full border-b border-brandDarkGrey"></div>
          <p class="text-[10px] text-center text-brandLabel uppercase font-bold mt-2">Responsável Técnico / Finalização RD</p>
          <p class="text-[9px] text-center text-brandDarkGrey uppercase font-medium mt-1 font-sans">${record.technicianName}</p>
        </div>
      </div>
    </section>

    <footer class="mt-20 pt-8 border-t border-gray-100 text-center">
      <p class="text-[9px] text-brandLabel uppercase tracking-widest font-bold font-sans">Forte Engenharia - Controle de Campo - Em conformidade com Normas de Segurança</p>
    </footer>
  </main>
</body>
</html>`;

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
