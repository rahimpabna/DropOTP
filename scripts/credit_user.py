import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('162.141.78.116', username='root', password='96mibv_-M6', timeout=15)

user_id = '02521470-2d6c-46eb-b6d7-2ed6800085d0'
order_id = 'ab651b9e-0426-45bd-88ec-72c8b5ba855d'
amount = 1.0000

print(f"[*] Crediting ${amount:.4f} for user {user_id} and order {order_id}...")

sql = f"""
DO $$
DECLARE
    v_wallet_id text;
    v_bal_before numeric;
    v_bal_after numeric;
BEGIN
    -- 1. Find wallet
    SELECT id, balance INTO v_wallet_id, v_bal_before
    FROM "Wallet"
    WHERE "userId" = '{user_id}';

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user';
    END IF;

    v_bal_after := v_bal_before + {amount};

    -- 2. Update wallet balance
    UPDATE "Wallet"
    SET balance = v_bal_after, "updatedAt" = NOW()
    WHERE id = v_wallet_id;

    -- 3. Insert Ledger Transaction
    INSERT INTO "LedgerTransaction" (
        id, "walletId", type, amount, "balanceBefore", "balanceAfter", "referenceType", "referenceId", description, "createdAt"
    ) VALUES (
        gen_random_uuid()::text,
        v_wallet_id,
        'CREDIT',
        {amount},
        v_bal_before,
        v_bal_after,
        'TOPUP',
        '{order_id}',
        'Manual Credit: Maxelpay USDT $1.00 Payment Confirmed',
        NOW()
    );

    -- 4. Mark payment order SUCCESS
    UPDATE "PaymentOrder"
    SET status = 'SUCCESS', "completedAt" = NOW()
    WHERE id = '{order_id}';

    RAISE NOTICE 'Success! Old balance: %, New balance: %', v_bal_before, v_bal_after;
END $$;
"""

# Run via docker exec psql
escaped_sql = sql.replace("'", "'\\''")
cmd = f"docker exec otp_postgres psql -U postgres -d otp_platform -c '{escaped_sql}'"
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')
print("STDOUT:", out)
print("STDERR:", err)

# Check updated balances
cmd_check = f"""docker exec otp_postgres psql -U postgres -d otp_platform -c 'SELECT u.username, w.balance, po.status FROM "User" u JOIN "Wallet" w ON w."userId" = u.id JOIN "PaymentOrder" po ON po."userId" = u.id WHERE po.id = \\'{order_id}\\';'"""
stdin2, stdout2, stderr2 = ssh.exec_command(cmd_check)
print("VERIFICATION:\n", stdout2.read().decode('utf-8', errors='ignore'))

ssh.close()
