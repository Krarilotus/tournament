import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
// import { auth } from '@/lib/auth'; // <-- REMOVED
import Tournament from '@/lib/models/Tournament';
import Team from '@/lib/models/Team';
import '@/lib/models/Participant';
import { validatePublicAccess } from '@/lib/api/requestUtils'; // <-- THE FIX

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const validation = await validatePublicAccess(req, context); // <-- THE FIX
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;

    // Fetch all teams and populate their player names
    const teams = await Team.find({ tournamentId: tournament._id })
      .populate({
        path: 'playerIds',
        model: 'Participant',
        select: 'name customId', // Only select what's needed
      })
      .sort({ createdAt: 1 }); // Sort by creation date (Team A, B, C...)

    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}