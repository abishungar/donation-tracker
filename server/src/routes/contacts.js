const express = require("express");
const prisma = require("../db");
const bcrypt = require("bcryptjs");
const { authenticate, authorize } = require("../middleware/auth");
const { writeLog } = require("../utils/log");

const router = express.Router();
router.use(authenticate);

// Helper: is this manager allowed to touch this groupId?
async function managerOwnsGroup(userId, groupId) {
  if (!groupId) return false;
  const group = await prisma.group.findUnique({ where: { id: Number(groupId) } });
  return group && group.managerId === userId;
}

// List contacts (admin: all, manager: own group's, user: forbidden)
router.get("/", authorize("admin", "manager"), async (req, res) => {
  let where = {};
  if (req.user.role === "manager") {
    const groups = await prisma.group.findMany({ where: { managerId: req.user.id } });
    where.groupId = { in: groups.map((g) => g.id) };
  }
  const contacts = await prisma.contact.findMany({
    where,
    include: { group: true, donations: { select: { amount: true } } },
    orderBy: { lastName: "asc" },
  });
  res.json(contacts.map(({ donations, ...contact }) => ({
    ...contact,
    totalDonated: donations.reduce((sum, donation) => sum + donation.amount, 0),
  })));
});

// Create contact
router.post("/", authorize("admin", "manager"), async (req, res) => {
  const { firstName, lastName, phone, email, groupId, active } = req.body;
  if (!firstName || !lastName) {
    return res.status(400).json({ error: "firstName and lastName are required" });
  }
  if (req.user.role === "manager" && !(await managerOwnsGroup(req.user.id, groupId))) {
    return res.status(403).json({ error: "You can only add contacts to your own group" });
  }
  const contact = await prisma.contact.create({
    data: {
      firstName,
      lastName,
      phone: phone || null,
      email: email || null,
      groupId: groupId ? Number(groupId) : null,
      active: active !== undefined ? !!active : true,
    },
  });
  if (contact.email) {
    await prisma.user.upsert({ where:{email:contact.email.toLowerCase().trim()}, update:{contactId:contact.id, name:`${contact.firstName} ${contact.lastName}`}, create:{email:contact.email.toLowerCase().trim(), password:await bcrypt.hash(require("crypto").randomBytes(24).toString("hex"),10), role:"user", contactId:contact.id, name:`${contact.firstName} ${contact.lastName}`, passwordSet:false} });
  }
  await writeLog(req, "CREATE_CONTACT", { id: contact.id, name: `${firstName} ${lastName}` });
  res.status(201).json(contact);
});

// Update contact
router.put("/:id", authorize("admin", "manager"), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Contact not found" });

  if (req.user.role === "manager" && !(await managerOwnsGroup(req.user.id, existing.groupId))) {
    return res.status(403).json({ error: "You can only edit contacts in your own group" });
  }

  const { firstName, lastName, phone, email, groupId, active } = req.body;
  if (req.user.role === "manager" && groupId !== undefined && !(await managerOwnsGroup(req.user.id, groupId))) {
    return res.status(403).json({ error: "You can only assign contacts to your own group" });
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(groupId !== undefined && { groupId: groupId ? Number(groupId) : null }),
      ...(active !== undefined && { active: !!active }),
    },
  });
  if (contact.email) {
    await prisma.user.upsert({ where:{email:contact.email.toLowerCase().trim()}, update:{contactId:contact.id, name:`${contact.firstName} ${contact.lastName}`}, create:{email:contact.email.toLowerCase().trim(), password:await bcrypt.hash(require("crypto").randomBytes(24).toString("hex"),10), role:"user", contactId:contact.id, name:`${contact.firstName} ${contact.lastName}`, passwordSet:false} });
  }
  await writeLog(req, "UPDATE_CONTACT", { id });
  res.json(contact);
});

// Delete contact
router.delete("/:id", authorize("admin", "manager"), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Contact not found" });
  if (req.user.role === "manager" && !(await managerOwnsGroup(req.user.id, existing.groupId))) {
    return res.status(403).json({ error: "You can only delete contacts in your own group" });
  }
  await prisma.contact.delete({ where: { id } });
  await writeLog(req, "DELETE_CONTACT", { id });
  res.json({ success: true });
});

// Get one contact with its full donation history
router.get("/:id", authorize("admin", "manager"), async (req, res) => {
  const id = Number(req.params.id);
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      group: true,
      donations: { orderBy: { date: "desc" }, include: { group: true } },
    },
  });
  if (!contact) return res.status(404).json({ error: "Contact not found" });
  if (req.user.role === "manager" && !(await managerOwnsGroup(req.user.id, contact.groupId))) {
    return res.status(403).json({ error: "You can only view contacts in your own group" });
  }
  const totalRaised = contact.donations.reduce((sum, d) => sum + d.amount, 0);
  res.json({ ...contact, totalRaised });
});

module.exports = router;
