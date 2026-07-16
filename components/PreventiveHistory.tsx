
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
          <td class="col-item pl-4 pr-1 py-3 border-l border-gray-200">
            <div class="flex items-start gap-3">
              <span class="text-lg font-heading text-brandBlue">${String(index + 1).padStart(2, '0')}</span>
              <div>
                <p class="font-bold text-xs leading-tight uppercase font-sans">${i.label}</p>
                <p class="text-[9px] text-brandLabel uppercase mt-1 font-sans">${i.category}</p>
              </div>
            </div>
          </td>
          <td class="col-status text-center px-0 py-3 border-gray-200">
            <span class="${i.isOk ? 'text-successGreen' : 'text-red-600'} text-xs font-bold font-sans">${i.isOk ? 'OK' : 'NOK'}</span>
          </td>
          <td class="col-obs px-1 py-3 border-gray-200">
            <span class="text-xs font-mono text-gray-600 uppercase break-words font-sans">${i.observation || '-'}</span>
          </td>
          <td class="col-anexo pl-1 pr-4 py-3 border-r border-gray-200 text-center">
            <div class="flex justify-center">
              ${(i.photos && i.photos[0]) 
                ? `<img alt="Anexo" class="h-14 w-14 object-cover rounded shadow-sm border border-gray-200" src="${i.photos[0]}" />` 
                : '<span class="text-brandLabel text-[10px]">-</span>'}
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
            successGreen: '#16a34a',
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
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
    
    .inspection-row:nth-child(even) { background-color: #f8fafc; }
    .col-item { width: 40%; }
    .col-status { width: 15%; }
    .col-obs { width: 30%; }
    .col-anexo { width: 15%; }
    
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    th, td { text-align: left; vertical-align: middle; border: 1px solid #e2e8f0; }
    
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
        <h1 class="text-[14px] font-heading text-brandBlue uppercase tracking-wide leading-tight whitespace-nowrap">Relatório Técnico de Inspeção ${type === MaintenanceType.CORRETIVA ? 'Corretiva' : 'Preventiva'}</h1>
      </div>
      <div class="flex flex-col items-end gap-0">
        <p class="text-brandLabel text-[9px] font-semibold uppercase tracking-widest leading-none">OS Nº</p>
        <p class="text-lg font-heading text-brandBlue leading-tight">#${formattedOs}</p>
      </div>
    </header>

    <section class="grid grid-cols-4 gap-y-6 gap-x-4 mb-10 border-b border-gray-100 pb-8">
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Cliente</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${selectedAsset.client}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Equipamento</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${selectedAsset.name}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Nº Série</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${selectedAsset.serialNumber}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Capacidade</label>
        <span class="font-bold text-sm text-brandBlue uppercase font-sans">${selectedAsset.capacity}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Vão (M)</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${selectedAsset.span}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Localização</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${selectedAsset.location}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Fabricante</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${selectedAsset.manufacturer}</span>
      </div>
      <div class="flex flex-col">
        <label class="text-[10px] font-bold uppercase tracking-wider text-brandLabel mb-1">Data</label>
        <span class="font-bold text-sm text-brandDarkGrey uppercase font-sans">${formatDate(record.date)}</span>
      </div>
    </section>

    <section>
      <table class="w-full">
        <thead>
          <tr class="bg-brandBlue text-white text-[10px] font-bold uppercase tracking-widest">
            <th class="col-item px-4 py-3 border-brandBlue">Item / Descrição</th>
            <th class="col-status text-center border-brandBlue">Status</th>
            <th class="col-obs px-1 py-3 border-brandBlue">Observações</th>
            <th class="col-anexo text-center border-brandBlue">Anexo</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 border-x border-b border-gray-200">
          ${rowsTableHtml}
        </tbody>
      </table>
    </section>
    
    <div class="avoid-break mt-12">
      <section class="grid grid-cols-2 gap-20">
        <div class="flex flex-col items-center">
          <div class="h-16 flex items-end justify-center mb-2">
             <span style="font-family: 'Manrope', sans-serif; font-size: 16px; color: #004a88; font-weight: 500; font-style: italic; letter-spacing: 1px;">${record.technician || (record as any).technician_name || 'FORTE ENGENHARIA'}</span>
          </div>
          <div class="w-full border-b border-brandDarkGrey"></div>
          <p class="text-[10px] text-center text-brandLabel uppercase font-bold mt-2">Responsável Técnico</p>
          <p class="text-[9px] text-center text-brandDarkGrey uppercase font-medium mt-1 font-sans">${record.technician || (record as any).technician_name || 'FORTE ENGENHARIA'}</p>
        </div>
        <div class="flex flex-col items-center">
          <div class="h-16 flex items-end justify-center mb-2">
            ${record.clientSignature ? `<img src="${record.clientSignature}" class="h-full object-contain" />` : ''}
          </div>
          <div class="w-full border-b border-brandDarkGrey"></div>
          <p class="text-[10px] text-center text-brandLabel uppercase font-bold mt-2">Responsável Cliente</p>
          <p class="text-[9px] text-center text-brandDarkGrey uppercase font-medium mt-1 font-sans">${record.clientRepresentative || '---'}</p>
        </div>
      </section>
    </div>

    <footer class="mt-12 pt-8 border-t border-gray-100">
      <div class="space-y-6">
        <div class="avoid-break">
          <h4 class="text-[11px] font-bold text-brandBlue uppercase tracking-widest mb-2 text-center border-b border-gray-100 pb-2">Normas e Regulamentações</h4>
          <p class="text-[9px] text-brandDarkGrey leading-relaxed whitespace-pre-wrap font-sans">${(REPORT_NORMS || '').trim()}</p>
        </div>
        <div class="avoid-break p-4 bg-brandLightGrey rounded-xl border border-gray-100">
          <h4 class="text-[11px] font-bold text-brandBlue uppercase tracking-widest mb-2 text-center border-b border-gray-100 pb-2">Atestado de Responsabilidade</h4>
          <p class="text-[9px] text-brandDarkGrey leading-relaxed whitespace-pre-wrap font-sans">${(REPORT_ATTESTATION || '').trim()}</p>
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
