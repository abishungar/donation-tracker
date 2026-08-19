const nodemailer = require("nodemailer");
const dns = require("dns").promises;
const net = require("net");
const tls = require("tls");
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

function timeoutError(stage, host, port) {
  const e = new Error(`${stage} timed out connecting to ${host}:${port}. This usually means the hosting provider/network is blocking the SMTP port.`);
  e.code = "ETIMEDOUT";
  e.stage = stage;
  return e;
}

async function tcpCheck(host, port, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      socket.destroy();
      fn(value);
    };
    socket.setTimeout(timeoutMs, () => finish(reject, timeoutError("TCP connection", host, port)));
    socket.once("connect", () => finish(resolve, true));
    socket.once("error", (err) => {
      err.stage = "TCP connection";
      finish(reject, err);
    });
  });
}

async function diagnoseSmtp(config) {
  const host = config.host;
  const port = config.port;
  const result = { host, port, secure: config.secure, dns: null, tcp: null, tls: null, smtp: null };

  try {
    const addresses = await dns.lookup(host, { all: true });
    result.dns = addresses.map(x => x.address);
  } catch (err) {
    err.stage = "DNS lookup";
    throw err;
  }

  await tcpCheck(host, port);
  result.tcp = "ok";

  if (config.secure) {
    await new Promise((resolve, reject) => {
      const socket = tls.connect({ host, port, servername: host, timeout: 8000 });
      const cleanup = () => { try { socket.destroy(); } catch (_) {} };
      socket.once("secureConnect", () => { result.tls = "ok"; cleanup(); resolve(); });
      socket.once("timeout", () => { cleanup(); reject(timeoutError("TLS connection", host, port)); });
      socket.once("error", (err) => { err.stage = "TLS connection"; cleanup(); reject(err); });
    });
  } else {
    result.tls = "STARTTLS handled by Nodemailer";
  }

  return result;
}

function transportFor(s, host, port, secure) {
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: String(s.smtp_user || "").trim(), pass: cleanPassword(s.smtp_app_password) },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
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

  let transporter = transportFor(s, host, port, secure);
  try {
    await transporter.verify();
  } catch (firstErr) {
    // Gmail commonly works on 587/STARTTLS when 465 is blocked.
    if (host.toLowerCase() === "smtp.gmail.com" && port === 465) {
      try {
        const fallback = transportFor(s, host, 587, false);
        await fallback.verify();
        transporter = fallback;
        return { transporter, settings: { ...s, smtp_host: host, smtp_port: 587, smtp_secure: false, smtp_user: user, smtp_app_password: pass } };
      } catch (fallbackErr) {
        firstErr.message = `Port 465 failed: ${firstErr.message}. Port 587 also failed: ${fallbackErr.message}`;
      }
    }
    throw firstErr;
  }

  return { transporter, settings: { ...s, smtp_host: host, smtp_port: port, smtp_secure: secure, smtp_user: user, smtp_app_password: pass } };
}

async function verifySmtp() {
  const { settings: s } = await createTransport();
  return { ok: true, host: s.smtp_host, port: s.smtp_port, secure: s.smtp_secure, user: s.smtp_user, from: s.smtp_from || s.smtp_user };
}

async function diagnoseConfiguredSmtp() {
  const s = await settings();
  const host = String(s.smtp_host || "smtp.gmail.com").trim();
  const port = Number(s.smtp_port || 465);
  const secure = toBoolean(s.smtp_secure, port === 465);
  if (!host) throw new Error("SMTP host is required.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP port must be valid.");
  const primary = await diagnoseSmtp({ host, port, secure });
  return { ...primary, alternate: host.toLowerCase() === "smtp.gmail.com" && port === 465 ? await diagnoseSmtp({ host, port: 587, secure: false }).catch(e => ({ error: e.message, code: e.code || null })) : null };
}

async function sendMail(to, subject, html) {
  const recipient = String(to || "").trim();
  if (!recipient) throw new Error("Recipient email is required.");
  const { transporter, settings: s } = await createTransport();
  return transporter.sendMail({ from: s.smtp_from || s.smtp_user, to: recipient, subject, html });
}

module.exports = { sendMail, settings, verifySmtp, diagnoseConfiguredSmtp };
