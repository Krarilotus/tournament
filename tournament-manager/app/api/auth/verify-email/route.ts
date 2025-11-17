export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import EmailToken from "@/lib/models/EmailToken";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  try {
    await dbConnect();
    const vt = await EmailToken.findOne({ token });
    if (!vt)
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    if (new Date() > new Date(vt.expires))
      return NextResponse.json({ error: "Token expired" }, { status: 400 });

    const user = await User.findOne({ email: vt.identifier });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    user.emailVerified = new Date();
    await user.save();
    await EmailToken.deleteOne({ _id: vt._id });

    const loginUrl = new URL("/login?verified=true", process.env.AUTH_URL);
    return NextResponse.redirect(loginUrl);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}