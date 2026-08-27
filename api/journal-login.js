/**
 * POST /api/journal-login
 * Body: { password: string }
 * Vérifie le code admin du journal (indépendant de celui de la photothèque)
 * et retourne un token HMAC signé si correct.
 *
 * Variables d'environnement requises (Vercel) :
 *   JOURNAL_PASSWORD_HASH — SHA-256 hex du code admin du journal
 *   JOURNAL_TOKEN_SECRET  — chaîne aléatoire longue pour signer les tokens
 */
import crypto from 'crypto';

const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours — pensé pour un usage PWA

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body || {};

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Missing password' });
  }

  const inputHash    = crypto.createHash('sha256').update(password).digest('hex');
  const expectedHash = process.env.JOURNAL_PASSWORD_HASH;

  if (!expectedHash || inputHash !== expectedHash) {
    return res.status(401).json({ error: 'Code incorrect' });
  }

  const secret  = process.env.JOURNAL_TOKEN_SECRET;
  const expiry  = Date.now() + TOKEN_LIFETIME_MS;
  const payload = String(expiry);
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token   = `${payload}.${sig}`;

  return res.status(200).json({ token });
}
