# 🚀 OpenClaw Quick Start Guide

Get your AI companion connected to Heimdell CRM in 5 minutes.

---

## Prerequisites

- Heimdell CRM running on AWS (see [DEPLOYMENT-AWS.md](./DEPLOYMENT-AWS.md))
- OpenClaw instance with HTTP capabilities
- API key from Heimdell CRM (generated during `npm run seed`)

---

## Step 1: Configure OpenClaw Connection

Add these environment variables to your OpenClaw configuration:

```bash
HEIMDELL_API_URL=https://your-crm.aws.com
HEIMDELL_API_KEY=hmdl_549bee709a888863a06b8f84ebb00c08beb5b35e8c62d41708a1656ca1dac54e
HEIMDELL_WEBHOOK_URL=https://your-openclaw.com/webhook/heimdell
```

---

## Step 2: Subscribe to Webhooks

Tell Heimdell where to send real-time events:

```bash
curl -X POST https://your-crm.aws.com/api/agent/webhooks/subscribe \
  -H "Authorization: Bearer hmdl_549bee..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-openclaw.com/webhook/heimdell",
    "events": [
      "lead.replied",
      "lead.qualified",
      "lead.stalled",
      "lead.status_changed",
      "lead.created"
    ],
    "description": "OpenClaw production webhook"
  }'
```

**Response:**
```json
{
  "success": true,
  "webhook_id": "wh_abc123...",
  "subscribed_events": ["lead.replied", "lead.qualified", "lead.stalled", "lead.status_changed", "lead.created"]
}
```

---

## Step 3: Implement Webhook Handler

Create a webhook receiver in your OpenClaw instance:

```python
# openclaw_webhook_handler.py

@app.post("/webhook/heimdell")
async def handle_heimdell_webhook(request: Request):
    headers = request.headers
    body = await request.json()
    
    event_type = headers.get("X-Heimdell-Event")
    webhook_id = headers.get("X-Heimdell-Webhook-Id")
    
    if event_type == "lead.replied":
        # CRITICAL PRIORITY - Respond within 2 hours
        lead_id = body["lead_id"]
        await respond_to_replied_lead(lead_id)
        
    elif event_type == "lead.qualified":
        # HIGH PRIORITY - Schedule meeting
        lead_id = body["lead_id"]
        await schedule_qualified_meeting(lead_id)
        
    elif event_type == "lead.stalled":
        # MEDIUM PRIORITY - Re-engagement strategy
        lead_id = body["lead_id"]
        await plan_reengagement(lead_id)
        
    elif event_type == "lead.status_changed":
        # LOW PRIORITY - Log the transition
        await log_status_change(body)
        
    return {"status": "received"}
```

---

## Step 4: Integrate Context API for Intelligent Decisions

Before taking any action on a lead, get the full context:

```python
async def get_lead_intelligence(lead_id: str):
    response = requests.get(
        f"https://your-crm.aws.com/api/agent/context/{lead_id}",
        headers={"Authorization": f"Bearer {HEIMDELL_API_KEY}"}
    )
    
    context = response.json()
    
    # Extract key intelligence
    priority_score = context["metrics"]["priority_score"]  # 0-10
    should_act_now = context["recommendations"]["should_act_now"]  # boolean
    next_channel = context["recommendations"]["next_channel"]  # email/linkedin/call/whatsapp
    timing = context["recommendations"]["timing"]  # send_now/wait_until_morning/lunch_time_good
    
    # Get AI insights
    engagement_level = context["ai_insights"]["engagement_level"]  # cold/lukewarm/warm
    template = context["ai_insights"]["recommended_template"]  # cold_outreach_v2/follow_up_value/...
    personalization = context["ai_insights"]["personalization_hints"]
    
    return context
```

**Example Context Response:**
```json
{
  "lead": {
    "lead_id": "abc123",
    "company": "Acme Corp",
    "key_decision_maker": "Jane Smith",
    "role": "CEO",
    "status": "WAITING_D2"
  },
  "metrics": {
    "days_in_pipeline": 5,
    "days_since_last_action": 2,
    "total_touches": 1,
    "channel_touches": {
      "email": 1,
      "linkedin": 0,
      "call": 0
    },
    "priority_score": 7
  },
  "recommendations": {
    "next_channel": "linkedin",
    "timing": "send_now",
    "urgency": "medium",
    "should_act_now": true
  },
  "ai_insights": {
    "engagement_level": "lukewarm",
    "response_likelihood": "medium",
    "recommended_template": "follow_up_value",
    "personalization_hints": [
      "Focus on ROI and scaling (CEO persona)",
      "Check recent LinkedIn activity",
      "Research company news"
    ]
  }
}
```

---

## Step 5: Daily Routine Implementation

Set up cron jobs or scheduled tasks in OpenClaw:

