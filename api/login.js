/**
 * POST /api/login
 * Body: { password: string }
 * Vérifie le mot de passe contre le hash en env var,
 * retourne un token HMAC signé si correct.
 *
 * Variables d'environnement requises (Vercel) :
 *   PASSWORD_HASH  — SHA-256 hex du mot de passe
 *   TOKEN_SECRET   — chaîne aléatoire longue pour signer les tokens
 */
import crypto from 'crypto';

export default function handler(req, res) {
  // CORS — ajuste l'origine si besoin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Missing password' });
  }

  // Hash le mot de passe reçu et compare au hash stocké
  const inputHash    = crypto.createHash('sha256').update(password).digest('hex');
  const expectedHash = process.env.PASSWORD_HASH;

  if (!expectedHash || inputHash !== expectedHash) {
    // Même délai qu'un bon hash pour éviter le timing attack
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  // Crée un token signé HMAC : "expiry:signature"
  const secret  = process.env.TOKEN_SECRET;
  const expiry  = Date.now() + 24 * 60 * 60 * 1000; // 24h
  const payload = String(expiry);
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token   = `${payload}.${sig}`;

  return res.status(200).json({ token });
}
