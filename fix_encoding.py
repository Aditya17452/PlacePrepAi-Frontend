import os

replacements = {
    'Â·': '·',
    'â€“': '-',
    'â€¦': '...',
    'Â©': '©',
    'â€™': "'",
    'â€œ': '"',
    'â€ ': '"'
}

def fix_encoding(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    for bad, good in replacements.items():
                        new_content = new_content.replace(bad, good)
                    
                    if new_content != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f'Fixed {path}')
                except Exception as e:
                    print(f'Error reading {path}: {e}')

fix_encoding('src')
