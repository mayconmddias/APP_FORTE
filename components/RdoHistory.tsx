import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar, 
  User, 
  ChevronRight, 
  Trash2, 
  Edit3,
  CheckCircle,
  Clock,
  Download,
  AlertCircle,
  ArrowLeft,
  Factory
} from 'lucide-react';
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

    let materialsHtml = '';
    record.materials.forEach(m => {
      materialsHtml += `<tr><td>${m.label}</td><td style="text-align:center; font-weight:bold; color:${m.isOk ? '#059669' : '#dc2626'}">${m.isOk === true ? 'OK' : m.isOk === false ? 'NOK' : '-'}</td><td>${m.observation || '-'}</td></tr>`;
    });

    let equipmentHtml = '';
    const equipment = record.equipment || [];
    equipment.forEach(e => {
      equipmentHtml += `<tr><td>${e.label}</td><td style="text-align:center; font-weight:bold; color:${e.isOk ? '#059669' : '#dc2626'}">${e.isOk === true ? 'OK' : e.isOk === false ? 'NOK' : '-'}</td><td>${e.observation || '-'}</td></tr>`;
    });

    const [day, month, year] = (record.date || '').split('-').reverse();
    const formattedDate = `${day}-${month}-${year?.slice(-2)}`;
    const pdfTitle = `Relatorio Diario - RD ${record.rdoNumber} - ${formattedDate}`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${pdfTitle}</title><style>
      body { font-family: 'Inter', sans-serif; padding: 30px; color: #1e293b; line-height: 1.4; text-transform: uppercase; }
      .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #0066CC; padding-bottom: 20px; }
      .logo { height: 50px; }
      .title-box { text-align: center; flex: 1; }
      .title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0066CC; }
      .doc-type { font-size: 10px; font-weight: 900; color: #64748b; letter-spacing: 2px; }
      
      .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #f8fafc; border-radius: 12px; }
      .info-grid td { padding: 12px 15px; border: 1px solid #e2e8f0; }
      .label { font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px; }
      .value { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; }

      .section { margin-bottom: 25px; break-inside: avoid; }
      .section-title { font-size: 11px; font-weight: 900; color: #0066CC; text-transform: uppercase; border-left: 4px solid #0066CC; padding-left: 10px; margin-bottom: 12px; }
      
      .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .data-table th, .data-table td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 10px; }
      .data-table th { background: #f1f5f9; font-weight: 900; text-transform: uppercase; color: #475569; }

      .signature-box { margin-top: 50px; width: 100%; border-collapse: collapse; }
      .signature-box td { width: 50%; text-align: center; padding: 20px; }
      .sig-line { border-top: 1px solid #000; margin-bottom: 5px; }
      .sig-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }

      .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
      .photo-item { break-inside: avoid; margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px; text-align: center; }
      .photo-item img { width: 100%; height: auto; border-radius: 4px; }

      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style></head><body onload="window.print()">
      <div class="header">
        <img src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png" class="logo" />
        <div class="title-box">
          <h1 class="title">Relatório Diário</h1>
          <span class="doc-type">RD #${record.rdoNumber} - CONTROLE DE CAMPO</span>
        </div>
        <div style="text-align: right">
          <span class="label">DATA</span>
          <span class="value">${formatDate(record.date)}</span>
        </div>
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
          ${record.photos.map(photo => `
            <div class="photo-item">
              <img src="${photo}" />
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <table class="signature-box">
        <tr>
          <td style="width: 100%;">
            <div className="value" style="margin-bottom: 2px;">${record.technicianName}</div>
            <div class="sig-line"></div>
            <div class="sig-label">Responsável Técnico / Finalização RDO</div>
          </td>
        </tr>
      </table>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const clientsWithCompletedRdos = useMemo(() => {
    const clients = new Set<string>();
    records.forEach(r => {
      if (r.status === 'COMPLETED') clients.add(r.clientName);
    });
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

      // Logic for 2-day restriction and period filter
      if (mode === 'COMPLETED' && selectedClient) {
        if (startDate && endDate) {
          return rec.date >= startDate && rec.date <= endDate;
        } else {
          // Default: only last 2 days
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          const dateLimit = twoDaysAgo.toISOString().split('T')[0];
          return rec.date >= dateLimit;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, searchTerm, startDate, endDate, selectedClient, mode]);

  // View 1: Client List (only for COMPLETED mode and no client selected)
  if (mode === 'COMPLETED' && !selectedClient) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-40">
        <button 
          onClick={onNew}
          className="w-full h-16 bg-[#0066CC] text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 flex items-center justify-center gap-4 active:scale-95 transition-all mb-4"
        >
          <Plus size={20} /> NOVO RELATÓRIO
        </button>

        <div className="grid gap-3">
          {clientsWithCompletedRdos.map(client => (
            <button
              key={client}
              onClick={() => onSelectClient?.(client)}
              className="group flex items-center justify-between p-5 bg-white border border-slate-200 rounded-[24px] hover:border-[#0066CC] hover:shadow-xl hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-[#0066CC] group-hover:text-white transition-all shadow-inner border border-slate-100">
                   <Factory size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-[#0055AA] transition-colors tracking-tight uppercase">{client}</h3>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">
                    {records.filter(r => r.clientName === client && r.status === 'COMPLETED').length} Relatórios Finalizados
                  </p>
                </div>
              </div>
              <ChevronRight size={22} className="text-slate-200 group-hover:text-[#0066CC] transition-all" />
            </button>
          ))}
          {clientsWithCompletedRdos.length === 0 && (
            <div className="text-center py-20 px-6">
              <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                <FileText size={40} />
              </div>
              <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum cliente com relatório finalizado.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // View 2: Report List (for OPEN mode OR COMPLETED mode with selected client)
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-40">
      <div className="flex items-center justify-between">
        {mode === 'COMPLETED' && (
          <button 
            onClick={() => onSelectClient?.(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-[#0066CC] transition-colors font-black text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Voltar aos Clientes
          </button>
        )}
      </div>

<div />

      {/* Filtros de Busca - HIDE IN OPEN MODE */}
      {mode !== 'OPEN' && selectedClient && (
        <div className="flex flex-col gap-3 bg-white p-3 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="BUSCAR POR OBRA OU DESCRIÇÃO..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-[10px] uppercase outline-none focus:ring-4 focus:ring-[#0066CC]/10 transition-all" 
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full h-10 pl-10 pr-2 bg-slate-50 rounded-xl border border-slate-100 font-bold text-[9px] outline-none" 
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                type="date" 
                value={endDate}
                onChange={e => {
                  const val = e.target.value;
                  if (startDate && val) {
                    const d1 = new Date(startDate);
                    const d2 = new Date(val);
                    const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays > 30) {
                      alert('O intervalo máximo é de 30 dias!');
                      return;
                    }
                  }
                  setEndDate(val);
                }}
                className="w-full h-10 pl-10 pr-2 bg-slate-50 rounded-xl border border-slate-100 font-bold text-[9px] outline-none" 
              />
            </div>
          </div>
          {(startDate || endDate) && (
             <button 
               onClick={() => { setStartDate(''); setEndDate(''); }}
               className="text-[9px] font-black text-[#0066CC] uppercase tracking-widest text-center py-1"
             >
               Limpar Filtro de Datas
             </button>
          )}
        </div>
      )}

      {/* Lista de Relatórios */}
      <div className="grid grid-cols-1 gap-4">
        {filteredReports.map((rdo) => (
          <div 
            key={rdo.id}
            className="group bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-lg hover:border-[#0066CC]/20 transition-all duration-300"
          >
            {/* Linha 1: RD # e Cliente */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="text-[9px] font-black uppercase tracking-widest">RD</span>
                <span className="text-[11px] font-black text-slate-900"># {rdo.rdoNumber}</span>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">
                {rdo.clientName}
              </span>
            </div>

            {/* Linha 2: Descrição da Obra (Destaque) */}
            <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-tight mb-3 group-hover:text-[#0066CC] transition-colors truncate">
              {rdo.siteName || "DESCRIÇÃO NÃO INFORMADA"}
            </h3>

            {/* Linha 3: Rodapé (Data e Ações) */}
            <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400">
                {rdo.date.split('-').reverse().join('/')}
              </span>

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => onEdit(rdo)} 
                  className={`w-9 h-9 text-slate-300 hover:text-[#0066CC] transition-all flex items-center justify-center ${rdo.status === 'COMPLETED' && userRole !== 'ADMIN' ? 'hidden' : ''}`}
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => handleGeneratePdf(rdo)} 
                  className="w-9 h-9 text-slate-300 hover:text-slate-900 transition-all flex items-center justify-center"
                >
                  <FileText size={16} />
                </button>
                {userRole === 'ADMIN' && (
                  <button 
                    onClick={() => onDelete(rdo.local_id || rdo.id)} 
                    className="w-9 h-9 text-red-100 hover:text-red-500 transition-all flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
             <AlertCircle size={40} className="mx-auto mb-4 text-slate-200" />
             <p className="text-slate-400 font-black uppercase text-xs">Nenhum relatório encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RdoHistory;
