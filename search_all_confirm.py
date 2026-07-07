import os

for root, dirs, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, encoding='utf-8') as f:
                for i, line in enumerate(f):
                    if 'confirm' in line.lower():
                        print(f"{path}:{i+1}: {line.strip()}")
