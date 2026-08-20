const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { JWT_SECRET } = require("../middleware/auth");
const { authenticate } = require("../middleware/auth");
const { writeLog } = require("../utils/log");
const crypto = require("crypto");
const { sendMail, settings: getMailSettings } = require("../utils/mailer");

const router = express.Router();

router.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  const password = String(req.body?.password || "");
  const pin = String(req.body?.pin || "");
  const credential = String(req.body?.credential || "");
  if (!email) return res.status(400).json({ error: "Email is required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid email or PIN/password" });

  let valid = false;
  const supplied = credential || pin || password;
  if (!supplied) return res.status(400).json({ error: "Enter your PIN or password" });

  // One login screen for everyone. The server determines the credential type from the account role.
  if (user.role === "user") {
    if (!user.pinHash) return res.status(401).json({ error: "No PIN is set for this account. Use the email link to set up your PIN." });
    valid = await bcrypt.compare(supplied, user.pinHash);
  } else {
    valid = await bcrypt.compare(supplied, user.password);
  }
  if (!valid) return res.status(401).json({ error: "Invalid email or PIN/password" });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, contactId: user.contactId, isMainAdmin: user.isMainAdmin },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  await prisma.log.create({ data: { userId: user.id, userEmail: user.email, action: "LOGIN" } });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, contactId: user.contactId, isMainAdmin: user.isMainAdmin } });
});

router.get("/me", authenticate, async (req, res) => {
  res.json({ user: req.user });
});

router.put("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
  await prisma.log.create({
    data: { userId: user.id, userEmail: user.email, action: "CHANGE_PASSWORD" },
  });
  res.json({ success: true });
});


async function createAccessLink(req, user, kind) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  const base = String(process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const link = `${base}/${kind === "pin" ? "set-pin" : "set-password"}?token=${encodeURIComponent(token)}`;
  const mailSettings = await getMailSettings();
  const systemName = String(mailSettings.email_system_name || process.env.APP_NAME || "Donation Tracker").trim();
  const fromAddress = String(mailSettings.email_from_address || mailSettings.smtp_from || mailSettings.smtp_user || "").trim();
  const displayName = user.name ? String(user.name).replace(/[<>]/g, "") : "there";
  const isPin = kind === "pin";
  const subject = isPin ? `Set up your ${systemName} PIN` : `Reset your ${systemName} password`;
  const intro = isPin ? "Use the button below to create the PIN you will use to sign in." : "We received a request to set or reset your password. Click the button below to continue.";
  const button = isPin ? "Set Up My PIN" : "Set / Reset Password";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937"><div style="max-width:620px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(15,23,42,.08)"><div style="background:#111827;padding:26px 28px;color:#fff"><div style="font-size:21px;font-weight:700">${systemName}</div><div style="font-size:13px;color:#cbd5e1;margin-top:5px">Account access</div></div><div style="padding:32px 28px"><p style="font-size:16px;margin:0 0 16px">Hello ${displayName},</p><p style="font-size:15px;line-height:1.7;margin:0 0 24px">${intro}</p><p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700">${button}</a></p><p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 12px">This secure link expires in 1 hour.</p><p style="font-size:12px;line-height:1.5;color:#9ca3af;word-break:break-all">If the button does not work, copy and paste this link into your browser:<br>${link}</p></div></div><p style="text-align:center;font-size:12px;color:#9ca3af;margin:18px 0">This email was sent by ${systemName}.</p></div></body></html>`;
  await sendMail(user.email, subject, html, { name: systemName, from: fromAddress });
}

router.post("/request-pin-link", async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  if (!email) return res.status(400).json({ error: "Email is required" });
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const contact = await prisma.contact.findUnique({ where: { email } });
    if (contact?.active) {
      user = await prisma.user.create({ data: { email, password: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10), role: "user", contactId: contact.id, name: `${contact.firstName} ${contact.lastName}`.trim(), passwordSet: false } });
    }
  }
  if (user?.role === "user" && user.contactId) {
    try { await createAccessLink(req, user, "pin"); }
    catch (e) { console.error("PIN setup email failed:", e); return res.status(503).json({ error: `Email could not be sent: ${e.message}` }); }
  }
  res.json({ success: true, message: "If your active contact record has this email, a PIN setup link has been sent." });
});

router.post("/request-password-link", async (req,res)=>{
  const email=(req.body.email||"").toLowerCase().trim();
  if (!email) return res.status(400).json({error:"Email is required"});
  let user=await prisma.user.findUnique({where:{email}});
  if (!user) {
    const contact=await prisma.contact.findUnique({where:{email}});
    if (contact) user=await prisma.user.create({data:{email,password:await bcrypt.hash(crypto.randomBytes(24).toString("hex"),10),role:"user",contactId:contact.id,name:`${contact.firstName} ${contact.lastName}`.trim(),passwordSet:false}});
  }
  if (user) { try { await createAccessLink(req, user, "password"); } catch(e) { return res.status(503).json({error:`Email could not be sent: ${e.message}`}); } }
  res.json({success:true,message:"If the email exists, a password link has been sent."});
});
router.post("/set-password", async (req,res)=>{
 const {token,password}=req.body; if(!token||!password||password.length<6)return res.status(400).json({error:"A valid token and a password of at least 6 characters are required"});
 const row=await prisma.passwordResetToken.findUnique({where:{token}}); if(!row||row.expiresAt<new Date())return res.status(400).json({error:"This password link is invalid or expired"});
 const hash=await bcrypt.hash(password,10); await prisma.user.update({where:{id:row.userId},data:{password:hash,passwordSet:true}}); await prisma.passwordResetToken.delete({where:{id:row.id}}); res.json({success:true});
});

router.post("/set-pin", async (req,res)=>{
  const { token, pin } = req.body || {};
  if (!token || !/^\d{4,8}$/.test(String(pin || ""))) return res.status(400).json({ error: "A valid link and a 4 to 8 digit PIN are required" });
  const row = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!row || row.expiresAt < new Date()) return res.status(400).json({ error: "This PIN link is invalid or expired" });
  const user = await prisma.user.findUnique({ where: { id: row.userId }, include: { contact: true } });
  if (!user || user.role !== "user" || !user.contactId || !user.contact?.active) return res.status(400).json({ error: "This account is not eligible for contact PIN login" });
  await prisma.user.update({ where: { id: user.id }, data: { pinHash: await bcrypt.hash(String(pin), 10) } });
  await prisma.passwordResetToken.delete({ where: { id: row.id } });
  res.json({ success: true });
});

module.exports = router;
