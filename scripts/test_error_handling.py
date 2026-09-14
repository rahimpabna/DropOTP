import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

HOST = '162.141.78.116'
USER = 'root'
PASS = '96mibv_-M6'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

test_code = """
const { sendVerificationOtp } = require('./dist/routes/auth.routes');
(async () => {
  const res = await sendVerificationOtp('test@nonexistent-fake-domain-12345.com', '123456');
  console.log('Result:', res);
  process.exit(0);
})();
"""

stdin, stdout, stderr = ssh.exec_command(f'docker exec otp_backend node -e "{test_code}"')
print("STDOUT:")
print(stdout.read().decode('utf-8', errors='replace'))
print("STDERR:")
print(stderr.read().decode('utf-8', errors='replace'))

ssh.close()
