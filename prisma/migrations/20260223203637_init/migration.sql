-- CreateTable
CREATE TABLE "Lead" (
    "lead_id" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT NOT NULL,
    "key_decision_maker" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "emails" TEXT NOT NULL DEFAULT '[]',
    "number" TEXT,
    "linkedin_clean" TEXT,
    "facebook_clean" TEXT,
    "insta_clean" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "last_action_utc" DATETIME,
    "next_action" TEXT,
    "next_action_due_utc" DATETIME,
    "owner" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_1" BOOLEAN NOT NULL DEFAULT false,
    "dm_li_sent_1" BOOLEAN NOT NULL DEFAULT false,
    "dm_fb_sent_1" BOOLEAN NOT NULL DEFAULT false,
    "dm_ig_sent_1" BOOLEAN NOT NULL DEFAULT false,
    "call_done" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_2" BOOLEAN NOT NULL DEFAULT false,
    "dm_sent_2" BOOLEAN NOT NULL DEFAULT false,
    "wa_voice_sent" BOOLEAN NOT NULL DEFAULT false,
    "replied_at_utc" DATETIME,
    "mobile_valid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lead_id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "timestamp_utc" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "before_status" TEXT NOT NULL,
    "after_status" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    CONSTRAINT "AuditLog_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead" ("lead_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lead_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "payload" TEXT,
    "idempotency_key" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadAction_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead" ("lead_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key_hash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SendLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date_key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "max_limit" INTEGER NOT NULL DEFAULT 50
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_next_action_due_utc_idx" ON "Lead"("next_action_due_utc");

-- CreateIndex
CREATE INDEX "Lead_owner_idx" ON "Lead"("owner");

-- CreateIndex
CREATE INDEX "AuditLog_lead_id_idx" ON "AuditLog"("lead_id");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_utc_idx" ON "AuditLog"("timestamp_utc");

-- CreateIndex
CREATE UNIQUE INDEX "LeadAction_idempotency_key_key" ON "LeadAction"("idempotency_key");

-- CreateIndex
CREATE INDEX "LeadAction_lead_id_idx" ON "LeadAction"("lead_id");

-- CreateIndex
CREATE INDEX "LeadAction_idempotency_key_idx" ON "LeadAction"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_hash_key" ON "ApiKey"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "SendLimit_date_key_key" ON "SendLimit"("date_key");

-- CreateIndex
CREATE INDEX "WebhookEvent_event_type_idx" ON "WebhookEvent"("event_type");
