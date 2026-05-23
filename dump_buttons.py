import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

out = []
matches = re.finditer(r'<([^>]+)data-click="([^"]+)"[^>]*>(.*?)</\1>', html, re.DOTALL)
for m in matches:
    tag = m.group(1).split()[0]
    click = m.group(2)
    # limit inner text to 50 chars and strip html
    text = re.sub(r'<[^>]+>', '', m.group(3)).strip()
    if len(text) > 50: text = text[:50] + "..."
    # Find closest parent with id starting with pane or HubLanding
    idx = m.start()
    pane_chunk = html[:idx][::-1]
    pane_m = re.search(r'id="(pane[a-zA-Z0-9_]+|[^"]*HubLanding)"', pane_chunk)
    pane = pane_m.group(1)[::-1] if pane_m else "Global"
    
    out.append(f"{pane} | {click} | {text}")

with open('all_buttons.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
