import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

node_script = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emails = await prisma.receivedEmail.findMany({
    take: 5,
    orderBy: { receivedAt: 'desc' },
    select: {
      id: true,
      recipientEmail: true,
      senderEmail: true,
      subject: true,
      receivedAt: true,
      rawHeaders: true
    }
  });
  console.log(JSON.stringify(emails, null, 2));
}
main().finally(() => prisma.$disconnect());
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/check_emails.js', 'w') as f:
    f.write(node_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker exec -i otp_backend node < /tmp/check_emails.js')
print("=== EMAILS FOUND IN BACKEND DB ===")
print(stdout.read().decode('utf-8', errors='replace'))
print("ERRORS:", stderr.read().decode('utf-8', errors='replace'))

ssh.close()
