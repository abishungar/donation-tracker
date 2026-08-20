const express = require("express");
const prisma = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { writeLog } = require("../utils/log");
const router = express.Router();
router.use(authenticate);

router.get("/", authorize("admin", "manager"), async (req,res)=>{
  const campaigns = await prisma.campaign.findMany({ orderBy:[{active:"desc"},{createdAt:"desc"}], include:{_count:{select:{donations:true}}} });
  res.json(campaigns);
});

router.get("/:id", authorize("admin", "manager"), async (req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)) return res.status(400).json({error:"Invalid campaign"});
  const campaign=await prisma.campaign.findUnique({where:{id}});
  if(!campaign) return res.status(404).json({error:"Campaign not found"});
  const where={campaignId:id};
  if(req.user.role==="manager") {
    const groups=await prisma.group.findMany({where:{managerId:req.user.id},select:{id:true}});
    where.groupId={in:groups.map(g=>g.id)};
  }
  const donations=await prisma.donation.findMany({where,include:{contact:true,group:true},orderBy:{date:"desc"}});
  const total=donations.reduce((sum,d)=>sum+Number(d.amount||0),0);
  res.json({...campaign,donations,totalRaised:total});
});

router.post("/", authorize("admin"), async (req,res)=>{
  const {name,description,active=true}=req.body;
  if(!name?.trim()) return res.status(400).json({error:"Campaign name is required"});
  const campaign=await prisma.campaign.create({data:{name:name.trim(),description:description?.trim()||null,active:!!active}});
  await writeLog(req,"CREATE_CAMPAIGN",{id:campaign.id,name:campaign.name});
  res.status(201).json(campaign);
});
router.put("/:id", authorize("admin"), async (req,res)=>{
  const id=Number(req.params.id); const {name,description,active}=req.body;
  try { const campaign=await prisma.campaign.update({where:{id},data:{...(name!==undefined&&{name:name.trim()}),...(description!==undefined&&{description:description?.trim()||null}),...(active!==undefined&&{active:!!active})}}); await writeLog(req,"UPDATE_CAMPAIGN",{id}); res.json(campaign); }
  catch(e){res.status(404).json({error:"Campaign not found"});}
});
router.delete("/:id", authorize("admin"), async (req,res)=>{
  const id=Number(req.params.id);
  try { await prisma.campaign.delete({where:{id}}); await writeLog(req,"DELETE_CAMPAIGN",{id}); res.json({success:true}); }
  catch(e){res.status(400).json({error:"Could not delete campaign"});}
});
module.exports=router;
