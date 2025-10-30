export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import EmailToken from "@/lib/models/EmailToken";

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    await dbConnect();
    const vt = await EmailToken.findOne({ token });
    if (!vt) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    if (new Date() > new Date(vt.expires)) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    const user = await User.findOne({ email: vt.identifier });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    user.password = newPassword;   // pre-save hook will hash
    await user.save();

    await EmailToken.deleteOne({ _id: vt._id });

    return NextResponse.json({ message: "Password updated. You can log in now." });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