```python
# Daily routine schedule (times in UTC)

# 6:00 AM - Scan overdue leads
@cron("0 6 * * *")
async def morning_overdue_scan():
    leads = await get_leads(filter="due_now")
    for lead in leads:
        context = await get_lead_intelligence(lead["lead_id"])
        if context["recommendations"]["should_act_now"]:
            await execute_next_action(lead["lead_id"], context)

# 12:00 PM - Check for replies
@cron("0 12 * * *")
async def midday_reply_check():
    leads = await get_leads(filter="replied")
    for lead in leads:
        context = await get_lead_intelligence(lead["lead_id"])
        await respond_intelligently(lead["lead_id"], context)

# 6:00 PM - Advance pipeline
@cron("0 18 * * *")
async def evening_pipeline_advance():
    leads = await get_leads(filter="due_now")
    for lead in leads:
        context = await get_lead_intelligence(lead["lead_id"])
        if context["metrics"]["priority_score"] >= 7:
            await advance_high_priority_lead(lead["lead_id"], context)

# 11:00 PM - Audit stalled leads
@cron("0 23 * * *")
async def night_stalled_audit():
    leads = await get_leads(filter="stalled")
    for lead in leads:
        context = await get_lead_intelligence(lead["lead_id"])
        if context["metrics"]["days_since_last_action"] >= 3:
            await plan_reengagement(lead["lead_id"], context)
```

---

## Step 6: Execute Actions

When you're ready to take action, use the actions API:

```python
async def send_personalized_email(lead_id: str, context: dict):
    # Get context-aware recommendations
    template = context["ai_insights"]["recommended_template"]
    personalization = context["ai_insights"]["personalization_hints"]
    
    # Compose email using template + personalization
    email_body = compose_email(template, personalization)
    
    # Execute action via Heimdell
    response = requests.post(
        f"https://your-crm.aws.com/api/agent/leads/{lead_id}/actions",
        headers={
            "Authorization": f"Bearer {HEIMDELL_API_KEY}",
            "Idempotency-Key": f"email_{lead_id}_{int(time.time())}",
            "Content-Type": "application/json"
        },
        json={
            "action_type": "SEND_EMAIL_1",
            "reason": f"Personalized outreach using {template}",
            "payload": {
                "template": template,
                "personalization": personalization
            }
        }
    )
    
    # Webhook will be triggered automatically
    return response.json()
```

---

## Step 7: Learning & Optimization

Track performance and improve over time:

```python
# Weekly analysis (every Monday at 9am)
@cron("0 9 * * 1")
async def weekly_learning():
    # Get all leads modified in past week
    leads = await get_leads(updated_since="7d")
    
    stats = {
        "total_touches": 0,
        "replied": 0,
        "qualified": 0,
        "response_rate": 0,
        "qualified_rate": 0,
        "avg_time_to_reply": 0
    }
    
    for lead in leads:
        context = await get_lead_intelligence(lead["lead_id"])
        stats["total_touches"] += context["metrics"]["total_touches"]
        
        if lead["status"] == "REPLIED":
            stats["replied"] += 1
        if lead["qualified"]:
            stats["qualified"] += 1
    
    stats["response_rate"] = stats["replied"] / len(leads) * 100
    stats["qualified_rate"] = stats["qualified"] / len(leads) * 100
    
    # Log for analysis
    await log_weekly_performance(stats)
    
    # Adjust strategy if needed
    if stats["response_rate"] < 15:
        await experiment_with_new_templates()
```

---

## 🎯 Success Criteria

Your AI companion is working when you see:

- ✅ **15%+ Response Rate**: Leads replying to outreach
- ✅ **5%+ Qualified Rate**: Converting to meetings/demos
- ✅ **<2 Hour Reply Time**: REPLIED leads responded to quickly
- ✅ **Zero Stalled Leads**: All leads progressing or archived
- ✅ **Multi-Channel Mix**: Balanced use of email/LinkedIn/calls/WhatsApp

---

## 📚 Additional Resources

- [OPENCLAW-AGENT-BRAIN.md](./OPENCLAW-AGENT-BRAIN.md) - Complete agent configuration and decision framework
- [OPENCLAW-RUNBOOK.md](./OPENCLAW-RUNBOOK.md) - API reference and troubleshooting
- [DEPLOYMENT-AWS.md](./DEPLOYMENT-AWS.md) - AWS deployment guide
- [openapi.yaml](./openapi.yaml) - Complete API specification

---

## 🆘 Troubleshooting

### Webhooks not arriving?

```bash
# Check webhook subscription
curl https://your-crm.aws.com/api/agent/webhooks/subscribe \
  -H "Authorization: Bearer hmdl_549bee..."

# Verify webhook URL is publicly accessible
curl -X POST https://your-openclaw.com/webhook/heimdell \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Rate limit errors?

Check daily send count:
```bash
curl https://your-crm.aws.com/api/agent/config/rate-limit \
  -H "Authorization: Bearer hmdl_549bee..."
```

### Context API returning errors?

Verify lead exists:
```bash
curl https://your-crm.aws.com/api/agent/leads/{lead_id} \
  -H "Authorization: Bearer hmdl_549bee..."
```

---

## 🎉 You're Ready!

Your AI companion is now connected and ready to:
- **Learn** from every interaction
- **Adapt** to what works
- **Scale** your outreach intelligently
- **Stay with you** as your lifelong sales partner

Start by subscribing to webhooks and implementing the daily routines. The AI will handle the rest! 🚀
