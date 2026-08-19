require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const prisma = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const contactRoutes = require("./routes/contacts");
const groupRoutes = require("./routes/groups");
const donationRoutes = require("./routes/donations");
const reportRoutes = require("./routes/reports");
const logRoutes = require("./routes/logs");
const adminRoutes = require("./routes/admin");
const paymentRoutes = require("./routes/payments");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Serve the built React frontend in production (single Render service)
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  try {
    const result = await prisma.user.updateMany({
      where: { role: "admin", isMainAdmin: false },
      data: { isMainAdmin: true },
    });
    if (result.count) console.log(`Promoted ${result.count} existing admin(s) to Main Admin.`);
  } catch (err) {
    console.error("Main Admin promotion check failed:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
