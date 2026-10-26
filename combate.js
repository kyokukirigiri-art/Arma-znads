/* ============================================================
   combate.js — CÁLCULO DE ACERTO / DANO / HABILIDADES (SETOR 7)
   Mesmas regras da aba BATALHA do menu.html, mas lendo a FICHA direto
   (ficha.itens, ficha.atributos, ficha.classe, ficha.estados...).
   Depende de: party.js (S7P), inventario.js (S7INV), catalogo.js, equipar.js (S7EQ).

   ARMA ESCOLHIDA (mãos): o ataque usa UMA arma escolhida no seletor,
   listando todas as armas/corpo a corpo equipadas (com a mão de cada uma).
   Se as duas mãos tiverem armas do mesmo tipo, você escolhe qual usar.
   O campo do item é `mao` ('dir' | 'esq' | ''). Sem mão = listado mesmo assim.

   HABILIDADE DE CLASSE (aba CLASSE): lê S7P.habilidades(ficha) (party.js). 1× por cena; NOVA CENA recarrega.
   Efeitos automáticos: Golpe Brutal, Esmagar, Passo Fantasma, Ponto Fraco, Leitura de Campo, Invasão Rápida,
   Surto de Rede, Primeiros Socorros, Adrenalina, Pele de Ferro, Muralha. Textos/níveis: HAB em party.js.

   COMO ATUALIZAR:
   - Regra de estado (debuffs)  -> tabela EST abaixo.
   - Tabela de sangramento/tontura por arma -> LIMITES abaixo.
   - Dano/bônus/habilidade de item -> NÃO mexa aqui: edite a loja e rode gerar_catalogo.py.
   - Sinergia classe x implante -> S7EQ.SIN (equipar.js).

   Uso:  S7CB.mount(elemento, {
           get:()=>ficha,            // ficha atual
           save:()=>void,            // grava
           onFicha:()=>void,         // redesenha vida/sobrecarga depois de mudar a ficha
           allies:()=>[fichas],      // alvos de cura/buff (opcional)
           items:(f)=>[itens]        // itens equipados da ficha (opcional; padrão: ficha.itens)
         })  ->  {render()}
   ============================================================ */
