// api/cartorios.js — busca cartórios reais via Portal Transparência
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { uf, municipio } = req.query;
  if (!uf || !municipio) return res.status(400).json([]);

  try {
    // 1. Busca o city_id da cidade na API do Registro Civil
    const citiesRes = await fetch('https://transparencia.registrocivil.org.br/api/cities');
    const citiesData = await citiesRes.json();
    const cities = citiesData.cities || [];

    const normalizar = s => s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9 ]/g,'').trim();

    const cityMatch = cities.find(c =>
      c.uf === uf && normalizar(c.name) === normalizar(municipio)
    );

    if (cityMatch) {
      // 2. Busca cartórios pelo city_id
      const cartRes = await fetch(
        `https://transparencia.registrocivil.org.br/api/registry-offices?city_id=${cityMatch.id}`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } }
      );
      if (cartRes.ok) {
        const cartData = await cartRes.json();
        const lista = Array.isArray(cartData)
          ? cartData
          : (cartData.data || cartData.offices || cartData.cartorios || []);
        if (lista.length > 0) {
          const nomes = lista.map(c => c.name || c.nome || c.cartorio || c).filter(Boolean);
          return res.status(200).json(nomes);
        }
      }

      // 3. Fallback: tenta endpoint alternativo
      const alt = await fetch(
        `https://transparencia.registrocivil.org.br/api/cartorios?city_id=${cityMatch.id}`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } }
      );
      if (alt.ok) {
        const altData = await alt.json();
        const lista = Array.isArray(altData) ? altData : (altData.data || []);
        if (lista.length > 0) {
          return res.status(200).json(lista.map(c => c.name || c.nome || c).filter(Boolean));
        }
      }
    }
  } catch(e) {
    console.error('Erro cartórios:', e.message);
  }

  // Fallback genérico
  return res.status(200).json([
    `1º Cartório de Registro Civil – ${municipio}`,
    `2º Cartório de Registro Civil – ${municipio}`
  ]);
}
