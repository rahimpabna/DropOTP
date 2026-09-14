import urllib.request
import json

url = "https://dropotp.com/api/auth/register"
payload = json.dumps({
    "email": "rahimpc2023@gmail.com", # Note: will test duplicate or generate new
    "username": "rahim_test_brand",
    "password": "Password123!"
}).encode('utf-8')

req = urllib.request.Request(
    url,
    data=payload,
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        print("Response:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
