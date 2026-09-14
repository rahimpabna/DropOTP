import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

HOST = '162.141.78.116'
USER = 'root'
PASS = '96mibv_-M6'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = ssh.exec_command('docker logs --tail 30 otp_backend')
print("--- BACKEND LOGS ---")
print(stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('docker logs --tail 15 otp_frontend')
print("--- FRONTEND LOGS ---")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
