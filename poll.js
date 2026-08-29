const { createClient } = require('@supabase/supabase-js');

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
    const { data, error } = await supabase.rpc('increment_poll_vote', { choice });
    if (error) return res.status(500).json({ error: error.message });
    const row = Array.isArray(data) ? data[0] : data;
    return res.json(row);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};