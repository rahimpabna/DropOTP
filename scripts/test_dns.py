import dns.resolver

def get_mx(domain):
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        records = sorted([(r.preference, str(r.exchange).rstrip('.')) for r in answers])
        return records[0][1]
    except Exception as e:
        print(f"DNS error: {e}")
        return None

print("Gmail MX:", get_mx("gmail.com"))
