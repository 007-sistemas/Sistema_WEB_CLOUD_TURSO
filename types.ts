
export enum TipoPonto {
  ENTRADA = 'ENTRADA',
  INTERVALO_IDA = 'INTERVALO_IDA',
  INTERVALO_VOLTA = 'INTERVALO_VOLTA',
  SAIDA = 'SAIDA',
}

export enum StatusCooperado {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  SUSPENSO = 'SUSPENSO',
}

export interface Biometria {
  id: string;
  fingerIndex: number; // 0-9 representing fingers
  hash: string; // FMD (Fingerprint Minutiae Data) or Simulated Hash
  createdAt: string;
}

export interface Cooperado {
  id: string;
  nome: string;
  cpf: string;
  matricula: string;
  categoriaProfissional: string;
  telefone: string;
  email: string;
  status: StatusCooperado;
  producaoPorCpf: 'Sim' | 'Não';
  biometrias: Biometria[];
  updatedAt: string;
  /**
   * Lista de IDs das unidades (hospitais) em que o cooperado pode justificar plantão
   */
  unidadesJustificativa?: string[];
}

export interface Setor {
  id: number;
  nome: string;
  status?: 'ATIVO' | 'INATIVO';
}

// Turno Padrão (Template Global)
export interface TurnoPadrao {
  id: string;
  nome: string; // Ex: MT, N, T
  horarioInicio: string; // HH:mm
  horarioFim: string; // HH:mm
  toleranciaAntes: number; // minutos
  toleranciaDepois: number; // minutos
  createdAt: string;
  updatedAt: string;
}

// Turno de Unidade (com valor financeiro)
export interface TurnoUnidade {
  id: string;
  hospitalId: string; // Referência à unidade
  turnoPadraoId: string; // Referência ao turno padrão
  valorHora: number; // Valor específico da unidade
  createdAt: string;
  updatedAt: string;
  // Campos desnormalizados para facilitar exibição
  turnoPadraoNome?: string;
  hospitalNome?: string;
  horarioInicio?: string;
  horarioFim?: string;
  categoriaProfissional: string; // Categoria vinculada ao valor/hora
}

export interface HospitalPermissions {
  dashboard: boolean;
  ponto: boolean;
  relatorio: boolean;
  relatorios: boolean; // Nova permissão para Relatórios
  cadastro: boolean;
  hospitais: boolean;
  biometria: boolean;
  auditoria: boolean;
  gestao: boolean; // New permission for Manager management
  turnosValores: boolean; // Permissao para Turnos
  testes?: boolean; // Permissão opcional para área de testes
  espelho: boolean; // Permission for Espelho da Biometria (apenas Cooperados)
  autorizacao: boolean; // New permission for Justification Approval
  perfil: boolean; // New permission for User Profile
  solicitacoesLiberacao: boolean; // Permission for Liberation Requests Management
  setores: boolean; // Permissão para gestão de setores
  parametros: boolean; // Permissão para configuração de parâmetros do sistema
}

export interface Hospital {
  id: string;
  nome: string;
  slug: string; // URL identifier (e.g., 'hrn', 'hrc')
  usuarioAcesso: string; // Auto-generated login code
  senha?: string; // Access password
  permissoes: HospitalPermissions;
  // setores agora vêm da tabela hospital_setores (relacionamento N:N)
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string; // Hex color (e.g., '#2563eb')
  visibleTabs: string[]; // Array of visible tab/view keys
  tabOrder: string[]; // Custom order of tabs
}

export interface Manager {
  id: string;
  username: string;
  password: string;
  cpf: string;
  email: string;
  permissoes: HospitalPermissions;
  preferences?: UserPreferences; // User theme/color preferences
}

export interface JustificativaData {
  motivo: string;
  descricao?: string;
  dataSolicitacao: string;
}

export interface Justificativa {
  id: string;
  cooperadoId: string;
  cooperadoNome: string;
  pontoId?: string; // Pode referenciar um ponto específico ou null
  hospitalId?: string; // Hospital selecionado na justificativa (para criar pontos na aprovação)
  motivo: string;
  descricao?: string;
  dataSolicitacao: string;
  status: 'Pendente' | 'Fechado' | 'Rejeitado' | 'Excluído';
  aprovadoPor?: string; // Deprecated - usar validadoPor
  validadoPor?: string; // Nome do gestor que aprovou
  dataAprovacao?: string;
  rejeitadoPor?: string;
  motivoRejeicao?: string;
  setorId?: string; // Setor selecionado pelo cooperado
  dataPlantao?: string; // Data informada pelo cooperado (dd/mm/aaaa ou ISO)
  entradaPlantao?: string; // Horário de entrada informado (HH:mm)
  saidaPlantao?: string; // Horário de saída informado (HH:mm)
  createdAt: string;
  updatedAt: string;
  // Dados opcionais do ponto (preenchidos quando vindos do Neon para evitar buscar localStorage)
  pontoTimestamp?: string;
  pontoEntrada?: string;
  pontoSaida?: string;
  pontoTipo?: string;
  pontoDate?: string;
  pontoRelatedId?: string;
}

