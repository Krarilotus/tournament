import { NextRequest, NextResponse } from "next/server";
import { validateTournamentRequest } from "@/lib/api/requestUtils";
import Participant from "@/lib/models/Participant";
import Team from "@/lib/models/Team";
import Round from "@/lib/models/Round";
import Match from "@/lib/models/Match";
import {
  serializeTournament,
  serializeParticipant,
  serializeTeam,
  serializeRound,
  serializeMatch,
} from "@/lib/serialization/serializeExport";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const validation = await validateTournamentRequest(request, context);
  if (!validation.ok) {
    return validation.response;
  }

  const { tournament: tournamentDoc } = validation;
  const tournamentId = tournamentDoc._id;

  try {
    const [participants, teams, rounds, matches] = await Promise.all([
      Participant.find({ tournamentId }).lean(),
      Team.find({ tournamentId }).lean(),
      Round.find({ tournamentId }).lean(),
      Match.find({ tournamentId }).lean(),
    ]);

    const serializedTournament = serializeTournament(tournamentDoc);
    const serializedParticipants = participants.map(serializeParticipant);
    const serializedTeams = teams.map(serializeTeam);
    const serializedRounds = rounds.map(serializeRound);
    const serializedMatches = matches.map(serializeMatch);

    const exportData = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      data: {
        tournament: serializedTournament,
        participants: serializedParticipants,
        teams: serializedTeams,
        rounds: serializedRounds,
        matches: serializedMatches,
      },
    };

    const filename =
      tournamentDoc.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() ||
      "tournament";

    // 1. Stringify the data with 2-space indentation for readability.
    const prettyJson = JSON.stringify(exportData, null, 2);

    // 2. Send the string as the body of a new NextResponse.
    return new NextResponse(prettyJson, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="export_${filename}_${tournamentId}.json"`,
        "Content-Type": "application/json",
      },
    });
    
  } catch (error) {
    console.error("Failed to export tournament:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}