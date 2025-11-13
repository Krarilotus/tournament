import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Team from "@/lib/models/Team";
import Tournament from "@/lib/models/Tournament";
import { updateTeamNameSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; teamId: string }> }
) {
  await dbConnect();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: tournamentId, teamId } = await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(tournamentId) ||
      !mongoose.Types.ObjectId.isValid(teamId)
    ) {
      return NextResponse.json(
        { message: "Invalid Tournament or Team ID" },
        { status: 400 }
      );
    }

    // Validate body
    const body = await req.json();
    const validation = updateTeamNameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid request body",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { customName } = validation.data;

    // --- 2. Verify ownership via the TOURNAMENT ---
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }
    if (tournament.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // --- 3. Check team belongs to tournament ---
    if (team.tournamentId.toString() !== tournamentId) {
      return NextResponse.json(
        { message: "Team does not belong to this tournament" },
        { status: 403 }
      );
    }

    // --- 4. (MODIFIED) Update name AND fix missing ownerId ---
    team.customName = customName;
    
    // This is the fix:
    // If the team is missing an ownerId (from the old bug),
    // assign it from the parent tournament we already loaded.
    if (!team.ownerId) {
      console.log(`Repairing missing ownerId for team ${team._id}`);
      team.ownerId = tournament.ownerId;
    }
    
    await team.save(); // This will now pass validation
    // --- END MODIFICATION ---

    // Revalidate all paths that show team names
    revalidatePath(`/dashboard/${tournamentId}/rounds`);
    revalidatePath(`/dashboard/${tournamentId}/teams`);

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error("Error updating team name:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}