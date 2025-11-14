import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import Round from '@/lib/models/Round';
import '@/lib/models/Match'; // Ensure Match model is registered
import '@/lib/models/Participant'; // Ensure Participant model is registered
import { validateTournamentRequest } from '@/lib/api/requestUtils'; 

export async function GET(
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

    // 3. Fetch Rounds and Populate Matches
    const rounds = await Round.find({ tournamentId: tournament._id })
      .populate({
        path: 'matches',
        populate: {
          path: 'participants.participantId',
          model: 'Participant',
          select: 'name customId', // Only select the fields we need
        },
      })
      .sort({ roundNumber: -1 }); // Send newest first

    return NextResponse.json(rounds, { status: 200 });
  } catch (error) {
    console.error('Error fetching rounds:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}