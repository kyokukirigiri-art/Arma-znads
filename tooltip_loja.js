/* ============================================================
   tooltip_loja.js — balão de detalhes ao passar o mouse nos itens da loja
   Usa o MESMO ícone e tamanho do inventário (inventario.js / S7INV).
   Carregue DEPOIS de inventario.js. Não mexe em nenhum item: lê o próprio card.
   ============================================================ */
(function(){
  if(!window.S7INV) return;
  var I = S7INV, tip, cur = null, timer = 0, cache = new WeakMap();

  var css = document.createElement('style');
  css.textContent =
  '#s7tip{position:fixed;left:0;top:0;z-index:700;width:280px;max-width:90vw;pointer-events:none;opacity:0;transform:translateY(6px);'+
    'transition:opacity .12s,transform .12s;background:var(--panel2,#150f1d);border:1px solid var(--tc,#22e6d2);'+
    'box-shadow:0 8px 30px rgba(0,0,0,.65),0 0 18px color-mix(in srgb,var(--tc,#22e6d2) 35%,transparent);'+
    'font-family:var(--hud,"Chakra Petch",monospace);color:var(--txt,#eee);}'+
  '#s7tip.on{opacity:1;transform:none;}'+
  '#s7tip .t-h{padding:12px 14px 8px;}'+
  '#s7tip .t-top{display:flex;align-items:center;gap:10px;}'+
  '#s7tip .t-ico{flex:none;width:34px;height:34px;display:grid;place-items:center;font-size:1.5rem;color:var(--tc);'+
    'border:1px solid var(--tc);background:color-mix(in srgb,var(--tc) 12%,transparent);}'+
  '#s7tip .t-ico svg{width:1.3rem;height:1.3rem;}'+
  '#s7tip .t-nome{font-weight:700;font-size:1.02rem;letter-spacing:.04em;text-transform:uppercase;line-height:1.15;}'+
  '#s7tip .t-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;}'+
  '#s7tip .t-pill{font-size:.58rem;font-weight:700;letter-spacing:.16em;padding:2px 9px;border:1px solid var(--tc);border-radius:99px;color:var(--tc);}'+
  '#s7tip .t-pill.fill{background:var(--tc);color:#060308;}'+
  '#s7tip .t-desc{background:rgba(255,255,255,.9);color:#15101c;font-size:.7rem;line-height:1.45;padding:7px 14px;font-weight:600;}'+
  '#s7tip .t-lab{font-size:.58rem;letter-spacing:.2em;color:var(--dim,#8a7a9a);padding:10px 14px 4px;text-transform:uppercase;}'+
  '#s7tip .t-row{display:flex;justify-content:space-between;gap:12px;padding:6px 14px;font-size:.78rem;border-top:1px solid var(--line,#2d1040);}'+
  '#s7tip .t-row span:first-child{color:var(--dim,#9a8aaa);letter-spacing:.08em;font-size:.68rem;text-transform:uppercase;}'+
  '#s7tip .t-row b{color:var(--txt);text-align:right;font-weight:700;}'+
  '#s7tip .t-row .pr{color:var(--yellow,#e8f500);}'+
  '#s7tip .t-grid{display:inline-grid;gap:2px;vertical-align:middle;margin-right:8px;}'+
  '#s7tip .t-grid i{width:7px;height:7px;background:var(--tc);opacity:.85;}'+
  '#s7tip .t-note{padding:6px 14px 10px;font-size:.62rem;color:var(--dim,#9a8aaa);line-height:1.4;border-top:1px solid var(--line,#2d1040);}';
  (document.head||document.documentElement).appendChild(css);

  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function txt(el){ return el ? el.textContent.replace(/\s+/g,' ').trim() : ''; }

  /* lê o card e descobre categoria/raridade/ícone/tamanho com as mesmas regras do inventário */
  function info(card){
    var sec = card.closest('section'), sid = sec ? sec.id : '';
    var tags = card.querySelectorAll('.tag'), rar = 'comum', tag = '';
    if(tags.length){
      var cl = tags[tags.length-1].className.split(/\s+/).filter(function(c){ return c && c!=='tag'; });
      if(cl[0] && I.RAR[cl[0]]) rar = cl[0];
      if(tags.length > 1) tag = txt(tags[0]);
    }
    var melee = false;
    if(sid==='armas'){
      for(var p = card.previousElementSibling; p; p = p.previousElementSibling){
        if(p.classList.contains('grp-sub')){ melee = /L[ÂA]MINAS/i.test(p.textContent); break; }
      }
    }
    var nome = txt(card.querySelector('h3'));
    var cat = I.guessCat(nome, sid, tag, melee), C = I.CATS[cat];
    var sp = I.spec(nome);
    var pr = card.querySelector('.price'), extra = pr && pr.querySelector('small');
    var preco = txt(pr);
    if(extra) preco = preco.replace(txt(extra),'').trim();
    var dmg = card.querySelector('.wpn-dmg'), dl = dmg && dmg.querySelector('b');
    var crit = card.querySelector('.imp-crit');
    var mb = card.querySelectorAll('.imp-meta b');
    return {
      nome:nome, cat:cat, catNome:C.n, rar:rar, tag:tag, desc:txt(card.querySelector('p')),
      icone:(sp && sp.icone) || ('lucide:'+C.lu), w:sp ? sp.w : C.w, h:sp ? sp.h : C.h, stack:C.stack,
      preco:preco, extra:txt(extra), slot: mb[0] ? txt(mb[0]) : '', afin: mb[1] ? txt(mb[1]) : '',
      efLab: dl ? txt(dl) : '', efVal: dmg ? txt(dmg).replace(dl ? txt(dl) : '','').trim() : '',
      crit: crit ? Array.prototype.map.call(crit.children, txt) : []
    };
  }

  function sizeGrid(w,h){
    var s = '<span class="t-grid" style="grid-template-columns:repeat('+Math.min(w,6)+',7px)">';
    for(var i=0;i<Math.min(w,6)*Math.min(h,4);i++) s += '<i></i>';
    return s+'</span>';
  }

  function build(d){
    var rows = '';
    if(d.efLab) rows += '<div class="t-row"><span>'+esc(d.efLab)+'</span><b>'+esc(d.efVal)+'</b></div>';
    rows += '<div class="t-row"><span>Espaço na maleta</span><b>'+sizeGrid(d.w,d.h)+d.w+'×'+d.h+'</b></div>';
    if(d.slot) rows += '<div class="t-row"><span>Slot</span><b>'+esc(d.slot)+'</b></div>';
    if(d.afin) rows += '<div class="t-row"><span>Afinidade</span><b>'+esc(d.afin)+'</b></div>';
    if(d.stack) rows += '<div class="t-row"><span>Empilhável</span><b>sim</b></div>';
    var h = '<div class="t-h"><div class="t-top"><div class="t-ico"></div><div class="t-nome">'+esc(d.nome)+'</div></div>'+
      '<div class="t-pills"><span class="t-pill fill">'+esc(d.catNome)+'</span>'+
      (d.tag ? '<span class="t-pill">'+esc(d.tag)+'</span>' : '')+
      '<span class="t-pill">'+esc(I.RAR[d.rar].n)+'</span></div></div>'+
      (d.desc ? '<div class="t-desc">'+esc(d.desc)+'</div>' : '')+
      '<div class="t-lab">Valor</div>'+
      '<div class="t-row"><span>Preço</span><b class="pr">'+esc(d.preco)+'</b></div>'+rows+
      (d.crit.length ? '<div class="t-note">'+d.crit.map(esc).join('<br>')+'</div>' : '')+
      (d.extra ? '<div class="t-note">'+esc(d.extra)+'</div>' : '');
    return h;
  }

  function setIcon(box, d){
    var ic = d.icone;
    if(window.S7EMO && S7EMO.is(ic)){
      var name = ic.trim().slice(1,-1);
      box.innerHTML = I.catIcon(d.cat);                 /* provisório até a imagem carregar */
      S7EMO.look(name, function(u){ box.innerHTML = '<img class="emo" style="height:1.5rem;width:1.5rem" alt="" src="'+esc(u)+'">'; }, function(){});
    } else { box.innerHTML = I.iconHTML(ic, d.cat); }
    if(window.lucide) lucide.createIcons();
  }

  function ensure(){
    if(tip) return;
    tip = document.createElement('div'); tip.id = 's7tip'; tip.setAttribute('data-noemo','');
    document.body.appendChild(tip);
  }

  function place(x, y){
    var w = tip.offsetWidth, h = tip.offsetHeight, m = 16;
    var px = x + 18, py = y + 14;
    if(px + w > innerWidth - 8) px = x - w - 18;
    if(px < 8) px = 8;
    if(py + h > innerHeight - 8) py = Math.max(8, innerHeight - h - 8);
    tip.style.left = px+'px'; tip.style.top = py+'px';
  }

  function show(card, x, y){
    ensure();
    var d = cache.get(card); if(!d){ d = info(card); cache.set(card, d); }
    tip.style.setProperty('--tc', I.RAR[d.rar].c);
    tip.innerHTML = build(d);
    setIcon(tip.querySelector('.t-ico'), d);
    place(x, y);
    tip.classList.add('on');
  }
  function hide(){ clearTimeout(timer); cur = null; if(tip) tip.classList.remove('on'); }

  var mx = 0, my = 0;
  document.addEventListener('mouseover', function(e){
    var card = e.target.closest && e.target.closest('.card');
    if(!card || card === cur || !card.querySelector('h3')) return;
    if(!card.querySelector('.btn')) return;           /* só cards de produto */
    cur = card; mx = e.clientX; my = e.clientY;
    clearTimeout(timer);
    timer = setTimeout(function(){ if(cur === card) show(card, mx, my); }, 140);
  });
  document.addEventListener('mousemove', function(e){
    mx = e.clientX; my = e.clientY;
    if(tip && tip.classList.contains('on')) place(mx, my);
  });
  document.addEventListener('mouseout', function(e){
    if(!cur) return;
    var to = e.relatedTarget;
    if(!to || !cur.contains(to)) hide();
  });
  window.addEventListener('scroll', hide, true);
  document.addEventListener('click', function(e){ if(e.target.closest && e.target.closest('.btn')) hide(); });
})();
