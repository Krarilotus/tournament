import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import Round from '@/lib/models/Round';
import Match from '@/lib/models/Match';
import Team from '@/lib/models/Team';
import { z } from 'zod';
import { makeTeamLookupKey } from '@/lib/utils';
import { validateTournamentRequest } from '@/lib/api/requestUtils';

// --- ADDED: Team Garbage Collector Helper Function ---
async function runTeamGarbageCollector(
  tournamentId: string | mongoose.Types.ObjectId
) {
  try {
    console.log('Running team garbage collection...');
    // 1. Find all *all* matches
    const allMatches = await Match.find({
      tournamentId: tournamentId,
      'participants.team': { $exists: true },
    });

    // 2. Build a set of all lookupKeys *still in use*
    const inUseLookupKeys = new Set<string>();
    for (const match of allMatches) {
      const teamsInMatch: Record<string, string[]> = {}; // "A" -> [p1, p2]
      for (const p of match.participants) {
        if (p.team && p.participantId) {
          if (!teamsInMatch[p.team]) teamsInMatch[p.team] = [];
          teamsInMatch[p.team].push(p.participantId.toString());
        }
      }
      for (const playerIds of Object.values(teamsInMatch)) {
        inUseLookupKeys.add(makeTeamLookupKey(playerIds));
      }
    }

    // 3. Delete all teams for this tournament that are NOT in the "in-use" set
    const deleteResult = await Team.deleteMany({
      tournamentId: tournamentId,
      lookupKey: { $nin: Array.from(inUseLookupKeys) },
    });

    if (deleteResult.deletedCount > 0) {
      console.log(
        `Garbage collected ${deleteResult.deletedCount} orphaned teams.`
      );
    }
  } catch (error) {
    // Log the error, but don't fail the main API request
    console.error('Error during team garbage collection:', error);
  }
}

// --- Zod schema ---
const swapSchema = z.object({
  matchAId: z.string(),
  playerAId: z.string(),
  matchBId: z.string().optional(),
  playerBId: z.string(),
});

