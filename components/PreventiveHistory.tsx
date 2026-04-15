
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { CraneAsset, MaintenanceRecord, MaintenanceType, UserProfile, Frequency } from '../types';
import { REPORT_NORMS, REPORT_ATTESTATION } from '../constants';
import GenericModal from './GenericModal';


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
    let items = [...(record.checklists || [])];
    const type = String(record.type || '').toUpperCase();
    const freq = String(record.frequency || '').toUpperCase();
    if (type === 'PREVENTIVA') {
      if (freq === 'MENSAL') items = items.slice(0, 69);
      else if (freq === 'SEMESTRAL') items = items.slice(0, 76);
    }
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
      .signature-section { width: 100%; margin-top: 80px; border-collapse: collapse; }
      .signature-section td { width: 50%; padding: 0 40px; text-align: center; border: none !important; }
      .signature-name { font-weight: 700; font-size: 11px; text-transform: uppercase; margin-top: 5px; min-height: 15px; }
      .signature-line { border-top: 1.5px solid #000; width: 100%; margin-top: 5px; }
      .signature-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
      .client-signature-img { height: 60px; max-width: 200px; object-fit: contain; margin-bottom: -10px; }
      .tech-signature-text { font-family: 'cursive', 'Brush Script MT', cursive; font-size: 22px; color: #0066CC; margin-bottom: -15px; }
      @media print { @page { margin: 15mm; } thead { display: table-header-group; } tr { page-break-inside: avoid !important; } body { padding: 0; } }
    </style></head><body onload="window.print()">
      <div class="header-container">
        <img src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png" class="logo-img" alt="Logo" />
        <div class="subtitle">RELATÓRIO TÉCNICO DE INSPEÇÃO ${record.type === MaintenanceType.CORRETIVA ? 'CORRETIVA' : 'PREVENTIVA'}</div>
        <div class="os-box"><span class="os-label">OS Nº</span><span class="os-value">#${formattedOs}</span></div>
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
            <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
              <span class="tech-signature-text">${record.technician || (record as any).technician_name || 'FORTE ENGENHARIA'}</span>
            </div>
            <div class="signature-line"></div>
            <div class="signature-name">${record.technician || (record as any).technician_name || 'FORTE ENGENHARIA'}</div>
            <div class="signature-label">RESPONSÁVEL TÉCNICO</div>
          </td>
          <td>
            <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
              ${record.clientSignature ? `<img src="${record.clientSignature}" class="client-signature-img" />` : ''}
            </div>
            <div class="signature-line"></div>
            <div class="signature-name">${record.clientRepresentative || '---'}</div>
            <div class="signature-label">RESPONSÁVEL CLIENTE</div>
          </td>
        </tr>
      </table>
      <div style="page-break-inside: avoid; margin-top: 40px; padding: 20px; border-top: 2px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 900; color: #475569; margin-bottom: 12px; text-transform: uppercase; text-align: center;">Normas e Regulamentações</div>
        <div style="font-size: 9px; color: #1e293b; white-space: pre-wrap; line-height: 1.5;">${(REPORT_NORMS || '').trim()}</div>
      </div>
      <div style="page-break-inside: avoid; margin-top: 10px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="font-size: 11px; font-weight: 900; color: #475569; margin-bottom: 12px; text-transform: uppercase; text-align: center;">Atestado de Responsabilidade</div>
        <div style="font-size: 9px; color: #1e293b; white-space: pre-wrap; line-height: 1.5;">${(REPORT_ATTESTATION || '').trim()}</div>
      </div>
    </body></html>`;

    const blob = new Blob([reportHtml], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-1 animate-in fade-in duration-500">

      {/* Barra de busca */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none notranslate pointer-events-none" style={{ fontSize: '20px' }}>search</span>
        <input
          type="text"
          placeholder="Filtrar por Cliente, Ativo ou OS..."
          className="w-full h-12 pl-12 pr-5 bg-[#eef2f7] border-none rounded-full font-body text-sm text-on-surface placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Breadcrumb */}
      {(selectedClient || searchTerm) && (
        <div className="flex items-center gap-2 px-1">
          {selectedClient && !searchTerm && (
            <button
              onClick={() => setSelectedClient(null)}
              className="p-2 hover:bg-white rounded-full text-[#004a88] transition-all"
            >
              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px' }}>arrow_back</span>
            </button>
          )}
          <h2 className="font-headline font-bold text-base text-blue-950 uppercase">
            {searchTerm ? 'Resultado da Busca' : selectedClient}
          </h2>
        </div>
      )}

      {/* Lista */}
      <div className="grid gap-2">
        {displayState.type === 'CLIENTS' ? (
          (displayState.data as any[]).map((client) => (
            <button
              key={client.name}
              onClick={() => setSelectedClient(client.name)}
              className="group bg-white rounded-2xl border border-slate-100 p-5 hover:border-[#004a88]/30 hover:shadow-md transition-all shadow-[0_4px_16px_rgb(0,0,0,0.04)] flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#004a88] flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                  <span className="material-symbols-outlined text-white select-none notranslate" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>corporate_fare</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base text-blue-950 uppercase">{client.name}</h3>
                  <p className="font-headline text-[10px] font-bold text-[#004a88] uppercase tracking-widest mt-0.5">
                    {client.assetCount} {client.assetCount === 1 ? 'ATIVO' : 'ATIVOS'} · {client.inspectionCount} INSPEÇÕES
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-[#004a88] transition-colors select-none notranslate" style={{ fontSize: '22px' }}>chevron_right</span>
            </button>
          ))
        ) : (
          (displayState.data as any[]).map((asset) => (
            <button
              key={asset.id}
              onClick={() => setSelectedAssetId(asset.id)}
              className="group bg-white rounded-2xl border border-slate-100 p-5 hover:border-[#004a88]/30 hover:shadow-md transition-all shadow-[0_4px_16px_rgb(0,0,0,0.04)] flex items-center justify-between text-left"
            >
              <div className="min-w-0 pr-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate mb-0.5">{asset.client}</p>
                <h3 className="font-headline font-bold text-base text-blue-950 uppercase truncate">{asset.name}</h3>
                <span className="font-body text-[9px] font-bold text-[#004a88] uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full mt-1.5 inline-block">
                  {asset.location || 'SEM LOCAL'}
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-[#004a88] transition-colors flex-shrink-0 select-none notranslate" style={{ fontSize: '22px' }}>chevron_right</span>
            </button>
          ))
        )}
      </div>

      {/* Modal de detalhe do ativo */}
      {selectedAssetId && selectedAsset && createPortal(
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col animate-in slide-in-from-right-4 duration-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-slate-100 flex-shrink-0">
            <button onClick={() => setSelectedAssetId(null)} className="p-2 text-[#004a88] hover:bg-blue-50 rounded-full transition-all">
              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '24px' }}>arrow_back</span>
            </button>
            <div className="text-center flex-1">
              <h3 className="font-headline font-bold text-base text-blue-950 uppercase">{selectedAsset.name}</h3>
              <p className="font-headline text-[10px] font-bold text-[#004a88] uppercase tracking-widest">{selectedAsset.client}</p>
            </div>
            <div className="w-10" />
          </div>

          {/* Lista de registros */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8">
            {selectedRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-slate-300 select-none notranslate" style={{ fontSize: '32px' }}>description</span>
                </div>
                <p className="font-headline font-bold text-sm text-slate-400 uppercase">Nenhum registro encontrado</p>
              </div>
            ) : selectedRecords.map((record) => (
              <div key={record.local_id || record.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgb(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      record.type === MaintenanceType.CORRETIVA ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#004a88]'
                    }`}>
                      <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                        {record.type === MaintenanceType.CORRETIVA ? 'build' : 'task_alt'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        {record.type === MaintenanceType.CORRETIVA ? 'CORRETIVA' : 'PREVENTIVA'}
                      </p>
                      <p className="font-headline font-bold text-sm text-blue-950">
                        #{String(record.inspectionNumber || 0).padStart(4, '0')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button onClick={() => onEdit(record)} className="p-2 text-slate-300 hover:text-[#004a88] hover:bg-blue-50 rounded-full transition-all">
                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>edit</span>
                      </button>
                    )}
                    <button onClick={() => handleGeneratePdf(record)} className="p-2 text-slate-300 hover:text-[#004a88] hover:bg-blue-50 rounded-full transition-all">
                      <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>description</span>
                    </button>
                    {isAdmin && (
                      <button onClick={() => setRecordToDelete(record)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{formatDate(record.date)}</span>
                  <span>·</span>
                  <span>{record.technician}</span>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Modal de confirmação de exclusão */}
      <GenericModal 
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        title={`Excluir OS #${String(recordToDelete?.inspectionNumber || 0).padStart(4, '0')}?`}
        description="Esta ação removerá permanentemente esta Ordem de Serviço."
        type="DANGER"
        onConfirm={() => {
            if (recordToDelete && onDelete) onDelete(recordToDelete.local_id || recordToDelete.id);
            setRecordToDelete(null);
        }}
      />
    </div>
  );
};

export default PreventiveHistory;
