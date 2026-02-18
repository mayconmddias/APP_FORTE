
import { GoogleGenAI } from "@google/genai";
import { MaintenanceRecord, CraneAsset } from './types';

export const analyzeMaintenanceHistory = async (asset: CraneAsset, history: MaintenanceRecord[]) => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const prompt = `
    Analise o histórico de manutenção da ponte rolante abaixo e forneça:
    1. Uma breve avaliação da confiabilidade operacional.
    2. Sugestões de melhoria focadas em segurança (NR-11/NR-12).
    3. Predição de possíveis falhas baseado no histórico de corretivas.

    Dados do Equipamento:
    Nome: ${asset.name}
    Capacidade: ${asset.capacity}
    Vão: ${asset.span}
    Fabricante: ${asset.manufacturer}

    Histórico Recente:
    ${JSON.stringify(history.map(h => ({
    tipo: h.type,
    data: h.date,
    causa: h.cause,
    acao: h.actionTaken,
    criticidade: h.criticality
  })))}

    Responda em Português de forma profissional e técnica.
  `;

  try {
    // Using gemini-3-pro-preview for technical engineering analysis and safety standard reasoning
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Não foi possível realizar a análise no momento.";
  }
};
