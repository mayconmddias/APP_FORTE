
import { supabase } from '../supabaseClient';
import { Documento, Funcionario } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

export interface AlertItem {
  funcionarioNome: string;
  documentoTipo: string;
  diasParaVencer: number;
  status: 'ALERTA' | 'CRITICO';
}

// Evento customizado para notificar mudanças nos documentos
export const DOCS_CHANGED_EVENT = 'docs-changed';

export const alertService = {
  notifyChange() {
    window.dispatchEvent(new CustomEvent(DOCS_CHANGED_EVENT));
  },

  async getGlobalAlerts() {
    try {
      // Buscar todos os documentos que têm data de vencimento
      const { data: docs, error: docError } = await supabase
        .from('documentos')
        .select('id, tipo_documento, data_vencimento, funcionario_id')
        .not('data_vencimento', 'is', null);

      if (docError) throw docError;
      if (!docs || docs.length === 0) return [];

      const funcIds = [...new Set(docs.map(d => d.funcionario_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name')
        .in('id', funcIds);

      const nameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      const alerts: AlertItem[] = [];
      const today = new Date();

      docs.forEach((doc: any) => {
        const expiryDate = parseISO(doc.data_vencimento);
        const days = differenceInDays(expiryDate, today);

        // Apenas conta documentos que vencem em 40 dias ou já venceram (dias <= 0)
        if (days <= 40) {
          alerts.push({
            funcionarioNome: nameMap.get(doc.funcionario_id) || 'Funcionário',
            documentoTipo: doc.tipo_documento,
            diasParaVencer: days,
            status: days <= 0 ? 'CRITICO' : 'ALERTA'
          });
        }
      });

      return alerts;
    } catch (error) {
      console.error('Erro no alertService:', error);
      return [];
    }
  }
};
