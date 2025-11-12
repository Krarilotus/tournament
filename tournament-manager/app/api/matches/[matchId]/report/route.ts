import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';
import Match from '@/lib/models/Match';
import Tournament from '@/lib/models/Tournament';
import Round from '@/lib/models/Round';

// Zod schema for validating the request body
// We expect the client to have already calculated pointsAwarded
const participantResultSchema = z.object({
  participantId: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid Participant ID',
    }),
  result: z.string(), // e.g., "win", "loss", "1st" or "" for "no result"
  pointsAwarded: z.number().default(0),
  customStats: z.record(z.string(), z.number()).default({}), // e.g., { "Kills": 10 }
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
    // 1. Get Session and Params
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params; // Next 16/React 19 style
    const { matchId } = params;

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return NextResponse.json({ message: 'Invalid Match ID' }, { status: 400 });
    }

    // 2. Validate Body
    const body = await req.json();
    const validation = reportBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid request body', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { participants: resultsBody } = validation.data;

    // 3. Fetch Match and Verify Ownership
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

    if (tournament.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 4. Decide status based on whether *any* participant has a non-empty result
    const anyResult = resultsBody.some(
      (r) => r.result && r.result.trim().length > 0
    );
    match.status = anyResult ? 'completed' : 'pending';

    // 5. Update Match Participants
    for (const result of resultsBody) {
      const matchParticipant: any = match.participants.find(
        (p: any) => p.participantId.toString() === result.participantId
      );

      if (!matchParticipant) continue;

      const trimmedResult = result.result.trim();
      const hasStats = Object.keys(result.customStats || {}).length > 0;
      const points = result.pointsAwarded || 0;

      if (!trimmedResult && !hasStats && points === 0) {
        // Treat as "clear result"
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

    // --- 6. NEW LOGIC: Check if Round is Complete ---
    if (match.status === 'completed') {
      const pendingMatchesInRound = await Match.countDocuments({
        roundId: match.roundId,
        status: 'pending',
      });

      if (pendingMatchesInRound === 0) {
        // All matches are done, update the round status
        await Round.findByIdAndUpdate(match.roundId, {
          status: 'completed',
        });
      }
    }
    // --- END NEW LOGIC ---

    // 7. Recalculation
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const recalculateUrl = `${baseUrl}/api/tournaments/${tournament.id}/recalculate`;
    const headers = {
      Cookie: req.headers.get('cookie') || '',
    };
    
    // --- MODIFICATION: We MUST await this ---
    // This ensures the recalculation is finished before
    // we return to the client, fixing the race condition.
    await fetch(recalculateUrl, { method: 'POST', headers });
    // --- END MODIFICATION ---

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