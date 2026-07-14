
import {
  CraneAsset,
  AssetStatus,
  MaintenanceRecord,
  MaintenanceType,
  ChecklistItem,
  Frequency
} from './types';

export const INITIAL_ASSETS: CraneAsset[] = [
  {
    id: '1',
    client: 'Metalúrgica Gerdau',
    name: 'Ponte Rolante Galpão A',
    serialNumber: 'PR-2023-001',
    manufacturer: 'Demag',
    capacity: '10 Ton',
    span: '22m',
    location: 'Setor de Fundição',
    commissioningDate: '2023-01-15',
    status: AssetStatus.OPERATIONAL,
    equipmentType: 'Ponte'
  }
];

export const INITIAL_HISTORY: MaintenanceRecord[] = [
  {
    id: 'h1',
    inspectionNumber: 1,
    assetId: '1',
    type: MaintenanceType.PREVENTIVE,
    checklistType: 'PONTE_PRINCIPAL',
    frequency: Frequency.MENSAL,
    date: '2024-03-01',
    technician: 'Carlos Silva',
    technicianId: 'FE-002',
    downtimeHours: 4,
    checklists: [
      { id: 'c1', category: 'MECÂNICO', label: 'Cabo de Aço', isOk: true, observation: 'Lubrificado' },
      { id: 'c2', category: 'SEGURANÇA', label: 'Botoeira de Emergência', isOk: true, observation: 'Testada com sucesso' }
    ]
  }
];

export const NORMS = [
  'NR-11 - Transporte e Movimentação',
  'NR-12 - Segurança em Máquinas',
  'ABNT NBR 8400 - Cálculo de Içamento',
  'ABNT ISO 4309 - Cabos de Aço'
];

export const REPORT_NORMS = `
NORMAS
Todas as ações efetuadas neste trabalho estiveram respaldadas por normas técnicas e/ou prática de Engenharia comumente aceita;
Normas Brasileiras – NBR
NBR 5410/2004 Instalações elétricas em Baixa tensão;
NBR 16147/2013 – Equipamentos de elevação e movimentação de cargas;
NR10 – Segurança em serviços de eletricidade;
`;

export const REPORT_ATTESTATION = `
ATESTADO / COMENTÁRIO GERAL
Atestamos para os devidos fins, que todas as informações contidas neste relatório técnico, de Inspeção visual, e medição dos equipamentos da Contratante, são verdadeiras e são de inteira responsabilidade da empresa Forte Engenharia. Desde que não surjam informações adicionais, após a sua entrega, informações, essas que não sejam de autoria ou tenham a autorização e/ou o conhecimento expresso do nosso departamento de Engenharia.
`;


