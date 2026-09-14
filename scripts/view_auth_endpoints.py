import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

stdin, stdout, stderr = ssh.exec_command('sed -n "220,330p" /opt/otp-platform/backend/src/routes/auth.routes.ts')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
