-- Criação da tabela managers com campo categoria e unidadesTomador
CREATE TABLE IF NOT EXISTS managers (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT NOT NULL,
  permissoes TEXT NOT NULL,
  preferences TEXT,
  categoria TEXT, -- Nova coluna para categoria do usuário
  unidadesTomador TEXT, -- Nova coluna para ids das unidades (JSON string)
  created_at TEXT DEFAULT (datetime('now'))
);

-- Adicionar colunas em tabela existente (caso já exista)
ALTER TABLE managers ADD COLUMN categoria TEXT;
ALTER TABLE managers ADD COLUMN unidadesTomador TEXT;
