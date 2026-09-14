import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

HOST = '162.141.78.116'
USER = 'root'
PASS = '96mibv_-M6'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

# Run build command with utf-8 decoding
stdin, stdout, stderr = ssh.exec_command('cd /opt/otp-platform && docker compose build backend && docker compose up -d backend')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("STDOUT:")
print(out[-1000:])
print("STDERR:")
print(err[-1000:])

stdin, stdout, stderr = ssh.exec_command('docker ps --filter name=otp_backend')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
