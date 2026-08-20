const express = require("express");
const prisma = require("../db");
const { authenticate } = require("../middleware/auth");
const PDFDocument = require("pdfkit");

const router = express.Router();
router.use(authenticate);
async function getBrandName() {
  const row = await prisma.appSetting.findUnique({ where: { key: "app_name" } });
  return String(row?.value || process.env.APP_NAME || "Donation Tracker").trim();
}

function reportHeader(doc, brand, title, subtitle) {
  doc.rect(0, 0, 612, 82).fill("#111827");
  doc.fillColor("#ffffff").fontSize(19).font("Helvetica-Bold").text(brand, 40, 24);
  doc.font("Helvetica").fontSize(10).fillColor("#cbd5e1").text(title, 40, 51);
  doc.fillColor("#111827").moveDown(3);
  if (subtitle) doc.fontSize(10).fillColor("#6b7280").text(subtitle);
}


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
    include: { group: true, campaign: true },
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
router.get("/groups/:id/pdf", async (req, res) => {
  const id = Number(req.params.id);
  const month = req.query.month;
  const g = await prisma.group.findUnique({ where: { id } });
  if (!g) return res.status(404).json({ error: "Group not found" });
  if (req.user.role === "manager" && g.managerId !== req.user.id) return res.status(403).json({ error: "Not authorized" });
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: "Not authorized" });

  let where = { groupId: id };
  if (month) {
    const start = new Date(month + "-01T00:00:00");
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    where.date = { gte: start, lt: end };
  }
  const ds = await prisma.donation.findMany({ where, include: { contact: true, campaign: true }, orderBy: { date: "desc" } });
  const total = ds.reduce((a, d) => a + d.amount, 0);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="group-${id}-${month || "all"}.pdf"`);
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  const brand = await getBrandName();
  reportHeader(doc, brand, `${g.name} Donation Report`, month ? `Month: ${month}` : "All donations");
  doc.moveDown(0.5).fontSize(13).fillColor("#111827").text(`Total raised: $${total.toFixed(2)}`);
  doc.moveDown();
  ds.forEach((d, i) => {
    if (i && i % 28 === 0) doc.addPage();
    doc.fontSize(10).fillColor("#111827").text(`${new Date(d.date).toLocaleDateString()}  |  ${d.contact.firstName} ${d.contact.lastName}  |  ${d.type}  |  $${d.amount.toFixed(2)}${d.campaign ? `  |  ${d.campaign.name}` : ""}`);
  });
  doc.end();
});

async function allowedContact(req, contactId) {
  const c = await prisma.contact.findUnique({ where: { id: contactId }, select: { id: true, firstName: true, lastName: true, groupId: true } });
  if (!c) return { error: "Contact not found" };
  if (req.user.role === "admin") return { contact: c };
  if (req.user.role === "manager") {
    const g = c.groupId ? await prisma.group.findUnique({ where: { id: c.groupId }, select: { managerId: true } }) : null;
    if (g?.managerId === req.user.id) return { contact: c };
  }
  return { error: "Not authorized" };
}

router.get("/contacts/:id/pdf", async (req, res) => {
  const id = Number(req.params.id);
  const allowed = await allowedContact(req, id);
  if (allowed.error) return res.status(allowed.error === "Contact not found" ? 404 : 403).json({ error: allowed.error });
  const c = allowed.contact;
  const ds = await prisma.donation.findMany({ where: { contactId: id }, include: { group: true, campaign: true }, orderBy: { date: "desc" } });
  const total = ds.reduce((a, d) => a + d.amount, 0);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="contact-${id}-donations.pdf"`);
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  const brand = await getBrandName();
  reportHeader(doc, brand, `${c.firstName} ${c.lastName} - Donation Report`, `Total donated: $${total.toFixed(2)}`);
  doc.moveDown();
  ds.forEach((d, i) => {
    if (i && i % 28 === 0) doc.addPage();
    doc.fontSize(10).text(`${new Date(d.date).toLocaleDateString()}  |  ${d.group?.name || "No group"}  |  ${d.type}  |  $${d.amount.toFixed(2)}${d.campaign ? `  |  ${d.campaign.name}` : ""}`);
  });
  if (!ds.length) doc.fontSize(10).fillColor("#6b7280").text("No donations recorded.");
  doc.end();
});

router.get("/contacts/pdf", async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: "Not authorized" });
  let where = {};
  if (req.user.role === "manager") {
    const groups = await prisma.group.findMany({ where: { managerId: req.user.id }, select: { id: true } });
    where = { groupId: { in: groups.map(g => g.id) } };
  }
  const ds = await prisma.donation.findMany({ where, include: { contact: true, group: true, campaign: true }, orderBy: { date: "desc" } });
  const total = ds.reduce((a, d) => a + d.amount, 0);
  const grouped = new Map();
  for (const d of ds) {
    const key = d.contactId;
    if (!grouped.has(key)) grouped.set(key, { name: `${d.contact.firstName} ${d.contact.lastName}`, total: 0, donations: [] });
    const item = grouped.get(key); item.total += d.amount; item.donations.push(d);
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="all-contact-donations.pdf"`);
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  const brand = await getBrandName();
  reportHeader(doc, brand, "All Contact Donation Report", req.user.role === "manager" ? "Manager report - managed groups only" : "All groups");
  doc.moveDown(0.4).fontSize(13).fillColor("#111827").text(`Total raised: $${total.toFixed(2)}  |  Donations: ${ds.length}  |  Contacts: ${grouped.size}`);
  doc.moveDown();
  for (const item of grouped.values()) {
    if (doc.y > 700) doc.addPage();
    doc.fontSize(12).fillColor("#111827").text(`${item.name} — $${item.total.toFixed(2)}`);
    item.donations.forEach(d => {
      if (doc.y > 730) doc.addPage();
      doc.fontSize(9).fillColor("#374151").text(`  ${new Date(d.date).toLocaleDateString()} | ${d.group?.name || "No group"} | ${d.type} | $${d.amount.toFixed(2)}${d.campaign ? ` | ${d.campaign.name}` : ""}`);
    });
    doc.moveDown(0.5);
  }
  if (!ds.length) doc.fontSize(10).fillColor("#6b7280").text("No donations recorded.");
  doc.end();
});

module.exports = router;
