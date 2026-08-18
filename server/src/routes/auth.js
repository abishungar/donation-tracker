const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { JWT_SECRET } = require("../middleware/auth");
const { authenticate } = require("../middleware/auth");
const { writeLog } = require("../utils/log");

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
    { id: user.id, email: user.email, name: user.name, role: user.role, contactId: user.contactId },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  await prisma.log.create({
    data: { userId: user.id, userEmail: user.email, action: "LOGIN" },
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, contactId: user.contactId },
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

module.exports = router;
