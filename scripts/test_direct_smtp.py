import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

test_script = """
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'gmail-smtp-in.l.google.com',
  port: 25,
  secure: false,
  tls: { rejectUnauthorized: false },
  name: 'dropotp.com'
});

transporter.verify((err, success) => {
  if (err) {
    console.error('Verify error:', err);
  } else {
    console.log('Transporter ready:', success);
  }
  process.exit(0);
});
"""

stdin, stdout, stderr = ssh.exec_command(f"docker exec otp_backend node -e \"{test_script}\"")
print("Transporter verify output:")
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
