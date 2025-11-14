import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import Participant from '@/lib/models/Participant';
import { batchAddParticipantsSchema } from '@/lib/validators';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { validateTournamentRequest } from '@/lib/api/requestUtils';

// --- GET all participants for a tournament ---
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const validation = await validateTournamentRequest(request, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;

    const participants = await Participant.find({
      tournamentId: tournament._id,
    });
    return NextResponse.json(participants);
  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: 'Server error' }), {
      status: 500,
    });
  }
}

// --- POST (Create) new participants in BATCH ---
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const validation = await validateTournamentRequest(request, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;
    const tournamentId = tournament._id.toString(); // For revalidatePath

    const body = await request.json();
    const bodyValidation = batchAddParticipantsSchema.safeParse(body);
    if (!bodyValidation.success) {
      return new NextResponse(
        JSON.stringify({ error: bodyValidation.error.format() }),
        { status: 400 }
      );
    }

    const { participants: participantsData } = bodyValidation.data;

    const newParticipantDocs = participantsData.map((p) => ({
      tournamentId: tournament._id, // Use the validated tournament's ID
      name: p.name,
      customId: p.customId || undefined,
      isActive: true,
      scores: {
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        buchholz: 0,
        buchholz2: 0,
      },
    }));

    const newParticipants = await Participant.insertMany(newParticipantDocs);
    const newParticipantIds = newParticipants.map((p) => p._id);

    tournament.participants.push(...newParticipantIds);
    await tournament.save();

    revalidatePath(`/dashboard/${tournamentId}`);
    return NextResponse.json(newParticipants, { status: 201 });
  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: 'Server error' }), {
      status: 500,
    });
  }
}