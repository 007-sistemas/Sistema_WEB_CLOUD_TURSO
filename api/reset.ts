import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hasDbConfig, sql } from '../services/db.js';
import crypto from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESET_FROM_EMAIL || 'no-reply@idev.app';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');
const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

function sendCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function sendEmail(to: string, code: string, username: string) {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      // @ts-ignore - modulo sera resolvido em producao (Vercel)
      const nodemailerMod: any = await import('nodemailer');
      const transporter = nodemailerMod.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      const info = await transporter.sendMail({
        from: FROM_EMAIL || SMTP_USER,
        to,
        subject: 'Idev - Codigo de redefinicao de senha',
        text: `Ola ${username},\n\nUse este codigo para redefinir sua senha: ${code}\nEle expira em 15 minutos.\n\nSe nao foi voce, ignore este email.`,
      });
      console.log('[RESET] SMTP enviado. MessageId:', (info as any)?.messageId);
      return { sent: true, smtp: true };
    } catch (smtpErr: any) {
      console.error('[RESET] Falha SMTP:', smtpErr?.message || smtpErr);
    }
  }

  if (RESEND_API_KEY) {
    const fromCandidate = (!FROM_EMAIL || FROM_EMAIL.endsWith('@gmail.com'))
      ? 'onboarding@resend.dev'
      : FROM_EMAIL;

    const payload = {
      from: fromCandidate,
      to,
      subject: 'DigitAll - Codigo de redefinicao de senha',
      text: `Ola ${username},\n\nUse este codigo para redefinir sua senha: ${code}\nEle expira em 15 minutos.\n\nSe nao foi voce, ignore este email.`,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[RESET] Falha ao enviar email via Resend:', text);
      return { sent: false, reason: text };
    }
    return { sent: true, resend: true };
  }

  console.warn('[RESET] Nenhum provedor de email configurado. Codigo (dev):', code);
  return { sent: false, reason: 'No email provider configured' };
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  sendCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!hasDbConfig()) {
    return res.status(500).json({ error: 'Missing DATABASE_URL or DATABASE_AUTH_TOKEN env var' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureResetTable();

    let parsed: any = req.body;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    }

    const action = parsed?.action;
    if (!action) {
      return res.status(400).json({ error: 'action e obrigatorio' });
    }

    if (action === 'request') {
      const { identifier } = parsed || {};
      if (!identifier) return res.status(400).json({ error: 'identifier e obrigatorio (usuario ou email)' });

      const managers = await sql`
        SELECT id, username, email FROM managers
        WHERE username = ${identifier} OR email = ${identifier}
        LIMIT 1
      `;

      if (!managers || managers.length === 0) {
        return res.status(200).json({ ok: true, message: 'Se existir, o codigo foi enviado.' });
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
          res.setHeader('Retry-After', String(retrySeconds));
          return res.status(429).json({ ok: false, error: 'Aguarde antes de solicitar novo codigo.', retryAfter: retrySeconds });
        }
      }

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const codeHash = hashCode(code);
      const resetId = crypto.randomUUID();

      await sql`DELETE FROM password_resets WHERE manager_id = ${manager.id} AND used = false;`;

      await sql`
        INSERT INTO password_resets (id, manager_id, code_hash, expires_at, used)
        VALUES (${resetId}, ${manager.id}, ${codeHash}, ${expiresAt}, false)
      `;

      const managerEmail = manager.email ? String(manager.email) : '';
      const managerUsername = manager.username ? String(manager.username) : '';
      const emailResult = managerEmail ? await sendEmail(managerEmail, code, managerUsername) : { sent: false, reason: 'No email configured' };
      const provider = (emailResult as any)?.smtp ? 'smtp' : (emailResult as any)?.resend ? 'resend' : undefined;
      const response: any = { ok: true, expiresAt, emailSent: emailResult.sent, provider };

      if (!emailResult.sent && (emailResult as any)?.reason) {
        response.emailError = (emailResult as any).reason;
      }

      const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
      if (!isProd) {
        response.devCode = code;
      }

      return res.status(200).json(response);
    }

    if (action === 'verify') {
      const { identifier, code } = parsed || {};
      if (!identifier || !code) {
        return res.status(400).json({ error: 'identifier e code sao obrigatorios' });
      }

      const managers = await sql`
        SELECT id, username FROM managers WHERE username = ${identifier} OR email = ${identifier} LIMIT 1
      `;
      if (!managers || managers.length === 0) {
        return res.status(400).json({ error: 'Codigo invalido ou expirado' });
      }
      const manager = managers[0];

      const resets = await sql`
        SELECT * FROM password_resets
        WHERE manager_id = ${manager.id} AND used = false AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!resets || resets.length === 0) {
        return res.status(400).json({ error: 'Codigo invalido ou expirado' });
      }

      const resetRow = resets[0];
      const incomingHash = hashCode(code);
      if (incomingHash !== resetRow.code_hash) {
        return res.status(400).json({ error: 'Codigo invalido ou expirado' });
      }

      return res.status(200).json({ ok: true });
    }

    if (action === 'confirm') {
      const { identifier, code, newPassword } = parsed || {};
      if (!identifier || !code || !newPassword) {
        return res.status(400).json({ error: 'identifier, code e newPassword sao obrigatorios' });
      }

      const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword);
      if (!strong) {
        return res.status(400).json({ error: 'Senha fraca. Use no minimo 8 caracteres, com letras maiusculas, minusculas e numeros.' });
      }

      const managers = await sql`
        SELECT id, username FROM managers WHERE username = ${identifier} OR email = ${identifier} LIMIT 1
      `;
      if (!managers || managers.length === 0) {
        return res.status(400).json({ error: 'Codigo invalido ou expirado' });
      }
      const manager = managers[0];

      const resets = await sql`
        SELECT * FROM password_resets
        WHERE manager_id = ${manager.id} AND used = false AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!resets || resets.length === 0) {
        return res.status(400).json({ error: 'Codigo invalido ou expirado' });
      }

      const resetRow = resets[0];
      const incomingHash = hashCode(code);
      if (incomingHash !== resetRow.code_hash) {
        return res.status(400).json({ error: 'Codigo invalido ou expirado' });
      }

      await sql`
        UPDATE managers SET password = ${newPassword} WHERE id = ${manager.id}
      `;

      await sql`
        UPDATE password_resets SET used = true WHERE id = ${resetRow.id}
      `;

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: `Acao desconhecida: ${action}` });
  } catch (err: any) {
    console.error('[RESET] Erro geral:', err);
    return res.status(500).json({ error: err?.message || 'Erro desconhecido' });
  }
}
