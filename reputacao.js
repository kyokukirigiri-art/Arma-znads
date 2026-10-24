/* ============================================================
   reputacao.js — REPUTAÇÃO + PROCURADO (SETOR 7)
   Carregado pelo tema.js (depois do diario.js). Dados em 's7_rep'.
   - Reputação por facção: -100..+100 (S7REP.rep('az', +10))
   - Procurado: 0..100 -> 0 a 5 estrelas. Sobe sozinho com SAQUE (+2 por item)
     e COMBATE (+1 a cada 6 linhas do log). Desce pelos botões da página.
   - Preço da loja: S7REP.preco(base) = base × (1 + mod ARMA-ZENADS + 5%/estrela + extras)
     Outros sistemas somam ajustes com S7REP.addMod(function(){ return 0.1; })  (=+10%).
   - Encontros: S7REP.encontro() devolve texto conforme estrelas e inimigos de facção.
   ============================================================ */
(function(){
  var KEY='s7_rep';
  var FAC={az:['ARMA-ZENADS','#ff3355'],nx:['NEXUS','#8b5bff'],ic:['ÍCARO','#22e6d2'],
           mc:['MEGACORP','#ffb300'],cb:['CIDADE BAIXA','#46ff7a'],rc:['CAÇA-RECOMPENSA','#ff5a2e']};
  var STAR_AT=[10,25,45,70,90];
  var STAR_N=['LIMPO','SUSPEITO','OBSERVADO','PROCURADO','CAÇADO','ALVO PRIORITÁRIO'];
  var mods=[];
  function load(){
    var d; try{ d=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ d=null; }
    if(!d||typeof d!=='object') d={};
    if(!d.fac||typeof d.fac!=='object') d.fac={};
    Object.keys(FAC).forEach(function(k){ d.fac[k]=Math.max(-100,Math.min(100,+d.fac[k]||0)); });
    d.heat=Math.max(0,Math.min(100,+d.heat||0)); d.c=+d.c||0;
    d.hist=Array.isArray(d.hist)?d.hist.filter(function(x){ return x&&isFinite(x.t)&&isFinite(x.h); }).slice(-24):[];
    return d;
  }
  function save(d){ try{ localStorage.setItem(KEY,JSON.stringify(d)); }catch(e){} }
  function tier(v){
    return v<=-60?{n:'INIMIGO',c:'#ff3355',p:25}:v<=-20?{n:'HOSTIL',c:'#ff9a3d',p:10}:
           v<20?{n:'NEUTRO',c:'#8a7a9a',p:0}:v<60?{n:'CONFIÁVEL',c:'#22e6d2',p:-8}:{n:'ALIADO',c:'#46ff7a',p:-15};
  }
  function estrelas(h){ var n=0; STAR_AT.forEach(function(x){ if(h>=x) n++; }); return n; }
  function nota(x){ if(window.S7LOG) S7LOG.add('nota',x); }
  function rep(f,delta){
    if(!FAC[f]) return null;
    var d=load(), a=tier(d.fac[f]).n;
    d.fac[f]=Math.max(-100,Math.min(100,d.fac[f]+(+delta||0))); save(d);
    var b=tier(d.fac[f]).n;
    if(delta) nota('Reputação '+FAC[f][0]+': '+(delta>0?'+':'')+delta+' ('+d.fac[f]+')'+(a!==b?' → '+b:''));
    return d.fac[f];
  }
  function heat(delta,quieto){
    var d=load(), a=estrelas(d.heat);
    d.heat=Math.max(0,Math.min(100,d.heat+(+delta||0)));
    d.hist.push({t:Date.now(),h:d.heat}); d.hist=d.hist.slice(-24); save(d);
    var b=estrelas(d.heat);
    if(b!==a && !quieto) nota('Procurado: '+(b>a?'subiu':'caiu')+' para '+b+'★ ('+STAR_N[b]+')');
    return d.heat;
  }
  function mult(nome){
    var d=load(), m=tier(d.fac.az).p/100+estrelas(d.heat)*0.05;
    mods.forEach(function(f){ try{ m+=+f(nome)||0; }catch(e){} });
    return Math.max(0.5,1+m);
  }
  function preco(base,nome){ var m=mult(nome); return m===1?base:Math.max(10,Math.round(base*m/10)*10); }
  function addMod(fn){ mods.push(fn); }

  var ENC=[
    ['Ninguém liga para você. Rua tranquila, só o barulho da chuva ácida.','Um informante oferece uma dica barata.','Camelô tenta vender algo duvidoso.'],
    ['Um drone de vigilância passa e escaneia o grupo.','Dois guardas perguntam seus nomes. Educados demais.','Alguém parece te seguir pelo beco.'],
    ['Patrulha da corporação pede para revistar a maleta.','Um caçador de recompensas iniciante tenta a sorte.','Seu rosto aparece num painel de procurados, borrado.'],
    ['Esquadrão tático fecha a rua. Teste de Velocidade ND 13 para escapar.','Caçador de recompensas veterano faz uma oferta: entregue-se.','Um ex-contato vendeu a sua localização.'],
    ['Cerco: três equipes cercam o quarteirão. ND 16 para romper.','Drones de combate sobrevoam. A Rede inteira sabe onde você está.','Um velho aliado avisa: só tem uma saída, e ela é perigosa.'],
    ['Caça total: a cidade inteira é hostil. Nenhum NPC ajuda.','O contrato pela sua cabeça subiu. Todo mundo quer cobrar.','Uma unidade de elite foi enviada só para você.']
  ];
  function encontro(){
    var d=load(), n=estrelas(d.heat), L=ENC[n], t=L[Math.floor(Math.random()*L.length)];
    var inim=Object.keys(FAC).filter(function(k){ return d.fac[k]<=-60; });
    if(inim.length && Math.random()<0.35){ var k=inim[Math.floor(Math.random()*inim.length)]; t='Emboscada da '+FAC[k][0]+' (reputação INIMIGO): '+t; }
    nota('Encontro ('+n+'★): '+t);
    return t;
  }

  /* heat automático a partir do diário */
  function ligaDiario(){
    if(!window.S7LOG||S7LOG.__rep) return; S7LOG.__rep=1;
    var orig=S7LOG.add;
    S7LOG.add=function(k){
      orig.apply(this,arguments);
      if(k==='saque') heat(2);
      else if(k==='combate'){ var d=load(); d.c++; if(d.c>=6){ d.c=0; save(d); heat(1); } else save(d); }
    };
  }
  ligaDiario();

  /* loja: reescreve os preços dos cards e mostra o selo */
  function lojaUI(){
    if(!/loja\.html$/i.test(location.pathname)&&!/\/loja$/i.test(location.pathname)) return;
    var m=mult(), d=load(), st=estrelas(d.heat);
    Array.prototype.forEach.call(document.querySelectorAll('.card .price'),function(pr){
      var btn=pr.parentNode.querySelector('button.btn'), mm=btn&&/addToCart\('((?:[^'\\]|\\.)*)',(\d+)/.exec(btn.getAttribute('onclick')||'');
      if(!mm) return;
      var base=+mm[2], nm=mm[1].replace(/\\'/g,"'"), nv=preco(base,nm), n=pr.firstChild;
      if(nv!==base&&n&&n.nodeType===3&&/\d/.test(n.nodeValue)){
        n.nodeValue=n.nodeValue.replace(/[\d.]+/,nv.toLocaleString('pt-BR'));
        var s=document.createElement('small'); s.textContent=' (tabela '+base.toLocaleString('pt-BR')+')'; s.style.opacity='.6'; pr.appendChild(s);
      }
    });
    var c=document.createElement('a'); c.href='reputacao.html';
    var pc=Math.round((m-1)*100);
    c.textContent='💱 PREÇOS '+(pc>0?'+':'')+pc+'% · '+(st?'★'.repeat(st)+' ':'')+tier(d.fac.az).n+' (AZ)';
    c.style.cssText='position:fixed;left:10px;bottom:10px;z-index:500;background:var(--panel2,#150f1d);border:1px solid var(--line,#2d1040);color:'+(pc>0?'#ff9a3d':pc<0?'#46ff7a':'var(--dim,#9a8aaa)')+';padding:6px 12px;font-size:.66rem;letter-spacing:.12em;text-decoration:none;';
    document.body.appendChild(c);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',lojaUI); else lojaUI();

  window.S7REP={KEY:KEY,FAC:FAC,STAR_N:STAR_N,STAR_AT:STAR_AT,load:load,save:save,tier:tier,estrelas:estrelas,rep:rep,heat:heat,mult:mult,preco:preco,addMod:addMod,encontro:encontro,nota:nota};
})();