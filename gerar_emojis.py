# Lê a pasta emojis/ (e TODAS as subpastas) e gera emojis/lista.js.
# Rode de novo sempre que colocar/tirar/mover imagens:  python3 gerar_emojis.py
# O :nome: é só o nome do arquivo, SEM a pasta: emojis/estilizados/pote.png  ->  :pote:
import os, re, json, sys
pasta = sys.argv[1] if len(sys.argv) > 1 else 'emojis'
ext = ('.png', '.svg', '.webp', '.gif', '.jpg', '.jpeg')
dirs, ruins, dups = {}, [], []
for raiz, subs, arqs in os.walk(pasta):
    subs.sort()
    rel = os.path.relpath(raiz, pasta).replace(os.sep, '/')
    rel = '' if rel == '.' else rel
    for f in sorted(arqs):
        n, e = os.path.splitext(f)
        if e.lower() not in ext: continue
        if not re.fullmatch(r'[a-z][a-z0-9_-]{0,31}', n):
            ruins.append((rel + '/' if rel else '') + f); continue
        if n in dirs:
            if dirs[n] != rel: dups.append('%s (usa "%s", ignorou "%s")' % (n, dirs[n] or 'raiz', rel or 'raiz'))
            continue
        dirs[n] = rel          # a raiz é lida primeiro, então ela ganha de uma subpasta com o mesmo nome
nomes = sorted(dirs)
mapa = {n: d for n, d in sorted(dirs.items()) if d}     # só os que estão em subpasta
open(os.path.join(pasta, 'lista.js'), 'w', encoding='utf-8').write(
    '/* gerado por gerar_emojis.py */\nwindow.S7EMOJIS = ' + json.dumps(nomes, ensure_ascii=False) +
    ';\nwindow.S7EMOJIS_DIR = ' + json.dumps(mapa, ensure_ascii=False) + ';\n')
print(len(nomes), 'emojis,', len(mapa), 'em subpastas')
if ruins: print('IGNORADOS (renomeie: minúsculas, números, - e _; começa com letra):', ', '.join(ruins))
if dups: print('NOMES REPETIDOS em pastas diferentes:', '; '.join(dups))