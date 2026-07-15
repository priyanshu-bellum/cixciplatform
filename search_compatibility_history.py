import json
import os
import glob

brain_dir = r'C:\Users\dell\.gemini\antigravity\brain'

for conv_id in os.listdir(brain_dir):
    log_path = os.path.join(brain_dir, conv_id, '.system_generated', 'logs', 'overview.txt')
    if os.path.exists(log_path):
        with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if '"source":"USER_EXPLICIT"' in line or '"source":"USER"' in line:
                    try:
                        data = json.loads(line)
                        content = data.get('content', '')
                        if 'compatibility' in content.lower() and ('seo' in content.lower() or 'missing' in content.lower()):
                            print(f"CONV {conv_id} STEP {data.get('step_index')}: {content}")
                    except Exception as e:
                        pass
