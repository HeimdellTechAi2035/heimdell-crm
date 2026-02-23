# OpenClaw → Heimdell CRM Integration Runbook

Quick reference for connecting OpenClaw agent to Heimdell CRM on AWS.

---

## Prerequisites

1. **CRM deployed to AWS** with public HTTPS endpoint
2. **API key generated** via `npm run seed` command
3. **DNS configured** pointing to EC2 instance or ALB

---

## Health Check Sequence

Run these curl commands in order to verify connectivity:

### 1. Ping Check (No Auth Required)
```bash
curl -X GET https://crm.yourdomain.com/api/ping
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "heimdell-crm",
  "timestamp_utc": "2025-02-23T14:30:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

---

### 2. Auth Test
```bash
curl -X GET https://crm.yourdomain.com/api/agent/auth-test \
  -H "Authorization: Bearer hmdl_YOUR_API_KEY_HERE"
```

**Expected Response:**
```json
{
  "authenticated": true,
  "actor": "agent:OpenClaw",
  "timestamp_utc": "2025-02-23T14:30:00.000Z",
  "permissions": [
    "leads:read",
    "leads:write",
    "pipeline:advance",
    "actions:write",
    "email:send"
  ]
}
```

**Troubleshooting:**
- **401 Unauthorized:** Check API key format (must start with `hmdl_`)
- **403 Forbidden:** Key exists but is revoked
- **500 Error:** Database connection issue

---

### 3. List Leads (Confirm Data Access)
```bash
curl -X GET "https://crm.yourdomain.com/api/agent/leads?limit=5" \
  -H "Authorization: Bearer hmdl_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "leads": [
    {
      "lead_id": "550e8400-e29b-41d4-a716-446655440000",
      "company": "TechVista Solutions",
      "status": "NEW",
      "next_action": "Send first email",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 6,
    "pages": 2
  },
  "actor": "agent:OpenClaw"
}
```

---

### 4. Test Action on Dummy Lead
```bash
# Replace LEAD_ID with actual lead_id from step 3
curl -X POST https://crm.yourdomain.com/api/agent/leads/LEAD_ID/actions \
  -H "Authorization: Bearer hmdl_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "action_type": "HEALTH_CHECK",
    "reason": "OpenClaw connectivity test"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "lead": {
    "lead_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "CONTACTED_1",
    "last_action_utc": "2025-02-23T14:30:00.000Z",
    ...
  },
  "transition": {
    "from": "NEW",
    "to": "CONTACTED_1"
  }
}
```

---

## Common OpenClaw Operations

### Fetch Due Leads
```bash
curl -X GET "https://crm.yourdomain.com/api/agent/leads?filter=due_now" \
  -H "Authorization: Bearer hmdl_YOUR_API_KEY_HERE"
```

### Advance Pipeline (Send Email 1)
```bash
curl -X POST https://crm.yourdomain.com/api/agent/leads/LEAD_ID/actions \
  -H "Authorization: Bearer hmdl_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "action_type": "SEND_EMAIL_1",
    "reason": "First outreach email sent via template cold_v2",
    "payload": {
      "template_id": "cold_outreach_v2",
      "sent_at": "2025-02-23T14:30:00Z"
    }
  }'
```

### Mark Call Complete
```bash
curl -X POST https://crm.yourdomain.com/api/agent/leads/LEAD_ID/actions \
  -H "Authorization: Bearer hmdl_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "action_type": "COMPLETE_CALL",
    "reason": "Call completed - prospect interested in demo",
    "payload": {
      "call_duration_seconds": 320,
      "outcome": "demo_scheduled"
    }
  }'
```

### Get Lead Details + Audit Trail
```bash
curl -X GET https://crm.yourdomain.com/api/agent/leads/LEAD_ID \
  -H "Authorization: Bearer hmdl_YOUR_API_KEY_HERE"
