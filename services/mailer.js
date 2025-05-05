import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async ({ from, subject, html }) => {
  const mailOptions = {
    from,
    to: process.env.EMAIL_TO,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};
