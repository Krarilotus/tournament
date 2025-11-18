import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { validateTournamentRequest } from '@/lib/api/requestUtils';
import { recalculateStandings } from '@/lib/standings/recalculate';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const validation = await validateTournamentRequest(req, context);
    if (!validation.ok) return validation.response;

    const { tournament } = validation;

    // Call the Logic Engine directly
    await recalculateStandings(tournament._id.toString(), tournament.settings);

    // Revalidate
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/${tournament._id}`);
    revalidatePath(`/dashboard/${tournament._id}/participants`);
    revalidatePath(`/dashboard/${tournament._id}/rounds`);

    return NextResponse.json({ message: 'Recalculation complete' }, { status: 200 });
  } catch (error) {
    console.error('Error in recalculation route:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}