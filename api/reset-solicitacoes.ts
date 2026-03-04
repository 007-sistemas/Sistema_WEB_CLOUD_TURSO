import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.DATABASE_URL || '',
  authToken: process.env.DATABASE_AUTH_TOKEN || '',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Dropar tabela antiga
    await turso.execute('DROP TABLE IF EXISTS solicitacoes_liberacao');
    
    // Recriar com tipos corretos
    await turso.execute(`
      CREATE TABLE solicitacoes_liberacao (
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
    
    return res.status(200).json({ 
      message: 'Tabela solicitacoes_liberacao resetada com sucesso!',
      tipos: {
        cooperado_id: 'TEXT',
        hospital_id: 'TEXT'
      }
    });
    
  } catch (error: any) {
    console.error('Erro ao resetar tabela:', error);
    return res.status(500).json({ 
      error: 'Erro ao resetar tabela', 
      details: error.message 
    });
  }
}
