const crypto = require("crypto");
const prisma = require("../db");
const { sendMail, settings: getMailSettings } = require("./mailer");

async function sendAccountSetupLink(req, user, kind = "password") {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const base = String(process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const path = kind === "pin" ? "set-pin" : "set-password";
  const link = `${base}/${path}?token=${encodeURIComponent(token)}`;
  const mailSettings = await getMailSettings();
  const systemName = String(mailSettings.app_name || mailSettings.email_system_name || process.env.APP_NAME || "Donation Tracker").trim();
  const fromAddress = String(mailSettings.email_from_address || mailSettings.smtp_from || mailSettings.smtp_user || "").trim();
  const displayName = user.name ? String(user.name).replace(/[<>]/g, "") : "there";
  const isPin = kind === "pin";
  const subject = isPin ? `Set up your ${systemName} PIN` : `Set up your ${systemName} password`;
  const intro = isPin
    ? "Use the button below to create the PIN you will use to sign in."
    : "Your account has been created. Use the button below to set your password and activate your account.";
  const button = isPin ? "Set Up My PIN" : "Set Up My Password";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937"><div style="max-width:620px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(15,23,42,.08)"><div style="background:#111827;padding:26px 28px;color:#fff"><div style="font-size:21px;font-weight:700">${systemName}</div><div style="font-size:13px;color:#cbd5e1;margin-top:5px">Account invitation</div></div><div style="padding:32px 28px"><p style="font-size:16px;margin:0 0 16px">Hello ${displayName},</p><p style="font-size:15px;line-height:1.7;margin:0 0 24px">${intro}</p><p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700">${button}</a></p><p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 12px">This secure link expires in 1 hour and can only be used once.</p><p style="font-size:12px;line-height:1.5;color:#9ca3af;word-break:break-all">If the button does not work, copy and paste this link into your browser:<br>${link}</p></div></div><p style="text-align:center;font-size:12px;color:#9ca3af;margin:18px 0">This email was sent by ${systemName}.</p></div></body></html>`;
  await sendMail(user.email, subject, html, { name: systemName, from: fromAddress });
  return { token, link };
}

module.exports = { sendAccountSetupLink };
