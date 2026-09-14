import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

test_script = """
import smtplib
from email.mime.text import MIMEText

msg = MIMEText('Testing reply back to info@dropotp.com')
msg['Subject'] = 'Test Reply from External Mailer'
msg['From'] = 'rahimpc2023@gmail.com'
msg['To'] = 'info@dropotp.com'

try:
    with smtplib.SMTP('127.0.0.1', 25) as server:
        server.sendmail('rahimpc2023@gmail.com', ['info@dropotp.com'], msg.as_string())
    print('INBOUND_TEST_OK')
except Exception as e:
    print('INBOUND_TEST_FAIL:', e)
"""

stdin, stdout, stderr = ssh.exec_command(f"python3 -c \"{test_script}\"")
print("SMTP Result:", stdout.read().decode().strip())
print("SMTP Stderr:", stderr.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command("docker logs otp_backend --tail 15")
print("\nBackend logs:")
print(stdout.read().decode())

ssh.close()
