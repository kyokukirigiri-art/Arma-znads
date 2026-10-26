/* =====================================================================
   FRISK: chefe em 3 fases (320 de vida).
   • Cada ataque é uma função* (corrotina). `yield s` espera s segundos.
     Quando o ataque termina, o próximo começa no MESMO frame (transição instantânea).
   • Troca de fase acontece só na fronteira entre ataques (nunca corta um dash no meio).
   • Todo tempo e velocidade passam por F.spd (agressividade sorteada em cada luta).
   • Dano sempre por hurt(); projéteis de sangue por emit() (sistema de projéteis do jogo).
   ===================================================================== */

var FR = { p2: 0.5, p3: 0.3 };        // fração de eMax para entrar na fase 2 e na fase 3
var FR_CUR = null;                    // estado da luta atual (usado pelo retrato)
/* Modo gravidade (alma azul): movimento só horizontal, cai, pula do chão.
   Pulo: seta pra cima, W, Espaço, Z, botão de confirmar (celular) ou joystick pra cima. */
var soulG = { on:false, vy:0, jPrev:false, req:false, gnd:false };
function frGravMove(c,dt,mvx){
  var ground=c.h-7, up=!!(keys.ArrowUp||keys.w||joy.y<-0.5||soulG.req);
  soulG.req=false;
  soul.x+=mvx*soul.sp*dt;
  // pulo: usa a flag "no chão" (o clamp da arena deixa a alma 1 px acima de c.h-7, então comparar posição falhava)
  if(soulG.gnd && up && !soulG.jPrev){ soulG.vy=-330; soulG.gnd=false; }
  soulG.jPrev=up;
  soulG.vy+=900*dt; soul.y+=soulG.vy*dt;
  if(soul.y>=ground-2){ soul.y=ground-2; soulG.vy=0; soulG.gnd=true; }
}


/* parâmetros por fase: índice 0 = fase 1, 1 = fase 2, 2 = fase 3 */
var FR_T = {
  slashN:[4,5,6],          slashWarn:[0.75,0.5,0.32],  slashGap:[0.5,0.34,0.22],  hole:[0.24,0.2,0.16],
  waveN:[2,3,4],           waveWarn:[0.9,0.6,0.4],     waveSpd:[520,720,920],
  knifeCross:[3.6,2.8,2.1], knifeEvery:[1.0,0.7,0.45], bloodSp:[110,140,175],
  chaseV:[60,85,115],      dashWind:[0.9,0.6,0.38],    dashSpd:[480,650,860],
  boomSp:[190,250,320],    burstN:[4,6,8],             burstWarn:[0.42,0.28,0.18], burstGap:[0.42,0.26,0.14],
  gbN:[8,10,12],           gbSpd:[130,160,190],        gbEvery:[1.1,0.9,0.7],
  blueN:[2,3,4],           blueSpd:[160,220,280],      blueWarn:[0.6,0.45,0.3],
  blastN:[1,2,2],          blastWarn:[0.95,0.65,0.42], blastFire:[0.32,0.26,0.2],
  rainN:[4,6,8],           rainSpd:[120,165,210],      rainEvery:[0.9,0.6,0.4]
};
function frT(k,F){ return FR_T[k][F.phase-1]; }
function frRnd(a,b){ return a+Math.random()*(b-a); }
function frClampX(v,w){ return Math.max(16,Math.min(w-16,v)); }
function frClampY(v,h){ return Math.max(16,Math.min(h-16,v)); }
function frQ(x0,y0,cx,cy,x1,y1,t){ var m=1-t; return [m*m*x0+2*m*t*cx+t*t*x1, m*m*y0+2*m*t*cy+t*t*y1]; }
function frVm(){ return DIF.speed*balM('speed'); }

/* distância de um ponto a um segmento */
function frSegD(px,py,ax,ay,bx,by){
  var dx=bx-ax, dy=by-ay, L=dx*dx+dy*dy;
  var t=L?((px-ax)*dx+(py-ay)*dy)/L:0; t=t<0?0:(t>1?1:t);
  var qx=ax+dx*t-px, qy=ay+dy*t-py;
  return Math.sqrt(qx*qx+qy*qy);
}

