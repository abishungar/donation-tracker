const express = require("express");
const prisma = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("admin"));

router.get("/", async (req, res) => {
  const logs = await prisma.log.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json(logs);
});

module.exports = router;
