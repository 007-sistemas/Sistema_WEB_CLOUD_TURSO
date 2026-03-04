// Cloudflare Pages Function
import { createClient } from '@libsql/client';

const jsonResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data, (_, value) => (typeof value === 'bigint' ? Number(value) : value)),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  const turso = createClient({
    url: env.DATABASE_URL || '',
    authToken: env.DATABASE_AUTH_TOKEN || '',
  });
  
  console.log('[Cloudflare] POST /api/solicitacoes-liberacao');
  
  try {
    // Criar tabela se não existir
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
      console.log('[Cloudflare] Tabela já existe');
    }
    
    const body = await request.json();
    const { cooperado_id, hospital_id, observacao } = body;
    
    console.log('[Cloudflare] Dados recebidos:', { cooperado_id, hospital_id });
    
    if (!cooperado_id || !hospital_id) {
      return jsonResponse({ 
        error: 'cooperado_id e hospital_id são obrigatórios' 
      }, 400);
    }
    
    // Verificar duplicata
    const existente = await turso.execute({
      sql: `SELECT id FROM solicitacoes_liberacao WHERE cooperado_id = ? AND hospital_id = ? AND status = 'pendente'`,
      args: [String(cooperado_id), String(hospital_id)]
    });
    
    if (existente.rows.length > 0) {
      return jsonResponse({ 
        error: 'Já existe uma solicitação pendente para esta unidade' 
      }, 400);
    }
    
    const dataAtual = new Date().toISOString();
    
    const result = await turso.execute({
      sql: `INSERT INTO solicitacoes_liberacao (cooperado_id, hospital_id, data_solicitacao, status, observacao) VALUES (?, ?, ?, 'pendente', ?)`,
      args: [String(cooperado_id), String(hospital_id), dataAtual, observacao || null]
    });
    
    const insertId = result.lastInsertRowid ? Number(result.lastInsertRowid) : null;
    console.log('[Cloudflare] Solicitação criada:', insertId);
    
    return jsonResponse({ 
      success: true,
      message: 'Solicitação criada com sucesso',
      id: insertId 
    }, 201);
    
  } catch (error: any) {
    console.error('[Cloudflare] Erro:', error);
    return jsonResponse({ 
      error: 'Erro ao processar solicitação',
      details: error.message 
    }, 500);
  }
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  
  const turso = createClient({
    url: env.DATABASE_URL || '',
    authToken: env.DATABASE_AUTH_TOKEN || '',
  });
  
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const cooperado_id = url.searchParams.get('cooperado_id');

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
      const result = await turso.execute({ sql: queryWithJoin, args: params });
      return jsonResponse(result.rows);
    } catch (joinError: any) {
      console.warn('[Cloudflare] GET solicitacoes: fallback sem JOIN:', joinError?.message);
      const queryFallback = `
        SELECT *
        FROM solicitacoes_liberacao
        ${whereSql}
        ORDER BY created_at DESC
      `;
      const fallbackResult = await turso.execute({ sql: queryFallback, args: params });
      return jsonResponse(fallbackResult.rows);
    }
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500);
  }
}

export async function onRequestPut(context: any) {
  const { request, env } = context;
  
  const turso = createClient({
    url: env.DATABASE_URL || '',
    authToken: env.DATABASE_AUTH_TOKEN || '',
  });
  
  try {
    const body = await request.json();
    const { id, status, respondido_por, observacao } = body;
    
    if (!id || !status || !respondido_por) {
      return jsonResponse({ 
        error: 'id, status e respondido_por são obrigatórios' 
      }, 400);
    }
    
    // Buscar solicitação
    const solicitacao = await turso.execute({
      sql: `SELECT cooperado_id, hospital_id FROM solicitacoes_liberacao WHERE id = ?`,
      args: [id]
    });
    
    if (solicitacao.rows.length === 0) {
      return jsonResponse({ error: 'Solicitação não encontrada' }, 404);
    }
    
    const { cooperado_id, hospital_id } = solicitacao.rows[0];
    const dataResposta = new Date().toISOString();
    
    // Atualizar solicitação
    await turso.execute({
      sql: `UPDATE solicitacoes_liberacao SET status = ?,data_resposta = ?, respondido_por = ?, observacao = ? WHERE id = ?`,
      args: [status, dataResposta, respondido_por, observacao || null, id]
    });
    
    // Se aprovado, adicionar à lista de autorizados
    if (status === 'aprovado') {
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
            if (!Array.isArray(unidadesAtuais)) unidadesAtuais = [];
          } catch {
            unidadesAtuais = [];
          }
        }
        
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
    
    return jsonResponse({ 
      message: `Solicitação ${status} com sucesso` 
    });
    
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500);
  }
}
