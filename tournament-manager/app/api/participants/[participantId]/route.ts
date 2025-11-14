import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Participant from '@/lib/models/Participant';
import Tournament from '@/lib/models/Tournament';
import { revalidatePath } from 'next/cache';
import { checkAdminAccess } from '@/lib/api/requestUtils'; // <-- 1. IMPORT
import { Session } from 'next-auth'; // <-- 1. IMPORT

// --- Helper to verify user owns the participant (via the tournament) ---
// --- 2. REFACTORED HELPER ---
async function verifyParticipantOwner(
  participantId: string,
  session: Session | null // <-- Changed from userId to session
) {
  await dbConnect();
  const participant = await Participant.findById(participantId).populate(
    'tournamentId'
  );

  if (!participant) {
    throw new Error('Participant not found');
  }

  // We must cast here because populate returns a full document or just an ID
  const tournament = participant.tournamentId as any;
  if (!tournament) {
    // This should ideally not happen if data is clean
    throw new Error('Participant is not associated with a tournament');
  }

  // --- 3. CENTRALIZED CHECK ---
  const accessError = checkAdminAccess(tournament, session);
  if (accessError) {
    // Match the helper's error-throwing style
    if (accessError.status === 401) throw new Error('Unauthorized');
    if (accessError.status === 403) throw new Error('Forbidden');
    throw new Error('Access denied');
  }
  // --- END CENTRALIZED CHECK ---

  return participant;
}
// --- END REFACTORED HELPER ---

// --- PUT (Update) a participant (for isActive, name, etc.) ---
export async function PUT(
  request: Request,
  context: { params: Promise<{ participantId: string }> }
) {
  const session = await auth();
  // --- 4. REMOVED redundant session check ---

  try {
    const { participantId } = await context.params; // Next 16 fix
    // --- 4. Pass full session object ---
    const participant = await verifyParticipantOwner(participantId, session);

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
    if (error.message === 'Unauthorized') status = 401; // <-- Handle new error
    console.error(error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status,
    });
  }
}

// --- DELETE a participant ---
export async function DELETE(
  request: Request,
  context: { params: Promise<{ participantId: string }> }
) {
  const session = await auth();
  // --- 4. REMOVED redundant session check ---

  try {
    const { participantId } = await context.params; // Next 16 fix
    // --- 4. Pass full session object ---
    const participant = await verifyParticipantOwner(participantId, session);

    const tournamentId = (participant.tournamentId as any)._id;

    // Delete the participant
    await Participant.findByIdAndDelete(participantId);

    // CRITICAL: Remove participant reference from the tournament
    await Tournament.findByIdAndUpdate(tournamentId, {
      $pull: { participants: participantId },
    });

    // We'll also need to remove them from matches, but we'll do that in Phase 8

    revalidatePath(`/dashboard/${tournamentId}`);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    // --- FIX: Implemented full error handling ---
    let status = 500;
    if (error.message === 'Participant not found') status = 404;
    if (error.message === 'Forbidden') status = 403;
    if (error.message === 'Unauthorized') status = 401; // <-- Handle new error
    console.error(error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status }
    );
  }
}