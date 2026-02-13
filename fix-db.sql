-- Migração Turso: ajustar setores.id para INTEGER PRIMARY KEY
-- 1) Criar tabela nova com id INTEGER
CREATE TABLE IF NOT EXISTS setores_new (
	id INTEGER PRIMARY KEY,
	nome TEXT NOT NULL
);

-- 2) Copiar dados, convertendo id para inteiro quando possível
INSERT INTO setores_new (id, nome)
SELECT
	CASE
		WHEN TRIM(CAST(id AS TEXT)) = '' THEN NULL
		ELSE CAST(id AS INTEGER)
	END AS id,
	nome
FROM setores;

-- 3) Recriar hospital_setores apontando para a nova tabela
CREATE TABLE IF NOT EXISTS hospital_setores_new (
	hospital_id TEXT REFERENCES hospitals(id) ON DELETE CASCADE,
	setor_id INTEGER REFERENCES setores_new(id) ON DELETE CASCADE,
	PRIMARY KEY (hospital_id, setor_id)
);

INSERT OR IGNORE INTO hospital_setores_new (hospital_id, setor_id)
SELECT hospital_id, CAST(setor_id AS INTEGER)
FROM hospital_setores;

-- 4) Substituir tabelas antigas
DROP TABLE IF EXISTS hospital_setores;
DROP TABLE IF EXISTS setores;

ALTER TABLE setores_new RENAME TO setores;
ALTER TABLE hospital_setores_new RENAME TO hospital_setores;

-- 5) Índices úteis
CREATE INDEX IF NOT EXISTS idx_hospital_setores_hospital ON hospital_setores(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_setores_setor ON hospital_setores(setor_id);

-- Cooperados: habilitar coluna producao_por_cpf
ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS producao_por_cpf TEXT DEFAULT 'Não';

-- Garantir indice unico para cooperados.id (UPSERTs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cooperados_id ON cooperados(id);
