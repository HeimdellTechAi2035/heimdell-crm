# AWS Deployment Guide - Heimdell CRM

## How OpenClaw Connects to CRM on AWS

This guide covers deploying Heimdell CRM to AWS and establishing secure OpenClaw agent connectivity.

---

## A) Public Endpoint + TLS

### Requirements
- **Public HTTPS endpoint** (e.g., `https://crm.yourdomain.com`)
- **TLS certificate** via AWS Certificate Manager (ACM) or Let's Encrypt
- **Domain name** pointed to EC2 instance or Application Load Balancer

### Setup Options

#### Option 1: EC2 + Caddy (Recommended for simplicity)
```bash
# Caddy auto-provisions TLS via Let's Encrypt
sudo caddy reverse-proxy --from crm.yourdomain.com --to localhost:3000
```

#### Option 2: Application Load Balancer + Target Group
- ALB handles TLS termination
- Routes HTTPS → HTTP to EC2 target group on port 3000
- Health check: `/api/ping`

---

## B) Agent Authentication & Permissions

### API Key Generation
```bash
npm run seed
# Output: hmdl_<hex_key>
```

### Authentication Scheme
- **Header:** `Authorization: Bearer hmdl_<hex_key>`
- **Validation:** SHA-256 hash stored in `ApiKey` table
- **Actor format:** `agent:<keyname>` (e.g., `agent:OpenClaw`)

### Scoped Permissions
All keys currently have:
- `leads:read` - List and retrieve leads
- `leads:write` - Create and update leads
- `pipeline:advance` - Trigger status transitions via `/actions`
- `actions:write` - Record actions with idempotency
- `email:send` - Send emails (subject to rate limits)

---

## C) Required Agent Endpoints

OpenClaw uses these core endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ping` | GET | Health check (no auth) |
| `/api/agent/health` | GET | Detailed health status |
| `/api/agent/auth-test` | GET | Verify API key validity |
| `/api/agent/leads` | GET | List leads with filters |
| `/api/agent/leads` | POST | Create new lead |
| `/api/agent/leads/:id` | GET | Get lead details + audit logs |
| `/api/agent/leads/:id` | PATCH | Update lead fields |
| `/api/agent/leads/:id/actions` | POST | **Primary pipeline advancement** |
| `/api/agent/email/send` | POST | Send email via SMTP |
| `/api/agent/openapi` | GET | OpenAPI 3.0 specification |

**OpenClaw should prefer `/actions` endpoint** for deterministic state progressions.

---

## D) AWS Network & Security

### Security Group Configuration

#### Inbound Rules
```
Type        Protocol  Port    Source          Purpose
--------------------------------------------------------------
HTTPS       TCP       443     0.0.0.0/0       Public API access
SSH         TCP       22      <YOUR_IP>/32    Admin access only
HTTP        TCP       80      0.0.0.0/0       (Optional: redirect to 443)
```

#### Outbound Rules
```
Type        Protocol  Port    Destination     Purpose
--------------------------------------------------------------
HTTPS       TCP       443     0.0.0.0/0       SMTP, webhooks, updates
HTTP        TCP       80      0.0.0.0/0       Package downloads
```

### Reverse Proxy Setup

#### Caddy (caddy.service)
```systemd
[Unit]
Description=Caddy reverse proxy for Heimdell CRM
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/caddy reverse-proxy --from crm.yourdomain.com --to localhost:3000
Restart=always

