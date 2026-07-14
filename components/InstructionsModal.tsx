import React from 'react';
import { createPortal } from 'react-dom';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 text-left relative flex flex-col max-h-[90vh] overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        {/* Botão Fechar no canto superior direito */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
        >
          <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px' }}>close</span>
        </button>

        {/* Cabeçalho */}
        <div className="border-b border-slate-100 pb-4 mb-4 pr-10">
          <h2 className="font-headline font-bold text-lg text-blue-950 uppercase tracking-widest">INSTRUÇÕES</h2>
          <p className="text-[10px] font-bold text-[#004a88] uppercase tracking-widest mt-0.5">Guia de Utilização do App</p>
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-5 font-body text-[12px] text-slate-600 leading-relaxed uppercase">
          <div>
            <h3 className="font-headline font-bold text-sm text-blue-950 mb-1">APP FORTE PRO 4.0</h3>
            <p className="font-bold text-slate-400">MENUS EXCLUSIVOS PARA INSPEÇÕES PREVENTIVAS E CORRETIVAS DE EQUIPAMENTOS DE ELEVAÇÃO (PONTE, TALHA, ELEVADOR DE CARGA, ENCAIXOTADORA, DESENCAIXOTADORA, PÓRTICO, ETC.)</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-500 font-bold text-[11px] tracking-wide">
              <li>CLIENTES</li>
              <li>HISTÓRICO</li>
              <li>ORDENS EM ABERTO</li>
              <li>SINCRONIZAÇÃO</li>
            </ul>
          </div>

          <hr className="border-slate-100" />

          <div>
            <p className="font-bold text-slate-400">MENU DEDICADO PARA GERAR RELATÓRIOS DIARIAMENTE DOS SERVIÇOS DENTRO DESSE MENU.</p>
            <h4 className="font-headline font-bold text-[13px] text-blue-950 mt-2 mb-1">RELATÓRIOS DIÁRIOS</h4>
            <p className="text-slate-500 font-bold">CLICK NOVO RELATÓRIO E SELECIONE:</p>
            <p className="text-[#004a88] font-bold mt-0.5">- CLIENTE JÁ CADASTRADO OU NOVO CLIENTE.</p>
          </div>

          <hr className="border-slate-100" />

          <div>
            <h4 className="font-headline font-bold text-[13px] text-blue-950 mb-3">PREENCHIMENTO DO RELATÓRIO DIÁRIO (EXEMPLO)</h4>
            
            <div className="bg-[#eef2f7] rounded-2xl p-4 space-y-3 border border-slate-100">
              <div>
                <p className="font-bold text-blue-950 text-[10px] tracking-wider">DESCRIÇÃO DO SERVIÇO</p>
                <p className="text-slate-500 font-bold mt-0.5">- MONTAGEM DE EXAUSTOR</p>
              </div>

              <div>
                <p className="font-bold text-blue-950 text-[10px] tracking-wider">ATIVIDADES REALIZADAS</p>
                <ul className="text-slate-500 font-bold space-y-0.5 mt-0.5 text-[11px]">
                  <li>- MOVIMENTAÇÃO DAS FERRAMENTAS E MATERIAIS PARA O LOCAL</li>
                  <li>- ISOLAMENTO DA ÁREA</li>
                  <li>- MOVIMENTAÇÃO DA PLATAFORMA</li>
                  <li>- IÇAMENTO DO EXAUSTOR</li>
                </ul>
              </div>

              <div>
                <p className="font-bold text-blue-950 text-[10px] tracking-wider">REGISTRO FOTOGRÁFICO</p>
                <p className="text-slate-500 font-bold mt-0.5">- ANEXAR AS FOTOS</p>
              </div>
            </div>
            
            <p className="font-bold text-[#004a88] mt-3">CLICK EM FINALIZAR REGISTRO</p>
            
            <div className="mt-3 space-y-2">
              <p className="font-bold text-slate-400">NA TELA DE RELATÓRIOS DIÁRIOS:</p>
              <p className="text-slate-500 font-bold"><span className="font-bold text-blue-950">NOVO CLIENTE:</span> PROCURE O CLIENTE QUE FOI CADASTRADO, CLICK NO CLIENTE E MOSTRARÁ O RELATÓRIO QUE FOI CRIADO.</p>
              <p className="text-slate-500 font-bold"><span className="font-bold text-blue-950">CLIENTE EXISTENTE:</span> PROCURE O CLIENTE, CLICK NO CLIENTE E MOSTRARÁ ULTIMOS RELATÓRIOS E O NOVO RELATÓRIO QUE FOI CRIADO.</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InstructionsModal;
