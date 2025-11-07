import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import { revalidatePath } from 'next/cache';

// --- Helper function to verify ownership ---
async function verifyOwner(tournamentId: string, userId: string) {
  await dbConnect();
  console.log(`[verifyOwner] Checking for ID: ${tournamentId}`);
  
  if (!tournamentId) {
    throw new Error('Tournament ID is undefined.');
  }

  const tournament = await Tournament.findById(tournamentId);
  
  if (!tournament) {
    throw new Error('Tournament not found');
  }
  
  if (tournament.ownerId.toString() !== userId) {
    throw new Error('Forbidden');
  }
  
  return tournament;
}

// --- Custom Error Handler ---
function handleError(error: any) {
  console.error(error);
  if (error.message === 'Tournament not found') {
    return new NextResponse(JSON.stringify({ error: 'Not Found' }), { status: 404 });
  }
  if (error.message === 'Forbidden') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  if (error.message === 'Tournament ID is undefined.') {
    return new NextResponse(JSON.stringify({ error: 'Server failed to read tournament ID from URL.' }), { status: 500 });
  }
  return new NextResponse(JSON.stringify({ error: 'Server error' }), { status: 500 });
}

// --- CORRECT CONTEXT TYPE ---
// The `params` property itself is a Promise.
type Context = {
  params: Promise<{ id: string }>
};

// --- GET a single tournament ---
export async function GET(request: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const id = params.id;
    console.log(`[GET] /api/tournaments/${id}`);

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    const tournament = await verifyOwner(id, session.user.id);
    
    const flatTournamentData = {
      name: tournament.name,
      description: tournament.description,
      settings: {
        pointsWin: tournament.settings.pointSystem.get('win') || 0,
        pointsDraw: tournament.settings.pointSystem.get('draw') || 0,
        pointsLoss: tournament.settings.pointSystem.get('loss') || 0,
        customStats: tournament.settings.customStats || [],
        tieBreakers: tournament.settings.tieBreakers || [],
      }
    };
    
    return NextResponse.json(flatTournamentData);
    // --- END OF FIX ---

  } catch (error: any) {
    return handleError(error);
  }
}

// --- PUT (Update) a tournament ---
export async function PUT(request: NextRequest, context: Context) {
  try {
    // --- THIS IS THE FIX ---
    const params = await context.params;
    const id = params.id;
    // --- END OF FIX ---
    
    console.log(`[PUT] /api/tournaments/${id}`);

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const tournament = await verifyOwner(id, session.user.id);
    const body = await request.json();
    
    if (body.name) tournament.name = body.name;
    if (body.description) tournament.description = body.description;

    if (body.settings) {
       if (body.settings.pointsWin !== undefined) {
        tournament.settings.pointSystem.set('win', body.settings.pointsWin);
        tournament.settings.pointSystem.set('draw', body.settings.pointsDraw);
        tournament.settings.pointSystem.set('loss', body.settings.pointsLoss);
      }
      if (body.settings.customStats) {
        tournament.settings.customStats = body.settings.customStats;
      }
      if (body.settings.tieBreakers) {
        tournament.settings.tieBreakers = body.settings.tieBreakers;
      }
    }
    
    await tournament.save();
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/${params.id}/settings`);
    return NextResponse.json(tournament);

  } catch (error: any) {
    return handleError(error);
  }
}

// --- DELETE a tournament ---
export async function DELETE(request: NextRequest, context: Context) {
  try {
    // --- THIS IS THE FIX ---
    const params = await context.params;
    const id = params.id;
    // --- END OF FIX ---

    console.log(`[DELETE] /api/tournaments/${id}`);

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await verifyOwner(id, session.user.id);
    await Tournament.findByIdAndDelete(id);
    revalidatePath('/dashboard');
    return new NextResponse(null, { status: 204 });

  } catch (error: any) {
    return handleError(error);
  }
}