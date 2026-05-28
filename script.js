// ===== CONFIG =====
const WEB3FORMS_KEY = 'SUA_ACCESS_KEY_AQUI';
const TAXA_BUSCA = 10;
const TAXA_APOSTILA = 240;

// ===== PRECOS POR ESTADO =====
const PRECOS_ESTADO = {
  AC:126.80, AL:218.75, AM:196.84, AP:157.52, BA:143.86,
  CE:180.62, DF:144.28, ES:144.92, GO:194.35, MA:153.58,
  MG:166.30, MS:157.56, MT:130.58, PA:291.71, PB:168.83,
  PE:171.19, PI:192.42, PR:164.09, RJ:288.76, RN:204.34,
  RO:134.98, RR:132.10, RS:159.79, SC:151.06, SE:174.70,
  SP:146.74, TO:159.81
};
const IBGE_UF_ID = {
  AC:12,AL:27,AP:16,AM:13,BA:29,CE:23,DF:53,ES:32,
  GO:52,MA:21,MT:51,MS:50,MG:31,PA:15,PB:25,PR:41,
  PE:26,PI:22,RJ:33,RN:24,RS:43,RO:11,RR:14,SC:42,
  SP:35,SE:28,TO:17
};
const CERT_INFO = {
  nascimento:{label:'Certidão de Nascimento',emoji:'👶',classe:'nascimento',dataLabel:'Data de nascimento'},
  casamento: {label:'Certidão de Casamento', emoji:'💍',classe:'casamento', dataLabel:'Data do casamento'},
  obito:     {label:'Certidão de Óbito',      emoji:'✝️',classe:'obito',     dataLabel:'Data do óbito'}
};

// ===== STATE =====
let tipoCert='', cartorioSelecionado='';
let entregaSelecionada='', apostilaSelecionada='';
let freteSelecionado=0, freteNome='';
let stepAtual=1;

