import { hasDbConfig, sql } from '../../services/db.js';
import { applyEnv } from './_vercel-adapter';

type EnvVars = Record<string, string | undefined>;

type EmailResult = {
  sent: boolean;
  resend?: boolean;
  reason?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const jsonResponse = (data: any, status = 200, headers?: HeadersInit) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(headers || {}),
    },
  });
};

const hashCode = async (code: string) => {
  const data = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

async function sendEmail(to: string, code: string, username: string, env: EnvVars): Promise<EmailResult> {
  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) {
    return { sent: false, reason: 'No email provider configured' };
  }

  const fromEmail = env.RESET_FROM_EMAIL || 'no-reply@idev.app';
  const fromCandidate = (!fromEmail || fromEmail.endsWith('@gmail.com'))
    ? 'onboarding@resend.dev'
    : fromEmail;

  const payload = {
    from: fromCandidate,
    to,
    subject: 'Idev - Codigo de redefinicao de senha',
    text: `Ola ${username},\n\nUse este codigo para redefinir sua senha: ${code}\nEle expira em 15 minutos.\n\nSe nao foi voce, ignore este email.`,
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    return { sent: false, reason: text };
  }

  return { sent: true, resend: true };
}

async function ensureResetTable() {
  await sql`CREATE TABLE IF NOT EXISTS password_resets (
    id text PRIMARY KEY,
    manager_id text NOT NULL,
    code_hash text NOT NULL,
    expires_at text NOT NULL,
    used boolean DEFAULT false,
    created_at text DEFAULT CURRENT_TIMESTAMP
  );`;
}

export const onRequest = async (context: any) => {
  applyEnv(context.env || {});

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!hasDbConfig()) {
    return jsonResponse({ error: 'Missing DATABASE_URL or DATABASE_AUTH_TOKEN env var' }, 500);
  }

  if (context.request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let parsed: any = null;
  try {
    parsed = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  try {
    await ensureResetTable();

    const action = parsed?.action;
    if (!action) {
      return jsonResponse({ error: 'action e obrigatorio' }, 400);
    }

    if (action === 'request') {
      const { identifier } = parsed || {};
      if (!identifier) return jsonResponse({ error: 'identifier e obrigatorio (usuario ou email)' }, 400);

      const managers = await sql`
        SELECT id, username, email FROM managers
        WHERE username = ${identifier} OR email = ${identifier}
        LIMIT 1
      `;

      if (!managers || managers.length === 0) {
        return jsonResponse({ ok: true, message: 'Se existir, o codigo foi enviado.' }, 200);
      }

      const manager = managers[0];
      const recentResets = await sql`
        SELECT id, created_at, expires_at, used FROM password_resets
        WHERE manager_id = ${manager.id}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (recentResets && recentResets.length > 0) {
        const last = recentResets[0] as any;
        const createdAt = new Date(last.created_at);
        const ageMs = Date.now() - createdAt.getTime();
        const cooldownMs = 2 * 60 * 1000;
        if (!last.used && ageMs < cooldownMs) {
          const retrySeconds = Math.ceil((cooldownMs - ageMs) / 1000);
          return jsonResponse(
            { ok: false, error: 'Aguarde antes de solicitar novo codigo.', retryAfter: retrySeconds },
            429,
            { 'Retry-After': String(retrySeconds) }
          );
        }
      }

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const codeHash = await hashCode(code);
      const resetId = crypto.randomUUID();

      await sql`DELETE FROM password_resets WHERE manager_id = ${manager.id} AND used = false;`;

      await sql`
        INSERT INTO password_resets (id, manager_id, code_hash, expires_at, used)
        VALUES (${resetId}, ${manager.id}, ${codeHash}, ${expiresAt}, false)
      `;

      const managerEmail = manager.email ? String(manager.email) : '';
      const managerUsername = manager.username ? String(manager.username) : '';
      const emailResult = managerEmail
        ? await sendEmail(managerEmail, code, managerUsername, context.env || {})
        : { sent: false, reason: 'No email configured' };

      const provider = emailResult.resend ? 'resend' : undefined;
      const response: any = { ok: true, expiresAt, emailSent: emailResult.sent, provider };

      if (!emailResult.sent && emailResult.reason) {
        response.emailError = emailResult.reason;
      }

      const isProd = (context.env || {}).NODE_ENV === 'production';
      if (!isProd) {
        response.devCode = code;
      }

      return jsonResponse(response, 200);
    }

    if (action === 'verify') {
      const { identifier, code } = parsed || {};
      if (!identifier || !code) {
        return jsonResponse({ error: 'identifier e code sao obrigatorios' }, 400);
      }

      const managers = await sql`
        SELECT id, username FROM managers WHERE username = ${identifier} OR email = ${identifier} LIMIT 1
      `;
      if (!managers || managers.length === 0) {
        return jsonResponse({ error: 'Codigo invalido ou expirado' }, 400);
      }
      const manager = managers[0];

      const resets = await sql`
        SELECT * FROM password_resets
        WHERE manager_id = ${manager.id} AND used = false AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!resets || resets.length === 0) {
        return jsonResponse({ error: 'Codigo invalido ou expirado' }, 400);
      }

      const resetRow = resets[0];
      const incomingHash = await hashCode(code);
      if (incomingHash !== resetRow.code_hash) {
        return jsonResponse({ error: 'Codigo invalido ou expirado' }, 400);
      }

      return jsonResponse({ ok: true }, 200);
    }

    if (action === 'confirm') {
      const { identifier, code, newPassword } = parsed || {};
      if (!identifier || !code || !newPassword) {
        return jsonResponse({ error: 'identifier, code e newPassword sao obrigatorios' }, 400);
      }

      const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword);
      if (!strong) {
        return jsonResponse({
          error: 'Senha fraca. Use no minimo 8 caracteres, com letras maiusculas, minusculas e numeros.'
        }, 400);
      }

      const managers = await sql`
        SELECT id, username FROM managers WHERE username = ${identifier} OR email = ${identifier} LIMIT 1
      `;
      if (!managers || managers.length === 0) {
        return jsonResponse({ error: 'Codigo invalido ou expirado' }, 400);
      }
      const manager = managers[0];

      const resets = await sql`
        SELECT * FROM password_resets
        WHERE manager_id = ${manager.id} AND used = false AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!resets || resets.length === 0) {
        return jsonResponse({ error: 'Codigo invalido ou expirado' }, 400);
      }

      const resetRow = resets[0];
      const incomingHash = await hashCode(code);
      if (incomingHash !== resetRow.code_hash) {
        return jsonResponse({ error: 'Codigo invalido ou expirado' }, 400);
      }

      await sql`
        UPDATE managers SET password = ${newPassword} WHERE id = ${manager.id}
      `;

      await sql`
        UPDATE password_resets SET used = true WHERE id = ${resetRow.id}
      `;

      return jsonResponse({ ok: true }, 200);
    }

    return jsonResponse({ error: 'Action invalida' }, 400);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Unknown error' }, 500);
  }
};
