import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import HtmlPdf from '../services/HtmlPdf';

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

/**
 * Espera que todas as imagens <img> dentro do documento do iframe terminem de baixar
 * da internet antes de disparar o gerador de PDF. Evita imagens em branco no 1º acesso.
 */
const ensureImagesLoaded = (iframeDoc: Document): Promise<void> => {
  return new Promise((resolve) => {
    const images = Array.from(iframeDoc.querySelectorAll('img'));
    if (images.length === 0) {
      resolve();
      return;
    }

    let loadedCount = 0;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= images.length) {
        resolve();
      }
    };

    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        checkDone();
      } else {
        img.addEventListener('load', checkDone, { once: true });
        img.addEventListener('error', checkDone, { once: true });
      }
    });

    setTimeout(resolve, 4000); // Trava máxima de segurança de 4s
  });
};

/**
 * Motor Dinâmico de Paginação Universal:
 * - Página 1 (Tratamento Único): Inicia com Logo, dados da OS e Informações do Ativo.
 *   Em seguida entra o cabeçalho com fundo azul e preenche com itens até o fim útil da folha (~15 a 17 itens).
 * - Páginas 2 em diante: O cabeçalho com fundo azul é SEMPRE o primeiro item no início da folha (Y=15mm).
 *   Preenche com itens até o fim útil da folha (~18 a 22 itens), sem desperdício de espaço.
 * - Assinaturas e Rodapé: Anexados na folha final se houver espaço; caso contrário, ganham folha dedicada.
 */