// ===== MÁSCARAS =====
function mascaraTelefone(el) {
  let v = el.value.replace(/\D/g,'');
  if (v.length > 11) v = v.slice(0,11);
  if (v.length === 0) { el.value=''; return; }
  if (v.length <= 2) { el.value=`(${v}`; return; }
  if (v.length <= 6) { el.value=`(${v.slice(0,2)}) ${v.slice(2)}`; return; }
  if (v.length <= 10) { el.value=`(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`; return; }
  el.value=`(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
}
function mascaraCep(el) {
  let v = el.value.replace(/\D/g,'');
  if (v.length > 8) v = v.slice(0,8);
  el.value = v.length > 5 ? `${v.slice(0,5)}-${v.slice(5)}` : v;
}

// ===== PDF =====
function abrirAviso() {
  const m=document.getElementById('pdfModal'); if(!m) return;
  document.getElementById('pdfFrame').src='aviso-legal.pdf';
  document.getElementById('pdfDownload').href='aviso-legal.pdf';
  m.classList.add('active'); document.body.style.overflow='hidden';
}
function fecharAviso() {
  const m=document.getElementById('pdfModal'); if(!m) return;
  m.classList.remove('active'); document.getElementById('pdfFrame').src='';
  document.body.style.overflow='';
}

// ===== FORM OPEN/CLOSE =====
function abrirForm(tipo) {
  tipoCert=tipo; cartorioSelecionado='';
  entregaSelecionada=''; apostilaSelecionada=''; freteSelecionado=0; freteNome='';
  const info=CERT_INFO[tipo];
  document.getElementById('formHeaderTitle').textContent=info.label;
  const badge=document.getElementById('certBadge');
  badge.textContent=info.emoji+' '+info.label; badge.className='cert-badge '+info.classe;
  document.getElementById('labelData').textContent=info.dataLabel+' *';

  // Reset all fields
  ['f-nome','f-pai','f-mae','f-data','f-email','f-whatsapp',
   'f-cep','f-rua','f-numero','f-bairro','f-complemento','f-cidade-end','f-uf-end'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  ['fg-nome','fg-pai','fg-mae','fg-data','fg-email','fg-whatsapp',
   'fg-estado','fg-cidade','fg-cartorio','fg-cep','fg-rua','fg-numero','fg-bairro',
   'fg-cidade-end','fg-uf-end'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.remove('error');
  });

  // Reset estado/cidade
  const estEl=document.getElementById('f-estado'); if(estEl) estEl.value='';
  const cidWrap=document.getElementById('fg-cidade'); if(cidWrap) cidWrap.style.display='none';
  const cidEl=document.getElementById('f-cidade');
  if(cidEl) cidEl.innerHTML='<option value="">Carregando cidades...</option>';

  // Reset cartório
  const cartWrap=document.getElementById('cartorioWrap'); if(cartWrap) cartWrap.style.display='none';
  const busOpt=document.getElementById('buscaOption'); if(busOpt) busOpt.classList.remove('active');

  // Reset entrega/apostila
  ['entrega-eletronica','entrega-fisica','apostila-sim','apostila-nao'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.remove('selected');
  });
  ['radio-eletronica','radio-fisica','radio-apostila-sim','radio-apostila-nao'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.remove(...['border-color']);
  });
  const endWrap=document.getElementById('enderecoWrap'); if(endWrap) endWrap.style.display='none';
  const frInfo=document.getElementById('freteInfo'); if(frInfo) frInfo.style.display='none';

  document.getElementById('progressBar').style.display='flex';
  irStep(1,true);
  document.getElementById('formOverlay').classList.add('active');
  document.body.style.overflow='hidden';
}
function fecharForm(){
  document.getElementById('formOverlay').classList.remove('active');
  document.body.style.overflow='';
}

// ===== PROGRESS =====
function irStep(n,force=false){
  if(!force && n>stepAtual && !validarStep(stepAtual)) return;
  stepAtual=n;
  document.querySelectorAll('.step-pane').forEach(p=>p.classList.remove('active'));
  const ids={1:'step1',2:'step2',3:'step3',4:'step4preco',5:'step5'};
  const pane=document.getElementById(ids[n]||'stepSuccess');
  if(pane) pane.classList.add('active');
  atualizarProgress(n);
  if(n===4) setTimeout(renderPreco,50);
  if(n===5) setTimeout(renderRevisao,50);
  const modal=document.querySelector('.form-modal');
  if(modal) modal.scrollTop=0;
}

function atualizarProgress(n){
  for(let i=1;i<=5;i++){
    const num=document.getElementById('pn'+i);
    const lbl=document.getElementById('pl'+i);
    if(!num||!lbl) continue;
    num.className='prog-num'; lbl.className='prog-label';
    if(i<n){num.classList.add('done');num.textContent='✓';lbl.classList.add('done');}
    else if(i===n){num.classList.add('active');num.textContent=i;lbl.classList.add('active');}
    else{num.textContent=i;}
    if(i<5){
      const line=document.getElementById('pl'+i+(i+1));
      if(line) line.className='prog-line'+(i<n?' done':'');
    }
  }
}

// ===== VALIDATION =====
function validarStep(n){
  if(n===1){
    let ok=true;
    ['nome','pai','mae','data'].forEach(f=>{
      const el=document.getElementById('f-'+f);
      const fg=document.getElementById('fg-'+f);
      if(!el||!el.value.trim()){if(fg)fg.classList.add('error');ok=false;}
      else if(fg)fg.classList.remove('error');
    });
    const eEl=document.getElementById('f-email');
    const eFg=document.getElementById('fg-email');
    if(!eEl||!eEl.value.includes('@')){if(eFg)eFg.classList.add('error');ok=false;}
    else if(eFg)eFg.classList.remove('error');
    const wEl=document.getElementById('f-whatsapp');
    const wFg=document.getElementById('fg-whatsapp');
    const wVal=(wEl?wEl.value:'').replace(/\D/g,'');
    if(wVal.length<10){if(wFg)wFg.classList.add('error');ok=false;}
    else if(wFg)wFg.classList.remove('error');
    return ok;
  }
  if(n===2){
    let ok=true;
    const estEl=document.getElementById('f-estado');
    const estFg=document.getElementById('fg-estado');
    if(!estEl||!estEl.value){if(estFg)estFg.classList.add('error');ok=false;}
    else if(estFg)estFg.classList.remove('error');
    // Data inicial obrigatória
    const dtIni=document.getElementById('f-data-ini');
    const dtIniFg=document.getElementById('fg-data-ini');
    if(!dtIni||!dtIni.value||dtIni.value.replace(/\D/g,'').length<8){
      if(dtIniFg)dtIniFg.classList.add('error'); ok=false;
    } else if(dtIniFg) dtIniFg.classList.remove('error');
    return ok;
  }
  if(n===3){
    let ok=true;
    if(!entregaSelecionada){
      const ef=document.getElementById('entregaError');
      if(ef)ef.style.display='block'; ok=false;
    } else {
      const ef=document.getElementById('entregaError');
      if(ef)ef.style.display='none';
    }
    if(!apostilaSelecionada){
      const af=document.getElementById('apostilaError');
      if(af)af.style.display='block'; ok=false;
    } else {
      const af=document.getElementById('apostilaError');
      if(af)af.style.display='none';
    }
    if(entregaSelecionada==='fisica'){
      ['cep','rua','numero','bairro'].forEach(f=>{
        const el=document.getElementById('f-'+f);
        const fg=document.getElementById('fg-'+f);
        const v=el?el.value.replace(/\D/g,''):'';
        const raw=el?el.value.trim():'';
        const vazio=(f==='cep')?(v.length<8):(!raw);
        if(vazio){if(fg)fg.classList.add('error');ok=false;}
        else if(fg)fg.classList.remove('error');
      });
      if(freteSelecionado===0){
        const frInfo=document.getElementById('freteInfo');
        if(frInfo && frInfo.style.display==='none'){
          alert('Por favor, busque seu CEP e selecione uma opção de frete.');
        } else {
          alert('Por favor, selecione PAC ou SEDEX para continuar.');
        }
        ok=false;
      }
    }
    return ok;
  }
  return true;
}

// ===== IBGE MUNICÍPIOS =====
async function onEstadoChange(){
  const fg=document.getElementById('fg-estado'); if(fg)fg.classList.remove('error');
  const estado=document.getElementById('f-estado').value;
  if(!estado) return;
  cartorioSelecionado='';
  const cidWrap=document.getElementById('fg-cidade');
  const cidEl=document.getElementById('f-cidade');
  const cartWrap=document.getElementById('cartorioWrap');
  if(cidEl) cidEl.innerHTML='<option value="">Carregando...</option>';
  if(cidWrap) cidWrap.style.display='block';
  if(cartWrap) cartWrap.style.display='none';
  try{
    const r=await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${IBGE_UF_ID[estado]}/municipios?orderBy=nome`);
    const muns=await r.json();
    let opts='<option value="">Selecione a cidade...</option>';
    muns.forEach(m=>{ opts+=`<option value="${m.nome}">${m.nome}</option>`; });
    if(cidEl) cidEl.innerHTML=opts;
  }catch(e){
    if(cidEl) cidEl.innerHTML='<option value="">Erro - tente novamente</option>';
  }
}

