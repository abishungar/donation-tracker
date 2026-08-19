const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { writeLog } = require("../utils/log");

const router = express.Router();
router.use(authenticate, authorize("admin"));

// List all users
router.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, contactId: true, isMainAdmin:true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// Create a user (admin, manager, or plain user)
router.post("/", async (req, res) => {
  const { email, password, role, contactId, name, isMainAdmin } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: "email, password, and role are required" });
  }
  if (!["admin", "manager", "user"].includes(role)) {
    return res.status(400).json({ error: "role must be admin, manager, or user" });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hash,
        role,
        name: name || null,
        contactId: contactId || null,
        isMainAdmin: !!isMainAdmin,
      },
    });
    await writeLog(req, "CREATE_USER", { email: user.email, role: user.role });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    res.status(400).json({ error: "Could not create user (email may already be in use)" });
  }
});

// Update a user's role, contact link, name, or password
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { role, contactId, password, name, isMainAdmin } = req.body;
  const data = {};
  if (role) data.role = role;
  if (contactId !== undefined) data.contactId = contactId || null;
  if (name !== undefined) data.name = name || null;
  if (password) data.password = await bcrypt.hash(password, 10);
  if (isMainAdmin !== undefined) {
    const lock=await prisma.appSetting.findUnique({where:{key:"lock_main_admin"}});
    if (lock?.value === "true" && !req.user.isMainAdmin) return res.status(403).json({error:"Main Admin access is locked by Main Admin settings"});
    data.isMainAdmin=!!isMainAdmin;
  }

  try {
    const user = await prisma.user.update({ where: { id }, data });
    await writeLog(req, "UPDATE_USER", { id, changes: Object.keys(data) });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    res.status(404).json({ error: "User not found" });
  }
});

// Delete a user
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.user.delete({ where: { id } });
    await writeLog(req, "DELETE_USER", { id });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: "User not found" });
  }
});

module.exports = router;
