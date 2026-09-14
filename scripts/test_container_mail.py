import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

stdin, stdout, stderr = ssh.exec_command('docker exec otp_backend node -e "const dns = require(\'dns\'); dns.promises.resolveMx(\'gmail.com\').then(console.log).catch(console.error);"')
print("DNS MX test from container:")
print(stdout.read().decode())
print(stderr.read().decode())

stdin, stdout, stderr = ssh.exec_command('docker exec otp_backend node -e "const nodemailer = require(\'nodemailer\'); console.log(\'nodemailer exists:\', !!nodemailer);"')
print("Nodemailer check:")
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