async function onCidadeChange(){
  const fg=document.getElementById('fg-cidade'); if(fg)fg.classList.remove('error');
  cartorioSelecionado='';
  const estado=document.getElementById('f-estado').value;
  const cidade=document.getElementById('f-cidade').value;
  const cartWrap=document.getElementById('cartorioWrap');
  const busOpt=document.getElementById('buscaOption');
  if(!cidade){if(cartWrap)cartWrap.style.display='none';return;}

  // Mostra seção cartório
  if(cartWrap) cartWrap.style.display='block';
  if(busOpt) busOpt.style.display='flex';

  if(!buscaAtiva) await carregarCartorios(estado, cidade);
}

async function carregarCartorios(estado, cidade){
  const loading=document.getElementById('cartorioLoading');
  const selCart=document.getElementById('f-cartorio');
  const errEl=document.getElementById('cartorioError');
  if(loading) loading.style.display='block';
  if(selCart) selCart.style.display='none';
  if(errEl) errEl.style.display='none';
  cartorioSelecionado='';

  let cartorios=[];
  try{
    const r=await fetch(`/api/cartorios?uf=${estado}&municipio=${encodeURIComponent(cidade)}`);
    if(r.ok){
      const data=await r.json();
      cartorios=Array.isArray(data)?data.filter(Boolean):[];
    }
  }catch(e){}

  if(loading) loading.style.display='none';

  if(!cartorios.length){
    // Não mostrar genérico - forçar serviço de busca
    if(selCart) selCart.style.display='none';
    const msgEl=document.getElementById('cartorioNaoEncontrado');
    if(!msgEl){
      const wrap=document.getElementById('fg-cartorio');
      if(wrap){
        const msg=document.createElement('div');
        msg.id='cartorioNaoEncontrado';
        msg.style.cssText='background:#fef3c7;border:1px solid #fde68a;border-radius:var(--radius-sm);padding:.9rem;font-size:.85rem;color:#92400e;line-height:1.5;margin-top:.5rem';
        msg.innerHTML='⚠️ Não encontramos cartórios cadastrados para esta cidade no sistema oficial.<br><strong>Ative o serviço de busca abaixo</strong> e nossa equipe localiza o cartório correto para você.';
        wrap.appendChild(msg);
      }
    }
    // Auto-ativar serviço de busca
    if(!buscaAtiva) toggleBusca();
    return;
  }

  // Remover mensagem de não encontrado se existir
  const msgEl=document.getElementById('cartorioNaoEncontrado');
  if(msgEl) msgEl.remove();

  if(selCart){
    selCart.style.display='block';
    let opts='<option value="">Selecione o cartório...</option>';
    cartorios.forEach(c=>{ opts+=`<option value="${c}">${c}</option>`; });
    selCart.innerHTML=opts;
  }
}

