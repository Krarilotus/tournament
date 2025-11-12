import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Tournament from "@/lib/models/Tournament";
import Participant, {
  SerializedParticipant,
} from "@/lib/models/Participant";
import Round, { IRound } from "@/lib/models/Round";
import Match from "@/lib/models/Match";
import { revalidatePath } from "next/cache";
import { generateRoundBodySchema } from "@/lib/validators";
import { buildNextRound } from "@/lib/matchmaking/buildRound";
import { SerializedMatch } from "@/lib/types";
import { getStandings } from "@/lib/standings/getStandings";

type RoundSummary = {
  _id: string;
  roundNumber: number;
  system: string;
  status: string;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    // 1. Auth, params, body
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id: tournamentId } = params;

    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return NextResponse.json(
        { message: "Invalid Tournament ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = generateRoundBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid request body",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const config = validation.data;

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

    const currentRoundNumber = tournament.rounds.length + 1;

    // 3. Active participants (standings input)
    // For custom, this list might be empty or incomplete, which is fine.
    // For other systems, buildNextRound will handle < 1.
    const standings = await getStandings(
      tournament._id.toString(),
      tournament.settings.tieBreakers || [],
      true // Active only
    );

    if (config.system !== "custom" && standings.length < 1) {
      return NextResponse.json(
        { message: "Not enough active participants." },
        { status: 400 }
      );
    }

    // 4. All matches for context (rematches, byes, etc.)
    const allMatchesDocs = await Match.find({
      tournamentId: tournament._id,
      status: { $in: ["pending", "completed"] },
    });

    const allMatches: SerializedMatch[] = allMatchesDocs.map((m: any) => ({
      _id: m._id.toString(),
      tournamentId: m.tournamentId.toString(),
      roundId: m.roundId.toString(),
      status: m.status,
      participants: (m.participants || []).map((p: any) => ({
        participantId: p.participantId.toString(),
        team: p.team,
        result: p.result,
        pointsAwarded: p.pointsAwarded,
        customStats: p.customStats
          ? Object.fromEntries(p.customStats.entries?.() ?? [])
          : undefined,
      })),
      winner: m.winner ? m.winner.toString() : undefined,
      isDraw: !!m.isDraw,
      teamNames: m.teamNames
        ? Object.fromEntries(m.teamNames.entries?.() ?? [])
        : undefined,
    }));

    // 5. Rounds summary (for teamPersistence and advanced rematch logic)
    const roundDocs: IRound[] = await Round.find({
      tournamentId: tournament._id,
    }).sort({
      roundNumber: 1,
    });

    const rounds: RoundSummary[] = roundDocs.map((r) => ({
      _id: r._id.toString(),
      roundNumber: r.roundNumber,
      system: r.system,
      status: r.status,
    }));

    // 6. Normalise point system
    const pointSystem =
      tournament.settings?.pointSystem instanceof Map
        ? (tournament.settings.pointSystem as Map<string, number>)
        : new Map(
            Object.entries(
              (tournament.settings?.pointSystem as Record<string, number>) ||
                {}
            )
          );

    // 7. Let the logic engine build the next round
    const { matchSeeds } = await buildNextRound({
      config,
      standings,
      allMatches,
      rounds,
      pointSystem,
      tournamentId: tournament._id.toString(),
      ownerId: session.user.id,
    });

    if (matchSeeds.length === 0) {
      return NextResponse.json(
        { message: "No matches generated. Not enough active players." },
        { status: 400 }
      );
    }

    // 8. Create Round with per-round settings (FFA scoring stored here)
    let ffaPlacements: Map<string, number> | undefined = undefined;
    if (config.system === "n-ffa") {
      const placementsMap = new Map<string, number>();
      // This is type-safe because TS knows config is 'n-ffa' here
      const src = config.options.ffaPlacements || {};
      for (const [place, pts] of Object.entries(src)) {
        placementsMap.set(place, pts);
      }
      ffaPlacements = placementsMap;
    }

    const newRound = new Round({
      tournamentId: tournament._id,
      roundNumber: currentRoundNumber,
      system: config.system,
      status: "pending",
      // --- THIS IS THE FIX ---
      // If system is "custom", it has no 'options'. Set to undefined.
      // Otherwise, store the 'options' that were used.
      systemOptions: config.system === "custom" ? undefined : config.options,
      // --- END FIX ---
      pointSystem,
      ffaPlacements,
    });

    // 9. Create Match docs from seeds
    const matchesToCreate = matchSeeds.map((seed) => ({
      tournamentId: tournament._id,
      roundId: newRound._id,
      status: seed.status,
      participants: seed.participants.map((p) => ({
        participantId: new mongoose.Types.ObjectId(p.participantId),
        team: p.team,
        result: p.result,
        pointsAwarded: p.pointsAwarded ?? 0,
        customStats: new Map(Object.entries(p.customStats || {})),
      })),
      teamNames: seed.teamNames
        ? new Map(Object.entries(seed.teamNames))
        : undefined,
    }));

    const newMatches = await Match.insertMany(matchesToCreate);
    newRound.matches = newMatches.map((m) => m._id);
    await newRound.save();

    await Tournament.findByIdAndUpdate(tournament._id, {
      $push: { rounds: newRound._id },
    });

    // 10. Revalidate & return
    revalidatePath(`/dashboard/${tournamentId}/rounds`);

    return NextResponse.json(newRound, { status: 201 });
  } catch (error) {
    console.error("Error generating round:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}