export const CHECKLIST_PONTE: Omit<ChecklistItem, 'id' | 'isOk' | 'observation'>[] = [
  { category: 'ELÉTRICO', label: 'TENSÃO DE ENTRADA DO EQUIPAMENTO', instruction: 'MEDIÇÃO: REALIZAR MEDIÇÃO COM MULTÍMETRO.' },
  { category: 'ELÉTRICO', label: 'TENSÃO DE COMANDO', instruction: 'MEDIÇÃO: REALIZAR MEDIÇÃO COM MULTÍMETRO.' },
  { category: 'SEGURANÇA', label: 'IDENTIFICAÇÃO DO EQUIPAMENTO', instruction: 'VISUAL/LIMPEZA: VERIFICAR SE EXISTE TODAS A INFORMAÇÕES LEGIVEIS E EFETUAR A LIMPEZA DAS PLACAS.' },
  { category: 'SEGURANÇA', label: 'IDENTIFICAÇÃO DE CAPACIDADE DE ELEVAÇÃO', instruction: 'VISUAL/LIMPEZA: VERIFICAR SE EXISTE TODAS A INFORMAÇÕES LEGIVEIS E EFETUAR A LIMPEZA DAS PLACAS.' },
  { category: 'SEGURANÇA', label: 'OPERADORES SÃO CAPACITADOS PARA OPERAÇÃO DO EQUIPAMENTO', instruction: 'INSPEÇÃO VISUAL: TODOS OS OPERADORES SÃO CAPACITADOS E ESTÃO COM OS TREINAMENTO EM DIA?' },
  { category: 'SEGURANÇA', label: 'ACESSO PARA MANUTENÇÃO DO EQUIPAMENTO', instruction: 'INSPEÇÃO VISUAL: ACESSOS AO EQUIPAMENTO, É VIA PLATAFORMA OU ESCADA, ESTÃO CONFORME NORMA?' },
  { category: 'SEGURANÇA', label: 'BLOQUEIO DO EQUIPAMENTO PARA MANUTENÇÃO', instruction: 'EFETUAR BLOQUEIO: REALIZAR O BLOQUEIO E ISOLAMENTO DA ÁREA.' },
  { category: 'ELÉTRICO', label: 'ACIONAMENTO COMANDO ELEVAÇÃO', instruction: 'TESTE FUNCIONAL: APERTAR BOTÃO SOBE E DESCE E VERIFICAR SE O EQUIPAMENTO ESTÁ CORRESPONDENDO AO COMANDO.' },
  { category: 'ELÉTRICO', label: 'ACIONAMENTO COMANDO DIREÇÃO', instruction: 'TESTE FUNCIONAL: APERTAR BOTÃO DIREITA E ESQUERDA E VERIFICAR SE O EQUIPAMENTO ESTÁ CORRESPONDENDO AO COMANDO.' },
  { category: 'ELÉTRICO', label: 'ACIONAMENTO COMANDO TRANSLAÇÃO', instruction: 'TESTE FUNCIONAL: APERTAR BOTÃO FRENTE E ATRÁS E VERIFICAR SE O EQUIPAMENTO ESTÁ CORRESPONDENDO AO COMANDO.' },
  { category: 'ELÉTRICO', label: 'PAINEL ELÉTRICO ORGANIZADO E EM BOAS CONDIÇÕES', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'ELÉTRICO', label: 'IDENTIFICAÇÃO DO PAINEL ELÉTRICO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO TRANSLAÇÃO RÁPIDA - FRENTE', instruction: 'TESTE FUNCIONAL: MOVIMENTAR PARA FRENTE O EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO TRANSLAÇÃO LENTA - FRENTE', instruction: 'TESTE FUNCIONAL: MOVIMENTAR PARA FRENTE O EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO TRANSLAÇÃO RÁPIDA - ATRÁS', instruction: 'TESTE FUNCIONAL: MOVIMENTAR PARA ATRÁS O EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO TRANSLAÇÃO LENTA - ATRÁS', instruction: 'TESTE FUNCIONAL: MOVIMENTAR PARA ATRÁS O EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'MECÂNICO', label: 'VEDAÇÃO DOS REDUTORES DE TRANSLAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE VAZAMENTO DE ÓLEO.' },
  { category: 'MECÂNICO', label: 'AUSÊNCIA DE RUIDO NO REDUTOR DE TRANSLAÇÃO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'NIVEL DO ÓLEO DO REDUTOR DE TRANSLAÇÃO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'RODA MOTRIZ PONTE', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTES, MEDIR CANAL E ABA DAS RODAS.' },
  { category: 'MECÂNICO', label: 'RODA LIVRE PONTE', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTES, MEDIR CANAL E ABA DAS RODAS.' },
  { category: 'MECÂNICO', label: 'MANCAL DA RODA', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE FOLGA EM EIXO E PINHÃO.' },
  { category: 'ELÉTRICO', label: 'MOTOR DE TRANSLAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR CONECTORES, EMENDAS E SINAIS DE AQUECIMENTO.' },
  { category: 'MECÂNICO', label: 'ESTRUTURA DO EQUIPAMENTO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE PONTOS DE CORROSÃO OU PONTOS DE SOLDA DANIFICADA.' },
  { category: 'ELÉTRICO', label: 'LINHA DE PORTA CABOS CHATO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE OS CARRINHOS ESTÃO CONFORME, SE OS CABOS NÃO TEM EMENDAS E SINAIS DE AQUECIMENTO.' },
  { category: 'ELÉTRICO', label: 'INSPEÇÃO VISUAL E FUNCIONAL DE BOTOEIRA E CONTROLE REMOTO', instruction: 'TESTE FUNCIONAL: ACIONAMENTO DE TODOS OS COMANDOS E LIMPEZA.' },
  { category: 'MECÂNICO', label: 'LUBRIFICAÇÃO DE PINHÃO E ENGRENAGENS DE RODAS', instruction: 'REALIZAR LUBRIFICAÇÃO.' },
  { category: 'MECÂNICO', label: 'AJUSTE DOS FREIOS DE TRANSLAÇÃO', instruction: 'MEDIÇÃO DA REGULAGEM E AJUSTE: REALIZAR AJUSTE E MEDIR AS DISTÂNCIAS DE REGULAGEM.' },
  { category: 'MECÂNICO', label: 'FREIO DE TRANSLAÇÃO ESTÁ EM BOM ESTADO DE FUNCIONAMENTO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA MOTOR TRANSLAÇÃO (ANOTAR)', instruction: 'MEDIÇÃO: REALIZAR MEDIÇÃO COM AMPERÍMETRO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA FREIO DE TRASLAÇÃO (ANOTAR)', instruction: 'MEDIÇÃO: REALIZAR MEDIÇÃO COM AMPERÍMETRO.' },
  { category: 'SEGURANÇA', label: 'FIM DE CURSO ANTI - COLISÃO', instruction: 'TESTE FUNCIONAL: MOVIMENTAR O EQUIPAMENTO ATÉ SE APROXIMAR A OUTRO EXISTENTE, ATÉ O MESMO SER ACIONADO, REALIZAR O AJUSTE DE DISTÂNCIA SE NECESSÁRIO.' },
  { category: 'MECÂNICO', label: 'RODA MOTRIZ - CARRO', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTES, MEDIR CANAL E ABA DAS RODAS.' },
  { category: 'MECÂNICO', label: 'RODA LIVRE - CARRO', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTES, MEDIR CANAL E ABA DAS RODAS.' },
  { category: 'MECÂNICO', label: 'PINHÃO DA RODA', instruction: 'INSPEÇÃO VISUAL: VERIFICAR FOLGA DO PINHÃO.' },
  { category: 'MECÂNICO', label: 'VEDAÇÃO DO REDUTOR DE DIREÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE VAZAMENTO DE ÓLEO.' },
  { category: 'MECÂNICO', label: 'AUSÊNCIA DE RUIDO DO REDUTOR DE DIREÇÃO', instruction: 'INSPEÇÃO FUNCIONAL: ACIONAR REDUTORES E VERIFICAR RUÍDOS.' },
  { category: 'MECÂNICO', label: 'NIVEL DO OLEO DO REDUTOR DE DIREÇÃO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'ELÉTRICO', label: 'MOTOR DE DIREÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR CONECTORES, EMENDAS E SINAIS DE AQUECIMENTO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA MOTOR DIREÇÃO (ANOTAR)', instruction: 'MEDIÇÃO: REALIZAR MEDIÇÃO COM AMPERÍMETRO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA FREIO DE DIREÇÃO (ANOTAR)', instruction: 'MEDIÇÃO: REALIZA MEDIÇÃO COM AMPERÍMETRO.' },
  { category: 'MECÂNICO', label: 'AJUSTE DE FREIO DE DIREÇÃO', instruction: 'MEDIÇÃO DA REGULAGEM E AJUSTE.' },
  { category: 'MECÂNICO', label: 'FREIO DE DIREÇÃO ESTÁ EM BOM ESTADO DE FUNCIONAMENTO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO RAPIDA - DIREITA', instruction: 'TESTE FUNCIONAL: MOVIMENTAR O EQUIPAMENTO PARA DIREITA ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO LENTA - DIREITA', instruction: 'TESTE FUNCIONAL: MOVIMENTAR O EQUIPAMENTO PARA DIREITA ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO RAPIDA - ESQUERDA', instruction: 'TESTE FUNCIONAL: MOVIMENTAR O EQUIPAMENTO PARA ESQUERDA ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO LENTA - ESQUERDA', instruction: 'TESTE FUNCIONAL: MOVIMENTAR O EQUIPAMENTO PARA ESQUERDA ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'MECÂNICO', label: 'VEDAÇÃO DO REDUTOR DE ELEVAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE VAZAMENTO DE ÓLEO.' },
  { category: 'MECÂNICO', label: 'AUSÊNCIA DE RUIDO DO REDUTOR DE ELEVAÇÃO', instruction: 'INSPEÇÃO FUNCIONAL: ACIONAR REDUTORES E VERIFICAR RUÍDOS.' },
  { category: 'MECÂNICO', label: 'NIVEL DO OLEO DO REDUTOR DE ELEVAÇÃO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'ELÉTRICO', label: 'MOTOR DE ELEVAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR CONECTORES, EMENDAS E SINAIS DE AQUECIMENTO.' },
  { category: 'MECÂNICO', label: 'AJUSTE DE FREIO DE ELEVAÇÃO', instruction: 'MEDIÇÃO DA REGULAGEM E AJUSTE: REALIZAR AJUSTE E MEDIR AS DISTÂNCIAS DE REGULAGEM.' },
  { category: 'MECÂNICO', label: 'FREIO DE ELEVAÇÃO ESTÁ EM BOM ESTADO DE FUNCIONAMENTO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA MOTOR ELEVAÇÃO PRINCIPAL (ANOTAR)', instruction: 'MEDIÇÃO: REALIZAR MEDIÇÃO COM AMPERÍMETRO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA FREIO ELEVAÇÃO PRINCIPAL (ANOTAR)', instruction: 'MEDIÇÃO: REALIZAR MEDIÇÃO COM AMPERÍMETRO.' },
  { category: 'MECÂNICO', label: 'CABO DE AÇO - VER MEDIDA', instruction: 'MEDIÇÃO E INSPEÇÃO VISUAL: MEDIR A BITOLA DO CABO E VERIFICA POSSÍVEL PONTO DE RUPTURA. O CABO NÃO PODE TER MAIS QUE 2% DE DESGASTE.' },
  { category: 'MECÂNICO', label: 'CLIP´S CABO DE AÇO', instruction: 'INSPEÇÃO VISUAL E REAPERTO: REALIZAR REAPERTO E VERIFICAR SE NÃO TEM PONTO DE CORROSÃO OU ROSCA DANIFICADA.' },
  { category: 'MECÂNICO', label: 'RANHURAS DO TAMBOR DENTRO DA MEDIDA', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'ANEL DE GUIA', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'ROLDANA DE DESVIO', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTES, MEDIR CANAL E ABA.' },
  { category: 'MECÂNICO', label: 'CAIXA DE GANCHO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE NÃO TEM TAMPA QUEBRADA, SE ESTÁ OK A TRAVA.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO - SOBE', instruction: 'INSPEÇÃO TÉCNICA: VERIFICAR ACIONAMENTO DO SENSOR.' },
  { category: 'ELÉTRICO', label: 'SOBRE CURSO - SOBE', instruction: 'INSPEÇÃO TÉCNICA: VERIFICAR ACIONAMENTO DO SENSOR.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO - DESCE', instruction: 'INSPEÇÃO TÉCNICA: VERIFICAR ACIONAMENTO DO SENSOR.' },
  { category: 'SEGURANÇA', label: 'SENSOR ANTI COLISÃO CARRO', instruction: 'INSPEÇÃO TÉCNICA: TESTE FUNCIONAL DE PROXIMIDADE.' },
  { category: 'SEGURANÇA', label: 'CÉLULA DE CARGA CALIBRADA E ATUANDO', instruction: 'MEDIÇÃO: TESTE COM CARGA.' },
  { category: 'ELÉTRICO', label: 'CARRO COLETOR', instruction: 'INSPEÇÃO VISUAL: VERIFICAR CONTATOS.' },
  { category: 'ELÉTRICO', label: 'ESCOVAS DO CARRO COLETOR', instruction: 'INSPEÇÃO VISUAL: VERIFICAR DESGASTES DAS ESCOVAS.' },
  { category: 'ELÉTRICO', label: 'BARRAMENTO DE ALIMENTAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR ALINHAMENTO E LIMPEZA.' },
  { category: 'ELÉTRICO', label: 'LIMPEZA COMPLETA DO PAINEL E COMPONENTES ELÉTRICOS', instruction: 'EXECUÇÃO: LIMPEZA DE TODOS OS COMPONENTES E REAPERTO.' },
  { category: 'ELÉTRICO', label: 'CABOS E TERMINAIS', instruction: 'REAPERTO / VISUAL.' },
  { category: 'ELÉTRICO', label: 'MOTOR', instruction: 'REALIZAR MEDIÇÃO: MEDIR RESISTÊNCIA ÔHMICA.' },
  { category: 'ELÉTRICO', label: 'CARRO COLETOR', instruction: 'VISUAL: VERIFICAR DESGASTES E REALIZAR LIMPEZA.' },
  { category: 'ELÉTRICO', label: 'LINHA FESTONN OU ESTEIRA PORTA CABOS', instruction: 'REALIZAR LIMPEZA DOS TRILHOS E LIMPEZA DAS CALHAS.' },
  { category: 'MECÂNICO', label: 'ANEL DE GUIA', instruction: 'VISUAL E REAPERTO: VERIFICAR FOLGA, REALIZAR REAPERTO E LUBRIFICAÇÃO.' },
  { category: 'MECÂNICO', label: 'LUBRIFICAÇÃO DE CABO DE AÇO', instruction: 'REALIZAR LUBRIFICAÇÃO.' },
  { category: 'ELÉTRICO', label: 'CARRO COLETOR', instruction: 'VISUAL: VERIFICAR DESGASTES E REALIZAR LIMPEZA, TROCA DAS ESCOVAS.' },
  { category: 'ELÉTRICO', label: 'ESTEIRA PORTA CABOS', instruction: 'REALIZAR LIMPEZA DOS TRILHOS E LIMPEZA DAS CALHAS.' },
  { category: 'MECÂNICO', label: 'ANEL DE GUIA', instruction: 'VISUAL E REAPERTO: VERIFICAR FOLGA, REALIZAR REAPERTO E LUBRIFICAÇÃO.' },
  { category: 'MECÂNICO', label: 'CABO DE AÇO', instruction: 'SUBSTITUIÇÃO DO CABO DE AÇO, CLIPS DE FIXAÇÃO E LUBRIFICAÇÃO DO NOVO CABO.' },
  { category: 'MECÂNICO', label: 'TAMBOR', instruction: 'VERIFICAR MEDIDAS DO CANAL, REALIZAR LIMPEZA e REMOÇÃO DE GRAXA EM EXCESSO.' },
  { category: 'ELÉTRICO', label: 'LIMPEZA COMPLETA DO PAINEL E COMPONENTES ELÉTRICOS', instruction: 'EXECUÇÃO: LIMPEZA DE TODOS OS COMPONENTES E REAPERTO.' },
  { category: 'ELÉTRICO', label: 'CABOS E TERMINAIS', instruction: 'REAPERTO / VISUAL.' },
  { category: 'MECÂNICO', label: 'ESTRUTURA DO EQUIPAMENTO E CAMINHO DE ROLAMENTO', instruction: 'TORQUEAMENTO DE TODOS OS PARAFUSOS E MARCAÇÃO CHECK, LIMPEZA DO CAMINHO DE ROLAMENTO, VERIFICAÇÃO DE MEDIDA DO VÃO.' },
  { category: 'MECÂNICO', label: 'PARAFUSOS', instruction: 'REALIZAR MARCAÇÃO APÓS TORQUE.' },
  { category: 'ELÉTRICO', label: 'BARRAMENTOS DE ALIMENTAÇÃO', instruction: 'LIMPEZA, ALINHAMENTO E REAPERTO.' },
  { category: 'MECÂNICO', label: 'DISCO DE FREIO', instruction: 'EFETUAR A TROCA.' },
  { category: 'MECÂNICO', label: 'CAIXA DE GANCHO', instruction: 'REALIZAR TESTE COM LIQUIDO PENETRANTE.' }
];

// --- ITENS DE VERIFICAÇÃO REUTILIZÁVEIS ---
type CItem = Omit<ChecklistItem, 'id' | 'isOk' | 'observation'>;

const I_TENSAO_ENTRADA: CItem = { category: 'ELÉTRICO', label: 'TENSÃO DE ENTRADA DO EQUIPAMENTO', instruction: 'MEDIÇÃO: REALIZAR MEDIÇÃO COM MULTÍMETRO.' };
const I_TENSAO_COMANDO: CItem = { category: 'ELÉTRICO', label: 'TENSÃO DE COMANDO', instruction: 'MEDIÇÃO: REALIZAR MEDIÇÃO COM MULTÍMETRO.' };
const I_IDENT_EQUIP: CItem = { category: 'SEGURANÇA', label: 'IDENTIFICAÇÃO DO EQUIPAMENTO', instruction: 'INSPEÇÃO VISUAL.' };
const I_IDENT_CAPACIDADE: CItem = { category: 'SEGURANÇA', label: 'IDENTIFICAÇÃO DE CAPACIDADE DE ELEVAÇÃO', instruction: 'INSPEÇÃO VISUAL.' };
const I_OPER_CAPACITADOS: CItem = { category: 'SEGURANÇA', label: 'OPERADORES SÃO CAPACITADOS PARA OPERAÇÃO DO EQUIPAMENTO', instruction: 'VERIFICAÇÃO VISUAL.' };
const I_ACESSO_MANUT: CItem = { category: 'SEGURANÇA', label: 'ACESSO PARA MANUTENÇÃO DO EQUIPAMENTO', instruction: 'VERIFICAÇÃO VISUAL.' };
const I_BLOQUEIO_MANUT: CItem = { category: 'SEGURANÇA', label: 'BLOQUEIO DO EQUIPAMENTO PARA MANUTENÇÃO', instruction: 'TESTE/BLOQUEIO.' };
const I_ACION_ELEV: CItem = { category: 'ELÉTRICO', label: 'ACIONAMENTO COMANDO ELEVAÇÃO', instruction: 'TESTE FUNCIONAL.' };
const I_ESTRUTURA: CItem = { category: 'MECÂNICO', label: 'ESTRUTURA DO EQUIPAMENTO', instruction: 'INSPEÇÃO VISUAL.' };
const I_ALIMENT_EL_TALHA: CItem = { category: 'ELÉTRICO', label: 'ALIMENTAÇÃO ELÉTRICA DA TALHA', instruction: 'INSPEÇÃO VISUAL.' };
const I_LIMP_REAPERTO_PAINEL: CItem = { category: 'ELÉTRICO', label: 'LIMPEZA E REAPERTO DO PAINEL ELÉTRICO', instruction: 'LIMPEZA E MANUTENÇÃO.' };
const I_BOTOEIRA_ACION: CItem = { category: 'ELÉTRICO', label: 'BOTOEIRA DE ACIONAMENTO', instruction: 'TESTE FUNCIONAL.' };
const I_LUB_CORRENTE: CItem = { category: 'MECÂNICO', label: 'LUBRIFICAÇÃO DO CORRENTE', instruction: 'APLICAR LUBRIFICANTE.' };
const I_VED_RED_ELEV: CItem = { category: 'MECÂNICO', label: 'VEDAÇÃO DO REDUTOR DE ELEVAÇÃO', instruction: 'VERIFICAR SE HÁ VAZAMENTOS.' };
const I_RUIDO_RED_ELEV: CItem = { category: 'MECÂNICO', label: 'RUIDO DO REDUTOR DE ELEVAÇÃO', instruction: 'INSPEÇÃO AUDITIVA.' };
const I_MOTOR_ELEV: CItem = { category: 'ELÉTRICO', label: 'MOTOR DE ELEVAÇÃO', instruction: 'INSPEÇÃO VISUAL AND FUNCIONAL.' };
const I_FREIO_ELEV: CItem = { category: 'MECÂNICO', label: 'FREIO DE ELEVAÇÃO', instruction: 'VERIFICAR DESGASTE E DESLOCAMENTO.' };
const I_AJUST_FREIO_ELEV: CItem = { category: 'MECÂNICO', label: 'AJUSTE DE FREIO DE ELEVAÇÃO', instruction: 'VERIFICAR E REGULAR.' };
const I_CORR_EL_MOT_ELEV: CItem = { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA MOTOR ELEVAÇÃO PRINCIPAL', instruction: 'MEDIÇÃO COM ALICATE AMPERÍMETRO.' };
const I_CORR_EL_FR_ELEV: CItem = { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA FREIO ELEVAÇÃO PRINCIPAL', instruction: 'MEDIÇÃO COM ALICATE AMPERÍMETRO.' };
const I_FIX_CORRENTE: CItem = { category: 'MECÂNICO', label: 'FIXAÇÃO DA CORRENTE', instruction: 'INSPEÇÃO VISUAL.' };
const I_CAIXA_GANCHO: CItem = { category: 'MECÂNICO', label: 'CAIXA DE GANCHO', instruction: 'VERIFICAR GARGAL E DEFORMAÇÃO.' };
const I_SIST_FIX_GANCHO: CItem = { category: 'MECÂNICO', label: 'SISTEMA DE FIXAÇÃO DO GANCHO', instruction: 'INSPEÇÃO VISUAL.' };
const I_FC_SOBE: CItem = { category: 'ELÉTRICO', label: 'FIM DE CURSO - SOBE', instruction: 'TESTE FUNCIONAL.' };
const I_SC_SOBE: CItem = { category: 'ELÉTRICO', label: 'SOBRE CURSO - SOBE', instruction: 'TESTE FUNCIONAL.' };
const I_FC_DESCE: CItem = { category: 'ELÉTRICO', label: 'FIM DE CURSO - DESCE', instruction: 'TESTE FUNCIONAL.' };
const I_TESTE_CARGA: CItem = { category: 'SEGURANÇA', label: 'TESTE COM CARGA', instruction: 'TESTE DINÂMICO E ESTÁTICO.' };
const I_BOLSA_CORRENTE: CItem = { category: 'MECÂNICO', label: 'BOLSA DA CORRENTE', instruction: 'INSPEÇÃO VISUAL.' };
const I_SIST_GIRO_GUIND: CItem = { category: 'MECÂNICO', label: 'SISTEMA DE GIRO DO GUINDASTE', instruction: 'INSPEÇÃO VISUAL.' };
const I_FIX_GUIND_PISO: CItem = { category: 'MECÂNICO', label: 'FIXAÇÃO DO GUINDASTE NO PISO', instruction: 'INSPEÇÃO VISUAL E REAPERTO.' };

// --- LISTAS DE CHECKLIST ---

export const CHECKLIST_TALHA: Omit<ChecklistItem, 'id' | 'isOk' | 'observation'>[] = [
  I_TENSAO_ENTRADA,
  I_TENSAO_COMANDO,
  I_IDENT_EQUIP,
  I_IDENT_CAPACIDADE,
  I_OPER_CAPACITADOS,
  I_ACESSO_MANUT,
  I_BLOQUEIO_MANUT,
  I_ACION_ELEV,
  { category: 'ELÉTRICO', label: 'ACIONAMENTO COMANDO DIREÇÃO', instruction: 'TESTE FUNCIONAL.' },
  I_ESTRUTURA,
  { category: 'ELÉTRICO', label: 'BARRAMENTO DE ALIMENTAÇÃO - ALINHAMENTO / FIXAÇÃO', instruction: 'INSPEÇÃO VISUAL E REAPERTO.' },
  { category: 'ELÉTRICO', label: 'LINHA DE PORTA CABOS CHATO', instruction: 'INSPEÇÃO VISUAL.' },
  I_LIMP_REAPERTO_PAINEL,
  { category: 'ELÉTRICO', label: 'INSPEÇÃO VISUAL E FUNCIONAL DE BOTOEIRA E CONTROLE REMÓTO', instruction: 'TESTE FUNCIONAL.' },
  { category: 'MECÂNICO', label: 'LUBRIFICAÇÃO DE PINHÃO E ENGRENAGENS DE RODAS', instruction: 'APLICAR LUBRIFICANTE.' },
  { category: 'MECÂNICO', label: 'LUBRIFICAÇÃO DO CABO DE AÇO', instruction: 'APLICAR LUBRIFICANTE.' },
  { category: 'MECÂNICO', label: 'AJUSTE DOS FREIOS DE TRANSLAÇÃO', instruction: 'VERIFICAR E AJUSTAR.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA MOTOR TRANSLAÇÃO', instruction: 'MEDIÇÃO COM ALICATE AMPERÍMETRO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA FREIO DE TRASLAÇÃO', instruction: 'MEDIÇÃO COM ALICATE AMPERÍMETRO.' },
  { category: 'MECÂNICO', label: 'RODA MOTRIZ - CARRO', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO.' },
  { category: 'MECÂNICO', label: 'RODA LIVRE - CARRO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'PINHÃO DA RODA', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'VEDAÇÃO DO REDUTOR DE DIREÇÃO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'RUIDO DO REDUTOR DE DIREÇÃO', instruction: 'INSPEÇÃO AUDITIVA.' },
  { category: 'ELÉTRICO', label: 'MOTOR DE DIREÇÃO', instruction: 'INSPEÇÃO VISUAL E FUNCIONAL.' },
  { category: 'MECÂNICO', label: 'FREIO DE DIREÇÃO', instruction: 'VERIFICAÇÃO DE FUNCIONAMENTO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA MOTOR DIREÇÃO', instruction: 'MEDIÇÃO COM ALICATE AMPERÍMETRO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA FREIO DE DIREÇÃO', instruction: 'MEDIÇÃO COM ALICATE AMPERÍMETRO.' },
  { category: 'MECÂNICO', label: 'AJUSTE DE FREIO DE DIREÇÃO', instruction: 'VERIFICAR E REGULAR.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO RAPIDA - DIREITA', instruction: 'TESTE FUNCIONAL.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO LENTA - DIREITA', instruction: 'TESTE FUNCIONAL.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO RAPIDA - ESQUERDA', instruction: 'TESTE FUNCIONAL.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO LENTA - ESQUERDA', instruction: 'TESTE FUNCIONAL.' },
  I_VED_RED_ELEV,
  I_RUIDO_RED_ELEV,
  I_MOTOR_ELEV,
  I_FREIO_ELEV,
  I_AJUST_FREIO_ELEV,
  I_CORR_EL_MOT_ELEV,
  I_CORR_EL_FR_ELEV,
  { category: 'MECÂNICO', label: 'TAMBOR - VER MEDIDA CANAL', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO.' },
  { category: 'MECÂNICO', label: 'CABO DE AÇO - VER MEDIDA', instruction: 'INSPEÇÃO E MEDIÇÃO DO DIÂMETRO.' },
  { category: 'MECÂNICO', label: 'CLIP´S CABO DE AÇO', instruction: 'VERIFICAR APERTO E QUANTIDADE.' },
  { category: 'MECÂNICO', label: 'ROLDANA DE DESVIO', instruction: 'INSPEÇÃO VISUAL.' },
  I_CAIXA_GANCHO,
  I_FC_SOBE,
  I_SC_SOBE,
  I_FC_DESCE,
  I_TESTE_CARGA
];

export const CHECKLIST_ELEVADOR: Omit<ChecklistItem, 'id' | 'isOk' | 'observation'>[] = [
  I_TENSAO_ENTRADA,
  I_TENSAO_COMANDO,
  I_IDENT_EQUIP,
  I_IDENT_CAPACIDADE,
  I_OPER_CAPACITADOS,
  I_ACESSO_MANUT,
  I_BLOQUEIO_MANUT,
  I_ACION_ELEV,
  { category: 'MECÂNICO', label: 'RODA GUIAS', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'MANCAL DA RODA GUIA', instruction: 'INSPEÇÃO VISUAL.' },
  I_ESTRUTURA,
  { category: 'MECÂNICO', label: 'GUIAS DAS RODAS DO ELEVADOR', instruction: 'INSPEÇÃO VISUAL.' },
  I_ALIMENT_EL_TALHA,
  I_LIMP_REAPERTO_PAINEL,
  I_BOTOEIRA_ACION,
  I_LUB_CORRENTE,
  I_VED_RED_ELEV,
  I_RUIDO_RED_ELEV,
  I_MOTOR_ELEV,
  I_FREIO_ELEV,
  I_AJUST_FREIO_ELEV,
  I_CORR_EL_MOT_ELEV,
  I_CORR_EL_FR_ELEV,
  { category: 'MECÂNICO', label: 'CORRENTE DE ELEVAÇÃO - VER MEDIDA DOS GOMOS', instruction: 'INSPEÇÃO E MEDIÇÃO.' },
  I_FIX_CORRENTE,
  I_CAIXA_GANCHO,
  I_BOLSA_CORRENTE,
  I_SIST_FIX_GANCHO,
  { category: 'SEGURANÇA', label: 'PORTA DO ELEVADOR', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'ELÉTRICO', label: 'SENSORES DE MONITORAMENTO DAS POSTAS', instruction: 'TESTE FUNCIONAL.' },
  { category: 'ELÉTRICO', label: 'TRAVA MAGNÉTICA DAS PORTAS PISO 1', instruction: 'TESTE FUNCIONAL.' },
  { category: 'ELÉTRICO', label: 'TRAVA MAGNÉTICA DAS PORTAS PISO 2', instruction: 'TESTE FUNCIONAL.' },
  I_FC_SOBE,
  I_SC_SOBE,
  I_FC_DESCE,
  I_TESTE_CARGA
];

export const CHECKLIST_PORTICO: Omit<ChecklistItem, 'id' | 'isOk' | 'observation'>[] = [
  I_IDENT_EQUIP,
  I_IDENT_CAPACIDADE,
  I_OPER_CAPACITADOS,
  I_ACESSO_MANUT,
  I_ESTRUTURA,
  { category: 'MECÂNICO', label: 'RODIZIOS DE TRANSLAÇÃO', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'FREIO MANUAL DOS RODIZIOS', instruction: 'TESTE FUNCIONAL.' },
  { category: 'MECÂNICO', label: 'RODAS DO TROLEI MANUAL', instruction: 'INSPEÇÃO VISUAL.' },
  { category: 'MECÂNICO', label: 'SISTEMA DE TRAVA MANUAL DA TALHA', instruction: 'TESTE FUNCIONAL.' },
  I_LUB_CORRENTE,
  I_FIX_CORRENTE,
  I_CAIXA_GANCHO,
  I_SIST_FIX_GANCHO,
  I_TESTE_CARGA
];

export const CHECKLIST_ENCAIXOTADORA: Omit<ChecklistItem, 'id' | 'isOk' | 'observation'>[] = [
  I_TENSAO_ENTRADA,
  I_TENSAO_COMANDO,
  I_IDENT_EQUIP,
  I_IDENT_CAPACIDADE,
  I_OPER_CAPACITADOS,
  I_ACESSO_MANUT,
  I_BLOQUEIO_MANUT,
  I_ACION_ELEV,
  I_ESTRUTURA,
  I_SIST_GIRO_GUIND,
  I_FIX_GUIND_PISO,
  I_ALIMENT_EL_TALHA,
  I_LIMP_REAPERTO_PAINEL,
  I_BOTOEIRA_ACION,
  I_LUB_CORRENTE,
  I_VED_RED_ELEV,
  I_RUIDO_RED_ELEV,
  I_MOTOR_ELEV,
  I_FREIO_ELEV,
  I_AJUST_FREIO_ELEV,
  I_CORR_EL_MOT_ELEV,
  I_CORR_EL_FR_ELEV,
  { category: 'MECÂNICO', label: 'CORRENTE DE ELEVAÇÃO - VER MEDIDA DOS GOMOS', instruction: 'INSPEÇÃO E MEDIÇÃO.' },
  I_FIX_CORRENTE,
  I_CAIXA_GANCHO,
  I_BOLSA_CORRENTE,
  I_SIST_FIX_GANCHO,
  I_FC_SOBE,
  I_SC_SOBE,
  I_FC_DESCE,
  I_TESTE_CARGA
];

export const CHECKLIST_DESENCAIXOTADORA: Omit<ChecklistItem, 'id' | 'isOk' | 'observation'>[] = [
  I_TENSAO_ENTRADA,
  I_TENSAO_COMANDO,
  I_IDENT_EQUIP,
  I_IDENT_CAPACIDADE,
  I_OPER_CAPACITADOS,
  I_ACESSO_MANUT,
  I_BLOQUEIO_MANUT,
  I_ACION_ELEV,
  I_ESTRUTURA,
  I_SIST_GIRO_GUIND,
  I_FIX_GUIND_PISO,
  I_ALIMENT_EL_TALHA,
  I_LIMP_REAPERTO_PAINEL,
  I_BOTOEIRA_ACION,
  I_LUB_CORRENTE,
  I_VED_RED_ELEV,
  I_RUIDO_RED_ELEV,
  I_MOTOR_ELEV,
  I_FREIO_ELEV,
  I_AJUST_FREIO_ELEV,
  I_CORR_EL_MOT_ELEV,
  I_CORR_EL_FR_ELEV,
  { category: 'MECÂNICO', label: 'CORRENTE DE ELEVAÇÃO - VER MEDIDA DOS GOMOS', instruction: 'INSPEÇÃO E MEDIÇÃO.' },
  I_FIX_CORRENTE,
  I_CAIXA_GANCHO,
  I_BOLSA_CORRENTE,
  I_SIST_FIX_GANCHO,
  I_FC_SOBE,
  I_SC_SOBE,
  I_FC_DESCE,
  I_TESTE_CARGA
];

export const getChecklistTemplate = (equipmentType?: string) => {
  switch (equipmentType?.trim().toUpperCase()) {
    case 'TALHA':
      return CHECKLIST_TALHA;
    case 'ELEVADOR DE CARGA':
      return CHECKLIST_ELEVADOR;
    case 'PORTICO':
    case 'PÓRTICO':
      return CHECKLIST_PORTICO;
    case 'ENCAIXOTADORA':
      return CHECKLIST_ENCAIXOTADORA;
    case 'DESENCAIXOTADORA':
      return CHECKLIST_DESENCAIXOTADORA;
    default:
      return CHECKLIST_PONTE;
  }
};

export const RDO_MATERIAIS = [
  { category: 'MATERIAIS', label: 'EPIs (Capacete, Luva, Óculos, Bota)' },
  { category: 'MATERIAIS', label: 'FERRAMENTAS MANUAIS' },
  { category: 'MATERIAIS', label: 'FERRAMENTAS ELÉTRICAS' },
  { category: 'MATERIAIS', label: 'CONSUMÍVEIS (Eletrodo, Disco de Corte)' },
  { category: 'MATERIAIS', label: 'CABOS DE AÇO / CINTAS DE IÇAMENTO' },
  { category: 'MATERIAIS', label: 'MATERIAL DE LIMPEZA E ORGANIZAÇÃO' }
];

export const RDO_EQUIPAMENTOS = [
  { category: 'EQUIPAMENTOS', label: 'VEÍCULO DE TRANSPORTE' },
  { category: 'EQUIPAMENTOS', label: 'ESCADAS E ANDAIMES' },
  { category: 'EQUIPAMENTOS', label: 'INSTRUMENTOS DE MEDIÇÃO (Multímetro/Célula)' },
  { category: 'EQUIPAMENTOS', label: 'MÁQUINA DE SOLDA' },
  { category: 'EQUIPAMENTOS', label: 'COMPRESSOR / GERADOR' },
  { category: 'EQUIPAMENTOS', label: 'PLATAFORMA ELEVATÓRIA (SE APLICÁVEL)' }
];
