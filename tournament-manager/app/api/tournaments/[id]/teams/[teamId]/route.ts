import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Team from "@/lib/models/Team";
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

    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // Verify ownership
    if (
      team.ownerId.toString() !== session.user.id ||
      team.tournamentId.toString() !== tournamentId
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Update the name
    team.customName = customName;
    await team.save();

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