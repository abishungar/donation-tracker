const nodemailer = require("nodemailer");
const prisma = require("../db");

const SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_app_password", "smtp_from"];

async function settings() {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: SMTP_KEYS } } });
  return Object.fromEntries(rows.map((x) => [x.key, x.value]));
}

function cleanPassword(value) {
  return String(value || "").replace(/\s+/g, "");
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

async function createTransport() {
  const s = await settings();
  const host = String(s.smtp_host || "smtp.gmail.com").trim();
  const port = Number(s.smtp_port || 465);
  const secure = toBoolean(s.smtp_secure, port === 465);
  const user = String(s.smtp_user || "").trim();
  const pass = cleanPassword(s.smtp_app_password);

  if (!host) throw new Error("SMTP host is required.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP port must be a valid number between 1 and 65535.");
  if (!user) throw new Error("SMTP username/email is required.");
  if (!pass) throw new Error("SMTP password/App Password is missing.");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  await transporter.verify();
  return { transporter, settings: { ...s, smtp_host: host, smtp_port: port, smtp_secure: secure, smtp_user: user, smtp_app_password: pass } };
}

async function verifySmtp() {
  const { settings: s } = await createTransport();
  return { ok: true, host: s.smtp_host, port: s.smtp_port, secure: s.smtp_secure, user: s.smtp_user, from: s.smtp_from || s.smtp_user };
}

async function sendMail(to, subject, html) {
  const recipient = String(to || "").trim();
  if (!recipient) throw new Error("Recipient email is required.");
  const { transporter, settings: s } = await createTransport();
  return transporter.sendMail({
    from: s.smtp_from || s.smtp_user,
    to: recipient,
    subject,
    html,
  });
}

module.exports = { sendMail, settings, verifySmtp };
