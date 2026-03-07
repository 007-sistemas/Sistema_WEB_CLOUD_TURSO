# 📋 Análise Completa - Sistema de Parâmetros

## 🎯 Visão Geral
Após análise detalhada de todo o sistema, identifiquei **8 categorias principais** com **47 parâmetros** que podem ser configurados pelo gestor.

---

## 1️⃣ CALENDÁRIO E DATAS

### 1.1 Finais de Semana
- **Parâmetro**: `considerarFinaisDeSemana`
- **Tipo**: `boolean`
- **Descrição**: Define se relatórios devem incluir sábados e domingos
- **Impacto**: 
  - Relatórios de Produção
  - Dashboard (estatísticas)
  - Exportações (PDF/Excel)
- **Sufixo sugerido**: `FDS` (ex: MT FDS, Noturno FDS)

### 1.2 Feriados
- **Parâmetro**: `considerarFeriados`
- **Tipo**: `boolean`
- **Descrição**: Define se relatórios devem considerar feriados
- **Impacto**: 
  - Cálculo de horas trabalhadas
  - Nomenclatura de turnos
  - Relatórios consolidados
- **Sufixo sugerido**: `F` (ex: MT F, Diurno F)

### 1.3 Lista de Feriados
- **Parâmetro**: `listaFeriados`
- **Tipo**: `array<{data: string, nome: string, tipo: 'nacional'|'estadual'|'municipal'}>`
- **Descrição**: Cadastro de feriados personalizados por região
- **Exemplo**:
  ```json
  [
    {"data": "2026-01-01", "nome": "Ano Novo", "tipo": "nacional"},
    {"data": "2026-09-07", "nome": "Independência", "tipo": "nacional"},
    {"data": "2026-03-25", "nome": "Aniversário da Cidade", "tipo": "municipal"}
  ]
  ```

### 1.4 Formato de Data
- **Parâmetro**: `formatoData`
- **Tipo**: `'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'`
- **Descrição**: Formato de exibição de datas no sistema
- **Impacto**: Todas as telas e relatórios

### 1.5 Formato de Hora
- **Parâmetro**: `formatoHora`
- **Tipo**: `'24h' | '12h'`
- **Descrição**: Formato de exibição de horários (24h ou AM/PM)
- **Impacto**: Registros de ponto, relatórios

---

## 2️⃣ RELATÓRIOS E EXPORTAÇÕES

### 2.1 Campos Visíveis no Relatório
- **Parâmetro**: `camposRelatorio`
- **Tipo**: `array<string>`
- **Descrição**: Define quais colunas aparecem no relatório
- **Opções disponíveis**:
  - `cooperadoNome`
  - `matricula`
  - `cpf`
  - `categoriaProfissional`
  - `hospital`
  - `setor`
  - `data`
  - `diaSemana`
  - `entrada`
  - `saida`
  - `totalHoras`
  - `turno` (MT, N, T)
  - `status`
  - `observacao`
  - `validadoPor`
  - `codigo`

### 2.2 Ordenação Padrão
- **Parâmetro**: `ordenacaoPadraoRelatorio`
- **Tipo**: `array<{campo: string, ordem: 'asc'|'desc'}>`
- **Descrição**: Define ordenação padrão dos relatórios
- **Exemplo atual**: 
  - 1º: Nome (asc)
  - 2º: Data (asc)
  - 3º: Entrada (asc)

### 2.3 Agrupamento de Dados
- **Parâmetro**: `agruparRelatorioPor`
- **Tipo**: `'cooperado' | 'hospital' | 'setor' | 'data' | 'categoria' | 'nenhum'`
- **Descrição**: Como agrupar dados no relatório
- **Impacto**: Visual do PDF/Excel

### 2.4 Exibir Totalizadores
- **Parâmetro**: `exibirTotalizadores`
- **Tipo**: `{horas: boolean, plantoes: boolean, porCooperado: boolean, porSetor: boolean}`
- **Descrição**: Quais totalizadores exibir no rodapé do relatório

### 2.5 Logo da Empresa
- **Parâmetro**: `logoEmpresa`
- **Tipo**: `string (base64 ou URL)`
- **Descrição**: Logo para aparecer nos relatórios PDF
- **Impacto**: Cabeçalho de PDFs

### 2.6 Cores do Relatório
- **Parâmetro**: `coresRelatorio`
- **Tipo**: `{primaria: string, secundaria: string, status: {aberto: string, fechado: string}}`
- **Descrição**: Personalização de cores nos relatórios
- **Padrão atual**: Roxo (`#6A1B9A`)