function onCartorioChange(){
  const sel=document.getElementById('f-cartorio');
  cartorioSelecionado=sel?sel.value:'';
  const errEl=document.getElementById('cartorioError');
  if(errEl) errEl.style.display=cartorioSelecionado?'none':'block';
}

function toggleBusca(){
  buscaAtiva=!buscaAtiva;
  const opt=document.getElementById('buscaOption');
  const selCart=document.getElementById('f-cartorio');
  const loading=document.getElementById('cartorioLoading');
  const errEl=document.getElementById('cartorioError');
  if(opt) opt.classList.toggle('active',buscaAtiva);
  if(buscaAtiva){
    if(selCart) selCart.style.display='none';
    if(loading) loading.style.display='none';
    if(errEl) errEl.style.display='none';
    cartorioSelecionado='';
  } else {
    const estado=document.getElementById('f-estado').value;
    const cidade=document.getElementById('f-cidade').value;
    if(estado && cidade) carregarCartorios(estado, cidade);
  }
}

// ===== ENTREGA =====
function selecionarEntrega(tipo){
  entregaSelecionada=tipo;
  ['eletronica','fisica'].forEach(t=>{
    const card=document.getElementById('entrega-'+t);
    const radio=document.getElementById('radio-'+t);
    if(card) card.classList.toggle('selected',t===tipo);
    if(radio){
      radio.style.borderColor=t===tipo?'var(--blue)':'var(--border)';
      radio.innerHTML=t===tipo?'<div style="width:8px;height:8px;border-radius:50%;background:var(--blue)"></div>':'';
    }
  });
  const endWrap=document.getElementById('enderecoWrap');
  if(endWrap) endWrap.style.display=tipo==='fisica'?'block':'none';
  const ef=document.getElementById('entregaError'); if(ef)ef.style.display='none';
}

// ===== APOSTILAMENTO =====
function toggleApostilaTooltip(){
  const t=document.getElementById('apostilaTooltip');
  if(t) t.style.display=t.style.display==='none'?'block':'none';
}
function selecionarApostila(opcao){
  apostilaSelecionada=opcao;
  ['sim','nao'].forEach(o=>{
    const card=document.getElementById('apostila-'+o);
    const radio=document.getElementById('radio-apostila-'+o);
    if(card) card.classList.toggle('selected',o===opcao);
    if(radio){
      radio.style.borderColor=o===opcao?'var(--blue)':'var(--border)';
      radio.innerHTML=o===opcao?'<div style="width:8px;height:8px;border-radius:50%;background:var(--blue)"></div>':'';
    }
  });
  const af=document.getElementById('apostilaError'); if(af)af.style.display='none';
}

// ===== CEP / FRETE =====
// Tabela de fretes Correios 2024 (envelopes até 100g, origem SP)
const FRETES_CORREIOS = {
  SP:{pac:15.90,sedex:24.90,ppac:'5-8 dias úteis',psedex:'1-2 dias úteis'},
  RJ:{pac:18.90,sedex:28.90,ppac:'5-8 dias úteis',psedex:'1-2 dias úteis'},
  MG:{pac:17.90,sedex:26.90,ppac:'5-8 dias úteis',psedex:'2-3 dias úteis'},
  ES:{pac:18.90,sedex:28.90,ppac:'6-8 dias úteis',psedex:'2-3 dias úteis'},
  PR:{pac:19.90,sedex:29.90,ppac:'6-9 dias úteis',psedex:'1-2 dias úteis'},
  SC:{pac:19.90,sedex:29.90,ppac:'6-9 dias úteis',psedex:'2-3 dias úteis'},
  RS:{pac:21.90,sedex:31.90,ppac:'7-10 dias úteis',psedex:'2-3 dias úteis'},
  DF:{pac:20.90,sedex:30.90,ppac:'6-9 dias úteis',psedex:'2-3 dias úteis'},
  GO:{pac:20.90,sedex:30.90,ppac:'7-10 dias úteis',psedex:'2-3 dias úteis'},
  MT:{pac:22.90,sedex:33.90,ppac:'8-12 dias úteis',psedex:'3-4 dias úteis'},
  MS:{pac:21.90,sedex:32.90,ppac:'7-10 dias úteis',psedex:'3-4 dias úteis'},
  BA:{pac:22.90,sedex:33.90,ppac:'7-10 dias úteis',psedex:'2-3 dias úteis'},
  PE:{pac:23.90,sedex:34.90,ppac:'8-11 dias úteis',psedex:'3-4 dias úteis'},
  CE:{pac:23.90,sedex:34.90,ppac:'8-11 dias úteis',psedex:'3-4 dias úteis'},
  MA:{pac:24.90,sedex:36.90,ppac:'9-12 dias úteis',psedex:'4-5 dias úteis'},
  PI:{pac:24.90,sedex:36.90,ppac:'9-12 dias úteis',psedex:'4-5 dias úteis'},
  RN:{pac:24.90,sedex:35.90,ppac:'8-11 dias úteis',psedex:'3-4 dias úteis'},
  PB:{pac:24.90,sedex:35.90,ppac:'8-11 dias úteis',psedex:'3-4 dias úteis'},
  AL:{pac:24.90,sedex:35.90,ppac:'8-11 dias úteis',psedex:'3-4 dias úteis'},
  SE:{pac:23.90,sedex:34.90,ppac:'8-10 dias úteis',psedex:'3-4 dias úteis'},
  PA:{pac:26.90,sedex:38.90,ppac:'10-14 dias úteis',psedex:'4-5 dias úteis'},
  AM:{pac:28.90,sedex:41.90,ppac:'12-16 dias úteis',psedex:'5-6 dias úteis'},
  AC:{pac:30.90,sedex:44.90,ppac:'14-18 dias úteis',psedex:'5-7 dias úteis'},
  RO:{pac:28.90,sedex:41.90,ppac:'12-15 dias úteis',psedex:'4-5 dias úteis'},
  RR:{pac:30.90,sedex:44.90,ppac:'14-18 dias úteis',psedex:'5-7 dias úteis'},
  AP:{pac:28.90,sedex:41.90,ppac:'12-15 dias úteis',psedex:'4-5 dias úteis'},
  TO:{pac:25.90,sedex:37.90,ppac:'9-12 dias úteis',psedex:'4-5 dias úteis'},
};

