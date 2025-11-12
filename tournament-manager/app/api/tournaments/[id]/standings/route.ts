// app/api/tournaments/[id]/standings/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Tournament from "@/lib/models/Tournament";
import { getStandings } from "@/lib/standings/getStandings";

const BUILTIN_TIEBREAKERS = new Set<string>([
  "points",
  "wins",
  "losses",
  "draws",
  "buchholz",
  "buchholz2",
  "directComparison",
]);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    // 1. Auth & params
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id: tournamentId } = params;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return NextResponse.json(
        { message: "Invalid Tournament ID" },
        { status: 400 }
      );
    }

    // 2. Tournament + ownership
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }
    if (tournament.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const tieBreakers: string[] = tournament.settings.tieBreakers || ["points"];
    const customStats: string[] = tournament.settings.customStats || [];
    
    console.log(
      "[Standings API] tieBreakers:",
      tieBreakers,
      "| customStats:",
      customStats
    );
    
    // 3. Validate tie-breakers against built-ins + customStats
    for (const tb of tieBreakers) {
      if (BUILTIN_TIEBREAKERS.has(tb)) continue;
      if (!customStats.includes(tb)) {
        console.error(
          `Invalid tie-breaker "${tb}" for tournament ${tournamentId}. ` +
            `Not built-in and not in settings.customStats.`
        );
        return NextResponse.json(
          {
            message: `Invalid tie-breaker "${tb}". It is not a built-in stat and not defined as a custom stat for this tournament.`,
          },
          { status: 500 }
        );
      }
    }

    // 4. Get standings via shared helper
    const sortedSerializedParticipants = await getStandings(
      tournament._id.toString(),
      tieBreakers,
      activeOnly
    );

    return NextResponse.json(sortedSerializedParticipants, { status: 200 });
  } catch (error) {
    console.error("Error fetching standings:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
