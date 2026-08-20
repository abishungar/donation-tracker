const nodemailer = require("nodemailer");
const prisma = require("../db");

const SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_app_password", "smtp_from"];

async function settings() {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: SMTP_KEYS } } });
  const db = Object.fromEntries(rows.map((x) => [x.key, x.value]));
  return {
    ...db,
    smtp_host: process.env.SMTP_HOST || db.smtp_host || "smtp.gmail.com",
    smtp_port: process.env.SMTP_PORT || db.smtp_port || "465",
    smtp_secure: process.env.SMTP_SECURE ?? db.smtp_secure ?? "true",
    smtp_user: process.env.SMTP_USER || db.smtp_user || "",
    smtp_app_password: process.env.SMTP_APP_PASSWORD || db.smtp_app_password || "",
    smtp_from: process.env.SMTP_FROM || db.smtp_from || "",
  };
}

function cleanPassword(value) { return String(value || "").replace(/\s+/g, ""); }
function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function normalizeError(err, host, port) {
  const code = err?.code || "";
  const msg = err?.message || String(err);
  if ((code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ENETUNREACH") && host === "smtp.gmail.com" && [465, 587].includes(Number(port))) {
    return new Error(`${msg} — Render Free blocks outbound SMTP ports 25, 465 and 587. Upgrade this Render web service to a paid instance to use Gmail SMTP with an App Password.`);
  }
  return err;
}

async function createTransport() {
  const s = await settings();
  const host = String(s.smtp_host).trim();
  const port = Number(s.smtp_port);
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
    requireTLS: !secure && port === 587,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: { servername: host, minVersion: "TLSv1.2" },
  });
  try { await transporter.verify(); }
  catch (err) { throw normalizeError(err, host, port); }
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
  try {
    return await transporter.sendMail({ from: s.smtp_from || s.smtp_user, to: recipient, subject, html });
  } catch (err) { throw normalizeError(err, s.smtp_host, s.smtp_port); }
}

module.exports = { sendMail, settings, verifySmtp };