export interface RegistroPonto {
  id: string;
  codigo: string; // Legacy numeric code (e.g. 248834)
  cooperadoId: string;
  cooperadoNome: string;
  timestamp: string; // Full ISO Date
  data?: string; // YYYY-MM-DD (quando informado manualmente)
  entrada?: string; // HH:mm (quando informado manualmente)
  saida?: string; // HH:mm (quando informado manualmente)
  tipo: TipoPonto;
  local: string;
  hospitalId?: string; // Helper for filtering
  setorId?: string; // Helper for filtering
  observacao?: string;
  validadoPor?: string; // If manual override (Aprovado por)
  rejeitadoPor?: string; // Who rejected (Recusado por)
  motivoRejeicao?: string; // Reason for rejection
  isManual: boolean;
  status: 'Aberto' | 'Fechado' | 'Pendente' | 'Rejeitado';
  relatedId?: string; // ID of the paired record (Exit points to Entry)
  justificativa?: JustificativaData;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user: string;
}

export interface SolicitacaoLiberacao {
  id: number;
  cooperado_id: string;
  hospital_id: string;
  data_solicitacao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data_resposta?: string;
  respondido_por?: string;
  observacao?: string;
  created_at: string;
  // Campos JOIN
  cooperado_nome?: string;
  cooperado_cpf?: string;
  hospital_nome?: string;
}

// Interface para Feriados
export interface Feriado {
  data: string; // YYYY-MM-DD
  nome: string;
  tipo: 'nacional' | 'estadual' | 'municipal';
}

// Interface para Parâmetros do Sistema
export interface ParametrosSistema {
  id: string;
  
  // 1. Calendário
  calendario: {
    considerarFinaisDeSemana: boolean;
    considerarFeriados: boolean;
    listaFeriados: Feriado[];
    formatoData: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    formatoHora: '24h' | '12h';
  };

  // 2. Relatórios
  relatorios: {
    camposVisiveis: string[];
    ordenacaoPadrao: Array<{campo: string, ordem: 'asc'|'desc'}>;
    agruparPor: 'cooperado' | 'hospital' | 'setor' | 'data' | 'categoria' | 'nenhum';
    totalizadores: {
      horas: boolean;
      plantoes: boolean;
      porCooperado: boolean;
      porSetor: boolean;
    };
    logoEmpresa?: string;
    cores: {
      primaria: string;
      secundaria: string;
      statusAberto: string;
      statusFechado: string;
    };
    rodape: string;
    assinaturaDigital: boolean;
  };

  // 3. Controle de Ponto
  ponto: {
    toleranciaPareamentoHoras: number;
    exigirCodigoPareamento: boolean;
    permitirMultiplosPlantoesNoDia: boolean;
    setorPredominante: 'entrada' | 'saida' | 'maior_tempo';
    statusAutomatico: boolean;
    exibirRecusadosPorPadrao: boolean;
    confirmarExclusao: boolean;
  };

  // 4. Justificativas
  justificativas: {
    aprovarAutomaticamente: {
      atestadoMedico: boolean;
      faltaJustificada: boolean;
      outros: boolean;
    };
    exigirAnexos: {
      atestado: boolean;
      declaracao: boolean;
      outros: boolean;
    };
    prazoMaximoDias: number;
    notificarCooperado: boolean;
    niveisAprovacao: 1 | 2 | 3;
  };

  // 5. Nomenclatura
  nomenclatura: {
    turnoMatutino: string;
    turnoVespertino: string;
    turnoNoturno: string;
    sufixoFDS: string;
    sufixoFeriado: string;
    termoCooperado: string;
    termoPlantao: string;
  };

  // 6. Dashboard
  dashboard: {
    periodoPadrao: 'hoje' | 'semana' | 'mes' | 'personalizado';
    widgetsVisiveis: string[];
    qtdRegistrosRecentes: number;
  };

  // 7. Categorias
  categorias: {
    ativas: string[];
    exigirRegistroProfissional: {
      medico: boolean;
      enfermeiro: boolean;
      outros: boolean;
    };
    exibirValorHoraPorCategoria: boolean;
  };

  // 8. Validações
  validacoes: {
    intervaloMinimoEntrePlantoes: number;
    cargaHorariaMaximaSemanal: number;
    permitirHorasExtras: boolean;
    percentualHoraExtra: {
      primeira: number;
      adicional: number;
    };
    validarCpf: boolean;
    permitirEditarPontosFechados: boolean;
    auditoriaCompleta: boolean;
  };

  updatedAt: string;
  updatedBy?: string;
}
