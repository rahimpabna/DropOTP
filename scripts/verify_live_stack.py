import urllib.request
import json
import time
import smtplib
import paramiko
from email.mime.text import MIMEText

SERVER_IP = "162.141.78.116"
API_KEY = "key_admin_03ec21c27e174ea88eebf1acb87e14ba"

def main():
    print(f"[*] Connecting to {SERVER_IP} to set test wallet balance...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, 22, "root", "96mibv_-M6")
    cmd = 'docker exec otp_postgres psql -U postgres -d otp_platform -c "UPDATE \\"Wallet\\" SET balance = 50.00;"'
    _, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
    ssh.close()

    # 1. Check Balance
    bal_url = f"http://{SERVER_IP}/api/mail/getBalance?api_key={API_KEY}"
    bal = json.loads(urllib.request.urlopen(bal_url).read().decode())
    print(f"[OK] Balance check: {bal}")

    # 2. Request an Activation for Telegram (tg) on dropotp.com
    act_url = f"http://{SERVER_IP}/api/mail/getActivation?api_key={API_KEY}&service=tg&domain=dropotp.com"
    act = json.loads(urllib.request.urlopen(act_url).read().decode())
    print(f"[OK] Rental Activation Response: {act}")

    if act.get("status") != 1:
        print("[!] Failed to get activation:", act)
        return

    mail_addr = act["mail"]
    mail_id = act["mailId"]
    print(f"[OK] Rented Email: {mail_addr} (Session ID: {mail_id})")

    # 3. Check status immediately (expect STATUS_WAIT_CODE)
    status_url = f"http://{SERVER_IP}/api/mail/getCode?api_key={API_KEY}&mailId={mail_id}"
    code_res = json.loads(urllib.request.urlopen(status_url).read().decode())
    print(f"[OK] Initial Code Status: {code_res}")

    # 4. Deliver incoming simulated OTP email to Port 25
    print(f"[*] Simulating incoming OTP email to {mail_addr} on port 25...")
    msg = MIMEText("Your Telegram confirmation code is: 849201\nDo not share this code.")
    msg["Subject"] = "Telegram code 849201"
    msg["From"] = "Telegram <login@telegram.org>"
    msg["To"] = mail_addr

    with smtplib.SMTP(SERVER_IP, 25, timeout=10) as s:
        s.sendmail("login@telegram.org", [mail_addr], msg.as_string())
    print("[OK] Test email delivered to Port 25 SMTP server successfully!")

    # 5. Check status after delivery
    time.sleep(2)
    code_res2 = json.loads(urllib.request.urlopen(status_url).read().decode())
    print(f"[OK] OTP Reception Status: {code_res2}")

    if code_res2.get("status") == 1 and code_res2.get("code") == "849201":
        print("\n========================================================")
        print("  ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ")
        print(f"  Rented Email: {mail_addr}")
        print(f"  Received OTP Code: {code_res2.get('code')}")
        print("========================================================\n")
    else:
        print("[!] Result:", code_res2)

if __name__ == "__main__":
    main()
