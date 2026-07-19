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

      // ─── Particionamento de tabela: espaçador com altura matemática determinística ───
      //
      // O PAGE_HEIGHT_PX é calculado APENAS por aritmética das configurações do jsPDF.
      // Não depende de DPI, zoom, viewport ou WebView — é IDÊNTICO em qualquer ambiente:
      //
      //   px_por_mm = windowWidth(1024px) / largura_útil_A4(190mm) = 5.389 px/mm
      //   PAGE_HEIGHT_PX = altura_útil_A4(277mm) × 5.389 = 1492px
      //
      // O jsPDF (com mode:[]) fatia o canvas automaticamente a cada PAGE_HEIGHT_PX pixels.
      // O espaçador garante que cada grupo de tabela começa EXATAMENTE num múltiplo
      // de PAGE_HEIGHT_PX, alinhado com o início de uma nova página no jsPDF.

      // ─── Geometria determinística da página ───
      const PDF_MARGIN_MM  = 10;
      const PAGE_H_MM      = 297 - 2 * PDF_MARGIN_MM; // 277mm usable
      const PAGE_W_MM      = 210 - 2 * PDF_MARGIN_MM; // 190mm usable
      const DOM_WIDTH_PX   = 1024;                     // html2canvas.windowWidth
      const PX_PER_MM      = DOM_WIDTH_PX / PAGE_W_MM; // 5.389 px/mm
      const PAGE_HEIGHT_PX = Math.floor(PAGE_H_MM * PX_PER_MM); // 1492px

      // ─── Alturas fixas dos elementos CSS do relatório (px a 1x) ───
      // Derivadas das propriedades CSS do relatório — não variam entre ambientes.
      const CONTAINER_PAD = 40;  // container.style.padding = '40px'
      const HEADER_H      = 135; // .report-header: logo(65) + pb(24) + mb(32) + ~border/text
      const INFO_GRID_H   = 200; // .info-grid: 2 rows flex×~58px + pb(32) + mb(40) + buffer
      const THEAD_H       = 44;  // thead row: 2×padding(12) + text(20)
      const ROW_H         = 62;  // linha normal: 2×padding(12) + texto(38)
      const ROW_H_IMG     = 120; // linha com imagem: img(56) + 2×padding(12) + texto

      // Pixels acumulados no canvas ANTES do tbody da tabela na página 1
      // (container topo → fim do thead do grupo 1)
      const PRE_TABLE_H = CONTAINER_PAD + HEADER_H + INFO_GRID_H; // 375px (sem thead)

      // Orçamento de linhas (tbody) por página — quanto espaço há para rows
      const BUDGET_P1 = PAGE_HEIGHT_PX - PRE_TABLE_H - THEAD_H; // ≈1073px (pág. 1)
      const BUDGET_PN = PAGE_HEIGHT_PX - THEAD_H;               // ≈1448px (pág. 2+)

      const table = iframeDoc.querySelector('table');
      const signatures = (iframeDoc.querySelector('.signatures-section') || iframeDoc.querySelector('.report-footer')) as HTMLElement;

      const alreadySplit = container ? container.classList.contains('pdf-table-split-done') : false;

      if (!alreadySplit && table && container && signatures) {
        const rows = Array.from(table.querySelectorAll('tbody tr')) as HTMLElement[];
        const thead = table.querySelector('thead');
        const tableSection = table.closest('section');

        if (thead && rows.length > 0 && tableSection) {

          // Estima altura de cada linha pela presença de imagem
          const rowHeights = rows.map(row => row.querySelector('img') ? ROW_H_IMG : ROW_H);

          // ─── Distribuição de linhas em grupos (1 grupo = 1 página) ───
          const rowGroups: HTMLElement[][] = [[]];
          let gi = 0; // índice do grupo atual
          let gh = 0; // altura acumulada de linhas no grupo atual

          rows.forEach((row, idx) => {
            const rh = rowHeights[idx];
            const budget = gi === 0 ? BUDGET_P1 : BUDGET_PN;
            if (gh + rh > budget) {
              gi++;
              rowGroups[gi] = [row];
              gh = rh;
            } else {
              rowGroups[gi].push(row);
              gh += rh;
            }
          });

          // Remove a tabela única original
          tableSection.remove();

          // cumH rastreia a altura total do canvas consumida até agora
          // Começa em PRE_TABLE_H (posição onde o thead do grupo 1 começa)
          let cumH = PRE_TABLE_H;

          rowGroups.forEach((pageRows, idx) => {
            if (idx > 0) {
              // O thead deste grupo deve começar EXATAMENTE no início da página idx.
              // Inserimos um espaçador com a altura exata que preenche o gap.
              const targetStart = PAGE_HEIGHT_PX * idx; // ex: 1492, 2984, 4476...
              const spacerH = targetStart - cumH;

              if (spacerH > 0) {
                const spacer = iframeDoc.createElement('div');
                // cssText garante que nenhuma outra regra CSS afete este elemento
                spacer.style.cssText =
                  `height:${spacerH}px;display:block;` +
                  `margin:0;padding:0;line-height:0;font-size:0;border:none;` +
                  `background:transparent;overflow:hidden;`;
                container.insertBefore(spacer, signatures);
              }
              // Após o espaçador, estamos exatamente no limite da página
              cumH = targetStart;
            }

            // ─── Seção: thead clonado + linhas deste grupo ───
            const section = iframeDoc.createElement('section');
            section.style.cssText = 'margin:0;padding:0;';
            const tbl = iframeDoc.createElement('table');
            tbl.style.cssText = 'width:100%;table-layout:fixed;border-collapse:collapse;margin:0;';
            tbl.appendChild(thead.cloneNode(true));
            const tbody = iframeDoc.createElement('tbody');
            tbody.className = 'table-body';
            pageRows.forEach(r => tbody.appendChild(r));
            tbl.appendChild(tbody);
            section.appendChild(tbl);
            container.insertBefore(section, signatures);

            // Atualiza cumH: adiciona thead + linhas deste grupo
            const groupRowsH = pageRows.reduce((s, _, i) => s + rowHeights[rows.indexOf(pageRows[i])], 0);
            cumH += THEAD_H + groupRowsH;
          });

          container.classList.add('pdf-table-split-done');
        }
      }

      const opt = {
        margin: PDF_MARGIN_MM,
        filename: cleanFileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          width: DOM_WIDTH_PX,
          windowWidth: DOM_WIDTH_PX,
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
                styles.forEach(style => clonedDoc.head.appendChild(style.cloneNode(true)));
              }
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // mode:[] → jsPDF fatia o canvas automaticamente a cada PAGE_HEIGHT_PX pixels.
        // Os espaçadores matemáticos garantem que cada grupo inicia num múltiplo exato
        // de PAGE_HEIGHT_PX, alinhado com o corte automático do jsPDF.
        pagebreak: { mode: [] as string[] }
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
