/* ============================================================
   rankup.js — ANIMAÇÃO "RANK UP!" (SETOR 7) — estilo Persona 5
   Carregado pelo tema.js (todas as páginas). Só CSS + DOM, sem imagens.
   Uso:
     S7FX.nivel(5)                         -> LEVEL UP! (sem carta)
     S7FX.escolha({lv:4, classe:{i,n,c}})  -> carta + ESCOLHA DESBLOQUEADA
     S7FX.habilidade(nome, desc, classe)   -> carta + HABILIDADE ADQUIRIDA
     S7FX.subiu(ficha, de, para, cb)       -> LEVEL UP + as 2 cartas clicáveis de cada habilidade liberada; cb(lv,nome,op,classe) aplica a escolha
   As animações entram numa fila (uma por vez). Clique / Enter / Esc / Espaço fecham.
   ============================================================ */
(function(){
  var MAX = 15, Q = [], busy = false;

  var css =
  '.s7fx{position:fixed;inset:0;z-index:9000;overflow:hidden;cursor:pointer;font-family:var(--hud,"Chakra Petch",sans-serif);'+
    '--r:#ff1f45;--y:var(--yellow,#ffe600);--ac:var(--cc,#ff1f45);}'+
  '.s7fx .dim{position:absolute;inset:0;opacity:0;animation:fxfade .2s forwards;background:radial-gradient(ellipse at 40% 50%,rgba(0,0,0,.55),rgba(0,0,0,.93));}'+
  '.s7fx .dim:after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) 1.2px,transparent 1.7px);background-size:14px 14px;}'+
  '.s7fx .flash{position:absolute;inset:0;background:#fff;opacity:0;animation:fxflash .35s forwards;}'+
  '.s7fx .slab{position:absolute;inset:0;transform:translateX(-120%);animation:fxslab .42s cubic-bezier(.2,.9,.25,1.05) forwards;}'+
  '.s7fx .slab.r{background:var(--r);clip-path:polygon(0 30%,100% 6%,100% 58%,0 94%);}'+
  '.s7fx .slab.k{background:#0a0a0a;clip-path:polygon(0 46%,100% 25%,100% 71%,0 92%);animation-delay:.08s;}'+
  '.s7fx .slab.w{background:#fff;clip-path:polygon(0 94%,100% 58%,100% 61.5%,0 97.5%);animation-delay:.15s;}'+
  '.s7fx .st{position:absolute;left:50%;top:50%;width:min(100vw,1000px);aspect-ratio:16/10;transform:translate(-50%,-50%);container-type:inline-size;}'+

  '.s7fx .card{position:absolute;left:7cqw;top:7cqw;width:19cqw;height:31cqw;background:#fff;padding:.9cqw;box-shadow:.9cqw .9cqw 0 #000;'+
    'transform:rotate(-8deg);opacity:0;animation:fxcard .6s .18s cubic-bezier(.2,1.3,.4,1) forwards;}'+
  '.s7fx .card .in{position:relative;width:100%;height:100%;overflow:hidden;display:grid;place-items:center;'+
    'background:repeating-conic-gradient(from 0deg at 50% 48%,var(--ac) 0 6deg,#140a12 6deg 12deg);}'+
  '.s7fx .card .num{position:absolute;top:0;left:0;right:0;background:#fff;color:#111;text-align:center;font-weight:700;font-size:1.8cqw;letter-spacing:.35cqw;padding:.3cqw 0;}'+
  '.s7fx .card .ico{font-size:9cqw;line-height:1;filter:drop-shadow(0 0 1cqw #000) drop-shadow(0 0 .4cqw #000);}'+
  '.s7fx .card .nm{position:absolute;bottom:0;left:0;right:0;background:#fff;color:#111;text-align:center;font-weight:700;font-style:italic;font-size:1.9cqw;letter-spacing:.2cqw;padding:.4cqw .5cqw;text-transform:uppercase;white-space:nowrap;overflow:hidden;}'+

  '.s7fx .band{position:absolute;left:23cqw;top:15cqw;min-width:38cqw;max-width:60cqw;background:#000;color:#fff;border-right:.7cqw solid #fff;padding:1cqw 3.5cqw 1cqw 2.6cqw;'+
    'transform:skewX(-14deg) translateX(-90cqw);animation:fxband .45s .3s cubic-bezier(.2,.9,.3,1.08) forwards;}'+
  '.s7fx .band>*{display:block;transform:skewX(14deg);}'+
  '.s7fx .band b{font-size:var(--bf,3.3cqw);letter-spacing:.3cqw;font-style:italic;text-transform:uppercase;white-space:nowrap;}'+
  '.s7fx .band small{font-size:1.8cqw;letter-spacing:.25cqw;color:var(--y);margin-top:.3cqw;text-transform:uppercase;}'+

  '.s7fx .stars{position:absolute;left:24.5cqw;top:28cqw;display:flex;gap:.3cqw;font-size:2.3cqw;line-height:1;transform:skewX(-14deg);}'+
  '.s7fx .stars i{font-style:normal;color:#5a5560;opacity:0;animation:fxstar .2s forwards;}'+
  '.s7fx .stars i.on{color:var(--y);text-shadow:0 0 .8cqw rgba(255,230,0,.7);}'+
  '.s7fx .stars i.new{animation:fxstar .2s forwards,fxnew .5s 1.4s ease-in-out infinite alternate;}'+

  '.s7fx .burst{position:absolute;left:56cqw;top:3cqw;width:42cqw;height:27cqw;display:grid;place-items:center;transform:rotate(-6deg) scale(0);'+
    'animation:fxpop .55s .55s cubic-bezier(.2,1.6,.4,1) forwards,fxbeat 1s 1.3s ease-in-out infinite alternate;}'+
  '.s7fx .burst i{position:absolute;inset:0;background:var(--y);}'+
  '.s7fx .burst i.s{background:#000;transform:translate(1cqw,1cqw);}'+
  '.s7fx .burst h1{position:relative;margin:0;font-size:var(--hf,6.4cqw);line-height:1;font-style:italic;font-weight:700;color:#111;text-align:center;'+
    '-webkit-text-stroke:.4cqw #fff;paint-order:stroke fill;animation:fxstamp .3s .72s cubic-bezier(.2,1.8,.4,1) both;}'+

  '.s7fx .get{position:absolute;left:30cqw;top:37cqw;width:62cqw;opacity:0;transform:translateX(30cqw);animation:fxget .5s 1s cubic-bezier(.2,.9,.3,1.05) forwards;}'+
  '.s7fx .get em{display:inline-block;margin-left:14cqw;background:#fff;color:#111;font-style:italic;font-weight:700;font-size:1.8cqw;letter-spacing:.25cqw;padding:.3cqw 2.2cqw;transform:skewX(-14deg);text-transform:uppercase;}'+
  '.s7fx .get div{margin-top:.5cqw;background:rgba(0,0,0,.9);border-left:.8cqw solid var(--y);padding:1.3cqw 2.2cqw;color:#fff;}'+
  '.s7fx .get strong{display:block;font-size:2.7cqw;letter-spacing:.12cqw;color:var(--y);text-transform:uppercase;}'+
  '.s7fx .get p{margin:.5cqw 0 0;font-size:1.9cqw;line-height:1.4;color:#eee;}'+

  '.s7fx.nocard .band{left:9cqw;top:17cqw;}'+
  '.s7fx.nocard .stars{left:10.5cqw;top:30cqw;}'+
  '.s7fx.nocard .get{left:14cqw;}'+

  '.s7fx.out .slab{animation:fxslabout .4s cubic-bezier(.6,0,.9,.5) forwards;}'+
  '.s7fx.out .dim{animation:fxfadeout .4s forwards;}'+
  '.s7fx.out .st{animation:fxfadeout .3s forwards;}'+

  '.s7fx.pick{cursor:default;}'+
  '.s7fx.pick .band{left:8cqw;top:5cqw;}'+
  '.s7fx.pick .stars{left:9.5cqw;top:17.5cqw;}'+
  '.s7fx.pick .burst{left:60cqw;top:0;width:37cqw;height:22cqw;}'+
  '.s7fx .opt{position:absolute;top:25cqw;width:36cqw;height:32cqw;padding:.9cqw;border:0;background:#fff;cursor:pointer;font:inherit;text-align:left;color:#fff;'+
    'transform:rotate(var(--rt));box-shadow:.9cqw .9cqw 0 #000;transition:transform .18s,box-shadow .18s,opacity .3s;animation:fxopt .5s cubic-bezier(.2,1.3,.4,1) backwards;}'+
  '.s7fx .opt:nth-of-type(1){left:10cqw;--rt:-2.5deg;animation-delay:.95s;}'+
  '.s7fx .opt:nth-of-type(2){left:54cqw;--rt:2.5deg;animation-delay:1.1s;}'+
  '.s7fx .opt:hover,.s7fx .opt:focus-visible{transform:rotate(0) scale(1.06);z-index:2;outline:none;box-shadow:.9cqw .9cqw 0 #000,0 0 3cqw var(--y);}'+
  '.s7fx .opt .in{position:relative;display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;background:repeating-conic-gradient(from 0deg at 50% 38%,var(--ac) 0 6deg,#140a12 6deg 12deg);}'+
  '.s7fx .opt .top{display:flex;justify-content:space-between;background:#fff;color:#111;font-weight:700;font-size:1.7cqw;letter-spacing:.25cqw;padding:.35cqw 1cqw;text-transform:uppercase;}'+
  '.s7fx .opt .top em{font-style:normal;opacity:.55;}'+
  '.s7fx .opt .ic{flex:1;display:grid;place-items:center;font-size:7cqw;line-height:1;filter:drop-shadow(0 0 .8cqw #000);}'+
  '.s7fx .opt .tx{display:block;background:rgba(0,0,0,.92);border-top:.5cqw solid var(--y);padding:1cqw 1.3cqw 1.2cqw;}'+
  '.s7fx .opt strong{display:block;font-size:2.4cqw;letter-spacing:.1cqw;color:var(--y);text-transform:uppercase;font-style:italic;}'+
  '.s7fx .opt .ds{display:block;margin-top:.4cqw;font-size:1.55cqw;line-height:1.35;color:#eee;}'+
  '.s7fx .opt.sel{transform:rotate(0) scale(1.12);z-index:3;}'+
  '.s7fx.done .opt:not(.sel){opacity:0;transform:translateY(6cqw) scale(.85);}'+
  '.s7fx .later{position:absolute;left:50%;bottom:.5cqw;transform:translateX(-50%) skewX(-14deg);background:#000;color:#fff;border:.2cqw solid #fff;font:inherit;font-weight:700;font-size:1.5cqw;letter-spacing:.25cqw;padding:.5cqw 2.4cqw;cursor:pointer;text-transform:uppercase;animation:fxfade .4s 1.6s backwards;}'+
  '.s7fx .later:hover{background:#fff;color:#111;}'+
  '@keyframes fxopt{from{opacity:0;transform:translateY(22cqw) rotate(calc(var(--rt)*5)) scale(.6)}}'+
  '@keyframes fxfade{to{opacity:1}} @keyframes fxfadeout{to{opacity:0}}'+
  '@keyframes fxflash{0%{opacity:.9}100%{opacity:0}}'+
  '@keyframes fxslab{to{transform:none}} @keyframes fxslabout{to{transform:translateX(120%)}}'+
  '@keyframes fxcard{0%{opacity:0;transform:translate(-30cqw,-22cqw) rotate(-45deg) scale(1.9)}60%{opacity:1}100%{opacity:1;transform:rotate(-8deg)}}'+
  '@keyframes fxband{to{transform:skewX(-14deg)}}'+
  '@keyframes fxstar{from{opacity:0;transform:scale(2)}to{opacity:1;transform:none}}'+
  '@keyframes fxnew{from{transform:scale(1);color:var(--y)}to{transform:scale(1.5);color:#fff}}'+
  '@keyframes fxpop{0%{transform:rotate(-14deg) scale(0)}100%{transform:rotate(-6deg) scale(1)}}'+
  '@keyframes fxbeat{from{transform:rotate(-6deg) scale(1)}to{transform:rotate(-4.5deg) scale(1.04)}}'+
  '@keyframes fxstamp{0%{opacity:0;transform:scale(2.6)}100%{opacity:1;transform:none}}'+
  '@keyframes fxget{to{opacity:1;transform:none}}'+
  '@media (prefers-reduced-motion:reduce){.s7fx *{animation-duration:.01s !important;animation-delay:0s !important;animation-iteration-count:1 !important;}}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function roman(n){ var m=[[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']], r=''; n=Math.max(1,Math.min(39,+n||1)); m.forEach(function(p){ while(n>=p[0]){ r+=p[1]; n-=p[0]; } }); return r; }

  /* explosão amarela (polígono pontudo, sorteado a cada vez) */
  function burstPoly(){
    var p = [], n = 16, i, a, r;
    for(i = 0; i < n*2; i++){
      a = i/(n*2)*Math.PI*2; r = (i % 2) ? 37 + Math.random()*3 : 49 + Math.random()*1.5;
      p.push((50 + Math.cos(a)*r).toFixed(1)+'% '+(50 + Math.sin(a)*r*0.95).toFixed(1)+'%');
    }
    return 'polygon('+p.join(',')+')';
  }

  function build(o){
    var h = '<div class="dim"></div><div class="slab r"></div><div class="slab k"></div><div class="slab w"></div><div class="flash"></div><div class="st">';
    if(o.card && !o.opts) h += '<div class="card"><div class="in"><div class="num">'+esc(o.card.num)+'</div><div class="ico">'+esc(o.card.ico)+'</div><div class="nm">'+esc(o.card.nome)+'</div></div></div>';
    h += '<div class="band"><b>'+esc(o.label)+'</b>'+(o.sub ? '<small>'+esc(o.sub)+'</small>' : '')+'</div>';
    if(o.nv){
      h += '<div class="stars">';
      for(var k = 1; k <= (o.max || MAX); k++) h += '<i class="'+(k <= o.nv ? 'on' : '')+(k === o.nv ? ' new' : '')+'" style="animation-delay:'+(0.75 + k*0.04).toFixed(2)+'s">★</i>';
      h += '</div>';
    }
    var poly = burstPoly();
    h += '<div class="burst"><i class="s" style="clip-path:'+poly+'"></i><i style="clip-path:'+poly+'"></i><h1>'+esc(o.burst)+'</h1></div>';
    if(o.opts){
      var c = o.classe || {};
      o.opts.forEach(function(op, i){
        h += '<button type="button" class="opt" data-i="'+i+'"><span class="in"><span class="top"><b>'+esc(c.n || 'Classe')+'</b><em>['+(i+1)+']</em></span><span class="ic">'+esc(c.i || '⚡')+'</span><span class="tx"><strong>'+esc(op.n)+'</strong><span class="ds">'+esc(op.d)+'</span></span></span></button>';
      });
      h += '<button type="button" class="later">Decidir depois</button>';
    }
    if(o.get && !o.opts) h += '<div class="get"><em>'+esc(o.get.tag)+'</em><div><strong>'+esc(o.get.titulo)+'</strong>'+(o.get.desc ? '<p>'+esc(o.get.desc)+'</p>' : '')+'</div></div>';
    return h + '</div>';
  }

  function render(o, done){
    var el = document.createElement('div');
    var pick = !!o.opts;
    el.className = 's7fx'+(o.card && !pick ? '' : ' nocard')+(pick ? ' pick' : '');
    el.setAttribute('role', 'status');
    if(o.cor) el.style.setProperty('--cc', o.cor);
    if(String(o.label).length > 12) el.style.setProperty('--bf', '2.9cqw');
    if(String(o.burst).length > 9) el.style.setProperty('--hf', '4.6cqw');
    el.innerHTML = build(o);
    document.body.appendChild(el);
    var closed = false, t0 = Date.now(), tm;
    function close(){
      if(closed) return; closed = true; clearTimeout(tm);
      document.removeEventListener('keydown', key, true);
      el.classList.add('out');
      setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); done(); }, 420);
    }
    function choose(i){
      if(closed || Date.now() - t0 < 1100) return;
      var op = o.opts && o.opts[i]; if(!op) return;
      var ok = true;
      try{ ok = o.onPick ? o.onPick(op.n, op, i) !== false : true; }catch(err){ ok = false; }
      if(!ok) return;
      el.classList.add('done');
      var b = el.querySelectorAll('.opt')[i]; if(b) b.classList.add('sel');
      setTimeout(close, 500);
    }
    function key(e){
      if(pick){
        if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); }
        else if(e.key === '1' || e.key === '2'){ e.preventDefault(); e.stopPropagation(); choose(+e.key - 1); }
        return;
      }
      if(['Escape','Enter',' '].indexOf(e.key) < 0) return;
      e.preventDefault(); e.stopPropagation();
      if(Date.now() - t0 > 500) close();
    }
    el.addEventListener('click', function(e){
      if(pick){
        var t = e.target.closest ? e.target : null, ob = t && t.closest('.opt');
        if(ob) choose(+ob.getAttribute('data-i'));
        else if(t && t.closest('.later')) close();
        return;
      }
      if(Date.now() - t0 > 500) close();
    });
    document.addEventListener('keydown', key, true);
    if(!pick) tm = setTimeout(close, o.ms || 3800);
  }

  function next(){
    var it = Q.shift(); if(!it){ busy = false; return; }
    busy = true;
    render(it[0], function(){ it[1](); setTimeout(next, 120); });
  }
  function play(o){
    return new Promise(function(res){
      if(!document.body){ res(); return; }
      Q.push([o, res]); if(!busy) next();
    });
  }

  /* ---------- atalhos ---------- */
  function nivel(n){
    n = Math.max(1, Math.min(MAX, +n || 1));
    var P = window.S7P, prox = 0, sub = 'Você evoluiu';
    if(P && P.PREMIOS) Object.keys(P.PREMIOS).map(Number).sort(function(a,b){ return a-b; }).some(function(l){ if(l > n){ prox = l; return true; } });
    if(prox) sub = 'Próximo marco: nível '+prox; else if(n >= MAX) sub = 'Nível máximo';
    return play({label:'NÍVEL '+n, sub:sub, burst:'LEVEL UP!', nv:n, max:MAX});
  }
  function escolha(o){
    o = o || {}; var c = o.classe || {i:'❔', n:'CLASSE', c:'#ff1f45'}, lv = +o.lv || 0;
    if(o.opts && o.opts.length)
      return play({cor:c.c, label:'NOVA ESCOLHA', sub:'Nível '+lv+' · '+c.n+' · clique numa carta', burst:'ESCOLHA!', nv:lv, max:MAX,
        classe:c, opts:o.opts, onPick:o.onPick});
    return play({cor:c.c, label:'NOVA ESCOLHA', sub:'Desbloqueada · nível '+lv+' · '+c.n, burst:'ESCOLHA!', nv:lv, max:MAX,
      card:{ico:c.i, num:roman(lv), nome:c.n},
      get:{tag:'Escolha desbloqueada', titulo:'Habilidade de classe', desc:'Escolha 1 de 2 opções na seção NÍVEL & XP.'}});
  }
  function habilidade(nome, desc, classe){
    var c = classe || {};
    return play({cor:c.c, label:'NOVA HABILIDADE', sub:c.n || '', burst:'HABILIDADE!',
      card:{ico:c.i || '⚡', num:'★', nome:c.n || 'HABILIDADE'},
      get:{tag:'Get ability', titulo:nome, desc:desc}});
  }
  /* ficha, nível antes, nível depois: LEVEL UP + uma carta por escolha de habilidade liberada */
  function subiu(f, de, para, onPick){
    if(!(para > de)) return;
    nivel(para);
    var P = window.S7P;
    if(P && P.pendentes){
      try{ P.pendentes(f).forEach(function(x){ if(x.tipo === 'hab' && +x.lv > de && +x.lv <= para) escolha({lv:+x.lv, classe:x.classe, opts:x.opts, onPick:onPick ? function(nome, op){ return onPick(+x.lv, nome, op, x.classe); } : null}); }); }catch(e){}
    }
  }
  function pular(){ Q.length = 0; var e = document.querySelector('.s7fx'); if(e) e.click(); }

  window.S7FX = {nivel:nivel, escolha:escolha, habilidade:habilidade, subiu:subiu, play:play, pular:pular};
})();