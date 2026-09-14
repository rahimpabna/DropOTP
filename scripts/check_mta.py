import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

cmd = "which postfix || which exim4 || which sendmail; netstat -tulnp || ss -tulnp"
_, out, err = c.exec_command(cmd)
print("OUT:\n", out.read().decode())
c.close()