[Install]
WantedBy=multi-user.target
```

#### Nginx (alternative)
```nginx
server {
    listen 443 ssl http2;
    server_name crm.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/crm.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Database Storage
- **SQLite location:** `/var/lib/heimdell-crm/production.db`
- **Backup strategy:** Daily snapshots to S3 via cron
- **Permissions:** Ensure app user has read/write access

```bash
# Setup database directory
sudo mkdir -p /var/lib/heimdell-crm
sudo chown ec2-user:ec2-user /var/lib/heimdell-crm
```

---

## E) OpenClaw Usage Pattern

### Typical Flow
1. **Health check:** `GET /api/ping` → 200
2. **Auth validation:** `GET /api/agent/auth-test` with Bearer token
3. **Fetch due leads:** `GET /api/agent/leads?filter=due_now`
4. **Advance pipeline:** `POST /api/agent/leads/:id/actions`

### Example Action Request
```bash
curl -X POST https://crm.yourdomain.com/api/agent/leads/{lead_id}/actions \
  -H "Authorization: Bearer hmdl_<key>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-uuid-here" \
  -d '{
    "action_type": "SEND_EMAIL_1",
    "reason": "First outreach email sent via OpenClaw",
    "payload": {
      "template_id": "cold_outreach_v2",
      "sent_at": "2025-02-23T14:30:00Z"
    }
  }'
```

### Idempotency
- **Always include** `Idempotency-Key` header in production
- Prevents duplicate actions if request retries
- Key format: UUID v4 recommended

---

## F) Health Check Flow

OpenClaw should implement this startup sequence:

```typescript
// 1. Basic health check
const ping = await fetch("https://crm.yourdomain.com/api/ping");
if (!ping.ok) throw new Error("CRM unreachable");

// 2. Validate authentication
const authTest = await fetch("https://crm.yourdomain.com/api/agent/auth-test", {
  headers: { Authorization: `Bearer ${API_KEY}` }
});
const { permissions } = await authTest.json();
console.log("Authenticated with permissions:", permissions);

// 3. Fetch sample data
const leads = await fetch("https://crm.yourdomain.com/api/agent/leads?limit=5", {
  headers: { Authorization: `Bearer ${API_KEY}` }
});

// 4. Test safe action on dummy lead
const testAction = await fetch(`https://crm.yourdomain.com/api/agent/leads/${TEST_LEAD_ID}/actions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID()
  },
  body: JSON.stringify({
    action_type: "HEALTH_CHECK",
    reason: "OpenClaw connectivity test"
  })
});
```

---

## G) Observability

### Audit Logs
All state changes are logged with:
- `request_id` (auto-generated)
- `actor` (format: `agent:<keyname>`)
- `lead_id`
- `action` (e.g., "SEND_EMAIL_1")
- `before_status` / `after_status`
- `timestamp_utc`

### Monitoring Endpoints
- **Metrics:** Add Prometheus exporter at `/api/metrics` (future enhancement)
- **Logs:** Structured JSON logs to CloudWatch via systemd
- **Alerts:** Configure SNS for 429 rate limit violations

### Example Log Entry
```json
{
  "timestamp_utc": "2025-02-23T14:30:22.155Z",
  "actor": "agent:OpenClaw",
  "lead_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "SEND_EMAIL_1",
  "status_before": "NEW",
  "status_after": "CONTACTED_1",
  "request_id": "req_abc123def456"
}
```

---

## Deployment Steps

### 1. Provision EC2 Instance
```bash
# Amazon Linux 2023 / Ubuntu 22.04
# Instance type: t3.small (min)
# Storage: 20GB EBS (gp3)
```

### 2. Install Dependencies
```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Caddy (for reverse proxy)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 3. Clone Repository
```bash
cd /opt
sudo git clone https://github.com/yourusername/heimdell-crm.git
cd heimdell-crm
sudo chown -R ec2-user:ec2-user .
```

### 4. Configure Environment
```bash
cp .env.example .env
nano .env
# Set NODE_ENV=production, SMTP credentials, etc.
```

### 5. Build Application
```bash
npm install --production
npx prisma generate
npx prisma migrate deploy
npm run build
```

### 6. Initialize Database
```bash
npm run seed
# Save the generated API key securely
```

### 7. Setup Systemd Service
Create `/etc/systemd/system/heimdell-crm.service`:
```systemd
[Unit]
Description=Heimdell CRM
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/heimdell-crm
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable heimdell-crm
sudo systemctl start heimdell-crm
sudo systemctl status heimdell-crm
```

### 8. Configure Caddy
```bash
sudo caddy reverse-proxy --from crm.yourdomain.com --to localhost:3000 &
```

Or setup as systemd service (see Caddy configuration above).

### 9. Verify Deployment
```bash
curl https://crm.yourdomain.com/api/ping
# Should return: {"status":"ok","service":"heimdell-crm",...}
```

### 10. OpenClaw Integration
Provide OpenClaw with:
- **Endpoint:** `https://crm.yourdomain.com`
- **API Key:** `hmdl_<generated_key>`
- **OpenAPI Spec:** `https://crm.yourdomain.com/api/agent/openapi`

---

## Security Checklist

- [ ] TLS certificate installed and auto-renewing
- [ ] Security group restricts SSH to known IPs
- [ ] Database file has proper permissions (not world-readable)
- [ ] API keys stored in database as SHA-256 hashes
- [ ] Rate limiting configured (50 emails/day)
- [ ] CORS origins configured in `.env`
- [ ] Audit logs enabled for all state changes
- [ ] Backup strategy configured (db → S3 daily)
- [ ] CloudWatch logging enabled
- [ ] UFW/iptables configured (if not using Security Groups)

---

## Troubleshooting

### CRM returns 401 on auth-test
- Verify API key format: `hmdl_<hex>`
- Check `Authorization: Bearer <key>` header
- Confirm key exists in database: `SELECT * FROM ApiKey;`

### OpenClaw cannot reach endpoint
- Check Security Group inbound rules (allow 443 from 0.0.0.0/0)
- Verify DNS: `dig crm.yourdomain.com`
- Test reverse proxy: `curl -I https://crm.yourdomain.com/api/ping`

### Email send returns 429
- Check daily send limit: `SELECT * FROM SendLimit;`
- Reset counter: `UPDATE SendLimit SET emails_sent_today = 0;`
- Adjust limit in `src/lib/auth.ts` or database

### Database locked errors
- Ensure only one app instance running
- Check file permissions: `ls -la production.db`
- Increase SQLite timeout in `prisma/schema.prisma`

---

## Further Reading

- [OpenAPI Specification](https://crm.yourdomain.com/api/agent/openapi)
- [Prisma 7 Migration Guide](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [AWS Security Groups Best Practices](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
