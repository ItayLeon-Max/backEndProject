import nodemailer from "nodemailer";
import config from "config";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

const transporter = nodemailer.createTransport({
  host: config.get<string>("mail.host"),
  port: config.get<number>("mail.port"),
  secure: config.get<boolean>("mail.secure"), // true ל-465, false ל-587
  auth: {
    user: config.get<string>("mail.user"),
    pass: config.get<string>("mail.pass"),
  },
});

export async function sendMail(input: SendMailInput) {
  const from = config.get<string>("mail.from");

  try {
    const info = await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    console.log("✅ Mail sent:", info.messageId, "->", input.to);
    return info;
  } catch (err) {
    console.error("❌ SEND MAIL FAILED:", err);
    throw err;
  }
}