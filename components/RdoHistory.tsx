import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
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
  AlertCircle
} from 'lucide-react';
import { RdoRecord, UserProfile } from '../types';

interface RdoHistoryProps {
  records: RdoRecord[];
  userRole?: 'ADMIN' | 'TECNICO';
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

const RdoHistory: React.FC<RdoHistoryProps> = ({ records, userRole, onEdit, onDelete, onNew, onTitleChange, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'OPEN' | 'COMPLETED'>('COMPLETED');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    onTitleChange?.('RELATÓRIOS DIÁRIOS');
  }, [onTitleChange]);

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
    record.equipment.forEach(e => {
      equipmentHtml += `<tr><td>${e.label}</td><td style="text-align:center; font-weight:bold; color:${e.isOk ? '#059669' : '#dc2626'}">${e.isOk === true ? 'OK' : e.isOk === false ? 'NOK' : '-'}</td><td>${e.observation || '-'}</td></tr>`;
    });

    let photosHtml = '';
    record.photos.forEach(photo => {
      photosHtml += `<div style="break-inside: avoid; margin-bottom: 15px;"><img src="${photo}" style="width:100%; max-width:300px; border-radius:8px; border:1px solid #e2e8f0;" /></div>`;
    });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
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

      .weather-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: #fff; border: 1px solid #e2e8f0; font-size: 9px; font-weight: 900; }

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
          <h1 class="title">Relatório Diário de Obra</h1>
          <span class="doc-type">RDO - CONTROLE DE CAMPO</span>
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
          <td><span class="label">CHEGADA EMPRESA</span><span class="value">${record.arrivalTime}</span></td>
          <td><span class="label">INÍCIO TRABALHOS</span><span class="value">${record.startTime || '--:--'}</span></td>
          <td><span class="label">HORÁRIO DE FECHAMENTO</span><span class="value">${record.endTime || '--:--'}</span></td>
        </tr>
        <tr>
          <td><span class="label">CLIMA</span><span class="weather-badge">${record.weather}</span></td>
          <td colspan="2"><span class="label">RESPONSÁVEL</span><span class="value">${record.technicianName}</span></td>
        </tr>
      </table>

      <div class="section">
        <div class="section-title">Equipe Técnica</div>
        <div style="font-size: 11px; white-space: pre-wrap; padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;">${record.teamDescription}</div>
      </div>

      <div class="section">
        <div class="section-title">Atividades Realizadas</div>
        <div style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;">${activitiesHtml}</div>
      </div>

      <div class="section">
        <div class="section-title">Checklist de Materiais e Equipamentos</div>
        <table class="data-table">
          <thead><tr><th>Item</th><th style="width:60px; text-align:center;">Status</th><th>Observações</th></tr></thead>
          <tbody>
            ${materialsHtml}
          </tbody>
        </table>
      </div>

      ${record.occurrences ? `
      <div class="section">
        <div class="section-title">Ocorrências / Imprevistos</div>
        <div style="font-size: 11px; white-space: pre-wrap; padding: 10px; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; color: #991b1b;">${record.occurrences}</div>
      </div>` : ''}

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

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const matchesSearch = 
        rec.siteName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        rec.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.technicianName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = rec.status === filterStatus;
      const matchesDate = !dateFilter || rec.date === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, searchTerm, filterStatus, dateFilter]);

  if (records.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-24 h-24 bg-blue-50 text-[#0066CC] rounded-[40px] flex items-center justify-center mb-8 shadow-xl">
          <FileText size={48} strokeWidth={1.5} />
        </div>
        <h3 className="text-2xl font-black text-slate-900 uppercase">Nenhum RDO encontrado</h3>
        <p className="text-slate-500 font-medium max-w-xs mt-4 text-xs uppercase tracking-widest leading-relaxed">Você ainda não criou nenhum Relatório Diário de Obra.</p>
        <button 
          onClick={onNew}
          className="mt-10 h-16 px-10 bg-[#0066CC] text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 flex items-center gap-4 active:scale-95 transition-all"
        >
          <Plus size={20} /> CRIAR PRIMEIRO RDO
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-40">
      {/* Header & Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Histórico de RDO</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-[#0066CC] rounded-full animate-pulse" />
            {filteredRecords.length} Relatórios encontrados
          </p>
        </div>
        <button 
          onClick={onNew}
          className="h-16 px-8 bg-[#0066CC] text-white rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} /> NOVO RELATÓRIO
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por Obra, Cliente ou Técnico..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-14 pl-16 pr-6 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-xs uppercase outline-none focus:ring-4 focus:ring-[#0066CC]/10 transition-all" 
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="date" 
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full h-14 pl-16 pr-6 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-xs outline-none focus:ring-4 focus:ring-[#0066CC]/10 transition-all text-center" 
          />
        </div>
        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
           {['OPEN', 'COMPLETED'].map((st) => (
             <button 
                key={st} 
                onClick={() => setFilterStatus(st as any)}
                className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${filterStatus === st ? 'bg-white text-[#0066CC] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {st === 'OPEN' ? 'Rascunhos' : 'Finalizados'}
             </button>
           ))}
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRecords.map((rdo) => (
          <div 
            key={rdo.id}
            className="group bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#0066CC]/20 transition-all duration-300 relative overflow-hidden"
          >
            {/* Status Indicator Bar */}
            <div className={`absolute top-0 left-0 bottom-0 w-2 ${rdo.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-400'}`} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2 ${rdo.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {rdo.status === 'COMPLETED' ? <><CheckCircle size={10} /> FINALIZADO</> : <><Clock size={10} /> RASCUNHO</>}
                    </span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{rdo.date.split('-').reverse().join('/')}</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-[#0066CC] transition-colors">{rdo.siteName || "Obra sem nome"}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{rdo.clientName || "Cliente não informado"}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-500 uppercase text-[9px] font-black tracking-widest">
                      <User size={14} className="text-[#0066CC]" /> {rdo.technicianName}
                    </div>
                  </div>
               </div>

               <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleGeneratePdf(rdo)} 
                    className="w-14 h-14 bg-blue-50 text-[#0066CC] rounded-[22px] flex items-center justify-center hover:bg-[#0066CC] hover:text-white transition-all shadow-sm"
                  >
                    <Download size={20} />
                  </button>
                  <button 
                    onClick={() => onEdit(rdo)} 
                    className={`w-14 h-14 bg-slate-50 text-slate-600 rounded-[22px] flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm ${rdo.status === 'COMPLETED' && userRole !== 'ADMIN' ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Edit3 size={20} />
                  </button>
                  <button 
                    onClick={() => onDelete(rdo.local_id || rdo.id)} 
                    className="w-14 h-14 bg-red-50 text-red-500 rounded-[22px] flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 size={20} />
                  </button>
               </div>
            </div>
          </div>
        ))}
        {filteredRecords.length === 0 && searchTerm && (
          <div className="p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
             <AlertCircle size={40} className="mx-auto mb-4 text-slate-200" />
             <p className="text-slate-400 font-black uppercase text-xs">Nenhum resultado para "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RdoHistory;
