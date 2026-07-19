import requests
import json

base_url = "https://testnew.cixci.com/api/v1"

# 1. Login
login_url = f"{base_url}/auth/login/"
payload = {
    "email": "peter@test.com",
    "password": "peter1234"
}
response = requests.post(login_url, json=payload)
if response.status_code != 200:
    print(f"Login failed: {response.status_code}")
    exit(1)

data = response.json()
access_token = data.get("access")
headers = {
    "Authorization": f"Bearer {access_token}"
}

# 2. Get Devices
devices_url = f"{base_url}/devices/devices/?limit=1000"
response = requests.get(devices_url, headers=headers)
if response.status_code != 200:
    print(f"Failed to fetch devices: {response.status_code}")
    exit(1)

devices_data = response.json()
results = devices_data.get("results", devices_data)
if isinstance(results, dict):
    results = results.get("results", [])

print(f"Fetched {len(results)} devices:")
plus_devices = [d for d in results if "+" in d.get("name", "")]
print(f"Found {len(plus_devices)} devices with '+' in their names:")
for d in plus_devices:
    print(f"ID: {d.get('id')}, Name: {d.get('name')}")
