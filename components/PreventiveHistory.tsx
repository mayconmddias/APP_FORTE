
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
  onPreviewPdf?: (html: string, title: string) => void;
}

const PreventiveHistory: React.FC<PreventiveHistoryProps> = ({ currentUser, history, onEdit, onDelete, assets, userRole, onTitleChange, initialAssetId, onPreviewPdf }) => {
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

    let rowsTableHtml = '';
    items.forEach((i, index) => {
      rowsTableHtml += `
        <tr class="inspection-row">
          <td class="col-item td-item">
            <div class="item-wrap">
              <span class="item-number">${String(index + 1).padStart(2, '0')}</span>
              <div>
                <p class="item-label">${i.label}</p>
                <p class="item-category">${i.category}</p>
              </div>
            </div>
          </td>
          <td class="col-status td-status">
            <span class="${i.isOk ? 'status-ok' : 'status-nok'}">${i.isOk ? 'OK' : 'NOK'}</span>
          </td>
          <td class="col-obs td-obs">
            <span class="obs-text">${i.observation || '-'}</span>
          </td>
          <td class="col-anexo td-anexo">
            <div class="anexo-wrap">
              ${(i.photos && i.photos[0]) 
                ? `<img alt="Anexo" class="anexo-img" src="${i.photos[0]}" />` 
                : '<span class="anexo-empty">-</span>'}
            </div>
          </td>
        </tr>`;
    });

    const reportHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta content="width=1024" name="viewport"/>
  <title>Relatório Técnico de Inspeção ${type === MaintenanceType.CORRETIVA ? 'Corretiva' : 'Preventiva'} - Forte Engenharia</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap');

    /* ===== RESET & BASE ===== */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
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
      font-size: 14px;
      color: #004a88;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.25;
      white-space: nowrap;
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
    .info-value-blue { color: #004a88; }

    /* ===== TABLE ===== */
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    th, td { text-align: left; vertical-align: middle; }

    .col-item { width: 40%; }
    .col-status { width: 15%; }
    .col-obs { width: 30%; }
    .col-anexo { width: 15%; }

    .table-header {
      background-color: #004a88;
      color: #ffffff;
    }
    .table-header th {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 12px 16px;
      border: 1px solid #004a88;
    }
    .table-header .th-status,
    .table-header .th-anexo { text-align: center; }
    .table-header .th-obs { padding: 12px 4px; }

    .table-body { border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }

    .inspection-row td { border: 1px solid #e2e8f0; }
    .inspection-row:nth-child(even) { background-color: #f8fafc; }

    .td-item { padding: 12px 4px 12px 16px; }
    .item-wrap { display: flex; align-items: flex-start; gap: 12px; }
    .item-number {
      font-family: 'Space Grotesk', system-ui, sans-serif;
      font-size: 18px;
      color: #004a88;
      line-height: 1;
      flex-shrink: 0;
      min-width: 28px;
    }
    .item-label {
      font-weight: 700;
      font-size: 12px;
      line-height: 1.25;
      text-transform: uppercase;
      font-family: 'Manrope', sans-serif;
      color: #334155;
    }
    .item-category {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      margin-top: 4px;
      font-family: 'Manrope', sans-serif;
    }

    .td-status { text-align: center; padding: 12px 0; }
    .status-ok { color: #16a34a; font-size: 12px; font-weight: 700; font-family: 'Manrope', sans-serif; }
    .status-nok { color: #dc2626; font-size: 12px; font-weight: 700; font-family: 'Manrope', sans-serif; }

    .td-obs { padding: 12px 4px; }
    .obs-text {
      font-size: 12px;
      font-family: 'Manrope', sans-serif;
      color: #4b5563;
      text-transform: uppercase;
      word-break: break-word;
    }

    .td-anexo { padding: 12px 16px 12px 4px; text-align: center; }
    .anexo-wrap { display: flex; justify-content: center; }
    .anexo-img {
      height: 56px;
      width: 56px;
      object-fit: cover;
      border-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    .anexo-empty { color: #64748b; font-size: 10px; }

    /* ===== SIGNATURES ===== */
    .signatures-section { margin-top: 48px; break-inside: avoid; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; }
    .signature-block { display: flex; flex-direction: column; align-items: center; }
    .signature-area { height: 64px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 8px; width: 100%; }
    .signature-name {
      font-family: 'Manrope', sans-serif;
      font-size: 16px;
      color: #004a88;
      font-weight: 500;
      font-style: italic;
      letter-spacing: 1px;
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
    .signature-img { height: 100%; object-fit: contain; }

    /* ===== FOOTER ===== */
    .report-footer { margin-top: 48px; padding-top: 32px; border-top: 1px solid #f1f5f9; }
    .footer-sections { display: flex; flex-direction: column; gap: 24px; }
    .footer-block { break-inside: avoid; }
    .footer-block-bg {
      break-inside: avoid;
      padding: 16px;
      background-color: #f8fafc;
      border-radius: 12px;
      border: 1px solid #f1f5f9;
    }
    .footer-title {
      font-size: 11px;
      font-weight: 700;
      color: #004a88;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
      text-align: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 8px;
    }
    .footer-text {
      font-size: 9px;
      color: #334155;
      line-height: 1.625;
      white-space: pre-wrap;
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
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="content-container">
    <header class="report-header">
      <div class="header-logo-wrap">
        <div class="header-logo-box">
          <img src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png" alt="Forte Logo" />
        </div>
      </div>
      <div class="header-title-wrap">
        <span class="header-company">FORTE <span class="header-company-light">ENGENHARIA</span></span>
        <h1 class="header-report-title">Relatório Técnico de Inspeção ${type === MaintenanceType.CORRETIVA ? 'Corretiva' : 'Preventiva'}</h1>
      </div>
      <div class="header-os-wrap">
        <p class="header-os-label">OS Nº</p>
        <p class="header-os-number">#${formattedOs}</p>
      </div>
    </header>

    <section class="info-grid">
      <div class="info-item">
        <label class="info-label">Cliente</label>
        <span class="info-value">${selectedAsset.client}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Equipamento</label>
        <span class="info-value">${selectedAsset.name}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Nº Série</label>
        <span class="info-value">${selectedAsset.serialNumber}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Capacidade</label>
        <span class="info-value info-value-blue">${selectedAsset.capacity}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Vão (M)</label>
        <span class="info-value">${selectedAsset.span}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Localização</label>
        <span class="info-value">${selectedAsset.location}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Fabricante</label>
        <span class="info-value">${selectedAsset.manufacturer}</span>
      </div>
      <div class="info-item">
        <label class="info-label">Data</label>
        <span class="info-value">${formatDate(record.date)}</span>
      </div>
    </section>

    <section>
      <table>
        <thead>
          <tr class="table-header">
            <th class="col-item">Item / Descrição</th>
            <th class="col-status th-status">Status</th>
            <th class="col-obs th-obs">Observações</th>
            <th class="col-anexo th-anexo">Anexo</th>
          </tr>
        </thead>
        <tbody class="table-body">
          ${rowsTableHtml}
        </tbody>
      </table>
    </section>

    <div class="signatures-section">
      <section class="signatures-grid">
        <div class="signature-block">
          <div class="signature-area">
             <span class="signature-name">${record.technician || (record as any).technician_name || 'FORTE ENGENHARIA'}</span>
          </div>
          <div class="signature-line"></div>
          <p class="signature-role">Responsável Técnico</p>
          <p class="signature-person">${record.technician || (record as any).technician_name || 'FORTE ENGENHARIA'}</p>
        </div>
        <div class="signature-block">
          <div class="signature-area">
            ${record.clientSignature ? `<img src="${record.clientSignature}" class="signature-img" />` : ''}
          </div>
          <div class="signature-line"></div>
          <p class="signature-role">Responsável Cliente</p>
          <p class="signature-person">${record.clientRepresentative || '---'}</p>
        </div>
      </section>
    </div>

    <footer class="report-footer">
      <div class="footer-sections">
        <div class="footer-block">
          <h4 class="footer-title">Normas e Regulamentações</h4>
          <p class="footer-text">${(REPORT_NORMS || '').trim()}</p>
        </div>
        <div class="footer-block-bg">
          <h4 class="footer-title">Atestado de Responsabilidade</h4>
          <p class="footer-text">${(REPORT_ATTESTATION || '').trim()}</p>
        </div>
      </div>
    </footer>
  </main>
</body>
</html>`;

    const pdfTitle = `OS #${formattedOs} - ${selectedAsset.client} - ${selectedAsset.name}`;

    if (onPreviewPdf) {
      onPreviewPdf(reportHtml, pdfTitle);
    } else {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

      if (isMobile) {
        // Injeta estilos específicos para mobile para forçar a repetição do cabeçalho e margens
        const mobileHtml = reportHtml.replace('</head>', `
    <style>
      @page { 
        margin: 10mm 5mm !important; 
      }
      .content-container { 
        min-height: auto !important; 
        box-shadow: none !important; 
        margin: 0 !important; 
        padding: 8mm 4mm !important; 
      }
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
          doc.write(reportHtml);
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

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-1 animate-in fade-in duration-500">

      {/* Barra de busca */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none notranslate pointer-events-none" style={{ fontSize: '20px' }}>search</span>
        <input
          type="text"
          placeholder="Filtrar por Ativo ou OS..."
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
