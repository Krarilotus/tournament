import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Participant from '@/lib/models/Participant';
import Tournament from '@/lib/models/Tournament';
import { revalidatePath } from 'next/cache';

// --- Helper to verify user owns the participant (via the tournament) ---
async function verifyParticipantOwner(participantId: string, userId: string) {
  await dbConnect();
  const participant = await Participant.findById(participantId).populate('tournamentId');
  
  if (!participant) {
    throw new Error('Participant not found');
  }
  
  // We must cast here because populate returns a full document or just an ID
  const tournament = participant.tournamentId as any; 
  if (!tournament || tournament.ownerId.toString() !== userId) {
    throw new Error('Forbidden');
  }
  return participant;
}

// --- PUT (Update) a participant (for isActive, name, etc.) ---
export async function PUT(request: Request, context: { params: Promise<{ participantId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { participantId } = await context.params; // Next 16 fix
    const participant = await verifyParticipantOwner(participantId, session.user.id);
    
    const body = await request.json();
    
    // Selectively update fields
    if (typeof body.isActive === 'boolean') {
      participant.isActive = body.isActive;
    }
    if (typeof body.name === 'string') {
      participant.name = body.name;
    }
    // ... add other fields as needed ...

    await participant.save();

    // Use the populated tournament ID for revalidation
    const tournamentId = (participant.tournamentId as any)._id;
    revalidatePath(`/dashboard/${tournamentId}`);
    return NextResponse.json(participant);

  } catch (error: any) {
    let status = 500;
    if (error.message === 'Participant not found') status = 404;
    if (error.message === 'Forbidden') status = 403;
    console.error(error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status });
  }
}

// --- DELETE a participant ---
export async function DELETE(request: Request, context: { params: Promise<{ participantId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { participantId } = await context.params; // Next 16 fix
    const participant = await verifyParticipantOwner(participantId, session.user.id);
    
    const tournamentId = (participant.tournamentId as any)._id;

    // Delete the participant
    await Participant.findByIdAndDelete(participantId);
    
    // CRITICAL: Remove participant reference from the tournament
    await Tournament.findByIdAndUpdate(tournamentId, {
      $pull: { participants: participantId }
    });
    
    // We'll also need to remove them from matches, but we'll do that in Phase 8

    revalidatePath(`/dashboard/${tournamentId}`);
    return new NextResponse(null, { status: 204 });

  } catch (error: any) {
    // --- FIX: Implemented full error handling ---
    let status = 500;
    if (error.message === 'Participant not found') status = 404;
    if (error.message === 'Forbidden') status = 403;
    console.error(error);
    return new NextResponse(JSON.stringify({ error: error.message || 'Server error' }), { status });
  }
}