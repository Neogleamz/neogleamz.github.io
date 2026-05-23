import re

with open('assets/js/system-event-delegator.js', 'r', encoding='utf-8') as f:
    sed = f.read()
    
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all 'NeogleamzApp.toggleModal(X)' or similar in sed
# we can look for any modal IDs hardcoded in sed
modal_ids_in_sed = set(re.findall(r'toggleModal\([\'"]([a-zA-Z0-9_-]+)[\'"]\)', sed))
# also check for .style.display = 'flex' for modals
display_matches = re.findall(r'document\.getElementById\([\'"]([a-zA-Z0-9_-]+[mM]odal[a-zA-Z0-9_-]*)[\'"]\)\.style\.display', sed)
modal_ids_in_sed.update(display_matches)

# find functions that trigger these modals
triggers = []
for mid in modal_ids_in_sed:
    # find where this mid is referenced
    m = re.search(r'(click_[a-zA-Z0-9_]+):\s*(?:=>|function).*?[\'"]' + mid + r'[\'"]', sed, re.DOTALL)
    if m:
        triggers.append((m.group(1), mid))

# For any click handler found, let's find the button and its pane
results = []
for click_fn, mid in triggers:
    # Find button in HTML
    btn_m = re.search(r'<[^>]*data-click="' + click_fn + r'"[^>]*>(.*?)</[^>]+>', html, re.DOTALL)
    if btn_m:
        text = re.sub(r'<[^>]+>', '', btn_m.group(1)).strip()
        
        # Find which pane it's in
        idx = html.find(btn_m.group(0))
        pane_chunk = html[:idx][::-1]
        pane_m = re.search(r'id="(pane[a-zA-Z0-9_]+|[^"]*HubLanding)"', pane_chunk)
        pane = pane_m.group(1)[::-1] if pane_m else "Global"
        
        # Find modal title
        title = mid
        mid_idx = html.find(f'id="{mid}"')
        if mid_idx != -1:
            chunk = html[mid_idx:mid_idx+800] 
            h_match = re.search(r'<h[234][^>]*>(.*?)</h[234]>', chunk, re.DOTALL)
            if h_match:
                title = re.sub(r'<[^>]+>', '', h_match.group(1)).strip()
                
        results.append(f"{pane} | {mid} ({title}) | {click_fn} | {text}")

with open('modals_trace.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
