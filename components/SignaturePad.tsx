import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onCancel,
  title = 'Assinatura do Cliente',
  subtitle = 'Use o dedo ou uma caneta touch para assinar'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#004a88';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineTo(x, y); ctx.stroke(); setIsEmpty(false); }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); setIsEmpty(true); }
  };

  const handleConfirm = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL('image/png'));
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[11000] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="w-8" />
          <div className="text-center flex-1">
            <h3 className="font-headline font-bold text-lg text-blue-950 uppercase tracking-widest">{title}</h3>
            <p className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '22px' }}>close</span>
          </button>
        </div>

        {/* Canvas */}
        <div className="relative bg-white touch-none" style={{ minHeight: 280 }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair"
            style={{ display: 'block', minHeight: 280 }}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-2 opacity-20">
                <span className="material-symbols-outlined text-slate-400 select-none notranslate" style={{ fontSize: '40px' }}>draw</span>
                <span className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assine aqui</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-background border-t border-slate-100 flex gap-3">
          <button
            onClick={clearCanvas}
            className="flex-1 h-12 bg-white border-2 border-slate-200 text-slate-500 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>ink_eraser</span>
            Limpar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isEmpty}
            className={`flex-[2] h-12 rounded-full font-headline font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isEmpty ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#004a88] text-white shadow-lg shadow-blue-900/20'
            }`}
          >
            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>task_alt</span>
            Confirmar Assinatura
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SignaturePad;
