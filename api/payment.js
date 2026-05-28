// api/payment.js — Vercel Serverless Function
// Cria preferência de pagamento no Mercado Pago
// Variável de ambiente necessária: MP_ACCESS_TOKEN
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_TOKEN) return res.status(500).json({ error: 'Token MP não configurado' });

  const { nome, email, tipo_certidao, estado, valor_total } = req.body;

  // Converte "R$ 146,74" para número 146.74
  const valor = parseFloat(
    valor_total.replace('R$ ', '').replace('.', '').replace(',', '.')
  );

  try {
    const body = {
      items: [{
        title: tipo_certidao + ' – ' + estado,
        description: 'Emissão de 2ª via de certidão de registro civil',
        quantity: 1,
        unit_price: valor,
        currency_id: 'BRL'
      }],
      payer: { name: nome, email: email || 'cliente@cartorioemcasa.com.br' },
      payment_methods: {
        excluded_payment_types: [],
        installments: 1
      },
      auto_return: 'approved',
      statement_descriptor: 'CARTORIO EM CASA',
      external_reference: `${tipo_certidao}-${estado}-${Date.now()}`,
      notification_url: 'https://www.cartorioemcasa.com.br/api/webhook',
      back_urls: {
        success: 'https://cartorioemcasa.com.br/?pagamento=sucesso',
        failure: 'https://cartorioemcasa.com.br/?pagamento=falha',
        pending: 'https://cartorioemcasa.com.br/?pagamento=pendente'
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
      init_point: data.init_point,         // produção
      sandbox_init_point: data.sandbox_init_point // testes
    });
  } catch (e) {
    console.error('MP Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
