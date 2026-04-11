import os

rules_dir = r"c:\Users\Chriviper\OneDrive - Neogleamz\Accounting - General\Expenses\GitHub\neogleamz.github.io\.agents\rules"
output_file = r"c:\Users\Chriviper\OneDrive - Neogleamz\Accounting - General\Expenses\GitHub\neogleamz.github.io\.agents\scratch\all_rules_dump.txt"

with open(output_file, 'w', encoding='utf-8') as outfile:
    for filename in os.listdir(rules_dir):
        if filename.endswith(".md"):
            filepath = os.path.join(rules_dir, filename)
            outfile.write(f"\n{'='*50}\nFILE: {filename}\n{'='*50}\n")
            with open(filepath, 'r', encoding='utf-8') as infile:
                outfile.write(infile.read())
                
print(f"Dumped all rules to {output_file}")
