import os

log_path = r'C:\Users\dell\.gemini\antigravity\brain\fc4f5e67-2f4d-416d-a01f-45c210046225\.system_generated\logs\overview.txt'
with open(log_path, errors='ignore') as f:
    lines = f.readlines()

for idx in range(1490, 1530):
    if idx < len(lines):
        print(f"Line {idx}: {lines[idx].strip()[:300]}")
