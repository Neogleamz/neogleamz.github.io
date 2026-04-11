import os
import glob

rules_dir = r"c:\Users\Chriviper\OneDrive - Neogleamz\Accounting - General\Expenses\GitHub\neogleamz.github.io\.agents\rules"
output_file = r"c:\Users\Chriviper\OneDrive - Neogleamz\Accounting - General\Expenses\GitHub\neogleamz.github.io\.agents\scratch\rules_audit_raw.md"

md_files = glob.glob(os.path.join(rules_dir, "*.md"))

with open(output_file, 'w', encoding='utf-8') as outfile:
    for idx, filepath in enumerate(md_files):
        filename = os.path.basename(filepath)
        
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        lines = content.split('\n')
        
        # extract first non-empty lines, skipping frontmatter
        start_idx = 0
        if lines and lines[0].strip() == '---':
            for i in range(1, len(lines)):
                if lines[i].strip() == '---':
                    start_idx = i + 1
                    break
                    
        # Get first 15 lines of actual content
        preview_lines = []
        count = 0
        for line in lines[start_idx:]:
            if line.strip() != "":
                preview_lines.append(line)
                count += 1
            if count >= 10:
                break
                
        outfile.write(f"### {idx+1}. {filename}\n")
        outfile.write("```markdown\n")
        outfile.write("\n".join(preview_lines))
        outfile.write("\n```\n\n")

print(f"Audit dumped to {output_file}")
