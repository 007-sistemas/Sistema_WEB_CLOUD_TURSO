import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');
const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const connectionString = env.DATABASE_URL;
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const FROM_EMAIL = env.RESET_FROM_EMAIL || 'no-reply@idev.app';
  const SMTP_HOST = env.SMTP_HOST;
  const SMTP_PORT = env.SMTP_PORT ? parseInt(env.SMTP_PORT) : 465;
  const SMTP_USER = env.SMTP_USER;
  const SMTP_PASS = env.SMTP_PASS;
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
    const body = await request.json();
    // ...aqui você adapta o restante do handler, incluindo envio de email...
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
};
