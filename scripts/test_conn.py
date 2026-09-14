import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

test_script = """
python3 - << 'EOF'
import socket
targets = [
    ('gmail-smtp-in.l.google.com', 25),
    ('smtp.gmail.com', 587),
    ('smtp.gmail.com', 465),
    ('127.0.0.1', 25),
]
for host, port in targets:
    try:
        s = socket.create_connection((host, port), timeout=5)
        print(f"{host}:{port} -> SUCCESS")
        s.close()
    except Exception as e:
        print(f"{host}:{port} -> FAILED: {e}")
EOF
"""

_, out, err = c.exec_command(test_script)
print(out.read().decode())
print(err.read().decode())
c.close()
