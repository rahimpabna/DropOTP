import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=15)

script = """
const { prisma } = require('./dist/db/prisma');
(async () => {
  const domains = await prisma.domain.findMany();
  console.log('Registered Domains in DB:');
  console.log(domains);
  process.exit(0);
})();
"""

stdin, stdout, stderr = ssh.exec_command(f'docker exec otp_backend node -e "{script}"')
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
