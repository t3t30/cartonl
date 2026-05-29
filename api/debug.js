export default async function handler(req, res) {
  const REDIS_URL   = process.env.KV_REST_API_URL;
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
  const MP_TOKEN    = process.env.MP_ACCESS_TOKEN;
  const { id } = req.query;

  const result = {
    redis_url_ok: !!REDIS_URL,
    redis_token_ok: !!REDIS_TOKEN,
    mp_token_ok: !!MP_TOKEN
  };

  // Lista chaves no Redis
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const r = await fetch(`${REDIS_URL}/keys/pedido:*`, {
        headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
      });
      const data = await r.json();
      result.chaves_redis = data.result || [];
    } catch(e) { result.redis_erro = e.message; }
  }

  // Busca pagamento no MP
  if (id && MP_TOKEN) {
    try {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
      });
      const pag = await r.json();
      result.mp_status = pag.status;
      result.mp_external_reference = pag.external_reference;
      result.mp_email_payer = pag.payer?.email;
      result.chave_buscada = `pedido:${pag.external_reference}`;

      // Tenta buscar no Redis com esta chave
      if (REDIS_URL && REDIS_TOKEN && pag.external_reference) {
        const rr = await fetch(`${REDIS_URL}/get/pedido:${pag.external_reference}`, {
          headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
        });
        const dd = await rr.json();
        result.redis_encontrou = !!dd.result;
        result.redis_valor = dd.result;
      }
    } catch(e) { result.mp_erro = e.message; }
  }

  return res.status(200).json(result);
}