/* cria um "segmento" de perigo: centro (x,y), ângulo, meia-largura (half), espessura (th).
   warn = tempo de aviso (linha tracejada, sem dano); ttl = tempo de vida; mv = movimento customizado */
function frSeg(F,o){
  var h={ k:'seg', x:0, y:0, ang:0, half:20, th:6, vx:0, vy:0, va:0,
          warn:0, ttl:1, age:0, col:'#ff5a5a', blue:false, bone:false, knife:false,
          noHit:false, warnOnly:false, sk:false, done:false, mv:null };
  for(var k in o) h[k]=o[k];
  F.hz.push(h); return h;
}

function frHud(on,n){
  var nm=$('enemyName'), el=$('frPhase');
  if(!el && on){
    el=document.createElement('span'); el.id='frPhase';
    el.style.cssText='font-family:var(--hud);font-size:.55rem;letter-spacing:.12em;color:#8fe0ff;margin-left:6px;';
    nm.parentNode.insertBefore(el,nm.nextSibling);
  }
  if(el){ el.style.display=on?'inline':'none'; if(on) el.textContent='FASE '+n+'/3'; }
  if(!on) FR_CUR=null;
}

function frInit(c){
  if(c.fr) return c.fr;
  var F=c.fr={ hz:[], gen:null, wait:0, dt:0, spd:1, phase:1, pend:1, last:-1,
    vis:false, alpha:1, flame:false, fl:[], tel:null, trans:false,
    moved:false, px:soul.x, py:soul.y, w:c.w, h:c.h, x:c.w/2, y:c.h/2, gt:0 };
  F.gen=frIntro(F);
  FR_CUR=F; frHud(true,1);
  return F;
}

/* Fase 1: Frisk fica só no retrato, sem entrar na arena */
function* frIntro(F){ yield 0.7; }

/* Troca de fase: fase 2 aparece no cenário; fase 3 sai, fica um instante vazio e volta com chama azul */
function* frTrans(F,to){
  F.trans=true; F.grav=false; F.hz.length=0; F.tel=null;
  if(to===3){
    var dir=(F.x<F.w/2)?-1:1, t=0;
    while(t<0.8){ F.x+=dir*(F.w*1.3/0.8)*F.dt; t+=F.dt; yield 0; }
    F.vis=false;
    yield 0.8;
  } else {
    F.vis=false; yield 0.6;
  }
  F.phase=to; frHud(true,to);
  F.x=F.w/2; F.y=F.h*0.45; F.vis=true; F.flame=(to===3); F.fl=[];
  var t2=0;
  while(t2<0.9){ F.alpha=t2/0.9; t2+=F.dt; yield 0; }
  F.alpha=1; F.trans=false;
}

/* escolhe o próximo ataque (sem repetir o último); trocas de fase têm prioridade na fronteira */
function frNext(F){
  if(F.pend>F.phase) return frTrans(F,F.phase+1);
  var pool = F.phase===1 ? [atkCuts,atkWaves,atkKnife]
           : F.phase===2 ? [atkDash,atkBoom,atkBurst]
           :               [atkBones,atkBlue,atkBlast,atkRain];
  var pick;
  do { pick=Math.floor(Math.random()*pool.length); } while(pool.length>1 && pick===F.last);
  F.last=pick;
  return pool[pick](F);
}

/* ---------- movimento do Frisk (fase 2) ---------- */
function* frApproach(F,stopD){
  var v=frT('chaseV',F);
  for(var g=0; g<900; g++){
    var dx=soul.x-F.x, dy=soul.y-F.y, d=Math.hypot(dx,dy);
    if(d<=stopD) break;
    var st=Math.min(d-stopD, v*F.dt);
    F.x=frClampX(F.x+dx/d*st,F.w); F.y=frClampY(F.y+dy/d*st,F.h);
    yield 0;
  }
}

/* ===================== FASE 1 ===================== */

