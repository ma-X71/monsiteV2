/**
 * POST /api/journal-login
 * Body: { password: string }
 * Vérifie le code admin du journal et retourne un token HMAC signé.
 * Protégé contre le brute-force : 5 tentatives ratées max, puis blocage
 * de 15 minutes pour l'IP concernée.
 *
 * Variables d'environnement requises (Vercel) :
 *   JOURNAL_PASSWORD_HASH — SHA-256 hex du code admin du journal
 *   JOURNAL_TOKEN_SECRET  — chaîne aléatoire longue pour signer les tokens
 *   SUPABASE_URL / SUPABASE_KEY — déjà utilisés ailleurs sur le projet
 *
 * Nécessite la table journal_login_attempts (voir supabase-journal-schema.sql)
 */
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const MAX_ATTEMPTS       = 5;
const WINDOW_MS          = 15 * 60 * 1000; // fenêtre glissante de 15 min
const LOCK_MS            = 15 * 60 * 1000; // durée du blocage une fois atteint

function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Missing password' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const ip  = getIP(req);
  const now = new Date();

  // Vérifie l'état actuel des tentatives pour cette IP
  const { data: row } = await supabase
    .from('journal_login_attempts')
    .select('*')
    .eq('ip', ip)
    .maybeSingle();

  if (row && row.locked_until && new Date(row.locked_until) > now) {
    const minsLeft = Math.ceil((new Date(row.locked_until) - now) / 60000);
    return res.status(429).json({ error: `Trop de tentatives. Réessaie dans ${minsLeft} min.` });
  }

  // Fenêtre glissante expirée : on repart de zéro
  const windowExpired = row && (now - new Date(row.window_started_at)) > WINDOW_MS;

  const inputHash    = crypto.createHash('sha256').update(password).digest('hex');
  const expectedHash = process.env.JOURNAL_PASSWORD_HASH;
  const isCorrect    = expectedHash && inputHash === expectedHash;

  if (isCorrect) {
    // Succès : on efface le compteur de tentatives pour cette IP
    if (row) await supabase.from('journal_login_attempts').delete().eq('ip', ip);

    const secret  = process.env.JOURNAL_TOKEN_SECRET;
    const expiry  = Date.now() + TOKEN_LIFETIME_MS;
    const payload = String(expiry);
    const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return res.status(200).json({ token: `${payload}.${sig}` });
  }

  // Échec : incrémente le compteur (ou le réinitialise si fenêtre expirée)
  const newAttempts = (!row || windowExpired) ? 1 : row.attempts + 1;
  const lockedUntil = newAttempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCK_MS).toISOString() : null;

  await supabase.from('journal_login_attempts').upsert({
    ip,
    attempts: newAttempts,
    window_started_at: (!row || windowExpired) ? now.toISOString() : row.window_started_at,
    locked_until: lockedUntil
  });

  if (lockedUntil) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans 15 min.' });
  }

  return res.status(401).json({ error: 'Code incorrect' });
}
