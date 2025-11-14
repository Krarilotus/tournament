import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Team from '@/lib/models/Team';
import Tournament from '@/lib/models/Tournament';
import { updateTeamNameSchema } from '@/lib/validators';
import { revalidatePath } from 'next/cache';
import { validateTournamentRequest } from '@/lib/api/requestUtils';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; teamId: string }> }
) {
  await dbConnect();

  try {
    const validation = await validateTournamentRequest(req, context);
    if (!validation.ok) {
      return validation.response;
    }
    const { tournament } = validation;
    const tournamentId = tournament._id.toString(); // Get ID string

    const { teamId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return NextResponse.json(
        { message: 'Invalid Team ID' },
        { status: 400 }
      );
    }

    // Validate body
    const body = await req.json();
    const bodyValidation = updateTeamNameSchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          message: 'Invalid request body',
          errors: bodyValidation.error.format(),
        },
        { status: 400 }
      );
    }

    const { customName } = bodyValidation.data;

    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 });
    }

    // --- 3. Check team belongs to tournament ---
    if (team.tournamentId.toString() !== tournamentId) {
      return NextResponse.json(
        { message: 'Team does not belong to this tournament' },
        { status: 403 }
      );
    }

    // --- 4.  Update name AND fix missing ownerId ---
    team.customName = customName;
    if (!team.ownerId) {
      console.log(`Repairing missing ownerId for team ${team._id}`);
      team.ownerId = tournament.ownerId;
    }

    await team.save(); // This will now pass validation

    // Revalidate all paths that show team names
    revalidatePath(`/dashboard/${tournamentId}/rounds`);
    revalidatePath(`/dashboard/${tournamentId}/teams`);

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error('Error updating team name:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}