(function(){
  var P = window.S7P, I = window.S7INV, Q = window.S7EQ;
  if(!P || !I || !Q){ console.warn('combate.js precisa de party.js, inventario.js e equipar.js antes dele.'); return; }

  var DADOS = [4,6,8,10,12,20];
  var NIVEL = [['Leve','1d6',10],['Moderado','1d10',13],['Grave','1d12+5',16]];

  /* ---- ESTADOS (debuffs) que mexem nos testes — valores das REGRAS ----
     all = todos os testes · atk = ataques · vel = Velocidade · int = Inteligência (negativos) */
  var EST = {
    esgotado:{all:-2,t:'−2 em todos os testes'}, assustado:{all:-2,t:'−2 em todos os testes (medo)'},
    eletrocutado:{all:-2,t:'−2 em todos os testes · +1d4 de sobrecarga por implante ativado'},
    tonto:{atk:-2,vel:-2,t:'−2 em ataques e em Velocidade'}, cego:{atk:-5,t:'−5 em ataques e em testes de visão; não mira à distância'},
    congelado:{vel:-3,t:'−3 em Velocidade; só ações com as mãos'},
    imobilizado:{vel:-3,t:'−3 em Velocidade (uma perna) · desvantagem em Velocidade (duas pernas)'},
    drogado:{vel:-2,int:-2,t:'−2 em Velocidade e Inteligência'},
    inconsciente:{block:'Inconsciente: não age.'}, morto:{block:'Morto: não age.'}, ciberpsicose:{block:'Ciberpsicose: virou NPC, o mestre controla.'},
    sangrando:{dot:'nivel',t:'perde Vida no começo do turno: Leve 1d6 · Moderado 1d10 · Grave 1d12+5'},
    queimando:{dot:'1d8',t:'perde 1d8 de Vida no começo do turno'}, envenenado:{dot:'1d6',t:'perde 1d6 de Vida no começo do turno'},
    hackeado:{t:'sem regra definida'}
  };
  /* arma corpo a corpo -> [regex, tipo(s=corte/t=impacto), limiar d20, nível sangramento, duração tontura] */
  var LIMITES = [[/lanca arc/,'s',4,0],[/faca/,'s',5,0],[/katana/,'s',6,0],[/espada/,'s',7,1],[/monolamina/,'s',8,1],[/garras/,'s',9,1],
                 [/machado/,'s',10,2],[/foice/,'s',11,2],[/bastao/,'t',5,0],[/punho titan/,'t',7,0],[/martelo/,'t',10,0]];

  /* ---------- util de dados ---------- */
  function rl(n){ return 1+Math.floor(Math.random()*n); }
  /* aceita "1d6+5", "+8" e também vários dados: "1d20+1d20+10" (Katana, Martelo, Foice) */
  function pd(t){
    var str = String(t||'').replace(/\s+/g,''), terms = str.split('+').filter(Boolean), d = null, bonus = 0, more = [];
    terms.forEach(function(x){
      var m = /^(\d*)d(\d+)$/i.exec(x);
      if(m){ var one = {n:+(m[1]||1), s:+m[2]}; if(!d) d = one; else more.push(one); }
      else if(/^\d+$/.test(x)) bonus += +x;
    });
    if(!d) return bonus ? {n:0,s:0,b:bonus} : null;
    return {n:d.n, s:d.s, b:bonus, more:more};
  }
  function rd(d){
    var r = [], i; if(!d) return {t:0,tx:'0'};
    for(i=0;i<d.n;i++) r.push(rl(d.s));
    var t = r.reduce(function(a,b){ return a+b; },0) + d.b, tx = (d.n ? d.n+'d'+d.s+'['+r.join(',')+']' : '');
    (d.more||[]).forEach(function(m){ var q = [], k; for(k=0;k<m.n;k++) q.push(rl(m.s)); t += q.reduce(function(a,b){ return a+b; },0); tx += '+'+m.n+'d'+m.s+'['+q.join(',')+']'; });
    return {t:t, tx:tx+(d.b ? (tx?'+':'')+d.b : '')};
  }
  function sg(n){ return (n>=0?'+':'')+n; }
  function esc(s){ return P.esc(s); }
  function dadoDown(d,n){ if(!d||!d.s||!n) return d; var k = DADOS.indexOf(d.s); if(k<0) return d; return {n:d.n, s:DADOS[Math.max(0,k-n)], b:d.b}; }
  function dtxt(d){ return d ? (d.n ? d.n+'d'+d.s : '')+(d.b ? (d.n?'+':'')+d.b : '') : ''; }
  function mod(f,k){ return (Number(f.atributos && f.atributos[k])||10)-10; }
  function estNome(k){ var e = P.ESTADOS.filter(function(x){ return x.k===k; })[0]; return e ? e.n : k; }
  function chip(k){ var e = P.ESTADOS.filter(function(x){ return x.k===k; })[0]; return e ? '<span class="cb-chp" style="--ec:'+e.c+'">'+e.i+' '+e.n+'</span>' : ''; }
  function handName(it){ return it.mao==='dir' ? 'MÃO DIREITA' : it.mao==='esq' ? 'MÃO ESQUERDA' : 'sem mão'; }

  /* ---------- itens da ficha ---------- */
  var SRC = null;   /* fonte de itens opcional: o.items(f) — o menu.html usa o inventário (owner) em vez de ficha.itens */
  function mine(f){ return (SRC ? SRC(f) : (f.itens||[])).map(Q.norm).map(function(it){ var e = Q.enrich(it); e.id = e.id || it.nome; return e; }); }
  function reatorRed(f){
    var r = 0;
    mine(f).forEach(function(x){ if(/^reactor heart/i.test(x.nome)){ var m = String(x.efeito).match(/-(\d+)%/); if(m) r = Math.max(r,+m[1]); } });
    return r;
  }
  /* bônus/crítico/sobrecarga/dano do item JÁ ajustados pela sinergia da classe do inimigo */
  function efi(E,f){
    var e = String(E.efeito||''),
      b = e.match(/B[ÔO]NUS\s+[^\d\n·]*?(\d*d\d+(?:\+\d+)?)/i), c = e.match(/CR[ÍI]TICO:\s*b[ôo]nus\s*(\d+)/i),
      g = e.match(/gasta\s*(\d+)\s*de sobrecarga/i), d = e.match(/DANO\s*((?:\d*d\d+\+)*\d*d\d+(?:\+\d+)?)/i),
      o = {bonus:b&&pd(b[1]), crit:c?+c[1]:0, gasta:g?+g[1]:0, dano:d&&pd(d[1]), nivel:null, sobN:0},
      nv = Q.sinNivel(f,E), S = nv && Q.SIN[nv];
    o.nivel = nv;
    if(S){
      if(o.bonus){ o.bonus = dadoDown(o.bonus,S.dado); o.bonus.b = Math.floor(o.bonus.b*S.fix); }
      o.crit = Math.floor(o.crit*S.crit); o.gasta = Math.ceil(o.gasta*S.sob); o.sobN = S.sobN;
    }
    o.red = reatorRed(f); if(o.red) o.gasta = Math.round(o.gasta*(1-o.red/100));
    return o;
  }
  /* arma com bônus de duas mãos (texto do catálogo: "2 MÃOS: +1d4 no acerto" ou "2 MÃOS: +1d6 no dano") */
  function duasInfo(w){
    var m = w ? String(w.efeito||'').match(/2\s*M[ÃAãa]OS:\s*\+(\d*d\d+)\s*no\s*(acerto|dano)/i) : null;
    return m ? {dado:m[1], tipo:m[2].toLowerCase()} : null;
  }
  function limArma(w){
    if(!w) return null;
    var n = String(w.nome).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    for(var i=0;i<LIMITES.length;i++) if(LIMITES[i][0].test(n)) return {tipo:LIMITES[i][1], lim:LIMITES[i][2], nivel:LIMITES[i][3], dur:/martelo/.test(n)?3:2, nome:w.nome};
    return null;
  }

  /* ---------- habilidade ativa de implante/prótese ---------- */
  function ativoInfo(E,f){
    if(E.cat!=='implante' && E.cat!=='protese') return null;
    var d = String(E.desc||''), ef = String(E.efeito||''),
      h = d.match(/Habilidade\s*[—–-]\s*([^:]+?)\s*:\s*([\s\S]*)$/i), cu = ef.match(/CUSTO:\s*(\d+)/i);
    if(!h || !cu) return null;
    var rc = ef.match(/RECARGA:\s*(\d+)\s*turnos?/i), rr = /RECARGA:[^·]*por rodada/i.test(ef), dv = ef.match(/DESVANTAGEM:\s*([\s\S]*)$/i),
      nv = Q.sinNivel(f,E), S = Q.SIN[nv] || Q.SIN.nativo, red = reatorRed(f), base = +cu[1],
      custo = Math.max(1, Math.round(base*S.sob*(1-red/100))),
      txt = h[2].trim().replace(/(\d+)%/g, function(m,n){ return Math.round(n*S.fix)+'%'; });
    return {it:E, nome:h[1].trim(), txt:txt, orig:h[2].trim(), base:base, custo:custo, nv:nv, S:S,
            cd:rc ? +rc[1] : rr ? 1 : 0, cdTxt:rc ? rc[1]+' turnos' : rr ? '1x por rodada' : 'sem recarga',
            dv:dv ? dv[1].trim() : '', alvo:E.alvo || (/escolhe um aliado/i.test(d) ? 'aliado' : ''), st:E.status||''};
  }

  /* ---------- CSS ---------- */
  var css = document.createElement('style');
  css.textContent =
  '.cb-top{min-height:84px;padding:12px 14px;margin-bottom:12px;border:1px solid var(--line,#2d1040);border-left:4px solid var(--cyan,#22e6d2);background:rgba(0,0,0,.3);font-size:.78rem;line-height:1.6;}'+
  '.cb-top hr{border:0;border-top:1px dashed var(--line,#2d1040);margin:8px 0;}'+
  '.cb-tt{font-family:var(--hud,inherit);font-weight:700;font-size:1.05rem;letter-spacing:.08em;margin-bottom:2px;}'+
  '.cb-tt.ok{color:#46ff7a;}.cb-tt.no,.cb .no{color:var(--red,#ff3355);}.cb-tt.cr{color:#ffe62a;}'+
  '.cb-cmd{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}'+
  '.cb-cmd button{all:unset;cursor:pointer;box-sizing:border-box;padding:8px 14px;border:1px solid var(--line,#2d1040);font-family:var(--hud,inherit);font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--dim,#9a8aaa);background:rgba(0,0,0,.25);}'+
  '.cb-cmd button.on{background:var(--cyan,#22e6d2);border-color:var(--cyan,#22e6d2);color:#060308;}'+
  '.cb-opt{display:flex;flex-direction:column;gap:9px;padding:12px 14px;border:1px solid var(--line,#2d1040);background:rgba(0,0,0,.22);font-size:.76rem;}'+
  '.cb-opt label{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}.cb-opt label.off{opacity:.4;}'+
  '.cb-opt select,.cb-opt input[type=number]{background:#08040b;border:1px solid var(--line,#2d1040);color:var(--txt,#eee);padding:6px 8px;font-family:inherit;}'+
  '.cb-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;}'+
  '.cb-b{all:unset;cursor:pointer;box-sizing:border-box;padding:9px 16px;border:1px solid var(--cyan,#22e6d2);color:var(--cyan,#22e6d2);font-size:.7rem;font-weight:700;letter-spacing:.14em;}'+
  '.cb-b:hover{background:var(--cyan,#22e6d2);color:#060308;}.cb-b[disabled]{opacity:.35;pointer-events:none;}'+
  '.cb-stat{display:flex;justify-content:space-between;gap:10px;padding-bottom:6px;border-bottom:1px solid var(--line,#2d1040);}.cb-stat b{font-weight:600;}'+
  '.cb-est{padding:8px 10px;border:1px dashed var(--line,#2d1040);display:flex;flex-direction:column;gap:4px;}'+
  '.cb-er{border-left:3px solid var(--ec);padding-left:8px;font-size:.7rem;}.cb-er span{color:var(--dim,#9a8aaa);}'+
  '.cb-chp{display:inline-block;padding:0 6px;border:1px solid var(--ec);color:var(--ec);font-size:.62rem;}'+
  '.cb-sg{padding:8px 10px;border:1px solid var(--red,#ff3355);display:flex;flex-direction:column;gap:5px;}.cb-sg .h{font-weight:700;letter-spacing:.1em;color:var(--red,#ff3355);}'+
  '.cb-arm{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border:1px solid var(--cyan,#22e6d2);background:rgba(34,230,210,.04);}'+
  '.cb-arm .h{font-weight:700;letter-spacing:.12em;color:var(--cyan,#22e6d2);font-size:.66rem;text-transform:uppercase;}'+
  '.cb-arm .mao{font-size:.62rem;color:var(--dim,#9a8aaa);letter-spacing:.08em;}'+
  '.cb-arm .aviso{font-size:.66rem;color:#ffb300;}'+
  '.cb-at-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;}'+
  '.cb-at{--sc:var(--cyan);display:flex;flex-direction:column;gap:5px;padding:11px 12px;border:1px solid var(--line,#2d1040);border-top:2px solid var(--sc);background:var(--panel2,#150f1d);}'+
  '.cb-at .h{display:flex;justify-content:space-between;gap:8px;align-items:center;}.cb-at .n{font-weight:700;color:var(--sc);letter-spacing:.06em;}'+
  '.cb-at .t{font-size:.72rem;line-height:1.45;}.cb-at .m{font-size:.64rem;color:var(--dim,#9a8aaa);}.cb-at .d{font-size:.66rem;color:#ffb300;}'+
  '.cb-log{font-size:.62rem;color:var(--dim,#9a8aaa);line-height:1.6;min-height:20px;}'+
  '.cb-none{color:var(--dim,#9a8aaa);font-size:.72rem;letter-spacing:.08em;}';
  (document.head || document.documentElement).appendChild(css);

  /* ============================================================ */
  function mount(root, o){
    SRC = o.items || null;
    var bt = {cmd:'atk', wid:null, imp:'', ext:false, ficha:true, nd:13, mult:4, res:{}, log:[], cd:{}, tg:{}, sgN:0, adv:0, arm:0, nano:false, pernas2:false, fid:null, cena:{}, fx:{}, marca:0, todas:false, maos:false, maosTurno:[]};
    if(window.S7LOG) S7LOG.hook(bt.log,'combate');
    root.classList.add('cb');
    function F(){ var f = o.get(); if(f){ P.ensure(f); if(bt.fid!==f.id){ bt.fid = f.id; bt.res = {}; bt.imp = ''; bt.wid = null; bt.sgN = 0; bt.fx = {}; bt.marca = 0; bt.maos = false; bt.maosTurno = []; } } return f; }
    function allies(){ return (o.allies ? o.allies() : []).map(P.ensure); }
    function saved(){ if(o.save) o.save(); if(o.onFicha) o.onFicha(); }
    function cdk(f,id){ return f.id+'|'+id; }

    /* ---- contexto: todos os itens + armas que podem atacar (1 por mão) + a escolhida ----
       lista = armas/corpo a corpo equipadas (com a mão). sel = a escolhida no seletor (ou null = sem arma).
       arma/corpo = o `sel` separado por tipo, para o resto do código continuar igual. */
    function ctx(f){
      var all = mine(f);
      var lista = all.filter(function(i){ return (i.cat==='arma' || i.cat==='corpo') && i.owner===f.id; })
                     .sort(function(a,b){ return (a.mao==='dir'?0:a.mao==='esq'?1:2) - (b.mao==='dir'?0:b.mao==='esq'?1:2); });
      var sel = null;
      if(bt.wid==='__soco') sel = null;
      else { sel = lista.filter(function(i){ return i.id===bt.wid; })[0] || lista[0] || null; }
      bt.wid = sel ? sel.id : (bt.wid==='__soco' ? '__soco' : null);
      return {f:f, all:all, lista:lista, sel:sel,
              arma: sel && sel.cat==='arma' ? sel : null,
              corpo: sel && sel.cat==='corpo' ? sel : null,
              hack: all.filter(function(i){ return i.cat==='hacker' && i.owner===f.id; })[0] || null,
              imps: all.filter(function(i){ return (i.cat==='implante'||i.cat==='protese') && i.owner===f.id && efi(i,f).bonus; })};
    }

    /* ---- modificadores de estado ---- */
    function modInfo(f,kind,k){
      var tot = 0, pt = [], desv = false, block = '';
      (f.estados||[]).forEach(function(s){
        var d = EST[s]; if(!d) return;
        if(d.block && !block) block = d.block;
        var c = [d.all, kind==='atk'?d.atk:0, k==='vel'?d.vel:0, k==='int'?d.int:0].filter(Boolean), m = c.length ? Math.min.apply(null,c) : 0;
        if(m){ tot += m; pt.push(estNome(s)+' '+sg(m)); }
        if(s==='imobilizado' && bt.pernas2 && k==='vel'){ desv = true; pt.push('IMOBILIZADO (2 pernas) desvantagem'); }
        if(d.desv){ desv = true; pt.push(estNome(s)+' desvantagem'); }
      });
      return {tot:tot, pt:pt, desv:desv, block:block};
    }
    function advNet(auto){ var n = (bt.adv||0)+(auto?-1:0); return n>0 ? 1 : n<0 ? -1 : 0; }
    function r20(adv){
      var a = rl(20); if(!adv) return {v:a, tx:'d20['+a+']'};
      var b = rl(20), v = adv>0 ? Math.max(a,b) : Math.min(a,b);
      return {v:v, tx:'d20['+a+','+b+']→'+v+(adv>0?' (vantagem)':' (desvantagem)')};
    }
    /* 'arma' | 'corpo' | 'soco', conforme a arma escolhida */
    function mode(c){ return c.sel ? (c.sel.cat==='arma' ? 'arma' : 'corpo') : 'soco'; }
    function pickImp(c){ var it = c.imps.filter(function(i){ return i.id===bt.imp; })[0]; return it || (bt.cmd==='skill' ? c.imps[0] : null); }
    function log(t){ bt.log.unshift(t); }

    /* ---- dano contínuo (sangrando/queimando/envenenado) ---- */
    function dot(f){
      var es = f.estados||[], L = es.filter(function(s){ return EST[s] && EST[s].dot; }), parts = [], tot = 0;
      if(!L.length || es.indexOf('morto')>=0) return null;
      L.forEach(function(s){ var dice = EST[s].dot==='nivel' ? NIVEL[bt.sgN||0][1] : EST[s].dot, x = rd(pd(dice)); tot += x.t; parts.push({n:estNome(s), tx:x.tx+' = '+x.t}); });
      return {parts:parts, total:tot, done:false};
    }
    function dotApply(f){
      var d = bt.res.dot; if(!d || d.done) return;
      var pt = f.partes||{}, at = function(k){ return Number(pt[k].atual)||0; }, ks = Object.keys(pt).filter(function(k){ return at(k)>0; }),
        tot = ks.reduce(function(s,k){ return s+at(k); },0), n = Math.min(d.total,tot), left = n;
      ks.forEach(function(k){ var c = Math.min(at(k), left, Math.round(n*at(k)/tot)); pt[k].atual = at(k)-c; left -= c; });
      ks.forEach(function(k){ var c = Math.min(at(k), left); pt[k].atual = at(k)-c; left -= c; });
      if(P.stats(f).vida<=0 && f.estados.indexOf('inconsciente')<0) f.estados.push('inconsciente');
      d.done = true; log(f.nome+': −'+n+' de vida por estados'); saved(); draw();
    }

    /* ---- ACERTO ---- */
    function hit(){
      var f = F(), c = ctx(f), m = mode(c), k = m==='arma' ? 'vel' : 'forca', im = pickImp(c), pt = [], tot = 0, mi = modInfo(f,'atk',k);
      if(mi.block){ bt.res = {msg:'<span class="no">✖ '+esc(mi.block)+'</span>'}; return draw(); }
      var duas = bt.maos && c.sel ? duasInfo(c.sel) : null, usos = bt.maosTurno || [];
      if(c.sel && !bt.fx.rajada){
        var conflito = duas ? usos.length>0 : (!!c.sel.mao && (usos.indexOf(c.sel.mao)>=0 || usos.indexOf('ambas')>=0));
        if(conflito){ bt.res = {msg:'<span class="no">✖ '+(duas ? 'Duas mãos precisa das duas mãos livres neste turno. ' : 'Essa mão já atacou neste turno. ')+'Use PASSAR TURNO.</span>'}; return draw(); }
      }
      if(bt.fx.esmagarSg && !bt.fx.esmagar) delete bt.fx.esmagarSg;
      var an = advNet(mi.desv); if(bt.fx.leitura && an<=0) an = 1;
      var R = r20(an), d20 = R.v;
      if(bt.cmd==='skill' && !im){ bt.res = {msg:'<span class="no">Equipe uma prótese/implante com BÔNUS na seção EQUIPAMENTO.</span>'}; return draw(); }
      var md = mod(f,k); tot = d20+md+mi.tot; pt.push(R.tx, (k==='vel'?'VEL':'FOR')+sg(md)); if(mi.pt.length) pt.push('ESTADOS '+mi.pt.join(' · '));
      if(c.sel) pt.push('ARMA: '+c.sel.nome+' ('+handName(c.sel)+')');
      if(duas && duas.tipo==='acerto'){ var bdA = rd(pd(duas.dado)); tot += bdA.t; pt.push('2 MÃOS '+bdA.tx); }
      if(bt.fx.leitura){ pt.push('LEITURA DE CAMPO (2d20, o maior)'); delete bt.fx.leitura; }
      if(bt.fx.passo){ tot += 2; pt.push('PASSO FANTASMA +2'); delete bt.fx.passo; }
      if(bt.fx.adren){ tot += 2; pt.push('ADRENALINA +2'); delete bt.fx.adren; }
      if(bt.fx.ordem){ tot += 2; pt.push('ORDEM TÁTICA +2'); delete bt.fx.ordem; }
      if(bt.fx.estim>0){ tot += 2; pt.push('ESTIMULANTE +2 ('+bt.fx.estim+' turno'+(bt.fx.estim>1?'s':'')+')'); }
      if(bt.fx.dobro){ tot -= 3; pt.push('DOBRO OU NADA −3'); }
      if(bt.fx.carga){ tot += 5; pt.push('CARGA TOTAL +5'); }
      if(bt.fx.rajada>0){ tot -= 2; bt.fx.rajada--; pt.push('RAJADA −2 ('+(bt.fx.rajada ? 'falta 1 ataque' : 'último ataque')+')'); if(!bt.fx.rajada) delete bt.fx.rajada; }
      if(bt.marca>0){ tot += 2; pt.push('PONTO FRACO +2 ('+bt.marca+' turno'+(bt.marca>1?'s':'')+')'); }
      if(bt.ficha && f.extra && f.extra[k]){ var x0 = rd(pd(f.extra[k])); tot += x0.t; pt.push('extra ficha '+x0.tx); }
      var sob = null, s0 = P.stats(f).sobre;
      if(im){
        var e = efi(im,f), x;
        if(bt.ext && e.crit){ x = {t:e.crit, tx:'CRÍTICO '+e.crit}; sob = {n:e.gasta||e.crit, fail:false, ext:true}; }
        else {
          x = rd(e.bonus); var g = rl(4), lim = s0<=30 ? 1 : s0<=85 ? 2 : s0<=99 ? 3 : 4;
          sob = {n:Math.max(1, Math.round((g+e.sobN)*(1-(e.red||0)/100))), fail:g<=lim, ext:false, roll:g, extra:e.sobN, red:e.red};
        }
        tot += x.t; pt.push(im.nome+(e.nivel && Q.SIN[e.nivel] && e.nivel!=='nativo' && e.nivel!=='livre' ? ' ['+Q.SIN[e.nivel].n+']' : '')+' '+x.tx);
      }
      if(sob && (f.estados||[]).indexOf('eletrocutado')>=0){ sob.emp = rl(4); sob.n += sob.emp; }
      var ok = tot>=bt.nd, cls = d20===20 ? 'cr' : d20===1 ? 'no' : ok ? 'ok' : 'no', lab = d20===20 ? '✦ SUCESSO CRÍTICO' : d20===1 ? '✖ FALHA CRÍTICA' : ok ? 'ACERTOU' : 'ERROU';
      if(d20===20) ok = true; if(d20===1) ok = false;
      if(bt.fx.certeiro){ ok = true; cls = 'ok'; lab = '🎯 TIRO CERTEIRO — ACERTO AUTOMÁTICO'; delete bt.fx.certeiro; }
      bt.res = {hit:'<div class="cb-tt '+cls+'">'+lab+' — '+tot+' vs '+bt.nd+'</div>'+pt.join(' · '), ok:ok, sob:sob, nat20:d20===20};
      if(c.sel){ if(duas) bt.maosTurno = usos.concat(['ambas']); else if(c.sel.mao) bt.maosTurno = usos.concat([c.sel.mao]); }
      log(f.nome+': acerto '+tot+' vs '+bt.nd+' → '+lab); bt.res.dot = dot(f); draw();
    }
    /* ---- DANO ---- */
    function dmg(){
      var f = F(), c = ctx(f), m = mode(c), im = pickImp(c), pt = [], t = 0, w = m==='arma' ? c.arma : m==='corpo' ? c.corpo : null,
        wd = w ? efi(w,f).dano : pd('1d4'), x = rd(wd); t += x.t; pt.push((w ? w.nome : 'Soco')+' '+x.tx);
      if(m!=='arma' && mod(f,'forca')>0){ t += mod(f,'forca'); pt.push('FOR'+sg(mod(f,'forca'))); }
      if(im){ var e = efi(im,f), y = bt.ext && e.crit ? {t:e.crit, tx:'CRÍTICO '+e.crit} : rd(e.bonus); t += y.t; pt.push(im.nome+' '+y.tx); }
      var ddm = bt.maos && c.sel ? duasInfo(c.sel) : null;
      if(ddm && ddm.tipo==='dano'){ var bdD = rd(pd(ddm.dado)); t += bdD.t; pt.push('2 MÃOS '+bdD.tx); }
      var esm = '';
      if(bt.fx.carga){ var ca = rd(wd); t += ca.t; pt.push('CARGA TOTAL: 2º dano '+ca.tx); delete bt.fx.carga; }
      if(bt.fx.brutal){
        if(m==='corpo' || m==='soco'){ var gb = rd(pd('1d6')); t += gb.t; pt.push('GOLPE BRUTAL '+gb.tx); delete bt.fx.brutal; } else pt.push('(Golpe Brutal só vale corpo a corpo — continua guardado)');
      }
      if(bt.fx.esmagar && (m==='corpo' || m==='soco')){ esm = '<br>🔨 <b>ESMAGAR</b>: ignora a redução de dano da armadura do alvo.'; delete bt.fx.esmagar; }
      var dob = bt.fx.dobro ? 2 : 1; if(dob>1){ pt.push('DOBRO OU NADA ×2'); delete bt.fx.dobro; }
      var fin = t*bt.mult*dob; bt.res.dmg = '<div class="cb-tt cr">DANO '+fin+'</div>('+pt.join(' + ')+') = '+t+' × '+bt.mult+(dob>1?' × 2':'')+esm;
      log(f.nome+': dano '+fin); draw();
    }
    /* ---- SANGRAMENTO / TONTURA ---- */
    function sangUI(c,m){
      var L = m==='corpo' && limArma(c.corpo); if(!L) return '';
      var red = bt.arm||0, lim = Math.max(0,L.lim-red);
      return '<div class="cb-sg"><div class="h">'+(L.tipo==='s'?'🩸 SANGRAMENTO':'💫 TONTURA')+' · '+esc(L.nome)+'</div>'+
        '<label>Armadura do alvo <select id="cbArm">'+[[0,'nenhuma'],[1,'comum (−1)'],[2,'rara (−2)'],[3,'experimental/proibida (−3)']].map(function(x){ return '<option value="'+x[0]+'"'+((bt.arm||0)===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></label>'+
        (L.tipo==='s' ? '<label><input type="checkbox" id="cbNano"'+(bt.nano?' checked':'')+'> alvo tem Nanite Blood (2d20, fica o pior)</label>' : '')+
        '<div>limiar '+L.lim+(red?' −'+red:'')+' = <b>≤ '+lim+'</b> ('+lim*5+'%)'+(L.tipo==='s' ? ' · nível '+NIVEL[L.nivel][0]+' ('+NIVEL[L.nivel][1]+' por turno)' : ' · dura '+L.dur+' turnos')+'</div></div>';
    }
    function sang(){
      var f = F(), c = ctx(f), L = limArma(c.corpo), r = bt.res||{}; if(!L || !r.ok || r.sang) return;
      var red = bt.fx.esmagarSg ? 0 : (bt.arm||0), lim = Math.max(0,L.lim-red), pt = [], hitIt = false, nv = L.nivel, sa = L.tipo==='s', out;
      if(sa && r.nat20){ hitIt = true; pt.push('20 natural no ataque: sangra sem rolar'); }
      else {
        var a = rl(20), v = a;
        if(sa && bt.nano){ var b = rl(20); v = Math.max(a,b); pt.push('Nanite Blood: d20['+a+','+b+'] → fica o pior ('+v+')'); } else pt.push('d20['+a+']');
        hitIt = v<=lim || (sa && v===1);
        if(sa && v===1){ nv = Math.min(2,nv+1); pt.push('1 natural: sangra um nível acima'); }
      }
      pt.push('limiar '+L.lim+(red?' −'+red+' (armadura)':'')+' = ≤ '+lim);
      if(!hitIt) out = '<div class="cb-tt ok">'+(sa?'NÃO SANGROU':'NÃO FICOU TONTO')+'</div>'+pt.join(' · ');
      else if(sa) out = '<div class="cb-tt no">🩸 SANGRA — '+NIVEL[nv][0].toUpperCase()+'</div>'+NIVEL[nv][1]+' de Vida no começo de cada turno do alvo · parar: Int ND '+NIVEL[nv][2]+' (+2 se outro ajuda) ou item de CURA<br>'+pt.join(' · ');
      else out = '<div class="cb-tt no">💫 TONTO — '+L.dur+' TURNOS</div>−2 em ataques e Velocidade. Não acumula, só renova.<br>'+pt.join(' · ');
      delete bt.fx.esmagarSg; r.sang = out; log(f.nome+': '+(sa?'sangramento ':'tontura ')+(hitIt ? '→ '+(sa?NIVEL[nv][0]:'tonto') : '→ não pegou')); draw();
    }
    /* ---- HACK ---- */
    function hack(){
      var f = F(), c = ctx(f); if(!c.hack){ bt.res = {msg:'<span class="no">Nenhum item HACKER equipado.</span>'}; return draw(); }
      var mi = modInfo(f,'hack','int'); if(mi.block){ bt.res = {msg:'<span class="no">✖ '+esc(mi.block)+'</span>'}; return draw(); }
      var inv = bt.fx.invasao; delete bt.fx.invasao;
      var R = r20(advNet(mi.desv)), d20 = R.v, md = mod(f,'int'), t = d20+md+mi.tot, pt = [R.tx,'INT'+sg(md),c.hack.nome];
      if(bt.fx.adren){ t += 2; pt.push('ADRENALINA +2'); delete bt.fx.adren; }
      if(bt.fx.ordem){ t += 2; pt.push('ORDEM TÁTICA +2'); delete bt.fx.ordem; }
      if(bt.fx.estim>0){ t += 2; pt.push('ESTIMULANTE +2 ('+bt.fx.estim+' turno'+(bt.fx.estim>1?'s':'')+')'); }
      if(mi.pt.length) pt.push('ESTADOS '+mi.pt.join(' · '));
      if(bt.ficha && f.extra && f.extra.int){ var x = rd(pd(f.extra.int)); t += x.t; pt.push('extra '+x.tx); }
      var ok = d20===20 || (d20!==1 && t>=bt.nd), xtra = '';
      if(inv==='auto'){ ok = true; xtra += '<br>⚡ <b>INVASÃO RÁPIDA</b>: sucesso automático (o teste acima é só informativo).'; }
      if(inv==='dano' && ok){ var iv = rd(pd('1d6')); xtra += '<br>⚡ <b>INVASÃO RÁPIDA</b>: +'+iv.t+' no dano do hack ('+iv.tx+').'; }
      else if(inv==='dano') xtra += '<br>⚡ Invasão Rápida (+1d6) gasta — o hack falhou.';
      if(bt.fx.surto){ xtra += '<br>🌐 <b>SURTO DE REDE</b>: atinge até <b>3 alvos/dispositivos</b>.'; delete bt.fx.surto; }
      bt.res = {hit:'<div class="cb-tt '+(ok?'ok':'no')+'">'+(ok?'INVASÃO BEM-SUCEDIDA':'HACK FALHOU')+' — '+t+' vs '+bt.nd+'</div>'+pt.join(' · ')+xtra, ok:ok};
      log(f.nome+': hack '+t+' vs '+bt.nd+' → '+(ok?'sucesso':'falha')); bt.res.dot = dot(f); draw();
    }
    /* ---- SOBRECARGA ---- */
    function sobApply(){
      var f = F(), sb = bt.res.sob; if(!sb || sb.done) return;
      f.sobreAjuste = (Number(f.sobreAjuste)||0)+sb.n; sb.done = true; saved(); draw();
    }
    /* ---- HABILIDADES ATIVAS ---- */
    function tgUI(a,f){
      var al = a.alvo, id = a.it.id, L = allies();
      if(al==='aliados') return '<div class="d">🎯 Alvo: <b>todos os aliados</b></div>';
      if(al==='inimigo' || al==='inimigos') return '<div class="d">🎯 Alvo: <b>'+(al==='inimigos' ? 'todos os jogadores' : '1 jogador')+'</b> (o mestre aplica o efeito)</div>';
      if(al!=='aliado' && al!=='aliado_caido') return '';
      if(al==='aliado_caido') L = L.filter(function(x){ return (x.estados||[]).indexOf('inconsciente')>=0; });
      if(!L.some(function(x){ return x.id===bt.tg[id]; })) bt.tg[id] = al==='aliado' ? f.id : (L[0] && L[0].id);
      return L.length ? '<label class="d">🎯 Em quem: <select data-tg="'+esc(id)+'">'+L.map(function(x){ return '<option value="'+x.id+'"'+(x.id===bt.tg[id]?' selected':'')+'>'+esc(x.nome)+'</option>'; }).join('')+'</select></label>' : '<div class="d">🎯 Nenhum aliado Inconsciente</div>';
    }
    function fx(a,f){
      var al = a.alvo; if(!al) return '';
      if(al==='inimigo' || al==='inimigos') return '<hr>🎯 <b>'+(al==='inimigos' ? 'TODOS OS JOGADORES' : 'JOGADOR')+'</b> — aplique: '+esc(a.txt)+(a.st ? ' '+chip(a.st) : '');
      var ids = al==='aliados' ? allies().map(function(x){ return x.id; }) : [bt.tg[a.it.id] || f.id], nm = [],
        m = a.txt.match(/(?:cura|revive[^.]*? com)\s*(\d+)%/i), rm = a.txt.match(/remove (\d+|todos os)\s+estados?/i);
      allies().forEach(function(x){
        if(ids.indexOf(x.id)<0) return; nm.push(x.nome);
        if(m) P.aplicar(x,{tipo:'vida', pct:true, n:+m[1]});
        if(rm){ var n = /todos/i.test(rm[1]) ? 99 : +rm[1], ok = x.estados.filter(function(k){ return k!=='morto' && k!=='inconsciente'; }).slice(0,n); x.estados = x.estados.filter(function(k){ return ok.indexOf(k)<0; }); }
      });
      log(f.nome+' → '+nm.join(', ')+': '+a.nome);
      return '<hr>✚ Aplicado em <b>'+esc(nm.join(', '))+'</b>'+(m ? ' · cura '+m[1]+'%' : '')+(rm ? ' · estados removidos' : '')+
        (/(\+|−|-)\d+%|escudo|imun/i.test(a.txt.replace(/(?:cura|revive[^.]*? com)\s*\d+%/i,'')) ? '<br>⚑ buff/efeito extra (anote): '+esc(a.txt) : '');
    }
    function ativar(id){
      var f = F(), c = ctx(f), it = c.all.filter(function(i){ return i.id===id; })[0], a = it && ativoInfo(it,f), k = cdk(f,id);
      if(!a || bt.cd[k]>0) return;
      if(a.alvo==='aliado_caido' && !allies().some(function(x){ return x.id===bt.tg[id] && (x.estados||[]).indexOf('inconsciente')>=0; })){ alert('Escolha um aliado Inconsciente.'); return; }
      if(a.cd) bt.cd[k] = a.cd;
      var emp = (f.estados||[]).indexOf('eletrocutado')>=0 ? rl(4) : 0, tot = a.custo+emp, pr = P.stats(f).sobre+tot, fxh = fx(a,f);
      bt.res = {hit:'<div class="cb-tt cr">✦ '+esc(a.nome.toUpperCase())+'</div>'+esc(a.it.nome)+' · '+esc(a.txt)+(a.dv ? '<br><span class="no">⚠ '+esc(a.dv)+'</span>' : '')+
        (pr>=100 ? '<br><span class="no">☠ sobrecarga em '+pr+'% — risco de ciberpsicose</span>' : '')+fxh, ok:true, sob:{n:tot, fail:false, ext:false, custom:true, emp:emp}};
      log(f.nome+': ativou '+a.nome+' ('+a.it.nome+') · +'+tot+' sobrecarga'); bt.res.dot = dot(f);
      saved(); sobApply();
    }

    /* ---- HABILIDADES DE CLASSE (1× por cena) ---- */
    var PASSIVAS = {'PRIMEIRO A AGIR':1};
    function cKey(f,h){ return f.id+'|'+h.classe.k+'|'+h.n; }
    function clsHabs(f){
      var got = P.habilidades(f), have = got.map(function(h){ return h.n; }), out = got.map(function(h){ h.on = true; return h; });
      if(bt.todas){   /* mestre libera tudo (inimigos não têm XP nem escolhas) */
        [[f.classe,0,4],[f.classe,1,10],[f.classe2,0,14]].forEach(function(m){
          var c = P.classeObj(m[0]); if(!c || !c.slots[m[1]]) return;
          c.slots[m[1]].forEach(function(h){ if(have.indexOf(h.n)<0){ out.push({lv:m[2], classe:c, n:h.n, d:h.d, on:true, forca:true}); have.push(h.n); } });
        });
      }
      return out;
    }
    var curCard = null;
    function nextOpt(sel){ var e = (curCard||root).querySelector(sel); return e ? e.value : ''; }
    function tg(f){
      var al = allies(); if(!al.some(function(x){ return x.id===f.id; })) al.unshift(f);
      return al;
    }
    function pioresParte(tgt){
      var ks = Object.keys(tgt.partes||{}).filter(function(q){ return (+tgt.partes[q].atual||0) < (+tgt.partes[q].max||0); });
      ks.sort(function(a,b){ return ((+tgt.partes[a].atual||0)/(+tgt.partes[a].max||1)) - ((+tgt.partes[b].atual||0)/(+tgt.partes[b].max||1)); });
      return ks[0] || '';
    }
    function curaParte(tgt, parte, dado){
      var pp = tgt.partes && tgt.partes[parte]; if(!pp) parte = pioresParte(tgt), pp = tgt.partes && tgt.partes[parte];
      if(!pp) return null;
      var cu = rd(pd(dado)), antes = +pp.atual||0; pp.atual = Math.min(+pp.max||0, antes+cu.t);
      if(P.stats(tgt).vida>0){ var ix = (tgt.estados||[]).indexOf('inconsciente'); if(ix>=0) tgt.estados.splice(ix,1); }
      return {parte:parte, ganho:pp.atual-antes, tx:cu.tx};
    }
    function limpaEstado(tgt, est){
      var l = (tgt.estados||[]).filter(function(x){ return x!=='morto'; });
      if(!est || l.indexOf(est)<0) est = l.filter(function(x){ return x!=='inconsciente'; })[0] || '';
      if(!est) return '';
      tgt.estados = tgt.estados.filter(function(x){ return x!==est; }); return est;
    }
    function alvoCls(f){
      var id = nextOpt('[data-hsel="alvo"]') || f.id; return tg(f).filter(function(x){ return x.id===id; })[0] || f;
    }
    function usarClasse(nome){
      var bb = root.querySelector('[data-cl="'+String(nome).replace(/"/g,'')+'"]'); curCard = bb ? bb.parentNode : null;
      var f = F(), h = clsHabs(f).filter(function(x){ return x.n===nome; })[0]; if(!h) return;
      var k = cKey(f,h); if(PASSIVAS[nome] || bt.cena[k]) return;
      var mi = modInfo(f,'atk',''); if(mi.block){ bt.res = {msg:'<span class="no">✖ '+esc(mi.block)+'</span>'}; return draw(); }
      var out = '', head = '<div class="cb-tt cr">✦ '+esc(nome)+'</div><span style="color:'+h.classe.c+'">'+h.classe.i+' '+esc(h.classe.n)+'</span> · '+esc(h.d)+'<hr>', ok = true;
      switch(nome){
        case 'GOLPE BRUTAL': bt.fx.brutal = 1; out = '💪 Próximo <b>dano corpo a corpo</b> ganha <b>+1d6</b> (aplicado sozinho no botão ROLAR DANO).'; break;
        case 'ESMAGAR': bt.fx.esmagar = 1; bt.fx.esmagarSg = 1; out = '🔨 Próximo ataque corpo a corpo <b>ignora a redução de dano da armadura</b> do alvo (também zera a "armadura do alvo" no teste de sangramento/tontura).'; break;
        case 'PASSO FANTASMA': bt.fx.passo = 1; out = '👣 <b>+2 no próximo ataque</b> (aplicado sozinho) e <b>1 movimento extra</b>. Use depois de uma esquiva bem-sucedida.'; break;
        case 'PELE DE FERRO': var pf = rd(pd('1d8')); out = '🛡 Reduza em <b>'+pf.t+'</b> o dano de um ataque que você sofrer ('+pf.tx+').'; break;
        case 'MURALHA': var mu = rd(pd('1d6')); out = '🧱 Assuma o ataque dirigido a um aliado próximo. Você sofre o dano reduzido em <b>'+mu.t+'</b> ('+mu.tx+').'; break;
        case 'PONTO FRACO': bt.marca = 2; out = '🎯 Inimigo marcado: você e seus aliados têm <b>+2 para acertá-lo por 2 turnos</b>. O +2 entra sozinho nos seus acertos; o botão PASSAR TURNO conta a duração.'; break;
        case 'LEITURA DE CAMPO': bt.fx.leitura = 1; out = '👁 Seu próximo <b>ataque</b> rola <b>2d20 e fica com o maior</b> (aplicado sozinho). Em teste de percepção, role 2d20 na mão.'; break;
        case 'INVASÃO RÁPIDA':
          var modo = nextOpt('[data-inv]') || 'auto'; bt.fx.invasao = modo;
          out = modo==='auto' ? '⚡ Próximo <b>hack sem precisar de teste</b> (sucesso automático ao clicar em ROLAR HACK).' : '⚡ Próximo hack bem-sucedido causa <b>+1d6 de dano</b> (rolado sozinho).'; break;
        case 'SURTO DE REDE': bt.fx.surto = 1; out = '🌐 Próximo hack atinge <b>até 3 alvos ou dispositivos</b> ao mesmo tempo.'; break;
        case 'PRIMEIROS SOCORROS':
          var tgt = alvoCls(f), parte = nextOpt('[data-hsel="parte"]');
          var cu = rd(pd('1d6')), pp = tgt.partes && tgt.partes[parte];
          if(!pp){ parte = pioresParte(tgt); pp = tgt.partes && tgt.partes[parte]; }
          if(!pp){ bt.res = {msg:'<span class="no">Nenhuma parte do corpo ferida em '+esc(tgt.nome)+'.</span>'}; return draw(); }
          var antes = +pp.atual||0; pp.atual = Math.min(+pp.max||0, antes+cu.t);
          if(P.stats(tgt).vida>0){ var ix = (tgt.estados||[]).indexOf('inconsciente'); if(ix>=0) tgt.estados.splice(ix,1); }
          out = '🩺 <b>'+esc(tgt.nome)+'</b> — '+esc(parte)+': +'+(pp.atual-antes)+' de Vida ('+cu.tx+') ✔ aplicado na ficha.'; break;
        case 'ADRENALINA':
          var tg2 = alvoCls(f), est = nextOpt('[data-hsel="estado"]');
          if(!est || (tg2.estados||[]).indexOf(est)<0){ bt.res = {msg:'<span class="no">Escolha um estado que o alvo realmente tenha.</span>'}; return draw(); }
          tg2.estados = tg2.estados.filter(function(x){ return x!==est; });
          if(tg2.id===f.id){ bt.fx.adren = 1; out = '💉 Estado <b>'+esc(estNome(est))+'</b> removido de você. <b>+2 no próximo teste</b> (aplicado sozinho no próximo acerto ou hack).'; }
          else out = '💉 Estado <b>'+esc(estNome(est))+'</b> removido de <b>'+esc(tg2.nome)+'</b> ✔. Ele(a) ganha <b>+2 no próximo teste</b> — anote.';
          break;
        case 'DOBRO OU NADA': bt.fx.dobro = 1; out = '🎲 Próximo ataque: <b>dano ×2</b>, mas <b>−3 no acerto</b> (os dois entram sozinhos nos botões ROLAR ACERTO e ROLAR DANO).'; break;
        case 'CARGA TOTAL': bt.fx.carga = 1; out = '🔋 Você gasta o turno carregando. No próximo ataque: <b>+5 no acerto</b> e o <b>dano da arma é rolado duas vezes</b> (automático).'; break;
        case 'MIRAGEM': bt.fx.miragem = 1; out = '🌫 Um ataque feito contra você <b>erra automaticamente</b>. Avise o mestre quando ele acontecer.'; break;
        case 'RAJADA': bt.fx.rajada = 2; out = '🌀 Dois ataques neste turno, cada um com <b>−2 no acerto</b> (entra sozinho nos próximos 2 cliques em ROLAR ACERTO).'; break;
        case 'PROVOCAR': bt.fx.provocar = 2; out = '📣 Por <b>2 turnos</b> os inimigos preferem te atacar. Cada ataque que você sofrer: reduza <b>1d4</b> ('+rd(pd('1d4')).tx+' para o primeiro).'; break;
        case 'SEGUNDO FÔLEGO':
          var sf = curaParte(f, nextOpt('[data-hsel="parte"]'), '1d8'), er = limpaEstado(f, nextOpt('[data-hsel="estado"]'));
          if(!sf && !er){ bt.res = {msg:'<span class="no">Nada para curar nem estado para remover.</span>'}; return draw(); }
          out = '💨 '+(sf ? esc(sf.parte)+': +'+sf.ganho+' de Vida ('+sf.tx+')' : 'nenhuma parte ferida')+(er ? ' · estado <b>'+esc(estNome(er))+'</b> removido' : '')+' ✔ aplicado na ficha.'; break;
        case 'TIRO CERTEIRO': bt.fx.certeiro = 1; out = '🎯 O próximo <b>ROLAR ACERTO</b> acerta <b>automaticamente</b> (o dano segue normal).'; break;
        case 'ORDEM TÁTICA':
          var ot = alvoCls(f);
          if(ot.id===f.id){ bt.fx.ordem = 1; out = '📡 Você age agora com uma <b>ação extra</b> e <b>+2 no próximo teste</b> (automático).'; }
          else out = '📡 <b>'+esc(ot.nome)+'</b> age agora, com uma <b>ação extra</b> e <b>+2 no teste</b> — anote.'; break;
        case 'CURTO-CIRCUITO': out = '⚡ O alvo fica '+chip('eletrocutado')+' por <b>2 turnos</b>: −2 em todos os testes e +1d4 de sobrecarga por implante ativado. O mestre aplica o estado.'; break;
        case 'BACKDOOR':
          var sb0 = P.stats(f).sobre; P.aplicar(f, {tipo:'sobre', n:15});
          out = '🕳 Sobrecarga reduzida em <b>'+(sb0-P.stats(f).sobre)+'%</b> (agora '+P.stats(f).sobre+'%) ✔ aplicado na ficha.'; break;
        case 'ESTIMULANTE':
          var es = alvoCls(f);
          if(es.id===f.id){ bt.fx.estim = 2; out = '💊 Você ganha <b>+2 em todos os testes por 2 turnos</b> (automático nos acertos e hacks; PASSAR TURNO conta a duração).'; }
          else out = '💊 <b>'+esc(es.nome)+'</b> ganha <b>+2 em todos os testes por 2 turnos</b> — anote.'; break;
        case 'ROLETA DE NANITES':
          var rt = alvoCls(f), d6 = rl(6), eu = rt.id===f.id, partes = [];
          if(d6===1) partes.push('🎰 <b>1 — PANE:</b> os nanites falham. Nada acontece.');
          if(d6===2 || d6===3 || d6===6){ var c1 = curaParte(rt,'', d6===6 ? '1d8' : '1d6'); partes.push('🎰 <b>'+d6+' — CURA:</b> '+(c1 ? esc(c1.parte)+' +'+c1.ganho+' de Vida ('+c1.tx+')' : 'ninguém ferido')); }
          if(d6===4 || d6===6){ var e1 = limpaEstado(rt,''); partes.push('🎰 <b>'+d6+' — LIMPEZA:</b> '+(e1 ? 'estado <b>'+esc(estNome(e1))+'</b> removido' : 'sem estado para remover')); }
          if(d6===5 || d6===6){ if(eu) bt.fx.adren = 1; partes.push('🎰 <b>'+d6+' — BOOST:</b> <b>+2 no próximo teste</b> de '+esc(rt.nome)+(eu ? ' (automático)' : ' — anote')); }
          out = partes.join('<br>')+'<br>Rolagem: d6['+d6+'] ✔ aplicado na ficha.'; break;
        default: out = '⚑ Efeito: '+esc(h.d)+' (o Mestre aplica na mesa).';
      }
      bt.cena[k] = 1; bt.res = {hit:head+out, ok:ok};
      log(f.nome+': usou '+nome+' ('+h.classe.n+')'); bt.res.dot = dot(f);
      saved(); draw();
    }
    function novaCena(){
      var f = F(); bt.cena = {}; bt.fx = {}; bt.marca = 0; bt.res = {};
      log('— NOVA CENA: habilidades de classe recarregadas —'); draw();
    }
    function clsUI(f){
      var cls = P.classeObj(f.classe), L = clsHabs(f), top = '';
      if(!cls) return '<div class="cb-none">Sem classe escolhida. Escolha a classe na seção CLASSE para ter habilidades.</div>';
      var lv = P.nivel(f);
      top = '<div class="d">'+cls.i+' <b>'+esc(cls.n)+'</b> · nível <b>'+lv+'</b>'+(f.classe2 && P.classeObj(f.classe2) ? ' · 2ª classe '+P.classeObj(f.classe2).i+' '+esc(P.classeObj(f.classe2).n) : '')+'</div>'+
        '<label><input type="checkbox" id="cbTodas"'+(bt.todas?' checked':'')+'> 👁 liberar todas as habilidades da classe (para inimigos/NPCs sem XP)</label>';
      var ativos = [];
      if(bt.marca>0) ativos.push('🎯 PONTO FRACO: +2 no acerto ('+bt.marca+' turno'+(bt.marca>1?'s':'')+')');
      var FXN = {brutal:'💪 GOLPE BRUTAL: +1d6 no próximo dano corpo a corpo', esmagar:'🔨 ESMAGAR: próximo corpo a corpo ignora armadura', passo:'👣 PASSO FANTASMA: +2 no próximo ataque', leitura:'👁 LEITURA DE CAMPO: próximo ataque em 2d20', invasao:'⚡ INVASÃO RÁPIDA: próximo hack', surto:'🌐 SURTO DE REDE: próximo hack em 3 alvos', adren:'💉 ADRENALINA: +2 no próximo teste', ordem:'📡 ORDEM TÁTICA: +2 no próximo teste', dobro:'🎲 DOBRO OU NADA: próximo dano ×2, acerto −3', carga:'🔋 CARGA TOTAL: +5 no acerto e dano em dobro de dados', miragem:'🌫 MIRAGEM: 1 ataque contra você erra', rajada:'🌀 RAJADA: ataques com −2 restantes', certeiro:'🎯 TIRO CERTEIRO: próximo acerto é automático', estim:'💊 ESTIMULANTE: +2 em todos os testes', provocar:'📣 PROVOCAR: inimigos te miram; −1d4 por ataque sofrido'};
      Object.keys(bt.fx).forEach(function(k){ if(FXN[k] && k!=='esmagarSg') ativos.push(FXN[k]+((k==='estim'||k==='provocar'||k==='rajada') ? ' ('+bt.fx[k]+')' : '')); });
      if(ativos.length) top += '<div class="cb-sg" style="border-color:#ffb300"><div class="h" style="color:#ffb300">EFEITOS ARMADOS</div>'+ativos.map(esc).join('<br>')+'</div>';
      var cards = '';
      var mostradas = L.map(function(h){ return h.n; });
      L.forEach(function(h){
        var usada = !!bt.cena[cKey(f,h)], pass = !!PASSIVAS[h.n], ex = '', btn;
        if(h.n==='INVASÃO RÁPIDA') ex = '<label class="d">Modo: <select data-inv><option value="auto">hack sem teste</option><option value="dano"'+(bt.fx.invasao==='dano'?' selected':'')+'>+1d6 no dano do hack</option></select></label>';
        if(h.n==='PRIMEIROS SOCORROS' || h.n==='ADRENALINA' || h.n==='ORDEM TÁTICA' || h.n==='ESTIMULANTE' || h.n==='ROLETA DE NANITES' || h.n==='SEGUNDO FÔLEGO'){
          var al = tg(f), sel = bt.tg['cls|'+h.n] && al.some(function(x){ return x.id===bt.tg['cls|'+h.n]; }) ? bt.tg['cls|'+h.n] : f.id, tgf = al.filter(function(x){ return x.id===sel; })[0] || f;
          if(h.n==='SEGUNDO FÔLEGO') al = [f];
          ex = '<label class="d">🎯 Em quem: <select data-hsel="alvo" data-nome="'+esc(h.n)+'">'+al.map(function(x){ return '<option value="'+x.id+'"'+(x.id===sel?' selected':'')+'>'+esc(x.nome)+(x.id===f.id?' (você)':'')+'</option>'; }).join('')+'</select></label>';
          if(h.n==='SEGUNDO FÔLEGO') ex += '<label class="d">Estado a remover: <select data-hsel="estado"><option value="">(qualquer)</option>'+(tgf.estados||[]).filter(function(e){ return e!=='morto'; }).map(function(e){ return '<option value="'+e+'">'+esc(estNome(e))+'</option>'; }).join('')+'</select></label>';
          if(h.n==='PRIMEIROS SOCORROS' || h.n==='SEGUNDO FÔLEGO') ex += '<label class="d">Parte: <select data-hsel="parte">'+Object.keys(tgf.partes||{}).map(function(k){ var p = tgf.partes[k]; return '<option value="'+esc(k)+'">'+esc(k)+' ('+(+p.atual||0)+'/'+(+p.max||0)+')</option>'; }).join('')+'</select></label>';
          else if(h.n==='ADRENALINA') ex += '<label class="d">Estado a remover: <select data-hsel="estado">'+(tgf.estados||[]).filter(function(e){ return e!=='morto'; }).map(function(e){ return '<option value="'+e+'">'+esc(estNome(e))+'</option>'; }).join('')+'</select></label>' + ((tgf.estados||[]).length ? '' : '<div class="d">alvo sem estados</div>');
        }
        btn = pass ? '<div class="m" style="color:#46ff7a">⚑ PASSIVA — vale em todo combate</div>' :
          '<button class="cb-b" data-cl="'+esc(h.n)+'"'+(usada?' disabled':'')+'>'+(usada ? 'USADA NESTA CENA' : 'USAR')+'</button>';
        cards += '<div class="cb-at" style="--sc:'+h.classe.c+'"><div class="h"><b>'+h.classe.i+' '+esc(h.classe.n)+'</b><span class="m">NV '+h.lv+(h.forca?' · liberada':'')+'</span></div><div class="n">'+esc(h.n)+'</div><div class="t">'+esc(h.d)+'</div>'+
          (pass && h.n==='PRIMEIRO A AGIR' ? '<div class="d">+3 na iniciativa · ação extra na 1ª rodada</div>' : '<div class="m">1× por cena · sem custo de sobrecarga</div>')+ex+btn+'</div>';
      });
      /* marcos ainda sem habilidade: bloqueado por nível, ou falta escolher na ficha */
      var nvf = P.nivel(f), falta = [];
      [[f.classe,0,4],[f.classe,1,10],[f.classe2,0,14]].forEach(function(m){
        var c = P.classeObj(m[0]); if(!c || !c.slots[m[1]]) return;
        if(c.slots[m[1]].some(function(h){ return mostradas.indexOf(h.n)>=0; })) return;
        if(nvf < m[2]) cards += '<div class="cb-at" style="--sc:#555;opacity:.5"><div class="h"><b>'+c.i+' '+esc(c.n)+'</b><span class="m">🔒 NV '+m[2]+'</span></div><div class="n">'+c.slots[m[1]].map(function(h){ return esc(h.n); }).join(' <span class="m">ou</span> ')+'</div><div class="t">Você escolherá 1 das 2 habilidades neste nível.</div></div>';
        else falta.push(m[2]);
      });
      if(falta.length) top += '<div class="d">⚠ Escolha a habilidade do nível '+falta.join(', ')+' na ficha (seção NÍVEL &amp; XP) ou use "liberar todas".</div>';
      return top+'<div class="cb-at-list">'+cards+'</div><div class="cb-row" style="margin-top:10px"><button class="cb-b" id="cbCena">🎬 NOVA CENA (recarrega tudo)</button><button class="cb-b" id="cbTurn">⏭ PASSAR TURNO</button></div>';
    }

    /* ---- seletor de arma: lista TODAS as armas/corpo a corpo equipadas, com a mão de cada uma ---- */
    function armaUI(c){
      var sel = c.sel ? c.sel.id : '__soco', opts = '<option value="__soco"'+(sel==='__soco'?' selected':'')+'>👊 Sem arma (Força)</option>';
      c.lista.forEach(function(it){
        opts += '<option value="'+esc(it.id)+'"'+(it.id===sel?' selected':'')+'>'+(it.cat==='arma'?'🔫':'🗡️')+' '+esc(it.nome)+' — '+handName(it)+(it.cat==='arma'?' (VEL)':' (FOR)')+'</option>';
      });
      var mesmoTipo = c.lista.filter(function(x){ return x.mao; }).length >= 2 &&
        c.lista.filter(function(x){ return x.mao; }).some(function(x,i,a){ return a.some(function(y){ return y!==x && y.cat===x.cat; }); });
      var semMao = c.lista.some(function(x){ return !x.mao; });
      return '<div class="cb-arm"><div class="h">Arma do ataque</div>'+
        '<label>Usar <select id="cbWid">'+opts+'</select></label>'+
        (c.sel && duasInfo(c.sel) ? '<label class="cb-maos"><input type="checkbox" id="cbMaos"'+(bt.maos?' checked':'')+'> ✋ Usar com as DUAS MÃOS (+'+duasInfo(c.sel).dado+' no '+(duasInfo(c.sel).tipo==='acerto'?'acerto':'dano')+'; gasta o ataque da outra mão)</label>' : '')+
        ((bt.maosTurno||[]).length ? '<div class="mao">Neste turno já atacou com: '+bt.maosTurno.map(function(h){ return {dir:'mão direita',esq:'mão esquerda',ambas:'as duas mãos'}[h]||h; }).join(' + ')+'</div>' : '')+
        (c.lista.length ? '' : '<div class="cb-none">Nenhuma arma nas mãos. O ataque é sem arma (Força).</div>')+
        (mesmoTipo ? '<div class="mao">Você tem duas armas do mesmo tipo: escolha qual vai usar neste ataque.</div>' : '')+
        (semMao && c.lista.length ? '<div class="aviso">Algum item equipado não tem mão definida (equipe pela aba EQUIPAR).</div>' : '')+
        '</div>';
    }

    /* ---- UI ---- */
    function estPanel(f,c){
      var L = (f.estados||[]).map(function(s){ var e = P.ESTADOS.filter(function(x){ return x.k===s; })[0]; return e ? {e:e, d:EST[s]||{}} : null; }).filter(Boolean),
        kind = bt.cmd==='hack' ? 'hack' : 'atk', k = bt.cmd==='hack' ? 'int' : (mode(c)==='arma' ? 'vel' : 'forca'), mi = modInfo(f,kind,k),
        h = '<div class="cb-est">';
      h += L.length ? L.map(function(x){ return '<div class="cb-er" style="--ec:'+x.e.c+'"><b>'+x.e.i+' '+x.e.n+'</b> <span>'+esc(x.d.t||x.d.block||'sem efeito em testes')+'</span></div>'; }).join('') : '<div class="cb-er" style="--ec:#46ff7a"><span>Sem estados ativos (nenhum debuff).</span></div>';
      if(L.length) h += '<div>Neste teste: <b>'+(mi.block ? 'NÃO PODE AGIR' : sg(mi.tot)+(mi.desv?' · DESVANTAGEM':''))+'</b></div>';
      if((f.estados||[]).indexOf('imobilizado')>=0) h += '<label><input type="checkbox" id="cbPer"'+(bt.pernas2?' checked':'')+'> perdeu as duas pernas (desvantagem em Velocidade)</label>';
      if((f.estados||[]).indexOf('sangrando')>=0) h += '<label>Nível do sangramento <select id="cbSgN">'+NIVEL.map(function(n,i){ return '<option value="'+i+'"'+((bt.sgN||0)===i?' selected':'')+'>'+n[0]+' ('+n[1]+')</option>'; }).join('')+'</select></label>';
      h += '<label>Rolagem <select id="cbAdv">'+[[0,'normal'],[1,'vantagem (melhor de 2d20)'],[-1,'desvantagem (pior de 2d20)']].map(function(x){ return '<option value="'+x[0]+'"'+((bt.adv||0)===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></label>';
      return h+'</div>';
    }
    function atUI(c,f){
      var L = c.all.map(function(i){ return ativoInfo(i,f); }).filter(Boolean), sobre = P.stats(f).sobre, red = reatorRed(f);
      var top = red ? '<div class="d">🫀 Reactor Heart ativo: −'+red+'% no gasto de sobrecarga</div>' : '';
      if(!L.length) return top+'<div class="cb-none">Nenhum implante/prótese com habilidade ativa equipado. Equipe um na seção EQUIPAMENTO.</div>';
      return top+'<div class="cb-at-list">'+L.map(function(a){
        var cd = bt.cd[cdk(f,a.it.id)]||0, pr = sobre+a.custo;
        return '<div class="cb-at" style="--sc:'+a.S.c+'"><div class="h"><b>'+esc(a.it.nome)+'</b>'+Q.badge(a.nv)+'</div><div class="n">'+esc(a.nome)+'</div>'+
          '<div class="t" title="Base: '+esc(a.orig)+'">'+esc(a.txt)+'</div>'+
          '<div class="m">⚡ '+a.custo+(a.custo!==a.base ? ' <s>'+a.base+'</s>' : '')+' sobrecarga · recarga '+a.cdTxt+(pr>=100 ? ' · <span class="no">☠ levaria a '+pr+'%</span>' : '')+'</div>'+
          (a.dv ? '<div class="d">⚠ '+esc(a.dv)+'</div>' : '')+tgUI(a,f)+
          '<button class="cb-b" data-at="'+esc(a.it.id)+'"'+(cd?' disabled':'')+'>'+(cd ? 'RECARGA: '+cd+' turno'+(cd>1?'s':'') : 'ATIVAR')+'</button></div>';
      }).join('')+'</div><div class="cb-row" style="margin-top:10px"><button class="cb-b" id="cbTurn">⏭ PASSAR TURNO</button></div>';
    }
    function draw(){
      var f = F(); if(!f) return;
      var c = ctx(f), S = P.stats(f), m = mode(c), r = bt.res||{}, sb = r.sob;
      var top = r.msg || ((r.hit || '<span style="opacity:.7">Escolha um comando e role o teste.</span>')+(r.dmg ? '<hr>'+r.dmg : '')+(r.sang ? '<hr>'+r.sang : '')+
        (sb ? '<hr>🔋 Sobrecarga: <b>+'+sb.n+'</b>'+(sb.custom ? ' (custo da habilidade'+(sb.emp?' +'+sb.emp+' EMP':'')+')' : sb.ext ? ' (uso extremo)' : ' (1d4: '+sb.roll+(sb.extra?' +'+sb.extra+' sinergia':'')+(sb.red?' −'+sb.red+'% reator':'')+(sb.emp?' +'+sb.emp+' EMP':'')+')')+(sb.fail ? ' <span class="no">⚠ FALHA DO IMPLANTE</span>' : '')+
          (sb.done ? ' ✔ aplicada na ficha' : ' <button class="cb-b" id="cbSob">APLICAR NA FICHA</button>') : ''));
      if(r.dot && !r.msg) top += '<hr>🩸 Dano de estados (começo do turno): '+r.dot.parts.map(function(p){ return esc(p.n)+' '+p.tx; }).join(' · ')+' → <b>−'+r.dot.total+' de Vida</b>'+(r.dot.done ? ' ✔ aplicado' : ' <button class="cb-b" id="cbDot">APLICAR NA FICHA</button>');
      var opt;
      if(bt.cmd==='ativo') opt = atUI(c,f);
      else if(bt.cmd==='classe') opt = clsUI(f);
      else {
        opt = estPanel(f,c);
        if(bt.cmd==='hack') opt += '<div>Deck: <b>'+(c.hack ? esc(c.hack.nome) : '— não equipado —')+'</b> · teste de INT</div>';
        else {
          if(bt.cmd==='atk') opt += armaUI(c);
          opt += '<label>Implante/prótese: <select id="cbImp"><option value="">— nenhum —</option>'+c.imps.map(function(i){ return '<option value="'+esc(i.id)+'"'+(pickImp(c) && pickImp(c).id===i.id?' selected':'')+'>'+esc(i.nome)+'</option>'; }).join('')+'</select></label>'+
            '<label><input type="checkbox" id="cbExt"'+(bt.ext?' checked':'')+'> ⚡ Uso extremo (bônus crítico fixo, gasta sobrecarga alta)</label>';
          if(bt.cmd==='atk') opt += sangUI(c,m);
        }
      }
      var h = '<div class="cb-top">'+top+'</div><div class="cb-cmd">'+[['atk','Atacar'],['skill','Prótese'],['ativo','Habilidades'],['classe','Classe'],['hack','Hackear']].map(function(x){ return '<button data-k="'+x[0]+'" class="'+(bt.cmd===x[0]?'on':'')+'">'+x[1]+'</button>'; }).join('')+'</div>'+
        '<div class="cb-opt"><div class="cb-stat"><span>'+esc(f.nome)+(Q.clsOf(f) ? ' · '+Q.clsOf(f).i+' '+esc(Q.clsOf(f).n) : ' · sem classe')+'</span><b>Vida '+S.vida+'/'+S.vidaMax+' · Sobrecarga '+S.sobre+'%</b></div>'+opt+
        '<div class="cb-row"><label>Alvo (ND/defesa) <input type="number" id="cbNd" value="'+bt.nd+'" style="width:64px"></label>'+((bt.cmd==='hack' || bt.cmd==='classe') ? '' : '<label>Multiplicador <input type="number" id="cbMu" value="'+bt.mult+'" style="width:56px"></label>')+
        '<label><input type="checkbox" id="cbFi"'+(bt.ficha?' checked':'')+'> dado extra da ficha</label></div>'+
        ((bt.cmd==='ativo' || bt.cmd==='classe') ? '' : '<div class="cb-row">'+(bt.cmd==='hack' ? '<button class="cb-b" id="cbGo">🎲 ROLAR HACK</button>' : '<button class="cb-b" id="cbGo">🎲 ROLAR ACERTO</button><button class="cb-b" id="cbDm"'+(r.ok?'':' disabled')+'>💥 ROLAR DANO</button>'+
          (m==='corpo' && limArma(c.corpo) ? '<button class="cb-b" id="cbSg"'+((r.ok && !r.sang)?'':' disabled')+'>'+(limArma(c.corpo).tipo==='s' ? '🩸 ROLAR SANGRAMENTO' : '💫 ROLAR TONTURA')+'</button>' : ''))+'</div>')+
        '<div class="cb-log">'+bt.log.slice(0,6).map(esc).join('<br>')+'</div></div>';
      root.innerHTML = h;
      var q = function(s){ return root.querySelector(s); };
      root.querySelectorAll('.cb-cmd button').forEach(function(b){ b.onclick = function(){ bt.cmd = b.dataset.k; bt.res = {}; draw(); }; });
      root.querySelectorAll('[data-tg]').forEach(function(x){ x.onchange = function(){ bt.tg[x.dataset.tg] = x.value; }; });
      root.querySelectorAll('[data-cl]').forEach(function(b){ b.onclick = function(){ usarClasse(b.dataset.cl); }; });
      root.querySelectorAll('[data-hsel="alvo"]').forEach(function(x){ x.onchange = function(){ bt.tg['cls|'+x.dataset.nome] = x.value; draw(); }; });
      if(q('#cbTodas')) q('#cbTodas').onchange = function(){ bt.todas = this.checked; draw(); };
      if(q('#cbCena')) q('#cbCena').onclick = novaCena;
      root.querySelectorAll('[data-at]').forEach(function(b){ b.onclick = function(){ ativar(b.dataset.at); }; });
      if(q('#cbWid')) q('#cbWid').onchange = function(){ bt.wid = this.value; bt.maos = false; bt.res = {}; draw(); };
      if(q('#cbMaos')) q('#cbMaos').onchange = function(){ bt.maos = this.checked; bt.res = {}; draw(); };
      if(q('#cbImp')) q('#cbImp').onchange = function(){ bt.imp = this.value; bt.res = {}; draw(); };
      if(q('#cbExt')) q('#cbExt').onchange = function(){ bt.ext = this.checked; bt.res = {}; draw(); };
      if(q('#cbArm')) q('#cbArm').onchange = function(){ bt.arm = +this.value; draw(); };
      if(q('#cbNano')) q('#cbNano').onchange = function(){ bt.nano = this.checked; draw(); };
      if(q('#cbAdv')) q('#cbAdv').onchange = function(){ bt.adv = +this.value; draw(); };
      if(q('#cbSgN')) q('#cbSgN').onchange = function(){ bt.sgN = +this.value; draw(); };
      if(q('#cbPer')) q('#cbPer').onchange = function(){ bt.pernas2 = this.checked; draw(); };
      if(q('#cbSg')) q('#cbSg').onclick = sang;
      if(q('#cbTurn')) q('#cbTurn').onclick = function(){ Object.keys(bt.cd).forEach(function(k){ if(bt.cd[k]>0) bt.cd[k]--; }); if(bt.marca>0){ bt.marca--; if(!bt.marca) log('Ponto Fraco expirou'); }
        ['estim','provocar'].forEach(function(k){ if(bt.fx[k]>0){ bt.fx[k]--; if(!bt.fx[k]){ delete bt.fx[k]; log(k==='estim' ? 'Estimulante acabou' : 'Provocar acabou'); } } }); bt.res = {}; bt.maosTurno = []; log('— turno passou: recargas −1 —'); draw(); };
      q('#cbFi') && (q('#cbFi').onchange = function(){ bt.ficha = this.checked; });
      q('#cbNd') && (q('#cbNd').onchange = function(){ bt.nd = parseInt(this.value,10)||0; });
      if(q('#cbMu')) q('#cbMu').onchange = function(){ bt.mult = Math.max(1,parseInt(this.value,10)||1); };
      if(q('#cbGo')) q('#cbGo').onclick = bt.cmd==='hack' ? hack : hit;
      if(q('#cbDm')) q('#cbDm').onclick = dmg;
      if(q('#cbSob')) q('#cbSob').onclick = sobApply;
      if(q('#cbDot')) q('#cbDot').onclick = function(){ dotApply(F()); };
    }
    return {render:draw, hit:hit, dmg:dmg, hack:hack, sang:sang, ativar:ativar, usarClasse:usarClasse, novaCena:novaCena, state:bt};
  }

  window.S7CB = {EST:EST, LIMITES:LIMITES, mount:mount, efi:efi, ativoInfo:ativoInfo, pd:pd, rd:rd};
})();