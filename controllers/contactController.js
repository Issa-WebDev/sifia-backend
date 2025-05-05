import { sendEmail } from "../services/mailer.js";

export const sendContactEmail = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  try {
    await sendEmail({
      from: email,
      subject: `${subject}`,
      html: `
        <h3>Nouveau message depuis le formulaire de contact de sifia</h3>
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Téléphone:</strong> ${phone || "Non fourni"}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
    });

    res.status(200).json({ message: "Email envoyé avec succès" });
  } catch (error) {
    console.error("Erreur envoi email :", error);
    res.status(500).json({ message: "Erreur lors de l’envoi de l’email" });
  }
};
