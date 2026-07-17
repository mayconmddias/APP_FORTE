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

            // Forçar largura fixa e resetar margens/fundo no documento clonado
            const body = clonedDoc.body;
            if (body) {
              body.style.width = '1024px';
              body.style.backgroundColor = 'white';
              body.style.margin = '0';
              body.style.padding = '0';
            }

            const container = clonedDoc.querySelector('.content-container') as HTMLElement;
            if (container) {
              container.style.width = '1024px';
              container.style.maxWidth = '1024px';
              container.style.margin = '0';
              container.style.padding = '40px';
              container.style.boxShadow = 'none';
              container.style.backgroundColor = 'white';
            }

            // Particionamento dinâmico de tabelas para repetir o cabeçalho (thead) e forçar quebras limpas
            const table = clonedDoc.querySelector('table');
            if (table) {
              const rows = Array.from(table.querySelectorAll('tbody tr')) as HTMLElement[];
              const thead = table.querySelector('thead');
              const tableParent = table.parentNode;

              if (thead && tableParent && rows.length > 0) {
                const pages: HTMLElement[][] = [[]];
                let currentPageIndex = 0;
                let currentPageHeight = 0;

                const header = clonedDoc.querySelector('.report-header') as HTMLElement;
                const infoGrid = clonedDoc.querySelector('.info-grid') as HTMLElement;

                let firstPageOffset = 40; // padding superior
                if (header) firstPageOffset += header.offsetHeight || 120;
                if (infoGrid) firstPageOffset += infoGrid.offsetHeight || 150;
                firstPageOffset += thead.offsetHeight || 50;

                const maxPageHeight = 1350; // Altura máxima permitida para o conteúdo A4
                currentPageHeight = firstPageOffset;

                rows.forEach(row => {
                  let rowHeight = row.offsetHeight;
                  if (!rowHeight || rowHeight <= 0) {
                    rowHeight = row.querySelector('img') ? 110 : 55;
                  }

                  if (currentPageHeight + rowHeight > maxPageHeight) {
                    currentPageIndex++;
                    pages[currentPageIndex] = [row];
                    currentPageHeight = 50 + rowHeight; // 50px aproximado para thead repetido
                  } else {
                    pages[currentPageIndex].push(row);
                    currentPageHeight += rowHeight;
                  }
                });

                // Remove a tabela única original
                table.remove();

                pages.forEach((pageRows, index) => {
                  if (index > 0) {
                    // Injeta a quebra de página
                    const pageBreak = clonedDoc.createElement('div');
                    pageBreak.className = 'html2pdf__page-break';
                    pageBreak.style.pageBreakBefore = 'always';
                    pageBreak.style.breakBefore = 'always';
                    tableParent.appendChild(pageBreak);

                    // Espaçador no topo da nova página
                    const spacer = clonedDoc.createElement('div');
                    spacer.style.height = '20px';
                    tableParent.appendChild(spacer);
                  }

                  // Cria a nova tabela
                  const newTable = clonedDoc.createElement('table');
                  newTable.style.width = '100%';
                  newTable.style.tableLayout = 'fixed';
                  newTable.style.borderCollapse = 'collapse';

                  // Clona o thead original
                  const newThead = thead.cloneNode(true);
                  newTable.appendChild(newThead);

                  // Adiciona o tbody e as linhas desta página
                  const newTbody = clonedDoc.createElement('tbody');
                  newTbody.className = 'table-body';
                  pageRows.forEach(r => {
                    newTbody.appendChild(r);
                  });
                  newTable.appendChild(newTbody);

                  tableParent.appendChild(newTable);
                });
              }
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      const iframe = iframeRef.current;
      if (!iframe) {
        throw new Error('Iframe de visualização não encontrado.');
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc || !iframeDoc.body) {
        throw new Error('Não foi possível acessar o conteúdo do relatório.');
      }

      // Captura o elemento BODY já renderizado e com estilos CSS computados pelo WebView do celular
      const elementToRender = iframeDoc.body;

      // Resolve a referência do html2pdf.js com suporte a ESM/UMD e fallbacks
      const html2pdfFunc = (html2pdf as any).default || html2pdf || (window as any).html2pdf;
      if (typeof html2pdfFunc !== 'function') {
        throw new Error('Biblioteca html2pdf não foi carregada como função válida.');
      }

      // Converte o elemento DOM do iframe diretamente para um arquivo PDF Blob usando html2pdf.js
      const pdfBlob = await html2pdfFunc().from(elementToRender).set(opt).output('blob');

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
      } else {
        // Fallback para navegador web (Download direto do PDF)
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanFileName;
        a.click();
        URL.revokeObjectURL(url);
      }
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

        {Capacitor.isNativePlatform() && (
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