// --- POST handler ---
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; roundId: string }> }
) {
  await dbConnect();

  try {
    const validation = await validateTournamentRequest(req, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;

    const { roundId } = await context.params;
    const ownerId = tournament.ownerId;

    // --- 2. Validate Body ---
    const body = await req.json();
    const bodyValidation = swapSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { message: 'Invalid request body', errors: bodyValidation.error.issues },
        { status: 400 }
      );
    }
    const { matchAId, playerAId, matchBId, playerBId } = bodyValidation.data;

    // --- 3. Find Matches and Participants ---
    const matchA = await Match.findById(matchAId);
    if (!matchA) throw new Error('Match A not found.');
    if (matchA.roundId.toString() !== roundId) {
      throw new Error('Match A does not belong to this round.');
    }
    const participantA = matchA.participants.find(
      (p: any) => p.participantId.toString() === playerAId
    );
    if (!participantA) {
      throw new Error('Player A not found in Match A.');
    }

    // --- 4. Handle Team Persistence & Swap ---

    // Case 1 & 2: Swapping with a player in another match (pending or bye)
    if (matchBId) {
      const matchB = await Match.findById(matchBId);
      if (!matchB) throw new Error('Match B not found.');
      if (matchB.roundId.toString() !== roundId) {
        throw new Error('Match B does not belong to this round.');
      }

      const isByeB =
        matchB.status === 'completed' && matchB.participants.length === 1;
      if (
        matchA.status !== 'pending' ||
        !(matchB.status === 'pending' || isByeB)
      ) {
        throw new Error(
          'Swaps can only happen from a pending match to another pending match or a bye match.'
        );
      }

      const participantB = matchB.participants.find(
        (p: any) => p.participantId.toString() === playerBId
      );
      if (!participantB) {
        throw new Error('Player B not found in Match B.');
      }

      // --- 4a. Create new persistent Team for Match A's new lineup ---
      const isTeamA = !!participantA.team;
      if (isTeamA) {
        const teamALabel = participantA.team;
        const teammateIdsA = matchA.participants
          .filter(
            (p: any) =>
              p.team === teamALabel && p.participantId.toString() !== playerAId
          )
          .map((p: any) => p.participantId.toString());

        const newPlayerIdsA = [playerBId, ...teammateIdsA];
        const newLookupKeyA = makeTeamLookupKey(newPlayerIdsA);

        await Team.findOneAndUpdate(
          { tournamentId: tournament._id, lookupKey: newLookupKeyA },
          {
            $setOnInsert: {
              tournamentId: tournament._id,
              ownerId,
              playerIds: newPlayerIdsA.map(
                (id) => new mongoose.Types.ObjectId(id)
              ),
              lookupKey: newLookupKeyA,
            },
          },
          { upsert: true, new: true }
        );
      }

      // --- 4b. Create new persistent Team for Match B's new lineup ---
      const isTeamB = !!participantB.team;
      if (isTeamB) {
        const teamBLabel = participantB.team;
        const teammateIdsB = matchB.participants
          .filter(
            (p: any) =>
              p.team === teamBLabel && p.participantId.toString() !== playerBId
          )
          .map((p: any) => p.participantId.toString());

        const newPlayerIdsB = [playerAId, ...teammateIdsB];
        const newLookupKeyB = makeTeamLookupKey(newPlayerIdsB);

        await Team.findOneAndUpdate(
          { tournamentId: tournament._id, lookupKey: newLookupKeyB },
          {
            $setOnInsert: {
              tournamentId: tournament._id,
              ownerId, // <-- This still works
              playerIds: newPlayerIdsB.map(
                (id) => new mongoose.Types.ObjectId(id)
              ),
              lookupKey: newLookupKeyB,
            },
          },
          { upsert: true, new: true }
        );
      }

      // --- 4c. Perform the swap in Match documents ---
      participantA.participantId = new mongoose.Types.ObjectId(playerBId);
      participantB.participantId = new mongoose.Types.ObjectId(playerAId);

      await matchA.save();
      await matchB.save();
    }
    // Case 3: Swapping with a player from the "Bench" (no matchBId)
    else {
      if (matchA.status !== 'pending') {
        throw new Error('Can only swap a benched player into a pending match.');
      }

      // --- 4a. Create new persistent Team for Match A's new lineup ---
      const isTeamA = !!participantA.team;
      if (isTeamA) {
        const teamALabel = participantA.team;
        const teammateIdsA = matchA.participants
          .filter(
            (p: any) =>
              p.team === teamALabel && p.participantId.toString() !== playerAId
          )
          .map((p: any) => p.participantId.toString());

        const newPlayerIdsA = [playerBId, ...teammateIdsA];
        const newLookupKeyA = makeTeamLookupKey(newPlayerIdsA);

        await Team.findOneAndUpdate(
          { tournamentId: tournament._id, lookupKey: newLookupKeyA },
          {
            $setOnInsert: {
              tournamentId: tournament._id,
              ownerId,
              playerIds: newPlayerIdsA.map(
                (id) => new mongoose.Types.ObjectId(id)
              ),
              lookupKey: newLookupKeyA,
            },
          },
          { upsert: true, new: true }
        );
      }

      // --- 4b. Perform the swap in Match document ---
      participantA.participantId = new mongoose.Types.ObjectId(playerBId);
      await matchA.save();
    }

    // --- 5. Run garbage collector AFTER swap ---
    await runTeamGarbageCollector(tournament._id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error swapping participants:', error);
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// --- DELETE Handler with Team Cleanup ---
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; roundId: string }> }
) {
  await dbConnect();

  try {
    const validation = await validateTournamentRequest(req, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;

    const { roundId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(roundId)) {
      return NextResponse.json(
        { message: 'Invalid roundId' },
        { status: 400 }
      );
    }

    const round = await Round.findOne({
      _id: roundId,
      tournamentId: tournament._id,
    });
    if (!round) {
      return NextResponse.json(
        { message: 'Round not found' },
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

    // --- Run garbage collector AFTER delete ---
    await runTeamGarbageCollector(tournament._id);

    // --- Recalculation (as before) ---
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const recalculateUrl = `${baseUrl}/api/tournaments/${tournament._id}/recalculate`;
    const headers = {
      Cookie: req.headers.get('cookie') || '',
    };
    const recalcRes = await fetch(recalculateUrl, { method: 'POST', headers });

    if (!recalcRes.ok) {
      console.error('Failed to trigger recalculation after round delete.');
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting round:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}