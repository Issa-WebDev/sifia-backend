import express from "express";
import axios from "axios";
import crypto from "crypto";
import Registration from "../models/Registration.js";
import {
  sendConfirmationEmail,
  sendOrganizationEmail,
} from "../utils/emailService.js";

const router = express.Router();

// Generate a unique confirmation code
const generateConfirmationCode = () => {
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SIFIA-2025-${randomPart}`;
};

// Initiate payment with CinetPay
router.post("/", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      country,
      participantTypeId,
      participantType,
      packageId,
      packageName,
      sector,
      additionalInfo,
      amount,
      currency,
      language,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !participantTypeId ||
      !packageId ||
      !amount ||
      !participantType ||
      !packageName
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Generate a unique confirmation code
    const confirmationCode = generateConfirmationCode();

    // Create a new registration record
    const registration = new Registration({
      firstName,
      lastName,
      email,
      phone,
      company,
      country,
      participantTypeId,
      participantType,
      packageId,
      packageName,
      sector,
      additionalInfo,
      amount,
      currency,
      confirmationCode,
      language,
    });

    // Save registration to database
    await registration.save();

    // CinetPay configuration
    const siteId = process.env.CINETPAY_SITE_ID;
    const apiKey = process.env.CINETPAY_API_KEY;
    const notifyUrl = `${process.env.BACKEND_URL}/api/payment/notify`;
    const returnUrl = `${process.env.FRONTEND_URL}/payment-success`;
    const cancelUrl = `${process.env.FRONTEND_URL}/payment-failure`;

    // Create transaction ID
    const transactionId = `SIFIA-${Date.now()}-${crypto
      .randomBytes(3)
      .toString("hex")}`;

      // `SIFIA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // CinetPay payment data
    const paymentData = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
      amount: amount,
      currency: currency,
      alternative_currency: "",
      description: `SIFIA 2025 - ${participantType} - ${packageName}`,
      customer_id: "172",
      customer_name: firstName,
      customer_surname: lastName,
      customer_email: email,
      customer_phone_number: phone.startsWith("+") ? phone.slice(1) : phone,
      customer_address: country,
      customer_city: country,
      customer_country: country,
      customer_state: country,
      customer_zip_code: "",
      notify_url: notifyUrl,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      channels: "ALL",
      lang: language === "fr" ? "fr" : "en",
      metadata: JSON.stringify({ registration_id: registration._id }),
    };

    // Initiate payment request to CinetPay
    const response = await axios.post(
      "https://api-checkout.cinetpay.com/v2/payment",
      paymentData
    );

    if (response.data && response.data.data) {
      // Update registration with transaction ID
      registration.transactionId = transactionId;
      await registration.save();

      // Return the payment URL
      return res.status(200).json({
        success: true,
        message: "Payment session created",
        payment_url: response.data.data.payment_url,
      });
    } else {
      throw new Error("Failed to create payment session");
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while initiating payment",
      error: error.message,
    });
  }
});

// CinetPay notification handler (Webhook)
router.post("/notify", async (req, res) => {
  try {
    const {
      cpm_trans_id,
      cpm_site_id,
      cpm_trans_status,
      cpm_payment_date,
      cpm_payment_method,
    } = req.body;

    if (!cpm_trans_id || !cpm_site_id || !cpm_trans_status) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification data" });
    }

    // Verify the notification with CinetPay
    const verifyData = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: cpm_trans_id,
    };

    const verifyResponse = await axios.post(
      "https://api-checkout.cinetpay.com/v2/payment/check",
      verifyData
    );

    if (
      verifyResponse.data &&
      verifyResponse.data.data &&
      verifyResponse.data.data.status === "ACCEPTED"
    ) {
      // Find registration by transaction ID
      const registration = await Registration.findOne({
        transactionId: cpm_trans_id,
      });

      if (!registration) {
        return res
          .status(404)
          .json({ success: false, message: "Registration not found" });
      }

      // Update registration with payment details
      registration.paymentStatus = "completed";
      registration.paymentMethod = cpm_payment_method || "CinetPay";
      registration.paymentDate = new Date(cpm_payment_date * 1000);

      await registration.save();

      // Send confirmation emails
      await sendConfirmationEmail(registration);
      await sendOrganizationEmail(registration);

      // Update email sent status
      registration.emailSent = true;
      await registration.save();

      return res
        .status(200)
        .json({ success: true, message: "Payment confirmed and processed" });
    } else {
      // Payment failed or was rejected
      const registration = await Registration.findOne({
        transactionId: cpm_trans_id,
      });

      if (registration) {
        registration.paymentStatus = "failed";
        await registration.save();
      }

      return res
        .status(200)
        .json({ success: false, message: "Payment failed or rejected" });
    }
  } catch (error) {
    console.error("Payment notification error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing payment notification",
      error: error.message,
    });
  }
});

// Payment verification endpoint
router.get("/verify", async (req, res) => {
  try {
    const { transaction_id, cpm_trans_id } = req.query;

    if (!transaction_id && !cpm_trans_id) {
      return res
        .status(400)
        .json({ success: false, message: "Transaction ID is required" });
    }

    // Find registration by transaction ID
    const registration = await Registration.findOne({
      $or: [{ transactionId: transaction_id }, { transactionId: cpm_trans_id }],
    });

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found" });
    }

    // Check if payment is completed
    if (registration.paymentStatus === "completed") {
      return res.status(200).json({
        success: true,
        message: "Payment verified",
        paymentData: {
          confirmationCode: registration.confirmationCode,
          firstName: registration.firstName,
          lastName: registration.lastName,
          participantType: registration.participantType,
          packageName: registration.packageName,
          amount: registration.amount,
          currency: registration.currency,
          paymentDate: registration.paymentDate,
        },
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "Payment not completed",
        status: registration.paymentStatus,
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while verifying payment",
      error: error.message,
    });
  }
});

export default router;
