/* ============================================================
   emojis.js — EMOJIS PERSONALIZADOS (SETOR 7)
   Carregado automaticamente pelo tema.js (todas as páginas).
   Escreva :nome: em qualquer texto e ele vira a imagem  emojis/nome.png
   (tenta .png, .svg, .webp, .gif, .jpg). Nomes: letras minúsculas,
   números, - e _  (ex.: :caveira-neon:). Se a imagem não existir,
   o texto :nome: continua aparecendo normalmente.
   ============================================================ */
(function(){
  var DIR = 'emojis/', EXT = ['png','svg','webp','gif','jpg','jpeg'];
  var RE = /:([a-z][a-z0-9_-]{0,31}):/gi, ONE = /^:([a-z][a-z0-9_-]{0,31}):$/i;
  var cache = {};   /* nome -> {url, im, fail, q} */

  function look(name, ok, bad){
    var k = name.toLowerCase(), c = cache[k];
    if(c){
      if(c.url) return ok(c.url);
      if(c.fail) return bad();
      c.q.push([ok,bad]); return;
    }
    c = cache[k] = {url:null, im:null, fail:false, q:[[ok,bad]]};
    var i = 0;
    function done(good){
      var q = c.q; c.q = []; if(!good) c.fail = true;
      q.forEach(function(f){ good ? f[0](c.url) : f[1](); });
      if(good) try{ document.dispatchEvent(new Event('s7emoji')); }catch(e){}
    }
    (function next(){
      if(i >= EXT.length) return done(false);
      var im = new Image(), u = DIR + k + '.' + EXT[i++];
      im.onload = function(){ c.url = u; c.im = im; done(true); };
      im.onerror = next;
      im.src = u;
    })();
  }

  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function tag(name, url){ return '<img class="emo" alt=":'+esc(name)+':" title=":'+esc(name)+':" draggable="false" src="'+esc(url)+'">'; }

  /* troca :nome: por <img> dentro de um texto HTML já escapado (para quem monta innerHTML) */
  function html(str){ return String(str).replace(RE, function(m, n){ var c = cache[n.toLowerCase()]; return (c && c.url) ? tag(n, c.url) : m; }); }

  var SKIP = {SCRIPT:1, STYLE:1, TEXTAREA:1, INPUT:1, SELECT:1, OPTION:1, NOSCRIPT:1, TITLE:1, CODE:0};
  function skipNode(n){
    for(var p = n.parentNode; p && p.nodeType===1; p = p.parentNode){
      if(SKIP[p.tagName] || p.isContentEditable || (p.classList && (p.classList.contains('emo-t') || p.hasAttribute('data-noemo')))) return true;
    }
    return false;
  }
  function scan(root){
    root = root || document.body; if(!root) return;
    if(root.nodeType===3){ one(root); return; }
    if(root.nodeType!==1) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false), list = [], n;
    while((n = w.nextNode())) if(n.nodeValue.indexOf(':')>=0) list.push(n);
    list.forEach(one);
  }
  function one(t){
    if(!t.parentNode || !t.nodeValue || t.nodeValue.indexOf(':')<0 || skipNode(t)) return;
    RE.lastIndex = 0; if(!RE.test(t.nodeValue)) return; RE.lastIndex = 0;
    var txt = t.nodeValue, frag = document.createDocumentFragment(), last = 0, m;
    while((m = RE.exec(txt))){
      if(m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
      var sp = document.createElement('span'); sp.className = 'emo-t'; sp.textContent = m[0];
      (function(sp, name){ look(name, function(u){ sp.innerHTML = tag(name, u); }, function(){}); })(sp, m[1]);
      frag.appendChild(sp); last = m.index + m[0].length;
    }
    if(last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
    t.parentNode.replaceChild(frag, t);
  }

  /* para canvas: devolve a Image já carregada (ou null e começa a carregar; avisa pelo evento 's7emoji') */
  function canvasImg(str){
    var m = ONE.exec(String(str||'').trim()); if(!m) return null;
    var c = cache[m[1].toLowerCase()];
    if(c && c.im) return c.im;
    if(!c) look(m[1], function(){}, function(){});
    return null;
  }

  var st = document.createElement('style');
  st.textContent = '.emo{height:1.25em;width:1.25em;object-fit:contain;vertical-align:-.28em;display:inline-block;}.emo-t{display:inline;}';
  (document.head || document.documentElement).appendChild(st);

  window.S7EMO = { DIR:DIR, EXT:EXT, is:function(s){ return ONE.test(String(s||'').trim()); }, scan:scan, html:html, canvasImg:canvasImg, look:look };

  function start(){
    scan(document.body);
    var pend = [], raf = 0;
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if(m.type==='characterData') pend.push(m.target);
        else m.addedNodes.forEach(function(n){ pend.push(n); });
      });
      if(!raf) raf = requestAnimationFrame(function(){ raf = 0; var l = pend; pend = []; l.forEach(function(n){ if(n.parentNode) scan(n); }); });
    }).observe(document.body, {childList:true, subtree:true, characterData:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
