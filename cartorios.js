// api/cartorios.js — Vercel Serverless Function
// Proxy para a API do CRC Nacional (evita CORS no browser)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { uf, municipio } = req.query;
  if (!uf || !municipio) {
    return res.status(400).json({ error: 'Parâmetros uf e municipio são obrigatórios' });
  }

  try {
    const url = `https://www.registrocivil.org.br/api/v1/cartorios?uf=${encodeURIComponent(uf)}&municipio=${encodeURIComponent(municipio)}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) throw new Error('API indisponível');
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    // Fallback: retorna lista genérica se API não responder
    return res.status(200).json([
      { nome: `1º Cartório de Registro Civil – ${municipio}` },
      { nome: `2º Cartório de Registro Civil – ${municipio}` }
    ]);
  }
}