/* ----- cortes em arco (estilo da referência): fino no começo, grosso no meio, pixelado, rosa ----- */
function frTaper(u){                       // espessura relativa: afina no início, engrossa e corta seco no fim
  var v = u<0.7 ? Math.sqrt(u/0.7) : 1-(u-0.7)/0.3*0.7;
  return Math.max(0.04, v);
}
/* monta um arco quadrático p0 -> p1 (controle cp) em 2 pedaços, deixando uma brecha entre eles */
function frSwoosh(F,p0,cp,p1,maxT,hu,hole,wu,ttl){
  var N=24, parts=[[0,hu],[hu+hole,1]];
  for(var k=0;k<parts.length;k++){
    var r=parts[k];
    if(r[1]-r[0]<0.02) continue;
    var pts=[];
    for(var i=0;i<=N;i++){
      var u=r[0]+(r[1]-r[0])*i/N, q=frQ(p0[0],p0[1],cp[0],cp[1],p1[0],p1[1],u);
      pts.push([q[0],q[1],maxT*frTaper(u)]);
    }
    F.hz.push({ sw:true, pts:pts, age:0, warn:wu, ttl:ttl, done:false });
  }
}
function frSnap(v){ return Math.round(v/5)*5; }         // grade de 5 px: dá o aspecto pixelado
function frDrawSw(g,h,left,top){
  var P=h.pts, n=P.length;
  if(h.age<h.warn){                                      // aviso: linha fina tracejada
    g.save(); g.setLineDash([5,5]); g.strokeStyle='#ffc8d0'; g.lineWidth=1.4;
    g.globalAlpha=0.5+0.4*Math.sin(h.age*22);
    g.beginPath(); for(var i=0;i<n;i++){ var x=left+P[i][0], y=top+P[i][1]; i?g.lineTo(x,y):g.moveTo(x,y); }
    g.stroke(); g.restore(); return;
  }
  var L=[], R=[];
  for(var j=0;j<n;j++){
    var a=P[Math.max(0,j-1)], b=P[Math.min(n-1,j+1)];
    var dx=b[0]-a[0], dy=b[1]-a[1], d=Math.hypot(dx,dy)||1, nx=-dy/d, ny=dx/d, w=P[j][2];
    L.push([frSnap(left+P[j][0]+nx*w), frSnap(top+P[j][1]+ny*w)]);
    R.push([frSnap(left+P[j][0]-nx*w), frSnap(top+P[j][1]-ny*w)]);
  }
  g.save(); g.fillStyle='#ffc8d0'; g.shadowColor='#ff9fb0'; g.shadowBlur=8;
  g.beginPath(); g.moveTo(L[0][0],L[0][1]);
  for(var p=1;p<n;p++) g.lineTo(L[p][0],L[p][1]);
  for(var q2=n-1;q2>=0;q2--) g.lineTo(R[q2][0],R[q2][1]);
  g.closePath(); g.fill(); g.restore();
}

/* Sequências de cortes: arcos de um lado ao outro da arena, com brecha para passar. */
function* atkCuts(F){
  var n=frT('slashN',F), wu=frT('slashWarn',F), gap=frT('slashGap',F), hole=frT('hole',F), W=F.w, H=F.h;
  for(var i=0;i<n;i++){
    var side=Math.random()<0.5?-1:1;
    var p0=[side>0?-10:W+10, frRnd(0,H*0.5)];
    var p1=[side>0?W+10:-10, frRnd(H*0.5,H)];
    var mx=(p0[0]+p1[0])/2, my=(p0[1]+p1[1])/2;
    var ex=p1[0]-p0[0], ey=p1[1]-p0[1], len=Math.hypot(ex,ey);
    var bend=frRnd(0.22,0.38)*len*(Math.random()<0.5?-1:1);
    var cp=[mx+(-ey/len)*bend, my+(ex/len)*bend];
    frSwoosh(F,p0,cp,p1,frRnd(14,20),frRnd(0.1,0.9-hole),hole,wu,wu+0.35);
    yield gap;
  }
}

