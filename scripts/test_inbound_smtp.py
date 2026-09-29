#!/usr/bin/env python3
"""
Test script to simulate an incoming verification email to Port 25.
Usage:
    python test_inbound_smtp.py <recipient_email> <sample_service>
Example:
    python test_inbound_smtp.py ab12cd34@mailnestpro.com tg
"""

import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

if len(sys.argv) < 2:
    print("Usage: python test_inbound_smtp.py <recipient_email> [service]")
    print("Example: python test_inbound_smtp.py test1234@mailnestpro.com tg")
    sys.exit(1)

recipient = sys.argv[1]
service = sys.argv[2].lower() if len(sys.argv) > 2 else "tg"

samples = {
    "tg": {
        "from": "Telegram <login@telegram.org>",
        "subject": "Telegram login code: 58291",
        "body": "Dear User,\n\nYour Telegram confirmation code is: 58291\nDo not give this code to anyone.",
    },
    "google": {
        "from": "Google <no-reply@accounts.google.com>",
        "subject": "739201 is your Google verification code",
        "body": "Hi there,\n\n739201 is your Google verification code.\n\nThanks,\nThe Google Accounts Team",
    },
    "tinder": {
        "from": "Tinder <support@gotinder.com>",
        "subject": "Your Tinder verification code",
        "body": "Your Tinder code is 492049. Don't share it with anyone.",
    },
}

selected = samples.get(service, samples["tg"])

msg = MIMEMultipart()
msg["From"] = selected["from"]
msg["To"] = recipient
msg["Subject"] = selected["subject"]
msg.attach(MIMEText(selected["body"], "plain"))

smtp_host = "127.0.0.1"
smtp_port = 25

print(f"[*] Sending test email to {smtp_host}:{smtp_port} for {recipient}...")

try:
    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
        server.sendmail(selected["from"], [recipient], msg.as_string())
    print("[✓] Email successfully delivered to Inbound SMTP Port 25!")
    print(f"[✓] Expected OTP: Check your Live Activations dashboard or API for extracted code!")
except Exception as e:
    print(f"[!] Delivery failed: {e}")