async function buscarCep(){
  const cepEl=document.getElementById('f-cep');
  const cep=(cepEl?cepEl.value:'').replace(/\D/g,'');
  if(cep.length!==8){alert('CEP inválido. Digite 8 números.');return;}

  const btn=document.querySelector('#enderecoWrap button[onclick="buscarCep()"]');
  if(btn){btn.textContent='Buscando...';btn.disabled=true;}

  try{
    // ViaCEP funciona direto no browser com CORS liberado
    const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data=await r.json();

    if(data.erro){
      alert('CEP não encontrado. Verifique e tente novamente.');
      if(btn){btn.textContent='Buscar';btn.disabled=false;}
      return;
    }

    // Preenche campos de endereço
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
    set('f-rua', data.logradouro);
    set('f-bairro', data.bairro);
    set('f-cidade-end', data.localidade);
    set('f-uf-end', data.uf);

    // Calcula frete pela tabela Correios
    const uf=data.uf;
    const fretes=FRETES_CORREIOS[uf]||{pac:29.90,sedex:44.90,ppac:'10-15 dias úteis',psedex:'5-7 dias úteis'};
    freteSelecionado=0; freteNome='';

    const frInfo=document.getElementById('freteInfo');
    const frOpt=document.getElementById('freteOpcoes');
    if(frInfo) frInfo.style.display='block';
    if(frOpt) frOpt.innerHTML=`
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.85rem;padding:8px;border-radius:6px;background:var(--white);border:1.5px solid var(--border)" id="label-pac">
          <input type="radio" name="frete" value="${fretes.pac}" onchange="selecionarFrete(${fretes.pac},'PAC',this)">
          <div>
            <div style="font-weight:600">📦 PAC — R$ ${fretes.pac.toFixed(2).replace('.',',')}</div>
            <div style="font-size:.78rem;color:var(--text-2)">${fretes.ppac}</div>
          </div>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.85rem;padding:8px;border-radius:6px;background:var(--white);border:1.5px solid var(--border)" id="label-sedex">
          <input type="radio" name="frete" value="${fretes.sedex}" onchange="selecionarFrete(${fretes.sedex},'SEDEX',this)">
          <div>
            <div style="font-weight:600">⚡ SEDEX — R$ ${fretes.sedex.toFixed(2).replace('.',',')}</div>
            <div style="font-size:.78rem;color:var(--text-2)">${fretes.psedex}</div>
          </div>
        </label>
      </div>
      <div style="font-size:.75rem;color:var(--text-3);margin-top:6px">
        * Valores baseados na tabela oficial dos Correios 2024 para documentos (envelope até 100g).
      </div>`;

    if(btn){btn.textContent='Buscar';btn.disabled=false;}
  }catch(e){
    alert('Erro ao buscar CEP. Verifique sua conexão e tente novamente.');
    if(btn){btn.textContent='Buscar';btn.disabled=false;}
  }
}
function selecionarFrete(valor, nome, inputEl){
  freteSelecionado=valor; freteNome=nome;
  // Highlight selected label
  document.querySelectorAll('#freteOpcoes label').forEach(l=>{
    l.style.borderColor='var(--border)';l.style.background='var(--white)';
  });
  if(inputEl && inputEl.closest('label')){
    inputEl.closest('label').style.borderColor='var(--blue)';
    inputEl.closest('label').style.background='var(--blue-light)';
  }
}
function mascaraCep(el){
  let v=el.value.replace(/\D/g,'');
  if(v.length>8)v=v.slice(0,8);
  el.value=v.length>5?`${v.slice(0,5)}-${v.slice(5)}`:v;
}

