const nodemailer = require("nodemailer");
const prisma = require("../db");

async function settings() {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["smtp_user", "smtp_app_password", "smtp_from"] } },
  });
  return Object.fromEntries(rows.map((x) => [x.key, x.value]));
}

function cleanPassword(value) {
  // Google App Passwords are often copied with spaces; Gmail accepts the
  // 16-character value without spaces.
  return String(value || "").replace(/\s+/g, "");
}

async function createTransport() {
  const s = await settings();
  const user = String(s.smtp_user || "").trim();
  const pass = cleanPassword(s.smtp_app_password);

  if (!user || !pass) {
    throw new Error("SMTP is not configured. Enter the Gmail address and Google App Password first.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  // Verify credentials before attempting a real message. This makes the
  // admin Test Email button report the actual Gmail error.
  await transporter.verify();
  return { transporter, settings: { ...s, smtp_user: user, smtp_app_password: pass } };
}

async function verifySmtp() {
  const { settings: s } = await createTransport();
  return {
    ok: true,
    user: s.smtp_user,
    from: s.smtp_from || s.smtp_user,
  };
}

async function sendMail(to, subject, html) {
  if (!to) throw new Error("Recipient email is required.");
  const { transporter, settings: s } = await createTransport();
  return transporter.sendMail({
    from: s.smtp_from || s.smtp_user,
    to: String(to).trim(),
    subject,
    html,
  });
}

module.exports = { sendMail, settings, verifySmtp };
