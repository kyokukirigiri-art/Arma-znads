/* ============================================================
   mesa.js — MESA ONLINE do MAPA (SETOR 7)
   O mestre cria uma mesa (código de 5 letras) e os jogadores
   entram pelo código. Conexão direta navegador↔navegador
   (WebRTC via PeerJS), sem servidor próprio.

   - O MESTRE é a "verdade": guarda o mapa, valida e transmite.
   - O JOGADOR recebe uma cópia filtrada (sem notas do mestre e
     sem salas ainda cobertas pela névoa) e só move o PRÓPRIO token.
   - O mapa do jogador (localStorage) NUNCA é alterado.

   Depende de: mapa.html (S, draw, ensureEn, snapAll, tkFace, PFR…)
   Hooks no mapa: sv(), clk(), moveTk(), arrasto 3D, renF().
   ============================================================ */
(function(){
'use strict';
var PREFIX = 's7mesa-', AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
var CDN = [
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js'
];
var COLORS = ['#22e6d2','#ff2ea6','#ffe62a','#46ff7a','#8b5bff','#ff9d1c','#4dd8ff','#ff5a5a'];

var NET = window.NET = {
  role:'off',        /* off | host | client */
  code:'', peer:null, conn:null, conns:{}, myId:'', myTok:null,
  free:false,        /* host: jogadores podem revelar salas ao entrar */
  msg:'', formOpen:false, last:'', queued:null, joined:false, leaving:false, tries:0, prefill:''
};
try{ NET.free = localStorage.getItem('s7_mesa_free')==='1'; }catch(e){}

function $(id){ return document.getElementById(id); }
function rnd(n){ var s=''; for(var i=0;i<n;i++) s+=AL.charAt(Math.floor(Math.random()*AL.length)); return s; }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function myKey(){ var k=lsGet('s7_mesa_key'); if(!k){ k=rnd(10).toLowerCase(); lsSet('s7_mesa_key',k); } return k; }
function isHex(s){ return typeof s==='string' && /^#[0-9a-f]{6}$/i.test(s); }

NET.toast = function(m){
  var t=$('nToast'); if(!t){ t=document.createElement('div'); t.id='nToast'; document.body.appendChild(t); }
  t.textContent=m; t.style.display='block'; clearTimeout(t._t); t._t=setTimeout(function(){ t.style.display='none'; },3400);
};
function say(m){ NET.msg=m||''; ui(); }

function errTxt(e){
  var t = (e && e.type) || String(e);
  return ({
    'peer-unavailable':'Mesa não encontrada. Confira o código (e se o mestre está com a mesa aberta).',
    'network':'Sem conexão com o servidor de encontro. Verifique sua internet.',
    'server-error':'O servidor de encontro não respondeu. Tente de novo em instantes.',
    'socket-error':'O servidor de encontro caiu. Tente de novo em instantes.',
    'socket-closed':'O servidor de encontro caiu. Tente de novo em instantes.',
    'browser-incompatible':'Este navegador não suporta conexão direta (WebRTC).',
    'cdn':'Não consegui carregar a biblioteca de conexão (PeerJS). Verifique a internet ou bloqueadores de anúncio.',
    'webrtc':'Falha na conexão direta. A rede de um dos dois pode estar bloqueando — tente outra rede (Wi‑Fi em vez de 4G, ou o contrário).',
    'timeout':'Demorou demais para conectar. A rede de um dos dois pode estar bloqueando a conexão direta.'
  })[t] || ('Erro de conexão: '+t);
}

function loadPeer(ok, bad){
  if(window.Peer) return ok();
  var i=0;
  (function next(){
    if(i>=CDN.length) return bad();
    var s=document.createElement('script'); s.src=CDN[i++];
    s.onload=function(){ window.Peer ? ok() : next(); };
    s.onerror=function(){ s.remove(); next(); };
    document.head.appendChild(s);
  })();
}

/* roda fn "dentro" de um andar/sala, restaurando a visão do mestre depois */
function withView(f,k,fn){
  var of=S.f, or=S.rooms, os=S.sel;
  S.f=f; S.rooms=S.fls[f].rooms; S.sel=k;
  try{ fn(); } finally { S.f=of; S.rooms=or; S.sel=os; }
}

/* ====================== MESTRE ====================== */
function startAt(){
  for(var i=0;i<S.fls.length;i++){
    var R=S.fls[i].rooms, k=Object.keys(R).filter(function(q){ return R[q].t=='start'; })[0];
    if(k) return {f:i,k:k};
  }
  return {f:S.f,k:null};
}

/* cópia do mapa que os jogadores podem ver */
function view(){
  if(S.fls && S.fls[S.f]) S.fls[S.f].rooms = S.rooms;
  var out={cols:S.cols,rows:S.rows,title:S.title||'',alert:S.alert||0,fog:!!S.fog,fls:[],tokens:[]};
  S.fls.forEach(function(F,fi){
    var rooms={};
    Object.keys(F.rooms).forEach(function(k){
      var r=F.rooms[k];
      if(S.fog && !r.rv){
        /* sala coberta pela névoa: só o formato (para a grade) — nada do conteúdo */
        rooms[k]={t:'normal',n:'',e:0,tr:'',lo:'',cl:false,rv:false,ab:false,w:r.w||1,h:r.h||1,nt:'',dr:r.dr||{}};
        return;
      }
      withView(fi,k,function(){ try{ ensureEn(r); }catch(e){} });  /* fixa posições p/ todos verem igual */
      var c=JSON.parse(JSON.stringify(r)); c.nt='';               /* notas do mestre ficam só com o mestre */
      rooms[k]=c;
    });
    out.fls.push({n:F.n,rooms:rooms});
  });
  out.tokens=S.tokens.map(function(t){
    return {id:t.id,n:t.n,i:t.i||t.ico,ico:t.ico||t.i,k:'player',a:t.a||'',s:t.s||100,c:t.c,
            at:t.at,f:t.f||0,x:t.x,z:t.z,fid:t.fid||'',pid:t.pid||''};
  });
  return out;
}

function sendFaces(c){
  S.tokens.forEach(function(t){
    if(!t.fid) return;
    var p=tkPF(t); if(!p||!p.th) return;
    if(c.sent[t.fid]!==p.th){ c.sent[t.fid]=p.th; c.conn.send({t:'face',fid:t.fid,n:p.n,th:p.th}); }
  });
}
function flush(force){
  if(NET.role!=='host') return;
  var j=JSON.stringify(view()), ch=(j!==NET.last);
  NET.last=j;
  Object.keys(NET.conns).forEach(function(pid){
    var c=NET.conns[pid]; if(!c.on) return;
    try{ sendFaces(c); if(ch||force) c.conn.send({t:'state',j:j}); }catch(e){}
  });
}
var bt=null;
NET.bc=function(force){
  if(NET.role!=='host') return;
  clearTimeout(bt);
  bt=setTimeout(function(){ bt=null; flush(force); }, force?0:60);
};

function setFace(fid,n,th){
  var p={n:n,th:th,im:null}; PFR[fid]=p;
  if(th){ var im=new Image(); im.onload=function(){ p.im=im; try{ r3(); }catch(e){} }; im.src=th; }
}

function mineTok(conn,id){
  return S.tokens.filter(function(t){ return t.id==id && t.pid===conn.peer; })[0];
}

function hostMsg(conn,m){
  if(!m || typeof m!=='object') return;
  var c=NET.conns[conn.peer];
  if(m.t==='hello'){
    var pid=conn.peer, nome=String(m.n||'Jogador').slice(0,30);
    var th=(typeof m.th==='string' && m.th.indexOf('data:image/')===0 && m.th.length<90000) ? m.th : '';
    var tk=S.tokens.filter(function(t){ return t.pid===pid; })[0];
    if(!tk){
      var st=startAt();
      tk={id:Date.now()+Math.floor(Math.random()*900), n:nome, ico:'👤', i:'👤', k:'player', a:'', s:100, x:null, z:null,
          c:isHex(m.c)?m.c:COLORS[S.tokens.length%COLORS.length], at:st.k, f:st.f, pid:pid, fid:''};
      S.tokens.push(tk);
    } else { tk.n=nome; }
    if(th){ tk.fid='r_'+pid.slice(-8); setFace(tk.fid,nome,th); }
    else if(/^r_/.test(tk.fid||'')){ delete PFR[tk.fid]; tk.fid=''; }
    if(tk.at && S.fls[tk.f] && S.fls[tk.f].rooms[tk.at]){
      withView(tk.f,tk.at,function(){ ensureEn(S.fls[tk.f].rooms[tk.at]); });
    }
    c.n=nome; c.on=true;
    sv(); try{ drawKeep(); }catch(e){}
    conn.send({t:'welcome',me:tk.id,code:NET.code});
    sendFaces(c);
    conn.send({t:'state',j:JSON.stringify(view())});
    ui();
    return;
  }
  var tk2=mineTok(conn,m.id);
  if(m.t==='move'){
    if(!tk2) return conn.send({t:'deny',m:'Seu token não existe mais na mesa.'});
    var f=parseInt(m.f,10), k=String(m.k||'');
    var R=S.fls[f] && S.fls[f].rooms, r=R && R[k];
    if(!r) return;
    if(S.fog && !r.rv && !NET.free) return conn.send({t:'deny',m:'Essa sala ainda não foi revelada — peça ao mestre.'});
    tk2.at=k; tk2.f=f; tk2.x=null; tk2.z=null; r.rv=true;
    withView(f,k,function(){ ensureEn(r); });
    sv(); try{ drawKeep(); }catch(e){}
    return;
  }
  if(m.t==='pos'){
    if(!tk2) return;
    var f2=parseInt(m.f,10), k2=String(m.k||''), x=+m.x, z=+m.z;
    if(f2!==(tk2.f||0) || k2!==tk2.at || !isFinite(x) || !isFinite(z)) return;
    var r2=S.fls[f2] && S.fls[f2].rooms[k2]; if(!r2) return;
    var b=bnd(r2);
    tk2.x=Math.max(-b[0],Math.min(b[0],x)); tk2.z=Math.max(-b[1],Math.min(b[1],z));
    withView(f2,k2,function(){ snapAll(r2); });
    sv(); try{ drawKeep(); }catch(e){}
    return;
  }
  if(m.t==='bye'){ try{ conn.close(); }catch(e){} }
}

function hostConn(conn){
  var pid=conn.peer, old=NET.conns[pid];
  if(old){ try{ old.conn.close(); }catch(e){} }
  var c=NET.conns[pid]={conn:conn,on:false,sent:{},n:''};
  conn.on('data',function(m){ try{ hostMsg(conn,m); }catch(e){ console.error(e); } });
  conn.on('close',function(){ if(NET.conns[pid] && NET.conns[pid].conn===conn){ NET.conns[pid].on=false; ui(); } });
  conn.on('error',function(){ if(NET.conns[pid] && NET.conns[pid].conn===conn){ NET.conns[pid].on=false; ui(); } });
}

NET.hostStart = function(){
  if(NET.role!=='off') return;
  say('Abrindo a mesa…');
  loadPeer(function(){
    var tries=0;
    (function open(){
      var code=(tries===0 && /^[A-Z0-9]{5}$/.test(lsGet('s7_mesa_code')||'')) ? lsGet('s7_mesa_code') : rnd(5);
      tries++;
      var p=new Peer(PREFIX+code), opened=false;
      p.on('open',function(){
        opened=true; NET.peer=p; NET.role='host'; NET.code=code; NET.msg=''; lsSet('s7_mesa_code',code);
        NET.last=''; ui(); NET.bc(true);
      });
      p.on('connection',hostConn);
      p.on('disconnected',function(){ try{ p.reconnect(); }catch(e){} });
      p.on('error',function(e){
        if(!opened && e.type==='unavailable-id' && tries<6){ try{ p.destroy(); }catch(_){} lsSet('s7_mesa_code',''); return open(); }
        if(!opened){ try{ p.destroy(); }catch(_){} NET.role='off'; return say(errTxt(e)); }
        NET.toast(errTxt(e));
      });
    })();
  }, function(){ say(errTxt({type:'cdn'})); });
};

NET.stop = function(){
  Object.keys(NET.conns).forEach(function(pid){ try{ NET.conns[pid].conn.send({t:'kick'}); NET.conns[pid].conn.close(); }catch(e){} });
  NET.conns={}; try{ NET.peer&&NET.peer.destroy(); }catch(e){}
  NET.peer=null; NET.role='off'; NET.code=''; NET.msg=''; ui();
};

NET.kick = function(pid){
  var c=NET.conns[pid];
  if(c){ try{ c.conn.send({t:'kick'}); c.conn.close(); }catch(e){} delete NET.conns[pid]; }
  S.tokens=S.tokens.filter(function(t){ return t.pid!==pid; });
  sv(); try{ draw(); }catch(e){} ui();
};
NET.setFree = function(v){ NET.free=!!v; lsSet('s7_mesa_free',v?'1':'0'); };

/* ====================== JOGADOR ====================== */
function ensurePeer(cb){
  if(NET.peer && !NET.peer.destroyed && !NET.peer.disconnected && NET.peer.open) return cb();
  try{ NET.peer&&NET.peer.destroy(); }catch(e){}
  var tries=0, base='s7p-'+myKey();
  (function open(){
    var p=new Peer(base+(tries?'-'+rnd(3).toLowerCase():'')); NET.peer=p;
    p.on('open',function(id){ NET.myId=id; cb(); });
    p.on('error',function(e){
      if(e.type==='unavailable-id' && tries<3 && !p.open){ tries++; try{ p.destroy(); }catch(_){} return open(); }
      if(NET.onPeerErr) NET.onPeerErr(e);
    });
  })();
}

function giveUp(e){
  if(NET.role==='client'){ schedule(); return; }
  try{ NET.peer&&NET.peer.destroy(); }catch(_){}
  NET.peer=null; say(errTxt(e));
}
function schedule(){
  if(NET.leaving) return;
  NET.tries++;
  if(NET.tries>6){ NET.status='fail'; ui(); return; }
  NET.status='retry'; ui();
  setTimeout(connectTo, 2500);
}

function helloMsg(){ return {t:'hello',v:1,n:NET.nome,th:NET.th||'',c:NET.cor||''}; }

function connectTo(){
  if(NET.leaving) return;
  ensurePeer(function(){
    var c=NET.peer.connect(PREFIX+NET.code,{reliable:true}), done=false;
    function fail(e){ if(done) return; done=true; clearTimeout(to); try{ c.close(); }catch(_){} giveUp(e); }
    var to=setTimeout(function(){ fail({type:'timeout'}); },15000);
    NET.onPeerErr=function(e){ if(e.type==='peer-unavailable'||e.type==='webrtc'||e.type==='network'||e.type==='server-error') fail(e); };
    c.on('open',function(){ done=true; clearTimeout(to); NET.conn=c; c.send(helloMsg()); });
    c.on('data',clientMsg);
    c.on('close',function(){
      if(NET.conn===c) NET.conn=null;
      if(NET.leaving || !done) return;
      if(NET.role==='client'){ NET.toast('Conexão perdida — tentando reconectar…'); NET.tries=0; schedule(); }
    });
  });
}

NET.form = function(){ NET.formOpen=!NET.formOpen; NET.msg=''; ui(); };
NET.join = function(){
  var code=($('nCode').value||'').toUpperCase().replace(/[^A-Z0-9]/g,''), nome=($('nNome').value||'').trim().slice(0,30), fid=$('nFicha').value;
  if(code.length!==5) return say('O código da mesa tem 5 letras/números.');
  if(!nome) return say('Digite o nome do seu operativo.');
  lsSet('s7_mesa_nome',nome);
  NET.code=code; NET.nome=nome; NET.leaving=false; NET.tries=0;
  NET.th=(fid && PF[fid] && PF[fid].th) || '';
  NET.cor=''; NET.status='';
  say('Conectando…');
  loadPeer(connectTo, function(){ say(errTxt({type:'cdn'})); });
};
NET.retry = function(){ NET.tries=0; NET.status='retry'; ui(); connectTo(); };
NET.leave = function(){
  NET.leaving=true;
  try{ NET.conn&&NET.conn.send({t:'bye'}); }catch(e){}
  try{ NET.peer&&NET.peer.destroy(); }catch(e){}
  location.href=location.pathname;      /* recarrega: volta ao SEU mapa local, intacto */
};

function clientMsg(m){
  if(!m || typeof m!=='object') return;
  if(m.t==='welcome'){
    NET.role='client'; NET.myTok=m.me; NET.tries=0; NET.status='ok'; NET.msg='';
    document.body.classList.add('net-client');
    try{ setMode('P'); }catch(e){}
    ui();
  } else if(m.t==='face'){
    if(typeof m.th==='string' && m.th.indexOf('data:image/')===0){ setFace(m.fid,m.n,m.th); try{ draw(); }catch(e){} }
  } else if(m.t==='state'){
    try{ apply(JSON.parse(m.j)); }catch(e){ console.error(e); }
  } else if(m.t==='deny'){
    NET.toast(m.m||'Ação não permitida.');
  } else if(m.t==='kick'){
    NET.leaving=true; alert('O mestre encerrou a sua conexão com a mesa.'); NET.leave();
  }
}

/* aplica a cópia do mapa recebida, mantendo a SUA visão (andar/sala) */
function apply(v){
  if(window.C3 && C3.dq){ NET.queued=v; return; }          /* não troca o mapa no meio de um arrasto */
  var oldF=(NET.joined && S && S.fls) ? S.f : null, oldSel=(NET.joined && S) ? S.sel : null;
  S=v;
  S.tokens=S.tokens||[];
  S.tokens.forEach(function(t){ t.k='player'; t.ico=t.ico||t.i||'👤'; t.i=t.i||t.ico; t.s=t.s||100; t.f=t.f||0; });
  var me=S.tokens.filter(function(t){ return t.pid===NET.myId; })[0];
  NET.myTok=me?me.id:null;
  var f=(oldF==null) ? (me?me.f:0) : oldF, sel=oldSel;
  var key=me ? (me.f+':'+me.at) : '';
  if(me && NET.lastAt!==key){ NET.lastAt=key; if(me.at){ f=me.f; sel=me.at; } }   /* seu token andou: a tela acompanha */
  f=Math.max(0,Math.min(S.fls.length-1,f));
  S.f=f; S.rooms=S.fls[f].rooms; S.sel=(sel && S.rooms[sel]) ? sel : null;
  try{ if(selTk!=null && !S.tokens.some(function(t){ return t.id==selTk; })) selTk=null; }catch(e){}
  NET.joined=true;
  if(window.C3) C3.k=null;
  draw();
  ui();
}

function send(m){
  if(NET.conn && NET.conn.open!==false){ try{ NET.conn.send(m); return true; }catch(e){} }
  NET.toast('Sem conexão com a mesa.'); return false;
}
NET.move = function(id,f,k){
  var t=S.tokens.filter(function(q){ return q.id==id; })[0]; if(!t) return;
  if(t.pid!==NET.myId){ NET.toast('Esse token não é seu.'); return; }
  send({t:'move',id:id,f:f,k:k});
};
NET.pos = function(q){
  if(NET.role!=='client' || !q || q.pid!==NET.myId) return;
  send({t:'pos',id:q.id,f:S.f,k:S.sel,x:q.x,z:q.z});
};
NET.canDrag = function(q){ return NET.role!=='client' || q.pid===NET.myId; };
NET.dragEnd = function(){ if(NET.queued){ var v=NET.queued; NET.queued=null; apply(v); } };
NET.clk = function(k){            /* clique numa casa do mapa, visto pelo jogador */
  if(Date.now()-lastDrag<350) return;
  var pp=k.split(','), o=own(+pp[0],+pp[1]); if(o) k=o;
  var r=S.rooms[k]; if(!r) return;
  S.sel=k;
  if(selTk!=null) NET.move(selTk,S.f,k);
  draw();
};

document.addEventListener('visibilitychange',function(){
  if(!document.hidden && NET.role==='client' && !NET.conn && !NET.leaving){ NET.tries=0; connectTo(); }
});

/* ====================== INTERFACE ====================== */
function copy(txt,okMsg){
  function fb(){ prompt('Copie:',txt); }
  if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(function(){ NET.toast(okMsg); },fb);
  else fb();
}
NET.copyCode = function(){ copy(NET.code,'Código copiado!'); };
NET.copyLink = function(){ copy(location.href.replace(/[?#].*$/,'')+'?mesa='+NET.code,'Link copiado!'); };

function offHTML(){
  var h='<div class="bar" style="margin:0"><b class="nt">🌐 MESA ONLINE</b>'+
    '<button class="b" onclick="NET.hostStart()">🎲 CRIAR MESA (SOU O MESTRE)</button>'+
    '<button class="b'+(NET.formOpen?' on':'')+'" onclick="NET.form()">🔗 ENTRAR NUMA MESA</button></div>';
  if(NET.formOpen){
    var cur=lsGet('s7_currentFicha')||'', nome=lsGet('s7_mesa_nome')||(PF[cur]?PF[cur].n:'');
    h+='<div class="bar" style="margin:8px 0 0"><input id="nCode" placeholder="CÓDIGO" maxlength="5" value="'+esc(NET.prefill||'')+'" style="width:84px;text-transform:uppercase;letter-spacing:.2em">'+
       '<input id="nNome" placeholder="Nome do operativo" value="'+esc(nome)+'" style="width:150px">'+
       '<select id="nFicha" title="O retrato desta ficha vira o seu token">'+fichaOpts(cur)+'</select>'+
       '<button class="b" onclick="NET.join()">▶ ENTRAR</button></div>'+
       '<div class="hint" style="margin-top:4px">O retrato da ficha escolhida vira o seu token na mesa. O mapa do mestre aparece aqui, mas o seu mapa salvo não é alterado.</div>';
  }
  if(NET.msg) h+='<div class="hint" style="margin-top:6px;color:var(--yellow)">'+esc(NET.msg)+'</div>';
  return h;
}
function hostHTML(){
  var pl=S.tokens.filter(function(t){ return t.pid; }).map(function(t){
    var c=NET.conns[t.pid], on=c&&c.on;
    return '<div class="npl"><i class="nf" style="border-color:'+t.c+'">'+tkFace(t)+'</i><span style="flex:1">'+esc(t.n)+'</span>'+
      '<small class="ndot'+(on?' on':'')+'">'+(on?'● online':'○ offline')+'</small>'+
      '<button class="b red" style="padding:1px 6px" title="Expulsar e remover o token" onclick="NET.kick(\''+esc(t.pid)+'\')">✕</button></div>';
  }).join('') || '<div class="hint">Ninguém entrou ainda. Mande o código ou o link.</div>';
  return '<div class="bar" style="margin:0"><b class="nt">🌐 MESA ONLINE — VOCÊ É O MESTRE</b>'+
    '<span class="netcode">'+NET.code+'</span>'+
    '<button class="b" onclick="NET.copyCode()">📋 CÓDIGO</button><button class="b" onclick="NET.copyLink()">🔗 LINK</button>'+
    '<button class="b red" onclick="if(confirm(\'Encerrar a mesa? Todos serão desconectados.\'))NET.stop()">⏹ ENCERRAR</button></div>'+
    '<label style="margin-top:8px"><input type="checkbox" style="width:auto" '+(NET.free?'checked':'')+' onchange="NET.setFree(this.checked)"> 👣 jogadores podem entrar em salas ainda cobertas pela névoa (revela ao entrar)</label>'+
    '<div style="margin-top:6px">'+pl+'</div>'+
    '<div class="hint" style="margin-top:6px">Mantenha esta aba aberta durante a sessão. Jogadores veem o mapa conforme a NÉVOA (🌫) e nunca as suas notas. Tokens de jogadores: só o dono move.</div>'+
    (NET.msg?'<div class="hint" style="color:var(--yellow)">'+esc(NET.msg)+'</div>':'');
}
function clientHTML(){
  var st = NET.conn ? '<small class="ndot on">● conectado</small>' :
           NET.status==='fail' ? '<small class="ndot">○ desconectado</small><button class="b" onclick="NET.retry()">🔄 RECONECTAR</button>' :
           '<small class="ndot">○ reconectando…</small>';
  return '<div class="bar" style="margin:0"><b class="nt">🌐 MESA '+esc(NET.code)+'</b>'+st+
    '<span class="hint">você: <b>'+esc(NET.nome||'')+'</b></span>'+
    '<button class="b red" onclick="NET.leave()">SAIR DA MESA</button></div>'+
    '<div class="hint" style="margin-top:6px">Toque no <b>seu token</b> e depois numa sala para andar, ou arraste-o até a sala. No 3D, arraste o seu boneco para posicioná-lo. Salas com “?” ainda não foram reveladas pelo mestre.</div>';
}
function ui(){
  var b=$('netBox'); if(!b) return;
  var keep={}; ['nCode','nNome','nFicha'].forEach(function(id){ var e=$(id); if(e) keep[id]=e.value; });
  b.innerHTML = NET.role==='host' ? hostHTML() : NET.role==='client' ? clientHTML() : offHTML();
  Object.keys(keep).forEach(function(id){ var e=$(id); if(e && keep[id]!=='') e.value=keep[id]; });
  document.body.classList.toggle('net-client',NET.role==='client');
}
NET.ui = ui;

(function init(){
  var m=location.search.match(/[?&]mesa=([A-Za-z0-9]{5})/);
  if(m){ NET.prefill=m[1].toUpperCase(); NET.formOpen=true; }
  ui();
})();
})();
