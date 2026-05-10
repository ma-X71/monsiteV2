// api/preview.js
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'ID manquant' });

  try {
    const response = await fetch(`https://api.deezer.com/track/${id}`);
    const data = await response.json();

    // On vérifie si Deezer renvoie bien l'URL de l'extrait
    if (!data || !data.preview) {
      return res.status(404).json({ error: 'Preview indisponible sur Deezer' });
    }

    // Indispensable pour éviter le blocage "Non sécurisé" du navigateur
    const secureUrl = data.preview.replace('http://', 'https://');
    
    res.status(200).json({ url: secureUrl });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur API" });
  }
}