/* Ondas: uma linha de aviso marca a direção; depois um corte rápido passa exatamente nela. */
function* atkWaves(F){
  var n=frT('waveN',F), wu=frT('waveWarn',F), sp=frT('waveSpd',F), L=Math.hypot(F.w,F.h)+20;
  for(var i=0;i<n;i++){
    var a=frRnd(0,Math.PI), cx=F.w/2+frRnd(-F.w*0.22,F.w*0.22), cy=F.h/2+frRnd(-F.h*0.22,F.h*0.22);
    var nx=-Math.sin(a), ny=Math.cos(a), side=Math.random()<0.5?-1:1;
    frSeg(F,{ x:cx, y:cy, ang:a, half:L/2, th:2, warn:wu, ttl:wu, noHit:true, warnOnly:true, col:'#3aa8ff' });
    yield wu;
    var ex=cx+nx*side*L/2, ey=cy+ny*side*L/2;                 // começa fora da arena
    frSeg(F,{ x:ex, y:ey, ang:a, half:L/2, th:10, vx:-nx*side*sp, vy:-ny*side*sp, warn:0, ttl:L/sp+0.2, blue:true, col:'#3aa8ff' });
  }
}

/* Faca: atravessa a arena (não fere ao encostar) e lança projéteis de sangue na alma. */
function* atkKnife(F){
  var cross=frT('knifeCross',F), every=frT('knifeEvery',F), sp=frT('bloodSp',F)*frVm();
  var fromL=Math.random()<0.5, y=frRnd(F.h*0.18,F.h*0.82), dir=fromL?1:-1;
  var x0=fromL?-30:F.w+30;
  var kn=frSeg(F,{ x:x0, y:y, ang:fromL?0:Math.PI, half:20, th:6, knife:true, noHit:true,
                   vx:dir*(F.w+60)/cross, vy:0, ttl:cross+0.1 });
  for(var t=0;t<cross;t+=every){
    yield every;
    if(kn.ttl<=0) break;
    var a=Math.atan2(soul.y-kn.y, soul.x-kn.x);
    emit({ x:kn.x, y:kn.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:4, c:'#ff5a5a' });
  }
}

/* ===================== FASE 2 ===================== */

/* Segue a alma; dá um dash com a faca na direção dela. */
function* atkDash(F){
  yield* frApproach(F,70);
  var wd=frT('dashWind',F), sp=frT('dashSpd',F);
  var a=Math.atan2(soul.y-F.y, soul.x-F.x);
  F.tel={ x1:F.x, y1:F.y, x2:soul.x, y2:soul.y };
  yield wd;
  F.tel=null;
  var ca=Math.cos(a), sa=Math.sin(a), len=Math.hypot(F.w,F.h)+60;
  frSeg(F,{ x:F.x, y:F.y, ang:a, half:20, th:8, knife:true, vx:ca*sp, vy:sa*sp, ttl:len/sp+0.1 });
  var moved=0;
  while(moved<len){
    var stp=sp*F.dt; moved+=stp;
    F.x=frClampX(F.x+ca*stp,F.w); F.y=frClampY(F.y+sa*stp,F.h);
    yield 0;
  }
}

/* Arremessa a faca em bumerangue: vai até a alma e volta para o Frisk. */
function* atkBoom(F){
  yield* frApproach(F,150);
  var sp=frT('boomSp',F), tx=soul.x, ty=soul.y;
  F.tel={ x1:F.x, y1:F.y, x2:tx, y2:ty };
  yield 0.5;
  F.tel=null;
  var h=frSeg(F,{ x:F.x, y:F.y, ang:0, half:20, th:8, knife:true, ttl:9999 });
  h.mv=frBoomMv; h.tx=tx; h.ty=ty; h.st=0; h.sp=sp;
  while(!h.gone) yield 0;
}
function frBoomMv(h,dt,F){
  h.ang+=dt*16;
  if(h.st===0){
    var dx=h.tx-h.x, dy=h.ty-h.y, d=Math.hypot(dx,dy), s=h.sp*dt;
    if(d<=s){ h.x=h.tx; h.y=h.ty; h.st=1; }
    else { h.x+=dx/d*s; h.y+=dy/d*s; }
  } else {
    var ex=F.x-h.x, ey=F.y-h.y, e=Math.hypot(ex,ey), s2=h.sp*1.15*dt;
    if(e<=s2+4){ h.gone=true; h.ttl=0; }
    else { h.x+=ex/e*s2; h.y+=ey/e*s2; }
  }
}

