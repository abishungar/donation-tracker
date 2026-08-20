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
      const activeCount = await prisma.contact.count({ where: { groupId: g.id, active: true } });
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthly = await prisma.donation.aggregate({ where: { groupId: g.id, date: { gte: start } }, _sum: { amount: true } });
      return { ...g, activeCount, totalRaised: sum._sum.amount || 0, monthRaised: monthly._sum.amount || 0 };
    })
  );

  res.json(withTotals);
});

// Group detail with contacts, donations, and totals
router.get("/:id", authorize("admin", "manager"), async (req, res) => {
  const id = Number(req.params.id);
  const group = await prisma.group.findUnique({ where:{id}, include:{ manager:{select:{id:true,email:true,name:true}}, contacts:{where:{active:true},orderBy:{firstName:"asc"}}, donations:{include:{contact:true},orderBy:{date:"desc"}} } });
  if (!group) return res.status(404).json({error:"Group not found"});
  if (req.user.role === "manager" && group.managerId !== req.user.id) return res.status(403).json({error:"Access denied"});
  const totalRaised = group.donations.reduce((sum,d)=>sum+Number(d.amount || 0),0);
  res.json({...group,totalRaised});
});

// Create group (admin only)
router.post("/", authorize("admin"), async (req, res) => {
  const { name, managerId, managerContactId, contactIds = [] } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const ids = Array.isArray(contactIds) ? contactIds.map(Number).filter(Number.isInteger) : [];
  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.group.create({
      data: { name, managerId: managerId ? Number(managerId) : null, managerContactId: managerContactId ? Number(managerContactId) : null },
    });
    if (ids.length) {
      await tx.contact.updateMany({ where: { id: { in: ids }, active: true }, data: { groupId: created.id } });
    }
    return created;
  });
  await writeLog(req, "CREATE_GROUP", { id: group.id, name, contactIds: ids });
  res.status(201).json(group);
});

// Update group (admin only)
router.put("/:id", authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const { name, managerId, managerContactId, contactIds } = req.body;
  try {
    const ids = Array.isArray(contactIds) ? contactIds.map(Number).filter(Number.isInteger) : null;
    const group = await prisma.$transaction(async (tx) => {
      const updated = await tx.group.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(managerId !== undefined && { managerId: managerId ? Number(managerId) : null }),
          ...(managerContactId !== undefined && { managerContactId: managerContactId ? Number(managerContactId) : null }),
        },
      });
      if (ids) {
        await tx.contact.updateMany({ where: { id: { in: ids }, active: true }, data: { groupId: id } });
      }
      return updated;
    });
    await writeLog(req, "UPDATE_GROUP", { id, contactIds: ids || undefined });
    res.json(group);
  } catch (err) {
    res.status(404).json({ error: "Group not found" });
  }
});

// Delete group (Main Admin only)
router.delete("/:id", authorize("admin"), async (req, res) => {
  // Deleting a group is a destructive system-level action. Only Main Admin may do it.
  if (!req.user.isMainAdmin) {
    return res.status(403).json({ error: "Only Main Admin can delete groups" });
  }
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
