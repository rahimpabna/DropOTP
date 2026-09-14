import paramiko
import os

HOST = '162.141.78.116'
USER = 'root'
PASS = '96mibv_-M6'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

sftp = ssh.open_sftp()

# Ensure remote dir exists
try:
    sftp.mkdir('/opt/otp-platform/backend/src/services/mail-engine')
except IOError:
    pass

local_outbound = r'd:\code-pip\SaaS OTP Platform\backend\src\services\mail-engine\outbound-mail.service.ts'
remote_outbound = '/opt/otp-platform/backend/src/services/mail-engine/outbound-mail.service.ts'
sftp.put(local_outbound, remote_outbound)
print(f"Uploaded {remote_outbound}")

local_auth = r'd:\code-pip\SaaS OTP Platform\backend\src\routes\auth.routes.ts'
remote_auth = '/opt/otp-platform/backend/src/routes/auth.routes.ts'
sftp.put(local_auth, remote_auth)
print(f"Uploaded {remote_auth}")

sftp.close()

# Rebuild backend container
print("Rebuilding backend container...")
stdin, stdout, stderr = ssh.exec_command('cd /opt/otp-platform && docker compose build backend && docker compose up -d backend')
for line in stdout:
    print(line, end='')
print(stderr.read().decode())

ssh.close()
print("Done!")
