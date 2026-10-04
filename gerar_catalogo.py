# Lê ARMA-ZENADS.html e gera catalogo.js (catálogo da loja para o inventário).
# Rode de novo sempre que mudar itens/preços na loja:  python3 gerar_catalogo.py
import json, re, sys
from bs4 import BeautifulSoup
src = sys.argv[1] if len(sys.argv) > 1 else 'ARMA-ZENADS.html'
soup = BeautifulSoup(open(src, encoding='utf-8').read(), 'html.parser')
out = []
pulados = []
for sec in soup.find_all('section'):
    sid = sec.get('id')
    if sid == 'sobrecarga': continue
    melee = False
    for el in sec.find_all(True):
        cls = el.get('class') or []
        if 'grp-sub' in cls:
            melee = 'LÂMINAS' in el.get_text().upper()
        elif 'card' in cls and el.find('h3'):
            tags = el.select('.tag')
            if not tags: continue
            rar = ([c for c in tags[-1].get('class') if c != 'tag'] or ['comum'])[0]
            tag = tags[0].get_text(strip=True) if len(tags) > 1 else ''
            btn = el.find('button', class_='btn')
            m = re.search(r"addToCart\('((?:[^'\\]|\\.)*)',(\d+)", btn.get('onclick', '')) if btn else None
            if not m:
                pulados.append(el.find('h3').get_text(strip=True)); continue
            d = el.select_one('.wpn-dmg')
            ef = ''
            if d:
                b = d.find('b'); lab = b.get_text(strip=True) if b else ''
                ef = (lab + ' ' + d.get_text(' ', strip=True).replace(lab, '', 1).strip()).strip()
            ic = el.select_one('.imp-crit')
            if ic: ef += ' · ' + ic.get_text(' ', strip=True)
            mb = el.select_one('.imp-meta')
            mbs = [x.get_text(strip=True) for x in mb.find_all('b')] if mb else []
            p = el.find('p')
            out.append({'nome': m.group(1).replace("\\'", "'"), 'preco': int(m.group(2)), 'sec': sid,
                        'melee': melee, 'tag': tag, 'raridade': rar,
                        'desc': p.get_text(strip=True) if p else '', 'efeito': ef,
                        'slot': mbs[0] if len(mbs) > 0 else '', 'afin': mbs[1] if len(mbs) > 1 else '',
                        'alvo': el.get('data-alvo', ''), 'status': el.get('data-status', '')})
open('catalogo.js', 'w', encoding='utf-8').write(
    '/* catalogo.js — gerado por gerar_catalogo.py a partir da loja */\nwindow.S7CATALOGO = ' +
    json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out), 'itens')
if pulados: print('PULADOS (sem addToCart reconhecido):', ', '.join(pulados))