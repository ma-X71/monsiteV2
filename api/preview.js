// api/preview.js
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID de la track manquant' });
  }

  try {
    const response = await fetch(`https://api.deezer.com/track/${id}`);
    const data = await response.json();

    if (!data.preview) {
      return res.status(404).json({ error: 'Preview introuvable' });
    }

    // FORCE LE HTTPS ICI
    const secureUrl = data.preview.replace('http://', 'https://');
    
    res.status(200).json({ url: secureUrl });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}