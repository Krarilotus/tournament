import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import Participant from '@/lib/models/Participant'; // No IParticipant import needed here
import { batchAddParticipantsSchema } from '@/lib/validators';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

// --- GET all participants for a tournament ---
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { id: tournamentId } = await context.params; // Next 16 fix (this is a string)

    // --- FIX: Convert string ID to ObjectId ---
    let tournamentObjectId: mongoose.Types.ObjectId; // <-- FIX: Use 'let'
    try {
      tournamentObjectId = new mongoose.Types.ObjectId(tournamentId);
    } catch (error) {
      return new NextResponse(JSON.stringify({ error: 'Invalid Tournament ID format' }), { status: 400 });
    }
    // --- END FIX ---
    
    // Verify owner
    await dbConnect();
    const tournament = await Tournament.findById(tournamentObjectId); 
    if (!tournament || tournament.ownerId.toString() !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const participants = await Participant.find({ tournamentId: tournamentObjectId });
    return NextResponse.json(participants);

  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}

// --- POST (Create) new participants in BATCH ---
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { id: tournamentId } = await context.params; 
    const body = await request.json();

    // --- FIX: Convert string ID to ObjectId ---
    let tournamentObjectId: mongoose.Types.ObjectId; // <-- FIX: Use 'let'
    try {
      tournamentObjectId = new mongoose.Types.ObjectId(tournamentId);
    } catch (error) {
      return new NextResponse(JSON.stringify({ error: 'Invalid Tournament ID format' }), { status: 400 });
    }
    // --- END FIX ---

    const validation = batchAddParticipantsSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify({ error: validation.error.format() }), { status: 400 });
    }

    // Verify owner
    await dbConnect();
    const tournament = await Tournament.findById(tournamentObjectId);
    if (!tournament || tournament.ownerId.toString() !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const { participants: participantsData } = validation.data;

    const newParticipantDocs = participantsData.map(p => ({
      tournamentId: tournamentObjectId, // Use the ObjectId
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
      }
    }));

    // This will now be correctly typed as IParticipant[]
    const newParticipants = await Participant.insertMany(newParticipantDocs);

    // This will now be correctly inferred as ObjectId[]
    const newParticipantIds = newParticipants.map(p => p._id);
    
    // This will now pass validation with no casts needed
    tournament.participants.push(...newParticipantIds);
    await tournament.save();

    revalidatePath(`/dashboard/${tournamentId}`);
    return NextResponse.json(newParticipants, { status: 201 }); 

  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}