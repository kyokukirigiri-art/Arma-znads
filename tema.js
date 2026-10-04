/* ============================================================
   tema.js — configurações compartilhadas do SETOR 7
   Carregado no <head> de todas as páginas. Lê o localStorage
   ('s7_config') e aplica: paleta global, cor de cada aba,
   efeitos e o touch da batalha.
   ============================================================ */
(function(){
  var KEY = 's7_config';

  /* ---------- abas do site ---------- */
  var TABS = [
    { k:'index',             n:'MAPA / HUB',    href:'index.html',             ico:'🗺️' },
    { k:'arma-zenads',       n:'LOJA',          href:'ARMA-ZENADS.html',       ico:'🛒' },
    { k:'venda',             n:'VENDA',         href:'venda.html',             ico:'🎲' },
    { k:'missoes',           n:'MISSÕES',       href:'missoes.html',           ico:'🎯' },
    { k:'mapa',             n:'MAPA (sub de MISSÕES)', href:'mapa.html',           ico:'🧭' },
    { k:'regras_do_setor_7', n:'REGRAS',        href:'regras_do_setor_7.html', ico:'📜' },
    { k:'base_de_comando',   n:'BASE',          href:'base_de_comando.html',   ico:'🏚️' },
    { k:'ficha',             n:'FICHA (sub da BASE)', href:'ficha.html',       ico:'📋' },
    { k:'batalha',           n:'HACK_AREA',     href:'batalha.html',           ico:'⚔️' },
    { k:'configuracoes',     n:'CONFIG',        href:'configuracoes.html',     ico:'⚙️' }
  ];

  /* ---------- paletas globais ---------- */
  var PRESETS = {
    padrao:{ nome:'NEON ROXO (PADRÃO)', p:'#e8f500', c1:'#22e6d2', c2:'#8b5bff', c3:'#46ff7a', bg:null },
    ciano: { nome:'CIBER CIANO', p:'#22e6d2', c1:'#4dd8ff', c2:'#5b8bff', c3:'#46ff7a',
             bg:{bg:'#04090c',bg2:'#071218',panel:'#071218',panel2:'#0a1a24',line:'#12303d',txt:'#dbe9ee',dim:'#6b8a96'} },
    matrix:{ nome:'MATRIX', p:'#46ff7a', c1:'#9dff6b', c2:'#22e6a0', c3:'#c8ff3d',
             bg:{bg:'#030a05',bg2:'#06120a',panel:'#071510',panel2:'#0b1f14',line:'#12402a',txt:'#d9eadc',dim:'#6f8a78'} },
    sangue:{ nome:'SANGUE', p:'#ff3355', c1:'#ff7a3d', c2:'#ff2ea6', c3:'#ffb300',
             bg:{bg:'#0a0405',bg2:'#12070a',panel:'#180708',panel2:'#240b0d',line:'#40131a',txt:'#eadcdc',dim:'#8a6f73'} },
    solar: { nome:'SOLAR', p:'#ff9d1c', c1:'#ffd23d', c2:'#ff5a2e', c3:'#ffe62a',
             bg:{bg:'#0a0704',bg2:'#120c06',panel:'#170e06',panel2:'#22140a',line:'#402a12',txt:'#ece2d8',dim:'#8a7a6f'} },
    rosa:  { nome:'ROSA NEON', p:'#ff2ea6', c1:'#ff7ad9', c2:'#b05bff', c3:'#22e6d2',
             bg:{bg:'#0a040a',bg2:'#120712',panel:'#180718',panel2:'#240b24',line:'#40133d',txt:'#eadcea',dim:'#8a6f88'} },
    gelo:  { nome:'GELO', p:'#cfe9ff', c1:'#7fd4ff', c2:'#9db4ff', c3:'#b8fff0',
             bg:{bg:'#05080c',bg2:'#0a1018',panel:'#0a1018',panel2:'#101a26',line:'#1e2f44',txt:'#e6eef7',dim:'#7a8899'} },
    vinho: { nome:'VINHO & CINABRE', p:'#f24333', c1:'#f7f4f3', c2:'#d8373a', c3:'#ff8a78',
             bg:{bg:'#12060a',bg2:'#1c0a10',panel:'#230c14',panel2:'#33121d',line:'#5b2333',txt:'#f7f4f3',dim:'#a08a88'} },
    ambar: { nome:'ÂMBAR & VIOLETA', p:'#d4954d', c1:'#e3dea4', c2:'#b07a45', c3:'#f2f5e2',
             bg:{bg:'#0d040d',bg2:'#170818',panel:'#1d0a1d',panel2:'#290024',line:'#4d3522',txt:'#f2f5e2',dim:'#a39572'} },
    acido: { nome:'ÁCIDO TÓXICO', p:'#a7ff04', c1:'#09fa48', c2:'#a93fb4', c3:'#37cc4e',
             bg:{bg:'#030301',bg2:'#070707',panel:'#0b0a0f',panel2:'#150f1d',line:'#2d1040',txt:'#e6f5df',dim:'#6f8a70'} },
    ultravioleta:{ nome:'ULTRAVIOLETA', p:'#bf40fa', c1:'#e3d9fc', c2:'#6a4be0', c3:'#a98bff',
             bg:{bg:'#040607',bg2:'#0b0714',panel:'#110a1d',panel2:'#1b1030',line:'#3b1d55',txt:'#e3d9fc',dim:'#8d7fae'} }
  };

  /* ---------- touch da batalha (padrões = visual original) ---------- */
  var DEFAULT_TOUCH = {
    modo:'auto',            // auto (só celular) | sempre | oculto
    lado:'normal',          // normal (joystick à esquerda) | invertido
    joySize:124, stickSize:52,
    opacidade:100,          // %
    btnSize:56, btnForma:'circulo',   // circulo | arredondado | quadrado
    offsetY:12, offsetX:16,
    deadzone:8,             // %
    sens:100,               // % (ganho do joystick)
    haptico:true,
    corBase:'#8b5bff', corStick:'#22e6d2', corConfirmar:'#ffe62a', corCancelar:'#ff5a5a', corAlma:'#ffe62a',
    simConfirmar:'◆', simCancelar:'✕'
  };

  var DEFAULT_CFG = { v:1, preset:'padrao', tabs:{}, efeitos:true, touch:null };

  /* ---------- utilidades ---------- */
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function isHex(s){ return typeof s==='string' && /^#[0-9a-f]{6}$/i.test(s); }
  function rgb(h){ h=h.replace('#',''); return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }
  function rgba(h,a){ var c=rgb(h); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }
  function shade(h,f){ var c=rgb(h).map(function(v){ return Math.max(0,Math.min(255,Math.round(v*f))); });
    return '#'+c.map(function(v){ return ('0'+v.toString(16)).slice(-2); }).join(''); }
  function mix(a,b,f){ var x=rgb(a),y=rgb(b); return '#'+x.map(function(v,i){ return ('0'+Math.round(v*(1-f)+y[i]*f).toString(16)).slice(-2); }).join(''); }
  function rgbs(h){ return rgb(h).join(','); }
  function darkText(h){ var c=rgb(h); return (c[0]*0.299+c[1]*0.587+c[2]*0.114)>140 ? '#060308' : '#ffffff'; }

  function load(){
    var cfg;
    try{ cfg = JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ cfg=null; }
    if(!cfg || typeof cfg!=='object') cfg = clone(DEFAULT_CFG);
    if(!PRESETS[cfg.preset]) cfg.preset='padrao';
    if(!cfg.tabs || typeof cfg.tabs!=='object') cfg.tabs={};
    if(cfg.efeitos===undefined) cfg.efeitos=true;
    cfg.touch = mergeTouch(cfg.touch);
    return cfg;
  }
  function mergeTouch(t){
    var out = clone(DEFAULT_TOUCH);
    if(t && typeof t==='object'){ Object.keys(out).forEach(function(k){ if(t[k]!==undefined && t[k]!==null) out[k]=t[k]; }); }
    ['corBase','corStick','corConfirmar','corCancelar','corAlma'].forEach(function(k){ if(!isHex(out[k])) out[k]=DEFAULT_TOUCH[k]; });
    return out;
  }
  function save(cfg){ try{ localStorage.setItem(KEY, JSON.stringify(cfg)); }catch(e){} }
  function pageKey(){
    var p = (location.pathname.split('/').pop()||'index.html').toLowerCase().replace(/\.html?$/,'');
    return p || 'index';
  }

  /* ---------- CSS do touch ---------- */
  function touchCSS(t){
    var S=+t.joySize, K=+t.stickSize, B=+t.btnSize, Y=+t.offsetY, X=+t.offsetX, O=(+t.opacidade)/100;
    var radius = t.btnForma==='quadrado' ? '4px' : t.btnForma==='arredondado' ? '16px' : '50%';
    var H = Math.max(S,B) + Y + 34;
    var css = '';
    css += '.touch-pad{bottom:'+Y+'px !important;padding:0 '+X+'px !important;opacity:'+O+';'+(t.lado==='invertido'?'flex-direction:row-reverse;':'')+'}';
    css += '.joy-base{width:'+S+'px !important;height:'+S+'px !important;border-color:'+t.corBase+' !important;'+
           'background:'+rgba(t.corBase,.12)+' !important;box-shadow:0 0 14px '+rgba(t.corBase,.3)+', inset 0 0 18px '+rgba(t.corBase,.14)+' !important;}';
    css += '.joy-base::after{border-color:'+rgba(t.corBase,.45)+' !important;inset:'+Math.round(S*0.16)+'px !important;}';
    css += '.joy-stick{width:'+K+'px !important;height:'+K+'px !important;margin:'+(-K/2)+'px 0 0 '+(-K/2)+'px !important;'+
           'border-color:'+t.corStick+' !important;background:'+rgba(t.corStick,.3)+' !important;box-shadow:0 0 16px '+rgba(t.corStick,.5)+' !important;}';
    css += '.tp-acts .tp-btn{width:'+B+'px !important;height:'+B+'px !important;border-radius:'+radius+' !important;font-size:'+(B*0.02).toFixed(2)+'rem !important;}';
    css += '.tp-act{color:'+t.corConfirmar+' !important;border-color:'+t.corConfirmar+' !important;}';
    css += '.tp-act.held{background:'+rgba(t.corConfirmar,.3)+' !important;box-shadow:0 0 16px '+rgba(t.corConfirmar,.55)+' !important;color:#0b0b0b !important;}';
    css += '.tp-cancel{color:'+t.corCancelar+' !important;border-color:'+t.corCancelar+' !important;}';
    css += '.tp-cancel.held{background:'+rgba(t.corCancelar,.3)+' !important;box-shadow:0 0 16px '+rgba(t.corCancelar,.55)+' !important;color:#0b0b0b !important;}';
    if(t.modo==='sempre'){
      css += '.touch-pad{display:flex !important;}.arena-frame{padding-bottom:'+H+'px !important;}';
    } else if(t.modo==='oculto'){
      css += '.touch-pad{display:none !important;}.arena-frame{padding-bottom:18px !important;}';
    } else {
      css += '@media (pointer:coarse){.arena-frame{padding-bottom:'+H+'px !important;}}';
    }
    return css;
  }

  /* ---------- aplicar tudo ---------- */
  function apply(cfg){
    cfg = cfg || load();
    var root = document.documentElement;
    var pk = pageKey();
    var pre = PRESETS[cfg.preset] || PRESETS.padrao;

    /* limpa o que a aplicação anterior definiu */
    (root.__s7vars||[]).forEach(function(v){ root.style.removeProperty(v); });
    var set=[], vars={};
    function V(name,val){ vars[name]=val; }

    if(cfg.preset!=='padrao'){
      var P=pre.p;
      V('--red',P); V('--yellow',P); V('--wire',P);
      V('--red-soft',shade(P,.7)); V('--red-dim',shade(P,.3));
      V('--wire-dim',rgba(P,.28)); V('--wire-glow',rgba(P,.16)); V('--yellow-glow',rgba(P,.45));
      V('--cyan',pre.c1); V('--cyan-glow',rgba(pre.c1,.45)); V('--cyan-dim',rgba(pre.c1,.3));
      V('--purple',pre.c2); V('--purple-glow',rgba(pre.c2,.45)); V('--purple-dim',rgba(pre.c2,.3));
      V('--green',pre.c3);
      V('--p-rgb',rgbs(P)); V('--wire-rgb',rgbs(P)); V('--glow-rgb',rgbs(pre.c2));
      /* cores das categorias da loja acompanham a paleta */
      V('--k-armas',P); V('--k-cura',pre.c1); V('--k-sanidade',pre.c2); V('--k-armadura',mix(pre.c1,pre.c2,.5));
      V('--k-hacker',pre.c3); V('--k-implantes',mix(P,pre.c2,.5)); V('--k-comida',mix(P,pre.c3,.5));
      if(pre.bg){ Object.keys(pre.bg).forEach(function(k){ V('--'+k, pre.bg[k]); }); }
    }
    /* cor própria da aba atual */
    var mine = cfg.tabs[pk];
    if(isHex(mine)){
      V('--red',mine); V('--yellow',mine); V('--wire',mine);
      V('--red-soft',shade(mine,.7)); V('--red-dim',shade(mine,.3));
      V('--wire-dim',rgba(mine,.28)); V('--wire-glow',rgba(mine,.16)); V('--yellow-glow',rgba(mine,.45));
      V('--p-rgb',rgbs(mine)); V('--wire-rgb',rgbs(mine));
    }
    Object.keys(vars).forEach(function(k){ root.style.setProperty(k, vars[k]); set.push(k); });
    root.__s7vars = set;

    /* CSS dinâmico: cor dos botões das abas + efeitos + touch */
    var css = '';
    TABS.forEach(function(t){
      var c = cfg.tabs[t.k];
      if(!isHex(c)) return;
      var sel = '.navbar a[href^="'+t.href+'" i]:not([href*="#"])';
      css += sel+'{color:'+c+' !important;border-color:'+rgba(c,.55)+' !important;}';
      css += sel+':hover{background:'+c+' !important;color:'+darkText(c)+' !important;}';
    });
    if(cfg.efeitos===false) css += 'body::before,body::after{display:none !important;}';
    css += touchCSS(cfg.touch);
    var st = document.getElementById('s7-dyn');
    if(!st){ st = document.createElement('style'); st.id='s7-dyn'; (document.head||root).appendChild(st); }
    st.textContent = css;
  }

  window.S7 = {
    KEY:KEY, TABS:TABS, PRESETS:PRESETS, DEFAULT_TOUCH:DEFAULT_TOUCH, DEFAULT_CFG:DEFAULT_CFG,
    load:load, save:save, apply:apply, pageKey:pageKey, isHex:isHex, mergeTouch:mergeTouch,
    getTouch:function(){ return load().touch; }
  };

  apply(load());
})();
/* ---------- emojis personalizados (emojis.js + pasta emojis/) ---------- */
document.write('<script src="emojis.js"><\/script>');
