// api/webhook.js — Recebe notificações MP, busca dados do pedido no Redis, envia emails
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const RESEND_KEY  = process.env.RESEND_API_KEY;
  const MP_TOKEN    = process.env.MP_ACCESS_TOKEN;
  const REDIS_URL   = process.env.KV_REST_API_URL;
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
  const ADMIN_EMAIL = 'contato@cartorioemcasa.com.br';

  try {
    const body   = req.body;
    const type   = body.type || body.action || '';
    const dataId = body.data?.id || body.id || null;

    if (!type.includes('payment') || !dataId) {
      return res.status(200).json({ ok: true });
    }

    // Busca detalhes do pagamento no MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
    });
    const pagamento = await mpRes.json();

    if (pagamento.status !== 'approved') return res.status(200).json({ ok: true });

    const extRef     = pagamento.external_reference || '';
    const valorPago  = (pagamento.transaction_amount || 0).toFixed(2).replace('.', ',');
    const metodoPag  = pagamento.payment_type_id === 'credit_card' ? 'Cartão de crédito'
                     : pagamento.payment_type_id === 'debit_card'  ? 'Cartão de débito'
                     : pagamento.payment_type_id === 'pix'         ? 'Pix'
                     : pagamento.payment_type_id === 'bolbradesco' ? 'Boleto'
                     : pagamento.payment_type_id || 'Não informado';
    const dataAprov  = new Date(pagamento.date_approved || Date.now())
                        .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Busca dados do pedido no Redis usando external_reference
    let pedido = null;
    if (REDIS_URL && REDIS_TOKEN && extRef) {
      try {
        const redisRes = await fetch(`${REDIS_URL}/get/pedido:${encodeURIComponent(extRef)}`, {
          headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
        });
        const redisData = await redisRes.json();
        if (redisData.result) {
          // Desencapsula múltiplos níveis de JSON
          let raw = redisData.result;
          let attempts = 0;
          while (typeof raw === 'string' && attempts < 5) {
            try { raw = JSON.parse(raw); attempts++; } catch(e) { break; }
          }
          if (raw && raw.value) {
            let val = raw.value;
            let att2 = 0;
            while (typeof val === 'string' && att2 < 5) {
              try { val = JSON.parse(val); att2++; } catch(e) { break; }
            }
            raw = val;
          }
          pedido = raw;
        }
      } catch(e) {
        console.log('Redis error:', e.message);
      }
    }

    // Dados do cliente — prioriza Redis, fallback para dados do MP
    const nomeCliente  = pedido?.nome  || pagamento.payer?.first_name || 'Cliente';
    const emailCliente = pedido?.email || '';
    const tipoCert     = pedido?.tipo_certidao || extRef.split('-').slice(0,-2).join('-') || 'Certidão';
    const estadoCert   = pedido?.estado || extRef.split('-').slice(-2,-1)[0] || '';

    const enviar = async (to, subject, html) => {
      if (!to || !to.includes('@')) return;
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Cartório em Casa <contato@cartorioemcasa.com.br>',
          to: [to],
          subject,
          html
        })
      });
    };

    const htmlCliente = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5fd;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5fd;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#1a3fa8,#2563eb);padding:32px 40px;text-align:center">
            <div style="font-size:13px;color:#93c5fd;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">Cartório em Casa</div>
            <div style="font-size:28px;font-weight:700;color:#fff;margin-bottom:4px">✅ Pagamento confirmado!</div>
            <div style="font-size:14px;color:#bfdbfe">Seu pedido foi recebido e está em andamento</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 0">
            <p style="font-size:16px;color:#0f172a;margin:0 0 8px">Olá, <strong>${nomeCliente}</strong>!</p>
            <p style="font-size:14px;color:#475569;margin:0;line-height:1.6">
              Seu pagamento foi aprovado e nossa equipe já iniciou o processo de busca da sua certidão.
              Em breve entraremos em contato pelo e-mail ou WhatsApp informado no pedido.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 0">
            <div style="background:#f8fafc;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
              <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Detalhes do pagamento</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:6px 0">Tipo de certidão</td>
                  <td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right">${tipoCert}</td>
                </tr>
                <tr><td colspan="2" style="border-top:1px solid #e2e8f0"></td></tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:6px 0">Estado do registro</td>
                  <td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right">${estadoCert}</td>
                </tr>
                <tr><td colspan="2" style="border-top:1px solid #e2e8f0"></td></tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:6px 0">Forma de pagamento</td>
                  <td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right">${metodoPag}</td>
                </tr>
                <tr><td colspan="2" style="border-top:1px solid #e2e8f0"></td></tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:6px 0">Data de aprovação</td>
                  <td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right">${dataAprov}</td>
                </tr>
                <tr><td colspan="2" style="border-top:1px solid #e2e8f0"></td></tr>
                <tr>
                  <td style="font-size:15px;color:#0f172a;font-weight:700;padding:10px 0 0">Total pago</td>
                  <td style="font-size:15px;color:#1a3fa8;font-weight:700;text-align:right;padding:10px 0 0">R$ ${valorPago}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 0">
            <div style="background:#f0fdf4;border-radius:12px;padding:20px 24px;border:1px solid #bbf7d0">
              <div style="font-size:13px;font-weight:700;color:#166534;margin-bottom:12px">📋 Próximos passos</div>
              <div style="font-size:13px;color:#166534;line-height:1.8">
                1. Nossa equipe busca sua certidão no cartório<br>
                2. Você recebe uma atualização por e-mail<br>
                3. Envio do documento conforme modalidade escolhida<br>
                4. Prazo médio: <strong>5 a 15 dias úteis</strong>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px">
            <p style="font-size:13px;color:#64748b;text-align:center;margin:0;line-height:1.6">
              Dúvidas? Entre em contato pelo e-mail
              <a href="mailto:contato@cartorioemcasa.com.br" style="color:#1a3fa8;font-weight:600">contato@cartorioemcasa.com.br</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
            <div style="font-size:12px;color:#94a3b8">
              © 2025 Cartório em Casa · <a href="https://cartorioemcasa.com.br" style="color:#64748b">cartorioemcasa.com.br</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const htmlAdmin = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f1f5fd;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border-left:4px solid #1a3fa8">
    <h2 style="color:#1a3fa8;margin:0 0 20px">💰 Novo pagamento aprovado!</h2>
    <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;color:#334155">
      <tr><td style="color:#64748b;width:45%">Tipo de certidão</td><td><strong>${tipoCert}</strong></td></tr>
      <tr><td style="color:#64748b">Estado</td><td><strong>${estadoCert}</strong></td></tr>
      <tr><td style="color:#64748b">Cliente</td><td><strong>${nomeCliente}</strong></td></tr>
      <tr><td style="color:#64748b">E-mail</td><td><strong>${emailCliente || 'N/A'}</strong></td></tr>
      <tr><td style="color:#64748b">WhatsApp</td><td><strong>${pedido?.whatsapp || 'N/A'}</strong></td></tr>
      <tr><td style="color:#64748b">Forma de pagamento</td><td><strong>${metodoPag}</strong></td></tr>
      <tr><td style="color:#64748b">Valor pago</td><td><strong style="color:#1a3fa8">R$ ${valorPago}</strong></td></tr>
      <tr><td style="color:#64748b">Data</td><td><strong>${dataAprov}</strong></td></tr>
      <tr><td style="color:#64748b">ID do pagamento</td><td><strong>${dataId}</strong></td></tr>
    </table>
  </div>
</body>
</html>`;

    // Envia emails
    await Promise.all([
      enviar(emailCliente, '✅ Pagamento confirmado — Cartório em Casa', htmlCliente),
      enviar(ADMIN_EMAIL, `💰 Novo pedido pago: ${tipoCert} (${estadoCert}) — R$ ${valorPago}`, htmlAdmin)
    ]);

    return res.status(200).json({ ok: true });

  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(500).json({ error: e.message });
  }
}
