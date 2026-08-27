/**
 * /api/journal-entries
 *
 * GET    — sans token valide : renvoie uniquement les entrées publiques.
 *          avec token admin valide (header Authorization: Bearer <token>) :
 *          renvoie toutes les entrées (publiques + privées).
 * POST   — requiert un token admin. Body: { content, is_public }
 * PUT    — requiert un token admin. Body: { id, content, is_public }
 * DELETE — requiert un token admin. Body: { id }
 *
 * Variables d'environnement requises (Vercel) :
 *   JOURNAL_TOKEN_SECRET — même secret que journal-login.js / journal-verify.js
 *   SUPABASE_URL         — déjà utilisé par api/count.js
 *   SUPABASE_KEY         — DOIT être la service_role key (pas l'anon key),
 *                          sinon insert/update/delete échoueront si RLS est actif.
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const TABLE = 'journal_entries';

function isValidAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;

  const secret = process.env.JOURNAL_TOKEN_SECRET;
  let expectedSig;
  try {
    expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  } catch {
    return false;
  }

  try {
    const match = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
    if (!match) return false;
  } catch {
    return false;
  }

  const expiry = parseInt(payload, 10);
  return Date.now() <= expiry;
}

function getToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const isAdmin  = isValidAdminToken(getToken(req));

  if (req.method === 'GET') {
    let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
    if (!isAdmin) query = query.eq('is_public', true);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ entries: data });
  }

  // Toutes les écritures nécessitent un token admin valide.
  if (!isAdmin) return res.status(401).json({ error: 'Non autorisé' });

  if (req.method === 'POST') {
    const { content, is_public } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Contenu manquant' });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({ content: content.trim(), is_public: !!is_public })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ entry: data });
  }

  if (req.method === 'PUT') {
    const { id, content, is_public } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID manquant' });
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Contenu manquant' });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update({ content: content.trim(), is_public: !!is_public, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ entry: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID manquant' });

    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