// ===== PREÇO =====
function getTotal(){
  const est=document.getElementById('f-estado').value;
  const base=PRECOS_ESTADO[est]||99.00;
  const busca=0; // busca incluída no serviço
  const apostila=apostilaSelecionada==='sim'?TAXA_APOSTILA:0;
  const frete=entregaSelecionada==='fisica'?freteSelecionado:0;
  return{base,busca,apostila,frete,total:base+busca+apostila+frete};
}

function renderPreco(){
  const{base,busca,apostila,frete,total}=getTotal();
  const fmt=v=>'R$ '+v.toFixed(2).replace('.',',');
  const wrap=document.getElementById('precoWrap'); if(!wrap)return;
  wrap.innerHTML=`
    <div class="price-row"><span class="price-label">Valor da certidão</span><span class="price-val">${fmt(base)}</span></div>

    ${apostila?`<div class="price-row"><span class="price-label">Apostilamento de Haia</span><span class="price-val extra">+ ${fmt(apostila)}</span></div>`:''}
    ${frete?`<div class="price-row"><span class="price-label">Frete ${freteNome}</span><span class="price-val extra">+ ${fmt(frete)}</span></div>`:''}
    <div class="price-row total"><span class="price-label">Total</span><span class="price-val">${fmt(total)}</span></div>`;
}

// ===== REVISÃO =====
function renderRevisao(){
  const info=CERT_INFO[tipoCert];
  const{base,busca,apostila,frete,total}=getTotal();
  const fmt=v=>'R$ '+v.toFixed(2).replace('.',',');
  const el=document.getElementById('revisaoConteudo'); if(!el)return;

  const endAddr=entregaSelecionada==='fisica'?`
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Endereço de entrega</div>
      <div class="review-grid">
        <div class="review-item"><div class="rlabel">Rua</div><div class="rvalue">${document.getElementById('f-rua').value}, ${document.getElementById('f-numero').value}</div></div>
        <div class="review-item"><div class="rlabel">Bairro</div><div class="rvalue">${document.getElementById('f-bairro').value}</div></div>
        <div class="review-item"><div class="rlabel">Cidade/UF</div><div class="rvalue">${document.getElementById('f-cidade-end').value} – ${document.getElementById('f-uf-end').value}</div></div>
        <div class="review-item"><div class="rlabel">CEP</div><div class="rvalue">${document.getElementById('f-cep').value}</div></div>
        ${frete?`<div class="review-item"><div class="rlabel">Frete</div><div class="rvalue">${freteNome} – ${fmt(frete)}</div></div>`:''}
      </div>
    </div>`:'';

  el.innerHTML=`
    <div class="review-section">
      <div class="review-title">Certidão</div>
      <div style="font-size:.95rem;font-weight:600">${info.emoji} ${info.label}</div>
    </div>
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Dados da pessoa</div>
      <div class="review-grid">
        <div class="review-item"><div class="rlabel">Nome</div><div class="rvalue">${document.getElementById('f-nome').value}</div></div>
        <div class="review-item"><div class="rlabel">${info.dataLabel}</div><div class="rvalue">${document.getElementById('f-data').value}</div></div>
        <div class="review-item"><div class="rlabel">Pai</div><div class="rvalue">${document.getElementById('f-pai').value}</div></div>
        <div class="review-item"><div class="rlabel">Mãe</div><div class="rvalue">${document.getElementById('f-mae').value}</div></div>
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
        <div class="review-item"><div class="rlabel">Período do registro</div><div class="rvalue">${(document.getElementById('f-data-ini')||{}).value||'—'} ${(document.getElementById('f-data-fim')&&document.getElementById('f-data-fim').value)?'até '+(document.getElementById('f-data-fim').value):''}</div></div>
        ${(document.getElementById('f-cartorio-nome')&&document.getElementById('f-cartorio-nome').value)?`<div class="review-item"><div class="rlabel">Cartório informado</div><div class="rvalue">${document.getElementById('f-cartorio-nome').value}</div></div>`:''}
      </div>
    </div>
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Entrega e extras</div>
      <div class="review-grid">
        <div class="review-item"><div class="rlabel">Tipo de entrega</div><div class="rvalue">${entregaSelecionada==='fisica'?'📦 Física (Correios)':'📧 Eletrônica (e-mail)'}</div></div>
        <div class="review-item"><div class="rlabel">Apostilamento</div><div class="rvalue">${apostilaSelecionada==='sim'?'✅ Sim (+R$ 240,00)':'❌ Não'}</div></div>
      </div>
    </div>
    ${endAddr}
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Resumo financeiro</div>
      <div class="price-card-wrap">
        <div class="price-row"><span class="price-label">Valor da certidão</span><span class="price-val">${fmt(base)}</span></div>

        ${apostila?`<div class="price-row"><span class="price-label">Apostilamento</span><span class="price-val extra">+ ${fmt(apostila)}</span></div>`:''}
        ${frete?`<div class="price-row"><span class="price-label">Frete ${freteNome}</span><span class="price-val extra">+ ${fmt(frete)}</span></div>`:''}
        <div class="price-row total"><span class="price-label">Total</span><span class="price-val">${fmt(total)}</span></div>
      </div>
    </div>`;
}

