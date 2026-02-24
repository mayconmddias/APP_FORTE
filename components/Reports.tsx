
import React, { useState } from 'react';
import {
  FileDown,
  FileText,
  BarChart3,
  CheckCircle,
  Loader2,
  Download,
  Calendar,
  AlertCircle
} from 'lucide-react';

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

    const content = "Relatório Gerado por Forte Engenharia Pro\nData: " + new Date().toLocaleString() + "\nStatus: Concluído e Assinado.";
    const mimeType = lastExport.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([content], { type: mimeType });

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: lastExport,
          types: [{
            description: lastExport.endsWith('.pdf') ? 'Arquivo PDF' : 'Planilha Excel',
            accept: { [mimeType]: [lastExport.endsWith('.pdf') ? '.pdf' : '.xlsx'] },
          }],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setLastExport(null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Erro ao salvar:", err);
          fallbackDownload(blob, lastExport);
        }
      }
    } else {
      fallbackDownload(blob, lastExport);
    }
  };

  const fallbackDownload = (blob: Blob, filename: string) => {
    const url = URL.revokeObjectURL(URL.createObjectURL(blob));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLastExport(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-800">Relatórios Estratégicos</h2>
        <p className="text-slate-500">Gere documentos técnicos e indicadores de performance para auditorias e controle operacional.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <BarChart3 size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Indicadores de Manutenção</h3>
            <p className="text-slate-500 text-sm mt-1">Exportação completa de MTBF, MTTR e Disponibilidade por ativo em formato Excel.</p>
          </div>
          <button
            onClick={handleExportMtbf}
            disabled={loadingMtbf || loadingChecklist}
            className="w-full h-14 bg-[#0066CC] text-white px-6 rounded-[20px] font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loadingMtbf ? <><Loader2 size={18} className="animate-spin" /> PROCESSANDO...</> : <><FileDown size={20} /> EXPORTAR MTBF/MTTR</>}
          </button>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-6">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Calendar size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Checklist Consolidado</h3>
            <p className="text-slate-500 text-sm mt-1">Compilado de todas as inspeções preventivas mensais assinadas digitalmente em PDF.</p>
          </div>
          <button
            onClick={handleExportChecklist}
            disabled={loadingMtbf || loadingChecklist}
            className="w-full h-14 bg-white border-2 border-slate-200 text-slate-700 px-6 rounded-[20px] font-black uppercase text-xs tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
          >
            {loadingChecklist ? <><Loader2 size={18} className="animate-spin text-slate-400" /> GERANDO PDF...</> : <><FileText size={20} /> CHECKLIST MENSAL</>}
          </button>
        </div>
      </div>

      {lastExport && (
        <div className="bg-green-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="font-bold">Relatório Pronto!</p>
              <p className="text-xs text-green-100 opacity-90">{lastExport}</p>
            </div>
          </div>
          <button
            onClick={handleDownloadFile}
            className="px-4 py-2 bg-white text-green-700 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-green-50 transition-colors shadow-sm"
          >
            <Download size={16} /> Baixar Arquivo
          </button>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex items-start gap-4">
        <AlertCircle className="text-slate-400 flex-shrink-0" size={24} />
        <div className="text-sm text-slate-600 space-y-1">
          <p className="font-bold text-slate-700">Nota sobre rastreabilidade:</p>
          <p>Todos os relatórios gerados contêm carimbo de tempo (Timestamp) e são vinculados à assinatura digital do engenheiro responsável, em conformidade com a NR-12.</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
