export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import EmailToken from "@/lib/models/EmailToken";
import { sendEmail } from "@/lib/mailer";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email });

    // Case 1: User doesn't exist.
    // Send a generic message to prevent email enumeration (leaking info).
    if (!user) {
      return NextResponse.json({
        message:
          "If an account with this email exists, a new verification link has been sent.",
      });
    }

    // Case 2: User exists and is already verified.
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "This email is already verified. Please try logging in." },
        { status: 400 }
      );
    }

    // Case 3: User exists but is not verified.
    // We'll delete any old tokens to avoid clutter and ensure the new one is used.
    await EmailToken.deleteMany({ identifier: email });

    // Create a new verification token (24h)
    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await EmailToken.create({ identifier: email, token, expires });

    // Build and send the verification link
    const verificationUrl = `${process.env.AUTH_URL}/api/auth/verify-email?token=${token}`;
    console.log("🔗 Resending verification link:", verificationUrl);

    await sendEmail({
      to: email,
      subject: "Verify your email for Tournament Manager (New Link)",
      html: `<p>Hello ${user.name || ""},</p>
             <p>Here is your new link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>
             <p>This link expires in 24 hours.</p>`,
    });

    return NextResponse.json({
      message: "A new verification link has been sent to your email.",
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}