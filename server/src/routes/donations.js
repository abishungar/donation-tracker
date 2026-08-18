const express = require("express");
const prisma = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { writeLog } = require("../utils/log");

const router = express.Router();
router.use(authenticate);

async function managerOwnsGroup(userId, groupId) {
  if (!groupId) return false;
  const group = await prisma.group.findUnique({ where: { id: Number(groupId) } });
  return group && group.managerId === userId;
}

// List donations (admin: all, manager: own group's, user: own only)
router.get("/", async (req, res) => {
  let where = {};
  if (req.user.role === "manager") {
    const groups = await prisma.group.findMany({ where: { managerId: req.user.id } });
    where.groupId = { in: groups.map((g) => g.id) };
  } else if (req.user.role === "user") {
    if (!req.user.contactId) return res.json([]);
    where.contactId = req.user.contactId;
  }
  const donations = await prisma.donation.findMany({
    where,
    include: { contact: true, group: true },
    orderBy: { date: "desc" },
  });
  res.json(donations);
});

// Create donation (admin or manager for their own group's contacts)
router.post("/", authorize("admin", "manager"), async (req, res) => {
  const { amount, contactId, groupId, type } = req.body;
  if (!amount || !contactId || !groupId || !type) {
    return res.status(400).json({ error: "amount, contactId, groupId, and type are required" });
  }
  if (req.user.role === "manager" && !(await managerOwnsGroup(req.user.id, groupId))) {
    return res.status(403).json({ error: "You can only add donations for your own group" });
  }
  const donation = await prisma.donation.create({
    data: {
      amount: parseFloat(amount),
      contactId: Number(contactId),
      groupId: Number(groupId),
      date: new Date(), // system date at the moment the donation is entered
      type,
      createdById: req.user.id,
    },
  });
  await writeLog(req, "CREATE_DONATION", { id: donation.id, amount, contactId, groupId });
  res.status(201).json(donation);
});

// Update donation (admin, or manager for their own group's)
router.put("/:id", authorize("admin", "manager"), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.donation.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Donation not found" });
  if (req.user.role === "manager" && !(await managerOwnsGroup(req.user.id, existing.groupId))) {
    return res.status(403).json({ error: "You can only edit donations for your own group" });
  }
  const { amount, date, type } = req.body;
  const donation = await prisma.donation.update({
    where: { id },
    data: {
      ...(amount !== undefined && { amount: parseFloat(amount) }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(type !== undefined && { type }),
    },
  });
  await writeLog(req, "UPDATE_DONATION", { id });
  res.json(donation);
});

// Delete donation (admin, or manager for their own group's)
router.delete("/:id", authorize("admin", "manager"), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.donation.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Donation not found" });
  if (req.user.role === "manager" && !(await managerOwnsGroup(req.user.id, existing.groupId))) {
    return res.status(403).json({ error: "You can only delete donations for your own group" });
  }
  await prisma.donation.delete({ where: { id } });
  await writeLog(req, "DELETE_DONATION", { id });
  res.json({ success: true });
});

module.exports = router;