### 2.7 Rodapé Personalizado
- **Parâmetro**: `rodapeRelatorio`
- **Tipo**: `string`
- **Descrição**: Texto customizado no rodapé de relatórios
- **Exemplo**: "Este documento é confidencial - iDev Sistemas © 2026"

### 2.8 Incluir Assinatura Digital
- **Parâmetro**: `incluirAssinaturaDigital`
- **Tipo**: `boolean`
- **Descrição**: Adiciona hash/código de verificação no PDF

---

## 3️⃣ CONTROLE DE PONTO

### 3.1 Tolerância Global de Pareamento
- **Parâmetro**: `toleranciaPareamentoHoras`
- **Tipo**: `number (horas)`
- **Descrição**: Janela máxima para parear ENTRADA com SAÍDA
- **Padrão atual**: 24 horas

### 3.2 Exigir Código de Pareamento
- **Parâmetro**: `exigirCodigoPareamento`
- **Tipo**: `boolean`
- **Descrição**: Se deve validar código para parear entrada/saída
- **Impacto**: Lógica de pareamento mais restritiva

### 3.3 Permitir Múltiplas Entradas/Saídas no Mesmo Dia
- **Parâmetro**: `permitirMultiplosPlantoesNoDia`
- **Tipo**: `boolean`
- **Descrição**: Se cooperado pode ter mais de um plantão no mesmo dia
- **Impacto**: Validações de registro

### 3.4 Setor Predominante
- **Parâmetro**: `setorPredominante`
- **Tipo**: `'entrada' | 'saida' | 'maior_tempo'`
- **Descrição**: Qual setor deve prevalecer quando entrada/saída em setores diferentes
- **Implementado**: Atualmente usa SAÍDA

### 3.5 Status Automático
- **Parâmetro**: `definirStatusAutomatico`
- **Tipo**: `boolean`
- **Descrição**: Se status deve ser calculado automaticamente ou manual
- **Lógica atual**: Fechado quando tem saída pareada

### 3.6 Exibir Pontos Recusados
- **Parâmetro**: `exibirPontosRecusadosPorPadrao`
- **Tipo**: `boolean`
- **Descrição**: Se pontos recusados aparecem na lista inicial
- **Padrão atual**: Ocultos por padrão (toggle disponível)

### 3.7 Confirmação de Exclusão
- **Parâmetro**: `exigirConfirmacaoExclusao`
- **Tipo**: `boolean`
- **Descrição**: Exigir confirmação modal antes de excluir registros

---

## 4️⃣ JUSTIFICATIVAS E APROVAÇÕES

### 4.1 Aprovação Automática em Casos Específicos
- **Parâmetro**: `aprovarAutomaticamente`
- **Tipo**: `{atestadoMedico: boolean, faltaJustificada: boolean, outros: boolean}`
- **Descrição**: Quais tipos de justificativa são aprovados automaticamente

### 4.2 Exigir Anexos
- **Parâmetro**: `exigirAnexos`
- **Tipo**: `{atestado: boolean, declaracao: boolean, outros: boolean}`
- **Descrição**: Obrigar anexo de documentos em justificativas
- **Status**: **Não implementado** (oportunidade futura)

### 4.3 Prazo para Justificativa
- **Parâmetro**: `prazoMaximoJustificativaDias`
- **Tipo**: `number`
- **Descrição**: Quantos dias após o plantão é possível justificar
- **Exemplo**: 7 dias

### 4.4 Notificações de Aprovação
- **Parâmetro**: `notificarCooperadoAposAprovacao`
- **Tipo**: `boolean`
- **Descrição**: Enviar notificação quando justificativa for aprovada/rejeitada

### 4.5 Níveis de Aprovação
- **Parâmetro**: `niveisAprovacao`
- **Tipo**: `1 | 2 | 3`
- **Descrição**: Quantos níveis de aprovação são necessários
- **Exemplo**: 1 = gestor / 2 = gestor + RH / 3 = gestor + RH + diretoria

---

## 5️⃣ NOMENCLATURA E TERMINOLOGIA

### 5.1 Nome do Turno Matutino
- **Parâmetro**: `nomeTurnoMatutino`
- **Tipo**: `string`
- **Padrão**: "MT"
- **Alternativas**: "Manhã", "Diurno Manhã", "M"

### 5.2 Nome do Turno Vespertino
- **Parâmetro**: `nomeTurnoVespertino`
- **Tipo**: `string`
- **Padrão**: "T"
- **Alternativas**: "Tarde", "Vespertino", "V"

### 5.3 Nome do Turno Noturno
- **Parâmetro**: `nomeTurnoNoturno`
- **Tipo**: `string`
- **Padrão**: "N"
- **Alternativas**: "Noturno", "Noite"

