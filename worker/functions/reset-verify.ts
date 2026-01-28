import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const connectionString = env.DATABASE_URL;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!connectionString) {
    return new Response(JSON.stringify({ error: 'Missing DATABASE_URL env var' }), { status: 500, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const sql = neon(connectionString);
    await sql`CREATE TABLE IF NOT EXISTS password_resets (
      id text PRIMARY KEY,
      manager_id text NOT NULL,
      code_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      used boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );`;
    let parsed: any = await request.json();
    const { identifier, code } = parsed || {};
    if (!identifier || !code) {
      return new Response(JSON.stringify({ error: 'identifier e code são obrigatórios' }), { status: 400, headers: corsHeaders });
    }
    const managers = await sql`
      SELECT id, username FROM managers WHERE username = ${identifier} OR email = ${identifier} LIMIT 1
    `;
    if (!managers || managers.length === 0) {
      return new Response(JSON.stringify({ error: 'Código inválido ou expirado' }), { status: 400, headers: corsHeaders });
    }
    // ...continuação da lógica de verificação...
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
};
