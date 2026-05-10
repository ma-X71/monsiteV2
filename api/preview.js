// api/preview.js
// Vercel Serverless Function

export default async function handler(req, res) {
  const { id } = req.query;

  // On vérifie qu'on a bien reçu un ID
  if (!id) {
    return res.status(400).json({ error: 'ID de la track manquant' });
  }

  try {
    // Appel direct et rapide à l'API Deezer avec l'ID du morceau
    const response = await fetch(`https://api.deezer.com/track/${id}`);
    const data = await response.json();

    // Si l'API ne renvoie pas de preview (certains morceaux n'ont pas les droits pour les extraits)
    if (!data.preview) {
      return res.status(404).json({ error: 'Preview introuvable pour ce morceau' });
    }

    // On renvoie l'URL magique !
    res.status(200).json({ url: data.preview });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}