import express from "express";
import axios from "axios";
import crypto from "crypto";
import Registration from "../models/Registration.js";
import {
  sendConfirmationEmail,
  sendInstallmentEmail,
} from "../utils/emailService.js";

const router = express.Router();

// Constants
const MAX_PAYMENT_AMOUNT = 999999; // Maximum amount per CinetPay transaction (999,999 FCFA)

// Helper function to split amount into installments
const splitAmountIntoInstallments = (totalAmount) => {
  const installments = [];
  let remainingAmount = totalAmount;

  while (remainingAmount > 0) {
    const installmentAmount = Math.min(remainingAmount, MAX_PAYMENT_AMOUNT);
    installments.push(installmentAmount);
    remainingAmount -= installmentAmount;
  }

  return installments;
};

// Create installments for a registration
router.post("/create/:registrationId", async (req, res) => {
  try {
    const { registrationId } = req.params;

    // Find the registration
    const registration = await Registration.findById(registrationId);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Check if installments are already created
    if (registration.installments && registration.installments.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Installments already exist for this registration",
      });
    }

    // Split the amount into installments
    const installmentAmounts = splitAmountIntoInstallments(registration.amount);

    // Create installment records
    const installments = installmentAmounts.map((amount, index) => {
      const transactionId = `SIFIA-INST-${Date.now()}-${index}-${crypto
        .randomBytes(3)
        .toString("hex")}`;

      return {
        amount,
        status: "pending",
        transactionId,
        index,
      };
    });

    // Add installments to registration
    registration.installments = installments;
    await registration.save();

    return res.status(200).json({
      success: true,
      message: "Installments created successfully",
      installments: registration.installments,
    });
  } catch (error) {
    console.error("Error creating installments:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating installments",
      error: error.message,
    });
  }
});

// Get installments for a registration
router.get("/:registrationId", async (req, res) => {
  try {
    const { registrationId } = req.params;

    // Find the registration
    const registration = await Registration.findById(registrationId);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // If no installments exist, create them
    if (!registration.installments || registration.installments.length === 0) {
      const installmentAmounts = splitAmountIntoInstallments(
        registration.amount
      );

      const installments = installmentAmounts.map((amount, index) => {
        const transactionId = `SIFIA-INST-${Date.now()}-${index}-${crypto
          .randomBytes(3)
          .toString("hex")}`;

        return {
          amount,
          status: "pending",
          transactionId,
          index,
        };
      });

      registration.installments = installments;
      await registration.save();
    }

    return res.status(200).json({
      success: true,
      registration,
      installments: registration.installments,
    });
  } catch (error) {
    console.error("Error getting installments:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving installments",
      error: error.message,
    });
  }
});

// Process payment for a specific installment
router.post("/pay-installment/:installmentId", async (req, res) => {
  try {
    const { installmentId } = req.params;

    // Find registration with this installment
    const registration = await Registration.findOne({
      "installments._id": installmentId,
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration or installment not found",
      });
    }

    // Find the specific installment
    const installment = registration.installments.id(installmentId);

    if (!installment) {
      return res.status(404).json({
        success: false,
        message: "Installment not found",
      });
    }

    // Check if installment is already paid
    if (installment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "This installment has already been paid",
      });
    }

    // Prepare CinetPay payment
    const siteId = process.env.CINETPAY_SITE_ID;
    const apiKey = process.env.CINETPAY_API_KEY;
    const notifyUrl = `${process.env.BACKEND_URL}/api/payment/notify`;
    const returnUrl = `${process.env.FRONTEND_URL}/payment-success?installment=${installmentId}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/payment-failure?installment=${installmentId}`;

    const transactionId = installment.transactionId;
    const amount = installment.amount;
    const currency = registration.currency;
    const installmentNumber = installment.index + 1;
    const totalInstallments = registration.installments.length;

    const paymentData = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
      amount,
      currency,
      alternative_currency: "",
      description: `SIFIA 2025 - ${registration.participantType} - ${registration.packageName} - Installment ${installmentNumber}/${totalInstallments}`,
      customer_id: registration._id,
      customer_name: registration.firstName,
      customer_surname: registration.lastName,
      customer_email: registration.email,
      customer_phone_number: registration.phone.startsWith("+")
        ? registration.phone.slice(1)
        : registration.phone,
      customer_address: registration.address,
      customer_city: registration.city,
      customer_state: registration.country,
      customer_country: registration.country,
      customer_zip_code: registration.postal,
      notify_url: notifyUrl,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      channels: "ALL",
      lang: registration.language === "fr" ? "fr" : "en",
      metadata: JSON.stringify({
        registration_id: registration._id,
        installment_id: installmentId,
        is_installment: true,
        installment_number: installmentNumber,
        total_installments: totalInstallments,
      }),
    };

    const response = await axios.post(
      "https://api-checkout.cinetpay.com/v2/payment",
      paymentData
    );

    if (response.data && response.data.data) {
      return res.status(200).json({
        success: true,
        message: "Payment session created for installment",
        payment_url: response.data.data.payment_url,
      });
    } else {
      throw new Error("Failed to create payment session for installment");
    }
  } catch (error) {
    console.error("Installment payment initiation error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while initiating installment payment",
      error: error.message,
    });
  }
});

// Check payment status for a specific installment
router.get("/check/:installmentId", async (req, res) => {
  try {
    const { installmentId } = req.params;

    // Find registration with this installment
    const registration = await Registration.findOne({
      "installments._id": installmentId,
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration or installment not found",
      });
    }

    // Find the specific installment
    const installment = registration.installments.id(installmentId);

    if (!installment) {
      return res.status(404).json({
        success: false,
        message: "Installment not found",
      });
    }

    return res.status(200).json({
      success: true,
      installment,
      isFullyPaid: registration.isFullyPaid,
      totalPaid: registration.totalPaid,
      totalAmount: registration.amount,
    });
  } catch (error) {
    console.error("Error checking installment status:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while checking installment status",
      error: error.message,
    });
  }
});

export default router;
