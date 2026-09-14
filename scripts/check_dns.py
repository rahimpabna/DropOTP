import dns.resolver

domain = "dropotp.com"
print(f"Checking DNS for {domain}:")
for rtype in ['TXT', 'A', 'MX']:
    try:
        answers = dns.resolver.resolve(domain, rtype)
        print(f"--- {rtype} ---")
        for rdata in answers:
            print(rdata.to_text())
    except Exception as e:
        print(f"--- {rtype} --- Error: {e}")
