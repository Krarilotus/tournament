import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Tournament, { ITournament } from "@/lib/models/Tournament";
import { Session } from "next-auth";

type ValidatedRequest = {
  ok: true;
  tournament: ITournament;
  session: Session;
  tieBreakers: string[];
  scoreKeys: string[];
};
type ErrorRequest = {
  ok: false;
  response: NextResponse;
};

const BUILTIN_TIEBREAKERS = new Set<string>([
  "points",
  "wins",
  "losses",
  "draws",
  "buchholz",
  "buchholz2",
  "directComparison",
]);

/**
 * Validates a tournament API request, handling auth,
 * tournament fetching, ownership, and tiebreaker validation.
 */
export async function validateTournamentRequest(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<ValidatedRequest | ErrorRequest> {
  await dbConnect();

  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const params = await context.params;
  const { id: tournamentId } = params;

  if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Invalid Tournament ID" },
        { status: 400 }
      ),
    };
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      ),
    };
  }

  if (tournament.ownerId.toString() !== session.user.id) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  const tieBreakers: string[] = tournament.settings.tieBreakers || ["points"];
  const customStats: string[] = tournament.settings.customStats || [];

  // Validate tie-breakers
  for (const tb of tieBreakers) {
    if (BUILTIN_TIEBREAKERS.has(tb)) continue;
    if (!customStats.includes(tb)) {
      const message = `Invalid tie-breaker "${tb}". It is not a built-in stat and not defined as a custom stat for this tournament.`;
      console.error(message, { tournamentId });
      return {
        ok: false,
        response: NextResponse.json({ message }, { status: 500 }),
      };
    }
  }

  const scoreKeys = tieBreakers.filter((tb) => tb !== "directComparison");

  return { ok: true, tournament, session, tieBreakers, scoreKeys };
}