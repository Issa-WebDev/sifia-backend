import express from "express";
import axios from "axios";
import crypto from "crypto";
import Registration from "../models/Registration.js";
import {
  sendConfirmationEmail,
  sendOrganizationEmail,
  sendInstallmentEmail,
} from "../utils/emailService.js";
import installmentRoutes from "./installmentRoutes.js";

const router = express.Router();

// Constants
const MAX_PAYMENT_AMOUNT = 999999; // Maximum amount per CinetPay transaction (999,999 FCFA)

// Use installment routes
router.use("/installments", installmentRoutes);

const generateConfirmationCode = () => {
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SIFIA-2025-${randomPart}`;
};

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

router.post("/", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      country,
      postal,
      city,
      address,
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

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !postal ||
      !city ||
      !address ||
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

    const confirmationCode = generateConfirmationCode();

    let registration = await Registration.findOne({ email, packageId });

    if (!registration) {
      registration = new Registration({
        firstName,
        lastName,
        email,
        phone,
        company,
        country,
        postal,
        city,
        address,
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

      await registration.save();
    }

    // Check if we need to split the payment into installments
    if (amount > MAX_PAYMENT_AMOUNT) {
      // Create installments for this registration
      const installmentAmounts = splitAmountIntoInstallments(amount);

      const installments = installmentAmounts.map(
        (installmentAmount, index) => {
          const transactionId = `SIFIA-INST-${Date.now()}-${index}-${crypto
            .randomBytes(3)
            .toString("hex")}`;

          return {
            amount: installmentAmount,
            status: "pending",
            transactionId,
            index,
          };
        }
      );

      registration.installments = installments;
      await registration.save();

      // Redirect to the installment payment page
      return res.status(200).json({
        success: true,
        message: "Registration requires installment payments",
        registration_id: registration._id,
        requires_installments: true,
        total_installments: installments.length,
      });
    }

    // Process as a single payment if the amount is under the limit
    const transactionId = `SIFIA-${Date.now()}-${crypto
      .randomBytes(3)
      .toString("hex")}`;

    // Create a single installment for tracking
    const singleInstallment = {
      amount,
      status: "pending",
      transactionId,
      index: 0,
    };

    registration.installments = [singleInstallment];
    await registration.save();

    const siteId = process.env.CINETPAY_SITE_ID;
    const apiKey = process.env.CINETPAY_API_KEY;
    const notifyUrl = `${process.env.BACKEND_URL}/api/payment/notify`;
    const returnUrl = `${process.env.FRONTEND_URL}/payment-success`;
    const cancelUrl = `${process.env.FRONTEND_URL}/payment-failure`;

    const paymentData = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
      amount,
      currency,
      alternative_currency: "",
      description: `SIFIA 2025 - ${participantType} - ${packageName}`,
      customer_id: registration._id,
      customer_name: firstName,
      customer_surname: lastName,
      customer_email: email,
      customer_phone_number: phone.startsWith("+") ? phone.slice(1) : phone,
      customer_address: address,
      customer_city: city,
      customer_state: country,
      customer_country: country,
      customer_zip_code: postal,
      notify_url: notifyUrl,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      channels: "ALL",
      lang: language === "fr" ? "fr" : "en",
      metadata: JSON.stringify({
        registration_id: registration._id,
        installment_id: registration.installments[0]._id,
        is_installment: false,
      }),
    };

    const response = await axios.post(
      "https://api-checkout.cinetpay.com/v2/payment",
      paymentData
    );

    if (response.data && response.data.data) {
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

router.post("/notify", async (req, res) => {
  try {
    const {
      cpm_trans_id,
      cpm_site_id,
      cpm_trans_status,
      cpm_payment_date,
      cpm_payment_method,
      cpm_custom,
    } = req.body;

    if (!cpm_trans_id || !cpm_site_id || !cpm_trans_status) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification data" });
    }

    const verifyData = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: cpm_trans_id,
    };

    const verifyResponse = await axios.post(
      "https://api-checkout.cinetpay.com/v2/payment/check",
      verifyData
    );

    // Parse the metadata
    let metadata = {};
    if (cpm_custom) {
      try {
        metadata = JSON.parse(cpm_custom);
      } catch (e) {
        console.error("Error parsing metadata:", e);
      }
    }

    if (verifyResponse.data?.data?.status === "ACCEPTED") {
      // Find registration either by direct transaction ID or through installment
      let registration = null;
      let installment = null;

      if (metadata.is_installment) {
        // This is an installment payment
        registration = await Registration.findById(metadata.registration_id);

        if (registration && metadata.installment_id) {
          installment = registration.installments.id(metadata.installment_id);
        } else {
          // Fallback to finding by transaction ID if IDs are missing
          registration = await Registration.findOne({
            "installments.transactionId": cpm_trans_id,
          });

          if (registration) {
            installment = registration.installments.find(
              (i) => i.transactionId === cpm_trans_id
            );
          }
        }
      } else {
        // This could be a single payment or legacy payment
        registration = await Registration.findOne({
          $or: [
            { transactionId: cpm_trans_id },
            { "installments.transactionId": cpm_trans_id },
          ],
        });

        if (registration) {
          installment = registration.installments.find(
            (i) => i.transactionId === cpm_trans_id
          );
        }
      }

      if (!registration) {
        return res
          .status(404)
          .json({ success: false, message: "Registration not found" });
      }

      const paymentDate = new Date(cpm_payment_date * 1000);

      // Update installment status
      if (installment) {
        installment.status = "completed";
        installment.paymentDate = paymentDate;
        installment.paymentMethod = cpm_payment_method || "CinetPay";
      }

      await registration.save();

      // Check if this completes all installments
      const isFullyPaid = registration.installments.every(
        (inst) => inst.status === "completed"
      );

      if (isFullyPaid) {
        registration.paymentStatus = "completed";
        registration.paymentMethod = cpm_payment_method || "CinetPay";
        registration.paymentDate = paymentDate;

        // Send completion email only if all installments are paid
        if (!registration.emailSent) {
          await sendConfirmationEmail(registration);
          await sendOrganizationEmail(registration);
          registration.emailSent = true;
        }
      } else {
        // Send installment confirmation email
        await sendInstallmentEmail(
          registration,
          installment,
          registration.installments.length
        );
      }

      await registration.save();

      return res.status(200).json({
        success: true,
        message: "Payment confirmed and processed",
      });
    } else {
      // Payment failed
      let registration = null;

      if (
        metadata.is_installment &&
        metadata.registration_id &&
        metadata.installment_id
      ) {
        registration = await Registration.findById(metadata.registration_id);

        if (registration) {
          const installment = registration.installments.id(
            metadata.installment_id
          );
          if (installment) {
            installment.status = "failed";
            await registration.save();
          }
        }
      } else {
        registration = await Registration.findOne({
          "installments.transactionId": cpm_trans_id,
        });

        if (registration) {
          const installment = registration.installments.find(
            (i) => i.transactionId === cpm_trans_id
          );

          if (installment) {
            installment.status = "failed";
            await registration.save();
          }
        }
      }

      return res.status(200).json({
        success: false,
        message: "Payment failed or rejected",
      });
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

router.get("/verify", async (req, res) => {
  try {
    const { transaction_id, cpm_trans_id, registration_id } = req.query;

    let registration = null;

    if (registration_id) {
      registration = await Registration.findById(registration_id);
    } else if (transaction_id || cpm_trans_id) {
      registration = await Registration.findOne({
        $or: [
          { "installments.transactionId": transaction_id },
          { "installments.transactionId": cpm_trans_id },
        ],
      });
    }

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found" });
    }

    // Calculate total paid amount
    const totalPaid = registration.installments
      .filter((i) => i.status === "completed")
      .reduce((sum, i) => sum + i.amount, 0);

    const percentagePaid = (totalPaid / registration.amount) * 100;

    return res.status(200).json({
      success: true,
      message:
        registration.paymentStatus === "completed"
          ? "Payment verified"
          : "Payment pending",
      paymentData: {
        confirmationCode: registration.confirmationCode,
        firstName: registration.firstName,
        lastName: registration.lastName,
        participantType: registration.participantType,
        packageName: registration.packageName,
        amount: registration.amount,
        currency: registration.currency,
        paymentStatus: registration.paymentStatus,
        totalPaid: totalPaid,
        percentagePaid: percentagePaid,
        isFullyPaid: registration.isFullyPaid,
        installments: registration.installments,
      },
    });
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
