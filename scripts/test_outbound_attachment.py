import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

test_send_attachment = """
const { OutboundMailService } = require('./dist/services/mail-engine/outbound-mail.service');

async function test() {
  const dummyFileBase64 = Buffer.from('Hello! This is a test attachment file from DropOTP Platform.').toString('base64');
  
  const result = await OutboundMailService.send({
    fromEmail: 'admin@dropotp.com',
    fromName: 'DropOTP Admin',
    to: 'rahimpc2023@gmail.com',
    subject: 'HTML & Attachment Verification Test',
    text: 'This email contains HTML styling and a text attachment.',
    html: '<div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #059669; border-radius: 10px;"><h2 style="color: #059669;">DropOTP Outbound Test</h2><p>This message was sent directly from <strong>admin@dropotp.com</strong> with rich HTML and a verified attachment!</p></div>',
    attachments: [
      {
        filename: 'welcome_note.txt',
        content: dummyFileBase64,
        encoding: 'base64',
        contentType: 'text/plain'
      }
    ]
  });

  console.log('SEND_RESULT:', JSON.stringify(result, null, 2));
}

test().catch(err => {
  console.error('SEND_ERROR:', err);
});
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/test_attachment_send.js', 'w') as f:
    f.write(test_send_attachment)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker exec -i -w /app otp_backend node < /tmp/test_attachment_send.js')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

ssh.close()
