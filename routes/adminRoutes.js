import express from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import Registration from "../models/Registration.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find admin by username
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

// Get registrations with filters
router.get("/registrations", authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      direction = "desc",
      searchTerm,
      paymentStatus,
      dateRange,
      participantType,
    } = req.query;

    // Build query
    const query = {};

    if (searchTerm) {
      query.$or = [
        { firstName: { $regex: searchTerm, $options: "i" } },
        { lastName: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { confirmationCode: { $regex: searchTerm, $options: "i" } },
      ];
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (participantType) {
      query.participantType = participantType;
    }

    if (dateRange) {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "last7days":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "last30days":
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case "thisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "lastMonth":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Execute query with pagination
    const registrations = await Registration.find(query)
      .sort({ [sort]: direction === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get total count
    const total = await Registration.countDocuments(query);

    res.json({
      success: true,
      registrations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registrations",
    });
  }
});

export default router;
