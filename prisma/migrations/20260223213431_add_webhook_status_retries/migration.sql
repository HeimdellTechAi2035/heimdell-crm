-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_WebhookEvent" ("created_at", "event_type", "id", "payload", "processed") SELECT "created_at", "event_type", "id", "payload", "processed" FROM "WebhookEvent";
DROP TABLE "WebhookEvent";
ALTER TABLE "new_WebhookEvent" RENAME TO "WebhookEvent";
CREATE INDEX "WebhookEvent_event_type_idx" ON "WebhookEvent"("event_type");
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
