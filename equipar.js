/* ============================================================
   equipar.js — EQUIPAMENTO + CLASSE globais (SETOR 7)
   Usado por: ameacas.html (hoje). Qualquer ficha/página pode usar também.
   Depende de: inventario.js (S7INV), party.js (S7P), catalogo.js (S7CATALOGO).

   COMO ATUALIZAR:
   - Item novo / preço novo / implante novo  -> só rode gerar_catalogo.py.
     As abas e os cards aparecem sozinhos (nada para editar aqui).
   - Categoria nova de item -> adicione em S7INV.CATS (inventario.js) e
     coloque a chave em CFG.ORDER abaixo.
   - Classe nova / afinidade -> edite S7P.CLASSES (party.js).
   - Quais categorias só aceitam 1 item equipado -> CFG.SINGLE.

   Os itens equipados ficam em  ficha.itens  =  [{nome,cat,efeito,raridade,desc,afin,tag,qtd}]
   (mesmo campo que o mapa.html já lê: nome + efeito).
   ============================================================ */
(function(){
  var I = window.S7INV, P = window.S7P;
  if(!I || !P){ console.warn('equipar.js precisa de inventario.js e party.js antes dele.'); return; }

  /* ---------------- CONFIG (mexa aqui) ---------------- */
  var CFG = {
    ORDER:  ['arma','corpo','armadura','hacker','implante','protese','cura','sanidade','comida','outro'],
    SINGLE: {arma:1, corpo:1, armadura:1, hacker:1},   /* equipar outro da mesma categoria TROCA o atual */
    AFIN:   {implante:1, protese:1}                     /* categorias que têm afinidade de classe */
  };

  /* ---------------- SINERGIA CLASSE x AFINIDADE (igual ao menu.html) ----------------
     nativo = 100% · compatível = dado -1 degrau, fixo/crítico -25%, sobrecarga +25%
     sem sinergia = dado -2 degraus, fixo/crítico -50%, sobrecarga +50% */
  var SIN = {
    nativo:      {n:'NATIVO',       i:'✦', c:'#46ff7a', dado:0, fix:1,   crit:1,   sob:1,    sobN:0, t:'Sinergia perfeita com a classe: rende 100%.'},
    compativel:  {n:'COMPATÍVEL',   i:'◐', c:'#ffb300', dado:1, fix:.75, crit:.75, sob:1.25, sobN:1, t:'Sinergia parcial: dado 1 degrau menor, bônus fixo e crítico −25%, sobrecarga +25%.'},
    incompativel:{n:'SEM SINERGIA', i:'✖', c:'#ff3355', dado:2, fix:.5,  crit:.5,  sob:1.5,  sobN:2, t:'Não combina com a classe: dado 2 degraus menor, bônus fixo e crítico −50%, sobrecarga +50%.'},
    livre:       {n:'UNIVERSAL',    i:'∞', c:'#22e6d2', dado:0, fix:1,   crit:1,   sob:1,    sobN:0, t:'Afinidade QUALQUER: rende 100% em todas as classes.'},
    semclasse:   {n:'SEM CLASSE',   i:'?', c:'#8a7a9a', dado:0, fix:1,   crit:1,   sob:1,    sobN:0, t:'Escolha a classe do inimigo para calcular a sinergia.'}
  };


  /* ---------------- util ---------------- */
  function esc(s){ return P.esc(s); }
  function clsOf(f){ return P.CLASSES.filter(function(c){ return c.k===f.classe; })[0] || null; }
  function sinNivel(f, it){
    var a = String(it.afin||'').toUpperCase().trim();
    if(!a || !CFG.AFIN[it.cat]) return null;
    if(a==='QUALQUER') return 'livre';
    var c = clsOf(f); if(!c) return 'semclasse';
    return a===c.nat ? 'nativo' : c.comp.indexOf(a)>=0 ? 'compativel' : 'incompativel';
  }
  function badge(nv){
    var S = SIN[nv]; if(!S) return '';
    return '<span class="eq-sin" style="--sc:'+S.c+'" title="'+esc(S.t)+'">'+S.i+' '+S.n+'</span>';
  }

  /* ---------------- catálogo (lê catalogo.js, classifica com as mesmas regras do inventário) ---------------- */
  var idx = null;
  function catalog(){
    var src = window.S7CATALOGO || [];
    if(idx && idx.n===src.length) return idx.list;
    var list = src.map(function(x){
      var cat = I.guessCat(x.nome, x.sec, x.tag, x.melee), sp = I.spec(x.nome);
      return Object.assign({}, x, {cat:cat, icone:(sp && sp.icone) || ('lucide:'+I.CATS[cat].lu)});
    });
    idx = {n:src.length, list:list};
    return list;
  }
  function find(nome){
    var n = String(nome||'').trim().toLowerCase();
    return catalog().filter(function(x){ return x.nome.toLowerCase()===n; })[0] || null;
  }
  function make(nome){
    var c = find(nome);
    if(c) return {nome:c.nome, cat:c.cat, efeito:c.efeito||'', raridade:c.raridade||'comum', desc:c.desc||'', afin:c.afin||'', tag:c.tag||'', qtd:1};
    return {nome:String(nome).trim(), cat:I.guessCat(nome,'','',false), efeito:'', raridade:'custom', desc:'', afin:'', tag:'', qtd:1};
  }
  /* itens antigos (sem cat) ganham categoria/afinidade ao serem lidos */
  function norm(it){
    if(!it.cat || !I.CATS[it.cat]){
      var c = find(it.nome);
      it.cat = c ? c.cat : I.guessCat(it.nome,'','',false);
      if(c){ it.afin = it.afin || c.afin; it.tag = it.tag || c.tag; }
    }
    if(!it.qtd || it.qtd<1) it.qtd = 1;
    return it;
  }
  /* item da ficha + dados ATUAIS do catálogo (efeito/desc/afinidade/alvo/status) */
  function enrich(it){
    var c = find(it.nome) || {}, e = Object.assign({}, it);
    ['efeito','desc','afin','tag','slot','alvo','status'].forEach(function(k){ e[k] = c[k]!=null && c[k]!=='' ? c[k] : (it[k]||''); });
    if(c.raridade) e.raridade = c.raridade;
    return e;
  }
  function iconOf(it){
    var c = find(it.nome), sp = I.spec(it.nome);
    return I.iconHTML(c ? c.icone : ((sp && sp.icone) || ('lucide:'+I.CATS[it.cat].lu)), it.cat);
  }
  function rar(r){ return I.RAR[r] || I.RAR.comum; }

  /* ---------------- CSS ---------------- */
  var css = document.createElement('style');
  css.textContent =
  '.eq{--eqa:var(--cyan,#22e6d2);}'+
  '.eq-lab{font-size:.58rem;letter-spacing:.2em;color:var(--dim,#8a7a9a);text-transform:uppercase;margin:0 0 6px;}'+
  '.eq-worn{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;padding:12px 14px;border:1px solid var(--line,#2d1040);background:rgba(0,0,0,.22);}'+
  '.eq-wrow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;}'+
  '.eq-wcat{flex:none;width:118px;font-size:.58rem;letter-spacing:.16em;color:var(--dim,#8a7a9a);text-transform:uppercase;}'+
  '.eq-chip{--rc:var(--cyan);display:inline-flex;align-items:center;gap:7px;padding:4px 6px 4px 8px;border:1px solid var(--rc);background:color-mix(in srgb,var(--rc) 10%,transparent);font-size:.74rem;}'+
  '.eq-chip .ic{color:var(--rc);display:inline-grid;place-items:center;font-size:1rem;}.eq-chip .ic svg{width:1rem;height:1rem;}'+
  '.eq-chip b{font-weight:600;}.eq-chip em{font-style:normal;color:var(--dim);font-size:.66rem;}'+
  '.eq-chip button{all:unset;cursor:pointer;color:var(--dim);padding:0 5px;font-size:.8rem;}.eq-chip button:hover{color:var(--red,#ff3355);}'+
  '.eq-none{color:var(--dim,#8a7a9a);font-size:.7rem;letter-spacing:.1em;}'+
  '.eq-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}'+
  '.eq-tab{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border:1px solid var(--line,#2d1040);'+
    'font-family:var(--hud,inherit);font-size:.7rem;font-weight:700;letter-spacing:.12em;color:var(--dim,#9a8aaa);text-transform:uppercase;background:rgba(0,0,0,.25);transition:.15s;}'+
  '.eq-tab svg{width:1rem;height:1rem;}.eq-tab:hover{color:var(--txt,#eee);border-color:var(--eqa);}'+
  '.eq-tab.on{color:#060308;background:var(--eqa);border-color:var(--eqa);}'+
  '.eq-tab small{font-size:.58rem;opacity:.75;letter-spacing:.06em;}.eq-tab .n{background:var(--red,#ff3355);color:#fff;border-radius:99px;padding:0 6px;font-size:.58rem;}'+
  '.eq-tools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}'+
  '.eq-tools input,.eq-tools select{background:#08040b;border:1px solid var(--line,#2d1040);color:var(--txt,#eee);padding:9px 12px;font-family:inherit;font-size:.78rem;}'+
  '.eq-tools input{flex:1;min-width:160px;}'+
  '.eq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;max-height:560px;overflow:auto;padding:2px 4px 2px 2px;}'+
  '.eq-card{--rc:var(--cyan);display:flex;flex-direction:column;gap:6px;padding:11px 12px;border:1px solid var(--line,#2d1040);border-top:2px solid var(--rc);background:var(--panel2,#150f1d);}'+
  '.eq-card.on{border-color:var(--rc);box-shadow:0 0 14px -4px var(--rc),inset 0 0 20px -12px var(--rc);}'+
  '.eq-top{display:flex;align-items:center;gap:9px;}'+
  '.eq-ic{flex:none;width:32px;height:32px;display:grid;place-items:center;font-size:1.3rem;color:var(--rc);border:1px solid var(--rc);background:color-mix(in srgb,var(--rc) 12%,transparent);}'+
  '.eq-ic svg{width:1.15rem;height:1.15rem;}.eq-ic img.emo{height:1.4rem;width:1.4rem;}'+
  '.eq-nome{font-weight:700;font-size:.86rem;letter-spacing:.03em;line-height:1.15;}'+
  '.eq-pills{display:flex;flex-wrap:wrap;gap:5px;}'+
  '.eq-pill{font-size:.54rem;font-weight:700;letter-spacing:.14em;padding:1px 8px;border:1px solid var(--rc);border-radius:99px;color:var(--rc);text-transform:uppercase;}'+
  '.eq-sin{display:inline-block;font-size:.54rem;font-weight:700;letter-spacing:.1em;padding:1px 8px;border:1px solid var(--sc);color:var(--sc);background:color-mix(in srgb,var(--sc) 12%,transparent);}'+
  '.eq-ef{font-size:.72rem;color:var(--txt,#eee);line-height:1.4;}'+
  '.eq-ds{font-size:.66rem;color:var(--dim,#9a8aaa);line-height:1.4;}'+
  '.eq-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:4px;}'+
  '.eq-pr{font-size:.7rem;color:var(--yellow,#e8f500);}'+
  '.eq-btn{all:unset;cursor:pointer;box-sizing:border-box;padding:6px 12px;border:1px solid var(--eqa);color:var(--eqa);font-size:.66rem;font-weight:700;letter-spacing:.14em;}'+
  '.eq-btn:hover{background:var(--eqa);color:#060308;}.eq-card.on .eq-btn{border-color:var(--red,#ff3355);color:var(--red,#ff3355);}.eq-card.on .eq-btn:hover{background:var(--red,#ff3355);color:#fff;}'+
  '.eq-custom{display:flex;gap:8px;margin-top:14px;}.eq-custom input{flex:1;background:#08040b;border:1px solid var(--line,#2d1040);color:var(--txt,#eee);padding:9px 12px;font-family:inherit;}'+
  '.eq-empty{grid-column:1/-1;padding:18px;text-align:center;color:var(--dim);font-size:.72rem;letter-spacing:.12em;}'+
  /* classes (mesmo visual da ficha) */
  '.cls-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;}'+
  '.cls-box{--cc:var(--cyan,#22e6d2);text-align:left;font-family:inherit;color:var(--txt);cursor:pointer;border:1px solid var(--line);background:rgba(0,0,0,.25);padding:12px 14px;clip-path:var(--chamfer-sm);transition:.15s;}'+
  '.cls-box:hover{border-color:var(--cc);}'+
  '.cls-box .cb-top{display:flex;align-items:center;gap:8px;font-family:var(--hud);font-weight:700;letter-spacing:.14em;font-size:.82rem;color:var(--cc);}'+
  '.cls-box .cb-top i{font-style:normal;font-size:1.15rem;}'+
  '.cls-box .cb-foco{font-size:.54rem;letter-spacing:.16em;color:var(--dim);margin-top:6px;}'+
  '.cls-box.on{border-color:var(--cc);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.3));box-shadow:0 0 14px -3px var(--cc),inset 0 0 18px -10px var(--cc);}'+
  '.cls-desc{--cc:var(--dim);margin-top:16px;padding:12px 16px;border-left:4px solid var(--cc);background:rgba(0,0,0,.22);font-size:.78rem;line-height:1.6;}'+
  '.cls-desc .cd-n{font-family:var(--hud);font-weight:700;letter-spacing:.18em;color:var(--cc);margin-bottom:4px;}'+
  '.cls-desc .cd-aff{margin-top:8px;font-size:.58rem;letter-spacing:.14em;color:var(--dim);}.cls-desc .cd-aff b{color:var(--txt);font-weight:700;}'+
  '.cls-desc.vazio{color:var(--dim);font-size:.7rem;letter-spacing:.1em;}';
  (document.head || document.documentElement).appendChild(css);

  /* ---------------- CLASSE ---------------- */
  function renderClasse(f, grid, desc, onChange){
    grid.innerHTML = '';
    P.CLASSES.forEach(function(c){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'cls-box' + (f.classe===c.k ? ' on' : '');
      b.style.setProperty('--cc', c.c);
      b.innerHTML = '<div class="cb-top"><i>'+c.i+'</i>'+c.n+'</div><div class="cb-foco">'+c.foco+'</div>';
      b.addEventListener('click', function(){
        f.classe = (f.classe===c.k) ? '' : c.k;       /* clicar de novo desmarca */
        if(onChange) onChange(f);
        renderClasse(f, grid, desc, onChange);
      });
      grid.appendChild(b);
    });
    var cur = clsOf(f);
    if(!cur){ desc.className = 'cls-desc vazio'; desc.style.removeProperty('--cc'); desc.textContent = '// NENHUMA CLASSE ESCOLHIDA //'; return; }
    desc.className = 'cls-desc'; desc.style.setProperty('--cc', cur.c);
    desc.innerHTML = '<div class="cd-n">'+cur.i+' '+cur.n+'</div>'+cur.d+
      '<div class="cd-aff">IMPLANTES: NATIVO <b>'+cur.nat+'</b> · COMPATÍVEL <b>'+cur.comp.join(', ')+'</b></div>';
  }

  /* ---------------- EQUIPAMENTO (abas estilo loja) ----------------
     mount(root, {get:()=>ficha, save:()=>void, onChange:()=>void})  */
  function mount(root, o){
    var st = {tab:null, q:'', afin:''};
    root.classList.add('eq');
    root.innerHTML =
      '<div class="eq-lab">EQUIPADO NO INIMIGO</div><div class="eq-worn" data-r="worn"></div>'+
      '<div class="eq-lab">CATÁLOGO DA LOJA <span style="opacity:.6">— tudo liberado, clique na aba da categoria</span></div>'+
      '<div class="eq-tabs" data-r="tabs"></div><div class="eq-tools" data-r="tools"></div><div class="eq-grid" data-r="grid"></div>'+
      '<div class="eq-custom"><input list="eqDl" data-r="custom" placeholder="Item personalizado ou do catálogo (ex.: SMG Viper X2)"><button class="eq-btn" data-a="custom" type="button">+ EQUIPAR</button></div>'+
      '<datalist id="eqDl"></datalist>';
    function R(k){ return root.querySelector('[data-r="'+k+'"]'); }
    function F(){ var f = o.get(); if(f){ if(!Array.isArray(f.itens)) f.itens = []; f.itens.forEach(norm); } return f; }
    function cats(){
      var have = {}; catalog().forEach(function(x){ have[x.cat] = 1; });
      return CFG.ORDER.filter(function(k){ return have[k] && I.CATS[k]; });
    }
    function changed(){ if(o.save) o.save(); if(o.onChange) o.onChange(); }

    function worn(f){
      var h = '', any = false;
      CFG.ORDER.forEach(function(k){
        var L = f.itens.filter(function(it){ return it.cat===k; });
        if(!L.length) return; any = true;
        h += '<div class="eq-wrow"><span class="eq-wcat">'+esc(I.CATS[k].n)+'</span>'+L.map(function(it){
          var sn = sinNivel(f, it);
          return '<span class="eq-chip" style="--rc:'+rar(it.raridade).c+'" title="'+esc([it.efeito,it.desc].filter(Boolean).join(' — '))+'"><span class="ic">'+iconOf(it)+'</span><b>'+esc(it.nome)+'</b>'+
            (it.qtd>1 ? '<em>×'+it.qtd+'</em>' : '')+(sn ? badge(sn) : '')+'<button type="button" data-a="rm" data-n="'+esc(it.nome)+'" title="Remover">✕</button></span>';
        }).join('')+'</div>';
      });
      R('worn').innerHTML = any ? h : '<div class="eq-none">// NADA EQUIPADO //</div>';
    }
    function tabs(f){
      var C = cats(); if(!st.tab || C.indexOf(st.tab)<0) st.tab = C[0];
      R('tabs').innerHTML = C.map(function(k){
        var n = catalog().filter(function(x){ return x.cat===k; }).length, eq = f.itens.filter(function(it){ return it.cat===k; }).length;
        return '<button type="button" class="eq-tab'+(k===st.tab?' on':'')+'" data-a="tab" data-k="'+k+'">'+I.catIcon(k)+' '+esc(I.CATS[k].n)+' <small>'+n+'</small>'+(eq?'<span class="n">'+eq+'</span>':'')+'</button>';
      }).join('');
    }
    function tools(){
      var afs = [];
      if(CFG.AFIN[st.tab]) catalog().forEach(function(x){ if(x.cat===st.tab && x.afin && afs.indexOf(x.afin)<0) afs.push(x.afin); });
      var cur = st.q;
      R('tools').innerHTML = '<input type="search" data-r="q" placeholder="Buscar nesta aba..." value="'+esc(cur)+'">'+
        (afs.length ? '<select data-r="afin"><option value="">Afinidade: todas</option>'+afs.sort().map(function(a){ return '<option'+(a===st.afin?' selected':'')+'>'+esc(a)+'</option>'; }).join('')+'</select>' : '');
    }
    function grid(f){
      var q = st.q.trim().toLowerCase();
      var L = catalog().filter(function(x){
        if(x.cat!==st.tab) return false;
        if(st.afin && String(x.afin).toUpperCase()!==st.afin.toUpperCase()) return false;
        return !q || (x.nome+' '+x.tag+' '+x.efeito+' '+x.desc).toLowerCase().indexOf(q)>=0;
      });
      R('grid').innerHTML = L.length ? L.map(function(x){
        var eq = f.itens.filter(function(it){ return it.nome===x.nome; })[0], it = {cat:x.cat, afin:x.afin}, sn = sinNivel(f, it), r = rar(x.raridade);
        return '<div class="eq-card'+(eq?' on':'')+'" style="--rc:'+r.c+'">'+
          '<div class="eq-top"><div class="eq-ic">'+I.iconHTML(x.icone, x.cat)+'</div><div class="eq-nome">'+esc(x.nome)+'</div></div>'+
          '<div class="eq-pills">'+(x.tag ? '<span class="eq-pill">'+esc(x.tag)+'</span>' : '')+'<span class="eq-pill">'+esc(r.n)+'</span>'+(x.slot ? '<span class="eq-pill">'+esc(x.slot)+'</span>' : '')+(sn ? badge(sn) : '')+'</div>'+
          (x.efeito ? '<div class="eq-ef">'+esc(x.efeito)+'</div>' : '')+
          (x.desc ? '<div class="eq-ds">'+esc(x.desc)+'</div>' : '')+
          '<div class="eq-foot"><span class="eq-pr">'+(x.preco ? Number(x.preco).toLocaleString('pt-BR')+' cr' : '')+(x.afin ? ' · '+esc(x.afin) : '')+'</span>'+
          '<button type="button" class="eq-btn" data-a="'+(eq && !I.CATS[x.cat].stack ? 'rm' : 'add')+'" data-n="'+esc(x.nome)+'">'+
            (eq ? (I.CATS[x.cat].stack ? '+1 (×'+eq.qtd+')' : '✕ REMOVER') : '✔ EQUIPAR')+'</button></div></div>';
      }).join('') : '<div class="eq-empty">// NADA ENCONTRADO NESTA ABA //</div>';
    }
    function render(){
      var f = F(); if(!f) return;
      var dl = root.querySelector('#eqDl');
      if(dl && !dl.childNodes.length) dl.innerHTML = catalog().map(function(x){ return '<option value="'+esc(x.nome)+'">'+esc(x.efeito||'')+'</option>'; }).join('');
      worn(f); tabs(f); tools(); grid(f);
      if(I.lucideRefresh) I.lucideRefresh();
    }
    function add(nome){
      var f = F(); if(!f) return;
      var it = make(nome), have = f.itens.filter(function(x){ return x.nome===it.nome; })[0];
      if(have){ if(I.CATS[have.cat].stack) have.qtd = Math.min(99, have.qtd+1); else return; }
      else {
        if(CFG.SINGLE[it.cat]) f.itens = f.itens.filter(function(x){ return x.cat!==it.cat; });
        f.itens.push(it);
      }
      changed(); render();
    }
    function remove(nome){
      var f = F(); if(!f) return;
      var have = f.itens.filter(function(x){ return x.nome===nome; })[0]; if(!have) return;
      if(have.qtd>1) have.qtd--; else f.itens = f.itens.filter(function(x){ return x!==have; });
      changed(); render();
    }
    root.addEventListener('click', function(e){
      var b = e.target.closest('[data-a]'); if(!b || !root.contains(b)) return;
      var a = b.getAttribute('data-a');
      if(a==='tab'){ st.tab = b.getAttribute('data-k'); st.afin = ''; var f = F(); tabs(f); tools(); grid(f); if(I.lucideRefresh) I.lucideRefresh(); }
      else if(a==='add') add(b.getAttribute('data-n'));
      else if(a==='rm') remove(b.getAttribute('data-n'));
      else if(a==='custom'){ var i = R('custom'); if(i.value.trim()){ add(i.value); i.value = ''; } }
    });
    root.addEventListener('input', function(e){
      if(e.target.getAttribute('data-r')==='q'){ st.q = e.target.value; var f = F(); if(f){ grid(f); if(I.lucideRefresh) I.lucideRefresh(); } }
    });
    root.addEventListener('change', function(e){
      if(e.target.getAttribute('data-r')==='afin'){ st.afin = e.target.value; var f = F(); if(f){ grid(f); if(I.lucideRefresh) I.lucideRefresh(); } }
    });
    root.addEventListener('keydown', function(e){
      if(e.key==='Enter' && e.target.getAttribute('data-r')==='custom'){ e.preventDefault(); if(e.target.value.trim()){ add(e.target.value); e.target.value = ''; } }
    });
    return {render:render};
  }

  window.S7EQ = {CFG:CFG, SIN:SIN, enrich:enrich, catalog:catalog, find:find, make:make, norm:norm, sinNivel:sinNivel, badge:badge, clsOf:clsOf, renderClasse:renderClasse, mount:mount};
})();
