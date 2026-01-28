import { neon } from '@neondatabase/serverless';

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const connectionString = env.DATABASE_URL;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
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
    const url = new URL(request.url);
    const cooperadoId = url.searchParams.get('cooperadoId');
    let rows;
    if (cooperadoId) {
      rows = await sql`
        SELECT 
          id, codigo, cooperado_id as "cooperadoId", cooperado_nome as "cooperadoNome",
          date, tipo, entrada, saida, hospital_id as "hospitalId", setor_id as "setorId",
          local, observacao, related_id as "relatedId", status, is_manual as "isManual",
          validado_por as "validadoPor", justificativa,
          biometria_entrada_hash as "biometriaEntradaHash", 
          biometria_saida_hash as "biometriaSaidaHash",
          timestamp, created_at as "createdAt"
        FROM pontos 
        WHERE cooperado_id = ${cooperadoId}
        ORDER BY timestamp DESC
      `;
    } else {
      rows = await sql`
        SELECT 
          id, codigo, cooperado_id as "cooperadoId", cooperado_nome as "cooperadoNome",
          date, tipo, entrada, saida, hospital_id as "hospitalId", setor_id as "setorId",
          local, observacao, related_id as "relatedId", status, is_manual as "isManual",
          validado_por as "validadoPor", justificativa,
          biometria_entrada_hash as "biometriaEntradaHash", 
          biometria_saida_hash as "biometriaSaidaHash",
          timestamp, created_at as "createdAt"
        FROM pontos 
        ORDER BY timestamp DESC
      `;
    }
    return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
};
