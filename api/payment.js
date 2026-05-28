// api/payment.js — Cria preferência MP e salva dados do pedido no Redis
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const MP_TOKEN   = process.env.MP_ACCESS_TOKEN;
  const REDIS_URL  = process.env.KV_REST_API_URL;
  const REDIS_TOKEN= process.env.KV_REST_API_TOKEN;

  if (!MP_TOKEN) return res.status(500).json({ error: 'Token MP não configurado' });

  const { nome, email, whatsapp, tipo_certidao, estado, valor_total } = req.body;

  const valor = parseFloat(
    valor_total.replace('R$ ','').replace('.','').replace(',','.')
  );

  const extRef = `${tipo_certidao}-${estado}-${Date.now()}`;

  try {
    // 1. Salva dados do cliente no Redis (expira em 48h)
    if (REDIS_URL && REDIS_TOKEN) {
      await fetch(`${REDIS_URL}/set/pedido:${extRef}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REDIS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: JSON.stringify({ nome, email, whatsapp, tipo_certidao, estado, valor_total }),
          ex: 172800 // 48 horas
        })
      });
    }

    // 2. Cria preferência no MP
    const body = {
      items: [{
        title: tipo_certidao + ' – ' + estado,
        description: 'Emissão de 2ª via de certidão de registro civil',
        quantity: 1,
        unit_price: valor,
        currency_id: 'BRL'
      }],
      payer: {
        name: nome,
        email: email || 'cliente@cartorioemcasa.com.br'
      },
      payment_methods: {
        excluded_payment_types: [],
        installments: 1
      },
      auto_return: 'approved',
      statement_descriptor: 'CARTORIO EM CASA',
      external_reference: extRef,
      notification_url: 'https://www.cartorioemcasa.com.br/api/webhook',
      back_urls: {
        success: 'https://www.cartorioemcasa.com.br/?pagamento=sucesso',
        failure: 'https://www.cartorioemcasa.com.br/?pagamento=falha',
        pending: 'https://www.cartorioemcasa.com.br/?pagamento=pendente'
      }
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_TOKEN}`
      },
      body: JSON.stringify(body)
    });

    const data = await mpRes.json();
    if (!mpRes.ok) throw new Error(data.message || 'Erro MP');

    return res.status(200).json({
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point
    });
  } catch (e) {
    console.error('Payment error:', e);
    return res.status(500).json({ error: e.message });
  }
}
