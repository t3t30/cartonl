// api/cartorios.js — busca cartórios reais via Portal Transparência do Registro Civil
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { uf, municipio } = req.query;
  if (!uf || !municipio) return res.status(200).json([]);

  const normalizar = s => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '').trim();

  try {
    // 1. Busca lista de cidades com IDs do Registro Civil
    const citiesRes = await fetch('https://transparencia.registrocivil.org.br/api/cities', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });

    if (!citiesRes.ok) throw new Error('Cities API failed');
    const citiesData = await citiesRes.json();
    const cities = citiesData.cities || [];

    // Encontra a cidade pelo nome normalizado
    const cityMatch = cities.find(c =>
      c.uf === uf && normalizar(c.name) === normalizar(municipio)
    );

    if (!cityMatch) {
      console.log(`Cidade não encontrada: ${municipio}/${uf}`);
      return res.status(200).json([]);
    }

    // 2. Tenta diferentes endpoints para cartórios
    const endpoints = [
      `https://transparencia.registrocivil.org.br/api/registry-offices?city_id=${cityMatch.id}`,
      `https://transparencia.registrocivil.org.br/api/cartorios?city_id=${cityMatch.id}`,
      `https://transparencia.registrocivil.org.br/api/offices?city_id=${cityMatch.id}`,
    ];

    for (const url of endpoints) {
      try {
        const r = await fetch(url, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
        });
        if (!r.ok) continue;

        const text = await r.text();
        if (!text || text.trim() === '' || text.trim() === '[]') continue;

        let data;
        try { data = JSON.parse(text); } catch { continue; }

        // Extrai nomes de diferentes formatos de resposta
        const lista = Array.isArray(data) ? data
          : (data.data || data.offices || data.cartorios || data.registry_offices || []);

        if (!Array.isArray(lista) || lista.length === 0) continue;

        const nomes = lista
          .map(c => {
            if (typeof c === 'string') return c;
            return c.name || c.nome || c.cartorio || c.office_name || '';
          })
          .filter(n => n && n.length > 2);

        if (nomes.length > 0) {
          console.log(`Cartórios encontrados para ${municipio}: ${nomes.length}`);
          return res.status(200).json(nomes);
        }
      } catch (e) {
        console.log(`Endpoint ${url} falhou:`, e.message);
        continue;
      }
    }

    // Nenhum endpoint retornou dados
    console.log(`Nenhum cartório encontrado para ${municipio}/${uf} (city_id: ${cityMatch.id})`);
    return res.status(200).json([]);

  } catch (e) {
    console.error('Erro geral cartórios:', e.message);
    return res.status(200).json([]);
  }
}
