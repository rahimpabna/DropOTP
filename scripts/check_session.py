import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6')

cmd = """docker exec otp_postgres psql -U postgres -d otp_platform -c 'SELECT id, "emailAddress", "serviceCode", code, "verificationUrl", "createdAt", "receivedAt", "status" FROM "RentalSession" ORDER BY id DESC LIMIT 5;'"""
stdin, stdout, stderr = ssh.exec_command(cmd)
print("RENTAL SESSIONS:\n", stdout.read().decode('utf-8', errors='ignore'))

cmd2 = """docker exec otp_postgres psql -U postgres -d otp_platform -c 'SELECT id, "rentalSessionId", "recipientEmail", "senderEmail", subject, "extractedCode", "extractedUrl", "receivedAt" FROM "ReceivedEmail" ORDER BY id DESC LIMIT 5;'"""
stdin2, stdout2, stderr2 = ssh.exec_command(cmd2)
print("RECEIVED EMAILS:\n", stdout2.read().decode('utf-8', errors='ignore'))

# Check the actual body of the latest received email
cmd3 = """docker exec otp_postgres psql -U postgres -d otp_platform -c 'SELECT id, subject, LEFT("textBody", 1000) as body_preview FROM "ReceivedEmail" ORDER BY id DESC LIMIT 1;'"""
stdin3, stdout3, stderr3 = ssh.exec_command(cmd3)
print("BODY PREVIEW:\n", stdout3.read().decode('utf-8', errors='ignore'))

ssh.close()
