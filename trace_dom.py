import sys

def trace_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    depth = 0
    in_app_container = False
    
    for i, line in enumerate(lines):
        line_num = i + 1
        
        # Start tracking from app-container
        if 'class="app-container"' in line:
            in_app_container = True
            print(f"[{line_num}] START APP-CONTAINER")
            
        if not in_app_container:
            continue
            
        # Count divs
        opens = line.count('<div')
        closes = line.count('</div')
        
        for _ in range(opens):
            depth += 1
            if 'id="salezhub-tab"' in line or 'id="ceoContent"' in line or 'id="synchub-tab"' in line:
                print(f"[{line_num}] {'  ' * depth} OPEN (Depth: {depth}): {line.strip()}")
                
        for _ in range(closes):
            if depth == 1:
                print(f"[{line_num}] APP-CONTAINER CLOSED AT LINE {line_num}!")
                return
            depth -= 1

trace_html('index.html')
