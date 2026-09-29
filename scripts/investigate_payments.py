import urllib.request
import re
import json

def test_maxelpay():
    print("=== INVESTIGATING MAXELPAY ===")
    req = urllib.request.Request("https://dashboard.maxelpay.com", headers={"User-Agent": "Mozilla/5.0"})
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="ignore")
        scripts = re.findall(r'src="([^"]+\.js)"', html)
        print("Found scripts:", len(scripts))
        for s in scripts:
            full_url = s if s.startswith("http") else f"https://dashboard.maxelpay.com{s}"
            print("Checking script:", full_url)
            try:
                js = urllib.request.urlopen(urllib.request.Request(full_url, headers={"User-Agent": "Mozilla/5.0"}), timeout=10).read().decode("utf-8", errors="ignore")
                matches = re.findall(r'https?://[a-zA-Z0-9\.\-]+/api[^\s"\'\`]+', js)
                if matches:
                    print("  API URLs in script:", set(matches))
                checkout_matches = re.findall(r'https?://[a-zA-Z0-9\.\-]+/checkout[^\s"\'\`]*', js)
                if checkout_matches:
                    print("  Checkout URLs in script:", set(checkout_matches))
                invoice_matches = re.findall(r'/invoice/[^\s"\'\`]+', js)
                if invoice_matches:
                    print("  Invoice routes:", set(invoice_matches))
            except Exception as ex:
                pass
    except Exception as e:
        print("Error fetching dashboard:", e)

def test_paymento():
    print("\n=== INVESTIGATING PAYMENTO ===")
    req = urllib.request.Request("https://app.paymento.io/", headers={"User-Agent": "Mozilla/5.0"})
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="ignore")
        scripts = re.findall(r'src="([^"]+\.js)"', html)
        print("Found scripts on app.paymento.io:", len(scripts))
    except Exception as e:
        print("Error fetching Paymento app:", e)

    print("\n=== INVESTIGATING PAYMENTO HOMEPAGE ===")
    try:
        html = urllib.request.urlopen(urllib.request.Request("https://paymento.io/", headers={"User-Agent": "Mozilla/5.0"}), timeout=10).read().decode("utf-8", errors="ignore")
        import re
        links = set(re.findall(r'href="([^"]+)"', html))
        for l in sorted(links):
            if any(w in l.lower() for w in ['doc', 'api', 'dev', 'git', 'guide', 'pay']):
                print("  Link:", l)
    except Exception as e:
        print("Error fetching paymento.io:", e)

if __name__ == "__main__":
    test_maxelpay()
    test_paymento()
