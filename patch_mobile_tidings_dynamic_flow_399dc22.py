from pathlib import Path
import subprocess
import shutil

ROOT = Path.cwd()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

head = git('rev-parse', 'HEAD')
if not head.startswith('399dc22'):
    raise SystemExit(f'STOP: expected current commit 399dc22, but HEAD is {head[:12]}.\nNo files were changed.')

ticker = ROOT / 'components' / 'tidings' / 'tidings-ticker.tsx'
layout = ROOT / 'app' / '(portal)' / 'layout.tsx'

ticker_text = ticker.read_text(encoding='utf-8')
layout_text = layout.read_text(encoding='utf-8')

old_footer = '    <footer\n      role="status"\n      aria-live="polite"\n      aria-label="Tidings"\n'
new_footer = '    <footer\n      data-tidings-ticker="true"\n      role="status"\n      aria-live="polite"\n      aria-label="Tidings"\n'
if old_footer not in ticker_text:
    raise SystemExit('Could not find Tidings footer. No files changed.')
ticker_text = ticker_text.replace(old_footer, new_footer, 1)

anchor = '              .sepulchria-viewport-body [data-portal-scroll] {\n                scrollbar-width: thin;\n                scrollbar-color: rgb(var(--sep-colour-5c472f)) transparent;\n              }\n'

rule = '              /* MOBILE + TIDINGS: only while ticker exists */\n              @media (max-width: 1023px) {\n                [data-portal-shell-inner]:has([data-tidings-ticker="true"]) [data-portal-centre-host] > main[data-portal-column] {\n                  overflow-y: auto !important;\n                  overflow-x: visible !important;\n                  overscroll-behavior-y: contain;\n                }\n              }\n\n'

if anchor not in layout_text:
    raise SystemExit('Could not find layout CSS anchor. No files changed.')
layout_text = layout_text.replace(anchor, rule + anchor, 1)

shutil.copy2(ticker, ticker.with_suffix('.tsx.before_mobile_tidings_flow.bak'))
shutil.copy2(layout, layout.with_suffix('.tsx.before_mobile_tidings_flow.bak'))

ticker.write_text(ticker_text, encoding='utf-8')
layout.write_text(layout_text, encoding='utf-8')

print('DONE')
print('When Tidings is present: mobile centre is bounded above it.')
print('When Tidings is absent: original mobile overflow behaviour returns.')
print('Run: npm run build')
