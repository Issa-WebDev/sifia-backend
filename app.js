import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import contactRoutes from "./routes/contactRoutes.js";
import { createTransport } from "nodemailer";
import paymentRoutes from "./routes/paymentRoutes.js";
import loginRoutes from "./routes/adminRoutes.js"
import registerRoutes from "./routes/adminRoutes.js";
import mongoose from "mongoose";
const router = express.Router();

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: "https://sifia-frontend.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Setup nodemailer transporter
export const emailTransporter = createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Routes
app.get("/", (req, res) => {
  res.send("SIFIA 2025 API is running");
});

router.use("/login", loginRoutes)
router.use("/registrations", registerRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payment", paymentRoutes);

// Test email configuration on startup
emailTransporter.verify((error) => {
  if (error) {
    console.error("Email configuration error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error", error: err.message });
});

export default app;
