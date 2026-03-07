import { ParametrosSistema, Feriado } from '../types';
import { apiGet, apiPost } from './api';

const PARAMETROS_KEY = 'biohealth_parametros';

// Valores padrão do sistema
export const PARAMETROS_PADRAO: ParametrosSistema = {
  id: 'default',
  
  calendario: {
    considerarFinaisDeSemana: true,
    considerarFeriados: true,
    listaFeriados: [
      { data: '2026-01-01', nome: 'Ano Novo', tipo: 'nacional' },
      { data: '2026-02-16', nome: 'Carnaval', tipo: 'nacional' },
      { data: '2026-02-17', nome: 'Carnaval', tipo: 'nacional' },
      { data: '2026-04-03', nome: 'Sexta-feira Santa', tipo: 'nacional' },
      { data: '2026-04-21', nome: 'Tiradentes', tipo: 'nacional' },
      { data: '2026-05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
      { data: '2026-06-04', nome: 'Corpus Christi', tipo: 'nacional' },
      { data: '2026-09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
      { data: '2026-10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
      { data: '2026-11-02', nome: 'Finados', tipo: 'nacional' },
      { data: '2026-11-15', nome: 'Proclamação da República', tipo: 'nacional' },
      { data: '2026-12-25', nome: 'Natal', tipo: 'nacional' }
    ],
    formatoData: 'DD/MM/YYYY',
    formatoHora: '24h'
  },

  relatorios: {
    camposVisiveis: [
      'cooperadoNome',
      'categoriaProfissional',
      'hospital',
      'setor',
      'data',
      'entrada',
      'saida',
      'totalHoras',
      'status'
    ],
    ordenacaoPadrao: [
      { campo: 'cooperadoNome', ordem: 'asc' },
      { campo: 'data', ordem: 'asc' },
      { campo: 'entrada', ordem: 'asc' }
    ],
    agruparPor: 'nenhum',
    totalizadores: {
      horas: true,
      plantoes: true,
      porCooperado: true,
      porSetor: false
    },
    cores: {
      primaria: '#6A1B9A',
      secundaria: '#7c3aed',
      statusAberto: '#F57C00',
      statusFechado: '#2E7D32'
    },
    rodape: 'iDev Sistemas - Sistema de Controle de Produção © 2026',
    assinaturaDigital: false
  },

  ponto: {
    toleranciaPareamentoHoras: 24,
    exigirCodigoPareamento: false,
    permitirMultiplosPlantoesNoDia: true,
    setorPredominante: 'saida',
    statusAutomatico: true,
    exibirRecusadosPorPadrao: false,
    confirmarExclusao: true
  },

  justificativas: {
    aprovarAutomaticamente: {
      atestadoMedico: false,
      faltaJustificada: false,
      outros: false
    },
    exigirAnexos: {
      atestado: false,
      declaracao: false,
      outros: false
    },
    prazoMaximoDias: 7,
    notificarCooperado: false,
    niveisAprovacao: 1
  },

  nomenclatura: {
    turnoMatutino: 'MT',
    turnoVespertino: 'T',
    turnoNoturno: 'N',
    sufixoFDS: 'FDS',
    sufixoFeriado: 'F',
    termoCooperado: 'Cooperado',
    termoPlantao: 'Plantão'
  },

  dashboard: {
    periodoPadrao: 'mes',
    widgetsVisiveis: ['registrosHoje', 'cooperadosAtivos', 'plantoesMes', 'graficoSemanal', 'ultimosRegistros'],
    qtdRegistrosRecentes: 10
  },

  categorias: {
    ativas: [
      'Médico',
      'Enfermeiro',
      'Técnico de Enfermagem',
      'Fisioterapeuta',
      'Nutricionista',
      'Psicólogo',
      'Assistente Social'
    ],
    exigirRegistroProfissional: {
      medico: false,
      enfermeiro: false,
      outros: false
    },
    exibirValorHoraPorCategoria: true
  },

  validacoes: {
    intervaloMinimoEntrePlantoes: 11,
    cargaHorariaMaximaSemanal: 60,
    permitirHorasExtras: true,
    percentualHoraExtra: {
      primeira: 1.5,
      adicional: 2.0
    },
    validarCpf: false,
    permitirEditarPontosFechados: false,
    auditoriaCompleta: true
  },

  updatedAt: new Date().toISOString(),
  updatedBy: undefined
};

/**
 * Obter parâmetros do localStorage (com fallback para padrão)
 */
export const getParametros = (): ParametrosSistema => {
  try {
    const stored = localStorage.getItem(PARAMETROS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge com padrão para garantir que novos campos existam
      return { ...PARAMETROS_PADRAO, ...parsed };
    }
  } catch (error) {
    console.warn('[parametros] Erro ao carregar do localStorage:', error);
  }
  return PARAMETROS_PADRAO;
};

/**
 * Salvar parâmetros no localStorage
 */
export const saveParametros = (parametros: ParametrosSistema): void => {
  try {
    const updated = {
      ...parametros,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PARAMETROS_KEY, JSON.stringify(updated));
    console.log('[parametros] Salvo no localStorage');
  } catch (error) {
    console.error('[parametros] Erro ao salvar no localStorage:', error);
  }
};

/**
 * Sincronizar parâmetros com o backend
 */
export const syncParametrosToRemote = async (parametros: ParametrosSistema): Promise<void> => {
  try {
    await apiPost('parametros', parametros);
    console.log('[parametros] ✅ Sincronizado com backend');
  } catch (error) {
    console.warn('[parametros] ⚠️ Erro ao sincronizar com backend:', error);
    throw error;
  }
};

/**
 * Carregar parâmetros do backend
 */
export const loadParametrosFromRemote = async (): Promise<ParametrosSistema> => {
  try {
    const remote = await apiGet<ParametrosSistema | null>('parametros');

    // Quando ainda não existe registro no banco, a API pode retornar null.
    if (!remote || typeof remote !== 'object') {
      const local = getParametros();
      console.log('[parametros] ℹ️ Backend sem registro, usando local/padrão');
      return local;
    }

    // Salvar no localStorage como cache
    saveParametros(remote);
    console.log('[parametros] ✅ Carregado do backend');
    return remote;
  } catch (error) {
    console.warn('[parametros] ⚠️ Erro ao carregar do backend, usando localStorage:', error);
    return getParametros();
  }
};

/**
 * Resetar para valores padrão de fábrica
 */
export const resetParametrosPadrao = (): void => {
  saveParametros(PARAMETROS_PADRAO);
  console.log('[parametros] ✅ Resetado para padrão de fábrica');
};

/**
 * Verificar se uma data é final de semana
 */
export const isFinalDeSemana = (data: Date): boolean => {
  const dia = data.getDay();
  return dia === 0 || dia === 6; // 0 = Domingo, 6 = Sábado
};

/**
 * Verificar se uma data é feriado
 */
export const isFeriado = (data: Date, feriados: Feriado[]): boolean => {
  const dataStr = data.toISOString().split('T')[0]; // YYYY-MM-DD
  return feriados.some(f => f.data === dataStr);
};

/**
 * Obter sufixo do turno baseado na data
 */
export const getSufixoTurno = (data: Date, parametros: ParametrosSistema): string => {
  const sufixos: string[] = [];
  
  if (parametros.calendario.considerarFeriados && isFeriado(data, parametros.calendario.listaFeriados)) {
    sufixos.push(parametros.nomenclatura.sufixoFeriado);
  } else if (parametros.calendario.considerarFinaisDeSemana && isFinalDeSemana(data)) {
    sufixos.push(parametros.nomenclatura.sufixoFDS);
  }
  
  return sufixos.length > 0 ? ` ${sufixos.join(' ')}` : '';
};

/**
 * Obter nome completo do turno com sufixos
 */
export const getNomeTurnoCompleto = (nomeTurno: string, data: Date, parametros: ParametrosSistema): string => {
  const sufixo = getSufixoTurno(data, parametros);
  return `${nomeTurno}${sufixo}`;
};

/**
 * Formatar data de acordo com os parâmetros
 */
export const formatarData = (data: Date, formato: string): string => {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  
  switch (formato) {
    case 'DD/MM/YYYY':
      return `${dia}/${mes}/${ano}`;
    case 'MM/DD/YYYY':
      return `${mes}/${dia}/${ano}`;
    case 'YYYY-MM-DD':
      return `${ano}-${mes}-${dia}`;
    default:
      return `${dia}/${mes}/${ano}`;
  }
};

/**
 * Formatar hora de acordo com os parâmetros
 */
export const formatarHora = (hora: string, formato: '24h' | '12h'): string => {
  if (formato === '24h' || !hora) return hora;
  
  const [h, m] = hora.split(':').map(Number);
  const periodo = h >= 12 ? 'PM' : 'AM';
  const hora12 = h % 12 || 12;
  
  return `${String(hora12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${periodo}`;
};

export const ParametrosService = {
  getParametros,
  saveParametros,
  syncParametrosToRemote,
  loadParametrosFromRemote,
  resetParametrosPadrao,
  isFinalDeSemana,
  isFeriado,
  getSufixoTurno,
  getNomeTurnoCompleto,
  formatarData,
  formatarHora
};