```

**Response includes full audit log:**
```json
{
  "lead_id": "...",
  "company": "...",
  "status": "CALLED",
  "audit_logs": [
    {
      "id": "...",
      "actor": "agent:OpenClaw",
      "timestamp_utc": "2025-02-23T14:30:00.000Z",
      "before_status": "CALL_DUE",
      "after_status": "CALLED",
      "action": "COMPLETE_CALL",
      "reason": "Call completed - prospect interested in demo"
    }
  ]
}
```

---

## Status Flow Reference

OpenClaw should follow this deterministic pipeline:

```
NEW
  ↓ (email sent)
CONTACTED_1
  ↓ (automatic after 2 days)
WAITING_D2
  ↓ (time triggers)
CALL_DUE
  ↓ (call completed)
CALLED
  ↓ (automatic after 1 day)
WAITING_D1
  ↓ (time triggers)
CONTACTED_2
  ↓ (email/dm sent)
WA_VOICE_DUE
  ↓ (final outreach)
REPLIED / QUALIFIED / NOT_INTERESTED / COMPLETED
```

**Terminal States** (no further transitions):
- `REPLIED` - Prospect responded
- `QUALIFIED` - Ready for sales handoff
- `NOT_INTERESTED` - Explicit rejection
- `COMPLETED` - All outreach done, no response

---

## Idempotency Best Practices

Always include `Idempotency-Key` header for POST requests:

```bash
# Generate UUID v4
IDEMPOTENCY_KEY=$(uuidgen)

curl -X POST https://crm.yourdomain.com/api/agent/leads/LEAD_ID/actions \
  -H "Authorization: Bearer hmdl_YOUR_API_KEY_HERE" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"action_type":"SEND_EMAIL_1"}'
```

**Benefits:**
- Prevents duplicate actions if request times out
- Safe to retry failed requests with same key
- Stored in `LeadAction` table for audit

---

## Rate Limits

- **Email sending:** 50 per day (configurable)
- **API requests:** No hard limit (reasonable use expected)

If you hit rate limits:
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "detail": "Daily email send limit reached (50/50)",
  "reset_at_utc": "2025-02-24T00:00:00.000Z"
}
```

---

## OpenAPI Specification

Machine-readable API documentation:
```bash
curl https://crm.yourdomain.com/api/agent/openapi
```

Use this URL in OpenClaw's API connector for auto-discovery.

---

## Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | Key revoked or lacks permission |
| 404 | `NOT_FOUND` | Lead ID doesn't exist |
| 409 | `CONFLICT` | Duplicate idempotency key |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 400 | `INVALID_TRANSITION` | Status flow violation |
| 500 | `INTERNAL_ERROR` | Server error (check logs) |

---

## Monitoring

### CloudWatch Logs (AWS)
```bash
# View recent logs
aws logs tail /aws/ec2/heimdell-crm --follow
```

### Audit Log Query
```sql
-- See all OpenClaw actions
SELECT * FROM AuditLog 
WHERE actor LIKE 'agent:OpenClaw%' 
ORDER BY timestamp_utc DESC 
LIMIT 50;
```

### Health Dashboard
Monitor at: `https://crm.yourdomain.com/api/agent/health`

---

## Emergency Contacts

**CRM Owner:** your-email@yourdomain.com  
**AWS Account:** aws-account-id  
**API Key Storage:** 1Password vault "Heimdell CRM"  
**Runbook Location:** `/opt/heimdell-crm/OPENCLAW-RUNBOOK.md`

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 error | Check Bearer token format: `Authorization: Bearer hmdl_...` |
| 404 on lead | Verify lead_id is valid UUID from `/api/agent/leads` |
| Action fails | Check current status allows transition (see flow diagram) |
| Slow response | Check EC2 CPU/memory, scale instance if needed |
| TLS error | Verify certificate: `curl -vI https://crm.yourdomain.com` |

---

**Last Updated:** 2025-02-23  
**CRM Version:** 1.0.0  
**OpenClaw Compatibility:** Tested with OpenClaw v2.4+