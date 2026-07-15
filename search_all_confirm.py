import re

log_path = r'C:\Users\dell\.gemini\antigravity\brain\22e9de43-0287-4819-a424-17c30a10c77c\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'instance-' in line and ('cixci' in line or 'cd ' in line or 'git ' in line or 'ls' in line):
            print(line[:300])
