import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';
import Match from '@/lib/models/Match';
import Tournament from '@/lib/models/Tournament';
import Round from '@/lib/models/Round';
import { checkAdminAccess } from '@/lib/api/requestUtils';
// --- NEW IMPORT ---
import { recalculateStandings } from '@/lib/standings/recalculate';

const participantResultSchema = z.object({
  participantId: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid Participant ID',
    }),
  result: z.string(),
  pointsAwarded: z.number().default(0),
  customStats: z.record(z.string(), z.number()).default({}),
});

const reportBodySchema = z.object({
  participants: z.array(participantResultSchema),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  await dbConnect();

  try {
    const session = await auth();
    const params = await context.params;
    const { matchId } = params;

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return NextResponse.json({ message: 'Invalid Match ID' }, { status: 400 });
    }

    const body = await req.json();
    const validation = reportBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid request body', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { participants: resultsBody } = validation.data;

    const match = await Match.findById(matchId);
    if (!match) {
      return NextResponse.json({ message: 'Match not found' }, { status: 404 });
    }

    const tournament = await Tournament.findById(match.tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { message: 'Tournament not found' },
        { status: 404 }
      );
    }

    const accessError = checkAdminAccess(tournament, session);
    if (accessError) {
      return accessError;
    }

    const anyResult = resultsBody.some(
      (r) => r.result && r.result.trim().length > 0
    );
    match.status = anyResult ? 'completed' : 'pending';

    for (const result of resultsBody) {
      const matchParticipant: any = match.participants.find(
        (p: any) => p.participantId.toString() === result.participantId
      );

      if (!matchParticipant) continue;

      const trimmedResult = result.result.trim();
      const hasStats = Object.keys(result.customStats || {}).length > 0;
      const points = result.pointsAwarded || 0;

      if (!trimmedResult && !hasStats && points === 0) {
        matchParticipant.result = undefined;
        matchParticipant.pointsAwarded = 0;
        matchParticipant.customStats = new Map();
      } else {
        matchParticipant.result = trimmedResult;
        matchParticipant.pointsAwarded = points;
        matchParticipant.customStats = new Map(
          Object.entries(result.customStats || {})
        );
      }
    }

    await match.save();

    if (match.status === 'completed') {
      const pendingMatchesInRound = await Match.countDocuments({
        roundId: match.roundId,
        status: 'pending',
      });

      if (pendingMatchesInRound === 0) {
        await Round.findByIdAndUpdate(match.roundId, {
          status: 'completed',
        });
      }
    }

    // --- 7. RECALCULATION (THE FIX) ---
    // No more network fetch! Direct logic call.
    try {
      await recalculateStandings(tournament.id, tournament.settings);
    } catch (recalcError) {
      console.error('Recalculation failed, but match saved:', recalcError);
      // We don't fail the request here, but we log it.
    }

    return NextResponse.json(
      { message: 'Match reported successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error reporting match:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request body', errors: error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}