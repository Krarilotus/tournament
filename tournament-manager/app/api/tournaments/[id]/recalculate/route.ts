// app/api/tournaments/[id]/recalculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import Participant from '@/lib/models/Participant';
import Match, { IMatch } from '@/lib/models/Match';
import Round from '@/lib/models/Round';
import { revalidatePath } from 'next/cache';
import { validateTournamentRequest } from '@/lib/api/requestUtils';

// --- Type Definitions for In-Memory Processing ---
type ParticipantUpdate = {
  scores: {
    points: number;
    wins: number;
    losses: number;
    draws: number;
    buchholz: number;
    buchholz2: number;
    [key: string]: any;
  };
  matchHistory: mongoose.Types.ObjectId[];
  opponentIds: Set<string>;
};
type ParticipantUpdateMap = Map<string, ParticipantUpdate>;
type MatchMap = Map<string, IMatch>;

// --- Main API Handler ---
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const validation = await validateTournamentRequest(req, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;
    const tournamentId = tournament._id.toString();

    const allParticipants = await Participant.find({
      tournamentId: tournament._id,
    });

    const allCompletedMatches: IMatch[] = await Match.find({
      tournamentId: tournament._id,
      status: 'completed',
    });

    // All rounds (for per-round scoring / FFA tables)
    const allRounds = await Round.find({ tournamentId: tournament._id });
    const roundsMap = new Map<string, any>();
    for (const r of allRounds) {
      roundsMap.set(r._id.toString(), r);
    }

    // Create a Map for quick lookup of matches by ID
    const matchesMap: MatchMap = new Map(
      allCompletedMatches.map((match) => [match._id.toString(), match])
    );

    // --- Step 2: Pass 1 - Reset Scores ---
    const participantUpdates: ParticipantUpdateMap = new Map();
    const customStatKeys = tournament.settings.customStats || [];

    for (const p of allParticipants) {
      const baseScores: ParticipantUpdate['scores'] = {
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        buchholz: 0,
        buchholz2: 0,
      };
      // Add all custom stats, initialized to 0
      for (const key of customStatKeys) {
        baseScores[key] = 0;
      }
      participantUpdates.set(p._id.toString(), {
        scores: baseScores,
        matchHistory: [],
        opponentIds: new Set<string>(), // Initialize opponent set
      });
    }

    // --- Step 3: Pass 2 - Tally Matches ---
    for (const match of allCompletedMatches) {
      const round = roundsMap.get(match.roundId.toString()) || null;
      const isByeMatch = match.participants.length === 1;

      // --- Collect all participant IDs in this match ---
      const pIdsInMatch: string[] = [];
      for (const p of match.participants as any[]) {
        pIdsInMatch.push(p.participantId.toString());
      }

      for (const matchParticipant of match.participants as any[]) {
        const participantId = matchParticipant.participantId.toString();
        const update = participantUpdates.get(participantId);

        if (!update) continue;

        // Points:
        let pointsToAdd = 0;

        if (isByeMatch) {
          // For byes we trust the value that was set when the match was created
          pointsToAdd = matchParticipant.pointsAwarded || 0;
        } else {
          pointsToAdd = computePointsForResult(
            tournament,
            round,
            match,
            matchParticipant
          );
        }

        update.scores.points += pointsToAdd;

        // W/L/D tallies are still driven by `result`
        tallyResult(update.scores, matchParticipant.result);

        if (matchParticipant.customStats) {
          const raw = matchParticipant.customStats as any;

          let entries: [string, number][] = [];
          if (raw instanceof Map) {
            entries = Array.from(raw.entries());
          } else if (typeof raw === 'object') {
            entries = Object.entries(raw) as [string, number][];
          }

          for (const [key, value] of entries) {
            if (typeof value === 'number' && Number.isFinite(value)) {
              update.scores[key] = (update.scores[key] || 0) + value;
            }
          }
        }

        // Match history for tie-breakers
        update.matchHistory.push(match._id);

        // Add opponents for Buchholz calculation
        if (!isByeMatch) {
          for (const oppId of pIdsInMatch) {
            if (oppId !== participantId) {
              update.opponentIds.add(oppId);
            }
          }
        }
      }
    }

    // --- Step 4: Pass 3 - Calculate Buchholz-1 (Sum of Opponent Scores) ---
    const finalPointsMap = new Map<string, number>();
    participantUpdates.forEach((update, id) => {
      finalPointsMap.set(id, update.scores.points);
    });

    // This map is needed for Pass 4
    const finalBuchholzMap = new Map<string, number>();

    for (const [participantId, update] of participantUpdates.entries()) {
      let buchholzScore = 0;
      for (const opponentId of update.opponentIds) {
        const opponentPoints = finalPointsMap.get(opponentId);
        if (opponentPoints !== undefined) {
          buchholzScore += opponentPoints;
        }
      }

      // Buchholz = sum of opponent scores
      update.scores.buchholz = buchholzScore;
      finalBuchholzMap.set(participantId, buchholzScore);
    }

    // --- 5. Pass 4 - Calculate Buchholz-2 (Sum of Opponents' Buchholz) ---
    for (const [participantId, update] of participantUpdates.entries()) {
      let buchholz2Score = 0;
      for (const opponentId of update.opponentIds) {
        const opponentBuchholz = finalBuchholzMap.get(opponentId);
        if (opponentBuchholz !== undefined) {
          buchholz2Score += opponentBuchholz;
        }
      }
      update.scores.buchholz2 = buchholz2Score;
    }

    // --- Step 6: Pass 5 - Save to Database ---
    const bulkOps: any[] = [];
    for (const [participantId, update] of participantUpdates.entries()) {
      bulkOps.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(participantId) },
          update: {
            $set: {
              scores: update.scores,
              matchHistory: update.matchHistory,
            },
          },
        },
      });
    }

    if (bulkOps.length > 0) {
      await Participant.bulkWrite(bulkOps);
    }

    // --- Step 7: Revalidate Paths ---
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/${tournamentId}`);
    revalidatePath(`/dashboard/${tournamentId}/participants`);
    revalidatePath(`/dashboard/${tournamentId}/rounds`);

    return NextResponse.json(
      { message: 'Recalculation complete' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in recalculation engine:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// --- LOGGING HELPER ---
function logTypeDebug(label: string, obj: any) {
  const type = typeof obj;
  const isMap = obj instanceof Map;
  const constructor = obj?.constructor?.name;
  const isArray = Array.isArray(obj);
  console.log(`[DEBUG] ${label}: Type=${type}, IsMap=${isMap}, Constructor=${constructor}, IsArray=${isArray}`);
  // Only log keys to avoid flooding logs with massive objects
  if (obj && typeof obj === 'object') {
     console.log(`[DEBUG] ${label} Keys:`, Object.keys(obj || {}));
  }
}

// --- Helper: derive points from config ---
function computePointsForResult(
  tournament: any,
  round: any,
  match: IMatch,
  matchParticipant: any
): number {
  // --- DEBUGGING START ---
  // We suspect the crash happens immediately after this
  const roundPoints = round?.pointSystem;
  const tournPoints = tournament.settings.pointSystem;
  
  console.log(`--- Debugging Match ${match._id} ---`);
  logTypeDebug("Round PointSystem", roundPoints);
  logTypeDebug("Tournament PointSystem", tournPoints);

  const basePointMap: Map<string, number> =
    (round?.pointSystem as Map<string, number>) ??
    (tournament.settings.pointSystem as Map<string, number>) ??
    new Map();

  const isTeamMatch = (match.participants as any[]).some((p) => p.team);
  const isFFA = !isTeamMatch && match.participants.length > 2;

  // FFA: use per-place scoring table if present
  if (isFFA) {
    const ffaMap = (round?.ffaPlacements as Map<string, number>) ?? new Map();
    const res = (matchParticipant.result || '').toString().toLowerCase();
    const placeMatch = res.match(/\d+/); // "1st" -> "1"
    if (!placeMatch) return 0;
    const key = placeMatch[0];
    const val = ffaMap.get(key);
    return typeof val === 'number' ? val : 0;
  }

  // 1v1 / team: use result -> win/draw/loss mapping
  const res = (matchParticipant.result || '').toString().toLowerCase();

  if (res === 'win' || res === '1st') {
    return basePointMap.get('win') ?? 0;
  }

  if (res === 'draw') {
    return basePointMap.get('draw') ?? 0;
  }

  if (res === 'loss') {
    return basePointMap.get('loss') ?? 0;
  }

  // Other strings (e.g., "2nd" accidentally in non-FFA) give 0.
  return 0;
}

// --- Helper: W/L/D counters ---
function tallyResult(
  scores: ParticipantUpdate['scores'],
  result: string | undefined
) {
  if (!result) return;

  const res = result.toLowerCase();

  if (res === 'win' || res === '1st') {
    scores.wins += 1;
  } else if (
    res === 'loss' ||
    res.includes('nd') ||
    res.includes('rd') ||
    res.includes('th')
  ) {
    scores.losses += 1;
  } else if (res === 'draw') {
    scores.draws += 1;
  }
}