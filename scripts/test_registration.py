import urllib.request
import json

url = "https://dropotp.com/api/auth/register"
payload = json.dumps({
    "email": "verify_test_demo@example.org",
    "username": "verify_test_user_99",
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