const paginateDocument = (iframeDoc: Document) => {
  const body = iframeDoc.body;
  if (body) {
    body.style.width = '1024px';
    body.style.backgroundColor = 'white';
    body.style.margin = '0';
    body.style.padding = '0';
  }

  const container = iframeDoc.querySelector('.content-container') as HTMLElement;
  const table = iframeDoc.querySelector('table');
  const reportHeader = iframeDoc.querySelector('.report-header') as HTMLElement;
  const infoGrid = iframeDoc.querySelector('.info-grid') as HTMLElement;
  const signatures = (iframeDoc.querySelector('.signatures-section') || iframeDoc.querySelector('.report-footer')) as HTMLElement;
  const footer = iframeDoc.querySelector('.report-footer') as HTMLElement;

  const alreadyPaginated = container ? container.classList.contains('pdf-paginated-done') : false;
  if (alreadyPaginated || !table || !container) return;

  const rows = Array.from(table.querySelectorAll('tbody tr')) as HTMLElement[];
  const thead = table.querySelector('thead');
  const tableSection = table.closest('section');

  if (!thead || rows.length === 0 || !tableSection) return;

  // Medição da altura real de cada elemento antes de alterar o DOM
  const getElHeight = (el: HTMLElement | null, fallback: number) => {
    if (!el) return fallback;
    return el.offsetHeight || fallback;
  };

  const getRowHeight = (row: HTMLElement) => {
    const h = row.offsetHeight;
    if (h && h > 30) return h;
    const hasImg = !!row.querySelector('img');
    const obsText = row.querySelector('.td-obs')?.textContent || '';
    if (hasImg) return 76;
    if (obsText.length > 80) return 68;
    return 48;
  };

  // Altura útil de uma folha A4 em pixels (largura 1024px)
  // 1024 * (267mm útil / 180mm útil) = 1518px físicos.
  // 1360px é o teto seguro de conteúdo, garantindo 158px de margem contra estouros.
  const A4_MAX_CONTENT_H = 1360;

  // Página 1: Particularidade única (Logo + Título + Nº OS + Grid de Informações do Ativo)
  const p1HeaderH = getElHeight(reportHeader, 135);
  const p1InfoGridH = getElHeight(infoGrid, 185);
  const theadH = getElHeight(thead, 44);

  // Orçamento para linhas na Página 1 (descontando os dados do ativo e o cabeçalho azul)
  const p1RowsBudget = A4_MAX_CONTENT_H - p1HeaderH - p1InfoGridH - theadH; // ~996px

  // Páginas 2 em diante: O cabeçalho com fundo azul é o PRIMEIRO item no início da folha
  // Não há logo nem dados do ativo, liberando quase toda a folha
  const pnRowsBudget = A4_MAX_CONTENT_H - theadH; // ~1316px

  // Altura de assinaturas e rodapé
  const sigH = getElHeight(signatures, 160);
  const footH = footer && footer !== signatures ? getElHeight(footer, 180) : 0;
  const totalSigH = sigH + footH;

  const totalRows = rows.length;
  const rowHeights = rows.map(r => getRowHeight(r));

  // Agrupamento dinâmico baseado em preenchimento contínuo da folha
  const pageGroups: HTMLElement[][] = [[]];
  let currentGroupIdx = 0;
  let currentHeight = 0;

  for (let i = 0; i < totalRows; i++) {
    const row = rows[i];
    const rh = rowHeights[i];
    const budget = currentGroupIdx === 0 ? p1RowsBudget : pnRowsBudget;

    // Se a próxima linha ultrapassar a capacidade da folha atual e já temos ao menos 1 linha
    if (currentHeight + rh > budget && pageGroups[currentGroupIdx].length > 0) {
      currentGroupIdx++;
      pageGroups[currentGroupIdx] = [row];
      currentHeight = rh;
    } else {
      pageGroups[currentGroupIdx].push(row);
      currentHeight += rh;
    }
  }

  // Verifica se na última folha de tabela sobra espaço para as assinaturas e o rodapé
  const lastBudget = currentGroupIdx === 0 ? p1RowsBudget : pnRowsBudget;
  const canFitSignaturesOnLastPage = (currentHeight + totalSigH <= lastBudget);

  // Limpa o container original para reconstruir em páginas discretas (.pdf-page)
  container.innerHTML = '';
  container.style.padding = '0';
  container.style.margin = '0';
  container.style.width = '1024px';
  container.style.maxWidth = '1024px';
  container.style.boxShadow = 'none';
  container.style.backgroundColor = '#ffffff';

  const createPdfPage = (isFirst: boolean) => {
    const pageDiv = iframeDoc.createElement('div');
    pageDiv.className = 'pdf-page';
    pageDiv.style.cssText = `
      width: 1024px;
      box-sizing: border-box;
      background-color: #ffffff;
      padding: 40px;
      margin: 0 auto ${isFirst ? '0' : '20px'};
      ${!isFirst ? 'page-break-before: always; break-before: page;' : ''}
    `;
    return pageDiv;
  };

  // Cria cada folha
  pageGroups.forEach((groupRows, gIdx) => {
    const pageDiv = createPdfPage(gIdx === 0);

    if (gIdx === 0) {
      // Página 1: Particularidade ÚNICA
      // 1. Dados institucionais e informações do ativo
      if (reportHeader) pageDiv.appendChild(reportHeader);
      if (infoGrid) pageDiv.appendChild(infoGrid);
    }

    const tblSection = iframeDoc.createElement('section');
    tblSection.style.cssText = 'margin: 0; padding: 0; width: 100%;';

    const tbl = iframeDoc.createElement('table');
    tbl.style.cssText = 'width: 100%; table-layout: fixed; border-collapse: collapse; margin: 0;';

    // 2. Cabeçalho com fundo azul no topo da tabela
    // Na Página 1 vem após os dados do ativo; nas demais páginas é o PRIMEIRO item no início da folha
    tbl.appendChild(thead.cloneNode(true));

    const tbody = iframeDoc.createElement('tbody');
    tbody.className = 'table-body';
    groupRows.forEach(r => tbody.appendChild(r));
    tbl.appendChild(tbody);

    tblSection.appendChild(tbl);
    pageDiv.appendChild(tblSection);

    // Se couber as assinaturas nesta folha final
    if (gIdx === pageGroups.length - 1 && canFitSignaturesOnLastPage) {
      if (signatures) pageDiv.appendChild(signatures);
      if (footer && footer !== signatures) pageDiv.appendChild(footer);
    }

    container.appendChild(pageDiv);
  });

  // Se as assinaturas não couberam na última folha de tabela, recebem folha final dedicada
  if (!canFitSignaturesOnLastPage && (signatures || footer)) {
    const sigPageDiv = createPdfPage(false);
    if (signatures) sigPageDiv.appendChild(signatures);
    if (footer && footer !== signatures) sigPageDiv.appendChild(footer);
    container.appendChild(sigPageDiv);
  }

  container.classList.add('pdf-paginated-done');
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

  const handleIframeLoad = async () => {
    const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
    if (iframeDoc) {
      await ensureImagesLoaded(iframeDoc);
      paginateDocument(iframeDoc);
    }
  };

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

      // Aguarda o pré-carregamento de 100% das imagens antes de gerar o PDF
      await ensureImagesLoaded(iframeDoc);

      // Garante a paginação das folhas antes de gerar o PDF
      paginateDocument(iframeDoc);

      const body = iframeDoc.body;
      const container = iframeDoc.querySelector('.content-container') as HTMLElement;

      // ─── CAMADA NATIVA (Capacitor Android APK) ───
      if (Capacitor.isNativePlatform()) {
        try {
          const htmlContent = iframeDoc.documentElement.outerHTML;
          const result = await HtmlPdf.generatePdf({
            html: htmlContent,
            fileName: cleanFileName
          });

          await Share.share({
            title: title,
            text: `Segue o relatório PDF: ${title}`,
            url: result.uri,
            dialogTitle: 'Compartilhar Relatório',
          });
          return;
        } catch (nativeErr) {
          console.warn('Geração nativa falhou, caindo para motor jsPDF:', nativeErr);
        }
      }

      // ─── MOTOR DE RENDERIZAÇÃO DIRETO: jsPDF + html2canvas (Zero Drift) ───
      const pdfPages = Array.from(iframeDoc.querySelectorAll('.pdf-page')) as HTMLElement[];
      const pagesToRender = pdfPages.length > 0 ? pdfPages : [container || body];

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const A4_WIDTH_MM = 210;
      const MARGIN_MM = 15;
      const PRINT_WIDTH_MM = A4_WIDTH_MM - (MARGIN_MM * 2); // 180mm

      for (let i = 0; i < pagesToRender.length; i++) {
        const pageEl = pagesToRender[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 1024,
          windowWidth: 1024,
          backgroundColor: '#ffffff',
        });

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const imgHeightMm = (canvas.height * PRINT_WIDTH_MM) / canvas.width;

        // Cada página é impressa SEMPRE em X = 15mm, Y = 15mm (Topo Exato da folha)
        pdf.addImage(imgData, 'JPEG', MARGIN_MM, MARGIN_MM, PRINT_WIDTH_MM, imgHeightMm);
      }

      const pdfBlob = pdf.output('blob');

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

        const writeResult = await Filesystem.writeFile({
          path: cleanFileName,
          data: base64Data,
          directory: Directory.Cache,
        });

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

        <button
          onClick={handleShare}
          className="flex items-center justify-center w-10 h-10 bg-white text-[#004a88] hover:bg-slate-100 rounded-full shadow-sm transition-all active:scale-95"
          title={Capacitor.isNativePlatform() || typeof navigator.share === 'function' ? 'Compartilhar' : 'Baixar PDF'}
        >
          <span className="material-symbols-outlined select-none notranslate">
            {Capacitor.isNativePlatform() || typeof navigator.share === 'function' ? 'share' : 'download'}
          </span>
        </button>
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
            onLoad={handleIframeLoad}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PdfPreviewModal;