/* Chega perto e dá vários cortes em volta da alma. */
function* atkBurst(F){
  yield* frApproach(F,58);
  var n=frT('burstN',F), wu=frT('burstWarn',F), gp=frT('burstGap',F);
  for(var i=0;i<n;i++){
    var a=frRnd(0,Math.PI*2), r=frRnd(0,16);
    var cx=soul.x+Math.cos(a)*r, cy=soul.y+Math.sin(a)*r;
    var ang=frRnd(0,Math.PI), half=frRnd(26,36);
    frSeg(F,{ x:cx, y:cy, ang:ang, half:half, th:6, warn:wu, ttl:wu+0.18 });
    // Frisk desliza (não teleporta) até o lado do corte
    var tx=frClampX(cx-Math.cos(ang)*(half+14),F.w), ty=frClampY(cy-Math.sin(ang)*(half+14),F.h);
    var sx=F.x, sy=F.y, glide=Math.min(wu,0.3), t=0;
    while(t<glide){ var k=t/glide; F.x=sx+(tx-sx)*k; F.y=sy+(ty-sy)*k; t+=F.dt; yield 0; }
    F.x=tx; F.y=ty;
    yield Math.max(0.05,gp-glide);
  }
}

/* ===================== FASE 3 (ataques do Sans) ===================== */

/* Ossos vindo da direita pra esquerda, estilo Undertale. Modo GRAVIDADE (alma azul):
   ossos brancos e baixos: pule por cima. Ossos azuis e altos: fique parado, eles só machucam se você se mover. */
function* atkBones(F){
  var n=frT('gbN',F), sp=frT('gbSpd',F), ev=frT('gbEvery',F), W=F.w, floor=F.h-7;
  F.grav=true;
  yield 0.6;                                              // a alma cai até o chão
  for(var i=0;i<n;i++){
    var tall = Math.random()<0.4;
    var hgt = tall ? frRnd(62,78) : frRnd(26,34);
    frSeg(F,{ x:W+12, y:floor-hgt/2, ang:-Math.PI/2, half:hgt/2, th:8,
              bone:!tall, blue:tall, col:'#3aa8ff', vx:-sp, vy:0, ttl:(W+60)/sp+0.2 });
    yield ev;
  }
  yield 0.5;
  F.grav=false;
}

/* Ossos azuis: cruzam a arena na horizontal, mas só machucam se a alma estiver se movendo. */
function* atkBlue(F){
  var n=frT('blueN',F), sp=frT('blueSpd',F), wu=frT('blueWarn',F), W=F.w, H=F.h;
  for(var i=0;i<n;i++){
    var y=frRnd(H*0.12,H*0.88), fromL=Math.random()<0.5, L2=frRnd(W*0.22,W*0.34);
    var cx0=fromL?-L2-10:W+L2+10, dir=fromL?1:-1;
    frSeg(F,{ x:cx0, y:y, ang:0, half:L2, th:8, blue:true, col:'#3aa8ff',
              vx:dir*sp, vy:0, warn:wu, ttl:wu+(W+2*L2+40)/sp });
    yield frRnd(0.45,0.8);
  }
}

/* Caveiras (blasters): surgem na borda, mostram a mira e disparam um feixe na alma. */
function* atkBlast(F){
  var n=frT('blastN',F), wu=frT('blastWarn',F), fire=frT('blastFire',F);
  for(var i=0;i<n;i++){
    var side=Math.floor(Math.random()*4), sx, sy;
    if(side===0){ sx=-14; sy=frRnd(0.1,0.9)*F.h; }
    else if(side===1){ sx=F.w+14; sy=frRnd(0.1,0.9)*F.h; }
    else if(side===2){ sx=frRnd(0.1,0.9)*F.w; sy=-14; }
    else { sx=frRnd(0.1,0.9)*F.w; sy=F.h+14; }
    var a=Math.atan2(soul.y-sy, soul.x-sx), far=Math.hypot(F.w,F.h)+40;
    var mx=sx+Math.cos(a)*far/2, my=sy+Math.sin(a)*far/2;
    frSeg(F,{ x:mx, y:my, ang:a, half:far/2, th:2, warn:wu, ttl:wu, noHit:true, warnOnly:true, sk:true, col:'#ffffff' });
    yield wu;
    frSeg(F,{ x:mx, y:my, ang:a, half:far/2, th:16, warn:0, ttl:fire+0.1, col:'#ff5a5a' });
    yield fire+0.25;
  }
}

