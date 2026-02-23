import { google } from "googleapis";

// ─── Column Mapping ────────────────────────────────────────
const COLUMN_MAP: Record<string, string> = {
  lead_id: "Lead ID",
  company: "Company",
  key_decision_maker: "Decision Maker",
  role: "Role",
  emails: "Emails",
  number: "Phone",
  linkedin_clean: "LinkedIn",
  facebook_clean: "Facebook",
  insta_clean: "Instagram",
  status: "Status",
  last_action_utc: "Last Action",
  next_action: "Next Action",
  next_action_due_utc: "Next Due",
  owner: "Owner",
  outcome: "Outcome",
  notes: "Notes",
  qualified: "Qualified",
  email_sent_1: "Email 1 Sent",
  dm_li_sent_1: "DM LI 1",
  dm_fb_sent_1: "DM FB 1",
  dm_ig_sent_1: "DM IG 1",
  call_done: "Call Done",
  email_sent_2: "Email 2 Sent",
  dm_sent_2: "DM 2 Sent",
  wa_voice_sent: "WA Voice",
  mobile_valid: "Mobile Valid",
};

function getAuth() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentials) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not set");

  const parsed = JSON.parse(credentials);
  const auth = new google.auth.GoogleAuth({
    credentials: parsed,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return auth;
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ─── Read all rows from sheet ──────────────────────────────
export async function readSheetData(
  spreadsheetId: string,
  range: string = "Sheet1"
): Promise<Record<string, string>[]> {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0];
  const data: Record<string, string>[] = [];

  // Reverse map column names to field names
  const reverseMap: Record<string, string> = {};
  for (const [field, col] of Object.entries(COLUMN_MAP)) {
    reverseMap[col] = field;
  }

  for (let i = 1; i < rows.length; i++) {
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const fieldName = reverseMap[headers[j]] || headers[j];
      row[fieldName] = rows[i][j] || "";
    }
    data.push(row);
  }

  return data;
}

// ─── Write leads to sheet ──────────────────────────────────
export async function writeSheetData(
  spreadsheetId: string,
  leads: Record<string, unknown>[],
  range: string = "Sheet1"
): Promise<void> {
  const sheets = getSheets();

  const headers = Object.values(COLUMN_MAP);
  const fields = Object.keys(COLUMN_MAP);

  const rows = leads.map((lead) =>
    fields.map((field) => {
      const val = lead[field];
      if (val === null || val === undefined) return "";
      if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
      if (val instanceof Date) return val.toISOString();
      return String(val);
    })
  );

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${range}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers, ...rows],
    },
  });
}

export { COLUMN_MAP };
