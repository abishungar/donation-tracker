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

module.exports = router;
