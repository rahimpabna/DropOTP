import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=10)

stdin, stdout, stderr = ssh.exec_command('docker exec -i otp_backend npx prisma db execute --stdin <<EOF\nSELECT id, "recipientEmail", "senderEmail", subject, "receivedAt" FROM "ReceivedEmail" ORDER BY "receivedAt" DESC LIMIT 5;\nEOF')
print("=== LATEST 5 INBOX EMAILS IN DB ===")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
