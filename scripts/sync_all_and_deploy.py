import paramiko, os, sys
sys.stdout.reconfigure(encoding='utf-8')

HOST = '162.141.78.116'
USER = 'root'
PASS = '96mibv_-M6'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)
sftp = ssh.open_sftp()

files_to_sync = [
    (r'd:\code-pip\SaaS OTP Platform\backend\src\index.ts', '/opt/otp-platform/backend/src/index.ts'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\middlewares\auth.middleware.ts', '/opt/otp-platform/backend/src/middlewares/auth.middleware.ts'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\services\rental\rental.service.ts', '/opt/otp-platform/backend/src/services/rental/rental.service.ts'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\routes\rental.routes.ts', '/opt/otp-platform/backend/src/routes/rental.routes.ts'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\services\mail-engine\outbound-mail.service.ts', '/opt/otp-platform/backend/src/services/mail-engine/outbound-mail.service.ts'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\services\mail-engine\smtp.service.ts', '/opt/otp-platform/backend/src/services/mail-engine/smtp.service.ts'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\routes\auth.routes.ts', '/opt/otp-platform/backend/src/routes/auth.routes.ts'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\routes\admin.routes.ts', '/opt/otp-platform/backend/src/routes/admin.routes.ts'),
    (r'd:\code-pip\SaaS OTP Platform\frontend\src\components\admin\AdminMailSettings.tsx', '/opt/otp-platform/frontend/src/components/admin/AdminMailSettings.tsx'),
    (r'd:\code-pip\SaaS OTP Platform\frontend\src\components\admin\AdminWebmail.tsx', '/opt/otp-platform/frontend/src/components/admin/AdminWebmail.tsx'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\services\payments\maxelpay.service.ts', '/opt/otp-platform/backend/src/services/payments/maxelpay.service.ts'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\routes\payment.routes.ts', '/opt/otp-platform/backend/src/routes/payment.routes.ts'),
    (r'd:\code-pip\SaaS OTP Platform\frontend\src\components\TopUpHistory.tsx', '/opt/otp-platform/frontend/src/components/TopUpHistory.tsx'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\services\mail-engine\imap-pool.service.ts', '/opt/otp-platform/backend/src/services/mail-engine/imap-pool.service.ts'),
    (r'd:\code-pip\SaaS OTP Platform\backend\src\services\notification\notification.service.ts', '/opt/otp-platform/backend/src/services/notification/notification.service.ts'),
    (r'd:\code-pip\SaaS OTP Platform\frontend\src\components\LiveActivations.tsx', '/opt/otp-platform/frontend/src/components/LiveActivations.tsx'),
    (r'd:\code-pip\SaaS OTP Platform\frontend\src\components\Navbar.tsx', '/opt/otp-platform/frontend/src/components/Navbar.tsx'),
]

for local_path, remote_path in files_to_sync:
    print(f"Uploading {local_path} -> {remote_path}...")
    remote_dir = '/'.join(remote_path.split('/')[:-1])
    try:
        sftp.stat(remote_dir)
    except IOError:
        ssh.exec_command(f'mkdir -p "{remote_dir}"')
    sftp.put(local_path, remote_path)

sftp.close()
print("All files uploaded successfully!")

print("Rebuilding backend and frontend containers on remote server...")
stdin, stdout, stderr = ssh.exec_command('cd /opt/otp-platform && docker compose build backend frontend && docker compose up -d backend frontend')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('docker ps --filter name=otp_')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print("Deploy finished!")
