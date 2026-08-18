const express = require("express");
const prisma = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// Group totals - visible to everyone logged in, but a plain "user" only
// sees the total for their own group (not the full breakdown of contacts).
router.get("/group-totals", async (req, res) => {
  let groups;
  if (req.user.role === "admin") {
    groups = await prisma.group.findMany();
  } else if (req.user.role === "manager") {
    groups = await prisma.group.findMany({ where: { managerId: req.user.id } });
  } else {
    if (!req.user.contactId) return res.json([]);
    const contact = await prisma.contact.findUnique({ where: { id: req.user.contactId } });
    groups = contact && contact.groupId ? await prisma.group.findMany({ where: { id: contact.groupId } }) : [];
  }

  const results = await Promise.all(
    groups.map(async (g) => {
      const sum = await prisma.donation.aggregate({ where: { groupId: g.id }, _sum: { amount: true } });
      return { groupId: g.id, name: g.name, totalRaised: sum._sum.amount || 0 };
    })
  );
  res.json(results);
});

// My total (for "user" role, or anyone with a linked contact)
router.get("/my-total", authenticate, async (req, res) => {
  if (!req.user.contactId) return res.json({ totalRaised: 0, donations: [] });
  const donations = await prisma.donation.findMany({
    where: { contactId: req.user.contactId },
    orderBy: { date: "desc" },
  });
  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);
  res.json({ totalRaised, donations });
});

// Analytics for dashboard charts (admin: all groups, manager: own group(s) only)
router.get("/analytics", async (req, res) => {
  let groupIds = null;
  if (req.user.role === "manager") {
    const groups = await prisma.group.findMany({ where: { managerId: req.user.id } });
    groupIds = groups.map((g) => g.id);
  } else if (req.user.role === "user") {
    return res.status(403).json({ error: "Not authorized" });
  }

  const where = groupIds ? { groupId: { in: groupIds } } : {};
  const donations = await prisma.donation.findMany({
    where,
    include: { contact: true, group: true },
  });

  // Monthly totals for the last 6 months
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("default", { month: "short" }), total: 0 });
  }
  for (const d of donations) {
    const dt = new Date(d.date);
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.total += d.amount;
  }

  // Totals by group
  const byGroupMap = new Map();
  for (const d of donations) {
    const key = d.group.name;
    byGroupMap.set(key, (byGroupMap.get(key) || 0) + d.amount);
  }
  const byGroup = Array.from(byGroupMap.entries()).map(([name, total]) => ({ name, total }));

  // Top contacts
  const byContactMap = new Map();
  for (const d of donations) {
    const key = d.contactId;
    const existing = byContactMap.get(key) || {
      name: `${d.contact.firstName} ${d.contact.lastName}`,
      total: 0,
    };
    existing.total += d.amount;
    byContactMap.set(key, existing);
  }
  const topContacts = Array.from(byContactMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);
  const donationCount = donations.length;

  res.json({
    totalRaised,
    donationCount,
    monthly: months.map((m) => ({ label: m.label, total: m.total })),
    byGroup,
    topContacts,
  });
});

module.exports = router;
