const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { writeLog } = require("../utils/log");
const { sendMail, verifySmtp } = require("../utils/mailer");

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
  const rows = await prisma.appSetting.findMany();
  const o = Object.fromEntries(rows.map((x) => [x.key, x.key === "smtp_app_password" ? "" : x.value]));
  o.smtp_host = o.smtp_host || "smtp.gmail.com";
  o.smtp_port = o.smtp_port || "465";
  o.smtp_secure = o.smtp_secure ?? "true";
  o.lock_main_admin = o.lock_main_admin || "false";
  res.json(o);
});

router.put("/settings", main, async (req, res) => {
  const allowed = ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_app_password", "smtp_from", "lock_main_admin"];
  for (const key of allowed) {
    const value = req.body?.[key];
    if (value !== undefined && value !== "") {
      await prisma.appSetting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
    }
  }
  await writeLog(req, "UPDATE_MAIN_ADMIN_SETTINGS", { smtp: true });
  res.json({ success: true });
});

router.post("/email/test", main, async (req, res) => {
  const to = String(req.body?.to || req.mainAdmin.email || "").trim();
  if (!to) return res.status(400).json({ error: "Enter a test recipient email." });
  try {
    const result = await verifySmtp();
    const info = await sendMail(to, "Donation Tracker — SMTP Test", `<p>This is a test email from Donation Tracker.</p><p>SMTP connection and authentication succeeded.</p><p>Server: ${result.host}:${result.port}</p>`);
    await writeLog(req, "TEST_EMAIL_SENT", { to, messageId: info.messageId, host: result.host, port: result.port });
    res.json({ success: true, message: `Test email sent to ${to}.`, messageId: info.messageId });
  } catch (err) {
    console.error("SMTP test failed:", err);
    await writeLog(req, "TEST_EMAIL_FAILED", { to, error: err.message });
    res.status(502).json({ error: `SMTP test failed: ${err.message}` });
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

module.exports = router;
