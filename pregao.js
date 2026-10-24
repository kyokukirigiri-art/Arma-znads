/* ============================================================
   pregao.js — PREGÃO DINÂMICO (SETOR 7)
   Eventos de mercado que mexem nos preços por categoria, na LOJA (compra)
   e na VENDA (quanto o mercador paga). Dados em 's7_pregao' = {ativos:[ids]}.
   Para criar um evento novo, é só incluir uma linha em EVENTOS.
   m = { categoria: % }  categorias: arma corpo armadura hacker implante
       protese cura sanidade comida outro   e  '*' = tudo.
   ============================================================ */
(function(){
  var KEY='s7_pregao', MAXA=3;
  var CATN={arma:'ARMAS',corpo:'CORPO A CORPO',armadura:'ARMADURAS',hacker:'HACKER',implante:'IMPLANTES',
            protese:'PRÓTESES',cura:'CURA',sanidade:'SANIDADE',comida:'COMIDA',outro:'OUTROS','*':'TUDO'};
  var EVENTOS=[
    {id:'blecaute',i:'🔌',n:'BLECAUTE',d:'A rede caiu no distrito. Tudo que liga na tomada some das prateleiras.',m:{hacker:30,implante:15,protese:10}},
    {id:'guerra',i:'💥',n:'GUERRA DE GANGUES',d:'Tiroteio nas ruas. Armas, armaduras e curativos viram ouro.',m:{arma:30,corpo:20,armadura:25,cura:30}},
    {id:'surto',i:'🦠',n:'SURTO NO SETOR',d:'Quarentena nos blocos. Remédio e comida em falta.',m:{cura:40,comida:30,sanidade:20}},
    {id:'blitz',i:'🚓',n:'BLITZ CORPORATIVA',d:'Revistas em todo canto. Contrabando de tecnologia fica caro e arriscado.',m:{hacker:25,implante:20,arma:15}},
    {id:'festival',i:'🎆',n:'FESTIVAL DA NEON',d:'A cidade em festa. Comércio aquecido e promoção em tudo que é vício.',m:{comida:-20,outro:-15,sanidade:-10}},
    {id:'queima',i:'📉',n:'QUEIMA DE ESTOQUE',d:'Uma corporação faliu e despejou o depósito no mercado.',m:{implante:-25,protese:-20,armadura:-15}},
    {id:'greve',i:'🪧',n:'GREVE DOS ENTREGADORES',d:'Nada chega. Tudo sobe um pouco.',m:{'*':10}},
    {id:'chuva',i:'☣️',n:'CHUVA ÁCIDA',d:'Ninguém sai de casa. Comida e blindagem valorizam; o resto encalha.',m:{comida:15,armadura:15,outro:-10}}
  ];
  var SEC={armas:'arma',proteses:'protese',implantes:'implante',comida:'comida',cura:'cura',sanidade:'sanidade',armadura:'armadura',hacker:'hacker',outros:'outro'};

  function load(){ var d; try{ d=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ d=null; }
    if(!d||!Array.isArray(d.ativos)) d={ativos:[]};
    d.ativos=d.ativos.filter(function(id){ return EVENTOS.some(function(e){ return e.id===id; }); }); return d; }
  function save(d){ try{ localStorage.setItem(KEY,JSON.stringify(d)); }catch(e){} }
  function ev(id){ return EVENTOS.filter(function(e){ return e.id===id; })[0]; }
  function nota(x){ if(window.S7LOG) S7LOG.add('nota',x); }
  function ativos(){ return load().ativos.map(ev); }

  function mod(cat){
    var m=0; ativos().forEach(function(e){ m+=(e.m[cat]||0)+(e.m['*']||0); });
    return Math.max(-50,Math.min(100,m))/100;
  }
  function catOf(nome){
    var n=String(nome||'').trim().toLowerCase(), c=(window.S7CATALOGO||[]).filter(function(x){ return x.nome.toLowerCase()===n; })[0];
    if(!c) return '';
    if(window.S7INV&&S7INV.guessCat){ try{ return S7INV.guessCat(c.nome,c.sec,c.tag,c.melee); }catch(e){} }
    return SEC[c.sec]||'outro';
  }
  function modItem(cat,nome){ return mod(cat||catOf(nome)); }

  function liga(id,on){
    var d=load(), tem=d.ativos.indexOf(id)>=0, e=ev(id); if(!e) return;
    if(on===undefined) on=!tem;
    if(on&&!tem){ d.ativos.push(id); if(d.ativos.length>MAXA){ var out=d.ativos.shift(); nota('Pregão: '+ev(out).n+' encerrou'); } nota('Pregão: '+e.n+' começou'); }
    if(!on&&tem){ d.ativos=d.ativos.filter(function(x){ return x!==id; }); nota('Pregão: '+e.n+' encerrou'); }
    save(d);
  }
  function sortear(){
    var d=load(), livres=EVENTOS.filter(function(e){ return d.ativos.indexOf(e.id)<0; });
    if(!livres.length) return null;
    var e=livres[Math.floor(Math.random()*livres.length)]; liga(e.id,true); return e;
  }
  function limpar(){ load().ativos.slice().forEach(function(id){ liga(id,false); }); }

  /* integra com a reputação: o ajuste por categoria entra no preço da loja */
  function integra(){
    if(window.S7REP) S7REP.addMod(function(nome){ return nome ? modItem('',nome) : 0; });
  }
  integra();

  /* selo com os eventos ativos na LOJA e na VENDA */
  function selo(){
    if(!/(loja|venda)(\.html)?$/i.test(location.pathname)) return;
    var a=ativos(); if(!a.length) return;
    var c=document.createElement('a'); c.href='pregao.html';
    c.textContent='📢 PREGÃO: '+a.map(function(e){ return e.i+' '+e.n; }).join(' · ');
    c.style.cssText='position:fixed;left:10px;bottom:'+(/loja/i.test(location.pathname)?'46':'10')+'px;z-index:500;background:var(--panel2,#150f1d);border:1px solid var(--yellow,#e8f500);color:var(--yellow,#e8f500);padding:6px 12px;font-size:.66rem;letter-spacing:.12em;text-decoration:none;max-width:90vw;';
    document.body.appendChild(c);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',selo); else selo();

  window.S7PREGAO={KEY:KEY,EVENTOS:EVENTOS,CATN:CATN,MAXA:MAXA,load:load,ev:ev,ativos:ativos,mod:mod,modItem:modItem,catOf:catOf,liga:liga,sortear:sortear,limpar:limpar};
})();
