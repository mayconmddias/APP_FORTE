import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  html: string;
  title: string;
}

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
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const targetWidth = 1040; // Base width of the desktop-designed PDF report layout
        if (containerWidth < targetWidth) {
          setScale(containerWidth / targetWidth);
        } else {
          setScale(1);
        }
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
    const cleanFileName = title.replace(/[^a-zA-Z0-9]/g, '_') + '.html';
    const file = new File([html], cleanFileName, { type: 'text/html' });

    try {
      if (navigator.share) {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: title,
            text: `Segue o relatório: ${title}`
          });
        } else {
          await navigator.share({
            title: title,
            text: `Relatório de Inspeção: ${title}`
          });
        }
      } else {
        alert("O compartilhamento não é suportado neste dispositivo. Tente copiar o conteúdo ou enviar manualmente.");
      }
    } catch (err) {
      console.log("Erro no compartilhamento:", err);
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

        <h2 className="font-headline font-bold text-sm uppercase tracking-wider truncate max-w-[40%] sm:max-w-[60%]">
          {title}
        </h2>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#004a88] hover:bg-slate-100 rounded-full font-headline font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
        >
          <span className="material-symbols-outlined select-none notranslate">share</span>
          <span>Compartilhar</span>
        </button>
      </div>

      {/* PDF Content Area */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full bg-slate-200 overflow-y-auto flex justify-center p-2 sm:p-4"
      >
        <div 
          style={{
            width: '1024px',
            height: scale < 1 ? `calc(100% / ${scale})` : '100%',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
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
