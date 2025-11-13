import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Match from "@/lib/models/Match";
import { SerializedParticipant } from "@/lib/models/Participant";
import Team from "@/lib/models/Team";
import { alphaCode, makeTeamLookupKey } from "@/lib/utils";
import { reconstructTeamsFromMatches } from "@/lib/matchmaking/core/teamBuilding";
import type { TeamEntity } from "@/lib/matchmaking/types";
import { SerializedMatch } from "@/lib/types";
import { getStandings } from "@/lib/standings/getStandings";
import { validateTournamentRequest } from "@/lib/api/requestUtils";

// The type this specific API route returns to the client
type ClientTeamStanding = {
  key: string;
  name: string;
  playerIds: string[];
  players: {
    _id: string;
    name: string;
    customId?: string;
    points: number;
  }[];
  scores: Record<string, number>;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validate request
    const validation = await validateTournamentRequest(req, context);
    if (!validation.ok) return validation.response;
    const { tournament, tieBreakers, scoreKeys } = validation;

    const searchParams = new URL(req.url).searchParams;
    const seedRoundId = searchParams.get("seedRoundId");

    if (!seedRoundId || !mongoose.Types.ObjectId.isValid(seedRoundId)) {
      return NextResponse.json(
        { message: "seedRoundId query param is required" },
        { status: 400 }
      );
    }

    // 2. Fetch ALL data needed
    const matchesInSeedRound = await Match.find({
      tournamentId: tournament._id,
      roundId: seedRoundId,
      "participants.team": { $exists: true, $ne: null },
    });

    if (matchesInSeedRound.length === 0) {
      return NextResponse.json<ClientTeamStanding[]>([], { status: 200 });
    }

    const allPersistentTeams = await Team.find({
      tournamentId: tournament._id,
    }).lean();

    const teamNameMap = new Map<string, string>();
    for (const team of allPersistentTeams) {
      const name = team.customName || team.genericName;
      if (name) {
        teamNameMap.set(team.lookupKey, name);
      }
    }

    const allParticipantsWithScores = await getStandings(
      tournament._id.toString(),
      tieBreakers,
      false // false = get all participants, not just active ones
    );

    // 3. Prepare data for the helper
    const playersById = new Map<string, SerializedParticipant>();
    for (const p of allParticipantsWithScores) {
      playersById.set(p._id, p);
    }

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
    const { teams: teamEntities } = reconstructTeamsFromMatches(
      serializedMatches,
      playersById,
      50 // Max team size from validator
    );

    // 5. Format for the client
    const standings: ClientTeamStanding[] = teamEntities.map((team, idx) => {
      const playersInTeam: ClientTeamStanding["players"] = [];
      const accumulatedScores: Record<string, number> = {};
      for (const key of scoreKeys) {
        accumulatedScores[key] = 0;
      }

      for (const id of team.playerIds) {
        const p = playersById.get(id);
        if (!p) continue;

        const pts = p.scores?.points ?? 0;

        for (const key of scoreKeys) {
          const playerScore = p.scores?.[key] ?? 0;
          accumulatedScores[key] += playerScore;
        }

        playersInTeam.push({
          _id: p._id,
          name: p.name,
          customId: p.customId,
          points: pts,
        });
      }

      const persistentName = teamNameMap.get(team.id);
      const displayName = persistentName || `Team ${alphaCode(idx)}`;

      return {
        key: team.id,
        name: displayName,
        playerIds: team.playerIds,
        players: playersInTeam,
        scores: accumulatedScores,
      };
    });

    // 6. Sort and return
    standings.sort((a, b) => {
      for (const key of scoreKeys) {
        const scoreA = a.scores[key] ?? 0;
        const scoreB = b.scores[key] ?? 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
      }
      return 0;
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