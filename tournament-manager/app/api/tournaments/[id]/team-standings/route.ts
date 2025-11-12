import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Tournament from "@/lib/models/Tournament";
import Match from "@/lib/models/Match";
import Participant, {
  SerializedParticipant,
} from "@/lib/models/Participant";
import { reconstructTeamsFromMatches } from "@/lib/matchmaking/core/teamBuilding";
import type { TeamEntity } from "@/lib/matchmaking/types";
import { SerializedMatch } from "@/lib/types";

// The type this specific API route returns to the client
type ClientTeamStanding = {
  key: string;
  playerIds: string[];
  players: {
    _id: string;
    name: string;
    customId?: string;
    points: number;
  }[];
  totalPoints: number;
  averagePoints: number;
};

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

    const params = await context.params;
    const { id: tournamentId } = params;

    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return NextResponse.json(
        { message: "Invalid Tournament ID" },
        { status: 400 }
      );
    }

    const searchParams = new URL(req.url).searchParams;
    const seedRoundId = searchParams.get("seedRoundId");

    if (!seedRoundId || !mongoose.Types.ObjectId.isValid(seedRoundId)) {
      return NextResponse.json(
        { message: "seedRoundId query param is required" },
        { status: 400 }
      );
    }

    // 1. Verify Ownership
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

    // 2. Fetch ALL data needed for the helper
    const allParticipants = await Participant.find({
      tournamentId: tournament._id,
    });

    const matchesInSeedRound = await Match.find({
      tournamentId: tournament._id,
      roundId: seedRoundId,
      "participants.team": { $exists: true, $ne: null },
    });

    if (matchesInSeedRound.length === 0) {
      return NextResponse.json<ClientTeamStanding[]>([], { status: 200 });
    }

    // 3. Prepare data for the helper
    const playersById = new Map<string, SerializedParticipant>();
    const serializedParticipants: SerializedParticipant[] = allParticipants.map(
      (p) => {
        const serialized = {
          _id: p._id.toString(),
          tournamentId: p.tournamentId.toString(),
          name: p.name,
          customId: p.customId,
          isActive: p.isActive,
          scores: p.scores as any,
          matchHistory: (p.matchHistory || []).map((m) => m.toString()),
        };
        playersById.set(serialized._id, serialized);
        return serialized;
      }
    );

    const serializedMatches: SerializedMatch[] = matchesInSeedRound.map(
      (m: any) => ({
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
      })
    );

    // 4. Call the centralized helper
    // We can just use a high teamSize (like 50) as it only
    // affects trimming.
    const { teams: teamEntities } = reconstructTeamsFromMatches(
      serializedMatches,
      playersById,
      50 // Max team size from validator
    );

    // 5. Format for the client
    const standings: ClientTeamStanding[] = teamEntities.map((team) => {
      const playersInTeam: ClientTeamStanding["players"] = [];
      let totalPoints = 0;

      for (const id of team.playerIds) {
        const p = playersById.get(id);
        if (!p) continue;
        const pts = p.scores?.points ?? 0;
        totalPoints += pts;
        playersInTeam.push({
          _id: p._id,
          name: p.name,
          customId: p.customId,
          points: pts,
        });
      }

      const averagePoints =
        playersInTeam.length > 0 ? totalPoints / playersInTeam.length : 0;

      return {
        key: team.id,
        playerIds: team.playerIds,
        players: playersInTeam,
        totalPoints,
        averagePoints,
      };
    });

    // 6. Sort and return
    standings.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints)
        return b.totalPoints - a.totalPoints;
      return b.averagePoints - a.averagePoints;
    });

    return NextResponse.json<ClientTeamStanding[]>(standings, { status: 200 });
  } catch (err) {
    console.error("Error getting team standings:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}