// ===== FINALIZAR =====
async function finalizarPedido(){
  const btn=document.querySelector('#step5 .btn-next.green');
  if(btn){btn.textContent='Processando...';btn.disabled=true;}
  const{base,busca,apostila,frete,total}=getTotal();
  const info=CERT_INFO[tipoCert];
  const fmt=v=>'R$ '+v.toFixed(2).replace('.',',');
  const payload={
    access_key:WEB3FORMS_KEY,
    subject:'Novo pedido – '+info.label,
    from_name:'Cartório em Casa',
    tipo_certidao:info.label,
    nome:document.getElementById('f-nome').value,
    nome_pai:document.getElementById('f-pai').value,
    nome_mae:document.getElementById('f-mae').value,
    data_evento:document.getElementById('f-data').value,
    email:document.getElementById('f-email').value,
    whatsapp:document.getElementById('f-whatsapp').value,
    estado:document.getElementById('f-estado').value,
    cidade:document.getElementById('f-cidade').value,
    cartorio_nome:  document.getElementById('f-cartorio-nome')?document.getElementById('f-cartorio-nome').value:'',
    data_ini:       document.getElementById('f-data-ini')?document.getElementById('f-data-ini').value:'',
    data_fim:       document.getElementById('f-data-fim')?document.getElementById('f-data-fim').value:'',
    entrega:entregaSelecionada==='fisica'?'Física':'Eletrônica',
    apostilamento:apostilaSelecionada==='sim'?'Sim':'Não',
    endereco_entrega:entregaSelecionada==='fisica'?
      `${document.getElementById('f-rua').value}, ${document.getElementById('f-numero').value} – ${document.getElementById('f-bairro').value}, ${document.getElementById('f-cidade-end').value}/${document.getElementById('f-uf-end').value} CEP: ${document.getElementById('f-cep').value}`:'N/A',
    frete:frete?`${freteNome} – ${fmt(frete)}`:'N/A',
    valor_total:fmt(total)
  };

  if(WEB3FORMS_KEY!=='SUA_ACCESS_KEY_AQUI'){
    try{
      await fetch('https://api.web3forms.com/submit',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(payload)
      });
    }catch(e){}
  }

  try{
    const mpRes=await fetch('/api/payment',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        nome:payload.nome,email:payload.email,
        tipo_certidao:payload.tipo_certidao,
        estado:payload.estado,valor_total:payload.valor_total
      })
    });
    if(mpRes.ok){
      const mpData=await mpRes.json();
      if(mpData.init_point){window.location.href=mpData.init_point;return;}
    }
  }catch(e){}

  document.querySelectorAll('.step-pane').forEach(p=>p.classList.remove('active'));
  document.getElementById('stepSuccess').classList.add('active');
  const pb=document.getElementById('progressBar'); if(pb)pb.style.display='none';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded',()=>{
  const ov=document.getElementById('formOverlay');
  if(ov)ov.addEventListener('click',e=>{if(e.target===ov)fecharForm();});
  const pv=document.getElementById('pdfModal');
  if(pv)pv.addEventListener('click',e=>{if(e.target===pv)fecharAviso();});
});

