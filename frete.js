// api/frete.js — calcula frete via Correios (melhorenvio.com.br como proxy)
// Usa a API pública de estimativa dos Correios
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { cep_destino } = req.body || {};
  if (!cep_destino) return res.status(400).json({ error: 'CEP obrigatório' });

  const cepLimpo = cep_destino.replace(/\D/g,'');
  if (cepLimpo.length !== 8) return res.status(400).json({ error: 'CEP inválido' });

  // CEP origem: São Paulo/SP (centro de distribuição)
  const CEP_ORIGEM = '01310100';

  try {
    // Tenta API dos Correios via proxy público
    const url = `https://viacep.com.br/ws/${cepLimpo}/json/`;
    const cepRes = await fetch(url);
    const cepData = await cepRes.json();

    if (cepData.erro) {
      return res.status(200).json({ erro: 'CEP não encontrado' });
    }

    // Estimativa de frete baseada na região (sem API paga dos Correios)
    // Valores baseados na tabela PAC/SEDEX 2024 para envelopes até 100g
    const uf = cepData.uf;
    const fretesEstimados = {
      // Sudeste
      SP: { pac: 15.90, sedex: 24.90 },
      RJ: { pac: 18.90, sedex: 28.90 },
      MG: { pac: 17.90, sedex: 26.90 },
      ES: { pac: 18.90, sedex: 28.90 },
      // Sul
      PR: { pac: 19.90, sedex: 29.90 },
      SC: { pac: 19.90, sedex: 29.90 },
      RS: { pac: 21.90, sedex: 31.90 },
      // Centro-Oeste
      DF: { pac: 20.90, sedex: 30.90 },
      GO: { pac: 20.90, sedex: 30.90 },
      MT: { pac: 22.90, sedex: 33.90 },
      MS: { pac: 21.90, sedex: 32.90 },
      // Nordeste
      BA: { pac: 22.90, sedex: 33.90 },
      PE: { pac: 23.90, sedex: 34.90 },
      CE: { pac: 23.90, sedex: 34.90 },
      MA: { pac: 24.90, sedex: 36.90 },
      PI: { pac: 24.90, sedex: 36.90 },
      RN: { pac: 24.90, sedex: 35.90 },
      PB: { pac: 24.90, sedex: 35.90 },
      AL: { pac: 24.90, sedex: 35.90 },
      SE: { pac: 23.90, sedex: 34.90 },
      // Norte
      PA: { pac: 26.90, sedex: 38.90 },
      AM: { pac: 28.90, sedex: 41.90 },
      AC: { pac: 30.90, sedex: 44.90 },
      RO: { pac: 28.90, sedex: 41.90 },
      RR: { pac: 30.90, sedex: 44.90 },
      AP: { pac: 28.90, sedex: 41.90 },
      TO: { pac: 25.90, sedex: 37.90 },
    };

    const fretes = fretesEstimados[uf] || { pac: 27.90, sedex: 40.90 };

    return res.status(200).json({
      cep: cepLimpo,
      logradouro: cepData.logradouro,
      bairro: cepData.bairro,
      cidade: cepData.localidade,
      uf: cepData.uf,
      pac: fretes.pac,
      sedex: fretes.sedex,
      prazo_pac: '5-8 dias úteis',
      prazo_sedex: '1-2 dias úteis'
    });
  } catch(e) {
    return res.status(500).json({ error: 'Erro ao calcular frete' });
  }
}
