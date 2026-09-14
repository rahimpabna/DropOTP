import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

HOST = '162.141.78.116'
USER = 'root'
PASS = '96mibv_-M6'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = ssh.exec_command('docker exec otp_backend node -e "const { prisma } = require(\'./dist/db/prisma\'); prisma.siteContent.findUnique({ where: { key: \'mail_settings\' } }).then(console.log);"')
print("DB mail_settings:")
print(stdout.read().decode())

ssh.close()