/* Chuva de ossos: aviso no topo, depois um osso cai na vertical. */
function* atkRain(F){
  var n=frT('rainN',F), sp=frT('rainSpd',F), ev=frT('rainEvery',F), W=F.w;
  for(var i=0;i<n;i++){
    var x=frRnd(0.06,0.94)*W, len=frRnd(40,70), wu=0.35;
    frSeg(F,{ x:x, y:len/2-2, ang:Math.PI/2, half:len/2, th:2, warn:wu, ttl:wu, noHit:true, warnOnly:true });
    yield wu;
    frSeg(F,{ x:x, y:-len/2-4, ang:Math.PI/2, half:len/2, th:8, bone:true, vy:sp, ttl:(F.h+len+20)/sp });
    yield ev;
  }
}

/* ===================== DESENHO ===================== */

function frSkull(g,x,y){
  g.save(); g.shadowColor='#ffffff'; g.shadowBlur=10;
  g.fillStyle='#f3f6fa'; g.beginPath(); g.arc(x,y,7,0,7); g.fill();
  g.fillStyle='#0b0f18'; g.fillRect(x-4,y-2,3,3); g.fillRect(x+1,y-2,3,3);
  g.restore();
}
function frKnife(g,x,y,ang,half){
  g.save(); g.translate(x,y); g.rotate(ang); g.shadowColor='#ff5a5a'; g.shadowBlur=10;
  g.fillStyle='#e8eef5';
  g.beginPath(); g.moveTo(half,0); g.lineTo(-half*0.3,-5); g.lineTo(-half,-3); g.lineTo(-half,3); g.lineTo(-half*0.3,5); g.closePath(); g.fill();
  g.fillStyle='#2a0f14'; g.fillRect(-half-6,-2.5,6,5);
  g.restore();
}
function frBone(g,ax,ay,bx,by,th,col,glow){
  g.save(); g.lineCap='round'; g.shadowColor=glow; g.shadowBlur=8;
  g.strokeStyle='#0b0f18'; g.lineWidth=th+2; g.beginPath(); g.moveTo(ax,ay); g.lineTo(bx,by); g.stroke();
  g.strokeStyle=col; g.lineWidth=th; g.stroke();
  g.restore();
}

function frDrawHaz(g,h,left,top){
  var cs=Math.cos(h.ang), sn=Math.sin(h.ang);
  var ax=left+h.x-cs*h.half, ay=top+h.y-sn*h.half, bx=left+h.x+cs*h.half, by=top+h.y+sn*h.half;
  g.save();
  if(h.age<h.warn || h.warnOnly){                                    // aviso: linha tracejada
    g.setLineDash([6,5]); g.strokeStyle=h.col; g.shadowColor=h.col; g.shadowBlur=8; g.lineWidth=1.6;
    g.globalAlpha=0.5+0.35*Math.sin(h.age*22);
    g.beginPath(); g.moveTo(ax,ay); g.lineTo(bx,by); g.stroke();
    g.setLineDash([]); g.globalAlpha=1;
    if(h.sk) frSkull(g,ax,ay);
  } else if(h.knife){
    frKnife(g,left+h.x,top+h.y,h.ang,h.half);
  } else if(h.bone){
    frBone(g,ax,ay,bx,by,h.th,'#ffffff','#b8c4d6');
  } else if(h.blue){
    frBone(g,ax,ay,bx,by,h.th,'#3aa8ff','#8fe0ff');
  } else {                                                           // corte / feixe
    g.lineCap='round'; g.shadowColor=h.col; g.shadowBlur=14; g.strokeStyle='#ffffff'; g.lineWidth=h.th;
    g.beginPath(); g.moveTo(ax,ay); g.lineTo(bx,by); g.stroke();
  }
  g.restore();
}

/* Frisk desenhado com blocos simples (mesma silhueta do sprite: cabelo, franja escura, camiseta listrada).
   Coordenadas em unidades; s = escala. F (opcional) liga a chama azul no olho esquerdo dele. */
