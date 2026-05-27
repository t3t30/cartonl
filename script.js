// ===== CONFIG =====
// Substitua pelo seu Access Key do Web3Forms (web3forms.com)
const WEB3FORMS_KEY = 'SUA_ACCESS_KEY_AQUI';

// ===== PRECOS POR ESTADO =====
const PRECOS_ESTADO = {
  AC:126.80, AL:218.75, AM:196.84, AP:157.52, BA:143.86,
  CE:180.62, DF:144.28, ES:144.92, GO:194.35, MA:153.58,
  MG:166.30, MS:157.56, MT:130.58, PA:291.71, PB:168.83,
  PE:171.19, PI:192.42, PR:164.09, RJ:288.76, RN:204.34,
  RO:134.98, RR:132.10, RS:159.79, SC:151.06, SE:174.70,
  SP:146.74, TO:159.81
};

// IBGE: código do estado para buscar municípios
const IBGE_UF_ID = {
  AC:12, AL:27, AP:16, AM:13, BA:29, CE:23, DF:53, ES:32,
  GO:52, MA:21, MT:51, MS:50, MG:31, PA:15, PB:25, PR:41,
  PE:26, PI:22, RJ:33, RN:24, RS:43, RO:11, RR:14, SC:42,
  SP:35, SE:28, TO:17
};

const CERT_INFO = {
  nascimento: { label:'Certidão de Nascimento', emoji:'👶', classe:'nascimento', dataLabel:'Data de nascimento' },
  casamento:  { label:'Certidão de Casamento',  emoji:'💍', classe:'casamento',  dataLabel:'Data do casamento' },
  obito:      { label:'Certidão de Óbito',       emoji:'✝️', classe:'obito',      dataLabel:'Data do óbito' }
};

// ===== STATE =====
let tipoCert = '';
let cartorioSelecionado = '';
let stepAtual = 1;

