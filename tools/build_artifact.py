"""Crea la versione in un solo file HTML da pubblicare come Artifact di claude.ai (la copia privata nella chat).
Uso: python3 tools/build_artifact.py /percorso/di/uscita.html
Differenze dalla versione del sito: niente viewport-fit=cover (lo spazio dell'orologio lo gestisce l'app di Claude),
niente service worker e niente GoatCounter (gli <script> di index.html vengono tolti)."""
import re, sys, os

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FILES = ['names.js', 'nations.js', 'events.js', 'events_extra.js', 'traits.js', 'tuning.js', 'records_data.js', 'art.js', 'game.js']

idx = open(os.path.join(D, 'index.html'), encoding='utf-8').read()
body = idx[idx.index('<body'):]
body = body[body.index('>') + 1:]
body = re.sub(r'<script.*?</script>', '', body, flags=re.S).replace('</body>', '').replace('</html>', '')
js = ''.join('<script>\n' + open(os.path.join(D, f), encoding='utf-8').read() + '\n</script>\n' for f in FILES)
css = open(os.path.join(D, 'style.css'), encoding='utf-8').read()
html = f'''<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Hoop Agent</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" rel="stylesheet">
<style>{css}</style></head><body>{body}{js}</body></html>'''
out = sys.argv[1] if len(sys.argv) > 1 else 'hoop-agent.html'
open(out, 'w', encoding='utf-8').write(html)
print('scritto', out, round(len(html) / 1024), 'KB')
