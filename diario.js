/* ============================================================
   diario.js — DIÁRIO DA SESSÃO (SETOR 7)
   Carregado pelo tema.js em todas as páginas. Grava eventos em 's7_diario'.
   Uso:  S7LOG.add('loja','Comprou X')   tipos: loja venda saque combate missao nota
         S7LOG.hook(bt.log,'combate')    -> tudo que entrar nesse array vira evento
   Sessão nova: automática após 6h sem eventos, ou pelo botão em diario.html.
   ============================================================ */
(function(){
  var KEY='s7_diario', MAX=1500, GAP=6*3600*1000;
  var TIPOS={loja:['🛒','LOJA','#22e6d2'],venda:['🎲','VENDA','#ffb300'],saque:['☠️','SAQUE','#46ff7a'],
             combate:['⚔️','COMBATE','#ff3355'],missao:['🎯','MISSÃO','#8b5bff'],nota:['📝','NOTA','#e8f500']};
  function load(){
    var d; try{ d=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ d=null; }
    if(!d||typeof d!=='object') d={};
    if(!Array.isArray(d.sessoes)) d.sessoes=[];
    if(!Array.isArray(d.ev)) d.ev=[];
    return d;
  }
  function save(d){ try{ localStorage.setItem(KEY,JSON.stringify(d)); return true; }catch(e){ return false; } }
  function nova(d,nome,t){
    var n=d.sessoes.length?d.sessoes[d.sessoes.length-1].n+1:1;
    var s={id:'s'+t.toString(36),n:n,ini:t,nome:nome||''}; d.sessoes.push(s); return s;
  }
  function add(k,x){
    x=String(x==null?'':x).replace(/\s+/g,' ').trim(); if(!x) return;
    var d=load(), t=Date.now(), last=d.ev[d.ev.length-1], s=d.sessoes[d.sessoes.length-1];
    if(!s||(last&&t-last.t>GAP)) s=nova(d,'',t);
    d.ev.push({t:t,s:s.id,k:TIPOS[k]?k:'nota',x:x});
    if(d.ev.length>MAX) d.ev=d.ev.slice(-MAX);
    if(!save(d)){ d.ev=d.ev.slice(-Math.floor(MAX/3)); save(d); }
  }
  /* faz um array (ex.: bt.log) registrar tudo que receber via unshift/push */
  function hook(arr,k){
    if(!Array.isArray(arr)||arr.__s7) return arr;
    ['unshift','push'].forEach(function(m){
      var orig=arr[m];
      Object.defineProperty(arr,m,{enumerable:false,configurable:true,value:function(){
        for(var i=0;i<arguments.length;i++) window.S7LOG.add(k,arguments[i]);
        return orig.apply(this,arguments);
      }});
    });
    Object.defineProperty(arr,'__s7',{value:1}); return arr;
  }
  function novaSessao(nome){ var d=load(); nova(d,nome,Date.now()); save(d); }
  function renomear(id,nome){ var d=load(); d.sessoes.forEach(function(s){ if(s.id===id) s.nome=nome; }); save(d); }
  function limpar(){ try{ localStorage.removeItem(KEY); }catch(e){} }
  window.S7LOG={KEY:KEY,TIPOS:TIPOS,load:load,add:add,hook:hook,novaSessao:novaSessao,renomear:renomear,limpar:limpar};
})();
