
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const Reports: React.FC = () => {
  const [loadingMtbf, setLoadingMtbf] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const handleExportMtbf = () => {
    setLoadingMtbf(true);
    setLastExport(null);
    setTimeout(() => {
      setLoadingMtbf(false);
      setLastExport('MTBF_MTTR_GERAL_2024.xlsx');
    }, 2000);
  };

  const handleExportChecklist = () => {
    setLoadingChecklist(true);
    setLastExport(null);
    setTimeout(() => {
      setLoadingChecklist(false);
      setLastExport('CHECKLIST_MENSAL_MARCO_2024.pdf');
    }, 1800);
  };

  const handleDownloadFile = async () => {
    if (!lastExport) return;
    const content = 'Relatório Gerado por Forte Engenharia Pro\nData: ' + new Date().toLocaleString() + '\nStatus: Concluído e Assinado.';
    const mimeType = lastExport.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([content], { type: mimeType });
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: lastExport,
          types: [{ description: lastExport.endsWith('.pdf') ? 'Arquivo PDF' : 'Planilha Excel', accept: { [mimeType]: [lastExport.endsWith('.pdf') ? '.pdf' : '.xlsx'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setLastExport(null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') fallbackDownload(blob, lastExport);
      }
    } else {
      fallbackDownload(blob, lastExport);
    }
  };

  const fallbackDownload = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLastExport(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">

      {/* Cabeçalho */}
      <div>
        <h2 className="font-headline font-bold text-xl text-blue-950 uppercase tracking-widest">Relatórios Estratégicos</h2>
        <p className="font-body text-sm text-slate-400 mt-1">Gere documentos técnicos e indicadores de performance para auditorias e controle operacional.</p>
      </div>

      {/* Cards de ação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* MTBF/MTTR */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[#004a88] select-none notranslate" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>bar_chart_4_bars</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-base text-blue-950 uppercase">Indicadores de Manutenção</h3>
            <p className="font-body text-sm text-slate-400 mt-1 leading-relaxed">
              Exportação completa de MTBF, MTTR e Disponibilidade por ativo em formato Excel.
            </p>
          </div>
          <button
            onClick={handleExportMtbf}
            disabled={loadingMtbf || loadingChecklist}
            className="w-full h-12 bg-[#004a88] text-white rounded-full font-headline font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {loadingMtbf ? (
              <><Loader2 size={16} className="animate-spin" /> PROCESSANDO...</>
            ) : (
              <><span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>download</span> EXPORTAR MTBF/MTTR</>
            )}
          </button>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-500 select-none notranslate" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-base text-blue-950 uppercase">Checklist Consolidado</h3>
            <p className="font-body text-sm text-slate-400 mt-1 leading-relaxed">
              Compilado de todas as inspeções preventivas mensais assinadas digitalmente em PDF.
            </p>
          </div>
          <button
            onClick={handleExportChecklist}
            disabled={loadingMtbf || loadingChecklist}
            className="w-full h-12 bg-white border-2 border-[#004a88] text-[#004a88] rounded-full font-headline font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all hover:bg-blue-50"
          >
            {loadingChecklist ? (
              <><Loader2 size={16} className="animate-spin text-slate-400" /> GERANDO PDF...</>
            ) : (
              <><span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>description</span> CHECKLIST MENSAL</>
            )}
          </button>
        </div>
      </div>

      {/* Banner de sucesso */}
      {lastExport && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600 select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>task_alt</span>
            </div>
            <div>
              <p className="font-headline font-bold text-sm text-emerald-900 uppercase">Relatório Pronto!</p>
              <p className="font-body text-[11px] text-emerald-700 mt-0.5">{lastExport}</p>
            </div>
          </div>
          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm border border-emerald-100 active:scale-95"
          >
            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '16px' }}>download</span>
            Baixar
          </button>
        </div>
      )}

      {/* Nota de rastreabilidade */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-start gap-4 shadow-[0_4px_16px_rgb(0,0,0,0.04)]">
        <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-slate-400 select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>info</span>
        </div>
        <div>
          <p className="font-headline font-bold text-sm text-blue-950 uppercase">Nota sobre rastreabilidade</p>
          <p className="font-body text-sm text-slate-400 mt-1 leading-relaxed">
            Todos os relatórios contêm carimbo de tempo (Timestamp) e são vinculados à assinatura digital do engenheiro responsável, em conformidade com a NR-12.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
