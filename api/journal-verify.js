/**
 * POST /api/journal-verify
 * Body: { token: string }
 * Vérifie la signature HMAC et l'expiration du token admin du journal.
 *
 * Variables d'environnement requises :
 *   JOURNAL_TOKEN_SECRET — même secret que dans journal-login.js
 */
import crypto from 'crypto';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body || {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ valid: false, error: 'Missing token' });
  }

  const [payload, sig] = token.split('.');
  if (!payload || !sig) {
    return res.status(401).json({ valid: false });
  }

  const secret = process.env.JOURNAL_TOKEN_SECRET;
  let expectedSig;
  try {
    expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  } catch {
    return res.status(401).json({ valid: false });
  }

  let sigMatch;
  try {
    sigMatch = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch {
    return res.status(401).json({ valid: false });
  }

  if (!sigMatch) {
    return res.status(401).json({ valid: false });
  }

  const expiry = parseInt(payload, 10);
  if (Date.now() > expiry) {
    return res.status(401).json({ valid: false, error: 'Session expirée' });
  }

  return res.status(200).json({ valid: true });
}