function friskSprite(g,cx,cy,s,F){
  g.save(); g.translate(cx,cy); g.scale(s,s);
  g.lineWidth=1.3; g.strokeStyle='#05060a'; g.lineJoin='round';
  g.fillStyle='#f4f7fb';
  g.beginPath(); g.moveTo(-15,-14); g.lineTo(-17,-26); g.lineTo(-11,-33); g.lineTo(0,-35); g.lineTo(9,-33);
  g.lineTo(15,-28); g.lineTo(16,-14); g.lineTo(12,-6); g.lineTo(-12,-6); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(7,-33); g.lineTo(13,-41); g.lineTo(12,-30); g.closePath(); g.fill(); g.stroke();
  g.fillStyle='#05060a';
  g.beginPath(); g.moveTo(-13,-19); g.lineTo(13,-21); g.lineTo(13,-15); g.lineTo(-13,-13); g.closePath(); g.fill();
  g.fillRect(-3,-7.5,6,1.6);
  g.fillStyle='#f4f7fb'; g.fillRect(-6,-6,12,6);
  g.beginPath(); g.moveTo(-18,1); g.lineTo(-7,-0.5); g.lineTo(7,-0.5); g.lineTo(18,1); g.lineTo(21,33); g.lineTo(-21,33);
  g.closePath(); g.fill(); g.stroke();
  g.fillRect(-27,6,9,23); g.strokeRect(-27,6,9,23); g.fillRect(18,6,9,23); g.strokeRect(18,6,9,23);
  g.strokeRect(-8,7,16,13); g.beginPath(); g.moveTo(-8,13.5); g.lineTo(8,13.5); g.stroke();
  g.fillRect(-12,33,10,21); g.strokeRect(-12,33,10,21); g.fillRect(2,33,10,21); g.strokeRect(2,33,10,21);
  if(F && F.flame) friskFlameDraw(g,F);
  g.restore();
}

function frFlames(F,dt){
  if(F.flame){
    for(var k=0;k<2;k++) F.fl.push({ x:4+frRnd(-1.5,1.5), y:-17+frRnd(-1,1),
      vx:frRnd(-5,5), vy:frRnd(-22,-9), life:0.5+Math.random()*0.4, max:0.9 });
  }
  for(var j=F.fl.length-1;j>=0;j--){
    var p=F.fl[j]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
    if(p.life<=0) F.fl.splice(j,1);
  }
}
function friskFlameDraw(g,F){
  g.save(); g.globalCompositeOperation='lighter';
  for(var i=0;i<F.fl.length;i++){
    var p=F.fl[i], k=Math.max(0,p.life/p.max), r=5+8*k;
    var gr=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    gr.addColorStop(0,'rgba(230,250,255,'+(0.9*k)+')');
    gr.addColorStop(0.4,'rgba(80,190,255,'+(0.7*k)+')');
    gr.addColorStop(1,'rgba(20,80,255,0)');
    g.fillStyle=gr; g.beginPath(); g.arc(p.x,p.y,r,0,7); g.fill();
  }
  g.restore();
}

/* ===================== LOOP DO CHEFE ===================== */

