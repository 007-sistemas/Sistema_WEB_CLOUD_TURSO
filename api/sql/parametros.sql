-- Tabela de Parâmetros do Sistema
-- Armazena configurações globais da aplicação

CREATE TABLE IF NOT EXISTS parametros_sistema (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config TEXT NOT NULL, -- JSON com todos os parâmetros
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT -- ID do gestor que alterou por último
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_parametros_updated_at ON parametros_sistema(updated_at);

-- Comentários explicativos
-- config: JSON completo com todas as configurações (ParametrosSistema sem id, updatedAt, updatedBy)
-- updated_at: Timestamp da última modificação
-- updated_by: ID do manager/gestor que fez a última alteração
