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
    if (request.method === 'POST') {
      let body: any = {};
      try { body = await request.json(); } catch {}
      const { nome } = body;
      if (!nome) return new Response(JSON.stringify({ error: 'nome obrigatório' }), { status: 400, headers: corsHeaders });
      const inserted = await sql`
        INSERT INTO setores (nome) 
        VALUES (${nome})
        RETURNING id, nome
      `;
      return new Response(JSON.stringify(inserted[0]), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (request.method === 'GET') {
      const result = await sql`SELECT id, nome FROM setores ORDER BY nome ASC`;
      return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (request.method === 'PUT') {
      let body: any = {};
      try { body = await request.json(); } catch {}
      const { id, nome } = body;
      if (!id || !nome) return new Response(JSON.stringify({ error: 'id e nome obrigatórios' }), { status: 400, headers: corsHeaders });
      await sql`UPDATE setores SET nome = ${nome} WHERE id = ${id}`;
      const updated = await sql`SELECT id, nome FROM setores WHERE id = ${id}`;
      return new Response(JSON.stringify(updated[0]), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (!id) return new Response(JSON.stringify({ error: 'id obrigatório' }), { status: 400, headers: corsHeaders });
      await sql`DELETE FROM hospital_setores WHERE setor_id = ${id}`;
      await sql`DELETE FROM setores WHERE id = ${id}`;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
};
