
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  FileText,
  ArrowLeft,
  Hash,
  ChevronRight,
  Pencil,
  Trash2,
  AlertTriangle,
  Building2,
  X,
  Loader2
} from 'lucide-react';
import { CraneAsset, MaintenanceRecord, MaintenanceType, UserProfile } from '../types';
import { REPORT_NORMS, REPORT_ATTESTATION } from '../constants';


interface PreventiveHistoryProps {
  currentUser: UserProfile | null;
  history: MaintenanceRecord[];
  onEdit?: (record: MaintenanceRecord) => void;
  onDelete?: (recordId: string) => void;
  assets: CraneAsset[];
  userRole: 'ADMIN' | 'TECNICO';
  onTitleChange?: (title: string | null) => void;
  initialAssetId?: string | null;
}

const PreventiveHistory: React.FC<PreventiveHistoryProps> = ({ currentUser, history, onEdit, onDelete, assets, userRole, onTitleChange, initialAssetId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialAssetId || null);
  const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);

  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (selectedAssetId) {
      onTitleChange?.('HISTÓRICO DO ATIVO');
    } else if (selectedClient) {
      onTitleChange?.('HISTÓRICO | ATIVOS');
    } else {
      onTitleChange?.('HISTÓRICO TÉCNICO');
    }
  }, [selectedAssetId, selectedClient, onTitleChange]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  };

  const assetsWithMeta = useMemo(() => {
    return assets.map(asset => {
      const assetRecords = history.filter(r => r.assetId === asset.id || (r as any).asset_id === asset.id);
      const osNumbers = assetRecords.map(r => {
        const num = String(r.inspectionNumber || (r as any).inspection_number || '');
        return { raw: num, padded: num.padStart(4, '0') };
      });
      return { ...asset, recordsCount: assetRecords.length, osList: osNumbers };
    });
  }, [assets, history]);

  const clientGroups = useMemo(() => {
    const groups: Record<string, { name: string; assetCount: number; inspectionCount: number }> = {};
    if (!Array.isArray(assetsWithMeta)) return [];

    assetsWithMeta.forEach(asset => {
      if (!asset || !asset.client) return;
      const clientName = asset.client.trim();
      if (!groups[clientName]) groups[clientName] = { name: clientName, assetCount: 0, inspectionCount: 0 };
      groups[clientName].assetCount += 1;
      groups[clientName].inspectionCount += asset.recordsCount;
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [assetsWithMeta]);

  const displayState = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const matchedAssets = assetsWithMeta.filter(asset =>
        (asset.client || '').toLowerCase().includes(term) ||
        (asset.name || '').toLowerCase().includes(term) ||
        (asset.serialNumber || '').toLowerCase().includes(term) ||
        asset.osList.some(os => os.raw.includes(term) || os.padded.includes(term))
      );
      return {
        type: 'SEARCH',
        data: matchedAssets.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }))
      };
    }
    if (selectedClient) {
      const filtered = assetsWithMeta.filter(a => (a.client || '').trim() === selectedClient.trim());
      return {
        type: 'ASSETS',
        data: filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }))
      };
    }
    return { type: 'CLIENTS', data: clientGroups };
  }, [searchTerm, selectedClient, clientGroups, assetsWithMeta]);

  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const selectedRecords = history
    .filter(r => (r.assetId === selectedAssetId || (r as any).asset_id === selectedAssetId) && r.status !== 'OPEN')
    .sort((a, b) => (b.inspectionNumber || 0) - (a.inspectionNumber || 0));

  const handleGeneratePdf = (record: MaintenanceRecord) => {
    if (!selectedAsset) return;
    const reportNum = record.inspectionNumber || '0';
    const formattedOs = String(reportNum).padStart(4, '0');
    const items = record.checklists || [];
    let rowsHtml = '';
    items.forEach((i, index) => {
      let photosHtml = '';
      if (i.photos) i.photos.forEach(photo => { photosHtml += `<div style="margin-top:10px;"><img src="${photo}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;border:2px solid #f1f5f9;display:block;"></div>`; });
      rowsHtml += `<tr><td><div style="display:flex;align-items:flex-start;"><span style="color:#000;font-weight:900;margin-right:12px;">${String(index + 1).padStart(2, '0')}</span><div><strong style="font-size:11px;">${i.label}</strong><br/><small style="color:#475569;font-size:8px;font-weight:700;">${i.category}</small></div></div></td><td style="text-align:center;color:${i.isOk ? '#059669' : '#dc2626'};font-weight:900;">${i.isOk ? 'OK' : 'NOK'}</td><td>${i.observation || '-'}${photosHtml}</td></tr>`;
    });

    const reportHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body { font-family: sans-serif; padding: 20px; color: #1e293b; line-height: 1.5; }
      .header-container { position: relative; margin-bottom: 40px; display: flex; align-items: center; justify-content: space-between; }
      .logo-img { height: 60px; width: auto; }
      .subtitle { font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; text-align: center; flex: 1; margin: 0 20px; }
      .os-box { text-align: right; min-width: 80px; }
      .os-label { font-size: 10px; font-weight: 900; color: #475569; display: block; }
      .os-value { font-size: 18px; font-weight: 900; color: #0f172a; }
      
      .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      .info-grid td { width: 25%; padding: 10px 5px; vertical-align: top; border: none !important; }
      .field-label { font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase; display: block; margin-bottom: 2px; }
      .field-value { font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; min-height: 20px; display: block; }

      table.results { width: 100%; border-collapse: collapse; margin-top: 20px; }
      table.results th, table.results td { border: 1px solid #e2e8f0; padding: 6px 12px; text-align: left; }
      table.results th { background: #f8fafc; font-size: 10px; text-transform: uppercase; color: #0f172a; border: 1px solid #e2e8f0; }
      .nok { color: #dc2626; font-weight: 900; }
      .ok { color: #059669; font-weight: 900; }

      .signature-section { width: 100%; margin-top: 80px; border-collapse: collapse; }
      .signature-section td { width: 50%; padding: 0 40px; text-align: center; border: none !important; }
      .signature-name { font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; min-height: 18px; }
      .signature-line { border-top: 1px solid #000; width: 100%; margin-bottom: 5px; }
      .signature-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
      @media print {
        @page { margin: 15mm; }
        thead { display: table-header-group; }

        tr { page-break-inside: avoid !important; }
        body { padding: 0; }
      }
    </style></head><body onload="window.print()">
      <div class="header-container">
        <img src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png" class="logo-img" alt="Logo" />
        <div class="subtitle">RELATÓRIO TÉCNICO DE INSPEÇÃO ${record.type === MaintenanceType.CORRETIVA ? 'CORRETIVA' : 'PREVENTIVA'}</div>
        <div class="os-box">
          <span class="os-label">OS Nº</span>
          <span class="os-value">#${formattedOs}</span>
        </div>
      </div>

      <table class="info-grid">
        <tr>
          <td><span class="field-label">CLIENTE</span><span class="field-value">${selectedAsset.client}</span></td>
          <td><span class="field-label">EQUIPAMENTO</span><span class="field-value">${selectedAsset.name}</span></td>
          <td><span class="field-label">Nº SÉRIE</span><span class="field-value">${selectedAsset.serialNumber}</span></td>
          <td><span class="field-label">CAPACIDADE</span><span class="field-value">${selectedAsset.capacity}</span></td>
        </tr>
        <tr>
          <td><span class="field-label">VÃO (M)</span><span class="field-value">${selectedAsset.span}</span></td>
          <td><span class="field-label">LOCALIZAÇÃO</span><span class="field-value">${selectedAsset.location}</span></td>
          <td><span class="field-label">FABRICANTE</span><span class="field-value">${selectedAsset.manufacturer}</span></td>
          <td><span class="field-label">DATA</span><span class="field-value">${formatDate(record.date)}</span></td>
        </tr>
      </table>

      <table class="results">
        <thead><tr><th style="width:65%;">Item</th><th style="width:80px;text-align:center;">Status</th><th style="width:25%;">Observações</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <table class="signature-section">
        <tr>
          <td>
            <div class="signature-name">${record.technician || currentUser?.name || '---'}</div>

            <div class="signature-line"></div>
            <div class="signature-label">RESPONSÁVEL TÉCNICO</div>
          </td>
          <td>
            <div class="signature-name">${record.clientRepresentative || '---'}</div>
            <div class="signature-line"></div>
            <div class="signature-label">RESPONSÁVEL CLIENTE</div>
          </td>
        </tr>
      </table>

      <div style="page-break-inside: avoid; margin-top: 30px; padding: 15px 20px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; font-weight: 900; color: #475569; margin-bottom: 12px; text-transform: uppercase; text-align: center; letter-spacing: 1px;">Normas e Regulamentações</div>
        <div style="font-size: 9px; color: #1e293b; white-space: pre-wrap; line-height: 1.4; text-align: left;">${REPORT_NORMS.trim()}</div>
      </div>

      <div style="page-break-inside: avoid; margin-top: 5px; padding: 15px 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 900; color: #475569; margin-bottom: 12px; text-transform: uppercase; text-align: center; letter-spacing: 1px;">Atestado de Responsabilidade</div>
        <div style="font-size: 9px; color: #1e293b; white-space: pre-wrap; line-height: 1.4; text-align: left;">${REPORT_ATTESTATION.trim()}</div>
      </div>
    </body></html>`;



    const blob = new Blob([reportHtml], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-1">
      {(selectedClient || searchTerm) && (
        <div className="flex items-center gap-3">
          {selectedClient && !searchTerm && (
            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-white rounded-xl text-slate-500 border border-slate-200 shadow-sm"><ArrowLeft size={20} /></button>
          )}
          <h2 className="text-xl font-black text-slate-900 uppercase">{searchTerm ? 'Busca' : selectedClient}</h2>
        </div>
      )}

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066CC]" size={20} />
        <input type="text" placeholder="Filtrar por Cliente, Ativo ou OS..." className="w-full h-14 pl-14 pr-6 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] font-bold text-slate-800 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid gap-2">
        {displayState.type === 'CLIENTS' ? (
          (displayState.data as any[]).map((client) => (
            <button key={client.name} onClick={() => setSelectedClient(client.name)} className="group bg-white rounded-2xl border border-slate-200 p-4 hover:border-[#0066CC] hover:shadow-md transition-all flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-[#0066CC] group-hover:text-white border border-slate-100"><Building2 size={18} /></div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">{client.name}</h3>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{client.assetCount} ATIVOS</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-200 group-hover:text-[#0066CC]" />
            </button>
          ))
        ) : (
          (displayState.data as any[]).map((asset) => (
            <button key={asset.id} onClick={() => setSelectedAssetId(asset.id)} className="group bg-white rounded-2xl border border-slate-200 p-4 hover:border-[#0066CC] transition-all flex items-center justify-between text-left">
              <div className="min-w-0 pr-2">
                <p className="text-[8px] font-black text-slate-400 uppercase truncate mb-0.5">{asset.client}</p>
                <h3 className="text-sm font-black text-slate-900 uppercase truncate">{asset.name}</h3>
                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-1 inline-block">
                  {asset.location || 'SEM LOCAL'}
                </span>
              </div>
              <ChevronRight size={18} className="text-slate-200 group-hover:text-[#0066CC]" />
            </button>
          ))
        )}
      </div>

      {selectedAssetId && selectedAsset && createPortal(
        <div className="fixed inset-0 top-0 left-0 w-full h-full bg-white z-[9999] flex flex-col animate-in slide-in-from-right-4 duration-300 overflow-hidden">
          <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <button onClick={() => setSelectedAssetId(null)} className="p-3 hover:bg-slate-200 rounded-full text-slate-500"><ArrowLeft size={32} /></button>
            <div className="text-center">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{selectedAsset.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedAsset.client}</p>
            </div>
            <div className="w-12"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 pb-24">
            {selectedRecords.map((record) => (
              <div key={record.local_id || record.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${record.type === MaintenanceType.CORRETIVA ? 'bg-red-50 text-red-600' : 'bg-[#0066CC] text-white'}`}><Hash size={14} /></div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-black uppercase">{record.type === MaintenanceType.CORRETIVA ? 'CORRETIVA' : 'PREVENTIVA'}</p>
                      <p className="text-sm font-black text-slate-900">#{String(record.inspectionNumber || 0).padStart(4, '0')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onEdit?.(record)} className="p-2 text-slate-300 hover:text-blue-600"><Pencil size={18} /></button>
                    <button onClick={() => handleGeneratePdf(record)} className="p-2 text-slate-300 hover:text-blue-600"><FileText size={18} /></button>
                    {isAdmin && <button onClick={() => setRecordToDelete(record)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 size={18} /></button>}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50 text-[9px] font-bold text-slate-500 uppercase">
                  <div>{formatDate(record.date)}</div>
                  <div>TÉCNICO: {record.technician}</div>
                </div>
              </div>
            ))}
          </div>
        </div>, document.body
      )}

      {recordToDelete && createPortal(
        <div className="fixed inset-0 bg-white z-[10000] flex items-center justify-center p-4 md:p-6" onClick={() => setRecordToDelete(null)}>
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center border border-slate-200 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertTriangle size={48} /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Excluir OS #{String(recordToDelete?.inspectionNumber || 0).padStart(4, '0')}?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-4 mb-10 leading-relaxed px-4">Esta ação removerá permanentemente a Ordem de Serviço #{String(recordToDelete?.inspectionNumber || 0).padStart(4, '0')}.</p>
            <div className="flex gap-4">
              <button onClick={() => setRecordToDelete(null)} className="flex-1 h-14 bg-slate-50 text-slate-500 rounded-[20px] font-black text-[11px] uppercase tracking-widest transition-all">Sair</button>
              <button onClick={() => { if (recordToDelete && onDelete) onDelete(recordToDelete.local_id || recordToDelete.id); setRecordToDelete(null); }} className="flex-1 h-14 bg-red-600 text-white rounded-[20px] font-black text-[11px] uppercase tracking-widest shadow-lg shadow-red-200 flex items-center justify-center gap-2 active:scale-95 transition-all">
                {String(recordToDelete?.id || '').startsWith('temp-') ? <Loader2 size={18} className="animate-spin" /> : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default PreventiveHistory;
