// api/frete.js — Calcula frete via SuperFrete API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.SUPERFRETE_TOKEN;
  if (!TOKEN) return res.status(500).json({ error: 'Token SuperFrete não configurado' });

  const { cep_origem, cep_destino } = req.body || {};
  if (!cep_destino) return res.status(400).json({ error: 'CEP destino obrigatório' });

  // CEP origem: se não informado, usa SP como padrão
  const origem = (cep_origem || '01310100').replace(/\D/g, '');
  const destino = cep_destino.replace(/\D/g, '');

  if (destino.length !== 8) return res.status(400).json({ error: 'CEP inválido' });

  try {
    const sfRes = await fetch('https://api.superfrete.com/api/v0/calculator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'CartorioEmCasa (contato@cartorioemcasa.com.br)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: { postal_code: origem },
        to: { postal_code: destino },
        package: {
          height: 1,     // cm - envelope
          width: 20,     // cm
          length: 28,    // cm
          weight: 0.1    // kg - documento
        }
      })
    });

    const data = await sfRes.json();

    if (!sfRes.ok) {
      console.error('SuperFrete error:', data);
      return res.status(200).json({ error: data.message || 'Erro ao calcular frete' });
    }

    // Formata as opções de frete
    const opcoes = (data || [])
      .filter(op => !op.error)
      .map(op => ({
        nome: op.name || op.company?.name || 'Envio',
        servico: op.company?.name || '',
        preco: op.price || 0,
        prazo: op.delivery_time || 0,
        id: op.id || ''
      }))
      .sort((a, b) => a.preco - b.preco);

    // Busca endereço via ViaCEP
    let endereco = {};
    try {
      const cepRes = await fetch(`https://viacep.com.br/ws/${destino}/json/`);
      const cepData = await cepRes.json();
      if (!cepData.erro) {
        endereco = {
          logradouro: cepData.logradouro,
          bairro: cepData.bairro,
          cidade: cepData.localidade,
          uf: cepData.uf
        };
      }
    } catch(e) {}

    return res.status(200).json({
      opcoes,
      endereco,
      cep: destino
    });

  } catch (e) {
    console.error('Frete error:', e);
    return res.status(500).json({ error: 'Erro ao calcular frete' });
  }
}
