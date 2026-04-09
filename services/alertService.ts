
import { supabase } from '../supabaseClient';
import { Documento, Funcionario } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

export interface AlertItem {
  funcionarioNome: string;
  documentoTipo: string;
  diasParaVencer: number;
  status: 'ALERTA' | 'CRITICO';
}

export const alertService = {
  async getGlobalAlerts() {
    try {
      // Buscar todos os documentos que têm data de vencimento
      const { data: docs, error: docError } = await supabase
        .from('documentos')
        .select(`
          id,
          tipo_documento,
          data_vencimento,
          funcionario_id,
          funcionarios!inner (
            nome
          )
        `)
        .not('data_vencimento', 'is', null);

      if (docError) throw docError;

      const alerts: AlertItem[] = [];
      const today = new Date();

      docs?.forEach((doc: any) => {
        const expiryDate = parseISO(doc.data_vencimento);
        const days = differenceInDays(expiryDate, today);

        if (days <= 40) {
          alerts.push({
            funcionarioNome: doc.funcionarios.nome,
            documentoTipo: doc.tipo_documento,
            diasParaVencer: days,
            status: days <= 30 ? 'CRITICO' : 'ALERTA'
          });
        }
      });

      // Ordenar por gravidade e dias
      return alerts.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'CRITICO' ? -1 : 1;
        return a.diasParaVencer - b.diasParaVencer;
      });
    } catch (error) {
      console.error('Erro no alertService:', error);
      return [];
    }
  }
};
