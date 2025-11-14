import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import Participant, {
  SerializedParticipant,
} from '@/lib/models/Participant';
import Round, { IRound } from '@/lib/models/Round';
import Match from '@/lib/models/Match';
import { revalidatePath } from 'next/cache';
import { generateRoundBodySchema } from '@/lib/validators';
import { buildNextRound } from '@/lib/matchmaking/buildRound';
import { SerializedMatch } from '@/lib/types';
import { getStandings } from '@/lib/standings/getStandings';
import { validateTournamentRequest } from '@/lib/api/requestUtils';

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
  // We can connect once at the top
  await dbConnect();

  try {
    const validation = await validateTournamentRequest(req, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament, session, userId } = validation;
    const tournamentId = tournament._id.toString();

    // 2. Validate Body (comes *after* auth)
    const body = await req.json();
    const bodyValidation = generateRoundBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          message: 'Invalid request body',
          errors: bodyValidation.error.format(),
        },
        { status: 400 }
      );
    }

    const config = bodyValidation.data;

    const currentRoundNumber = tournament.rounds.length + 1;

    // 4. Active participants (standings input)
    const standings = await getStandings(
      tournament._id.toString(),
      tournament.settings.tieBreakers || [],
      true // Active only
    );

    if (config.system !== 'custom' && standings.length < 1) {
      return NextResponse.json(
        { message: 'Not enough active participants.' },
        { status: 400 }
      );
    }

    // 5. All matches for context (rematches, byes, etc.)
    const allMatchesDocs = await Match.find({
      tournamentId: tournament._id,
      status: { $in: ['pending', 'completed'] },
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

    // 6. Rounds summary (for teamPersistence and advanced rematch logic)
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

    // 7. Normalise point system
    const pointSystem =
      tournament.settings?.pointSystem instanceof Map
        ? (tournament.settings.pointSystem as Map<string, number>)
        : new Map(
            Object.entries(
              (tournament.settings?.pointSystem as Record<string, number>) ||
                {}
            )
          );

    // 8. Let the logic engine build the next round
    const { matchSeeds } = await buildNextRound({
      config,
      standings,
      allMatches,
      rounds,
      pointSystem,
      tournamentId: tournament._id.toString(),
      ownerId: userId,
    });

    if (matchSeeds.length === 0) {
      return NextResponse.json(
        { message: 'No matches generated. Not enough active players.' },
        { status: 400 }
      );
    }

    // 9. Create Round with per-round settings (FFA scoring stored here)
    let ffaPlacements: Map<string, number> | undefined = undefined;
    if (config.system === 'n-ffa') {
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
      status: 'pending',
      systemOptions: config.system === 'custom' ? undefined : config.options,
      pointSystem,
      ffaPlacements,
    });

    // 10. Create Match docs from seeds
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

    // 11. Revalidate & return
    revalidatePath(`/dashboard/${tournamentId}/rounds`);

    return NextResponse.json(newRound, { status: 201 });
  } catch (error) {
    console.error('Error generating round:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}