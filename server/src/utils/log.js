const prisma = require("../db");

async function writeLog(req, action, details) {
  try {
    await prisma.log.create({
      data: {
        userId: req.user ? req.user.id : null,
        userEmail: req.user ? req.user.email : null,
        action,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (err) {
    // Logging must never break the main request
    console.error("Failed to write log:", err.message);
  }
}

module.exports = { writeLog };