// ===== MINI CALENDAR =====
let calAtivo = null; // 'ini' ou 'fim'
let calAno = new Date().getFullYear();
let calMes = new Date().getMonth();

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function abrirCalendario(qual) {
  fecharCalendarios();
  calAtivo = qual;
  // Pre-fill ano/mes based on existing value
  const inp = document.getElementById('f-data-' + qual);
  if (inp && inp.value && inp.value.length === 10) {
    const parts = inp.value.split('/');
    if (parts.length === 3) {
      calMes = parseInt(parts[1]) - 1;
      calAno = parseInt(parts[2]);
    }
  } else {
    // Default: for 'ini', use birth date from step 1 if available
    if (qual === 'ini') {
      const dataEvento = document.getElementById('f-data');
      if (dataEvento && dataEvento.value) {
        const p = dataEvento.value.split('/');
        if (p.length === 3) { calMes = parseInt(p[1])-1; calAno = parseInt(p[2]); }
      } else { calAno = new Date().getFullYear()-30; calMes = 0; }
    } else {
      calAno = new Date().getFullYear(); calMes = new Date().getMonth();
    }
  }
  renderCalendario(qual);
  const cal = document.getElementById('cal-' + qual);
  if (cal) cal.style.display = 'block';
  // Close on outside click
  setTimeout(() => document.addEventListener('click', fecharCalendarioClick), 10);
}

function fecharCalendarioClick(e) {
  if (!e.target.closest('.mini-cal') && !e.target.closest('input[id^="f-data"]')) {
    fecharCalendarios();
  }
}

function fecharCalendarios() {
  ['ini','fim'].forEach(q => {
    const el = document.getElementById('cal-' + q);
    if (el) el.style.display = 'none';
  });
  document.removeEventListener('click', fecharCalendarioClick);
  calAtivo = null;
}

function renderCalendario(qual) {
  const cal = document.getElementById('cal-' + qual);
  if (!cal) return;

  const primeiroDia = new Date(calAno, calMes, 1).getDay();
  const diasNoMes = new Date(calAno, calMes + 1, 0).getDate();
  const hoje = new Date();

  // Get currently selected date
  const inp = document.getElementById('f-data-' + qual);
  let selDia = -1;
  if (inp && inp.value && inp.value.length === 10) {
    const p = inp.value.split('/');
    if (parseInt(p[1])-1 === calMes && parseInt(p[2]) === calAno) selDia = parseInt(p[0]);
  }

  let grid = DIAS_SEMANA.map(d => `<div class="mini-cal-dow">${d}</div>`).join('');
  for (let i = 0; i < primeiroDia; i++) grid += `<div class="mini-cal-day empty"></div>`;
  for (let d = 1; d <= diasNoMes; d++) {
    const isHoje = d === hoje.getDate() && calMes === hoje.getMonth() && calAno === hoje.getFullYear();
    const isSel = d === selDia;
    grid += `<div class="mini-cal-day${isSel?' selected':''}${isHoje&&!isSel?' today':''}" onclick="selecionarDia(${qual==='ini'?'\'ini\'':'\'fim\''},${d})">${d}</div>`;
  }

  cal.innerHTML = `
    <div class="mini-cal-header">
      <button onclick="navCal(-1)" type="button">‹</button>
      <span>${MESES[calMes]} ${calAno}</span>
      <button onclick="navCal(1)" type="button">›</button>
    </div>
    <div class="mini-cal-grid">${grid}</div>
    <div class="mini-cal-footer">
      <button onclick="fecharCalendarios()" type="button">Fechar</button>
      ${qual==='fim'?`<button onclick="limparData('fim')" type="button">Limpar</button>`:''}
      <button class="primary" onclick="fecharCalendarios()" type="button">OK</button>
    </div>`;
}

function navCal(dir) {
  calMes += dir;
  if (calMes < 0) { calMes = 11; calAno--; }
  if (calMes > 11) { calMes = 0; calAno++; }
  if (calAtivo) renderCalendario(calAtivo);
}

function selecionarDia(qual, dia) {
  const mes = String(calMes + 1).padStart(2, '0');
  const diaStr = String(dia).padStart(2, '0');
  const inp = document.getElementById('f-data-' + qual);
  if (inp) {
    inp.value = `${diaStr}/${mes}/${calAno}`;
    // Validate
    const fg = document.getElementById('fg-data-' + qual);
    if (fg) fg.classList.remove('error');
  }
  renderCalendario(qual);
}

function limparData(qual) {
  const inp = document.getElementById('f-data-' + qual);
  if (inp) inp.value = '';
  fecharCalendarios();
}

function mascaraData(el) {
  let v = el.value.replace(/\D/g,'');
  if (v.length > 8) v = v.slice(0,8);
  if (v.length > 4) el.value = v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4);
  else if (v.length > 2) el.value = v.slice(0,2)+'/'+v.slice(2);
  else el.value = v;
}
