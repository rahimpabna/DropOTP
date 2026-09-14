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
  console.log('Testing sendVerificationOtp...');
  // Testing with a throwaway test domain or user test email
  const res = await sendVerificationOtp('testverify@gmail.com', '543210');
  console.log('Result:', res);
  process.exit(0);
})();
"""

stdin, stdout, stderr = ssh.exec_command(f'docker exec otp_backend node -e "{test_code}"')
print("STDOUT:")
print(stdout.read().decode('utf-8', errors='replace'))
print("STDERR:")
print(stderr.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('docker logs --tail 25 otp_backend')
print("CONTAINER LOGS:")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
