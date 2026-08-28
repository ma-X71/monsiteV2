/**
 * /api/comment-likes
 * POST — Body: { commentId }. Toggle : like si pas encore liké par cette IP,
 *        unlike si déjà liké. Retourne { liked, likes }.
 *
 * Variables d'environnement requises :
 *   SUPABASE_URL / SUPABASE_KEY
 */
const { createClient } = require('@supabase/supabase-js');

const TABLE = 'comment_likes';

function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { commentId } = req.body || {};
    if (!commentId) return res.status(400).json({ error: 'commentId manquant' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const ip = getIP(req);

    const { data: existing, error: checkErr } = await supabase
      .from(TABLE)
      .select('id')
      .eq('comment_id', commentId)
      .eq('ip', ip)
      .maybeSingle();

    if (checkErr) return res.status(500).json({ error: checkErr.message });

    if (existing) {
      const { error: delErr } = await supabase.from(TABLE).delete().eq('id', existing.id);
      if (delErr) return res.status(500).json({ error: delErr.message });
    } else {
      const { error: insErr } = await supabase.from(TABLE).insert({ comment_id: commentId, ip });
      if (insErr) return res.status(500).json({ error: insErr.message });
    }

    const { count, error: countErr } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    if (countErr) return res.status(500).json({ error: countErr.message });

    return res.status(200).json({ liked: !existing, likes: count });
  } catch (err) {
    console.error('comment-likes handler crash:', err);
    return res.status(500).json({ error: 'Erreur serveur interne' });
  }
};