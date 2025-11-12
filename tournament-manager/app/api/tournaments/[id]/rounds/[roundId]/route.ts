import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Tournament from "@/lib/models/Tournament";
import Round from "@/lib/models/Round";
import Match from "@/lib/models/Match";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; roundId: string }> }
) {
  await dbConnect();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, roundId } = await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(roundId)
    ) {
      return NextResponse.json(
        { message: "Invalid id or roundId" },
        { status: 400 }
      );
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }
    if (tournament.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const round = await Round.findOne({
      _id: roundId,
      tournamentId: tournament._id,
    });
    if (!round) {
      return NextResponse.json(
        { message: "Round not found" },
        { status: 404 }
      );
    }

    // Delete matches belonging to this round
    await Match.deleteMany({
      tournamentId: tournament._id,
      roundId: round._id,
    });

    // Remove round reference from tournament
    await Tournament.findByIdAndUpdate(tournament._id, {
      $pull: { rounds: round._id },
    });

    // Delete the round itself
    await Round.deleteOne({ _id: round._id });

    // --- MODIFICATION: Trigger Recalculation ---
    // This is the missing step. We must update scores now.
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const recalculateUrl = `${baseUrl}/api/tournaments/${tournament._id}/recalculate`;
    const headers = {
      Cookie: req.headers.get("cookie") || "",
    };
    // We *must* await this to ensure scores are updated
    // before the client re-fetches the standings.
    const recalcRes = await fetch(recalculateUrl, { method: "POST", headers });
    
    if (!recalcRes.ok) {
      // Log the error, but don't block the user. The round is
      // still deleted, even if the recalc fails.
      console.error("Failed to trigger recalculation after round delete.");
    }
    // --- END MODIFICATION ---

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting round:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}