function frRun(F,dt,left,top){
  var g=bctx, td=F.dt;
  F.gt+=dt;
  for(var i=F.hz.length-1;i>=0;i--){
    var h=F.hz[i];
    if(h.sw){                                          // corte em arco (pontos + espessura)
      h.age+=td; h.ttl-=td;
      if(h.ttl<=0){ F.hz.splice(i,1); continue; }
      if(!h.done && !F.trans && invuln<=0 && h.age>=h.warn){
        var sp=h.pts;
        for(var si=0;si<sp.length-1;si++){
          var sd=frSegD(soul.x,soul.y,sp[si][0],sp[si][1],sp[si+1][0],sp[si+1][1]);
          if(sd < (sp[si][2]+sp[si+1][2])/2 + DIF.hit){ h.done=true; hurt(); break; }
        }
      }
      frDrawSw(g,h,left,top);
      continue;
    }
    h.age+=td; h.ttl-=td;
    if(h.mv) h.mv(h,td,F);
    else { h.x+=h.vx*td; h.y+=h.vy*td; h.ang+=h.va*td; }
    if(h.ttl<=0){ F.hz.splice(i,1); continue; }
    var cs=Math.cos(h.ang), sn=Math.sin(h.ang);
    if(!h.noHit && !h.done && !F.trans && invuln<=0 && h.age>=h.warn && (!h.blue || F.moved)){
      var ax=h.x-cs*h.half, ay=h.y-sn*h.half, bx=h.x+cs*h.half, by=h.y+sn*h.half;
      if(frSegD(soul.x,soul.y,ax,ay,bx,by) < h.th/2+DIF.hit){ h.done=true; hurt(); }
    }
    frDrawHaz(g,h,left,top);
  }
  if(F.tel){                                                         // linha de mira (dash / bumerangue)
    var t=F.tel;
    g.save(); g.setLineDash([4,6]); g.strokeStyle='#ffe62a'; g.shadowColor='#ffe62a'; g.shadowBlur=8;
    g.globalAlpha=0.6+0.3*Math.sin(F.gt*20); g.lineWidth=1.5;
    g.beginPath(); g.moveTo(left+t.x1,top+t.y1); g.lineTo(left+t.x2,top+t.y2); g.stroke();
    g.restore();
  }
  frFlames(F,dt);
  if(F.vis){
    g.save(); g.globalAlpha=F.alpha; friskSprite(g,left+F.x,top+F.y,0.5,F); g.restore();
  }
}

function friskBoss(c,dt,calm){
  var F=frInit(c);
  F.w=c.w; F.h=c.h; F.spd=E.spdMul||1; F.dt=dt*F.spd; FR_CUR=F;
  var wasG=soulG.on; soulG.on=!!F.grav; if(soulG.on && !wasG){ soulG.vy=0; soulG.gnd=false; }
  var left=(BW-c.w)/2, top=(BH-c.h)/2;

  // a alma se mexeu neste frame? (para os ossos azuis)
  F.moved = Math.hypot(soul.x-F.px, soul.y-F.py)/Math.max(dt,0.001) > 14;
  F.px=soul.x; F.py=soul.y;

  // fronteira de fase: a troca acontece quando o ataque atual termina
  if(eHp<=eMax*FR.p3) F.pend=3;
  else if(eHp<=eMax*FR.p2) F.pend=Math.max(F.pend,2);

  F.wait-=F.dt;
  for(var guard=0; F.wait<=0 && guard<8; guard++){
    var r;
    try { r=F.gen.next(); }
    catch(err){ F.gen=frNext(F); F.wait=0; break; }                 // ataque com erro: pula para o próximo
    if(r.done){ F.gen=frNext(F); continue; }                         // próximo ataque no MESMO frame
    if(r.value>0) F.wait+=r.value;
    else { F.wait=0; break; }                                        // yield 0: continua no próximo frame
  }
  frRun(F,dt,left,top);
}

/* ===================== REGISTRO DO CHEFE ===================== */

BOSS_POOL.push({ id:'frisk', name:'FRISK', hp:320, fixedHp:320, hitMul:0.6, atk:11, credits:1300, skulls:5,
  pattern:'frisk', dur:9, boss:true,
  intro:'* FRISK sai do corredor sem fazer barulho.\n* Não cumprimenta. Só afia.\n* Cada corte deixa uma linha. Cada linha vira um caminho.',
  idle:['* FRISK pisca devagar. Os olhos não piscam.','* Uma faca gira no dedo, sem fazer barulho.','* O ar corta quando ele respira.'],
  act:{ name:'PEDIR DESCULPAS', text:'* Você pede desculpas por tudo que já fez.\n* FRISK não responde. A faca para no ar por um instante.' },
  check:'* FRISK — ATK 11 DEF 8.\n* CORTES: sequências curvas que cobrem a tela. A linha tracejada avisa; a brecha salva.\n* ONDAS: uma linha marca o trajeto e um corte rápido passa exatamente ali.\n* FACA: atravessa a arena e lança projéteis de sangue na sua alma.\n* FASE 2: dash com faca, faca em bumerangue e rajada de cortes de perto.\n* FASE 3: sai de cena, volta com chama azul no olho e usa ossos que vêm da direita (modo gravidade: pule os brancos, fique parado nos azuis), caveiras e chuva de ossos.'
});
rolarBosses();   // registra o FRISK na seleção (o carregamento inicial já aconteceu)