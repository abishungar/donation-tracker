const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { writeLog } = require("../utils/log");
const { sendMail, verifySmtp, getEmailConfig } = require("../utils/mailer");

const router = express.Router();
router.use(authenticate, authorize("admin"));

async function main(req, res, next) {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u?.isMainAdmin) return res.status(403).json({ error: "Main Admin permission required" });
    req.mainAdmin = u;
    next();
  } catch (err) { next(err); }
}

router.get("/settings", main, async (req, res) => {
  const o = await getEmailConfig();
  // Main Admin controls are not exposed as an editable protection setting.
  delete o.lock_main_admin;
  res.json(o);
});

router.put("/settings", main, async (req, res) => {
  const allowed = [
    "email_mode",
    "smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_app_password", "smtp_from",
    "google_form_id", "google_form_email_entry", "google_form_name_entry", "google_form_from_entry", "google_form_subject_entry", "google_form_body_entry", "google_form_default_name", "google_form_default_from",
  ];
  for (const key of allowed) {
    const value = req.body?.[key];
    // Keep a previously saved App Password when the UI returns an empty password.
    if (key === "smtp_app_password" && value === "") continue;
    if (value !== undefined && value !== "") {
      await prisma.appSetting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
    }
  }
  await writeLog(req, "UPDATE_MAIN_ADMIN_SETTINGS", { emailMode: req.body?.email_mode || "smtp" });
  res.json({ success: true });
});

router.post("/email/test", main, async (req, res) => {
  const to = String(req.body?.to || req.mainAdmin.email || "").trim();
  if (!to) return res.status(400).json({ error: "Enter a test recipient email." });
  try {
    const cfg = await getEmailConfig();
    const mode = String(cfg.email_mode || "smtp").toLowerCase();
    if (mode === "google_form" || mode === "google-form" || mode === "form") {
      const info = await sendMail(to, "Donation Tracker — Google Form Test", `<p>This is a test email submission from Donation Tracker.</p><p>If your Google Form automation is configured to send email, it should now send this message.</p>`, { name: req.mainAdmin.name || req.mainAdmin.email, from: cfg.smtp_from || cfg.smtp_user || "" });
      await writeLog(req, "TEST_EMAIL_SENT", { to, mode: "google_form", messageId: info.messageId });
      return res.json({ success: true, message: `Google Form submission sent for ${to}.`, messageId: info.messageId });
    }
    const result = await verifySmtp();
    const info = await sendMail(to, "Donation Tracker — SMTP Test", `<p>This is a test email from Donation Tracker.</p><p>SMTP connection and authentication succeeded.</p><p>Server: ${result.host}:${result.port}</p>`);
    await writeLog(req, "TEST_EMAIL_SENT", { to, mode: "smtp", messageId: info.messageId, host: result.host, port: result.port });
    res.json({ success: true, message: `Test email sent to ${to}.`, messageId: info.messageId });
  } catch (err) {
    console.error("Email test failed:", err);
    await writeLog(req, "TEST_EMAIL_FAILED", { to, error: err.message });
    res.status(502).json({ error: `Email test failed: ${err.message}` });
  }
});

router.post("/users/:id/reset-password", main, async (req, res) => {
  const id = Number(req.params.id);
  const hash = await bcrypt.hash(req.body.password || "ChangeMe123!", 10);
  await prisma.user.update({ where: { id }, data: { password: hash, passwordSet: true } });
  res.json({ success: true });
});

router.post("/users/:id/reset-pin", main, async (req, res) => {
  const id = Number(req.params.id), pin = String(req.body.pin || "");
  if (pin.length < 4) return res.status(400).json({ error: "PIN must be at least 4 characters" });
  await prisma.user.update({ where: { id }, data: { pinHash: await bcrypt.hash(pin, 10) } });
  res.json({ success: true });
});

router.get("/export", main, async (req, res) => {
  const [contacts, groups, users, donations] = await Promise.all([
    prisma.contact.findMany(), prisma.group.findMany(),
    prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, contactId: true, isMainAdmin: true, createdAt: true } }),
    prisma.donation.findMany(),
  ]);
  res.json({ contacts, groups, users, donations });
});

router.post("/import", main, async (req, res) => {
  const { rows, mapping = {} } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: "rows array is required" });
  let created = 0;
  for (const row of rows) {
    const get = (k) => row[mapping[k] || k];
    const firstName = get("firstName"), lastName = get("lastName") || "";
    if (!firstName) continue;
    let groupId = null;
    const groupName = get("group");
    if (groupName) {
      let g = await prisma.group.findFirst({ where: { name: String(groupName) } });
      if (!g) g = await prisma.group.create({ data: { name: String(groupName) } });
      groupId = g.id;
    }
    await prisma.contact.create({ data: { firstName: String(firstName), lastName: String(lastName), phone: get("phone") ? String(get("phone")) : null, email: get("email") ? String(get("email")).toLowerCase() : null, active: get("active") !== false, groupId } }).catch(() => {});
    created++;
  }
  res.json({ success: true, created });
});