// ===== PDF AVISO LEGAL =====
function abrirAviso() {
  const modal = document.getElementById('pdfModal');
  if (!modal) return;
  document.getElementById('pdfFrame').src = 'aviso-legal.pdf';
  document.getElementById('pdfDownload').href = 'aviso-legal.pdf';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function fecharAviso() {
  const modal = document.getElementById('pdfModal');
  if (!modal) return;
  modal.classList.remove('active');
  document.getElementById('pdfFrame').src = '';
  document.body.style.overflow = '';
}

// ===== OPEN/CLOSE FORM =====
function abrirForm(tipo) {
  tipoCert = tipo;
  const info = CERT_INFO[tipo];
  document.getElementById('formHeaderTitle').textContent = info.label;
  const badge = document.getElementById('certBadge');
  badge.textContent = info.emoji + ' ' + info.label;
  badge.className = 'cert-badge ' + info.classe;
  document.getElementById('labelData').textContent = info.dataLabel + ' *';
  cartorioSelecionado = '';

  // Reset campos
  ['f-nome','f-pai','f-mae','f-data','f-email','f-whatsapp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['fg-nome','fg-pai','fg-mae','fg-data','fg-email','fg-whatsapp','fg-estado','fg-cidade'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('error');
  });

  // Reset estado/cidade
  const estadoEl = document.getElementById('f-estado');
  if (estadoEl) estadoEl.value = '';
  const cidadeWrap = document.getElementById('fg-cidade');
  if (cidadeWrap) cidadeWrap.style.display = 'none';
  const cidadeEl = document.getElementById('f-cidade');
  if (cidadeEl) cidadeEl.innerHTML = '<option value="">Carregando cidades...</option>';

  // Reset cartório
  const wrap = document.getElementById('cartorioWrap');
  const list = document.getElementById('cartorioList');
  const btn = document.getElementById('btnBuscarCartorios');
  if (wrap) wrap.style.display = 'none';
  if (list) list.innerHTML = '';
  if (btn) btn.style.display = 'none';

  irStep(1, true);
  document.getElementById('progressBar').style.display = 'flex';
  document.getElementById('formOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharForm() {
  document.getElementById('formOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ===== STEPS =====
function irStep(n, force = false) {
  if (!force && n > stepAtual && !validarStep(stepAtual)) return;
  stepAtual = n;
  document.querySelectorAll('.step-pane').forEach(p => p.classList.remove('active'));
  const pane = document.getElementById('step' + n) || document.getElementById('stepSuccess');
  if (pane) pane.classList.add('active');
  atualizarProgress(n);
  if (n === 3) renderPreco();
  if (n === 4) renderRevisao();
  document.querySelector('.form-modal').scrollTop = 0;
}

function atualizarProgress(n) {
  for (let i = 1; i <= 4; i++) {
    const num = document.getElementById('pn' + i);
    const lbl = document.getElementById('pl' + i);
    if (!num || !lbl) continue;
    num.className = 'prog-num';
    lbl.className = 'prog-label';
    if (i < n) { num.classList.add('done'); num.textContent = '✓'; lbl.classList.add('done'); }
    else if (i === n) { num.classList.add('active'); num.textContent = i; lbl.classList.add('active'); }
    else { num.textContent = i; }
    const line = document.getElementById('pl' + i + (i + 1));
    if (line) line.className = 'prog-line' + (i < n ? ' done' : '');
  }
}

// ===== VALIDATION =====
function validarStep(n) {
  if (n === 1) {
    let ok = true;
    ['nome','pai','mae','data'].forEach(f => {
      const el = document.getElementById('f-' + f);
      const fg = document.getElementById('fg-' + f);
      if (!el || !el.value.trim()) { if(fg) fg.classList.add('error'); ok = false; }
      else if(fg) fg.classList.remove('error');
    });
    const emailEl = document.getElementById('f-email');
    const emailFg = document.getElementById('fg-email');
    if (!emailEl || !emailEl.value.includes('@')) {
      if(emailFg) emailFg.classList.add('error'); ok = false;
    } else if(emailFg) emailFg.classList.remove('error');
    const waEl = document.getElementById('f-whatsapp');
    const waFg = document.getElementById('fg-whatsapp');
    if (!waEl || !waEl.value.trim()) { if(waFg) waFg.classList.add('error'); ok = false; }
    else if(waFg) waFg.classList.remove('error');
    return ok;
  }
  if (n === 2) {
    let ok = true;
    const estEl = document.getElementById('f-estado');
    const estFg = document.getElementById('fg-estado');
    if (!estEl || !estEl.value) { if(estFg) estFg.classList.add('error'); ok = false; }
    else if(estFg) estFg.classList.remove('error');

    const cidEl = document.getElementById('f-cidade');
    const cidFg = document.getElementById('fg-cidade');
    if (!cidEl || !cidEl.value) { if(cidFg) cidFg.classList.add('error'); ok = false; }
    else if(cidFg) cidFg.classList.remove('error');

    if (!cartorioSelecionado) {
      const errEl = document.getElementById('cartorioError');
      if (errEl) errEl.style.display = 'block';
      ok = false;
    }
    return ok;
  }
  return true;
}

// ===== IBGE: CARREGAR MUNICÍPIOS =====
async function onEstadoChange() {
  const estFg = document.getElementById('fg-estado');
  if(estFg) estFg.classList.remove('error');

  const estado = document.getElementById('f-estado').value;
  if (!estado) return;

  // Reset cidade e cartório
  cartorioSelecionado = '';
  const cidadeWrap = document.getElementById('fg-cidade');
  const cidadeEl = document.getElementById('f-cidade');
  const cartorioWrap = document.getElementById('cartorioWrap');
  const btnBuscar = document.getElementById('btnBuscarCartorios');

  if (cidadeEl) cidadeEl.innerHTML = '<option value="">Carregando...</option>';
  if (cidadeWrap) cidadeWrap.style.display = 'block';
  if (cartorioWrap) cartorioWrap.style.display = 'none';
  if (btnBuscar) btnBuscar.style.display = 'none';

  try {
    const ibgeId = IBGE_UF_ID[estado];
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ibgeId}/municipios?orderBy=nome`
    );
    const municipios = await res.json();

    let options = '<option value="">Selecione a cidade...</option>';
    municipios.forEach(m => {
      options += `<option value="${m.nome}">${m.nome}</option>`;
    });
    if (cidadeEl) cidadeEl.innerHTML = options;
  } catch(e) {
    if (cidadeEl) cidadeEl.innerHTML = '<option value="">Erro ao carregar. Tente novamente.</option>';
  }
}

function onCidadeChange() {
  const cidFg = document.getElementById('fg-cidade');
  if(cidFg) cidFg.classList.remove('error');
  cartorioSelecionado = '';
  const wrap = document.getElementById('cartorioWrap');
  if (wrap) wrap.style.display = 'none';
  const cidade = document.getElementById('f-cidade').value;
  const btn = document.getElementById('btnBuscarCartorios');
  if (btn) btn.style.display = cidade ? 'block' : 'none';
}

// ===== BUSCAR CARTÓRIOS VIA API CRC =====
async function buscarEExibirCartorios() {
  const estado = document.getElementById('f-estado').value;
  const cidade = document.getElementById('f-cidade').value;
  if (!estado || !cidade) return;

  cartorioSelecionado = '';
  const wrap = document.getElementById('cartorioWrap');
  const list = document.getElementById('cartorioList');
  const loading = document.getElementById('cartorioLoading');
  const errEl = document.getElementById('cartorioError');

  if (wrap) wrap.style.display = 'block';
  if (loading) loading.style.display = 'block';
  if (list) list.innerHTML = '';
  if (errEl) errEl.style.display = 'none';

  let cartorios = [];

  try {
    const res = await fetch(`/api/cartorios?uf=${estado}&municipio=${encodeURIComponent(cidade)}`);
    if (res.ok) {
      const data = await res.json();
      cartorios = Array.isArray(data)
        ? data.map(c => typeof c === 'string' ? c : (c.nome || c.name || c.cartorio || ''))
            .filter(Boolean)
        : [];
    }
  } catch(e) {
    console.log('Erro API cartórios:', e);
  }

  // Fallback se API não retornou nada
  if (!cartorios.length) {
    cartorios = [
      `1º Cartório de Registro Civil – ${cidade}`,
      `2º Cartório de Registro Civil – ${cidade}`
    ];
  }

  if (loading) loading.style.display = 'none';
  if (list) list.innerHTML = cartorios.map(nome => `
    <div class="cartorio-item" onclick="selecionarCartorio(this, '${nome.replace(/'/g,"\\'")}')">
      <div class="cartorio-radio"></div>
      <div>
        <div class="cartorio-name">${nome}</div>
        <div class="cartorio-addr">${cidade} – ${estado}</div>
      </div>
    </div>`).join('');
}

function selecionarCartorio(el, nome) {
  document.querySelectorAll('.cartorio-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  cartorioSelecionado = nome;
  const errEl = document.getElementById('cartorioError');
  if (errEl) errEl.style.display = 'none';
}

// ===== PREÇO =====
function getTotal() {
  const est = document.getElementById('f-estado').value;
  const base = PRECOS_ESTADO[est] || 99.00;
  return { base, total: base };
}

function renderPreco() {
  const { base, total } = getTotal();
  const wrap = document.getElementById('precoWrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="price-row"><span class="price-label">Valor da certidão</span><span class="price-val">R$ ${base.toFixed(2).replace('.',',')}</span></div>
    <div class="price-row total"><span class="price-label">Total</span><span class="price-val">R$ ${total.toFixed(2).replace('.',',')}</span></div>`;
}

// ===== REVISÃO =====
function renderRevisao() {
  const info = CERT_INFO[tipoCert];
  const { base, total } = getTotal();
  const el = document.getElementById('revisaoConteudo');
  if (!el) return;
  el.innerHTML = `
    <div class="review-section">
      <div class="review-title">Tipo de certidão</div>
      <div style="font-size:.95rem;font-weight:600">${info.emoji} ${info.label}</div>
    </div>
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Dados da pessoa</div>
      <div class="review-grid">
        <div class="review-item"><div class="rlabel">Nome completo</div><div class="rvalue">${document.getElementById('f-nome').value}</div></div>
        <div class="review-item"><div class="rlabel">${info.dataLabel}</div><div class="rvalue">${document.getElementById('f-data').value}</div></div>
        <div class="review-item"><div class="rlabel">Nome do pai</div><div class="rvalue">${document.getElementById('f-pai').value}</div></div>
        <div class="review-item"><div class="rlabel">Nome da mãe</div><div class="rvalue">${document.getElementById('f-mae').value}</div></div>
        <div class="review-item"><div class="rlabel">E-mail</div><div class="rvalue">${document.getElementById('f-email').value}</div></div>
        <div class="review-item"><div class="rlabel">WhatsApp</div><div class="rvalue">${document.getElementById('f-whatsapp').value}</div></div>
      </div>
    </div>
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Local do registro</div>
      <div class="review-grid">
        <div class="review-item"><div class="rlabel">Estado</div><div class="rvalue">${document.getElementById('f-estado').value}</div></div>
        <div class="review-item"><div class="rlabel">Cidade</div><div class="rvalue">${document.getElementById('f-cidade').value}</div></div>
        <div class="review-item"><div class="rlabel">Cartório</div><div class="rvalue">${cartorioSelecionado}</div></div>
      </div>
    </div>
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Resumo financeiro</div>
      <div class="price-card-wrap">
        <div class="price-row"><span class="price-label">Valor da certidão</span><span class="price-val">R$ ${base.toFixed(2).replace('.',',')}</span></div>
        <div class="price-row total"><span class="price-label">Total</span><span class="price-val">R$ ${total.toFixed(2).replace('.',',')}</span></div>
      </div>
    </div>`;
}

// ===== FINALIZAR — Web3Forms + Mercado Pago =====
async function finalizarPedido() {
  const btn = document.querySelector('#step4 .btn-next.green');
  if (btn) { btn.textContent = 'Processando...'; btn.disabled = true; }

  const { base, total } = getTotal();
  const info = CERT_INFO[tipoCert];

  const payload = {
    access_key: WEB3FORMS_KEY,
    subject: 'Novo pedido – ' + info.label,
    from_name: 'Cartório em Casa',
    tipo_certidao: info.label,
    nome:        document.getElementById('f-nome').value,
    nome_pai:    document.getElementById('f-pai').value,
    nome_mae:    document.getElementById('f-mae').value,
    data_evento: document.getElementById('f-data').value,
    email:       document.getElementById('f-email').value,
    whatsapp:    document.getElementById('f-whatsapp').value,
    estado:      document.getElementById('f-estado').value,
    cidade:      document.getElementById('f-cidade').value,
    cartorio:    cartorioSelecionado,
    valor_total: 'R$ ' + total.toFixed(2).replace('.',',')
  };

  // 1. Envia por e-mail via Web3Forms
  if (WEB3FORMS_KEY !== 'SUA_ACCESS_KEY_AQUI') {
    try {
      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch(e) { console.log('Erro Web3Forms:', e); }
  }

  // 2. Cria pagamento no Mercado Pago e redireciona
  try {
    const mpRes = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:          payload.nome,
        email:         payload.email,
        tipo_certidao: payload.tipo_certidao,
        estado:        payload.estado,
        valor_total:   payload.valor_total
      })
    });
    if (mpRes.ok) {
      const mpData = await mpRes.json();
      if (mpData.init_point) {
        window.location.href = mpData.init_point;
        return;
      }
    }
  } catch(e) { console.log('Erro MP:', e); }

  // Fallback: mostra sucesso se MP não configurado ainda
  document.querySelectorAll('.step-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('stepSuccess').classList.add('active');
  const pb = document.getElementById('progressBar');
  if (pb) pb.style.display = 'none';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('formOverlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) fecharForm(); });
  const pdfOverlay = document.getElementById('pdfModal');
  if (pdfOverlay) pdfOverlay.addEventListener('click', e => { if (e.target === pdfOverlay) fecharAviso(); });
});
