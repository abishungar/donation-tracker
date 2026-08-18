const express = require("express");
const prisma = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { writeLog } = require("../utils/log");

const router = express.Router();
router.use(authenticate);

// List groups (admin: all with totals, manager: own only, user: forbidden here - use /reports)
router.get("/", authorize("admin", "manager"), async (req, res) => {
  const where = req.user.role === "manager" ? { managerId: req.user.id } : {};
  const groups = await prisma.group.findMany({
    where,
    include: {
      manager: { select: { id: true, email: true, name: true } },
      _count: { select: { contacts: true } },
    },
    orderBy: { name: "asc" },
  });

  const withTotals = await Promise.all(
    groups.map(async (g) => {
      const sum = await prisma.donation.aggregate({
        where: { groupId: g.id },
        _sum: { amount: true },
      });
      return { ...g, totalRaised: sum._sum.amount || 0 };
    })
  );

  res.json(withTotals);
});

// Create group (admin only)
router.post("/", authorize("admin"), async (req, res) => {
  const { name, managerId } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const group = await prisma.group.create({
    data: { name, managerId: managerId ? Number(managerId) : null },
  });
  await writeLog(req, "CREATE_GROUP", { id: group.id, name });
  res.status(201).json(group);
});

// Update group (admin only)
router.put("/:id", authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const { name, managerId } = req.body;
  try {
    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(managerId !== undefined && { managerId: managerId ? Number(managerId) : null }),
      },
    });
    await writeLog(req, "UPDATE_GROUP", { id });
    res.json(group);
  } catch (err) {
    res.status(404).json({ error: "Group not found" });
  }
});

// Delete group (admin only)
router.delete("/:id", authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.group.delete({ where: { id } });
    await writeLog(req, "DELETE_GROUP", { id });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Could not delete group (it may still have contacts/donations attached)" });
  }
});

module.exports = router;
