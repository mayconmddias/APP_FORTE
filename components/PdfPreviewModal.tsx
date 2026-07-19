import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  html: string;
  title: string;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64 = base64data.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};



const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  html,
  title,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const containerWidth = window.innerWidth;
      const targetWidth = 1040; // Base width of the desktop-designed PDF report layout
      if (containerWidth < targetWidth) {
        setScale(containerWidth / targetWidth);
      } else {
        setScale(1);
      }
    };

    if (isOpen) {
      setTimeout(updateScale, 150); // Timeout to ensure the container is fully mounted and styled
      window.addEventListener('resize', updateScale);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, [isOpen, html]);

  if (!isOpen) return null;

  const handleShare = async () => {
    const cleanFileName = title.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';

    try {
      const iframe = iframeRef.current;
      if (!iframe) {
        throw new Error('Iframe de visualização não encontrado.');
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc || !iframeDoc.body) {
        throw new Error('Não foi possível acessar o conteúdo do relatório.');
      }

      // Modificar o DOM do iframe original diretamente para que a biblioteca html2pdf processe as quebras antes de renderizar
      const body = iframeDoc.body;
      if (body) {
        body.style.width = '1024px';
        body.style.backgroundColor = 'white';
        body.style.margin = '0';
        body.style.padding = '0';
      }

      const container = iframeDoc.querySelector('.content-container') as HTMLElement;
      if (container) {
        container.style.width = '1024px';
        container.style.maxWidth = '1024px';
        container.style.margin = '0';
        container.style.padding = '40px';
        container.style.boxShadow = 'none';
        container.style.backgroundColor = 'white';
      }

      // ─── Particionamento de tabela por estimativas estáticas de altura ───
      // Não usamos getBoundingClientRect pois na WebView do Android as medições
      // divergem do espaço real do jsPDF, causando espaçadores errados.
      // Em vez disso usamos alturas estimadas por tipo de linha + marcadores CSS
      // de quebra de página (page-break-before: always) que o html2pdf respeita
      // de forma uniforme em qualquer ambiente (desktop, WebView, Chrome Android).
      const table = iframeDoc.querySelector('table');
      const signatures = (iframeDoc.querySelector('.signatures-section') || iframeDoc.querySelector('.report-footer')) as HTMLElement;

      // Verificamos a presença de uma classe customizada para idempotência
      const alreadySplit = container ? container.classList.contains('pdf-table-split-done') : false;

      if (!alreadySplit && table && container && signatures) {
        const rows = Array.from(table.querySelectorAll('tbody tr')) as HTMLElement[];
        const thead = table.querySelector('thead');
        const tableSection = table.closest('section');

        if (thead && rows.length > 0 && tableSection) {

          // Estimativas estáticas de altura por linha (em px, coordenadas do DOM a 1x):
          // Independentes de DPI/zoom — funcionam igual no desktop e na WebView Android.
          const ROW_HEIGHT_NORMAL = 62;   // linha sem imagem
          const ROW_HEIGHT_IMAGE  = 120;  // linha com imagem anexada
          const THEAD_HEIGHT      = 44;   // cabeçalho da tabela (thead)

          // Espaço disponível para linhas de tabela por página (estimativa conservadora):
          // Página 1 tem menos espaço pois ocupa o cabeçalho do relatório + info-grid.
          const BUDGET_PAGE_1    = 880;  // px — após logo + cabeçalho + info-grid
          const BUDGET_OTHER     = 1260; // px — páginas seguintes, margem leve de segurança

          // Estima a altura de cada linha com base na presença de imagem
          const rowHeights = rows.map(row =>
            row.querySelector('img') ? ROW_HEIGHT_IMAGE : ROW_HEIGHT_NORMAL
          );

          // Distribui as linhas em grupos, um grupo por página
          const rowGroups: HTMLElement[][] = [[]];
          let currentGroupIndex = 0;
          let currentGroupHeight = THEAD_HEIGHT; // pág. 1 começa já contando o thead

          rows.forEach((row, index) => {
            const rowHeight = rowHeights[index];
            const budget = currentGroupIndex === 0 ? BUDGET_PAGE_1 : BUDGET_OTHER;

            if (currentGroupHeight + rowHeight > budget) {
              currentGroupIndex++;
              rowGroups[currentGroupIndex] = [row];
              currentGroupHeight = THEAD_HEIGHT + rowHeight;
            } else {
              rowGroups[currentGroupIndex].push(row);
              currentGroupHeight += rowHeight;
            }
          });

          // Remove a tabela única original do DOM
          tableSection.remove();

          rowGroups.forEach((pageRows, index) => {
            // Insere marcador CSS de quebra de página ANTES de cada grupo
            // (exceto o primeiro, que continua na página 1 logo após o info-grid)
            if (index > 0) {
              const breakEl = iframeDoc.createElement('div');
              breakEl.className = 'pdf-page-break';
              breakEl.style.pageBreakBefore = 'always';
              breakEl.style.breakBefore = 'page';
              breakEl.style.height = '0';
              breakEl.style.margin = '0';
              breakEl.style.padding = '0';
              container.insertBefore(breakEl, signatures);
            }

            // Cria uma nova section com thead clonado + linhas deste grupo
            const newSection = iframeDoc.createElement('section');
            const newTable = iframeDoc.createElement('table');
            newTable.style.width = '100%';
            newTable.style.tableLayout = 'fixed';
            newTable.style.borderCollapse = 'collapse';

            // Clona o thead original para repetir o cabeçalho em cada página
            const newThead = thead.cloneNode(true);
            newTable.appendChild(newThead);

            const newTbody = iframeDoc.createElement('tbody');
            newTbody.className = 'table-body';
            pageRows.forEach(r => newTbody.appendChild(r));
            newTable.appendChild(newTbody);

            newSection.appendChild(newTable);
            container.insertBefore(newSection, signatures);
          });

          // Marca o container como já processado para evitar re-split
          container.classList.add('pdf-table-split-done');
        }
      }

      const opt = {
        margin: 10,
        filename: cleanFileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 1024,
          windowWidth: 1024,
          delay: 500,
          letterRendering: true,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc: Document) => {
            // Copia todos os blocos de estilos do iframe original para o head do documento clonado
            const iframe = iframeRef.current;
            if (iframe) {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (iframeDoc) {
                const styles = iframeDoc.querySelectorAll('style');
                styles.forEach(style => {
                  clonedDoc.head.appendChild(style.cloneNode(true));
                });
              }
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // Usa marcadores CSS (.pdf-page-break) para quebras de página.
        // Isso é robusto entre ambientes (desktop, WebView Android, Chrome mobile)
        // pois não depende de medições absolutas de pixel.
        pagebreak: { mode: ['css'], before: '.pdf-page-break' }
      };

      // Captura o elemento CONTENT-CONTAINER para ser renderizado diretamente
      const elementToRender = container || body;

      // Resolve a referência do html2pdf.js com suporte a ESM/UMD e fallbacks
      const html2pdfFunc = (html2pdf as any).default || html2pdf || (window as any).html2pdf;
      if (typeof html2pdfFunc !== 'function') {
        throw new Error('Biblioteca html2pdf não foi carregada como função válida.');
      }

      // Converte o elemento DOM do iframe diretamente para um arquivo PDF Blob usando html2pdf.js
      const pdfBlob = await html2pdfFunc().from(elementToRender).set(opt).output('blob');

      // ─── CAMADA 1: Web Share API com arquivo (funciona em WebViews Android modernas) ───
      const pdfFile = new File([pdfBlob], cleanFileName, { type: 'application/pdf' });
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [pdfFile] })
      ) {
        await navigator.share({
          title: title,
          text: `Segue o relatório PDF: ${title}`,
          files: [pdfFile],
        });
        return;
      }

      // ─── CAMADA 2: Capacitor Filesystem + Share (fallback nativo APK) ───
      if (Capacitor.isNativePlatform()) {
        const base64Data = await blobToBase64(pdfBlob);

        // Grava o arquivo PDF temporariamente no cache nativo do celular
        const writeResult = await Filesystem.writeFile({
          path: cleanFileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        // Compartilha o arquivo utilizando a URI nativa
        await Share.share({
          title: title,
          text: `Segue o relatório PDF: ${title}`,
          url: writeResult.uri,
          dialogTitle: 'Compartilhar Relatório',
        });
        return;
      }

      // ─── CAMADA 3: Fallback navegador web (Download direto do PDF) ───
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cleanFileName;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("Erro no compartilhamento:", err);
      alert("Falha ao gerar e compartilhar PDF: " + (err.message || err));
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99999] flex flex-col animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="bg-[#004a88] text-white h-16 flex items-center justify-between px-4 shadow-md z-[100000]">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-full transition-all active:scale-95"
        >
          <span className="material-symbols-outlined select-none notranslate">arrow_back</span>
          <span className="font-headline font-bold text-xs uppercase tracking-wider hidden sm:inline">Voltar</span>
        </button>

        <h2 className="font-headline font-bold text-sm uppercase tracking-wider truncate max-w-[50%] sm:max-w-[70%]">
          {title}
        </h2>

        {(Capacitor.isNativePlatform() || typeof navigator.share === 'function') && (
          <button
            onClick={handleShare}
            className="flex items-center justify-center w-10 h-10 bg-white text-[#004a88] hover:bg-slate-100 rounded-full shadow-sm transition-all active:scale-95"
            title="Compartilhar"
          >
            <span className="material-symbols-outlined select-none notranslate">share</span>
          </button>
        )}
      </div>

      {/* PDF Content Area */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full bg-slate-200 overflow-y-auto overflow-x-hidden flex justify-center p-2 sm:p-4"
      >
        <div 
          style={{
            width: '1024px',
            height: scale < 1 ? `calc(100% / ${scale})` : '100%',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            flexShrink: 0,
          }} 
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title={title}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PdfPreviewModal;
