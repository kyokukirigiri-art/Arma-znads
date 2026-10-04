/* ============================================================
   ameacas.js — dados das AMEAÇAS (SETOR 7)
   Usado por ameacas.html (a ficha de inimigo) e mapa.html.
   Inimigo = FICHA COMPLETA (mesmo formato da ficha.html: partes do corpo,
   implantes, atributos...) + { cat, itens:[] }. Fica em 's7_ameacas_fichas'.
   Categorias em 's7_ameacas_cats': {id,nome,ico,cor,tam,acess}.
   ============================================================ */
(function(){
  var KF = 's7_ameacas_fichas', KC = 's7_ameacas_cats';
  function rd(k){ var d; try{ d = JSON.parse(localStorage.getItem(k)||'[]'); }catch(e){ d=[]; } return Array.isArray(d) ? d : []; }
  function wr(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
  function uid(){ return 'm_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function fichas(){ return rd(KF); }
  function cats(){ return rd(KC); }
  function get(id){ return fichas().filter(function(f){ return f.id===id; })[0] || null; }
  function cat(id){ return cats().filter(function(c){ return c.id===id; })[0] || null; }

  /* clona uma ficha n vezes (vida cheia, mesmos implantes/itens/atributos); retrato vem do molde */
  function clone(id, n){
    var all = fichas(), src = all.filter(function(f){ return f.id===id; })[0]; if(!src) return [];
    var base = String(src.nome||'Inimigo').replace(/\s*#\d+$/,''), out = [];
    var mx = 0; all.forEach(function(f){ if(f.cat===src.cat && String(f.nome).indexOf(base+' #')===0) mx = Math.max(mx, parseInt(String(f.nome).slice(base.length+2),10)||0); });
    for(var i=0;i<n;i++){
      var c = JSON.parse(JSON.stringify(src));
      c.id = uid(); c.nome = base+' #'+(++mx); c.molde = src.molde || src.id;
      c.retrato = {img:'', zoom:100, x:0, y:0};
      for(var k in c.partes) c.partes[k].atual = c.partes[k].max;
      all.push(c); out.push(c);
    }
    wr(KF, all); return out;
  }
  function stats(f){ var a=0, m=0, p=f.partes||{}; for(var k in p){ a += +p[k].atual||0; m += +p[k].max||0; } return {v:a, m:m}; }
  /* dano (<0) tira das partes (torso primeiro); cura (>0) enche as partes */
  function hp(id, delta){
    var all = fichas(), f = all.filter(function(x){ return x.id===id; })[0]; if(!f) return null;
    var ks = Object.keys(f.partes||{}).sort(function(a,b){ return (a==='torso'||a==='corpo'||a==='cabtorso'?0:1) - (b==='torso'||b==='corpo'||b==='cabtorso'?0:1); });
    var left = Math.abs(delta);
    ks.forEach(function(k){
      var p = f.partes[k]; if(!left) return;
      if(delta<0){ var t = Math.min(left, +p.atual||0); p.atual -= t; left -= t; }
      else { var h = Math.min(left, (+p.max||0)-(+p.atual||0)); p.atual = (+p.atual||0)+h; left -= h; }
    });
    wr(KF, all); return f;
  }
  /* fichas com retrato resolvido (clone usa o do molde) — para o mapa */
  function faces(){
    var l = fichas(), m = {}; l.forEach(function(f){ m[f.id]=f; });
    return l.map(function(f){
      if((f.retrato && f.retrato.img) || !f.molde || !m[f.molde]) return f;
      return {id:f.id, nome:f.nome, retrato:m[f.molde].retrato};
    });
  }
  function item(nome){
    var n = String(nome).trim().toLowerCase(), c = (window.S7CATALOGO||[]).filter(function(x){ return x.nome.toLowerCase()===n; })[0];
    return c ? {nome:c.nome, efeito:c.efeito||'', raridade:c.raridade||'comum', desc:c.desc||''} : {nome:String(nome).trim(), efeito:'', raridade:'custom', desc:''};
  }
  window.S7AM = { KF:KF, KC:KC, fichas:fichas, cats:cats, get:get, cat:cat, clone:clone, stats:stats, hp:hp, faces:faces, item:item, uid:uid };
})();