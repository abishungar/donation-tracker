const nodemailer = require("nodemailer");
const prisma = require("../db");

const EMAIL_KEYS = [
  "email_mode",
  "smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_app_password", "smtp_from",
  "google_form_id", "google_form_email_entry", "google_form_name_entry", "google_form_from_entry", "google_form_subject_entry", "google_form_body_entry", "google_form_default_name", "google_form_default_from",
];

async function settings() {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: EMAIL_KEYS } } });
  const out = Object.fromEntries(rows.map((x) => [x.key, x.value]));
  // Prefer Render environment variables for SMTP credentials when present.
  if (process.env.SMTP_HOST) out.smtp_host = process.env.SMTP_HOST;
  if (process.env.SMTP_PORT) out.smtp_port = process.env.SMTP_PORT;
  if (process.env.SMTP_SECURE) out.smtp_secure = process.env.SMTP_SECURE;
  if (process.env.SMTP_USER) out.smtp_user = process.env.SMTP_USER;
  if (process.env.SMTP_APP_PASSWORD) out.smtp_app_password = process.env.SMTP_APP_PASSWORD;
  if (process.env.SMTP_FROM) out.smtp_from = process.env.SMTP_FROM;
  return out;
}

function cleanPassword(value) { return String(value || "").replace(/\s+/g, ""); }
function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function normalizeFormId(value) {
  const raw = String(value || "").trim();
  if (!raw) return { id: "", prefix: "d" };
  // Accept a Form ID or either the edit URL / published response URL.
  // Published Google Forms use /d/e/<ID>/..., while standard Forms use /d/<ID>/... .
  const published = raw.match(/\/forms\/d\/e\/([^/?#]+)/i);
  if (published) return { id: published[1], prefix: "d/e" };
  const standard = raw.match(/\/forms\/d\/([^/?#]+)/i);
  if (standard) return { id: standard[1], prefix: "d" };
  const trimmed = raw.replace(/^https?:\/\/[^/]+\//i, "").replace(/^forms\/d\//i, "");
  return { id: trimmed.split(/[/?#]/)[0], prefix: "d" };
}

function entryName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("entry.") ? raw : `entry.${raw}`;
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
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000 });
  await transporter.verify();
  return { transporter, settings: { ...s, smtp_host: host, smtp_port: port, smtp_secure: secure, smtp_user: user, smtp_app_password: pass } };
}

async function verifySmtp() {
  const { settings: s } = await createTransport();
  return { ok: true, host: s.smtp_host, port: s.smtp_port, secure: s.smtp_secure, user: s.smtp_user, from: s.smtp_from || s.smtp_user };
}

async function sendViaGoogleForm(to, subject, html, meta = {}, s) {
  const formRef = normalizeFormId(s.google_form_id);
  const formId = formRef.id;
  const emailEntry = entryName(s.google_form_email_entry);
  if (!formId) throw new Error("Google Form ID is not configured.");
  if (!emailEntry) throw new Error("Google Form recipient email entry number is not configured.");
  if (!subject) throw new Error("Email subject is required.");
  if (!html) throw new Error("Email body is required.");

  const bodyText = String(html)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  const params = new URLSearchParams();
  params.set(emailEntry, String(to || "").trim());
  const fields = [
    ["google_form_name_entry", meta.name || s.google_form_default_name || s.smtp_user || ""],
    ["google_form_from_entry", meta.from || s.google_form_default_from || s.smtp_from || s.smtp_user || ""],
    ["google_form_subject_entry", subject],
    ["google_form_body_entry", bodyText],
  ];
  for (const [settingKey, value] of fields) {
    const key = entryName(s[settingKey]);
    if (key && value !== undefined && value !== "") params.set(key, String(value));
  }

  const url = `https://docs.google.com/forms/${formRef.prefix}/${encodeURIComponent(formId)}/formResponse`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "DonationTracker/1.0" },
    body: params.toString(),
    redirect: "manual",
  });
  // Google Forms commonly returns 200 or 302 for a successful formResponse POST.
  if (![200, 302].includes(response.status)) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Form submission failed with HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  return { messageId: `google-form-${Date.now()}`, mode: "google_form", status: response.status };
}

async function sendMail(to, subject, html, meta = {}) {
  const recipient = String(to || "").trim();
  if (!recipient) throw new Error("Recipient email is required.");
  const s = await settings();
  const mode = String(s.email_mode || "smtp").toLowerCase();
  if (mode === "google_form" || mode === "google-form" || mode === "form") {
    return sendViaGoogleForm(recipient, subject, html, meta, s);
  }
  const { transporter, settings: smtp } = await createTransport();
  return transporter.sendMail({ from: smtp.smtp_from || smtp.smtp_user, to: recipient, subject, html });
}

async function getEmailConfig() {
  const s = await settings();
  return {
    ...s,
    smtp_app_password: "",
    email_mode: s.email_mode || "smtp",
    smtp_host: s.smtp_host || "smtp.gmail.com",
    smtp_port: s.smtp_port || "465",
    smtp_secure: s.smtp_secure ?? "true",
  };
}

module.exports = { sendMail, settings, getEmailConfig, verifySmtp, sendViaGoogleForm };
