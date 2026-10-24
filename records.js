/* ============================================================
   records.js — SELETOR "RECORDS" (SETOR 7)
   Tela cheia com cartas rápidas (retrato, nome, nível, classe, vida, XP),
   rolagem lateral (arrastar, roda do mouse, ◂ ▸, toque) e ZOOM:
   zoom baixo = cartas menores em 2 fileiras = mais fichas na tela.
   Precisa do party.js (S7P). Uso:
     S7REC.abrir({
       titulo:'ESCOLHER OPERATIVO', sub:'// SLOT 02',
       lista:[fichas], atualId:'id', zoomKey:'s7_baseZoom',
       onPick:function(f){ ... },
       novo:{texto:'NOVO OPERATIVO', fn:function(){ ... }}   (opcional)
     });
   ============================================================ */
(function(){
  var css =
  'body.s7r-open{overflow:hidden;}'+
  '#s7rOv{position:fixed;inset:0;z-index:8000;display:flex;flex-direction:column;font-family:var(--hud,"Chakra Petch",sans-serif);color:color-mix(in srgb,var(--cyan) 20%,var(--txt));'+
    'background:radial-gradient(ellipse at 50% 40%,color-mix(in srgb,var(--cyan) 14%,var(--bg2)),var(--bg));animation:s7rin .22s ease-out;}'+
  '#s7rOv:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;background-image:linear-gradient(color-mix(in srgb,var(--cyan) 6%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--cyan) 6%,transparent) 1px,transparent 1px);background-size:34px 34px;}'+
  '@keyframes s7rin{from{opacity:0;transform:scale(1.02)}}'+
  '#s7rOv .rt{position:relative;display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:2px solid color-mix(in srgb,var(--cyan) 45%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--cyan) 18%,transparent),transparent 70%);}'+
  '#s7rOv .rt h2{margin:0;font-size:1.5rem;letter-spacing:.32em;color:var(--cyan);text-shadow:0 0 14px color-mix(in srgb,var(--cyan) 60%,transparent);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
  '#s7rOv .rt h2 small{font-size:.6rem;letter-spacing:.2em;color:color-mix(in srgb,var(--cyan) 40%,var(--dim));margin-left:12px;}'+
  '#s7rOv .rb{font-family:inherit;font-weight:700;letter-spacing:.18em;font-size:.72rem;background:color-mix(in srgb,var(--cyan) 8%,transparent);border:1px solid var(--cyan);color:var(--cyan);padding:9px 16px;cursor:pointer;text-transform:uppercase;clip-path:var(--chamfer-sm,none);}'+
  '#s7rOv .rb:hover{background:var(--cyan);color:var(--bg);}'+
  '#s7rOv .rl{position:relative;display:flex;align-items:center;gap:14px;padding:10px 18px;font-size:.66rem;letter-spacing:.18em;color:color-mix(in srgb,var(--cyan) 40%,var(--dim));flex-wrap:wrap;}'+
  '#s7rOv .rl input[type=range]{accent-color:var(--cyan);width:min(240px,50vw);}'+
  '#s7rOv .rl .hint{margin-left:auto;opacity:.7;}'+
  '#s7rOv .rs{position:relative;flex:1;min-height:0;display:flex;align-items:stretch;}'+
  '#s7rOv .rk{flex:1;min-width:0;display:grid;grid-auto-flow:column;grid-template-rows:repeat(var(--rows,1),max-content);align-content:center;gap:calc(22px*var(--z,1));overflow-x:auto;overflow-y:hidden;padding:20px 8vw;scroll-snap-type:x proximity;scrollbar-width:thin;scrollbar-color:var(--cyan) transparent;cursor:grab;-webkit-overflow-scrolling:touch;}'+
  '#s7rOv .rk.drag{cursor:grabbing;scroll-snap-type:none;}'+
  '#s7rOv .rn{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:42px;height:84px;background:color-mix(in srgb,var(--bg) 80%,transparent);border:1px solid var(--cyan);color:var(--cyan);font-size:1.3rem;cursor:pointer;}'+
  '#s7rOv .rn:hover{background:var(--cyan);color:var(--bg);} #s7rOv .rn.l{left:0;} #s7rOv .rn.r{right:0;}'+
  '#s7rOv .rc{position:relative;font-size:calc(14px*var(--z,1));width:21.5em;scroll-snap-align:center;cursor:pointer;user-select:none;background:linear-gradient(160deg,color-mix(in srgb,var(--cyan) 20%,transparent),color-mix(in srgb,color-mix(in srgb,var(--cyan) 12%,var(--bg2)) 55%,transparent));border:1px solid color-mix(in srgb,var(--cyan) 55%,transparent);padding:1.1em 1.1em 1em;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 1.4em color-mix(in srgb,var(--cyan) 12%,transparent);clip-path:polygon(0 0,calc(100% - 1.4em) 0,100% 1.4em,100% 100%,1.4em 100%,0 calc(100% - 1.4em));transition:transform .15s,box-shadow .15s,background .15s;}'+
  '#s7rOv .rc:before{content:"";position:absolute;left:0;top:0;width:42%;height:.38em;background:color-mix(in srgb,var(--cyan) 45%,#fff);box-shadow:0 0 .8em var(--cyan);}'+
  '#s7rOv .rc:hover,#s7rOv .rc:focus-visible{transform:translateY(-.35em);outline:none;box-shadow:0 0 0 1px #000,0 0 2em color-mix(in srgb,var(--cyan) 45%,transparent);background:linear-gradient(160deg,color-mix(in srgb,var(--cyan) 34%,transparent),color-mix(in srgb,color-mix(in srgb,var(--cyan) 12%,var(--bg2)) 65%,transparent));}'+
  '#s7rOv .rc.active{border-color:var(--yellow);box-shadow:0 0 0 1px #000,0 0 2em color-mix(in srgb,var(--yellow) 30%,transparent);}'+
  '#s7rOv .rc.active:before{background:var(--yellow);box-shadow:0 0 .8em var(--yellow);}'+
  '#s7rOv .rh{display:flex;gap:1em;align-items:stretch;}'+
  '#s7rOv .rp{flex:none;width:7.6em;aspect-ratio:3/4;overflow:hidden;position:relative;background:var(--bg);border:1px solid color-mix(in srgb,var(--cyan) 60%,transparent);}'+
  '#s7rOv .rp .pt-frame{position:absolute;inset:0;aspect-ratio:auto;}'+
  '#s7rOv .rp .pt-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;font-size:.6em;letter-spacing:.2em;color:var(--dim);}'+
  '#s7rOv .ri{flex:1;min-width:0;margin:0;display:grid;grid-template-columns:auto 1fr;column-gap:.8em;row-gap:.38em;align-content:center;font-size:.85em;}'+
  '#s7rOv .ri dt{color:color-mix(in srgb,var(--cyan) 75%,var(--txt));letter-spacing:.1em;font-size:.82em;align-self:center;}'+
  '#s7rOv .ri dd{margin:0;font-weight:700;letter-spacing:.06em;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
  '#s7rOv .ri dd.cl{color:var(--cc,var(--cyan));}'+
  '#s7rOv .rx{margin-top:.9em;font-size:.7em;letter-spacing:.14em;color:color-mix(in srgb,var(--cyan) 40%,var(--dim));display:flex;justify-content:space-between;gap:.6em;}'+
  '#s7rOv .rr{height:.5em;background:rgba(0,0,0,.55);border:1px solid color-mix(in srgb,var(--cyan) 35%,transparent);margin-top:.3em;}'+
  '#s7rOv .rr b{display:block;height:100%;background:linear-gradient(90deg,var(--cyan),#e8f500);}'+
  '#s7rOv .rg{display:flex;gap:.5em;margin-top:.7em;flex-wrap:wrap;font-size:.62em;letter-spacing:.16em;min-height:1.6em;}'+
  '#s7rOv .rg span{border:1px solid currentColor;padding:.15em .8em;border-radius:99px;}'+
  '#s7rOv .rg .on{color:var(--yellow);} #s7rOv .rg .pt{color:var(--green);}'+
  '#s7rOv .rc.novo{display:grid;place-items:center;align-content:center;gap:.5em;min-height:12em;border-style:dashed;background:color-mix(in srgb,var(--cyan) 4%,transparent);color:var(--cyan);font-weight:700;letter-spacing:.2em;font-size:calc(12px*var(--z,1));}'+
  '#s7rOv .rc.novo i{font-style:normal;font-size:3.2em;line-height:1;} #s7rOv .rc.novo:before{display:none;}'+
  '#s7rOv .vz{align-self:center;justify-self:center;color:var(--dim);letter-spacing:.2em;font-size:.8rem;padding:0 8vw;}'+
  '@media (max-width:600px){#s7rOv .rn{display:none;} #s7rOv .rt h2{font-size:1.05rem;letter-spacing:.2em;} #s7rOv .rl .hint{display:none;}}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function info(f, i){
    var P = window.S7P; P.ensure(f);
    var nv = P.nivel(f), c = P.classeObj(f.classe), c2 = P.classeObj(f.classe2), s = P.stats(f);
    var base = P.xpAcum(nv), custo = nv >= P.NV_MAX ? 0 : P.xpCusto(nv);
    return {nv:nv, c:c, c2:c2, vida:s.vida, vmax:s.vidaMax, xp:(f.xp || 0),
      pct: custo ? Math.max(0, Math.min(100, Math.round((f.xp - base) / custo * 100))) : 100,
      cod:'OP-'+('0'+(i + 1)).slice(-2)+'-'+String(f.id || '').slice(-3).toUpperCase()};
  }
  function card(f, o, todas){
    var P = window.S7P, i = todas.indexOf(f.id), d = info(f, i < 0 ? 0 : i), cc = d.c ? d.c.c : 'var(--cyan)', ptn = P.inParty && P.inParty(f.id);
    return '<div class="rc'+(f.id === o.atualId ? ' active' : '')+'" tabindex="0" data-id="'+esc(f.id)+'" style="--cc:'+cc+'">'+
      '<div class="rh"><div class="rp">'+P.portraitHTML(f.retrato)+'</div>'+
      '<dl class="ri"><dt>ID</dt><dd>'+d.cod+'</dd><dt>NOME</dt><dd title="'+esc(f.nome || '')+'">'+esc(f.nome || 'SEM NOME')+'</dd>'+
      '<dt>NÍVEL</dt><dd>'+d.nv+' / '+P.NV_MAX+'</dd>'+
      '<dt>CLASSE</dt><dd class="cl">'+(d.c ? d.c.i+' '+esc(d.c.n) : '—')+'</dd>'+
      '<dt>2ª CL.</dt><dd class="cl" style="--cc:'+(d.c2 ? d.c2.c : 'var(--cyan)')+'">'+(d.c2 ? d.c2.i+' '+esc(d.c2.n) : '—')+'</dd>'+
      '<dt>VIDA</dt><dd>'+d.vida+' / '+d.vmax+'</dd></dl></div>'+
      '<div class="rx"><span>XP '+d.xp.toLocaleString('pt-BR')+'</span><span>'+(d.nv >= P.NV_MAX ? 'MÁXIMO' : d.pct+'%')+'</span></div><div class="rr"><b style="width:'+d.pct+'%"></b></div>'+
      '<div class="rg">'+(f.id === o.atualId ? '<span class="on">ABERTA</span>' : '')+(ptn ? '<span class="pt">⭐ NA PARTY</span>' : '')+'</div></div>';
  }

  function fechar(){
    var ov = document.getElementById('s7rOv'); if(!ov) return;
    document.removeEventListener('keydown', ov._key, true);
    document.body.classList.remove('s7r-open'); ov.remove();
  }

  function abrir(o){
    o = o || {};
    if(!window.S7P){ alert('party.js não carregou.'); return; }
    if(document.getElementById('s7rOv')) return;
    var ZK = o.zoomKey || 's7_recZoom', lista = o.lista || [], todas = window.S7P.fichas().map(function(f){ return f.id; });
    var ov = document.createElement('div'); ov.id = 's7rOv'; ov.setAttribute('data-noemo', '');
    ov.innerHTML =
      '<div class="rt"><button type="button" class="rb" data-a="x">◂ VOLTAR</button><h2>'+esc(o.titulo || 'RECORDS')+'<small>'+esc(o.sub || '// OPERATIVOS')+'</small></h2>'+
        (o.novo ? '<button type="button" class="rb" data-a="new">+ NOVO</button>' : '')+'</div>'+
      '<div class="rl"><label>🔍 ZOOM <input type="range" id="s7rZ" min="50" max="160" step="5"></label><span id="s7rN"></span>'+
        '<span class="hint">arraste, use a roda do mouse ou ◂ ▸ · Enter escolhe · Esc fecha</span></div>'+
      '<div class="rs"><button type="button" class="rn l" data-a="l">◂</button><div class="rk" id="s7rK"></div><button type="button" class="rn r" data-a="r">▸</button></div>';
    document.body.appendChild(ov); document.body.classList.add('s7r-open');
    var tr = ov.querySelector('#s7rK'), zr = ov.querySelector('#s7rZ');

    function zoomSalvo(){ var z = 1; try{ z = parseFloat(localStorage.getItem(ZK)); }catch(e){} return (z >= .5 && z <= 1.6) ? z : 1; }
    function zoom(z){
      z = Math.max(.5, Math.min(1.6, z));
      ov.style.setProperty('--z', z); ov.style.setProperty('--rows', z < .85 ? 2 : 1);   /* zoom baixo = 2 fileiras */
      zr.value = Math.round(z * 100); try{ localStorage.setItem(ZK, z); }catch(e){}
    }
    function desenha(){
      tr.innerHTML = (lista.length ? lista.map(function(f){ return card(f, o, todas); }).join('') : '<div class="vz">// NENHUMA FICHA DISPONÍVEL //</div>')+
        (o.novo ? '<div class="rc novo" tabindex="0" data-a="new"><i>+</i>'+esc(o.novo.texto || 'NOVO OPERATIVO')+'</div>' : '');
      ov.querySelector('#s7rN').textContent = lista.length+' FICHA'+(lista.length === 1 ? '' : 'S');
      var a = tr.querySelector('.rc.active'); if(a) a.scrollIntoView({inline:'center', block:'nearest'});
      if(window.S7EMO) S7EMO.scan(tr);
    }
    function passo(d){ var c = tr.querySelector('.rc'); tr.scrollBy({left:d * ((c ? c.offsetWidth : 300) + 24), behavior:'smooth'}); }

    zr.addEventListener('input', function(){ zoom(zr.value / 100); });
    zoom(zoomSalvo()); desenha();

    ov.addEventListener('click', function(e){
      var t = e.target, a = t.closest && t.closest('[data-a]'), c = t.closest && t.closest('.rc[data-id]');
      if(tr._moved){ tr._moved = false; return; }
      if(a){
        var k = a.getAttribute('data-a');
        if(k === 'x'){ fechar(); if(o.onClose) o.onClose(); }
        else if(k === 'new'){ fechar(); if(o.novo && o.novo.fn) o.novo.fn(); }
        else passo(k === 'l' ? -1 : 1);
        return;
      }
      if(c){
        var f = lista.filter(function(x){ return x.id === c.getAttribute('data-id'); })[0];
        fechar(); if(f && o.onPick) o.onPick(f);
      }
    });
    ov._key = function(e){
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); fechar(); if(o.onClose) o.onClose(); }
      else if(e.key === 'ArrowRight'){ e.preventDefault(); passo(1); } else if(e.key === 'ArrowLeft'){ e.preventDefault(); passo(-1); }
      else if(e.key === 'Enter'){ var el = document.activeElement; if(el && el.classList && el.classList.contains('rc')){ e.preventDefault(); el.click(); } }
    };
    document.addEventListener('keydown', ov._key, true);

    tr.addEventListener('wheel', function(e){ if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){ tr.scrollLeft += e.deltaY; e.preventDefault(); } }, {passive:false});
    var down = null;
    tr.addEventListener('pointerdown', function(e){ if(e.pointerType !== 'mouse' || e.button) return; down = {x:e.clientX, s:tr.scrollLeft}; tr._moved = false; });
    window.addEventListener('pointermove', function mv(e){
      if(!document.getElementById('s7rOv')){ window.removeEventListener('pointermove', mv); return; }
      if(!down) return; var dx = e.clientX - down.x;
      if(Math.abs(dx) > 6){ tr._moved = true; tr.classList.add('drag'); tr.scrollLeft = down.s - dx; }
    });
    window.addEventListener('pointerup', function(){ down = null; tr.classList.remove('drag'); setTimeout(function(){ tr._moved = false; }, 0); });
    var first = tr.querySelector('.rc.active') || tr.querySelector('.rc'); if(first) first.focus({preventScroll:true});
  }
  window.S7REC = {abrir:abrir, fechar:fechar};
})();