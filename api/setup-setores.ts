import { VercelRequest, VercelResponse } from '@vercel/node';
import { hasDbConfig, sql } from '../services/db.js';

// POST /api/setup-setores { confirm: "SIM" }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!hasDbConfig()) {
    return res.status(500).json({ error: 'Missing DATABASE_URL or DATABASE_AUTH_TOKEN env var' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (req.body?.confirm !== 'SIM') {
    return res.status(400).json({ error: 'Confirmação obrigatória: { confirm: "SIM" }' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS setores_new (
        id INTEGER PRIMARY KEY,
        nome TEXT NOT NULL
      )
    `;

    await sql`
      INSERT INTO setores_new (id, nome)
      SELECT
        CASE
          WHEN TRIM(CAST(id AS TEXT)) = '' THEN NULL
          ELSE CAST(id AS INTEGER)
        END AS id,
        nome
      FROM setores
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS hospital_setores_new (
        hospital_id TEXT REFERENCES hospitals(id) ON DELETE CASCADE,
        setor_id INTEGER REFERENCES setores_new(id) ON DELETE CASCADE,
        PRIMARY KEY (hospital_id, setor_id)
      )
    `;

    await sql`
      INSERT OR IGNORE INTO hospital_setores_new (hospital_id, setor_id)
      SELECT hospital_id, CAST(setor_id AS INTEGER)
      FROM hospital_setores
    `;

    await sql`DROP TABLE IF EXISTS hospital_setores`;
    await sql`DROP TABLE IF EXISTS setores`;

    await sql`ALTER TABLE setores_new RENAME TO setores`;
    await sql`ALTER TABLE hospital_setores_new RENAME TO hospital_setores`;

    await sql`CREATE INDEX IF NOT EXISTS idx_hospital_setores_hospital ON hospital_setores(hospital_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hospital_setores_setor ON hospital_setores(setor_id)`;

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[SETUP-SETOR] Erro:', e);
    return res.status(500).json({ error: e.message });
  }
}
