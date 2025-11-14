import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import { revalidatePath } from 'next/cache';
import { validateTournamentRequest } from '@/lib/api/requestUtils';

// --- Custom Error Handler ---
// This can still be useful for errors *after* validation
function handleError(error: any) {
  console.error(error);
  if (error.message === 'Tournament not found') {
    return new NextResponse(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
    });
  }
  if (error.message === 'Forbidden') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
    });
  }
  if (error.message === 'Tournament ID is undefined.') {
    return new NextResponse(
      JSON.stringify({
        error: 'Server failed to read tournament ID from URL.',
      }),
      { status: 500 }
    );
  }
  return new NextResponse(JSON.stringify({ error: 'Server error' }), {
    status: 500,
  });
}

// --- CORRECT CONTEXT TYPE ---
type Context = {
  params: Promise<{ id: string }>;
};

// --- GET a single tournament ---
export async function GET(request: NextRequest, context: Context) {
  try {
    await dbConnect(); // Ensure DB is connected
    const validation = await validateTournamentRequest(request, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;

    console.log(`[GET] /api/tournaments/${tournament._id}`);

    const flatTournamentData = {
      name: tournament.name,
      description: tournament.description,
      settings: {
        pointsWin: tournament.settings.pointSystem.get('win') || 0,
        pointsDraw: tournament.settings.pointSystem.get('draw') || 0,
        pointsLoss: tournament.settings.pointSystem.get('loss') || 0,
        customStats: tournament.settings.customStats || [],
        tieBreakers: tournament.settings.tieBreakers || [],
        participantsLayout: tournament.settings.participantsLayout || null,
      },
    };

    return NextResponse.json(flatTournamentData);
  } catch (error: any) {
    return handleError(error);
  }
}

// --- PUT (Update) a tournament ---
export async function PUT(request: NextRequest, context: Context) {
  try {
    await dbConnect(); // Ensure DB is connected
    const validation = await validateTournamentRequest(request, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;

    console.log(`[PUT] /api/tournaments/${tournament._id}`);

    const body = await request.json();

    if (body.name) tournament.name = body.name;
    if (body.description) tournament.description = body.description;

    if (body.settings) {
      const s = body.settings;

      if (s.pointsWin !== undefined) {
        tournament.settings.pointSystem.set('win', s.pointsWin);
        tournament.settings.pointSystem.set('draw', s.pointsDraw);
        tournament.settings.pointSystem.set('loss', s.pointsLoss);
      }
      if (s.customStats !== undefined) {
        tournament.settings.customStats = s.customStats;
      }
      if (s.tieBreakers !== undefined) {
        tournament.settings.tieBreakers = s.tieBreakers;
      }
      if (s.participantsLayout !== undefined) {
        tournament.settings.participantsLayout = s.participantsLayout;
      }
    }

    await tournament.save();
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/${tournament._id}/settings`);
    return NextResponse.json(tournament);
  } catch (error: any) {
    return handleError(error);
  }
}

// --- DELETE a tournament ---
export async function DELETE(request: NextRequest, context: Context) {
  try {
    await dbConnect(); // Ensure DB is connected
    const validation = await validateTournamentRequest(request, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;

    const id = tournament._id; // Get ID from validated tournament
    console.log(`[DELETE] /api/tournaments/${id}`);

    await Tournament.findByIdAndDelete(id);
    revalidatePath('/dashboard');
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return handleError(error);
  }
}