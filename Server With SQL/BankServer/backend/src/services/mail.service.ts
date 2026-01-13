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
  secure: config.get<boolean>("mail.secure"), // true for 465, false for 587
  auth: {
    user: config.get<string>("mail.user"),
    pass: config.get<string>("mail.pass"),
  },
});

export async function sendMail({ to, subject, html }: SendMailInput) {
  const from = config.get<string>("mail.from");
  await transporter.sendMail({ from, to, subject, html });
}