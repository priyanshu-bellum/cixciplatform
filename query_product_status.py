import os

targets = ["ssh", "gcloud compute", "35."]
for root, dirs, files in os.walk('.'):
    if any(x in root for x in ['node_modules', '.git', 'venv', '.gemini', '__pycache__']):
        continue
    for file in files:
        if file.endswith('.md') or file.endswith('.sh') or file.endswith('.txt'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                for idx, line in enumerate(f, 1):
                    for target in targets:
                        if target in line.lower():
                            print(f"{path}:{idx}: {line.strip()}")
                            break
