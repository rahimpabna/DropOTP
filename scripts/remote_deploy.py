import os
import sys
import time
import tarfile
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


SERVER_IP = "162.141.78.116"
SERVER_USER = "root"
SERVER_PASS = "96mibv_-M6"
REMOTE_DIR = "/opt/otp-platform"

def run_ssh_command(client, command, stream_output=True):
    print(f"\n[SSH Command] Running: {command}")
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    full_out = []
    
    while True:
        line = stdout.readline()
        if not line:
            break
        if stream_output:
            print(line, end="")
        full_out.append(line)
        
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        err_data = stderr.read().decode('utf-8', errors='ignore')
        if err_data:
            print(f"[SSH Error] Exit {exit_status}: {err_data}")
    return exit_status, "".join(full_out)

def create_archive():
    archive_name = "project_bundle.tar.gz"
    print(f"[*] Packaging project files into {archive_name}...")
    
    # Exclude node_modules, .git, cache to upload lightning fast!
    def filter_func(tarinfo):
        norm = tarinfo.name.replace("\\", "/")
        exclude_patterns = ["node_modules", ".git", ".idea", ".vscode", "dist", ".cache", "tmp", "__pycache__"]
        for p in exclude_patterns:
            parts = norm.split('/')
            if p in parts or norm.endswith(f"/{p}"):
                return None
        return tarinfo

    with tarfile.open(archive_name, "w:gz") as tar:
        tar.add(".", filter=filter_func)
    
    size_mb = os.path.getsize(archive_name) / (1024 * 1024)
    print(f"[OK] Bundle created: {archive_name} ({size_mb:.2f} MB)")
    return archive_name

def deploy():
    # 1. Package files
    archive_path = create_archive()

    # 2. Connect to server
    print(f"[*] Connecting to {SERVER_USER}@{SERVER_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, port=22, username=SERVER_USER, password=SERVER_PASS, timeout=15)
    print(f"[OK] SSH Connected successfully!")

    # 3. Clean and prepare remote folder
    run_ssh_command(ssh, f"mkdir -p {REMOTE_DIR}")

    # 4. Upload bundle via SFTP
    print(f"[*] Uploading {archive_path} to {REMOTE_DIR} via SFTP...")
    sftp = ssh.open_sftp()
    remote_archive = f"{REMOTE_DIR}/{archive_path}"
    
    def sftp_progress(transferred, total):
        pct = (transferred / total) * 100
        sys.stdout.write(f"\r    Uploading: {pct:.1f}% ({transferred // 1024} KB / {total // 1024} KB)")
        sys.stdout.flush()

    sftp.put(archive_path, remote_archive, callback=sftp_progress)
    sftp.close()
    print(f"\n[OK] Upload complete!")

    # Clean local archive
    if os.path.exists(archive_path):
        os.remove(archive_path)

    # 5. Extract files on server
    print(f"[*] Extracting bundle on server...")
    run_ssh_command(ssh, f"tar -xzf {remote_archive} -C {REMOTE_DIR} && rm -f {remote_archive}")

    # 6. Check and handle conflicting host services on port 80/443
    print(f"[*] Checking existing services on port 80/443...")
    run_ssh_command(ssh, "systemctl stop nginx || true")
    run_ssh_command(ssh, "systemctl disable nginx || true")
    run_ssh_command(ssh, "docker stop nginx-nginx-1 || true")

    # 7. Configure 2GB Swap Memory on Ubuntu
    print(f"[*] Setting up swap memory...")
    run_ssh_command(ssh, f"bash {REMOTE_DIR}/scripts/setup_swap.sh")

    # 8. Firewall: Allow Port 25 (SMTP), 80 (HTTP), 443 (HTTPS), 22 (SSH)
    print(f"[*] Configuring UFW firewall for ports 25, 80, 443, 22...")
    run_ssh_command(ssh, "ufw allow 22/tcp && ufw allow 25/tcp && ufw allow 80/tcp && ufw allow 443/tcp && (echo y | ufw enable || true)")

    # 9. Docker Compose Build and Launch
    print(f"[*] Building and starting Docker containers on server...")
    run_ssh_command(ssh, f"cd {REMOTE_DIR} && docker compose down --remove-orphans || true")
    run_ssh_command(ssh, f"cd {REMOTE_DIR} && docker compose up -d --build")

    # 10. Check Container Health
    print(f"[*] Checking running containers status...")
    time.sleep(5)
    run_ssh_command(ssh, f"cd {REMOTE_DIR} && docker compose ps")

    # 11. Tail logs for backend
    print(f"[*] Checking backend startup logs...")
    run_ssh_command(ssh, f"cd {REMOTE_DIR} && docker compose logs --tail=30 backend")

    ssh.close()
    print("\n========================================================")
    print(" [OK] SaaS Platform Successfully Deployed & Running!")
    print(f" Domain: https://dropotp.com")
    print(f" Inbound Port 25: Active for dropotp.com")
    print(f" Admin Login: admin@dropotp.com / Sh330717@")
    print("========================================================\n")

if __name__ == "__main__":
    deploy()
