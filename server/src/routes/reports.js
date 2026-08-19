const express = require("express");
const prisma = require("../db");
const { authenticate } = require("../middleware/auth");
const PDFDocument = require("pdfkit");

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


router.get("/groups/:id/detail", async(req,res)=>{
 const id=Number(req.params.id); const g=await prisma.group.findUnique({where:{id},include:{manager:{select:{id:true,name:true,email:true}},contacts:true}});
 if(!g)return res.status(404).json({error:"Group not found"});
 if(req.user.role==="manager"&&g.managerId!==req.user.id)return res.status(403).json({error:"Not authorized"});
 const donations=await prisma.donation.findMany({where:{groupId:id},include:{contact:true},orderBy:{date:"desc"}});
 const totalRaised=donations.reduce((a,d)=>a+d.amount,0);
 const monthly={}; donations.forEach(d=>{const k=new Date(d.date).toISOString().slice(0,7);monthly[k]=(monthly[k]||0)+d.amount});
 res.json({group:g,totalRaised,monthly,donations});
});
router.get("/groups/:id/pdf", async(req,res)=>{
 const id=Number(req.params.id), month=req.query.month; const g=await prisma.group.findUnique({where:{id}}); if(!g)return res.status(404).end();
 let where={groupId:id}; if(month){const start=new Date(month+"-01T00:00:00"), end=new Date(start.getFullYear(),start.getMonth()+1,1);where.date={gte:start,lt:end};}
 const ds=await prisma.donation.findMany({where,include:{contact:true},orderBy:{date:"desc"}}); const total=ds.reduce((a,d)=>a+d.amount,0);
 res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition",`attachment; filename="group-${id}-${month||"all"}.pdf"`);
 const doc=new PDFDocument({margin:40});doc.pipe(res);doc.fontSize(20).text(`${g.name} Donation Report`);doc.moveDown().fontSize(11).text(month?`Month: ${month}`:"All donations");doc.text(`Total raised: $${total.toFixed(2)}`);doc.moveDown();ds.forEach(d=>doc.text(`${new Date(d.date).toLocaleDateString()}  |  ${d.contact.firstName} ${d.contact.lastName}  |  ${d.type}  |  $${d.amount.toFixed(2)}`));doc.end();
});

module.exports = router;
