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
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    await dbConnect();
    const user = await User.findOne({ email });

    // Always respond success (don’t leak whether user exists)
    if (!user) {
      return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await EmailToken.create({ identifier: email, token, expires });

    const resetUrl = `${process.env.AUTH_URL}/reset-password?token=${token}`;
    console.log("🔗 Password reset link:", resetUrl);

    await sendEmail({
      to: email,
      subject: "Reset your Tournament Manager password",
      html: `<p>You requested a password reset.</p>
             <p>Click here: <a href="${resetUrl}">${resetUrl}</a></p>
             <p>This link expires in 1 hour.</p>`,
    });

    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
