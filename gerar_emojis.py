# Lê a pasta emojis/ e gera emojis/lista.js (os emojis aparecem clicáveis no inventário).
# Rode de novo sempre que colocar/tirar imagens:  python3 gerar_emojis.py
import os, re, json, sys
pasta = sys.argv[1] if len(sys.argv) > 1 else 'emojis'
ext = ('.png', '.svg', '.webp', '.gif', '.jpg', '.jpeg')
nomes, ruins = [], []
for f in sorted(os.listdir(pasta)):
    n, e = os.path.splitext(f)
    if e.lower() not in ext: continue
    if re.fullmatch(r'[a-z][a-z0-9_-]{0,31}', n): nomes.append(n)
    else: ruins.append(f)
open(os.path.join(pasta, 'lista.js'), 'w', encoding='utf-8').write(
    '/* gerado por gerar_emojis.py */\nwindow.S7EMOJIS = ' + json.dumps(sorted(set(nomes)), ensure_ascii=False) + ';\n')
print(len(set(nomes)), 'emojis')
if ruins: print('IGNORADOS (renomeie: minúsculas, números, - e _; começa com letra):', ', '.join(ruins))
