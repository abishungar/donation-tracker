const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { JWT_SECRET } = require("../middleware/auth");
const { authenticate } = require("../middleware/auth");
const { writeLog } = require("../utils/log");
const crypto = require("crypto");
const { sendMail } = require("../utils/mailer");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, contactId: user.contactId, isMainAdmin:user.isMainAdmin },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  await prisma.log.create({
    data: { userId: user.id, userEmail: user.email, action: "LOGIN" },
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, contactId: user.contactId, isMainAdmin:user.isMainAdmin },
  });
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


router.post("/request-password-link", async (req,res)=>{
  const email=(req.body.email||"").toLowerCase().trim();
  if (!email) return res.status(400).json({error:"Email is required"});
  let user=await prisma.user.findUnique({where:{email}});
  if (!user) {
    const contact=await prisma.contact.findUnique({where:{email}});
    if (contact) user=await prisma.user.create({data:{email,password:await bcrypt.hash(crypto.randomBytes(24).toString("hex"),10),role:"user",contactId:contact.id,name:`${contact.firstName} ${contact.lastName}`,passwordSet:false}});
  }
  // Always return success so email existence is not exposed.
  if (user) {
    const token=crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.deleteMany({where:{userId:user.id}});
    await prisma.passwordResetToken.create({data:{token,userId:user.id,expiresAt:new Date(Date.now()+60*60*1000)}});
    const base=process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const link=`${base}/set-password?token=${token}`;
    try { await sendMail(user.email,"Set or reset your Donation Tracker password",`<p>Hello${user.name?` ${user.name}`:""},</p><p>Click the link below to set your password. It expires in 1 hour.</p><p><a href="${link}">${link}</a></p>`, { name: user.name || user.email }); } catch(e) { return res.status(503).json({error:`Email could not be sent: ${e.message}`}); }
  }
  res.json({success:true,message:"If the email exists, a password link has been sent."});
});
router.post("/set-password", async (req,res)=>{
 const {token,password}=req.body; if(!token||!password||password.length<6)return res.status(400).json({error:"A valid token and a password of at least 6 characters are required"});
 const row=await prisma.passwordResetToken.findUnique({where:{token}}); if(!row||row.expiresAt<new Date())return res.status(400).json({error:"This password link is invalid or expired"});
 const hash=await bcrypt.hash(password,10); await prisma.user.update({where:{id:row.userId},data:{password:hash,passwordSet:true}}); await prisma.passwordResetToken.delete({where:{id:row.id}}); res.json({success:true});
});

module.exports = router;
