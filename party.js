/* ============================================================
   party.js — PARTY, RETRATOS e ESTADOS (SETOR 7)
   Compartilhado por: ficha.html (edita retrato/descrição/estados)
   e base_de_comando.html (monta a party de 4 a 6 operativos).
   Dados: fichas em 's7_fichas' (campos novos: titulo, desc,
   estados[], retrato{img,zoom,x,y}) e a party em 's7_party'.
   ============================================================ */
(function(){
  var PKEY = 's7_party', MIN_SLOTS = 1, MAX_SLOTS = 9;

  /* para adicionar um estado novo, é só incluir uma linha aqui */
  var ESTADOS = [
    {k:'imobilizado',  n:'IMOBILIZADO',  i:'⛓️', c:'#ffb300'},
    {k:'sangrando',    n:'SANGRANDO',    i:'🩸', c:'#ff3355'},
    {k:'envenenado',   n:'ENVENENADO',   i:'☠️', c:'#46ff7a'},
    {k:'inconsciente', n:'INCONSCIENTE', i:'💤', c:'#7a8cff'},
    {k:'morto',        n:'MORTO',        i:'💀', c:'#9a9a9a'},
    {k:'tonto',        n:'TONTO',        i:'💫', c:'#ffd23d'},
    {k:'ciberpsicose', n:'CIBERPSICOSE', i:'⚫', c:'#ff2ea6'},
    {k:'queimando',    n:'QUEIMANDO',    i:'🔥', c:'#ff7a3d'},
    {k:'congelado',    n:'CONGELADO',    i:'🧊', c:'#7fd4ff'},
    {k:'eletrocutado', n:'ELETROCUTADO', i:'⚡', c:'#22e6d2'},
    {k:'cego',         n:'CEGO',         i:'🕶️', c:'#b8a6c4'},
    {k:'assustado',    n:'ASSUSTADO',    i:'😨', c:'#c9a0ff'},
    {k:'hackeado',     n:'HACKEADO',     i:'👾', c:'#46ff7a'},
    {k:'esgotado',     n:'ESGOTADO',     i:'🥱', c:'#ff9a3d'},
    {k:'drogado',      n:'CHAPADO',      i:'💊', c:'#ff7ad9'}
  ];

  /* CLASSES do operativo (escolhidas na ficha, viajam no código de copiar/colar).
     afin = afinidade dos implantes da loja: nativo rende o máximo, compatível rende menos. */
  var CLASSES = [
    {k:'bruto',     n:'BRUTO',     i:'💪', c:'#ff3355', foco:'FORÇA · CORPO A CORPO',
     d:'Linha de frente ofensiva. Resolve na porrada: dano pesado de perto e força para quebrar o que estiver no caminho.',
     nat:'BRUTO', comp:['TANQUE']},
    {k:'veloz',     n:'VELOZ',     i:'⚡', c:'#22e6d2', foco:'VELOCIDADE · ESQUIVA',
     d:'Age primeiro e não fica parado. Flanqueia, foge e escapa dos golpes enquanto os outros ainda estão se mexendo.',
     nat:'VELOZ', comp:['TÁTICO']},
    {k:'tanque',    n:'TANQUE',    i:'🛡', c:'#8b5bff', foco:'RESISTÊNCIA · DEFESA',
     d:'Aguenta o que derrubaria qualquer um. Segura a atenção do inimigo e protege quem está atrás.',
     nat:'TANQUE', comp:['BRUTO']},
    {k:'tatico',    n:'TÁTICO',    i:'🎯', c:'#ffb300', foco:'PERCEPÇÃO · PRECISÃO',
     d:'Enxerga o que os outros não veem. Marca alvos, acha pontos fracos e dita o ritmo da luta.',
     nat:'TÁTICO', comp:['NETRUNNER','VELOZ']},
    {k:'netrunner', n:'NETRUNNER', i:'🧠', c:'#46ff7a', foco:'HACKING · REDE',
     d:'Luta pela rede. Invade sistemas, controla dispositivos e transforma o ambiente em arma.',
     nat:'NETRUNNER', comp:['TÁTICO']},
    {k:'reforco',   n:'REFORÇO',   i:'🩺', c:'#ff7ad9', foco:'SUPORTE · EQUIPE',
     d:'Mantém o grupo de pé. Cura, fortalece aliados e cobre as falhas da equipe para que ninguém caia sozinho.',
     nat:'REFORÇO', comp:['TÁTICO','TANQUE']}
  ];

  /* ---------- NÍVEL & XP ----------
     Guardado na ficha: xp (total acumulado), nivEsc {nível: atributo escolhido}, classe2.
     O nível é CALCULADO a partir do XP (não é gravado). Níveis 1 a 15.
     Custo de cada nível: 250 + 125 × (nível atual − 1).
     Prêmios: 2 attr · 4 hab 1 · 6 attr · 8 2ª classe · 10 hab 2 · 12 attr · 14 hab da 2ª classe · 15 attr.
     Habilidades: em cada marco (4, 10 e 14) o jogador ESCOLHE 1 de 2 opções (f.habEsc); atributo e 2ª classe também são escolhas pendentes. */
  /* HABILIDADES: cada classe tem 2 MARCOS (nível 4 e 10) e cada marco oferece 2 OPÇÕES — o jogador escolhe uma.
     A 2ª classe (nível 14) escolhe entre as 2 opções do MARCO 1 dela. A escolha fica em f.habEsc {4:'NOME',10:'NOME',14:'NOME'}
     e pode ser trocada à vontade na ficha (sem perder nada). Os nomes aqui são usados pelo combate.js (aba CLASSE). */
  var HAB = {
    bruto:[[{n:'GOLPE BRUTAL',d:'1× por cena: um acerto corpo a corpo causa +1d6 de dano.'},
            {n:'DOBRO OU NADA',d:'1× por cena: o dano de um ataque é dobrado, mas o teste de acerto desse ataque sofre −3.'}],
           [{n:'ESMAGAR',d:'1× por cena: um ataque corpo a corpo ignora a redução de dano da armadura do alvo.'},
            {n:'CARGA TOTAL',d:'1× por cena: gasta o turno carregando; o próximo ataque tem +5 para acertar e rola o dano da arma duas vezes.'}]],
    veloz:[[{n:'PRIMEIRO A AGIR',d:'Em todo combate: +3 na iniciativa e uma ação extra na primeira rodada.'},
            {n:'MIRAGEM',d:'1× por cena: um ataque feito contra você erra automaticamente.'}],
           [{n:'PASSO FANTASMA',d:'1× por cena: depois de uma esquiva bem-sucedida, ganha +2 no próximo ataque e um movimento extra.'},
            {n:'RAJADA',d:'1× por cena: faz dois ataques no mesmo turno, cada um com −2 para acertar.'}]],
    tanque:[[{n:'PELE DE FERRO',d:'1× por cena: reduz em 1d8 o dano de um ataque que você sofrer.'},
             {n:'PROVOCAR',d:'1× por cena: por 2 turnos os inimigos preferem te atacar, e você reduz 1d4 de cada ataque que sofrer.'}],
            [{n:'MURALHA',d:'1× por cena: assume o ataque dirigido a um aliado próximo; você sofre o dano reduzido em 1d6.'},
             {n:'SEGUNDO FÔLEGO',d:'1× por cena: recupera 1d8 de Vida numa parte do seu corpo e remove um estado seu.'}]],
    tatico:[[{n:'PONTO FRACO',d:'1× por cena: marca um inimigo; você e seus aliados ganham +2 para acertá-lo por 2 turnos.'},
             {n:'TIRO CERTEIRO',d:'1× por cena: um ataque seu acerta automaticamente, sem teste.'}],
            [{n:'LEITURA DE CAMPO',d:'1× por cena: em um teste de ataque ou de percepção, role 2d20 e fique com o maior.'},
             {n:'ORDEM TÁTICA',d:'1× por cena: um aliado (ou você) age agora, com uma ação extra e +2 no teste.'}]],
    netrunner:[[{n:'INVASÃO RÁPIDA',d:'1× por cena: um hack sem precisar de teste, ou +1d6 no dano de um hack.'},
                {n:'CURTO-CIRCUITO',d:'1× por cena: o alvo fica ELETROCUTADO por 2 turnos (−2 em todos os testes; +1d4 de sobrecarga por implante ativado).'}],
               [{n:'SURTO DE REDE',d:'1× por cena: um hack atinge até 3 alvos ou dispositivos ao mesmo tempo.'},
                {n:'BACKDOOR',d:'1× por cena: abre uma brecha no próprio sistema e reduz a sua Sobrecarga em 15%.'}]],
    reforco:[[{n:'PRIMEIROS SOCORROS',d:'1× por cena: cura 1d6 de Vida numa parte do corpo de um aliado (ou sua).'},
              {n:'ESTIMULANTE',d:'1× por cena: um aliado (ou você) ganha +2 em todos os testes por 2 turnos.'}],
             [{n:'ADRENALINA',d:'1× por cena: remove um estado de um aliado e dá +2 no próximo teste dele.'},
              {n:'ROLETA DE NANITES',d:'1× por cena: rola 1d6 e libera um efeito aleatório num aliado (ou em você): 1 pane · 2-3 cura · 4 limpa um estado · 5 +2 no teste · 6 combo de tudo.'}]]
  };
  CLASSES.forEach(function(c){ c.slots = HAB[c.k] || []; c.hab = c.slots.map(function(s){ return s[0]; }); });
  var ATRS = [['vel','VELOCIDADE','⚡'],['forca','FORÇA','💪'],['sorte','SORTE','🎲'],['int','INTELIGÊNCIA','🧠']];
  var NV_MAX = 15, PREMIOS = {2:'attr',4:'hab1',6:'attr',8:'cls',10:'hab2',12:'attr',14:'hab3',15:'attr'};
  function xpCusto(n){ return 250 + 125*(n-1); }                       /* XP para ir do nível n ao n+1 */
  function xpAcum(n){ var t=0; for(var i=1;i<n;i++) t += xpCusto(i); return t; }   /* XP total para ESTAR no nível n */
  var XP_MAX = xpAcum(NV_MAX);
  function nivelDe(xp){ xp = Math.max(0, +xp||0); var n=1; while(n<NV_MAX && xp>=xpAcum(n+1)) n++; return n; }
  function nivel(f){ return nivelDe(f && f.xp); }
  function classeObj(k){ return CLASSES.filter(function(c){ return c.k===k; })[0] || null; }
  function opcoesClasse2(f){
    var c = classeObj(f.classe); if(!c) return [];
    return c.comp.map(function(nm){ return CLASSES.filter(function(x){ return x.n===nm; })[0]; }).filter(Boolean);
  }
  /* marcos de habilidade: nível, de qual classe e qual par de opções */
  function marcos(f){ return [{lv:4, c:classeObj(f.classe), i:0}, {lv:10, c:classeObj(f.classe), i:1}, {lv:14, c:classeObj(f.classe2), i:0}]; }
  function opcoesHab(f, lv){
    var m = marcos(f).filter(function(x){ return x.lv===+lv; })[0];
    return (m && m.c && m.c.slots[m.i]) ? {classe:m.c, opts:m.c.slots[m.i]} : null;
  }
  function habilidades(f){
    var nv = nivel(f), out = [], he = (f && f.habEsc && typeof f.habEsc==='object') ? f.habEsc : {};
    marcos(f).forEach(function(m){
      if(nv < m.lv || !m.c) return;
      var ops = m.c.slots[m.i] || [], h = ops.filter(function(x){ return x.n===he[m.lv]; })[0];
      if(h) out.push({lv:m.lv, classe:m.c, n:h.n, d:h.d, outra:ops.filter(function(x){ return x!==h; })[0] || null});
    });
    return out;
  }
  function pendentes(f){
    ensure(f); var nv = nivel(f), out = [];
    for(var lv=2; lv<=nv; lv++){
      if(PREMIOS[lv]==='attr' && !f.nivEsc[lv]) out.push({lv:lv, tipo:'attr'});
      if(PREMIOS[lv]==='cls' && !f.classe2) out.push({lv:lv, tipo:'cls'});
      if(/^hab/.test(PREMIOS[lv]||'')){ var oh = opcoesHab(f, lv); if(oh && !f.habEsc[lv]) out.push({lv:lv, tipo:'hab', classe:oh.classe, opts:oh.opts}); }
    }
    return out;
  }
  /* desfaz escolhas de níveis que a ficha não alcança mais (XP removido ou código importado torto) */
  function desfaz(f){
    var nv = nivel(f);
    Object.keys(f.nivEsc).forEach(function(lv){
      var k = f.nivEsc[lv], ok = PREMIOS[lv]==='attr' && ATRS.some(function(a){ return a[0]===k; });
      if(!ok){ delete f.nivEsc[lv]; return; }
      if(+lv > nv){
        if(f.atributos && typeof f.atributos==='object') f.atributos[k] = (+f.atributos[k]||10) - 1;
        delete f.nivEsc[lv];
      }
    });
    if(nv < 8) f.classe2 = '';
  }
  function logNv(t){ try{ if(window.S7LOG) S7LOG.add('nota', t); }catch(e){} }
  function darXp(f, delta){
    ensure(f);
    var a = nivel(f), x0 = f.xp;
    f.xp = Math.max(0, Math.min(XP_MAX, x0 + Math.round(+delta||0)));
    desfaz(f);
    var b = nivel(f), d = f.xp - x0;
    if(d) logNv((f.nome||'Operativo')+': '+(d>0?'+':'')+d+' XP'+(b!==a ? ' · nível '+a+' → '+b : ''));
    return {de:a, para:b, xp:f.xp, delta:d};
  }
  function escolher(f, lv, val){
    ensure(f); lv = +lv;
    if(lv > nivel(f)) return false;
    var t = PREMIOS[lv];
    if(t==='attr'){
      var a = ATRS.filter(function(x){ return x[0]===val; })[0];
      if(!a || f.nivEsc[lv]) return false;
      if(!f.atributos || typeof f.atributos!=='object') f.atributos = {};
      f.atributos[val] = (+f.atributos[val]||10) + 1; f.nivEsc[lv] = val;
      logNv((f.nome||'Operativo')+': nível '+lv+' · +1 '+a[1]); return true;
    }
    if(t==='cls'){
      var c = opcoesClasse2(f).filter(function(x){ return x.k===val; })[0];
      if(!c || f.classe2) return false;
      f.classe2 = val; logNv((f.nome||'Operativo')+': nível '+lv+' · segunda classe '+c.n); return true;
    }
    return false;
  }

  /* escolhe (ou TROCA, sem custo) a habilidade de um marco: 4, 10 ou 14 */
  function escolherHab(f, lv, nome){
    ensure(f); lv = +lv;
    if(lv > nivel(f)) return false;
    var oh = opcoesHab(f, lv); if(!oh) return false;
    var h = oh.opts.filter(function(x){ return x.n===nome; })[0]; if(!h) return false;
    var antes = f.habEsc[lv]; if(antes===h.n) return false;
    f.habEsc[lv] = h.n;
    logNv((f.nome||'Operativo')+': nível '+lv+' · habilidade '+(antes ? 'trocada para ' : '')+h.n);
    return true;
  }

  function esc(s){
    return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }
  function fichas(){
    var f; try{ f = JSON.parse(localStorage.getItem('s7_fichas')||'[]'); }catch(e){ f=[]; }
    return Array.isArray(f) ? f : [];
  }
  function saveFichas(list){
    try{ localStorage.setItem('s7_fichas', JSON.stringify(list)); return true; }
    catch(e){ alert('Sem espaço no navegador para salvar. Use uma imagem menor.'); return false; }
  }
  function ensure(f){
    if(!f.retrato || typeof f.retrato!=='object') f.retrato = {img:'',zoom:100,x:0,y:0};
    var r = f.retrato;
    r.img = r.img || ''; r.zoom = +r.zoom || 100; r.x = +r.x || 0; r.y = +r.y || 0;
    if(!Array.isArray(f.estados)) f.estados = [];
    if(f.desc==null) f.desc = '';
    if(f.titulo==null) f.titulo = '';
    if(typeof f.classe!=='string' || !CLASSES.some(function(c){ return c.k===f.classe; })) f.classe = '';
    /* nível & XP */
    f.xp = Math.max(0, Math.min(XP_MAX, Math.round(+f.xp) || 0));
    if(!f.nivEsc || typeof f.nivEsc!=='object' || Array.isArray(f.nivEsc)) f.nivEsc = {};
    if(typeof f.classe2!=='string' || !CLASSES.some(function(c){ return c.k===f.classe2; })) f.classe2 = '';
    if(f.classe2 && f.classe && !opcoesClasse2(f).some(function(c){ return c.k===f.classe2; })) f.classe2 = '';
    if(!f.habEsc || typeof f.habEsc!=='object' || Array.isArray(f.habEsc)) f.habEsc = {};
    Object.keys(f.habEsc).forEach(function(lv){
      var oh = opcoesHab(f, lv);
      if(!oh || !oh.opts.some(function(x){ return x.n===f.habEsc[lv]; })) delete f.habEsc[lv];
    });
    desfaz(f);
    return f;
  }

  /* ---------- party ---------- */
  function getParty(){
    var p; try{ p = JSON.parse(localStorage.getItem(PKEY)||'null'); }catch(e){ p=null; }
    if(!p || typeof p!=='object') p = {};
    var n = Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, parseInt(p.n,10)||MIN_SLOTS));
    var s = Array.isArray(p.slots) ? p.slots.slice(0,n) : [];
    while(s.length<n) s.push(null);
    return {n:n, slots:s.map(function(x){ return x||null; })};
  }
  function saveParty(p){ try{ localStorage.setItem(PKEY, JSON.stringify(p)); }catch(e){} }
  function inParty(id){ return getParty().slots.indexOf(id) >= 0; }
  function addToParty(id){
    var p = getParty(); if(p.slots.indexOf(id)>=0) return true;
    var i = p.slots.indexOf(null); if(i<0) return false;
    p.slots[i] = id; saveParty(p); return true;
  }
  function removeFromParty(id){
    var p = getParty(); p.slots = p.slots.map(function(x){ return x===id ? null : x; }); saveParty(p);
  }

  /* ---------- números da ficha ---------- */
  function stats(f){
    var at=0, mx=0, k, pt = f.partes || {};
    for(k in pt){ at += Number(pt[k].atual)||0; mx += Number(pt[k].max)||0; }
    var ov = 0; (f.implantes||[]).forEach(function(im){ ov += Number(im.pct)||0; });
    ov = Math.max(0, ov + (Number(f.sobreAjuste)||0));
    return {vida:at, vidaMax:mx, comida:Number(f.comida)||0, comidaMax:100, sobre:ov};
  }
  function estadoChips(f, withName){
    return (f.estados||[]).map(function(k){
      var e = ESTADOS.filter(function(x){ return x.k===k; })[0]; if(!e) return '';
      return '<span class="est-chip" title="'+e.n+'" style="--ec:'+e.c+'">'+e.i+(withName?' '+e.n:'')+'</span>';
    }).join('');
  }

  /* ---------- retrato ---------- */
  function portraitHTML(r){
    if(!r || !r.img || String(r.img).indexOf('data:image/')!==0) return '<div class="pt-empty">SEM<br>IMAGEM</div>';
    return '<img class="pt-img" alt="" draggable="false" src="'+esc(r.img)+'" style="transform:translate('+(+r.x||0)+'%,'+(+r.y||0)+'%) scale('+((+r.zoom||100)/100)+')">';
  }
  /* Qualidade real: lado maior até 1600px (não amplia imagens menores), redução em etapas
     com suavização alta e WebP em qualidade 0.95. Se o resultado passar de ~700 KB, baixa a
     qualidade aos poucos (e por último o tamanho) para não estourar o localStorage. */
  var PT_MAX = 1600, PT_Q = [.95, .9, .85, .8, .72], PT_BYTES = 700*1024;
  function resample(im, w, h){
    var src = im, sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
    while(sw/2 >= w && sh/2 >= h){            /* reduz pela metade enquanto der: evita serrilhado/borrão */
      var c = document.createElement('canvas'); c.width = Math.round(sw/2); c.height = Math.round(sh/2);
      var x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, c.width, c.height);
      src = c; sw = c.width; sh = c.height;
    }
    var f = document.createElement('canvas'); f.width = w; f.height = h;
    var g = f.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, h);
    return f;
  }
  function encode(c){
    var u = '', i;
    for(i = 0; i < PT_Q.length; i++){
      u = c.toDataURL('image/webp', PT_Q[i]);
      if(u.indexOf('data:image/webp') !== 0){ u = c.toDataURL('image/png'); break; }   /* navegador sem WebP */
      if(u.length * 0.75 <= PT_BYTES) break;
    }
    return u;
  }
  function compress(file, cb){
    var fr = new FileReader();
    fr.onload = function(){
      var im = new Image();
      im.onload = function(){
        var W = im.naturalWidth || im.width, H = im.naturalHeight || im.height;
        var s = Math.min(1, PT_MAX/Math.max(W, H)), w = Math.round(W*s), h = Math.round(H*s);
        var u = encode(resample(im, w, h));
        /* ainda grande demais? encolhe 15% por vez até caber (mín. 900px) */
        while(u.length*0.75 > PT_BYTES*1.4 && Math.max(w, h) > 900){
          w = Math.round(w*.85); h = Math.round(h*.85); u = encode(resample(im, w, h));
        }
        cb(u);
      };
      im.onerror = function(){ alert('Não consegui ler essa imagem.'); };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* editor de retrato: get() devolve o objeto retrato (mutável); save() persiste */
  function mountEditor(box, get, save){
    box.innerHTML =
      '<div class="pt-frame pt-edit"></div><input type="file" accept="image/*" hidden>'+
      '<div class="pt-btns"><button type="button" class="pt-b up">⬆ ENVIAR IMAGEM</button><button type="button" class="pt-b cl">✕ REMOVER</button></div>'+
      '<label class="pt-l">ESCALA <b class="zv"></b></label><input type="range" class="zr" min="30" max="400">'+
      '<label class="pt-l">POSIÇÃO HORIZONTAL</label><input type="range" class="xr" min="-100" max="100">'+
      '<label class="pt-l">POSIÇÃO VERTICAL</label><input type="range" class="yr" min="-100" max="100">'+
      '<div class="pt-hint">arraste a imagem no quadro · roda do mouse = zoom</div>';
    var fr = box.querySelector('.pt-frame'), file = box.querySelector('input[type=file]'),
        z = box.querySelector('.zr'), xs = box.querySelector('.xr'), ys = box.querySelector('.yr'), zv = box.querySelector('.zv');
    function paint(){
      var r = get();
      fr.innerHTML = portraitHTML(r);
      z.value = r.zoom; xs.value = r.x; ys.value = r.y; zv.textContent = Math.round(r.zoom)+'%';
    }
    var tmr;
    function later(){ clearTimeout(tmr); tmr = setTimeout(save, 250); }
    function live(){ var r=get(); r.zoom=+z.value; r.x=+xs.value; r.y=+ys.value; paint(); later(); }
    z.addEventListener('input', live); xs.addEventListener('input', live); ys.addEventListener('input', live);

    box.querySelector('.up').addEventListener('click', function(){ file.click(); });
    box.querySelector('.cl').addEventListener('click', function(){
      var r = get(); r.img=''; r.zoom=100; r.x=0; r.y=0; paint(); save();
    });
    file.addEventListener('change', function(){
      var f = file.files && file.files[0]; if(!f) return;
      compress(f, function(u){ var r=get(); r.img=u; r.zoom=100; r.x=0; r.y=0; paint(); save(); });
      file.value = '';
    });
    var drag = null;
    fr.addEventListener('pointerdown', function(e){
      var r = get(); if(!r.img) return;
      drag = {sx:e.clientX, sy:e.clientY, x:r.x, y:r.y, w:fr.clientWidth, h:fr.clientHeight};
      fr.setPointerCapture(e.pointerId); e.preventDefault();
    });
    fr.addEventListener('pointermove', function(e){
      if(!drag) return; var r = get();
      r.x = Math.max(-100, Math.min(100, drag.x + (e.clientX-drag.sx)/drag.w*100));
      r.y = Math.max(-100, Math.min(100, drag.y + (e.clientY-drag.sy)/drag.h*100));
      paint();
    });
    function end(){ if(drag){ drag=null; save(); } }
    fr.addEventListener('pointerup', end); fr.addEventListener('pointercancel', end);
    fr.addEventListener('wheel', function(e){
      var r = get(); if(!r.img) return; e.preventDefault();
      r.zoom = Math.max(30, Math.min(400, r.zoom + (e.deltaY<0 ? 8 : -8))); paint(); later();
    }, {passive:false});
    paint();
    return {paint:paint};
  }


  /* ---------- CÓDIGO DE FICHA (copiar / colar) ---------- */
  function b64(u){var s='';for(var i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function ub64(t){t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';var s=atob(t),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
  /* opts.semImagem: tira o retrato (a imagem é o que deixa o código gigante) */
  async function fichaCode(f, opts){
    var c = JSON.parse(JSON.stringify(f));
    if(opts && opts.semImagem && c.retrato) c.retrato = {img:'',zoom:100,x:0,y:0};
    var u=new TextEncoder().encode(JSON.stringify({k:'F',f:c}));
    if(window.CompressionStream){try{var z=new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'));return 'S7Z-'+b64(new Uint8Array(await new Response(z).arrayBuffer()));}catch(e){}}
    return 'S7P-'+b64(u);
  }
  /* aceita o código mesmo com texto em volta, quebras de linha ou espaços (WhatsApp, Discord, e-mail).
     devolve candidatos, do mais longo ao mais curto; o primeiro que decodificar vence */
  function candidates(t){
    t=String(t||''); var i=t.search(/S7[ZP]-/); if(i<0) return [];
    var toks=t.slice(i).split(/\s+/), out=[], acc='';
    for(var k=0;k<toks.length;k++){
      if(!/^[\w-]+$/.test(toks[k])) break;
      acc+=toks[k]; out.push(acc);
    }
    return out.reverse();
  }
  async function decode(code){
    var m=code.match(/^S7([ZP])-([\w-]+)$/); if(!m) throw new Error('formato');
    var u=ub64(m[2]);
    if(m[1]==='Z'){
      if(!window.DecompressionStream) throw new Error('nodecomp');
      var z=new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'));u=new Uint8Array(await new Response(z).arrayBuffer());
    }
    var o=JSON.parse(new TextDecoder().decode(u));
    if(!o||o.k!=='F'||!o.f||typeof o.f!=='object') throw new Error('não é ficha');
    return o.f;
  }
  async function fichaFromCode(t){
    var cs=candidates(t), f=null, last=new Error('formato');
    for(var i=0;i<cs.length&&!f;i++){
      try{ f=await decode(cs[i]); }catch(e){ last=e; if(e.message==='nodecomp') throw e; }
    }
    if(!f) throw last;
    f.id='f_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    f.nome=String(f.nome||'Importado').slice(0,60); return ensure(f);
  }

  /* caixa de diálogo própria (prompt() corta textos grandes e o clipboard falha fora do clique) */
  function modal(html){
    var m=document.createElement('div'); m.className='s7-modal';
    m.innerHTML='<div class="box" style="max-width:460px">'+html+'</div>';
    document.body.appendChild(m);
    m.addEventListener('mousedown',function(e){ if(e.target===m) m.close&&m.close(); });
    return m;
  }
  function legacyCopy(ta){
    try{ ta.focus(); ta.select(); ta.setSelectionRange(0,ta.value.length); return document.execCommand('copy'); }catch(e){ return false; }
  }
  function copyText(text, ta){
    if(navigator.clipboard && window.isSecureContext){
      return navigator.clipboard.writeText(text).then(function(){return true;},function(){return legacyCopy(ta);});
    }
    return Promise.resolve(legacyCopy(ta));
  }
  var TA = 'width:100%;height:130px;resize:vertical;background:#000;color:var(--cyan,#22e6d2);border:1px solid var(--cyan,#22e6d2);font-family:monospace;font-size:.62rem;padding:8px;word-break:break-all';

  async function copyFichaCode(f){
    var temImg = !!(f.retrato && f.retrato.img);
    var m = modal('<h3>📤 CÓDIGO DA FICHA</h3>'+
      '<textarea class="cc-ta" readonly style="'+TA+'"></textarea>'+
      '<div class="cc-info" style="font-size:.6rem;color:var(--dim,#8a7a9a);margin:6px 0"></div>'+
      (temImg?'<label style="display:block;font-size:.62rem;margin:8px 0;cursor:pointer"><input type="checkbox" class="cc-img"> incluir retrato (código bem maior; pode não caber em alguns apps)</label>':'')+
      '<div class="pt-btns"><button type="button" class="pt-b cc-copy">📋 COPIAR</button><button type="button" class="pt-b cl cc-close">FECHAR</button></div>');
    var ta=m.querySelector('.cc-ta'), info=m.querySelector('.cc-info'), ck=m.querySelector('.cc-img'), btn=m.querySelector('.cc-copy');
    m.close=function(){ m.remove(); };
    m.querySelector('.cc-close').onclick=m.close;
    async function gen(){
      ta.value='gerando…';
      var c=await fichaCode(f,{semImagem:!(ck&&ck.checked)});
      ta.value=c; info.textContent=c.length+' caracteres'+(c.indexOf('S7P-')===0?' · sem compressão (navegador antigo)':'');
    }
    ta.addEventListener('focus',function(){ ta.select(); }); ta.addEventListener('click',function(){ ta.select(); });
    if(ck) ck.addEventListener('change',gen);
    btn.onclick=function(){
      copyText(ta.value,ta).then(function(ok){
        btn.textContent = ok ? '✔ COPIADO!' : 'Selecione o texto e use Ctrl+C';
        if(!ok){ ta.focus(); ta.select(); }
        setTimeout(function(){ btn.textContent='📋 COPIAR'; },2200);
      });
    };
    await gen();
  }

  function pasteFichaCode(){
    return new Promise(function(resolve){
      var m = modal('<h3>📥 COLAR CÓDIGO</h3>'+
        '<textarea class="cc-ta" placeholder="Cole aqui o código (começa com S7Z- ou S7P-)" style="'+TA+'"></textarea>'+
        '<div class="cc-err" style="font-size:.62rem;color:#ff5a5a;min-height:1em;margin:6px 0"></div>'+
        '<div class="pt-btns"><button type="button" class="pt-b cc-ok">IMPORTAR</button><button type="button" class="pt-b cl cc-close">CANCELAR</button></div>');
      var ta=m.querySelector('.cc-ta'), err=m.querySelector('.cc-err');
      function done(v){ m.remove(); resolve(v); }
      m.close=function(){ done(null); };
      m.querySelector('.cc-close').onclick=m.close;
      m.querySelector('.cc-ok').onclick=async function(){
        err.textContent='';
        try{
          var f=await fichaFromCode(ta.value), l=fichas(); l.push(f);
          if(!saveFichas(l)) return;
          try{localStorage.setItem('s7_currentFicha',f.id);}catch(e){}
          done(f);
        }catch(e){
          err.textContent = !ta.value.trim() ? 'Cole o código primeiro.'
            : e.message==='nodecomp' ? 'Este navegador não consegue abrir códigos comprimidos (S7Z). Atualize o navegador.'
            : 'Código inválido ou incompleto. Peça para copiar de novo, com o código inteiro.';
        }
      };
      setTimeout(function(){ ta.focus(); },30);
    });
  }

  /* ---------- USAR ITEM (cura / sobrecarga / comida) — itens da antiga categoria 'sanidade' agora REDUZEM a sobrecarga ---------- */
  function heal(f,n){
    var pt=f.partes||{},ks=Object.keys(pt).sort(function(a,b){return (pt[b].max-pt[b].atual)-(pt[a].max-pt[a].atual);});
    ks.forEach(function(k){var falta=(Number(pt[k].max)||0)-(Number(pt[k].atual)||0),d=Math.min(falta,n);if(d>0){pt[k].atual=(Number(pt[k].atual)||0)+d;n-=d;}});
  }
  /* lê o efeito do item: "CURA +25", "CURA %100 [Todos]", "RECARREGAR +15"; comida sem efeito = +10 */
  function efeitoDe(it){
    var e=String(it.efeito||''),m=e.match(/(CURA|RECARREGAR)\s*([+%])\s*(\d+)/i);
    var all=/\[todos\]/i.test(e);
    if(it.cat==='cura'&&m)return{tipo:'vida',pct:m[2]==='%',n:+m[3],todos:all};
    if(it.cat==='sanidade'&&m)return{tipo:'sobre',pct:m[2]==='%',n:+m[3],todos:all};
    if(it.cat==='comida'){var c=e.match(/\+\s*(\d+)/);return{tipo:'comida',pct:false,n:c?+c[1]:10,todos:false};}
    return null;
  }
  /* selo "LEVEL-X" no canto superior esquerdo do retrato. Fica invisível e só aparece quando o pai tem .on (operativo em foco). */
  function lvBadge(f){ var c = classeObj(f && f.classe); return '<span class="s7-lv"'+(c ? ' style="--cc:'+c.c+'"' : '')+'>LEVEL-'+nivel(f)+'</span>'; }
  function aplicar(f,ef){
    ensure(f);var s=stats(f);
    if(ef.tipo==='vida')heal(f,ef.pct?Math.round(s.vidaMax*ef.n/100):ef.n);
    else if(ef.tipo==='sobre'){var red=(ef.pct&&ef.n>=100)?s.sobre:ef.n;f.sobreAjuste=(Number(f.sobreAjuste)||0)-Math.min(s.sobre,red);}
    else f.comida=Math.min(50,s.comida+ef.n);
    if(ef.tipo==='vida'){var i=f.estados.indexOf('inconsciente');if(i>=0&&stats(f).vida>0)f.estados.splice(i,1);}
  }

  /* ---------- CSS compartilhado ---------- */
  var css =
  '.s7-lv{position:absolute;top:0;left:0;z-index:4;pointer-events:none;background:var(--cc,var(--cyan,#22e6d2));color:#060308;font:700 .6rem/1 var(--hud,monospace);letter-spacing:.14em;padding:4px 8px;white-space:nowrap;opacity:0;transform:translateY(-5px);transition:opacity .15s,transform .15s}'+
  '.th.on .s7-lv,.pm.on .s7-lv{opacity:1;transform:none}'+
  '.th .s7-lv{font-size:.48rem;letter-spacing:.06em;padding:3px 5px}'+
  '.pt-frame{position:relative;aspect-ratio:3/5;overflow:hidden;background:#000;width:100%}'+
  '.pt-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 50%;user-select:none;-webkit-user-drag:none;pointer-events:none}'+
  '.pt-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;font-size:.6rem;letter-spacing:.3em;color:#3d4a4d;border:1px dashed #22383c;line-height:1.8}'+
  '.pt-edit{border:1px solid var(--cyan,#22e6d2);cursor:grab;touch-action:none}.pt-edit:active{cursor:grabbing}'+
  '.pt-btns{display:flex;gap:8px;margin:10px 0 4px;flex-wrap:wrap}'+
  '.pt-b{flex:1;background:rgba(34,230,210,.08);border:1px solid var(--cyan,#22e6d2);color:var(--cyan,#22e6d2);padding:8px 10px;font-family:inherit;font-size:.62rem;letter-spacing:.16em;cursor:pointer}'+
  '.pt-b:hover{background:var(--cyan,#22e6d2);color:#04120f}.pt-b.cl{flex:0 0 auto;border-color:#ff5a5a;color:#ff5a5a;background:transparent}.pt-b.cl:hover{background:#ff5a5a;color:#0b0b0b}'+
  '.pt-l{display:block;font-size:.55rem;letter-spacing:.22em;color:var(--dim,#8a7a9a);margin:9px 0 3px}.pt-l b{color:var(--cyan,#22e6d2);font-weight:400}'+
  '.pt-edit ~ input[type=range]{width:100%;accent-color:var(--cyan,#22e6d2)}'+
  '.pt-hint{font-size:.52rem;letter-spacing:.14em;color:var(--dim,#8a7a9a);margin-top:8px}'+
  '.est-chip{display:inline-flex;align-items:center;gap:3px;padding:1px 5px;font-size:.7rem;border:1px solid var(--ec);color:var(--ec);background:rgba(0,0,0,.55);border-radius:3px;white-space:nowrap}'+
  '.s7-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:16px}'+
  '.s7-modal .box{background:var(--panel,#0b1416);border:1px solid var(--cyan,#22e6d2);padding:18px;max-width:340px;width:100%;max-height:92vh;overflow:auto;box-shadow:0 0 30px rgba(34,230,210,.25)}'+
  '.s7-modal h3{font-family:var(--hud,inherit);letter-spacing:.2em;font-size:.85rem;color:var(--cyan,#22e6d2);margin-bottom:12px}';
  var st = document.createElement('style'); st.id = 's7p-css'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  window.S7P = {
    ESTADOS:ESTADOS, CLASSES:CLASSES, MIN_SLOTS:MIN_SLOTS, MAX_SLOTS:MAX_SLOTS, esc:esc,
    fichas:fichas, saveFichas:saveFichas, ensure:ensure,
    NV_MAX:NV_MAX, PREMIOS:PREMIOS, ATRS:ATRS, XP_MAX:XP_MAX, xpCusto:xpCusto, xpAcum:xpAcum, nivelDe:nivelDe, nivel:nivel, classeObj:classeObj, opcoesClasse2:opcoesClasse2, lvBadge:lvBadge, habilidades:habilidades, opcoesHab:opcoesHab, escolherHab:escolherHab, pendentes:pendentes, darXp:darXp, escolher:escolher,
    getParty:getParty, saveParty:saveParty, inParty:inParty, addToParty:addToParty, removeFromParty:removeFromParty,
    fichaCode:fichaCode, fichaFromCode:fichaFromCode, copyFichaCode:copyFichaCode, pasteFichaCode:pasteFichaCode, efeitoDe:efeitoDe, aplicar:aplicar, stats:stats, estadoChips:estadoChips, portraitHTML:portraitHTML, mountEditor:mountEditor
  };
})();