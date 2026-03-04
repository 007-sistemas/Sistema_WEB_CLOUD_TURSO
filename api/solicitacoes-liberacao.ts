import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.DATABASE_URL || '',
  authToken: process.env.DATABASE_AUTH_TOKEN || '',
});

const toJsonSafe = <T>(value: T): T => {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? Number(v) : v))
  );
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('[solicitacoes-liberacao] Método:', req.method);

  try {
    // Criar tabela se não existir (silenciosamente)
    try {
      await turso.execute(`
        CREATE TABLE IF NOT EXISTS solicitacoes_liberacao (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cooperado_id TEXT NOT NULL,
          hospital_id TEXT NOT NULL,
          data_solicitacao TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pendente',
          data_resposta TEXT,
          respondido_por TEXT,
          observacao TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (tableError) {
      console.log('[solicitacoes-liberacao] Tabela já existe ou erro ao criar:', tableError);
      // Continuar mesmo se a tabela já existir
    }

    if (req.method === 'GET') {
      // Listar solicitações (com filtro opcional por status)
      const { status, cooperado_id } = req.query;

      const whereClauses: string[] = [];
      const params: any[] = [];

      if (status) {
        whereClauses.push(`status = ?`);
        params.push(status);
      }

      if (cooperado_id) {
        whereClauses.push(`cooperado_id = ?`);
        params.push(cooperado_id);
      }

      const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

      const queryWithJoin = `
        SELECT 
          s.*,
          c.nome as cooperado_nome,
          c.cpf as cooperado_cpf,
          h.nome as hospital_nome
        FROM solicitacoes_liberacao s
        LEFT JOIN cooperados c ON s.cooperado_id = c.id
        LEFT JOIN hospitals h ON s.hospital_id = h.id
        ${whereSql}
        ORDER BY s.created_at DESC
      `;

      try {
        const result = await turso.execute({
          sql: queryWithJoin,
          args: params
        });
        return res.status(200).json(toJsonSafe(result.rows));
      } catch (joinError: any) {
        console.warn('[solicitacoes-liberacao][GET] fallback sem JOIN:', joinError?.message);
        const queryFallback = `
          SELECT *
          FROM solicitacoes_liberacao
          ${whereSql}
          ORDER BY created_at DESC
        `;
        const fallbackResult = await turso.execute({
          sql: queryFallback,
          args: params
        });
        return res.status(200).json(toJsonSafe(fallbackResult.rows));
      }
    }

    if (req.method === 'POST') {
      // Criar nova solicitação
      const { cooperado_id, hospital_id, observacao } = req.body;
      
      console.log('[POST solicitacoes] Recebido:', { cooperado_id, hospital_id, observacao });
      
      if (!cooperado_id || !hospital_id) {
        console.error('[POST solicitacoes] Dados incompletos');
        return res.status(400).json({ 
          error: 'cooperado_id e hospital_id são obrigatórios' 
        });
      }
      
      try {
        // Verificar se já existe solicitação pendente
        const existente = await turso.execute({
          sql: `
            SELECT id FROM solicitacoes_liberacao 
            WHERE cooperado_id = ? 
            AND hospital_id = ? 
            AND status = 'pendente'
          `,
          args: [String(cooperado_id), String(hospital_id)]
        });
        
        console.log('[POST solicitacoes] Verificação duplicata:', existente.rows.length);
        
        if (existente.rows.length > 0) {
          return res.status(400).json({ 
            error: 'Já existe uma solicitação pendente para esta unidade' 
          });
        }
        
        const dataAtual = new Date().toISOString();
        
        console.log('[POST solicitacoes] Criando solicitação:', { cooperado_id, hospital_id, dataAtual });
        
        const result = await turso.execute({
          sql: `
            INSERT INTO solicitacoes_liberacao 
            (cooperado_id, hospital_id, data_solicitacao, status, observacao)
            VALUES (?, ?, ?, 'pendente', ?)
          `,
          args: [String(cooperado_id), String(hospital_id), dataAtual, observacao || null]
        });
        
        console.log('[POST solicitacoes] Solicitação criada com ID:', result.lastInsertRowid);
        
        return res.status(201).json({ 
          success: true,
          message: 'Solicitação criada com sucesso',
          id: result.lastInsertRowid ? Number(result.lastInsertRowid) : null
        });
      } catch (insertError: any) {
        console.error('[POST solicitacoes] Erro ao inserir:', insertError);
        return res.status(500).json({
          error: 'Erro ao criar solicitação no banco de dados',
          details: insertError.message
        });
      }
    }

    if (req.method === 'PUT') {
      // Aprovar/Rejeitar solicitação
      const { id, status, respondido_por, observacao } = req.body;
      
      if (!id || !status || !respondido_por) {
        return res.status(400).json({ 
          error: 'id, status e respondido_por são obrigatórios' 
        });
      }
      
      if (!['aprovado', 'rejeitado'].includes(status)) {
        return res.status(400).json({ 
          error: 'status deve ser "aprovado" ou "rejeitado"' 
        });
      }
      
      // Buscar dados da solicitação
      const solicitacao = await turso.execute({
        sql: `SELECT cooperado_id, hospital_id FROM solicitacoes_liberacao WHERE id = ?`,
        args: [id]
      });
      
      if (solicitacao.rows.length === 0) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }
      
      const { cooperado_id, hospital_id } = solicitacao.rows[0];
      const dataResposta = new Date().toISOString();
      
      // Atualizar status da solicitação
      await turso.execute({
        sql: `
          UPDATE solicitacoes_liberacao 
          SET status = ?, 
              data_resposta = ?, 
              respondido_por = ?,
              observacao = ?
          WHERE id = ?
        `,
        args: [status, dataResposta, respondido_por, observacao || null, id]
      });
      
      // Se aprovado, adicionar unidade às autorizadas do cooperado
      if (status === 'aprovado') {
        // Buscar unidades atuais
        const cooperadoResult = await turso.execute({
          sql: `SELECT unidades_justificativa FROM cooperados WHERE id = ?`,
          args: [cooperado_id]
        });
        
        if (cooperadoResult.rows.length > 0) {
          let unidadesAtuais: string[] = [];
          const unidadesStr = cooperadoResult.rows[0].unidades_justificativa;
          
          if (unidadesStr) {
            try {
              unidadesAtuais = JSON.parse(unidadesStr as string);
              // Garantir que é array de strings
              if (!Array.isArray(unidadesAtuais)) {
                unidadesAtuais = [];
              }
            } catch {
              unidadesAtuais = [];
            }
          }
          
          // Adicionar nova unidade se não existir
          const hospitalIdStr = String(hospital_id);
          if (!unidadesAtuais.includes(hospitalIdStr)) {
            unidadesAtuais.push(hospitalIdStr);
            
            await turso.execute({
              sql: `UPDATE cooperados SET unidades_justificativa = ? WHERE id = ?`,
              args: [JSON.stringify(unidadesAtuais), cooperado_id]
            });
          }
        }
      }
      
      return res.status(200).json({ 
        message: `Solicitação ${status} com sucesso` 
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });
    
  } catch (error: any) {
    console.error('Erro na API de solicitações:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar solicitação', 
      details: error.message 
    });
  }
}
