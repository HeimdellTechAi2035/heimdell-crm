import { NextResponse } from "next/server";

// ─── GET /api/agent/openapi ────────────────────────────────
// OpenAPI specification for OpenClaw integration
export async function GET() {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Heimdell CRM Agent API",
      version: "1.0.0",
      description: "Sales Outreach CRM API for OpenClaw Agent Integration",
      contact: {
        name: "Heimdell CRM",
        url: "https://heimdell.online",
      },
    },
    servers: [
      {
        url: "https://heimdell.online",
        description: "Production AWS Deployment",
      },
      {
        url: "http://localhost:3000",
        description: "Local Development",
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "hmdl_...",
          description: "Raw API key with format: hmdl_<hex>",
        },
      },
      schemas: {
        Lead: {
          type: "object",
          properties: {
            lead_id: { type: "string", format: "uuid" },
            company: { type: "string" },
            key_decision_maker: { type: "string" },
            role: { type: "string" },
            emails: { type: "array", items: { type: "string" } },
            number: { type: "string", nullable: true },
            linkedin_clean: { type: "string", nullable: true },
            facebook_clean: { type: "string", nullable: true },
            insta_clean: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: [
                "NEW",
                "CONTACTED_1",
                "WAITING_D2",
                "CALL_DUE",
                "CALLED",
                "WAITING_D1",
                "CONTACTED_2",
                "WA_VOICE_DUE",
                "REPLIED",
                "QUALIFIED",
                "NOT_INTERESTED",
                "COMPLETED",
              ],
            },
            last_action_utc: { type: "string", format: "date-time", nullable: true },
            next_action: { type: "string", nullable: true },
            next_action_due_utc: { type: "string", format: "date-time", nullable: true },
            owner: { type: "string", nullable: true },
            outcome: { type: "string", nullable: true },
            notes: { type: "string", nullable: true },
            qualified: { type: "boolean" },
            email_sent_1: { type: "boolean" },
            dm_li_sent_1: { type: "boolean" },
            dm_fb_sent_1: { type: "boolean" },
            dm_ig_sent_1: { type: "boolean" },
            call_done: { type: "boolean" },
            email_sent_2: { type: "boolean" },
            dm_sent_2: { type: "boolean" },
            wa_voice_sent: { type: "boolean" },
            replied_at_utc: { type: "string", format: "date-time", nullable: true },
            mobile_valid: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            lead_id: { type: "string", format: "uuid" },
            actor: { type: "string", description: "Format: agent:<keyname> or user:<email>" },
            timestamp_utc: { type: "string", format: "date-time" },
            before_status: { type: "string" },
            after_status: { type: "string" },
            action: { type: "string" },
            reason: { type: "string", nullable: true },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
            detail: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/api/ping": {
        get: {
          summary: "Health Check",
          description: "Returns service health status. No authentication required.",
          tags: ["System"],
          responses: {
            "200": {
              description: "Service is operational",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      service: { type: "string", example: "heimdell-crm" },
                      timestamp_utc: { type: "string", format: "date-time" },
                      version: { type: "string", example: "1.0.0" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/agent/health": {
        get: {
          summary: "Agent Health Status",
          description: "Detailed health check with uptime and system metrics.",
          tags: ["System"],
          responses: {
            "200": {
              description: "System health details",
            },
          },
        },
      },
      "/api/agent/auth-test": {
        get: {
          summary: "Auth Test",
          description: "Verify API key validity and permissions. Returns actor info and scoped permissions.",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Authentication successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      authenticated: { type: "boolean", example: true },
                      actor: { type: "string", example: "agent:OpenClaw" },
                      timestamp_utc: { type: "string", format: "date-time" },
                      permissions: {
                        type: "array",
                        items: { type: "string" },
                        example: ["leads:read", "leads:write", "pipeline:advance", "actions:write"],
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Authentication failed",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/api/agent/leads": {
        get: {
          summary: "List Leads",
          description: "Retrieve leads with optional filters. Supports pagination.",
          tags: ["Leads"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "query",
              schema: { type: "string" },
              description: "Filter by lead status",
            },
            {
              name: "owner",
              in: "query",
              schema: { type: "string" },
              description: "Filter by owner",
            },
            {
              name: "filter",
              in: "query",
              schema: {
                type: "string",
                enum: ["due_now", "calls_due", "wa_voice_due", "replied", "stalled"],
              },
              description: "Preset filter",
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 50, maximum: 100 },
            },
          ],
          responses: {
            "200": {
              description: "Lead list with pagination",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      leads: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Lead" },
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          total: { type: "integer" },
                          pages: { type: "integer" },
                        },
                      },
                      actor: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create Lead",
          description: "Create a new lead. Supports idempotency via header.",
          tags: ["Leads"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              schema: { type: "string" },
              description: "Unique key to prevent duplicate creation",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["company", "key_decision_maker", "role"],
                  properties: {
                    company: { type: "string" },
                    key_decision_maker: { type: "string" },
                    role: { type: "string" },
                    emails: { type: "array", items: { type: "string" } },
                    number: { type: "string" },
                    linkedin_clean: { type: "string" },
                    facebook_clean: { type: "string" },
                    insta_clean: { type: "string" },
                    owner: { type: "string" },
                    notes: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Lead created successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Lead" },
                },
              },
            },
            "409": {
              description: "Duplicate idempotency key",
            },
          },
        },
      },
      "/api/agent/leads/{id}": {
        get: {
          summary: "Get Lead Details",
          description: "Retrieve detailed information for a specific lead, including audit logs.",
          tags: ["Leads"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Lead details with audit trail",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Lead" },
                      {
                        type: "object",
                        properties: {
                          audit_logs: {
                            type: "array",
                            items: { $ref: "#/components/schemas/AuditLog" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "404": {
              description: "Lead not found",
            },
          },
        },
        patch: {
          summary: "Update Lead",
          description: "Partial update of lead fields. Status changes are validated against flow rules.",
          tags: ["Leads"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "Idempotency-Key",
              in: "header",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    notes: { type: "string" },
                    qualified: { type: "boolean" },
                    mobile_valid: { type: "boolean" },
                    reason: { type: "string", description: "Reason for update (logged in audit)" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Lead updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Lead" },
                },
              },
            },
            "400": {
              description: "Invalid status transition",
            },
          },
        },
      },
      "/api/agent/leads/{id}/actions": {
        post: {
          summary: "Trigger Lead Action (RECOMMENDED for OpenClaw)",
          description: "Deterministic pipeline advancement. Automatically calculates next status from current state.",
          tags: ["Actions"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "Idempotency-Key",
              in: "header",
              schema: { type: "string" },
              description: "REQUIRED for production usage",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    action_type: {
                      type: "string",
                      description: "Action identifier for logging",
                      example: "SEND_EMAIL_1",
                    },
                    target_status: {
                      type: "string",
                      description: "Optional: Force specific target status (must be valid transition)",
                    },
                    reason: {
                      type: "string",
                      description: "Human-readable reason for audit log",
                    },
                    payload: {
                      type: "object",
                      description: "Additional metadata (stored as JSON)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Action executed successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      lead: { $ref: "#/components/schemas/Lead" },
                      transition: {
                        type: "object",
                        properties: {
                          from: { type: "string" },
                          to: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Invalid transition or no valid next status",
            },
            "409": {
              description: "Duplicate idempotency key",
            },
          },
        },
      },
      "/api/agent/email/send": {
        post: {
          summary: "Send Email",
          description: "Send transactional email via SMTP. Subject to daily rate limits.",
          tags: ["Email"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["to", "subject", "html"],
                  properties: {
                    to: { type: "string", format: "email" },
                    subject: { type: "string" },
                    html: { type: "string", description: "HTML email body" },
                    lead_id: {
                      type: "string",
                      format: "uuid",
                      description: "Associate with lead for audit trail",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Email sent successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      messageId: { type: "string" },
                      remaining_sends: { type: "integer" },
                    },
                  },
                },
              },
            },
            "429": {
              description: "Daily send limit exceeded",
            },
          },
        },
      },
    },
    tags: [
      { name: "System", description: "Health and system status" },
      { name: "Auth", description: "Authentication and authorization" },
      { name: "Leads", description: "Lead CRUD operations" },
      { name: "Actions", description: "Pipeline actions and transitions" },
      { name: "Email", description: "Email operations" },
    ],
  };

  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
