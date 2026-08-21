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

async function getBranding() {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: ["app_name", "email_system_name"] } } });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return String(map.app_name || map.email_system_name || process.env.APP_NAME || "Donation Tracker").trim() || "Donation Tracker";
}

function money(v) { return `$${Number(v || 0).toFixed(2)}`; }
function safeText(v) { return String(v ?? "").replace(/\s+/g, " ").trim(); }
function drawHeader(doc, branding, title, subtitle) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.save();
  doc.roundedRect(doc.page.margins.left, 36, width, 74, 14).fill("#111827");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(19).text(branding, doc.page.margins.left + 18, 50, { width: width - 36 });
  doc.font("Helvetica").fontSize(9).fillColor("#d1d5db").text(subtitle || "Donation Report", doc.page.margins.left + 18, 76, { width: width - 36 });
  doc.restore();
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(17).text(title, doc.page.margins.left, 132, { width });
  doc.fillColor("#6b7280").font("Helvetica").fontSize(9).text(`Generated ${new Date().toLocaleString()}`, doc.page.margins.left, 154, { width });
  doc.moveDown(2.2);
}
function drawSummary(doc, items) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 8; const cardW = (width - gap * (items.length - 1)) / items.length;
  const y = doc.y;
  items.forEach((item, i) => {
    const x = doc.page.margins.left + i * (cardW + gap);
    doc.roundedRect(x, y, cardW, 48, 9).fill("#f3f4f6");
    doc.fillColor("#6b7280").font("Helvetica").fontSize(8).text(item.label, x + 10, y + 8, { width: cardW - 20 });
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(item.value, x + 10, y + 22, { width: cardW - 20 });
  });
  doc.y = y + 64;
}
function drawTableHeader(doc, columns) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const widths = columns.map(c => c.width * width);
  let x = doc.page.margins.left;
  doc.rect(x, doc.y, width, 24).fill("#e5e7eb");
  columns.forEach((c, i) => {
    doc.fillColor("#374151").font("Helvetica-Bold").fontSize(8).text(c.label, x + 6, doc.y + 7, { width: widths[i] - 12, ellipsis: true });
    x += widths[i];
  });
  doc.y += 24;
  return widths;
}
function drawTableRow(doc, columns, widths, values, zebra) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowH = 22;
  if (doc.y + rowH > doc.page.height - 50) { doc.addPage(); return false; }
  if (zebra) doc.rect(doc.page.margins.left, doc.y, width, rowH).fill("#f9fafb");
  let x = doc.page.margins.left;
  columns.forEach((c, i) => {
    doc.fillColor("#374151").font("Helvetica").fontSize(7.5).text(safeText(values[i]), x + 6, doc.y + 7, { width: widths[i] - 12, ellipsis: true });
    x += widths[i];
  });
  doc.y += rowH;
  return true;
}
function footer(doc, branding) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.save();
    doc.strokeColor("#e5e7eb").moveTo(doc.page.margins.left, doc.page.height - 38).lineTo(doc.page.width - doc.page.margins.right, doc.page.height - 38).stroke();
    doc.fillColor("#9ca3af").font("Helvetica").fontSize(7).text(branding, doc.page.margins.left, doc.page.height - 28, { width: 250 });
    doc.text(`Page ${i + 1} of ${pages.count}`, doc.page.width - doc.page.margins.right - 100, doc.page.height - 28, { width: 100, align: "right" });
    doc.restore();
  }
}

router.get("/groups/:id/pdf", async (req, res) => {
  const id = Number(req.params.id), month = req.query.month;
  const g = await prisma.group.findUnique({ where: { id }, include: { manager: { select: { name: true, email: true } } } });
  if (!g) return res.status(404).json({ error: "Group not found" });
  if (req.user.role === "manager" && g.managerId !== req.user.id) return res.status(403).json({ error: "Not authorized" });
  if (!["admin", "manager"].includes(req.user.role)) return res.status(403).json({ error: "Not authorized" });
  let where = { groupId: id };
  if (month) { const start = new Date(month + "-01T00:00:00"); const end = new Date(start.getFullYear(), start.getMonth() + 1, 1); where.date = { gte: start, lt: end }; }
  const ds = await prisma.donation.findMany({ where, include: { contact: true, campaign: true }, orderBy: { date: "desc" } });
  const branding = await getBranding(); const total = ds.reduce((a,d)=>a+d.amount,0);
  res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(g.name)}-donations.pdf"`);
  const doc = new PDFDocument({ margin: 42, size: "A4", bufferPages: true }); doc.pipe(res);
  drawHeader(doc, branding, `${g.name} Donation Report`, month ? `Monthly report · ${month}` : "Group donation history");
  drawSummary(doc, [{label:"Total Raised",value:money(total)},{label:"Donations",value:String(ds.length)},{label:"Manager",value:safeText(g.manager?.name || g.manager?.email || "Not assigned")}]);
  const cols=[{label:"DATE",width:.15},{label:"DONOR",width:.27},{label:"CAMPAIGN",width:.24},{label:"TYPE",width:.16},{label:"AMOUNT",width:.18}];
  let widths=drawTableHeader(doc,cols); ds.forEach((d,i)=>{ if(doc.y+22>doc.page.height-55){doc.addPage(); drawHeader(doc,branding,`${g.name} Donation Report`,month?`Monthly report · ${month}`:"Group donation history"); widths=drawTableHeader(doc,cols);} drawTableRow(doc,cols,widths,[new Date(d.date).toLocaleDateString(),`${d.contact.firstName} ${d.contact.lastName}`,d.campaign?.name||"—",d.type||"—",money(d.amount)],i%2===1); });
  if(!ds.length) doc.fillColor("#6b7280").fontSize(10).text("No donations recorded for this period."); footer(doc,branding); doc.end();
});

