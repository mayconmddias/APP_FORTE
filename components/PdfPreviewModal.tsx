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

      // Particionamento dinâmico de tabelas diretamente no iframe original para forçar quebras de página e repetir o cabeçalho (thead)
      const table = iframeDoc.querySelector('table');
      const signatures = (iframeDoc.querySelector('.signatures-section') || iframeDoc.querySelector('.report-footer')) as HTMLElement;
      
      // Verificamos a presença de uma classe customizada para idempotência
      const alreadySplit = container ? container.classList.contains('pdf-table-split-done') : false;

      if (!alreadySplit && table && container && signatures) {
        const rows = Array.from(table.querySelectorAll('tbody tr')) as HTMLElement[];
        const thead = table.querySelector('thead');
        const tableSection = table.closest('section');

        if (thead && rows.length > 0 && tableSection) {
          const containerRect = container.getBoundingClientRect();
          const getRelativeTop = (el: HTMLElement) => {
            return el.getBoundingClientRect().top - containerRect.top;
          };
          const getRelativeBottom = (el: HTMLElement) => {
            return el.getBoundingClientRect().bottom - containerRect.top;
          };

          const rowHeights = rows.map(row => {
            let h = getRelativeBottom(row) - getRelativeTop(row);
            if (!h || h <= 0) {
              h = row.querySelector('img') ? 110 : 55;
            }
            return h;
          });

          const theadHeight = getRelativeBottom(thead) - getRelativeTop(thead) || 50;
          const firstPageOffset = getRelativeTop(thead) + theadHeight;

          const rowGroups: HTMLElement[][] = [[]];
          let currentGroupIndex = 0;

          // Altura de uma folha A4 no fatiador real do jsPDF correspondente a 1496px
          const PAGE_HEIGHT_PX = 1496;
          
          // Orçamentos conservadores baseados nas alturas reais do DOM
          const BUDGET_PAGE_1 = 1200;
          const BUDGET_OTHER_PAGES = 1250;

          let currentGroupHeight = firstPageOffset;

          rows.forEach((row, index) => {
            const rowHeight = rowHeights[index];
            const pageBudget = currentGroupIndex === 0 ? BUDGET_PAGE_1 : BUDGET_OTHER_PAGES;

            if (currentGroupHeight + rowHeight > pageBudget) {
              currentGroupIndex++;
              rowGroups[currentGroupIndex] = [row];
              currentGroupHeight = theadHeight + rowHeight;
            } else {
              rowGroups[currentGroupIndex].push(row);
              currentGroupHeight += rowHeight;
            }
          });

          // Remove a tabela única original
          tableSection.remove();

          let cumulativeHeight = 0;

          rowGroups.forEach((pageRows, index) => {
            if (index > 0) {
              // Início exato da próxima página no fatiamento do jsPDF
              const nextPageStart = index * PAGE_HEIGHT_PX;
              // Altura necessária para empurrar o início do conteúdo da página para (nextPageStart + 40px de recuo superior)
              const spacerHeight = (nextPageStart + 40) - cumulativeHeight;

              if (spacerHeight > 0) {
                const spacer = iframeDoc.createElement('div');
                spacer.className = 'html2pdf__page-break-spacer';
                spacer.style.height = `${spacerHeight}px`;
                spacer.style.margin = '0';
                spacer.style.padding = '0';
                container.insertBefore(spacer, signatures);
                cumulativeHeight += spacerHeight;
              }
            }

            // Cria uma nova section e table
            const newSection = iframeDoc.createElement('section');
            const newTable = iframeDoc.createElement('table');
            newTable.style.width = '100%';
            newTable.style.tableLayout = 'fixed';
            newTable.style.borderCollapse = 'collapse';

            // Clona o thead original
            const newThead = thead.cloneNode(true);
            newTable.appendChild(newThead);

            // Adiciona o tbody e as linhas desta página
            const newTbody = iframeDoc.createElement('tbody');
            newTbody.className = 'table-body';
            pageRows.forEach(r => {
              newTbody.appendChild(r);
            });
            newTable.appendChild(newTbody);

            newSection.appendChild(newTable);
            container.insertBefore(newSection, signatures);

            // Calcula a altura real deste bloco adicionado à página atual
            const sectionHeight = (index === 0 ? getRelativeTop(thead) : 0) + theadHeight + pageRows.reduce((sum, _, rIndex) => {
              const rHeight = rowHeights[rows.indexOf(pageRows[rIndex])];
              return sum + rHeight;
            }, 0);

            cumulativeHeight += sectionHeight;
          });

          // Adiciona classe de controle para evitar re-split
          container.classList.add('pdf-table-split-done');
        }
      }

      const hasTable = iframeDoc.querySelector('table') !== null;
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
        pagebreak: hasTable ? { mode: [] } : { mode: ['css', 'legacy'] }
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
