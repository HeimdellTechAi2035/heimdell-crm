// Seed script: Generate an API key and sample leads
// Run with: npx tsx prisma/seed.ts

import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "dev.db");

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function main() {
  console.log("🌱 Seeding Heimdell CRM...\n");

  // ─── Create API Key ────────────────────────────────────────
  const rawKey = `hmdl_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = hashKey(rawKey);

  await prisma.apiKey.upsert({
    where: { key_hash: keyHash },
    update: {},
    create: {
      key_hash: keyHash,
      label: "default-agent",
      active: true,
    },
  });

  console.log("🔑 API Key created:");
  console.log(`   ${rawKey}`);
  console.log("   Save this key — it won't be shown again.\n");

  // ─── Create Sample Leads ───────────────────────────────────
  const leads = [
    {
      company: "TechVista Solutions",
      key_decision_maker: "Sarah Chen",
      role: "VP of Engineering",
      emails: JSON.stringify(["sarah@techvista.io"]),
      number: "+1-555-0101",
      linkedin_clean: "https://linkedin.com/in/sarachen",
      facebook_clean: "https://facebook.com/sarahchen",
      insta_clean: "https://instagram.com/sarahchen_tech",
      status: "NEW",
      next_action: "Send Email #1 + DMs (LI, FB, IG)",
      owner: "default-agent",
    },
    {
      company: "Nexus Digital",
      key_decision_maker: "James Wright",
      role: "CTO",
      emails: JSON.stringify(["james@nexusdigital.com", "jwright@nexusdigital.com"]),
      number: "+1-555-0202",
      linkedin_clean: "https://linkedin.com/in/jameswcto",
      status: "CONTACTED_1",
      next_action: "Send DMs Round 1",
      owner: "default-agent",
      email_sent_1: true,
      last_action_utc: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      company: "Quantum Leap AI",
      key_decision_maker: "Dr. Amara Obi",
      role: "CEO",
      emails: JSON.stringify(["amara@quantumleap.ai"]),
      number: "+44-7700-900100",
      linkedin_clean: "https://linkedin.com/in/amaraobi",
      insta_clean: "https://instagram.com/amaraobi_ai",
      status: "CALL_DUE",
      next_action: "Make Phone Call",
      next_action_due_utc: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (overdue)
      owner: "default-agent",
      email_sent_1: true,
      dm_li_sent_1: true,
      dm_fb_sent_1: true,
      dm_ig_sent_1: true,
      mobile_valid: true,
      last_action_utc: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      company: "Stellar Dynamics",
      key_decision_maker: "Marcus Rivera",
      role: "Head of Sales",
      emails: JSON.stringify(["marcus@stellardyn.com"]),
      number: "+1-555-0404",
      linkedin_clean: "https://linkedin.com/in/marcusrivera",
      facebook_clean: "https://facebook.com/mrivera",
      status: "WA_VOICE_DUE",
      next_action: "Send WA Voice & Wait for Reply",
      owner: "default-agent",
      email_sent_1: true,
      dm_li_sent_1: true,
      dm_fb_sent_1: true,
      call_done: true,
      email_sent_2: true,
      dm_sent_2: true,
      last_action_utc: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      company: "Forge Industries",
      key_decision_maker: "Liu Wei",
      role: "Director of Operations",
      emails: JSON.stringify(["lwei@forgeindustries.com"]),
      number: "+86-138-0000-0001",
      linkedin_clean: "https://linkedin.com/in/liuwei-forge",
      status: "REPLIED",
      next_action: "Qualify or Disqualify",
      owner: "default-agent",
      email_sent_1: true,
      dm_li_sent_1: true,
      call_done: true,
      email_sent_2: true,
      wa_voice_sent: true,
      replied_at_utc: new Date(Date.now() - 6 * 60 * 60 * 1000),
      last_action_utc: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      company: "Helix BioTech",
      key_decision_maker: "Emma Thompson",
      role: "CFO",
      emails: JSON.stringify(["emma.t@helixbio.com"]),
      linkedin_clean: "https://linkedin.com/in/emmathompson-cfo",
      status: "WAITING_D2",
      next_action: "Wait 2 days, then Call",
      next_action_due_utc: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // Stalled
      owner: "default-agent",
      email_sent_1: true,
      dm_li_sent_1: true,
      dm_fb_sent_1: true,
      dm_ig_sent_1: true,
      last_action_utc: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const lead of leads) {
    await prisma.lead.create({ data: lead });
  }

  console.log(`✅ Created ${leads.length} sample leads\n`);

  // ─── Create Send Limit for Today ─────────────────────────
  const today = new Date().toISOString().split("T")[0];
  await prisma.sendLimit.upsert({
    where: { date_key: today },
    update: {},
    create: { date_key: today, count: 0, max_limit: 50 },
  });

  console.log("📊 Send limit initialized (50/day)\n");
  console.log("─────────────────────────────────────────");
  console.log("🚀 Seed complete! Start the app with: npm run dev");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
