import { emailTransporter } from "../app.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email templates
const getConfirmationEmailTemplate = (data, language) => {
  const isEnglish = language === "en";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${
        isEnglish
          ? "SIFIA 2025 Registration Confirmation"
          : "Confirmation d'inscription SIFIA 2025"
      }</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #1a3e78;
          color: #fff;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .footer {
          background-color: #f0f0f0;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .confirmation-code {
          font-size: 18px;
          font-weight: bold;
          color: #1a3e78;
          text-align: center;
          padding: 10px;
          border: 2px dashed #ccc;
          margin: 15px 0;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .info-table th, .info-table td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        .info-table th {
          text-align: left;
          font-weight: bold;
          width: 40%;
        }
        .important-note {
          background-color: #fff4e6;
          border-left: 4px solid #d97706;
          padding: 10px;
          margin: 15px 0;
        }
        .logo {
          max-width: 200px;
          margin: 0 auto;
          display: block;
        }
        .gold-text {
          color: #d4af37;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://example.com/sifia-logo.png" alt="SIFIA 2025" class="logo">
          <h1>SIFIA <span class="gold-text">2025</span></h1>
          <p>${
            isEnglish
              ? "Registration Confirmation"
              : "Confirmation d'inscription"
          }</p>
        </div>
        
        <div class="content">
          <p>${isEnglish ? "Dear" : "Cher"} ${data.firstName} ${
    data.lastName
  },</p>
          
          <p>${
            isEnglish
              ? "Thank you for registering for SIFIA 2025! Your payment has been successfully processed."
              : "Merci de vous être inscrit au SIFIA 2025 ! Votre paiement a été traité avec succès."
          }</p>
          
          <p><strong>${
            isEnglish
              ? "Your confirmation code:"
              : "Votre code de confirmation :"
          }</strong></p>
          <div class="confirmation-code">${data.confirmationCode}</div>
          
          <h3>${
            isEnglish ? "Registration Details" : "Détails de l'inscription"
          }</h3>
          <table class="info-table">
            <tr>
              <th>${isEnglish ? "Name" : "Nom"}</th>
              <td>${data.firstName} ${data.lastName}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Participant Type" : "Type de participant"}</th>
              <td>${data.participantType}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Package" : "Forfait"}</th>
              <td>${data.packageName}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Amount Paid" : "Montant payé"}</th>
              <td>${new Intl.NumberFormat(isEnglish ? "en-US" : "fr-FR").format(
                data.amount
              )} ${data.currency}</td>
            </tr>
          </table>
          
          <h3>${
            isEnglish ? "Event Information" : "Informations sur l'événement"
          }</h3>
          <p>
            <strong>${
              isEnglish ? "Date:" : "Date :"
            }</strong> April 15-18, 2025<br>
            <strong>${
              isEnglish ? "Venue:" : "Lieu :"
            }</strong> Sofitel Abidjan Hotel Ivoire, Côte d'Ivoire<br>
            <strong>${
              isEnglish ? "Time:" : "Horaire :"
            }</strong> 9:00 AM - 6:00 PM
          </p>
          
          <div class="important-note">
            <p><strong>${isEnglish ? "Important:" : "Important :"}</strong> ${
    isEnglish
      ? "Please keep your confirmation code. You will need to present it at the registration desk to receive your badge."
      : "Veuillez conserver votre code de confirmation. Vous devrez le présenter au bureau d'inscription pour recevoir votre badge."
  }</p>
          </div>
          
          <p>${
            isEnglish
              ? "If you have any questions, please contact us at contact@sifia.net or +225 27 22 49 77 00."
              : "Si vous avez des questions, veuillez nous contacter à contact@sifia.net ou au +225 27 22 49 77 00."
          }</p>
          
          <p>${
            isEnglish
              ? "We look forward to seeing you at SIFIA 2025!"
              : "Nous avons hâte de vous voir au SIFIA 2025 !"
          }</p>
          
          <p>${
            isEnglish ? "Best regards," : "Cordialement,"
          }<br>SIFIA 2025 Team</p>
        </div>
        
        <div class="footer">
          <p>© 2025 SIFIA - Summit for Investment and Innovation in Africa</p>
          <p>${
            isEnglish
              ? "This is an automated email, please do not reply."
              : "Ceci est un email automatique, merci de ne pas répondre."
          }</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getOrganizationEmailTemplate = (data, language) => {
  const isEnglish = language === "en";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${
        isEnglish
          ? "New SIFIA 2025 Registration"
          : "Nouvelle inscription SIFIA 2025"
      }</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #1a3e78;
          color: #fff;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .footer {
          background-color: #f0f0f0;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .info-table th, .info-table td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        .info-table th {
          text-align: left;
          font-weight: bold;
          width: 40%;
        }
        .logo {
          max-width: 200px;
          margin: 0 auto;
          display: block;
        }
        .gold-text {
          color: #d4af37;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://example.com/sifia-logo.png" alt="SIFIA 2025" class="logo">
          <h1>SIFIA <span class="gold-text">2025</span></h1>
          <p>${isEnglish ? "New Registration" : "Nouvelle inscription"}</p>
        </div>
        
        <div class="content">
          <p>${
            isEnglish ? "Dear SIFIA Organization," : "Cher Organisation SIFIA,"
          }</p>
          
          <p>${
            isEnglish
              ? "A new registration and payment has been completed for SIFIA 2025."
              : "Une nouvelle inscription et un paiement ont été effectués pour SIFIA 2025."
          }</p>
          
          <h3>${
            isEnglish ? "Registration Details" : "Détails de l'inscription"
          }</h3>
          <table class="info-table">
            <tr>
              <th>${
                isEnglish ? "Confirmation Code" : "Code de confirmation"
              }</th>
              <td>${data.confirmationCode}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Name" : "Nom"}</th>
              <td>${data.firstName} ${data.lastName}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Email" : "Email"}</th>
              <td>${data.email}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Phone" : "Téléphone"}</th>
              <td>${data.phone}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Company" : "Entreprise"}</th>
              <td>${data.company || "N/A"}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Country" : "Pays"}</th>
              <td>${data.country}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Participant Type" : "Type de participant"}</th>
              <td>${data.participantType}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Package" : "Forfait"}</th>
              <td>${data.packageName}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Amount Paid" : "Montant payé"}</th>
              <td>${new Intl.NumberFormat(isEnglish ? "en-US" : "fr-FR").format(
                data.amount
              )} ${data.currency}</td>
            </tr>
            <tr>
              <th>${isEnglish ? "Payment Date" : "Date de paiement"}</th>
              <td>${new Date(data.paymentDate).toLocaleString(
                isEnglish ? "en-US" : "fr-FR"
              )}</td>
            </tr>
          </table>
          
          ${
            data.additionalInfo
              ? `
            <h3>${
              isEnglish
                ? "Additional Information"
                : "Informations supplémentaires"
            }</h3>
            <p>${data.additionalInfo}</p>
          `
              : ""
          }
          
          <p>${
            isEnglish ? "Best regards," : "Cordialement,"
          }<br>SIFIA 2025 System</p>
        </div>
        
        <div class="footer">
          <p>© 2025 SIFIA - Summit for Investment and Innovation in Africa</p>
          <p>${
            isEnglish
              ? "This is an automated email, please do not reply."
              : "Ceci est un email automatique, merci de ne pas répondre."
          }</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send confirmation email to participant
export const sendConfirmationEmail = async (registration) => {
  try {
    const emailTemplate = getConfirmationEmailTemplate(
      registration,
      registration.language
    );

    await emailTransporter.sendMail({
      from: `"SIFIA 2025" <${process.env.EMAIL_FROM}>`,
      to: registration.email,
      subject:
        registration.language === "en"
          ? "SIFIA 2025 Registration Confirmation"
          : "Confirmation d'inscription SIFIA 2025",
      html: emailTemplate,
    });

    console.log(`Confirmation email sent to ${registration.email}`);
    return true;
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    throw error;
  }
};

// Send notification email to organization
export const sendOrganizationEmail = async (registration) => {
  try {
    const emailTemplate = getOrganizationEmailTemplate(
      registration,
      registration.language
    );

    await emailTransporter.sendMail({
      from: `"SIFIA 2025 System" <${process.env.EMAIL_FROM}>`,
      to: process.env.ORGANIZATION_EMAIL,
      subject:
        registration.language === "en"
          ? `New SIFIA 2025 Registration: ${registration.confirmationCode}`
          : `Nouvelle inscription SIFIA 2025: ${registration.confirmationCode}`,
      html: emailTemplate,
    });

    console.log(
      `Organization notification email sent for ${registration.confirmationCode}`
    );
    return true;
  } catch (error) {
    console.error("Error sending organization notification email:", error);
    throw error;
  }
};
