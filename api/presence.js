const { createClient } = require('@supabase/supabase-js');

const ACTIVE_WINDOW_S = 30; // considéré "actif" si heartbeat < 30s

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_S * 1000).toISOString();

  if (req.method === 'POST') {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId manquant' });

    await supabase.from('active_sessions').upsert({
      session_id: sessionId,
      last_seen: new Date().toISOString()
    });

    // ménage occasionnel : supprime les sessions mortes
    if (Math.random() < 0.1) {
      await supabase.from('active_sessions').delete().lt('last_seen', cutoff);
    }

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const { count, error } = await supabase
      .from('active_sessions')
      .select('*', { count: 'exact', head: true })
      .gt('last_seen', cutoff);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ count: count || 0 });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};