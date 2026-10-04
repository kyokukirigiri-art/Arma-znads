/* ============================================================
   inventario.js — dados do INVENTÁRIO (SETOR 7)
   Compartilhado por: ARMA-ZENADS.html (grava as compras),
   inventario.html (a maleta) e ficha.html (quem está equipado).
   Tudo fica no localStorage, chave 's7_inventario'.
   ============================================================ */
(function(){
  var KEY = 's7_inventario';
  var MAX_ROWS = 40, MAX_COLS = 16, MIN_ROWS = 3, MIN_COLS = 4;

  /* categorias: nome, ícone, tamanho padrão (largura x altura em casas), se empilha */
  var CATS = {
    arma:     {n:'ARMA',          ico:'🔫', lu:':pistol-gun:', w:3, h:2, stack:false},
    corpo:    {n:'CORPO A CORPO', ico:'🗡️', lu:'sword', w:1, h:3, stack:false},
    cura:     {n:'CURA',          ico:'💉', lu:'syringe', w:1, h:2, stack:true},
    sanidade: {n:'SOBRECARGA',      ico:'💊', lu:'pill', w:1, h:1, stack:true},
    armadura: {n:'ARMADURA',      ico:'🦺', lu:'shield', w:2, h:2, stack:false},
    hacker:   {n:'HACKER',        ico:'💻', lu:'terminal', w:2, h:1, stack:false},
    implante: {n:'IMPLANTE',      ico:'🧠', lu:'brain', w:1, h:1, stack:false},
    protese:  {n:'PRÓTESE',       ico:'🦾', lu:'bot', w:1, h:2, stack:false},
    comida:   {n:'COMIDA',        ico:'🍜', lu:'utensils', w:1, h:1, stack:true},
    outro:    {n:'OUTROS',        ico:'📦', lu:'package', w:1, h:1, stack:false}
  };
  var RAR = {
    comum:        {n:'COMUM',        c:'#22e6d2'},
    raro:         {n:'RARO',         c:'#8b5bff'},
    experimental: {n:'EXPERIMENTAL', c:'#ffb300'},
    proibido:     {n:'PROIBIDO',     c:'#ff3355'},
    custom:       {n:'PERSONALIZADO',c:'#46ff7a'}
  };


  /* ---------- TAMANHO E ÍCONE ESPECÍFICOS POR ITEM ----------
     [regex do nome (minúsculo, sem acento, sem sufixo Mk-II/III), largura, altura, ícone ou null].
     null = usa o ícone padrão da categoria. A primeira regra que casar vence.
     Para mudar o tamanho de um item da loja, é só editar/adicionar uma linha aqui. */
  var SPECS = [
    /* armas de fogo */
    [/^pistola pulso/,2,1,':colt-m1911:'],      [/^viper-9/,2,1,':c96:'],
    [/^smg viper/,2,2,':cz-skorpion:'],          [/^raptor/,2,2,':m3-grease-gun:'],
    [/^neon-ar/,4,2,':fn-fal:'],            [/^volt-77/,3,2,':mp5k:'],
    [/^specter$/,3,2,':famas:'],           [/^lanca-granadas/,3,2,':missile-pod:'],
    [/^titan-12/,4,2,':lee-enfield:'], [/^ghostline/,5,2,':steyr-aug:'],
    [/^railgun/,5,2,':thompson-m1928:'],    [/^m-3057/,4,2,':p90:'],
    [/^hawk-eye/,5,2,':lee-enfield:'], [/^smartgun/,4,2,':bolter-gun:'],
    [/^aegis rail/,6,2,':musket:'],
    /* corpo a corpo */
    [/^faca/,1,2,':bowie-knife:'],     [/^espada/,1,4,':croc-sword:'],
    [/^bastao/,1,3,':spiked-bat:'],     [/^punho titan/,2,2,':mailed-fist:'],
    [/^monolamina/,1,4,':energy-sword:'], [/^garras/,2,2,':steel-claws:'],
    [/^lanca arc/,1,4,':switchblade:'], [/^machado/,2,3,':halberd:'],
    [/^katana/,1,4,':katana:'],   [/^martelo/,2,3,':flat-hammer:'],
    [/^foice/,2,4,':reaper-scythe:'],
    /* cura */
    [/^medspray/,1,2,':aerosol:'], [/^stimpack/,1,1,':miracle-medecine:'],
    [/^trauma kit/,2,2,':defibrilate:'], [/^autodoc/,1,1,':health-capsule:'],
    [/^kit regeneracao/,2,1,':companion-cube:'], [/^soro/,1,2,':love-injection:'],
    /* sobrecarga */
    [/^calmante/,1,1,':pill:'],  [/^pulseira/,1,1,':finger-print:'],
    [/^terapia/,1,1,':life-support:'],  [/^dreamsafe/,1,1,':cannister:'],
    [/^firewall/,1,1,':virus:'], [/^reset ego/,1,1,':medicine-pills:'],
    /* armaduras */
    [/^colete/,2,2,':kevlar-vest:'],  [/^jaqueta/,2,3,':sleeveless-jacket:'],
    [/^exo-rig/,3,3,':ribcage:'],    [/^escudo/,2,3,':bordered-shield:'],
    [/^carapaca/,3,2,':abdominal-armor:'],   [/^blindagem/,3,3,':shoulder-armor:'],
    /* hacker */
    [/^deck/,2,2,'lucide:laptop'],    [/^sniffer/,1,1,'lucide:radio'],
    [/^virus/,1,1,'lucide:bug'],      [/^proxy/,1,1,'lucide:globe'],
    [/^ice-breaker/,2,1,'lucide:cpu'], [/^backdoor/,1,1,'lucide:key-round'],
    /* implantes / próteses */
    [/^cyber arm/,1,3,'lucide:bot'], [/^servo-leg|^vector legs/,1,3,'lucide:footprints'],
    [/^ossatura/,1,3,'lucide:bone'],  [/^hydra muscle/,1,2,'lucide:dumbbell'],
    [/^colossus core|^ares frame|^kinetic core/,2,2,'lucide:battery-charging'],
    [/^punho graviton|^graviton fist|^titan grip/,1,2,'lucide:hand'],
    [/^titan-04/,1,2,'lucide:dumbbell'],
    [/eyes?$|^eyescan|ghost-eye|^kiroshi|optical camo/,1,1,'lucide:scan-eye'],
    [/^reactor heart/,1,1,'lucide:heart-pulse'], [/^nanite blood/,1,1,'lucide:droplet'],
    [/^datajack|^synapse link/,1,1,'lucide:usb'], [/^ghost chip/,1,1,'lucide:ghost'],
    [/^memory chip|^memory vault/,1,1,'lucide:hard-drive'],
    [/^void skin/,2,2,'lucide:shield'], [/^pain editor/,1,1,'lucide:pill'],
    [/^adrenal booster/,1,1,'lucide:syringe'],
    [/^sandevistan|^overclock|^overdrive|^flash-step|^blink drive|^ghost step|^phantom step/,1,1,'lucide:zap'],
    [/^neuroboost|^synapse-7|^tactician|^quantum brain|^ghost brain|^neuro accelerator|^nexus/,1,1,'lucide:brain'],
    /* implantes de suporte e netrunner (habilidades com alvo) */
    [/^medic daemon/,1,1,'lucide:heart-pulse'], [/^pulse aura/,1,1,'lucide:radio'],
    [/^stim injector/,1,1,'lucide:syringe'],    [/^aegis link/,1,1,'lucide:shield-plus'],
    [/^purge protocol/,1,1,'lucide:sparkles'],  [/^second wind core/,1,1,'lucide:heart-handshake'],
    [/^inferno script/,1,1,'lucide:flame'],     [/^toxin worm/,1,1,'lucide:skull'],
    [/^arc surge/,1,1,'lucide:zap'],            [/^mind spike/,1,1,'lucide:brain-circuit'],
    [/^fork bomb/,1,1,'lucide:git-fork'],       [/^blackout virus/,1,1,'lucide:eye-off'],
    [/^puppeteer/,1,1,'lucide:drama'],
    /* comida */
    [/^pizza/,2,2,'\ud83c\udf55'],  [/^synthburger/,1,1,'\ud83c\udf54'],
    [/^ramen/,1,1,'\ud83c\udf5c'],  [/^batata/,1,1,'\ud83c\udf5f'],
    [/^guarana/,1,2,'\ud83e\udd64'], [/^scop/,1,2,'\ud83e\udd43'],
    [/^sushi/,1,1,'\ud83c\udf63'],  [/^refresco/,1,2,'\ud83e\uddc3'],
    [/^chocolate/,1,1,'\ud83c\udf6b'], [/^sabor fantasma/,1,1,'\ud83d\udc7b']
  ];
  function normNome(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+mk-?(i{1,3}|iv|v)$/,'').replace(/\s*\(.*\)\s*$/,'').trim();
  }
  /* devolve {w,h,icone} do item pelo nome, ou null se não houver regra */
  function spec(nome){
    var n = normNome(nome);
    for(var i=0;i<SPECS.length;i++){
      if(SPECS[i][0].test(n)) return {w:SPECS[i][1], h:SPECS[i][2], icone:SPECS[i][3]};
    }
    return null;
  }

  /* cor de exibição: a personalizada, ou a da raridade */
  function cor(it){ return it.cor || RAR[it.raridade].c; }

  /* ícone: emoji, ou 'lucide:nome' (usa a biblioteca Lucide; sem ela cai no emoji da categoria) */
  function isLu(s){ return /^lucide:[a-z0-9-]+$/i.test(s||''); }
  function iconHTML(icone, cat){
    if(typeof icone==='string' && icone.indexOf('lucide::')===0) icone = icone.slice(7);
    if(isLu(icone)){
      if(window.lucide) return '<i data-lucide="'+icone.slice(7).toLowerCase()+'"></i>';
      return (CATS[cat]||CATS.outro).ico;
    }
    var out = String(icone==null?'':icone).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
    /* :nome: -> imagem da pasta emojis/ (se ainda não carregou, o emojis.js troca logo em seguida) */
    if(window.S7EMO && S7EMO.is(icone)) out = S7EMO.html(out);
    return out;
  }
  function catIcon(k){ return iconHTML('lucide:'+CATS[k].lu, k); }
  function lucideRefresh(){ if(window.lucide && lucide.createIcons) lucide.createIcons(); }

  function uid(){ return 'i_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function num(v,d,min,max){ v = parseInt(v,10); if(isNaN(v)) v=d; return Math.max(min,Math.min(max,v)); }

  function clean(it){
    var cat = CATS[it.cat] ? it.cat : 'outro';
    var rar = RAR[it.raridade] ? it.raridade : 'comum';
    var sp = ((it.w==null||it.h==null||!it.icone) && it.nome) ? spec(it.nome) : null;
    var dW = sp ? sp.w : CATS[cat].w, dH = sp ? sp.h : CATS[cat].h;
    var dI = (sp && sp.icone) ? sp.icone : ('lucide:'+CATS[cat].lu);
    return {
      id: it.id || uid(), nome: String(it.nome||'Item sem nome'), cat: cat, raridade: rar,
      desc: String(it.desc||''), efeito: String(it.efeito||''), icone: String(it.icone||dI),
      qtd: num(it.qtd,1,1,999), w: num(it.w,dW,1,MAX_COLS), h: num(it.h,dH,1,MAX_ROWS),
      x: (it.x===null||it.x===undefined) ? null : num(it.x,0,0,MAX_COLS),
      y: (it.y===null||it.y===undefined) ? null : num(it.y,0,0,MAX_ROWS),
      cor: /^#[0-9a-f]{6}$/i.test(it.cor||'') ? String(it.cor).toLowerCase() : '',
      owner: it.owner ? String(it.owner) : '', origem: it.origem || 'manual', preco: num(it.preco,0,0,99999999)
    };
  }

  function load(){
    var d;
    try{ d = JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ d=null; }
    if(!d || typeof d!=='object') d = {};
    var v0 = d.v;
    d.v = 2;
    d.cols = num(d.cols,8,MIN_COLS,MAX_COLS);
    d.rows = num(d.rows,6,MIN_ROWS,MAX_ROWS);
    d.items = Array.isArray(d.items) ? d.items.map(clean) : [];
    d.modelos = Array.isArray(d.modelos) ? d.modelos.map(clean) : [];
    if(v0 && v0 < 2) migrar(d);
    return d;
  }

  /* v1 -> v2: itens que ainda têm o tamanho/ícone PADRÃO da categoria ganham o tamanho/ícone do próprio item.
     Itens que você já redimensionou, girou ou trocou o ícone não são mexidos. */
  function migrar(d){
    var soltos = [];
    d.items.forEach(function(it){
      var sp = spec(it.nome), c = CATS[it.cat];
      if(!sp || !(it.w===c.w && it.h===c.h)) return;
      var w = Math.min(sp.w, MAX_COLS), h = sp.h;
      if(w===it.w && h===it.h && !(sp.icone && it.icone==='lucide:'+c.lu)) return;
      if(it.icone==='lucide:'+c.lu && sp.icone) it.icone = sp.icone;
      it.w = w; it.h = h;
      if(it.x!==null && !fits(d, it.id, it.x, it.y, it.w, it.h)){ it.x = null; it.y = null; soltos.push(it); }
    });
    soltos.forEach(function(it){ place(d, it); });
    save(d);
  }

  function save(d){ try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(e){} }

  /* cabe em (x,y) com tamanho (w,h)? ignora o próprio item */
  function fits(d, id, x, y, w, h){
    if(x<0 || y<0 || x+w>d.cols || y+h>d.rows) return false;
    for(var i=0;i<d.items.length;i++){
      var o = d.items[i];
      if(o.id===id || o.x===null) continue;
      if(x < o.x+o.w && x+w > o.x && y < o.y+o.h && y+h > o.y) return false;
    }
    return true;
  }

  /* acha o primeiro espaço livre; se não houver, cria linhas novas */
  function place(d, it){
    if(it.w > d.cols) it.w = d.cols;
    for(;;){
      for(var y=0; y<=d.rows-it.h; y++){
        for(var x=0; x<=d.cols-it.w; x++){
          if(fits(d, it.id, x, y, it.w, it.h)){ it.x=x; it.y=y; return true; }
        }
      }
      if(d.rows >= MAX_ROWS){ it.x=null; it.y=null; return false; }
      d.rows++;
    }
  }

  /* adiciona item (empilha consumíveis iguais sem dono) */
  function add(d, raw){
    var it = clean(raw);
    if(CATS[it.cat].stack){
      for(var i=0;i<d.items.length;i++){
        var o = d.items[i];
        if(o.cat===it.cat && o.nome===it.nome && o.owner===it.owner){ o.qtd += it.qtd; return o; }
      }
    }
    it.x = null; it.y = null;
    d.items.push(it);
    place(d, it);
    return it;
  }

  /* ---------- integração com a loja ---------- */
  function guessCat(name, sec, tag, melee){
    var n = (name||'').toLowerCase();
    if(/pr[oó]tese/.test(n)) return 'protese';
    switch(sec){
      case 'armas': return melee ? 'corpo' : 'arma';
      case 'cura': return 'cura';
      case 'sanidade':
      case 'sobrecarga': return 'sanidade';
      case 'armadura': return 'armadura';
      case 'hacker': return 'hacker';
      case 'comida': return 'comida';
      case 'proteses': return 'protese';
      case 'implantes': return 'implante';
    }
    if(/espada|faca|bast[aã]o|machado|katana|garra|l[aâ]mina|martelo|foice/.test(n)) return 'corpo';
    if(/smartgun|pistola|smg|fuzil|railgun|shotgun|viper|raptor/.test(n)) return 'arma';
    if(/medspray|kit|stimpack|soro/.test(n)) return 'cura';
    if(/jaqueta|colete|blindagem|carapa/.test(n)) return 'armadura';
    if(/deck|proxy|v[ií]rus|sniffer|ice-breaker|backdoor/.test(n)) return 'hacker';
    if(/neuro|synapse|memory|nexus|overdrive|adrenal|phantom|void|ghost|kinetic|datajack|implante/.test(n)) return 'implante';
    return 'outro';
  }
  function cleanNome(n){ return String(n).replace(/\s*\((Lote vencido|Visor Quebrado)\)\s*$/i,function(m){return m;}); }

  /* chamado pelo checkout da loja: cart = [{name, price, meta}] */
  function addFromLoja(cart){
    var d = load(), n = 0;
    cart.forEach(function(c){
      var m = c.meta || {};
      var cat = guessCat(c.name, m.sec, m.tag, m.melee);
      add(d, {
        nome: cleanNome(c.name), cat: cat, raridade: m.rar || 'comum', desc: m.desc || '',
        efeito: m.efeito || '', qtd: 1, origem: 'loja', preco: c.price
      });
      n++;
    });
    save(d);
    return n;
  }

  /* ---------- compartilhar item por código (copiar / colar) ---------- */
  var SHARE = ['nome','cat','raridade','icone','desc','efeito','w','h','qtd','cor'];
  function encode(items){
    var arr = (Array.isArray(items) ? items : [items]).map(function(it){ var o = {}; SHARE.forEach(function(k){ o[k] = it[k]; }); return o; });
    var bytes = new TextEncoder().encode(JSON.stringify(arr)), bin = '';
    for(var i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
    return 'S7ITEM:' + btoa(bin);
  }
  /* devolve uma lista de itens limpos, ou null se não for um código válido */
  function decode(str){
    var m = /^S7ITEM:([A-Za-z0-9+\/=]+)$/.exec(String(str||'').replace(/\s+/g,''));
    if(!m) return null;
    try{
      var bin = atob(m[1]), a = new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++) a[i] = bin.charCodeAt(i);
      var arr = JSON.parse(new TextDecoder().decode(a));
      if(!Array.isArray(arr)) arr = [arr];
      arr = arr.slice(0,50).filter(function(o){ return o && typeof o==='object'; }).map(function(o){
        var c = clean(o), r = {}; SHARE.forEach(function(k){ r[k] = c[k]; }); r.owner = ''; return r;
      });
      return arr.length ? arr : null;
    }catch(e){ return null; }
  }

  /* operativos da ficha */
  function fichas(){
    var f; try{ f = JSON.parse(localStorage.getItem('s7_fichas')||'[]'); }catch(e){ f=[]; }
    return (Array.isArray(f)?f:[]).map(function(x){ return {id:x.id, nome:x.nome||'SEM NOME'}; });
  }

  window.S7INV = {
    KEY:KEY, CATS:CATS, RAR:RAR, MAX_ROWS:MAX_ROWS, MAX_COLS:MAX_COLS, MIN_ROWS:MIN_ROWS, MIN_COLS:MIN_COLS,
    cor:cor, isLu:isLu, iconHTML:iconHTML, catIcon:catIcon, lucideRefresh:lucideRefresh, load:load, save:save, fits:fits, place:place, add:add, clean:clean, uid:uid,
    guessCat:guessCat, spec:spec, SPECS:SPECS, addFromLoja:addFromLoja, fichas:fichas, encode:encode, decode:decode
  };
})();