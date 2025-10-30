import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface MailOptions { to: string; subject: string; html: string; }

export const sendEmail = async ({ to, subject, html }: MailOptions) => {
  try {
    await transport.sendMail({
      from: `Tournament Manager <noreply@${process.env.SMTP_HOST?.split(".").slice(1).join(".")}>`,
      to, subject, html,
    });
  } catch (error) {
    console.error("Could not send email:", error);
    throw new Error("Email sending failed.");
  }
};
