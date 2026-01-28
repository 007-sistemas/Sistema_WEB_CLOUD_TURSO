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
      await sql`ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS usuario_acesso text`;
      await sql`ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS senha text`;
      await sql`ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS permissoes jsonb`;
      const rows = await sql`SELECT id, nome, slug, usuario_acesso, senha, permissoes FROM hospitals ORDER BY created_at DESC`;
      return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (request.method === 'POST') {
      let body: any = {};
      try { body = await request.json(); } catch {}
      const { id, nome, slug, usuarioAcesso, senha, permissoes } = body;
      if (!id || !nome || !usuarioAcesso || !senha) {
        return new Response(JSON.stringify({ error: 'Campos obrigatórios: id, nome, usuarioAcesso, senha' }), { status: 400, headers: corsHeaders });
      }
      await sql`
        INSERT INTO hospitals (id, nome, slug, usuario_acesso, senha, permissoes, created_at)
        VALUES (
          ${id}, 
          ${nome}, 
          ${slug || nome.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)},
          ${usuarioAcesso},
          ${senha},
          ${JSON.stringify(permissoes || {})},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome,
          slug = EXCLUDED.slug,
          usuario_acesso = EXCLUDED.usuario_acesso,
          senha = EXCLUDED.senha,
          permissoes = EXCLUDED.permissoes
      `;
      return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
};
