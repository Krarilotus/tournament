import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Tournament from "@/lib/models/Tournament";
import Team from "@/lib/models/Team";
import "@/lib/models/Participant";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: tournamentId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return NextResponse.json(
        { message: "Invalid Tournament ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const tournament = await Tournament.findById(tournamentId).lean();
    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }
    if (tournament.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Fetch all teams and populate their player names
    const teams = await Team.find({ tournamentId: tournament._id })
      .populate({
        path: "playerIds",
        model: "Participant",
        select: "name customId", // Only select what's needed
      })
      .sort({ createdAt: 1 }); // Sort by creation date (Team A, B, C...)

    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}