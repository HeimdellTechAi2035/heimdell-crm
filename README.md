# 🌌 Heimdell CRM - Neon-Noir Command Center

A high-performance Sales Outreach CRM with deterministic pipeline progression, built for OpenClaw AI agent integration.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![Prisma](https://img.shields.io/badge/Prisma-7.4.1-2D3748)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

---

## ✨ Features

- **🤖 Autonomous AI Companion** - OpenClaw-powered intelligent agent with personality, learning, and decision-making
- **📊 Intelligent Context API** - Real-time lead insights with engagement metrics, priority scoring, and personalized recommendations
- **🔔 Real-Time Webhooks** - Event-driven notifications for replied leads, qualified prospects, and stalled pipelines
- **Deterministic Status Flow** - Strict pipeline with 12 states
- **OpenClaw Integration** - Purpose-built agent API with idempotency
- **Neon-Noir UI** - Glassmorphism aesthetic with cyan/purple accents
- **Audit Trail** - Every state change logged with actor and timestamp
- **Rate Limiting** - Daily email send limits with database enforcement
- **SMTP Integration** - Send emails via configurable SMTP
- **Google Sheets Sync** - Import/export leads to Sheets
- **API-First Design** - RESTful API with OpenAPI 3.0 spec

---

## 🧠 Autonomous AI Companion

Heimdell CRM isn't just a data store—it's an **intelligent AI companion** powered by OpenClaw that learns, adapts, and grows with you.

### Core Capabilities

- **🎯 Priority Intelligence**: Automatic scoring (0-10) based on engagement, status, and timing
- **📱 Multi-Channel Orchestration**: Smart recommendations for email, LinkedIn, calls, WhatsApp
- **⏰ Daily Routines**: Automated scans at 6am, 12pm, 6pm, 11pm for overdue leads, replies, and stalled pipelines
- **💡 Personalization Engine**: Role-based messaging (CEO/CTO/VP), LinkedIn research, company news integration
- **📈 Learning System**: Pattern recognition, A/B testing, weekly performance analysis
- **⚡ Real-Time Response**: CRITICAL priority alerts for replied leads (<2hr response target)
- **🛡️ Safety Guardrails**: Rate limiting (3 emails/7 days), timezone respect, explicit opt-out handling

### Getting Started with OpenClaw

1. **Subscribe to Webhooks**: Receive real-time events for lead activities
   ```bash
   POST /api/agent/webhooks/subscribe
   {
     "url": "https://your-openclaw.com/webhook",
     "events": ["lead.replied", "lead.qualified", "lead.stalled"],
     "description": "OpenClaw production webhook"
   }
   ```

2. **Get Lead Context**: Rich intelligence for decision-making
   ```bash
   GET /api/agent/context/{lead_id}
   # Returns: metrics, recommendations, AI insights, personalization hints
   ```

3. **Execute Actions**: Update lead status with webhook notifications triggered automatically
   ```bash
   POST /api/agent/leads/{lead_id}/actions
   {
     "action_type": "SEND_EMAIL_1",
     "reason": "Initial cold outreach with personalized ROI focus"
   }
   ```

📖 **Full Documentation**: See [OPENCLAW-AGENT-BRAIN.md](./OPENCLAW-AGENT-BRAIN.md) for complete agent configuration and decision framework.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/heimdell-crm.git
cd heimdell-crm

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with sample data
npm run seed
# ⚠️ SAVE THE API KEY OUTPUT
```

### Development

```bash
npm run dev
# Open http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

---

## 🔑 API Key Management

API keys are generated during seeding:

```bash
npm run seed
```

Output:
```
🔑 API Key created:
   hmdl_549bee709a888863a06b8f84ebb00c08beb5b35e8c62d41708a1656ca1dac54e
   Save this key — it won't be shown again.
```

**Format:** `hmdl_<hex>`  
**Storage:** SHA-256 hash in `ApiKey` table  
**Usage:** `Authorization: Bearer hmdl_<key>`

---

## 📊 Status Flow

The CRM enforces a strict deterministic pipeline:

```
NEW → CONTACTED_1 → WAITING_D2 → CALL_DUE → CALLED 
  → WAITING_D1 → CONTACTED_2 → WA_VOICE_DUE 
  → REPLIED / QUALIFIED / NOT_INTERESTED / COMPLETED
```

### Outreach Flags
- `email_sent_1` - First email sent
- `dm_li_sent_1` - LinkedIn DM sent (first wave)
- `dm_fb_sent_1` - Facebook DM sent
- `dm_ig_sent_1` - Instagram DM sent
- `call_done` - Call completed
- `email_sent_2` - Second email sent
- `dm_sent_2` - Second wave DM sent
- `wa_voice_sent` - WhatsApp voice message sent

---

## 🤖 OpenClaw Integration

### Quick Health Check
```bash
# 1. Ping
curl https://crm.yourdomain.com/api/ping

# 2. Auth test
curl -H "Authorization: Bearer hmdl_YOUR_KEY" \
  https://crm.yourdomain.com/api/agent/auth-test

# 3. List leads
curl -H "Authorization: Bearer hmdl_YOUR_KEY" \
  https://crm.yourdomain.com/api/agent/leads?limit=5
```

### Advance Pipeline
```bash
curl -X POST https://crm.yourdomain.com/api/agent/leads/LEAD_ID/actions \
  -H "Authorization: Bearer hmdl_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "action_type": "SEND_EMAIL_1",
    "reason": "First outreach email sent"
  }'
```

### Documentation
- **OpenAPI Spec:** `/api/agent/openapi`
- **Deployment Guide:** [DEPLOYMENT-AWS.md](DEPLOYMENT-AWS.md)
- **Runbook:** [OPENCLAW-RUNBOOK.md](OPENCLAW-RUNBOOK.md)

---

## 🔌 API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/ping` | GET | ❌ | Health check |
| `/api/agent/health` | GET | ❌ | System metrics |
| `/api/agent/auth-test` | GET | ✅ | Verify API key |
| `/api/agent/leads` | GET | ✅ | List leads |
| `/api/agent/leads` | POST | ✅ | Create lead |
| `/api/agent/leads/:id` | GET | ✅ | Get lead details |
| `/api/agent/leads/:id` | PATCH | ✅ | Update lead |
| `/api/agent/leads/:id/actions` | POST | ✅ | Trigger action |
| `/api/agent/email/send` | POST | ✅ | Send email |
| `/api/agent/webhooks/delivery` | POST | ✅ | Delivery webhook |
| `/api/agent/openapi` | GET | ❌ | OpenAPI 3.0 spec |

---

## 🎨 UI Components

### Dashboard
- **Command Center** - Main control panel with glassmorphism
- **Filter Tabs** - Due Now, Calls Due, WA Voice Due, Replied, Stalled, All
- **Stats Bar** - 8 real-time metrics with neon highlights
- **Lead Rows** - Expandable with action buttons
- **Action HUD** - Modal for pipeline advancement

### Design System
- **Glassmorphism** - `backdrop-blur-md` with alpha transparency
- **Neon Glows** - Cyan (`#06b6d4`) and purple (`#a855f7`) shadows
- **Animations** - Framer Motion for tab transitions and modals
- **Dark Mode** - Full neon-noir aesthetic

---

## 🗃️ Database Schema

**Prisma 7** with Better-SQLite3 adapter

### Core Models
- `Lead` - Main contact/company entity
- `AuditLog` - State change history
- `LeadAction` - Idempotent action tracker
- `ApiKey` - Authentication keys
- `SendLimit` - Daily email quota
- `WebhookEvent` - Delivery status callbacks

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=file:./production.db

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Google Sheets (optional)
GOOGLE_SERVICE_ACCOUNT_KEY=

# Security
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## 🚢 Deployment

### AWS EC2 Deployment

See [DEPLOYMENT-AWS.md](DEPLOYMENT-AWS.md) for comprehensive guide.

**Quick Steps:**
1. Provision EC2 (t3.small+)
2. Install Node.js 20+ and Caddy
3. Clone repo to `/opt/heimdell-crm`
4. Configure `.env` with production values
5. Run `npm install && npx prisma migrate deploy && npm run build`
6. Seed database: `npm run seed`
7. Setup systemd service
8. Configure Caddy reverse proxy with TLS
9. Open Security Group port 443
10. Verify with: `curl https://crm.yourdomain.com/api/ping`

### Security Checklist
- [ ] TLS certificate configured
- [ ] SSH restricted to specific IPs
- [ ] API keys stored as SHA-256 hashes
- [ ] Database file permissions set correctly
- [ ] Rate limiting enabled
- [ ] Audit logging active
- [ ] Backup strategy in place

---

## 📈 Observability

### Audit Logs
All state changes logged with:
- `actor` - Format: `agent:<keyname>` or `user:<email>`
- `lead_id` - UUID of affected lead
- `action` - Action type (e.g., "SEND_EMAIL_1")
- `before_status` / `after_status` - State transition
- `timestamp_utc` - ISO 8601 timestamp

### Query Example
```sql
SELECT * FROM AuditLog 
WHERE actor LIKE 'agent:OpenClaw%' 
ORDER BY timestamp_utc DESC 
LIMIT 20;
```

---

## 🧪 Testing

### API Tests
```bash
# Health check
curl http://localhost:3000/api/ping

# Auth test (replace with your key)
curl -H "Authorization: Bearer hmdl_YOUR_KEY" \
  http://localhost:3000/api/agent/auth-test

# List leads
curl -H "Authorization: Bearer hmdl_YOUR_KEY" \
  http://localhost:3000/api/agent/leads
```

---

## 🛠️ Development

### Project Structure
```
heimdell-crm/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Sample data seeder
│   └── dev.db              # SQLite database (dev)
├── src/
│   ├── app/
│   │   ├── api/            # API routes
│   │   │   ├── ping/
│   │   │   └── agent/      # Agent endpoints
│   │   ├── globals.css     # Neon-noir theme
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/             # Base components
│   │   └── dashboard/      # Dashboard modules
│   ├── lib/
│   │   ├── db.ts           # Prisma client
│   │   ├── status-engine.ts # Status flow logic
│   │   ├── auth.ts         # API key validation
│   │   ├── audit.ts        # Audit logging
│   │   ├── smtp.ts         # Email sending
│   │   └── google-sheets.ts # Sheets integration
│   └── types/
│       └── lead.ts         # TypeScript interfaces
├── DEPLOYMENT-AWS.md       # AWS deployment guide
├── OPENCLAW-RUNBOOK.md     # OpenClaw integration
└── README.md
```

### Key Technologies
- **Next.js 14** - App Router, Server Components, API Routes
- **Prisma 7** - ORM with Better-SQLite3 adapter
- **TypeScript** - Full type safety
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **Nodemailer** - SMTP client
- **Google APIs** - Sheets integration

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Support

- **Documentation:** See `DEPLOYMENT-AWS.md` and `OPENCLAW-RUNBOOK.md`
- **Issues:** Open GitHub issue
- **Email:** your-email@yourdomain.com

---

**Built with ⚡ by [Your Name]**  
**For OpenClaw integration questions, see [OPENCLAW-RUNBOOK.md](OPENCLAW-RUNBOOK.md)**
