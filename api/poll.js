const { createClient } = require('@supabase/supabase-js');

function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('site_poll')
      .select('votes_a, votes_b')
      .eq('id', 1)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { choice } = req.body || {};
    if (choice !== 'a' && choice !== 'b') {
      return res.status(400).json({ error: 'choice invalide' });
    }

    const ip = getIP(req);
    const { data, error } = await supabase.rpc('increment_poll_vote', {
      choice_input: choice,
      voter_ip: ip
    });
    if (error) return res.status(500).json({ error: error.message });

    const row = Array.isArray(data) ? data[0] : data;
    if (row.already_voted) {
      return res.status(409).json({
        error: 'Déjà voté depuis cette IP',
        votes_a: row.votes_a,
        votes_b: row.votes_b
      });
    }
    return res.json({ votes_a: row.votes_a, votes_b: row.votes_b });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};