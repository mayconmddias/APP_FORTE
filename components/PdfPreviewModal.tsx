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

const getOfflineStyles = async (): Promise<string> => {
  let cssText = '';
  try {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (let i = 0; i < links.length; i++) {
      const href = links[i].getAttribute('href');
      if (href) {
        try {
          const response = await fetch(href);
          cssText += (await response.text()) + '\n';
        } catch (e) {
          console.error(`Erro ao buscar stylesheet ${href}:`, e);
        }
      }
    }
  } catch (e) {
    console.error('Erro ao ler link stylesheets:', e);
  }
  return cssText;
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
          delay: 300
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Obtém os estilos de css pré-compilados do aplicativo de forma segura e offline
      const parentStyles = await getOfflineStyles();

      // Substitui a tag da CDN do Tailwind pelos estilos locais para suporte offline completo
      let styledHtml = html;
      const cdnScriptTag = '<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>';
      
      if (html.includes(cdnScriptTag)) {
        styledHtml = html.replace(cdnScriptTag, `<style>${parentStyles}</style>`);
      } else {
        styledHtml = html.replace('</head>', `<style>${parentStyles}</style></head>`);
      }

      // Resolve a referência do html2pdf.js com suporte a ESM/UMD e fallbacks
      const html2pdfFunc = (html2pdf as any).default || html2pdf || (window as any).html2pdf;
      if (typeof html2pdfFunc !== 'function') {
        throw new Error('Biblioteca html2pdf não foi carregada como função válida.');
      }

      // Converte a string HTML diretamente para um arquivo PDF Blob usando html2pdf.js
      const pdfBlob = await html2pdfFunc().from(styledHtml).set(opt).output('blob');

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

        <button
          onClick={handleShare}
          className="flex items-center justify-center w-10 h-10 bg-white text-[#004a88] hover:bg-slate-100 rounded-full shadow-sm transition-all active:scale-95"
          title="Compartilhar"
        >
          <span className="material-symbols-outlined select-none notranslate">share</span>
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
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-modals"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PdfPreviewModal;
