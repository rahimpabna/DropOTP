import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

stdin, stdout, stderr = ssh.exec_command('cd /opt/otp-platform/backend && cat package.json')
print("package.json:")
print(stdout.read().decode()[:500])

stdin, stdout, stderr = ssh.exec_command('grep -rn "sendVerificationOtp" /opt/otp-platform/backend/src/')
print("Search results:")
print(stdout.read().decode())

ssh.close()