function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function parseImportDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = String(value || "").trim();
  if (!raw) return new Date();
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  // Also support common MM/DD/YYYY and M/D/YYYY spreadsheet values.
  const m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    const parsed = new Date(year, Number(m[1]) - 1, Number(m[2]));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

router.post("/import-donations", main, async (req, res) => {
  const { rows, mapping = {} } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "rows array is required" });
  if (!mapping.amount) return res.status(400).json({ error: "Map an Amount column." });

  const get = (row, key) => {
    const source = mapping[key];
    return source ? row[source] : "";
  };

  // Load once so large sheets do not issue a query for every matching attempt.
  const [contacts, groups] = await Promise.all([
    prisma.contact.findMany({ include: { group: true } }),
    prisma.group.findMany(),
  ]);
  const byEmail = new Map();
  const byPhone = new Map();
  const byName = new Map();
  const byId = new Map(contacts.map(c => [String(c.id), c]));
  for (const c of contacts) {
    if (c.email) byEmail.set(String(c.email).trim().toLowerCase(), c);
    const phone = normalizePhone(c.phone);
    if (phone) byPhone.set(phone, c);
    const name = `${normalizeName(c.firstName)}|${normalizeName(c.lastName)}`;
    if (name !== "|") {
      const list = byName.get(name) || [];
      list.push(c);
      byName.set(name, list);
    }
  }

  const groupByName = new Map(groups.map(g => [String(g.name).trim().toLowerCase(), g]));
  const failures = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const amountRaw = String(get(row, "amount") ?? "").replace(/[$,\s]/g, "");
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      failures.push({ row: i + 2, error: "Invalid or missing donation amount", value: get(row, "amount") });
      continue;
    }

    const contactValue = String(get(row, "contact") || "").trim();
    const email = String(get(row, "email") || "").trim().toLowerCase();
    const phone = normalizePhone(get(row, "phone"));
    const firstName = String(get(row, "firstName") || "").trim();
    const lastName = String(get(row, "lastName") || "").trim();
    let contact = null;

    if (contactValue && byId.has(contactValue)) contact = byId.get(contactValue);
    if (!contact && email) contact = byEmail.get(email) || null;
    if (!contact && phone) contact = byPhone.get(phone) || null;
    if (!contact && (firstName || lastName)) {
      const matches = byName.get(`${normalizeName(firstName)}|${normalizeName(lastName)}`) || [];
      if (matches.length === 1) contact = matches[0];
      else if (matches.length > 1) {
        failures.push({ row: i + 2, error: "Multiple contacts have this name; map Contact ID or Email", name: `${firstName} ${lastName}`.trim() });
        continue;
      }
    }
    if (!contact) {
      failures.push({ row: i + 2, error: "Could not match this donation to a contact", email, name: `${firstName} ${lastName}`.trim() });
      continue;
    }

    let group = null;
    const groupName = String(get(row, "group") || "").trim().toLowerCase();
    if (groupName) {
      group = groupByName.get(groupName) || null;
      if (!group) {
        group = await prisma.group.create({ data: { name: String(get(row, "group")).trim() } });
        groupByName.set(groupName, group);
      }
    } else if (contact.groupId) {
      group = groups.find(g => g.id === contact.groupId) || null;
    }
    if (!group) {
      failures.push({ row: i + 2, error: "No group found. Map a Group column or assign the contact to a group first" });
      continue;
    }

    const date = parseImportDate(get(row, "date"));
    if (!date) {
      failures.push({ row: i + 2, error: "Invalid donation date", value: get(row, "date") });
      continue;
    }

    const type = String(get(row, "type") || "Online").trim() || "Online";
    try {
      const donation = await prisma.donation.create({
        data: { amount, contactId: contact.id, groupId: group.id, date, type, createdById: req.user.id },
      });
      created++;
      await writeLog(req, "IMPORT_DONATION", { id: donation.id, row: i + 2, amount, contactId: contact.id, groupId: group.id });
    } catch (err) {
      failures.push({ row: i + 2, error: err.message || "Could not create donation" });
    }
  }

  await writeLog(req, "IMPORT_DONATIONS", { created, failed: failures.length, attempted: rows.length });
  res.json({ success: true, created, failed: failures.length, failures: failures.slice(0, 200) });
});

module.exports = router;
