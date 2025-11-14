import { Resend } from "resend";

// Initialisiere Resend mit deinem API-Key
const resend = new Resend(process.env.RESEND_API_KEY);

// Sende von einer E-Mail-Adresse auf deiner verifizierten Domain.
// "noreply" ist der professionelle Standard.
const FROM_EMAIL = `Tournament Manager <noreply@unofficialcrusaderpatch.com>`;

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: MailOptions) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set. Email sending is disabled.");
    // In Produktion MUSS das einen Fehler werfen.
    throw new Error("Email sending failed: Missing API Key.");
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to], // Sende an den echten Benutzer
      subject: subject, // Verwende den echten Betreff
      html,
    });

    if (error) {
      console.error("Could not send email:", error);
      throw new Error("Email sending failed via Resend.");
    }

    console.log("Email sent successfully, ID:", data?.id);

  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Email sending failed.");
  }
};