### 5.4 Sufixo de Final de Semana
- **Parâmetro**: `sufixoFinalDeSemana`
- **Tipo**: `string`
- **Padrão**: "FDS"
- **Alternativas**: "FS", "WEEKEND", "SAB/DOM"

### 5.5 Sufixo de Feriado
- **Parâmetro**: `sufixoFeriado`
- **Tipo**: `string`
- **Padrão**: "F"
- **Alternativas**: "FER", "FERIADO"

### 5.6 Termo para "Cooperado"
- **Parâmetro**: `termoCooperado`
- **Tipo**: `string`
- **Padrão**: "Cooperado"
- **Alternativas**: "Profissional", "Colaborador", "Médico", "Funcionário"

### 5.7 Termo para "Plantão"
- **Parâmetro**: `termoPlantao`
- **Tipo**: `string`
- **Padrão**: "Plantão"
- **Alternativas**: "Turno", "Jornada", "Expediente"

---

## 6️⃣ DASHBOARD E VISUALIZAÇÃO

### 6.1 Período Padrão do Dashboard
- **Parâmetro**: `periodoDashboard`
- **Tipo**: `'hoje' | 'semana' | 'mes' | 'personalizado'`
- **Descrição**: Período inicial ao abrir o dashboard

### 6.2 Widgets Visíveis
- **Parâmetro**: `widgetsDashboard`
- **Tipo**: `array<'registrosHoje' | 'cooperadosAtivos' | 'plantoesMes' | 'graficoSemanal' | 'ultimosRegistros'>`
- **Descrição**: Quais cards/gráficos aparecem no dashboard

### 6.3 Quantidade de Registros Recentes
- **Parâmetro**: `qtdRegistrosRecentesDashboard`
- **Tipo**: `number`
- **Padrão**: 10

### 6.4 Cor Primária do Sistema
- **Parâmetro**: `corPrimaria`
- **Tipo**: `string (hex)`
- **Implementado**: Atualmente em UserPreferences
- **Padrão**: `#7c3aed` (roxo)

### 6.5 Tema do Sistema
- **Parâmetro**: `tema`
- **Tipo**: `'light' | 'dark' | 'auto'`
- **Implementado**: Atualmente em UserPreferences

---

## 7️⃣ CATEGORIAS E PROFISSÕES

### 7.1 Categorias Profissionais Ativas
- **Parâmetro**: `categoriasAtivas`
- **Tipo**: `array<string>`
- **Descrição**: Quais categorias podem ser cadastradas
- **Padrão atual**: 
  - Médico
  - Enfermeiro
  - Técnico de Enfermagem
  - Fisioterapeuta
  - Nutricionista
  - Psicólogo
  - Assistente Social

### 7.2 Exigir CRM/COREN
- **Parâmetro**: `exigirRegistroProfissional`
- **Tipo**: `{medico: boolean, enfermeiro: boolean, outros: boolean}`
- **Descrição**: Obrigar preenchimento de número de registro profissional

### 7.3 Valor/Hora por Categoria
- **Parâmetro**: `exibirValorHoraPorCategoria`
- **Tipo**: `boolean`
- **Descrição**: Se sistema deve gerenciar valores diferentes por categoria
- **Implementado**: Atualmente em TurnoUnidade

---

## 8️⃣ VALIDAÇÕES E REGRAS DE NEGÓCIO

### 8.1 Intervalo Mínimo entre Plantões
- **Parâmetro**: `intervaloMinimoEntrePlantoes`
- **Tipo**: `number (horas)`
- **Descrição**: Tempo mínimo de descanso entre fim de um plantão e início do próximo
- **Exemplo**: 11 horas (CLT)

### 8.2 Carga Horária Máxima Semanal
- **Parâmetro**: `cargaHorariaMaximaSemanal`
- **Tipo**: `number (horas)`
- **Descrição**: Alertar quando cooperado ultrapassar limite semanal
- **Exemplo**: 44 horas

### 8.3 Permitir Horas Extras
- **Parâmetro**: `permitirHorasExtras`
- **Tipo**: `boolean`
- **Descrição**: Se sistema deve calcular/exibir horas extras

### 8.4 Percentual de Hora Extra
- **Parâmetro**: `percentualHoraExtra`
- **Tipo**: `{primeira: number, adicional: number}`
- **Descrição**: Multiplicador para cálculo de horas extras
- **Exemplo**: `{primeira: 1.5, adicional: 2.0}`

### 8.5 Validar CPF
- **Parâmetro**: `validarCpf`
- **Tipo**: `boolean`
- **Descrição**: Se deve validar dígitos verificadores do CPF

