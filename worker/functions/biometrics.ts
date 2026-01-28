import { neon } from '@neondatabase/serverless';

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    return new Response(JSON.stringify({ error: 'Missing DATABASE_URL env var' }), { status: 500 });
  }
  const sql = neon(connectionString);

  try {
    if (request.method === 'GET') {
      const rows = await sql`SELECT b.id, b.cooperado_id, b.finger_index, b.hash, b.created_at, b.template FROM biometrias b ORDER BY b.created_at DESC LIMIT 100`;
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      let id = url.searchParams.get('id');
      if (!id) {
        try {
          const body = await request.json();
          id = body.id;
        } catch {}
      }
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing biometria id' }), { status: 400 });
      }
      try {
        await sql`DELETE FROM biometrias WHERE id = ${id}`;
        return new Response(null, { status: 204 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500 });
      }
    }
    if (request.method === 'POST') {
      let body: any = {};
      try {
        body = await request.json();
      } catch {}
      const { cooperado_id, template, device_id } = body;
      if (!cooperado_id || !template) {
        return new Response(JSON.stringify({ error: 'Missing cooperado_id or template' }), { status: 400 });
      }
      const rows = await sql`INSERT INTO biometrias (cooperado_id, template, device_id) VALUES (${cooperado_id}, ${template}, ${device_id}) RETURNING id`;
      return new Response(JSON.stringify({ id: rows[0]?.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500 });
  }
};
