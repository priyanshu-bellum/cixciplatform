import json

log_path = r'C:\Users\dell\.gemini\antigravity\brain\c5299cdf-cdd1-4a1b-ad70-16d20c250624\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if '"source":"USER_EXPLICIT"' in line or '"source":"USER"' in line:
            try:
                data = json.loads(line)
                content = data.get('content', '')
                if any(kw in content for kw in ['cd', 'git', 'docker', 'rsync', 'srv', 'bash', 'root@', '/srv/']):
                    print(f"STEP {data.get('step_index')}: {content}")
            except Exception as e:
                pass
