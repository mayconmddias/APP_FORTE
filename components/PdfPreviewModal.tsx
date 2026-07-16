import React, { useRef } from 'react';
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

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current) {
      const iframeWindow = iframeRef.current.contentWindow;
      if (iframeWindow) {
        iframeWindow.focus();
        iframeWindow.print();
      }
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

        <h2 className="font-headline font-bold text-sm uppercase tracking-wider truncate max-w-[50%]">
          {title}
        </h2>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#004a88] hover:bg-slate-100 rounded-full font-headline font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
        >
          <span className="material-symbols-outlined select-none notranslate">print</span>
          <span className="hidden sm:inline">Imprimir</span>
        </button>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 w-full bg-slate-100 overflow-hidden flex items-center justify-center p-2 sm:p-4">
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title={title}
          className="w-full h-full max-w-4xl bg-white rounded-2xl shadow-xl border-0"
          sandbox="allow-scripts allow-modals"
        />
      </div>
    </div>,
    document.body
  );
};

export default PdfPreviewModal;
