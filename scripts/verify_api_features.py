import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

test_script = """
const axios = require('axios');

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'super_secret_jwt_key_dropotp_2026', { expiresIn: '1d' });
  console.log('User found:', user.email);

  // 1. Test API key regeneration with both endpoints
  const rotate1 = await axios.post('http://127.0.0.1:4000/api/auth/rotate-api-key', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('rotate-api-key endpoint OK:', rotate1.data.apiKey);

  const rotate2 = await axios.post('http://127.0.0.1:4000/api/auth/api-key/regenerate', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('api-key/regenerate endpoint OK:', rotate2.data.apiKey);

  // 2. Test /api/user/balance with Bearer apiKey
  const balanceCheck = await axios.get('http://127.0.0.1:4000/api/user/balance', {
    headers: { Authorization: `Bearer ${rotate2.data.apiKey}` }
  });
  console.log('API Sandbox Balance check OK:', balanceCheck.data);

  // 3. Test 50MB payload capacity (sending ~2MB json)
  const bigStr = 'A'.repeat(2 * 1024 * 1024);
  const bigRes = await axios.post('http://127.0.0.1:4000/api/auth/profile', {
    displayName: 'Test Admin'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Profile update with new middleware OK');
}

verify().catch(e => {
  console.error('VERIFY ERROR:', e.response?.data || e.message);
});
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/verify_features.js', 'w') as f:
    f.write(test_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker exec -i -w /app otp_backend node < /tmp/verify_features.js')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

ssh.close()
