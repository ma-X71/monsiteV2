/**
 * /api/comments
 * GET    — public. Retourne tous les commentaires avec compteur de likes
 *          et si l'IP courante a déjà liké chacun. Si un token admin valide
 *          est fourni, indique aussi isAdmin: true.
 * POST   — Body: { content }. 1 commentaire par IP sauf si token admin valide
 *          (Authorization: Bearer <token>), auquel cas illimité + badge admin.
 * DELETE — Body: { id }. Requiert un token admin valide.
 *
 * Variables d'environnement requises :
 *   JOURNAL_TOKEN_SECRET — même secret que journal-login.js
 *   SUPABASE_URL / SUPABASE_KEY
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const TABLE = 'comments';
const LIKES_TABLE = 'comment_likes';
const MAX_LEN = 500;

function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function isValidAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const secret = process.env.JOURNAL_TOKEN_SECRET;
  let expectedSig;
  try {
    expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  } catch { return false; }
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) return false;
  } catch { return false; }
  return Date.now() <= parseInt(payload, 10);
}

function getToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const isAdmin = isValidAdminToken(getToken(req));
    const ip = getIP(req);

    if (req.method === 'GET') {
      const { data: comments, error } = await supabase
        .from(TABLE)
        .select('id, content, is_admin, created_at')
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });

      const ids = comments.map(c => c.id);
      let likes = [];
      if (ids.length > 0) {
        const { data: likeRows, error: likeErr } = await supabase
          .from(LIKES_TABLE)
          .select('comment_id, ip')
          .in('comment_id', ids);
        if (likeErr) return res.status(500).json({ error: likeErr.message });
        likes = likeRows;
      }

      const enriched = comments.map(c => {
        const forThis = likes.filter(l => l.comment_id === c.id);
        return {
          id: c.id,
          content: c.content,
          is_admin: c.is_admin,
          created_at: c.created_at,
          likes: forThis.length,
          likedByMe: forThis.some(l => l.ip === ip)
        };
      });

      return res.status(200).json({ comments: enriched, isAdmin });
    }

    if (req.method === 'POST') {
      const { content } = req.body || {};
      if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'Commentaire vide' });
      }
      if (content.length > MAX_LEN) {
        return res.status(400).json({ error: `${MAX_LEN} caractères max` });
      }

      if (!isAdmin) {
        const { data: existing, error: checkErr } = await supabase
          .from(TABLE)
          .select('id')
          .eq('ip', ip)
          .limit(1);
        if (checkErr) return res.status(500).json({ error: checkErr.message });
        if (existing && existing.length > 0) {
          return res.status(409).json({ error: 'Tu as déjà posté un commentaire depuis cette adresse.' });
        }
      }

      const { data, error } = await supabase
        .from(TABLE)
        .insert({ content: content.trim(), ip, is_admin: isAdmin })
        .select('id, content, is_admin, created_at')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ comment: { ...data, likes: 0, likedByMe: false } });
    }

    if (req.method === 'DELETE') {
      if (!isAdmin) return res.status(401).json({ error: 'Non autorisé' });
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID manquant' });

      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('comments handler crash:', err);
    return res.status(500).json({ error: 'Erreur serveur interne' });
  }
};