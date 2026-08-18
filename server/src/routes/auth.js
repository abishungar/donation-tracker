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
    { id: user.id, email: user.email, role: user.role, contactId: user.contactId },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  await prisma.log.create({
    data: { userId: user.id, userEmail: user.email, action: "LOGIN" },
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, contactId: user.contactId },
  });
});

router.get("/me", authenticate, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
