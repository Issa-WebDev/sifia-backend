// server.js ou routes/payment.js
import express from "express";
import axios from "axios";
const router = express.Router();

router.post("/", async (req, res) => {
  const formData = req.body;
  console.log(formData)

  const transaction_id = Math.floor(Math.random() * 100000000).toString(); // Génère un ID unique

  const payload = {
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id,
    amount: 500,
    currency: "XOF",
    description: `Paiement inscription ${formData.firstName} ${formData.lastName}`,
    customer_name: formData.firstName,
    customer_surname: formData.lastName,
    customer_email: formData.email,
    customer_phone_number: `225${formData.phone}`, // avec indicatif pays sans "+"
    customer_address: "Abidjan", // mettre une valeur par défaut
    customer_city: "Abidjan", // idem
    customer_country: formData.country.toUpperCase(), // CI
    customer_state: formData.country.toUpperCase(), // CM si Cameroun, CI pour Côte d’Ivoire
    customer_zip_code: "00000",
    // notify_url: process.env.NOTIFY_URL,
    // return_url: process.env.RETURN_URL,
    notify_url: "https://webhook.site/d1dbbb89-52c7-49af-a689-b3c412df820d",
    return_url: "https://webhook.site/d1dbbb89-52c7-49af-a689-b3c412df820d",

    channels: "ALL",
    metadata: "user-registration",
    lang: "FR",
    invoice_data: {
      Donnee1: "",
      Donnee2: "",
      Donnee3: "",
    },
  };


  console.log(payload)


  try {
    const response = await axios.post(
      "https://api-checkout.cinetpay.com/v2/payment",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data && response.data.data && response.data.code === "201") {
      return res.json({
        payment_url: response.data.data.payment_url,
      });
    } else {
      console.error("CinetPay API error response:", response.data);
      return res.status(500).json({
        message: "Payment creation failed at CinetPay.",
      });
    }
  } catch (error) {
    console.error("CinetPay API error:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Internal Server Error during payment creation.",
    });
  }
});

export default router;
