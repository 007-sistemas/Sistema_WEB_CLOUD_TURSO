import { sql } from '../services/db';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      // Buscar parâmetros do banco
      const rows = await sql`SELECT * FROM parametros_sistema WHERE id = 'default'`;
      
      if (rows.length === 0) {
        // Sem registro salvo ainda.
        return res.status(200).json(null);
      }
      
      const row = rows[0] as any;
      const parametros = JSON.parse(row.config);
      
      return res.status(200).json({
        ...parametros,
        id: row.id,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by
      });
    } catch (error: any) {
      console.error('[parametros] Erro ao buscar:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      
      if (!body || !body.id) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }

      // Extrair campos que vão para colunas separadas
      const { id, updatedAt, updatedBy, ...config } = body;
      
      // Salvar no banco
      await sql`
        INSERT OR REPLACE INTO parametros_sistema (id, config, updated_at, updated_by)
        VALUES (
          ${id},
          ${JSON.stringify(config)},
          datetime('now'),
          ${updatedBy || null}
        )
      `;
      
      return res.status(200).json({ success: true, id });
    } catch (error: any) {
      console.error('[parametros] Erro ao salvar:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Resetar para padrão (excluir do banco)
      await sql`DELETE FROM parametros_sistema WHERE id = 'default'`;
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[parametros] Erro ao deletar:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
