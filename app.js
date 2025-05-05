import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import contactRoutes from "./routes/contactRoutes.js";
import payementRoutes from "./routes/payement.js";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use("/api/contact", contactRoutes);
app.use("/api/payment", payementRoutes);

export default app;
