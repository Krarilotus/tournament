export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import EmailToken from "@/lib/models/EmailToken";
import { sendEmail } from "@/lib/mailer";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await dbConnect();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const user = new User({ name, email, password }); // pre-save hook hashes the password
    await user.save();

    // Create verification token (24h)
    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await EmailToken.create({ identifier: email, token, expires });

    // Build and send the verification link
    const verificationUrl = `${process.env.AUTH_URL}/api/auth/verify-email?token=${token}`;
    console.log("🔗 Verification link:", verificationUrl);

    await sendEmail({
      to: email,
      subject: "Verify your email for Tournament Manager",
      html: `<p>Welcome, ${name}!</p>
             <p>Click to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>
             <p>This link expires in 24 hours.</p>`,
    });

    return NextResponse.json(
      { message: "User registered. Please check your email to verify." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