### 8.6 Permitir Edição de Pontos Fechados
- **Parâmetro**: `permitirEditarPontosFechados`
- **Tipo**: `boolean`
- **Descrição**: Se gestores podem editar plantões já fechados/validados

### 8.7 Auditoria Obrigatória
- **Parâmetro**: `registrarAuditoriaCompleta`
- **Tipo**: `boolean`
- **Descrição**: Registrar todas as ações no log de auditoria (pode impactar performance)

---

## 📊 ESTRUTURA DE IMPLEMENTAÇÃO

### Interface TypeScript Sugerida

```typescript
export interface ParametrosSistema {
  // 1. Calendário
  calendario: {
    considerarFinaisDeSemana: boolean;
    considerarFeriados: boolean;
    listaFeriados: Array<{
      data: string;
      nome: string;
      tipo: 'nacional' | 'estadual' | 'municipal';
    }>;
    formatoData: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    formatoHora: '24h' | '12h';
  };

  // 2. Relatórios
  relatorios: {
    camposVisiveis: string[];
    ordenacaoPadrao: Array<{campo: string, ordem: 'asc'|'desc'}>;
    agruparPor: 'cooperado' | 'hospital' | 'setor' | 'data' | 'nenhum';
    totalizadores: {
      horas: boolean;
      plantoes: boolean;
      porCooperado: boolean;
      porSetor: boolean;
    };
    logoEmpresa: string;
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
}
```

---

## 🎨 PREVIEW DO RELATÓRIO EM TEMPO REAL

### Implementação Sugerida

1. **Componente de Preview**:
   - Dividir tela em 50/50 (parâmetros à esquerda, preview à direita)
   - Uso de `iframe` ou `canvas` para renderizar miniatura do PDF
   - Atualização em tempo real (debounce de 500ms)

2. **Dados de Exemplo**:
   - Usar 3-5 registros fictícios para preview
   - Aplicar todos os parâmetros selecionados
   - Mostrar como ficará cada seção

3. **Toggle de Visualização**:
   - Botões: "PDF" | "Excel" | "Tela"
   - Alternar entre visualizações

---

## 🚀 PRIORIZAÇÃO SUGERIDA

### Fase 1 (MVP) - 2 semanas
- ✅ Calendário (finais de semana e feriados com sufixos)
- ✅ Campos visíveis no relatório
- ✅ Nomenclatura de turnos
- ✅ Preview básico do relatório

### Fase 2 - 3 semanas
- ✅ Cores e logo personalizadas
- ✅ Ordenação e agrupamento
- ✅ Validações de negócio
- ✅ Dashboard configurável

### Fase 3 - 2 semanas
- ✅ Justificativas automáticas
- ✅ Níveis de aprovação
- ✅ Horas extras
- ✅ Anexos de documentos

---

## 📁 ESTRUTURA DE ARQUIVOS

```
views/
  ├── Parametros.tsx           # Tela principal
  └── Parametros/
      ├── SecaoCalendario.tsx
      ├── SecaoRelatorios.tsx
      ├── SecaoControle.tsx
      ├── SecaoJustificativas.tsx
      ├── SecaoNomenclatura.tsx
      ├── SecaoDashboard.tsx
      ├── SecaoCategorias.tsx
      ├── SecaoValidacoes.tsx
      └── PreviewRelatorio.tsx  # Preview em tempo real

services/
  └── parametros.ts            # Service para carregar/salvar

types.ts
  └── interface ParametrosSistema

api/
  └── parametros.ts            # Endpoint para persistir no Turso
```

---

## 💾 PERSISTÊNCIA

### LocalStorage (Cache)
```typescript
const PARAMETROS_KEY = 'biohealth_parametros';
```

### Turso (Persistência)
```sql
CREATE TABLE parametros_sistema (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config TEXT NOT NULL, -- JSON com todos os parâmetros
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT -- ID do gestor que alterou
);
```

---

## 🎯 BENEFÍCIOS

1. **Flexibilidade**: Cada cooperativa adapta o sistema à sua realidade
2. **Conformidade**: Atende diferentes legislações trabalhistas
3. **UX Personalizada**: Terminologia familiar ao usuário
4. **Escalabilidade**: Novos parâmetros facilmente adicionados
5. **Auditoria**: Histórico de quem alterou o quê

---

## ⚠️ ATENÇÃO

- Parâmetros críticos devem ter **validação de integridade**
- Criar **valores padrão sensatos** para primeiro acesso
- Permitir **reset para padrão de fábrica**
- Implementar **versionamento de configurações**
- Adicionar **mensagens de confirmação** em mudanças críticas

---

**Documento gerado em**: 06/03/2026  
**Versão**: 1.0  
**Autor**: Análise automatizada do sistema iDev
