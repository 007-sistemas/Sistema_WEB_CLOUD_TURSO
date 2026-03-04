import type { VercelRequest, VercelResponse } from "@vercel/node";
import { hasDbConfig, sql } from "../services/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  if (!hasDbConfig()) {
    res.status(500).json({ error: "Missing DATABASE_URL or DATABASE_AUTH_TOKEN env var" });
    return;
  }

  try {
    if (req.method === "GET") {
      // Garantir colunas esperadas em bases antigas
      try { await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS matricula text`; } catch {}
      try { await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS specialty text`; } catch {}
      try { await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS status text`; } catch {}
      try { await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS producao_por_cpf text DEFAULT 'Não'`; } catch {}
      try { await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS unidades_justificativa text DEFAULT '[]'`; } catch {}
      try { await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS updated_at text DEFAULT CURRENT_TIMESTAMP`; } catch {}
      try { await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_cooperados_id ON cooperados(id)`; } catch {}

      let rows: any[] = [];
      try {
        rows = await sql`SELECT id, name, cpf, email, phone, specialty, matricula, status, producao_por_cpf, unidades_justificativa, updated_at FROM cooperados ORDER BY updated_at DESC LIMIT 200`;
      } catch {
        rows = await sql`SELECT id, name, cpf, email, phone, specialty, matricula, status, producao_por_cpf, unidades_justificativa, updated_at FROM cooperados LIMIT 200`;
      }
      res.status(200).json(rows);
      return;
    }

    if (req.method === "POST") {
      const { name, cpf, email, phone, producaoPorCpf, specialty } = req.body || {};
      if (!name) {
        res.status(400).json({ error: "Missing name" });
        return;
      }
      // Validação de profissão
      if (specialty) {
        const profRows = await sql`SELECT 1 FROM professions WHERE name = ${specialty}`;
        if (!profRows.length) {
          res.status(400).json({ error: "Profissão inválida" });
          return;
        }
      }
      const flag = producaoPorCpf === 'Sim' ? 'Sim' : 'Não';
      const rows = await sql`
        INSERT INTO cooperados (name, cpf, email, phone, specialty, producao_por_cpf)
        VALUES (${name}, ${cpf}, ${email}, ${phone}, ${specialty || null}, ${flag})
        RETURNING id
      `;
      res.status(201).json({ id: rows[0]?.id });
      return;
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const id = body.id;
      const name = body.name || body.nome;
      const cpf = body.cpf;
      const email = body.email;
      const phone = body.phone || body.telefone;
      const specialty = body.specialty || body.categoriaProfissional;
      const matricula = body.matricula;
      const status = body.status || 'ATIVO';
      const producaoPorCpf = body.producaoPorCpf === 'Sim' || body.producao_por_cpf === 'Sim' ? 'Sim' : 'Não';
      const unidadesJustificativa = body.unidadesJustificativa || [];

      if (!id || !name) {
        res.status(400).json({ error: "Missing id or name" });
        return;
      }
      // Validação de profissão
      if (specialty) {
        const profRows = await sql`SELECT 1 FROM professions WHERE name = ${specialty}`;
        if (!profRows.length) {
          res.status(400).json({ error: "Profissão inválida" });
          return;
        }
      }

      await sql`
        INSERT INTO cooperados (
          id, name, cpf, email, phone, specialty, matricula, status, producao_por_cpf, unidades_justificativa, updated_at
        )
        VALUES (
          ${id}, ${name}, ${cpf || null}, ${email || null}, ${phone || null},
          ${specialty || null}, ${matricula || null}, ${status}, ${producaoPorCpf}, ${JSON.stringify(unidadesJustificativa)}, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          name = ${name},
          cpf = ${cpf || null},
          email = ${email || null},
          phone = ${phone || null},
          specialty = ${specialty || null},
          matricula = ${matricula || null},
          status = ${status},
          producao_por_cpf = ${producaoPorCpf},
          unidades_justificativa = ${JSON.stringify(unidadesJustificativa)},
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      res.status(200).json({ ok: true, id });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
}
