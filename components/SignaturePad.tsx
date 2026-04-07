import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel, title = "Assinatura do Cliente", subtitle = "Use o dedo ou uma caneta touch para assinar" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Set line style
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0066CC'; // Azul Forte Engenharia
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

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setIsEmpty(false);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsEmpty(true);
    }
  };

  const handleConfirm = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    if (canvas) {
      // Create a temporary canvas to add white background if needed, 
      // but let's keep it transparent as it's better for PDFs.
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[11000] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>
          </div>
          <button 
            onClick={onCancel}
            className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-all active:scale-90"
          >
            <X size={28} />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 min-h-[300px] bg-white relative touch-none">
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
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="border-b-2 border-slate-300 w-2/3 flex items-center justify-center pb-4">
                <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Assine aqui</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button
            onClick={clearCanvas}
            className="flex-1 h-14 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Eraser size={18} /> Limpar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isEmpty}
            className={`flex-[2] h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${isEmpty ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-emerald-100'}`}
          >
            <CheckCircle size={18} /> Confirmar Assinatura
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SignaturePad;
