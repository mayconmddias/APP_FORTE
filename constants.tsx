
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

export const CHECKLIST_PONTE: Omit<ChecklistItem, 'id' | 'isOk' | 'observation'>[] = [
  { category: 'ELÉTRICO', label: 'TENSÃO DE ENTRADA DO EQUIPAMENTO', instruction: 'MEDIÇÃO: FAZER MEDIÇÃO COM MULTIMETRO.' },
  { category: 'ELÉTRICO', label: 'TENSÃO DE COMANDO', instruction: 'MEDIÇÃO: FAZER MEDIÇÃO COM MULTIMETRO.' },
  { category: 'SEGURANÇA', label: 'IDENTIFICAÇÃO DO EQUIPAMENTO', instruction: 'VISUAL/LIMPEZA: VERIFICAR SE EXISTE TODAS A INFORMAÇÕES LEGIVEIS E EFETUAR A LIMPEZA DAS PLACAS.' },
  { category: 'SEGURANÇA', label: 'IDENTIFICAÇÃO DE CAPACIDADE DE ELEVAÇÃO', instruction: 'VISUAL/LIMPEZA: VERIFICAR SE EXISTE TODAS A INFORMAÇÕES LEGIVEIS E EFETUAR A LIMPEZA DAS PLACAS.' },
  { category: 'SEGURANÇA', label: 'OPERADORES SÃO CAPACITADOS PARA OPERAÇÃO DO EQUIPAMENTO', instruction: 'INSPEÇÃO VISUAL: TODOS OS OPERADORES SÃO CAPACITADOS E ESTÃO COM OS TREINAMENTO EM DIA?' },
  { category: 'SEGURANÇA', label: 'ACESSO PARA MANUTENÇÃO DO EQUIPAMENTO', instruction: 'INSPEÇÃO VISUAL: O ACESSO AO EQUIPAMENTO, É VIA PLATAFORMA OU ESCADA, ESTA CONFORME NORMA?' },
  { category: 'SEGURANÇA', label: 'BLOQUEIO DO EQUIPAMENTO PARA MANUTENÇÃO', instruction: 'EFETUAR BLOQUEIO: FAZER O BLOQUEIO E ISOLAMENTO DA ÁREA.' },
  { category: 'ELÉTRICO', label: 'ACIONAMENTO COMANDO ELEVAÇÃO', instruction: 'TESTE FUNCIONAL: APERTAR BOTÃO SOBE E DESCE E VERIFICAR SE O EQUIPAMENTO ESTA CORRESPONDENDO AO COMANDO.' },
  { category: 'ELÉTRICO', label: 'ACIONAMENTO COMANDO DIREÇÃO', instruction: 'TESTE FUNCIONAL: APERTAR BOTÃO DIREITA E ESQUERDA E VERIFICAR SE O EQUIPAMENTO ESTA CORRESPONDENDO AO COMANDO.' },
  { category: 'ELÉTRICO', label: 'ACIONAMENTO COMANDO TRANSLAÇÃO', instruction: 'TESTE FUNCIONAL: APERTAR BOTÃO FRENTE E ATRÁS E VERIFICAR SE O EQUIPAMENTO ESTA CORRESPONDENDO AO COMANDO.' },
  { category: 'ELÉTRICO', label: 'PAINEL ELÉTRICO ORGANIZADO E EM BOAS CONDIÇÕES', instruction: '-.' },
  { category: 'ELÉTRICO', label: 'IDENTIFICAÇÃO DO PAINEL ELÉTRICO', instruction: '-.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO TRANSLAÇÃO RAPIDA - FRENTE', instruction: 'TESTE FUNCIONAL: FAZER O MOVIMENTO PARA FRENTE COM EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO TRANSLAÇÃO LENTA - FRENTE', instruction: 'TESTE FUNCIONAL: FAZER O MOVIMENTO PARA FRENTE WITH EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO TRANSLAÇÃO RAPIDA - ATRÁS', instruction: 'TESTE FUNCIONAL: FAZER O MOVIMENTO PARA ATRÁS WITH EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO TRANSLAÇÃO LENTA - ATRÁS', instruction: 'TESTE FUNCIONAL: FAZER O MOVIMENTO PARA ATRÁS WITH EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'MECÂNICO', label: 'VEDAÇÃO DOS REDUTORES DE TRANSLAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE VAZEMENTO DE ÓLEO.' },
  { category: 'MECÂNICO', label: 'EXISTE ALGUM RUIDO NO REDUTOR DE TRANSLAÇÃO', instruction: '-.' },
  { category: 'MECÂNICO', label: 'NIVEL DO OLEO DO REDUTOR DE TRANSLAÇÃO', instruction: '-.' },
  { category: 'MECÂNICO', label: 'RODA MOTRIZ PONTE', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTE, MEDIR CANAL E ABA DAS RODAS.' },
  { category: 'MECÂNICO', label: 'RODA LIVRE PONTE', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTE, MEDIR CANAL E ABA DAS RODAS.' },
  { category: 'MECÂNICO', label: 'MANCAL DA RODA', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE FOLGA EM EIXO E PINHÃO.' },
  { category: 'ELÉTRICO', label: 'MOTOR DE TRANSLAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR CONECTORES, EMENDAS E SINAIS DE AQUECIMENTO.' },
  { category: 'MECÂNICO', label: 'ESTRUTURA DO EQUIPAMENTO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE PONTOS DE CORROSÃO E OU PONTOS DE SOLDA DANIFICADA.' },
  { category: 'ELÉTRICO', label: 'LINHA DE PORTA CABOS CHATO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE TODOS CARRINHO ESTÃO CONFORME, OS CABOS NÃO TEM EMENDA E SINAIS DE AQUECIMENTO.' },
  { category: 'ELÉTRICO', label: 'INSPEÇÃO VISUAL E FUNCIONAL DE BOTOEIRA E CONTROLE REMÓTO', instruction: 'TESTE FUNCIONAL: ACIONAMENTO DE TODOS OS COMANDOS E LIMPEZA.' },
  { category: 'MECÂNICO', label: 'LUBRIFICAÇÃO DE PINHÃO E ENGRENAGENS DE RODAS', instruction: 'LUBRIFICAR.' },
  { category: 'MECÂNICO', label: 'AJUSTE DOS FREIOS DE TRANSLAÇÃO', instruction: 'MEDIÇÃO DA REGULAGEM E AJUSTE: REALIZAR AJUSTE E MEDIR AS DISTÂNCIAS DE REGULAGEM.' },
  { category: 'MECÂNICO', label: 'FREIO DE TRANSLAÇÃO ESTA EM BOM ESTADO DE FUNCIONAMENTO', instruction: '-.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA MOTOR TRANSLAÇÃO', instruction: 'MEDIÇÃO: FAZER MEDIÇÃO COM AMPERIMETRO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA FREIO DE TRASLAÇÃO', instruction: 'MEDIÇÃO: FAZER MEDIÇÃO COM AMPERIMETRO.' },
  { category: 'SEGURANÇA', label: 'FIM DE CURSO ANTI - COLISÃO', instruction: 'TESTE FUNCIONAL: FAZER O MOVIMENTO PARA COM O EQUIPAMENTO ATÉ SE APORXIMAR AO OUTRO EXISTENTE, ATÉ O MESMO SERÁ ACIONADO, REALIZAR O AJUSTE DE DISTÂNCIA SE NECESSÁRIO.' },
  { category: 'MECÂNICO', label: 'RODA MOTRIZ - CARRO', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTE, MEDIR CANAL E ABA DAS RODAS.' },
  { category: 'MECÂNICO', label: 'RODA LIVRE - CARRO', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTE, MEDIR CANAL E ABA DAS RODAS.' },
  { category: 'MECÂNICO', label: 'PINHÃO DA RODA', instruction: 'INSPEÇÃO VISUAL: VERIFICAR FOLGA DO PINHÃO.' },
  { category: 'MECÂNICO', label: 'VEDAÇÃO DO REDUTOR DE DIREÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE VAZEMENTO DE ÓLEO.' },
  { category: 'MECÂNICO', label: 'RUIDO DO REDUTOR DE DIREÇÃO', instruction: 'INSPEÇÃO FUNCIONAL: ACIONAR REDUTORES E VERIFICAR RUIDOS.' },
  { category: 'MECÂNICO', label: 'NIVEL DO OLEO DO REDUTOR DE DIREÇÃO', instruction: '-.' },
  { category: 'ELÉTRICO', label: 'MOTOR DE DIREÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR CONECTORES, EMENDAS E SINAIS DE AQUECIMENTO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA MOTOR DIREÇÃO', instruction: 'MEDIÇÃO: FAZER MEDIÇÃO COM AMPERIMETRO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA FREIO DE DIREÇÃO', instruction: 'MEDIÇÃO: FAZER MEDIÇÃO COM AMPERIMETRO.' },
  { category: 'MECÂNICO', label: 'AJUSTE DE FREIO DE DIREÇÃO', instruction: 'MEDIÇÃO DA REGULAGEM E AJUSTE.' },
  { category: 'MECÂNICO', label: 'FREIO DE DIREÇÃO ESTA EM BOM ESTADO DE FUNCIONAMENTO', instruction: '-.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO RAPIDA - DIREITA', instruction: 'TESTE FUNCIONAL: FAZER O MOVIMENTO PARA DIREITA WITH EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO LENTA - DIREITA', instruction: 'TESTE FUNCIONAL: FAZER O MOVIMENTO PARA DIREITA WITH EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO RAPIDA - ESQUERDA', instruction: 'TESTE FUNCIONAL: FAZER O MOVIMENTO PARA ESQUERDA WITH EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO DIREÇÃO LENTA - ESQUERDA', instruction: 'TESTE FUNCIONAL: FAZER O MOVIMENTO PARA ESQUERDA WITH EQUIPAMENTO ATÉ ACIONAR O FIM DE CURSO, VERIFICAR SE O MESMO SERÁ ACIONADO.' },
  { category: 'MECÂNICO', label: 'VEDAÇÃO DO REDUTOR DE ELEVAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE EXISTE VAZEMENTO DE ÓLEO.' },
  { category: 'MECÂNICO', label: 'RUIDO DO REDUTOR DE ELEVAÇÃO', instruction: 'INSPEÇÃO FUNCIONAL: ACIONAR REDUTORES E VERIFICAR RUIDOS.' },
  { category: 'MECÂNICO', label: 'NIVEL DO OLEO DO REDUTOR DE ELEVAÇÃO', instruction: '-.' },
  { category: 'ELÉTRICO', label: 'MOTOR DE ELEVAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR CONECTORES, EMENDAS E SINAIS DE AQUECIMENTO.' },
  { category: 'MECÂNICO', label: 'AJUSTE DE FREIO DE ELEVAÇÃO', instruction: 'MEDIÇÃO DA REGULAGEM E AJUSTE: REALIZAR AJUSTE E MEDIR AS DISTÂNCIAS DE REGULAGEM.' },
  { category: 'MECÂNICO', label: 'FREIO DE ELEVAÇÃO ESTA EM BOM ESTADO DE FUNCIONAMENTO', instruction: '-.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA MOTOR ELEVAÇÃO PRINCIPAL', instruction: 'MEDIÇÃO: FAZER MEDIÇÃO COM AMPERIMETRO.' },
  { category: 'ELÉTRICO', label: 'CORRENTE ELÉTRICA FREIO ELEVAÇÃO PRINCIPAL', instruction: 'MEDIÇÃO: FAZER MEDIÇÃO COM AMPERIMETRO.' },
  { category: 'MECÂNICO', label: 'CABO DE AÇO - VER MEDIDA', instruction: 'MEDIÇÃO E INSPEÇÃO VISUAL: MEDIR A BITOLA DO CABO E VERIFICA SE NÃO TEM NENHUM PONTO DE POSSIVEL RUPTURA. O CABO NÃO PODE TER MAIS QUE 2% DE DESGASTE.' },
  { category: 'MECÂNICO', label: 'CLIP´S CABO DE AÇO', instruction: 'INSPEÇÃO VISUAL E REAPERTO: REALIZAR REAPERTO E VERIFICAR SE NÃO TEM PONTO DE CORROSÃO OU ROSCA DANIFICADA.' },
  { category: 'MECÂNICO', label: 'RANHURAS DO TAMBOR DENTRO DA MEDIDA', instruction: '-.' },
  { category: 'MECÂNICO', label: 'ANEL DE GUIA', instruction: '-.' },
  { category: 'MECÂNICO', label: 'ROLDANA DE DESVIO', instruction: 'INSPEÇÃO VISUAL E MEDIÇÃO: VERIFICAR DESGASTE, MEDIR CANAL E ABA.' },
  { category: 'MECÂNICO', label: 'CAIXA DE GANCHO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR SE NÃO TEM TAMPA QUEBRADA, SE ESTA OK A TRAVA.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO - SOBE', instruction: 'INSPEÇÃO TÉCNICA: VERIFICAR ACIONAMENTO DO SENSOR.' },
  { category: 'ELÉTRICO', label: 'SOBRE CURSO - SOBE', instruction: 'INSPEÇÃO TÉCNICA: VERIFICAR ACIONAMENTO DO SENSOR.' },
  { category: 'ELÉTRICO', label: 'FIM DE CURSO - DESCE', instruction: 'INSPEÇÃO TÉCNICA: VERIFICAR ACIONAMENTO DO SENSOR.' },
  { category: 'SEGURANÇA', label: 'SENSOR ANTI COLISÃO CARRO', instruction: 'INSPEÇÃO TÉCNICA: TESTE FUNCIONAL DE PROXIMIDADE.' },
  { category: 'SEGURANÇA', label: 'CÉLULA DE CARGA CALIBRADA E ATUANDO', instruction: 'MEDIÇÃO: TESTE WITH CARGA OU SIMULADOR.' },
  { category: 'ELÉTRICO', label: 'CARRO COLETOR', instruction: 'INSPEÇÃO VISUAL: VERIFICAR CONTATOS.' },
  { category: 'ELÉTRICO', label: 'ESCOVAS DO CARRO COLETOR', instruction: 'INSPEÇÃO VISUAL: VERIFICAR DESGASTE DAS ESCOVAS.' },
  { category: 'ELÉTRICO', label: 'BARRAMENTO DE ALIMENTAÇÃO', instruction: 'INSPEÇÃO VISUAL: VERIFICAR ALINHAMENTO E LIMPEZA.' },
  { category: 'ELÉTRICO', label: 'LIMPEZA COMPLETA DO PAINEL E COMPONENTES ELÉTRICOS', instruction: 'EXECUÇÃO: LIMPEZA DE TODOS OS COMPONENTES E REAPERTO.' },
  { category: 'ELÉTRICO', label: 'CABOS E TERMINAIS', instruction: 'REAPERTO / VISUAL.' },
  { category: 'ELÉTRICO', label: 'MOTOR', instruction: 'FAZER MEDIÇÃO: MEDIR RESISTÊNCIA ÔHMICA.' },
  { category: 'ELÉTRICO', label: 'CARRO COLETOR', instruction: 'VISUAL: VERIFICAR DESGASTE E REALIZAR LIMPEZA.' },
  { category: 'ELÉTRICO', label: 'LINHA FESTONN OU ESTEIRA PORTA CABOS', instruction: 'REALIZAR LIMPEZA DOS TRILHOS E LIMPEZA DAS CALHAS.' },
  { category: 'MECÂNICO', label: 'ANEL DE GUIA', instruction: 'VISUAL E REAPERTO: VERIFICAR FOLGA, REALIZA REAPERTO E LUBRIFICAÇÃO.' },
  { category: 'MECÂNICO', label: 'LUBRIFICAÇÃO DE CABO DE AÇO', instruction: 'LUBRIFICAR.' },
  { category: 'ELÉTRICO', label: 'CARRO COLETOR', instruction: 'VISUAL: VERIFICAR DESGASTE E REALIZAR LIMPEZA, TROCA DAS ESCOVAS.' },
  { category: 'ELÉTRICO', label: 'ESTEIRA PORTA CABOS', instruction: 'REALIZAR LIMPEZA DOS TRILHOS E LIMPEZA DAS CALHAS.' },
  { category: 'MECÂNICO', label: 'ANEL DE GUIA', instruction: 'VISUAL E REAPERTO: VERIFICAR FOLGA, REALIZA REAPERTO E LUBRIFICAÇÃO.' },
  { category: 'MECÂNICO', label: 'CABO DE AÇO', instruction: 'SUBSTITUIÇÃO DO CABO DE AÇO E CLIPS DE FIXAÇÃO E LUBRIFICAÇÃO DO NOVO CABO.' },
  { category: 'MECÂNICO', label: 'TAMBOR', instruction: 'VERIFICAR MEDIDAS DO CANAL, REALIZAR LIMPEZA e REMOÇÃO DE GRAXA EM EXCESSO.' },
  { category: 'ELÉTRICO', label: 'LIMPEZA COMPLETA DO PAINEL E COMPONENTES ELÉTRICOS', instruction: 'EXECUÇÃO: LIMPEZA DE TODOS OS COMPONENTES E REAPERTO.' },
  { category: 'ELÉTRICO', label: 'CABOS E TERMINAIS', instruction: 'REAPERTO / VISUAL.' },
  { category: 'MECÂNICO', label: 'ESTRUTURA DO EQUIPAMENTO E CAMINHO DE ROLAMENTO', instruction: 'TORQUEAMENTO DE TODOS OS PARAFUSOS E MARCAÇÃO CHECK, LIMPEZA DO CAMINHO DE ROLAMENTO, VERIFICAÇÃO DE MEDIDA DO VÃO.' },
  { category: 'MECÂNICO', label: 'PARAFUSOS', instruction: 'FAZER MARCAÇÃO APÓS TORQUE.' },
  { category: 'ELÉTRICO', label: 'BARRAMENTOS DE ALIMENTAÇÃO', instruction: 'LIMPEZA, ALINHAMENTO E REAPERTO.' },
  { category: 'MECÂNICO', label: 'DISCO DE FREIO', instruction: 'EFETUAR A TROCA.' },
  { category: 'MECÂNICO', label: 'CAIXA DE GANCHO', instruction: 'FAZER TESTE WITH LIQUIDO PENETRANTE.' }
];

export const CHECKLIST_TALHA: Omit<ChecklistItem, 'id' | 'isOk' | 'observation'>[] = [
  ...CHECKLIST_PONTE.slice(0, 9),      // 01 a 09
  ...CHECKLIST_PONTE.slice(10, 12),    // 11 a 12
  ...CHECKLIST_PONTE.slice(23, 26),    // 24 a 26
  ...CHECKLIST_PONTE.slice(32, 66)     // 33 a 66 (O item 66 agora é o card 48)
];
