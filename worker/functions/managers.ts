import { neon } from '@neondatabase/serverless';

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const connectionString = env.DATABASE_URL;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!connectionString) {
    return new Response(JSON.stringify({ error: 'Missing DATABASE_URL env var' }), { status: 500, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const sql = neon(connectionString);
    await sql`ALTER TABLE managers ADD COLUMN IF NOT EXISTS cpf text`;
    await sql`ALTER TABLE managers ADD COLUMN IF NOT EXISTS email text`;
    await sql`ALTER TABLE managers ADD COLUMN IF NOT EXISTS permissoes jsonb DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE managers ADD COLUMN IF NOT EXISTS preferences jsonb`;
    const rows = await sql`SELECT id, username, password, cpf, email, permissoes, preferences FROM managers ORDER BY created_at DESC`;
    return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
};
