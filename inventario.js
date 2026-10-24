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
    outro:    {n:'OUTROS',        ico:'📦', lu:'package', w:1, h:1, stack:true},
    lixo:     {n:'LIXO / ORGÂNICOS', ico:'🦴', lu:'bone', w:1, h:1, stack:true}
  };

  /* ---------- LIXO / ORGÂNICOS: sugestões prontas (partes de corpo, sucata de prótese, achados em cadáveres) ----------
     [grupo, nome, ícone, valor em créditos, raridade, largura, altura, descrição]
     O valor é o que o item "vale"; o MERCADOR (venda.html) paga uma parte dele. Edite à vontade. */
  var LIXO = [
    ['PARTES DE CORPO','Olho Orgânico Intacto','lucide:eye',600,'raro',1,1,'Retirado limpo. Ainda reage à luz. O Mercado Negro paga bem por isso.'],
    ['PARTES DE CORPO','Dedos Biônicos Arrancados','lucide:hand',180,'comum',1,1,'Três dedos com articulação. Ainda tremem de vez em quando.'],
    ['PARTES DE CORPO','Fígado Filtrado','lucide:droplet',400,'raro',1,1,'Órgão de reposição em bom estado. Sem perguntas sobre o dono.'],
    ['PARTES DE CORPO','Coração de Reposição','lucide:heart-pulse',2500,'proibido',1,1,'Ainda tem pulso residual. Vale uma fortuna para quem sabe a quem vender.'],
    ['PARTES DE CORPO','Córtex Neural Cru','lucide:brain',3200,'proibido',1,1,'Tecido cerebral com ligações de implante. Compradores muito específicos.'],
    ['PARTES DE CORPO','Frasco de Sangue Raro','lucide:droplet',350,'comum',1,1,'Tipo incomum, sem registro. Bom para clínicas sem licença.'],
    ['PARTES DE CORPO','Medula Óssea Congelada','lucide:bone',700,'raro',1,1,'Bolsa criogênica. Cuidado para não descongelar.'],
    ['PARTES DE CORPO','Dente de Ouro','🦷',80,'comum',1,1,'Pequeno, discreto e fácil de vender.'],
    ['SUCATA DE PRÓTESES','Sucata de Prótese de Braço','lucide:bot',250,'comum',1,2,'Carcaça rachada com peças ainda aproveitáveis.'],
    ['SUCATA DE PRÓTESES','Servo-motor Queimado','lucide:cpu',150,'comum',1,1,'Fritou, mas o cobre e as engrenagens valem algo.'],
    ['SUCATA DE PRÓTESES','Placa de Circuito Fritada','lucide:cpu',120,'comum',1,1,'Dá para reciclar o ouro dos contatos.'],
    ['SUCATA DE PRÓTESES','Bateria de Implante Vazada','lucide:battery-charging',200,'comum',1,1,'Líquido esquisito escorrendo. Manuseie com luvas.'],
    ['SUCATA DE PRÓTESES','Chip de Memória Rachado','lucide:hard-drive',500,'raro',1,1,'Pode ter dados recuperáveis. Um netrunner pagaria por isso.'],
    ['SUCATA DE PRÓTESES','Núcleo de Prótese Militar','lucide:battery-charging',2200,'experimental',1,1,'Tecnologia de uso restrito arrancada de um soldado. Procurado.'],
    ['ACHADOS EM CADÁVERES','Plaquinha de Identificação','🏷️',60,'comum',1,1,'Nome e número de série. Alguém ainda pode pagar para sumir com isso.'],
    ['ACHADOS EM CADÁVERES','Pertences de Cadáver','lucide:package',100,'comum',1,1,'Relógio, isqueiro e algumas moedas. O básico de quem saqueia.'],
    ['ACHADOS EM CADÁVERES','Ampola Não Identificada','lucide:syringe',400,'raro',1,1,'Sem rótulo. Boa para quem não faz perguntas.'],
    ['ACHADOS EM CADÁVERES','Implante Arrancado','lucide:brain',1200,'raro',1,1,'Sem garantia e sem manual. Ainda tem sangue seco nos conectores.'],
    ['ACHADOS EM CADÁVERES','Chave de Cofre Misteriosa','lucide:key-round',900,'raro',1,1,'Não se sabe qual cofre abre. Isso aumenta o preço.']
  ];
  var RAR = {
    comum:        {n:'COMUM',        c:'#22e6d2'},
    raro:         {n:'RARO',         c:'#8b5bff'},
    experimental: {n:'EXPERIMENTAL', c:'#ffb300'},
    proibido:     {n:'PROIBIDO',     c:'#ff3355'},
    custom:       {n:'PERSONALIZADO',c:'#46ff7a'}
  };


  /* ---------- TAMANHO E ÍCONE ESPECÍFICOS POR ITEM ----------
     Cada linha:  [regex do nome, largura, altura, ':nome-do-icone:', 'lucide:reserva']
       1) regex   -> nome do item (minúsculo, sem acento, sem sufixo Mk-II/III). A primeira regra que casar vence.
       2) largura e 3) altura -> casas na maleta.
       4) ÍCONE   -> ':nome:' = arquivo emojis/nome.png (ou .svg/.webp/.gif/.jpg). É AQUI que você escolhe a imagem do item:
                     coloque a imagem na pasta com esse nome, ou troque o nome por outro arquivo que você já tenha.
                     Também aceita um emoji normal (ex.: '\ud83c\udf55').
       5) ÍCONE ESTILIZADO (opcional) -> segundo ':nome:'. Ex.: [/^calmante/,1,1,':pill:',':pote:']
                     O 1º (SVG) é o ícone SIMPLES e o 2º (PNG) é o ESTILIZADO. Quem escolhe é a opção
                     "ESTILO DOS ÍCONES DE ITENS" em configuracoes.html. Se o PNG ainda não existir, mostra o simples.
       6) reserva -> ícone Lucide que aparece enquanto a imagem não existir (opcional; sem ele usa o ícone da categoria).
          Obs.: sem o 2º ':nome:', o Lucide continua na 5ª coluna, como sempre foi: [/^deck/,2,2,':deck:','lucide:laptop'] 
     Lista de todos os nomes de arquivo: nomes_dos_icones.txt */
  var SPECS = [
    /* armas de fogo */
    [/^pistola pulso/,2,1,':colt-m1911:',':pistola:'],      [/^viper-9/,2,1,':c96:',':viperr:'],
    [/^smg viper/,2,2,':cz-skorpion:',':smg:'],          [/^raptor/,2,2,':m3-grease-gun:',':x:'],
    [/^neon-ar/,4,2,':fn-fal:',':neo:'],            [/^volt-77/,3,2,':mp5k:',':volt:'],
    [/^specter$/,3,2,':famas:',':sili:'],           [/^lanca-granadas/,3,2,':missile-pod:',':laca:'],
    [/^titan-12/,4,2,':winchester-rifle:',':titan:'], [/^ghostline/,5,2,':steyr-aug:',':fuzil:'],
    [/^railgun/,5,2,':thompson-m1928:',':railtgun:'],    [/^m-3057/,4,2,':p90:',':m:'],
    [/^hawk-eye/,5,2,':lee-enfield:',':hawk:'], [/^smartgun/,4,2,':bolter-gun:',':plasma:'],
    [/^aegis rail/,6,2,':musket:',':foda:'],
    /* corpo a corpo */
    [/^cano de aco/,1,3,':aspergillum:',':bolas:'], [/^taco carbono/,1,3,':baseball-bat:',':golf:'],
    [/^marreta/,1,3,':gavel:',':mabola:'],         [/^maca sismica/,1,3,':flanged-mace:'],
    [/^faca/,1,2,':bowie-knife:',':fina:'],     [/^espada/,1,4,':croc-sword:',':pica:'],
    [/^bastao/,1,3,':spiked-bat:',':basebol:'],     [/^punho titan/,2,2,':mailed-fist:',':grount:'],
    [/^monolamina/,1,4,':energy-sword:',':ninja:'], [/^garras/,2,2,':steel-claws:',':garras:'],
    [/^lanca arc/,1,4,':broadhead-arrow:',':lanca:'], [/^machado/,2,3,':halberd:',':macha:'],
    [/^katana/,1,4,':katana:',':monoli:'],   [/^martelo/,2,3,':flat-hammer:',':lanca:',':mabola:'],
    [/^foice/,2,4,':reaper-scythe:',':forca:'],
    /* cura */
    [/^medspray/,1,2,':aerosol:',':blood:'], [/^stimpack/,1,1,':miracle-medecine:',':adrenalina:'],
    [/^trauma kit/,2,2,':defibrilate:',':militar:'], [/^autodoc/,1,1,':health-capsule:',':cura_um:'],
    [/^kit regeneracao/,2,1,':companion-cube:',':kit:'], [/^soro/,1,2,':love-injection:',':rebirt:'],
    [/^bandagem/,1,2,':bandage-roll:',':bandagem:'], [/^bolsa de plasma/,1,2,':medical-drip:',':blood:'],
    [/^injetor hemo/,1,2,':triple-needle:',':injetores:'], [/^nano-cura/,1,2,':caduceus:',':nano_drones:'],
    /* sobrecarga */
    [/^spray criogenico/,1,1,':snowflake-1:',':lit:'],  [/^ampola gelo/,1,1,':snowflake-1:',':ampola:'],
    [/^seringa anti-surto/,1,2,':love-injection:',':siringa_tec:'],  [/^cartucho pax/,1,1,':health-capsule:',':circuito:'],
    [/^coquetel ancora/,1,1,':miracle-medecine:',':coktel:'],  [/^kill switch/,1,1,':power-button:',':inalador:'],
    [/^calmante/,1,1,':pill:',':gomas_seila:'],  [/^adesivo dermico/,1,1,':bandage-roll:',':pulseira:'],
    [/^gomas/,1,1,':cool-spices:', ':gomas_em:'],[/^inalador/,1,1,':herbs-bundle:',':vape:'],
    /* armaduras */
    [/^colete/,2,2,':kevlar-vest:',':kevlar-vest:'],  [/^jaqueta/,2,3,':sleeveless-jacket:',':amarelo:'],
    [/^exo-rig/,3,3,':ribcage:'],    [/^escudo/,2,3,':bordered-shield:',':escudin:'],
    [/^carapaca/,3,2,':abdominal-armor:'],   [/^blindagem/,3,3,':shoulder-armor:'],
    [/^casaco blindado/,2,2,':scale-mail:',':hum:'], [/^armadura sentinel/,2,2,':breastplate:'],
    /* hacker */
    [/^deck/,2,2,':deck:','lucide:laptop'],    [/^sniffer/,1,1,':sniffer:','lucide:radio'],
    [/^virus/,1,1,':virus-item:','lucide:bug'],      [/^proxy/,1,1,':proxy:','lucide:globe'],
    [/^ice-breaker/,2,1,':ice-breaker:','lucide:cpu'], [/^backdoor/,1,1,':backdoor:','lucide:key-round'],
    /* implantes / próteses */
    [/^cyber arm/,1,3,':cyber-arm:','lucide:bot'], [/^servo-leg/,1,3,':servo-leg:','lucide:footprints'], [/^vector legs/,1,3,':vector-legs:','lucide:footprints'],
    [/^ossatura/,1,3,':ossatura:','lucide:bone'],  [/^hydra muscle/,1,2,':hydra-muscle:','lucide:dumbbell'],
    [/^colossus core/,2,2,':colossus-core:','lucide:battery-charging'], [/^ares frame/,2,2,':ares-frame:','lucide:battery-charging'], [/^kinetic core/,2,2,':kinetic-core:','lucide:battery-charging'],
    [/^punho graviton/,1,2,':punho-graviton:','lucide:hand'], [/^graviton fist/,1,2,':graviton-fist:','lucide:hand'], [/^titan grip/,1,2,':titan-grip:','lucide:hand'],
    [/^titan-04/,1,2,':titan-04:','lucide:dumbbell'],
    [/eyes?$/,1,1,':eyes:','lucide:scan-eye'], [/^eyescan/,1,1,':eyescan:','lucide:scan-eye'], [/ghost-eye/,1,1,':ghost-eye:','lucide:scan-eye'], [/^kiroshi/,1,1,':kiroshi:','lucide:scan-eye'], [/optical camo/,1,1,':optical-camo:','lucide:scan-eye'],
    [/^reactor heart/,1,1,':reactor-heart:','lucide:heart-pulse'], [/^nanite blood/,1,1,':nanite-blood:','lucide:droplet'],
    [/^datajack/,1,1,':datajack:','lucide:usb'], [/^synapse link/,1,1,':synapse-link:','lucide:usb'], [/^ghost chip/,1,1,':ghost-chip:','lucide:ghost'],
    [/^memory chip/,1,1,':memory-chip:','lucide:hard-drive'], [/^memory vault/,1,1,':memory-vault:','lucide:hard-drive'],
    [/^void skin/,2,2,':void-skin:','lucide:shield'], [/^pain editor/,1,1,':pain-editor:','lucide:pill'],
    [/^adrenal booster/,1,1,':adrenal-booster:','lucide:syringe'],
    [/^sandevistan/,1,1,':sandevistan:','lucide:zap'], [/^overclock/,1,1,':overclock:','lucide:zap'], [/^overdrive/,1,1,':overdrive:','lucide:zap'], [/^flash-step/,1,1,':flash-step:','lucide:zap'], [/^blink drive/,1,1,':blink-drive:','lucide:zap'], [/^ghost step/,1,1,':ghost-step:','lucide:zap'], [/^phantom step/,1,1,':phantom-step:','lucide:zap'],
    [/^neuroboost/,1,1,':neuroboost:','lucide:brain'], [/^synapse-7/,1,1,':synapse-7:','lucide:brain'], [/^tactician/,1,1,':tactician:','lucide:brain'], [/^quantum brain/,1,1,':quantum-brain:','lucide:brain'], [/^ghost brain/,1,1,':ghost-brain:','lucide:brain'], [/^neuro accelerator/,1,1,':neuro-accelerator:','lucide:brain'], [/^nexus/,1,1,':nexus:','lucide:brain'],
    /* implantes de suporte e netrunner (habilidades com alvo) */
    [/^medic daemon/,1,1,':medic-daemon:','lucide:heart-pulse'], [/^pulse aura/,1,1,':pulse-aura:','lucide:radio'],
    [/^stim injector/,1,1,':stim-injector:','lucide:syringe'],    [/^aegis link/,1,1,':aegis-link:','lucide:shield-plus'],
    [/^purge protocol/,1,1,':purge-protocol:','lucide:sparkles'],  [/^second wind core/,1,1,':second-wind-core:','lucide:heart-handshake'],
    [/^inferno script/,1,1,':inferno-script:','lucide:flame'],     [/^toxin worm/,1,1,':toxin-worm:','lucide:skull'],
    [/^arc surge/,1,1,':arc-surge:','lucide:zap'],            [/^mind spike/,1,1,':mind-spike:','lucide:brain-circuit'],
    [/^fork bomb/,1,1,':fork-bomb:','lucide:git-fork'],       [/^blackout virus/,1,1,':blackout-virus:','lucide:eye-off'],
    [/^puppeteer/,1,1,':puppeteer:','lucide:drama'],
    /* outros: granadas e equipamento tático */
    [/^granada de fumaca/,1,1,':flash-grenade:',':smoke:'], [/^granada flash/,1,1,':stun-grenade:',':flash:'],
    [/^granada de fragmentacao/,1,1,':grenade:',':flag:'], [/^granada incendiaria/,1,1,':molotov:',':ind:'],
    [/^granada emp/,1,1,':stick-grenade:',':emp:'],             [/^granada de gas/,1,1,':smoke-bomb:',':veneno:'],
    [/^municao perfurante/,1,1,':ammo-box:',':mini:'],   [/^gancho magnetico/,1,2,':grapple:',':corda:'],
    [/^kit de reparo/,2,1,':toolbox:',':kit_reparo:'],        [/^barreira cinetica/,2,2,':shieldcomb:',':escudo:'],
    [/^drone isca/,1,1,':delivery-drone:',':drone_dois:'],              [/^projetor holografico/,1,1,':morph-ball:',':tesaunfia:'],
    [/^mina magnetica/,2,1,':land-mine:',':mina:'],       [/^torreta/,2,2,':sentry-gun:',':torreta:'],
    /* itens que ainda não tinham regra: agora cada um tem seu :nome: (tamanho = padrão da categoria; sem imagem usa o ícone da categoria) */
    [/^takoyaki/,1,1,'🥮',':takochi:'], [/^kebab/,1,1,'🌯',':kebab:'],
    [/^cafe preto/,1,1,'☕',':cafe:'], [/^sintwhisky/,1,1,'💊',':tarja_preta:'],
    /* comida */
    [/^pizza/,2,2,'\ud83c\udf55', ':pizz:'],  [/^synthburger/,1,1,'\ud83c\udf54',':ham:'],
    [/^ramen/,1,1,'\ud83c\udf5c',':ramen:'],  [/^batata/,1,1,'\ud83c\udf5f',':batata:'],
    [/^guarana/,1,2,'\ud83e\udd64',':bebida:'], [/^scop/,1,2,'\ud83e\udd43',':scop:'],
    [/^sushi/,1,1,'\ud83c\udf63',':shushi:'],  [/^refresco/,1,2,'\ud83e\uddc3',':papel:'],
    [/^chocolate/,1,1,'\ud83c\udf6b',':choco:'], [/^sabor fantasma/,1,1,'\ud83d\udc7b',':fantasma:']
  ];
  /* ---------- ÍCONE PERSONALIZÁVEL EM TODO ITEM ----------
     Todo item tem um :nome: (veja a 4ª coluna do SPECS). Para trocar o ícone dele, é só colocar
     emojis/nome.png (ou .svg/.webp/.gif/.jpg) — sem editar código. Enquanto a imagem não existir,
     aparece o ícone Lucide "reserva" (5ª coluna do SPECS; sem ela, o ícone da categoria). */
  /* estilo dos ícones (configuracoes.html): 'simples' (1º :nome:) ou 'estilizado' (2º :nome:, quando a linha tiver) */
  var ESTILO = (function(){ try{ return (JSON.parse(localStorage.getItem('s7_config')||'null')||{}).iconeEstilo==='estilizado' ? 'estilizado' : 'simples'; }catch(e){ return 'simples'; } })();
  SPECS.forEach(function(r){ r.alt = ''; if(typeof r[4]==='string' && /^:[a-z][a-z0-9_-]{0,31}:$/i.test(r[4].trim())){ r.alt = r[4].trim(); r[4] = r[5] || ''; } });
  var FB = {};
  var LU_CAT = {arma:'crosshair',corpo:'sword',cura:'syringe',sanidade:'pill',armadura:'shield',hacker:'terminal',implante:'brain',protese:'bot',comida:'utensils',outro:'package',lixo:'bone'};
  function emoName(s){ var m = /^:([a-z][a-z0-9_-]{0,31}):$/i.exec(String(s||'').trim()); return m ? m[1].toLowerCase() : ''; }
  SPECS.forEach(function(r){
    var n = emoName(r[3]), a = emoName(r.alt);
    if(n && r[4]) FB[n] = r[4];
    if(a && a !== n) FB[a] = r[3];   /* (se alt == principal, não aponta para si mesmo: dava loop infinito no iconHTML) */     /* PNG estilizado ausente -> cai no ícone simples (SVG), e só depois no Lucide */
  });
  function slugNome(nome){
    var t = normNome(nome).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    if(t.length > 31) t = t.slice(0,31).replace(/-[^-]*$/,'') || t.slice(0,31);
    return /^[a-z]/.test(t) ? t : 'i-'+t.slice(0,29);
  }
  /* LIXO: ícone Lucide vira :nome-do-item: (o Lucide antigo fica de reserva) */
  LIXO.forEach(function(r){
    var m = /^lucide:([a-z0-9-]+)$/i.exec(r[2]||'');
    if(m){ var n = slugNome(r[1]); FB[n] = 'lucide:'+m[1]; r[2] = ':'+n+':'; }
  });
  /* ícone Lucide de reserva para um :nome: (o do item, ou o da categoria) */
  function fb(icone, cat){
    var n = emoName(icone);
    if(n && FB[n]) return FB[n];
    return 'lucide:' + (LU_CAT[cat] || 'package');
  }

  function normNome(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+mk-?(i{1,3}|iv|v)$/,'').replace(/\s*\(.*\)\s*$/,'').trim();
  }
  /* devolve {w,h,icone} do item pelo nome, ou null se não houver regra */
  function spec(nome){
    var n = normNome(nome);
    for(var i=0;i<SPECS.length;i++){
      if(SPECS[i][0].test(n)){
        var r = SPECS[i];
        return {w:r[1], h:r[2], icone:(ESTILO==='estilizado' && r.alt) ? r.alt : r[3], prim:r[3], alt:r.alt, fb:r[4]||''};
      }
    }
    return null;
  }

  /* cor de exibição: a personalizada, ou a da raridade */
  function cor(it){ return it.cor || RAR[it.raridade].c; }

  /* ícone: emoji, ou 'lucide:nome' (usa a biblioteca Lucide; sem ela cai no emoji da categoria) */
  function isLu(s){ return /^lucide:[a-z0-9-]+$/i.test(s||''); }
  function iconHTML(icone, cat, depth){
    if(typeof icone==='string' && icone.indexOf('lucide::')===0) icone = icone.slice(7);
    if(isLu(icone)){
      if(window.lucide) return '<i data-lucide="'+icone.slice(7).toLowerCase()+'"></i>';
      return (CATS[cat]||CATS.outro).ico;
    }
    var out = String(icone==null?'':icone).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
    /* :nome: -> imagem da pasta emojis/. Se a imagem ainda não carregou (ou não existe), mostra o ícone reserva
       dentro de <span class="emo-fb">; o emojis.js troca pela imagem assim que ela existir. */
    if(window.S7EMO && S7EMO.is(icone)){
      if((depth||0) > 3) return (CATS[cat]||CATS.outro).ico;   /* segurança: cadeia de ícones reserva em ciclo */
      var nm = emoName(icone);
      if(S7EMO.url && S7EMO.url(nm)) return S7EMO.html(out);
      return '<span class="emo-fb" data-emo="'+nm+'">'+iconHTML(fb(icone,cat), cat, (depth||0)+1)+'</span>';
    }
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
    var sp2 = (it.icone && it.nome) ? spec(it.nome) : null;   /* item salvo com o ícone simples/estilizado da regra: segue o estilo escolhido */
    var ic2 = (sp2 && sp2.alt && (it.icone===sp2.prim || it.icone===sp2.alt)) ? sp2.icone : '';
    return {
      id: it.id || uid(), nome: String(it.nome||'Item sem nome'), cat: cat, raridade: rar,
      desc: String(it.desc||''), efeito: String(it.efeito||''), icone: String(ic2||it.icone||dI),
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
    d.v = 3;
    d.cols = num(d.cols,8,MIN_COLS,MAX_COLS);
    d.rows = num(d.rows,6,MIN_ROWS,MAX_ROWS);
    d.items = Array.isArray(d.items) ? d.items.map(clean) : [];
    d.modelos = Array.isArray(d.modelos) ? d.modelos.map(clean) : [];
    if(v0 && v0 < 2) migrar(d);
    if(v0 && v0 < 3) migrar3(d);
    return d;
  }

  /* v2 -> v3: itens que ainda estão com o ícone Lucide ANTIGO (o da regra ou o da categoria) passam a usar o :nome: do item.
     Quem já trocou o ícone na mão não é mexido. */
  function migrar3(d){
    var mudou = false;
    d.items.forEach(function(it){
      var sp = spec(it.nome), c = CATS[it.cat], novo = '', velho = [];
      if(sp && emoName(sp.icone)){ novo = sp.icone; velho = [sp.fb, 'lucide:'+c.lu]; }
      else if(it.cat==='lixo'){
        LIXO.forEach(function(r){ if(r[1]===it.nome && emoName(r[2])){ novo = r[2]; velho = [FB[emoName(r[2])]]; } });
      }
      if(novo && velho.indexOf(it.icone) >= 0){ it.icone = novo; mudou = true; }
    });
    if(mudou) save(d);
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
      case 'outros': return 'outro';
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
  var SHARE = ['nome','cat','raridade','icone','desc','efeito','w','h','qtd','cor','preco'];
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

  /* ---------- ATUALIZAR ITENS ----------
     Põe os itens da maleta em dia com as regras atuais (SPECS/LIXO) e com o catálogo da loja:
       ícone (segue o estilo simples/estilizado), tamanho (só se ainda for o padrão da categoria),
       raridade, descrição e efeito (só quem tem o mesmo nome no catálogo).
     Não mexe em: quantidade, dono, cor, preço, posição (a não ser que o novo tamanho não caiba). */
  function iconeAtual(it){
    var sp = spec(it.nome);
    if(sp && sp.icone) return sp.icone;
    if(it.cat === 'lixo'){
      var n = String(it.nome||'').trim().toLowerCase(), novo = '';
      LIXO.forEach(function(r){ if(!novo && String(r[1]).toLowerCase() === n && r[2]) novo = r[2]; });
      return novo;
    }
    return '';
  }
  function atualizar(d){
    var r = {itens:0, icone:0, tam:0, dados:0}, cat = window.S7CATALOGO || [], soltos = [];
    d.items.forEach(function(it){
      var mudou = false, ic = iconeAtual(it), c = CATS[it.cat];
      if(ic && it.icone !== ic){ it.icone = ic; r.icone++; mudou = true; }
      var sp = spec(it.nome);
      if(sp && c && it.w===c.w && it.h===c.h){
        var w = Math.min(sp.w, MAX_COLS), h = Math.min(sp.h, MAX_ROWS);
        if(w!==it.w || h!==it.h){
          it.w = w; it.h = h; r.tam++; mudou = true;
          if(it.x!==null && !fits(d, it.id, it.x, it.y, it.w, it.h)){ it.x = null; it.y = null; soltos.push(it); }
        }
      }
      var n = String(it.nome||'').trim().toLowerCase(), cg = cat.filter(function(x){ return String(x.nome).toLowerCase()===n; })[0];
      if(cg){
        var dd = false;
        if(RAR[cg.raridade] && it.raridade !== cg.raridade){ it.raridade = cg.raridade; dd = true; }
        if(cg.desc && it.desc !== cg.desc){ it.desc = cg.desc; dd = true; }
        if(cg.efeito && it.efeito !== cg.efeito){ it.efeito = cg.efeito; dd = true; }
        if(dd){ r.dados++; mudou = true; }
      }
      if(mudou) r.itens++;
    });
    (d.modelos || []).forEach(function(m){ var ic = iconeAtual(m); if(ic && m.icone !== ic){ m.icone = ic; r.icone++; } });
    soltos.forEach(function(it){ place(d, it); });
    r.soltos = soltos.filter(function(it){ return it.x===null; }).length;
    if(r.itens || r.icone) save(d);
    return r;
  }

  /* ---------- BASE (depósito) ----------
     Lista simples de itens guardados na base, chave 's7_base_itens'. Sem grade e sem dono. */
  var BKEY = 's7_base_itens';
  function baseLoad(){
    var l; try{ l = JSON.parse(localStorage.getItem(BKEY)||'[]'); }catch(e){ l = []; }
    return (Array.isArray(l) ? l : []).map(function(it){ var c = clean(it); c.x = null; c.y = null; c.owner = ''; return c; });
  }
  function baseSave(l){ try{ localStorage.setItem(BKEY, JSON.stringify(l)); return true; }catch(e){ return false; } }
  /* maleta -> base. Devolve quantos itens foram enviados (0 se não deu para salvar). */
  function paraBase(d, ids){
    var mover = d.items.filter(function(i){ return ids.indexOf(i.id) >= 0; });
    if(!mover.length) return 0;
    var base = baseLoad();
    mover.forEach(function(it){
      var c = clean(it); c.x = null; c.y = null; c.owner = '';
      if(CATS[c.cat].stack){
        var o = base.filter(function(b){ return b.cat===c.cat && b.nome===c.nome; })[0];
        if(o){ o.qtd = Math.min(999, o.qtd + c.qtd); return; }
      }
      base.push(c);
    });
    if(!baseSave(base)) return 0;
    d.items = d.items.filter(function(i){ return ids.indexOf(i.id) < 0; });
    save(d);
    return mover.length;
  }
  /* base -> maleta. Itens que não cabem ficam na base. */
  function daBase(d, ids){
    var base = baseLoad(), ficam = [], r = {ok:0, falhou:0};
    base.forEach(function(b){
      if(ids.indexOf(b.id) < 0){ ficam.push(b); return; }
      var raw = JSON.parse(JSON.stringify(b)); raw.id = '';
      var it = add(d, raw);
      if(it.x === null){ d.items = d.items.filter(function(i){ return i !== it; }); r.falhou++; ficam.push(b); }
      else r.ok++;
    });
    if(r.ok){ baseSave(ficam); save(d); }
    return r;
  }

  window.S7INV = {
    KEY:KEY, CATS:CATS, RAR:RAR, LIXO:LIXO, MAX_ROWS:MAX_ROWS, MAX_COLS:MAX_COLS, MIN_ROWS:MIN_ROWS, MIN_COLS:MIN_COLS,
    cor:cor, isLu:isLu, iconHTML:iconHTML, catIcon:catIcon, lucideRefresh:lucideRefresh, load:load, save:save, fits:fits, place:place, add:add, clean:clean, uid:uid,
    atualizar:atualizar, BKEY:BKEY, baseLoad:baseLoad, baseSave:baseSave, paraBase:paraBase, daBase:daBase, guessCat:guessCat, estilo:ESTILO, spec:spec, SPECS:SPECS, fb:fb, FB:FB, slugNome:slugNome, addFromLoja:addFromLoja, fichas:fichas, encode:encode, decode:decode
  };
})();