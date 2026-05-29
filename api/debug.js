export default async function handler(req, res) {
  const REDIS_URL   = process.env.KV_REST_API_URL;
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(200).json({ 
      erro: 'Variáveis Redis não encontradas',
      KV_REST_API_URL: !!REDIS_URL,
      KV_REST_API_TOKEN: !!REDIS_TOKEN
    });
  }

  // Lista todas as chaves pedido:*
  try {
    const r = await fetch(`${REDIS_URL}/keys/pedido:*`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
    const data = await r.json();
    return res.status(200).json({ 
      redis_ok: true,
      chaves: data.result || [],
      total: (data.result || []).length
    });
  } catch(e) {
    return res.status(200).json({ erro: e.message });
  }
}
