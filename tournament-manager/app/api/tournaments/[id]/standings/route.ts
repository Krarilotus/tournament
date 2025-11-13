import { NextRequest, NextResponse } from "next/server";
import { getStandings } from "@/lib/standings/getStandings";
import { validateTournamentRequest } from "@/lib/api/requestUtils";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Validate request
    const validation = await validateTournamentRequest(req, context);
    if (!validation.ok) return validation.response;
    const { tournament, tieBreakers } = validation;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    // 2. Get standings via shared helper
    const sortedSerializedParticipants = await getStandings(
      tournament._id.toString(),
      tieBreakers,
      activeOnly
    );

    return NextResponse.json(sortedSerializedParticipants, { status: 200 });
  } catch (error) {
    console.error("Error fetching standings:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}