async function allowedContact(req, contactId) {
  const c = await prisma.contact.findUnique({ where: { id: contactId }, select: { id: true, firstName: true, lastName: true, groupId: true } });
  if (!c) return { error: "Contact not found" }; if (req.user.role === "admin") return { contact: c };
  if (req.user.role === "manager") { const g = c.groupId ? await prisma.group.findUnique({ where: { id: c.groupId }, select: { managerId: true } }) : null; if (g?.managerId === req.user.id) return { contact: c }; }
  return { error: "Not authorized" };
}

router.get("/contacts/:id/pdf", async (req,res)=>{
  const id=Number(req.params.id), allowed=await allowedContact(req,id); if(allowed.error)return res.status(allowed.error==="Contact not found"?404:403).json({error:allowed.error});
  const c=allowed.contact, ds=await prisma.donation.findMany({where:{contactId:id},include:{group:true,campaign:true},orderBy:{date:"desc"}}); const total=ds.reduce((a,d)=>a+d.amount,0), branding=await getBranding();
  res.setHeader("Content-Type","application/pdf"); res.setHeader("Content-Disposition",`inline; filename="${encodeURIComponent(c.firstName+'-'+c.lastName)}-donations.pdf"`);
  const doc=new PDFDocument({margin:42,size:"A4",bufferPages:true}); doc.pipe(res); drawHeader(doc,branding,`${c.firstName} ${c.lastName} Donation Report`,"Individual donation history"); drawSummary(doc,[{label:"Total Donated",value:money(total)},{label:"Donations",value:String(ds.length)},{label:"Group",value:safeText((await prisma.group.findUnique({where:{id:c.groupId||0}}))?.name||"No group")}]);
  const cols=[{label:"DATE",width:.17},{label:"GROUP",width:.27},{label:"CAMPAIGN",width:.25},{label:"TYPE",width:.13},{label:"AMOUNT",width:.18}]; let widths=drawTableHeader(doc,cols); ds.forEach((d,i)=>{if(doc.y+22>doc.page.height-55){doc.addPage();drawHeader(doc,branding,`${c.firstName} ${c.lastName} Donation Report`,"Individual donation history");widths=drawTableHeader(doc,cols);}drawTableRow(doc,cols,widths,[new Date(d.date).toLocaleDateString(),d.group?.name||"—",d.campaign?.name||"—",d.type||"—",money(d.amount)],i%2===1);}); if(!ds.length)doc.fillColor("#6b7280").fontSize(10).text("No donations recorded."); footer(doc,branding); doc.end();
});

router.get("/contacts/pdf", async (req,res)=>{
  if(!["admin","manager"].includes(req.user.role))return res.status(403).json({error:"Not authorized"}); let where={}; if(req.user.role==="manager"){const gs=await prisma.group.findMany({where:{managerId:req.user.id},select:{id:true}});where={groupId:{in:gs.map(g=>g.id)}};}
  const ds=await prisma.donation.findMany({where,include:{contact:true,group:true,campaign:true},orderBy:{date:"desc"}}),total=ds.reduce((a,d)=>a+d.amount,0),grouped=new Map(); for(const d of ds){const k=d.contactId;if(!grouped.has(k))grouped.set(k,{name:`${d.contact.firstName} ${d.contact.lastName}`,total:0,donations:[]});const it=grouped.get(k);it.total+=d.amount;it.donations.push(d);} const branding=await getBranding();
  res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition", `inline; filename="all-contact-donations.pdf"`);
  const doc=new PDFDocument({margin:42,size:"A4",bufferPages:true});doc.pipe(res);drawHeader(doc,branding,"All Contact Donation Report",req.user.role==="manager"?"Manager report · managed groups only":"All groups");drawSummary(doc,[{label:"Total Raised",value:money(total)},{label:"Donations",value:String(ds.length)},{label:"Contacts",value:String(grouped.size)}]);
  const cols=[{label:"DATE",width:.15},{label:"CONTACT",width:.27},{label:"GROUP",width:.22},{label:"CAMPAIGN",width:.20},{label:"AMOUNT",width:.16}];let widths=drawTableHeader(doc,cols);ds.forEach((d,i)=>{if(doc.y+22>doc.page.height-55){doc.addPage();drawHeader(doc,branding,"All Contact Donation Report",req.user.role==="manager"?"Manager report · managed groups only":"All groups");widths=drawTableHeader(doc,cols);}drawTableRow(doc,cols,widths,[new Date(d.date).toLocaleDateString(),`${d.contact.firstName} ${d.contact.lastName}`,d.group?.name||"—",d.campaign?.name||"—",money(d.amount)],i%2===1);});if(!ds.length)doc.fillColor("#6b7280").fontSize(10).text("No donations recorded.");footer(doc,branding);doc.end();
});

module.exports = router;
