import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';
import Tournament from '@/lib/models/Tournament';
import Round from '@/lib/models/Round';
import '@/lib/models/Match'; // Ensure Match model is registered
import '@/lib/models/Participant'; // Ensure Participant model is registered

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  
  try {
    // 1. Auth and Params
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id: tournamentId } = params;

    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return NextResponse.json({ message: 'Invalid Tournament ID' }, { status: 400 });
    }

    // 2. Verify Ownership
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }
    if (tournament.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 3. Fetch Rounds and Populate Matches
    // This is the "Zero Tech Debt" way to get all data in one query.
    // We populate 'matches' from the Round
    // Then, we *nested populate* 'participants.participantId' from within 'matches'
    // to get the participant names for the UI.
    const rounds = await Round.find({ tournamentId: tournament._id })
      .populate({
        path: 'matches',
        populate: {
          path: 'participants.participantId',
          model: 'Participant',
          select: 'name customId' // Only select the fields we need
        }
      })
      .sort({ roundNumber: -1 }); // Send newest first

    // Note: We'll rely on our 'lib/types.ts' to handle the serialized type.
    // The data here will be clean JSON.
    return NextResponse.json(rounds, { status: 200 });

  } catch (error) {
    console.error('Error fetching rounds:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}