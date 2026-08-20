const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { writeLog } = require("../utils/log");
const { sendMail, settings: getMailSettings } = require("../utils/mailer");
const { createAccessLink } = require("./auth");
const crypto = require("crypto");

const router = express.Router();
router.use(authenticate, authorize("admin"));

async function assignManagerToGroup(userId, groupId, contactId) {
  if (groupId === undefined) return;

  // A manager account can be assigned to one group from the Users screen.
  // Remove this user from any previous group, then assign the selected group.
  await prisma.group.updateMany({
    where: { managerId: userId },
    data: { managerId: null },
  });

  if (groupId !== null && groupId !== "") {
    const id = Number(groupId);
    if (!Number.isInteger(id)) throw new Error("Invalid group");
    await prisma.group.update({
      where: { id },
      data: {
        managerId: userId,
        ...(contactId ? { managerContactId: Number(contactId) } : {}),
      },
    });
  }
}

// List all users, including their assigned manager group.
router.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, contactId: true,
      isMainAdmin: true, createdAt: true,
      managedGroups: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

router.post("/", async (req, res) => {
  const { email, role, contactId, name, isMainAdmin, groupId } = req.body;
  if (!email || !role) return res.status(400).json({ error: "email and role are required" });
  if (isMainAdmin && !req.user.isMainAdmin) return res.status(403).json({ error: "Only Main Admin can assign Main Admin status" });
  if (!req.user.isMainAdmin && isMainAdmin) return res.status(403).json({ error: "Only Main Admin can assign Main Admin status" });
  if (!["admin", "manager", "user"].includes(role)) return res.status(400).json({ error: "role must be admin, manager, or user" });

  try {
    const emailNorm = email.toLowerCase().trim();
    const tempHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    const user = await prisma.user.create({
      data: { email: emailNorm, password: tempHash, role, name: name || null, contactId: contactId ? Number(contactId) : null, isMainAdmin: !!isMainAdmin, passwordSet: false }
    });
    if (role === "manager" && groupId !== undefined) await assignManagerToGroup(user.id, groupId, contactId);
    let inviteSent = false;
    let inviteError = "";
    try { await createAccessLink(req, user, role === "user" ? "pin" : "password"); inviteSent = true; }
    catch (e) { inviteError = e.message || "Could not send invite email"; }
    await writeLog(req, "CREATE_USER", { email: user.email, role: user.role, groupId: groupId || null, inviteSent });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, inviteSent, inviteError });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not create user (email may already be in use)" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { role, contactId, password, name, isMainAdmin, groupId } = req.body;
  const data = {};
  if (role) data.role = role;
  if (contactId !== undefined) data.contactId = contactId ? Number(contactId) : null;
  if (name !== undefined) data.name = name || null;
  if (password) {
    if (!req.user.isMainAdmin) return res.status(403).json({ error: "Only Main Admin can reset or change another user's password." });
    data.password = await bcrypt.hash(password, 10);
    data.passwordSet = true;
  }
  if (isMainAdmin !== undefined) {
    if (!req.user.isMainAdmin) return res.status(403).json({ error: "Only Main Admin can change Main Admin status" });
    if (!isMainAdmin) {
      const current = await prisma.user.findUnique({ where: { id }, select: { isMainAdmin: true } });
      const count = await prisma.user.count({ where: { isMainAdmin: true } });
      if (current?.isMainAdmin && count <= 1) return res.status(400).json({ error: "The system must always have at least one Main Admin." });
    }
    data.isMainAdmin = !!isMainAdmin;
  }

  try {
    const user = await prisma.user.update({ where: { id }, data });

    if (role === "manager" || user.role === "manager") {
      await assignManagerToGroup(user.id, groupId === undefined ? undefined : (groupId || null), contactId !== undefined ? contactId : user.contactId);
    } else if (role && role !== "manager") {
      // If a manager is changed to another role, remove their group assignment.
      await prisma.group.updateMany({ where: { managerId: user.id }, data: { managerId: null } });
    }

    await writeLog(req, "UPDATE_USER", { id, changes: [...Object.keys(data), groupId !== undefined ? "groupId" : null].filter(Boolean) });
    const fresh = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, contactId: true },
    });
    res.json(fresh);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not update user" });
  }
});

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
