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

  const sql = neon(connectionString);

  try {
    if (request.method === 'GET') {
      await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS matricula text`;
      await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS specialty text`;
      await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS status text`;
      await sql`ALTER TABLE cooperados ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()`;
      const rows = await sql`SELECT id, name, cpf, email, phone, specialty, matricula, status, updated_at FROM cooperados ORDER BY updated_at DESC LIMIT 200`;
      return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (request.method === 'POST') {
      let body: any = {};
      try { body = await request.json(); } catch {}
      const { name, cpf, email, phone } = body;
      if (!name) {
        return new Response(JSON.stringify({ error: 'Missing name' }), { status: 400, headers: corsHeaders });
      }
      const rows = await sql`INSERT INTO cooperados (name, cpf, email, phone) VALUES (${name}, ${cpf}, ${email}, ${phone}) RETURNING id`;
      return new Response(JSON.stringify({ id: rows[0]?.id }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
};
