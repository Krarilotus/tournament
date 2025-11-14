import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Tournament from "@/lib/models/Tournament";
import Participant from "@/lib/models/Participant";
import Team from "@/lib/models/Team";
import Round from "@/lib/models/Round";
import Match from "@/lib/models/Match";
import { makeTeamLookupKey } from "@/lib/utils";

/**
 * Manually rolls back a failed import by deleting all created documents.
 */
async function cleanupFailedImport(tournamentId: mongoose.Types.ObjectId) {
  if (!tournamentId) return;
  console.log(`Import failed. Cleaning up tournament: ${tournamentId}`);
  try {
    // We can run these in parallel
    await Promise.all([
      Participant.deleteMany({ tournamentId }),
      Team.deleteMany({ tournamentId }),
      Round.deleteMany({ tournamentId }),
      Match.deleteMany({ tournamentId }),
      Tournament.findByIdAndDelete(tournamentId), // Delete the parent last
    ]);
    console.log(`Cleanup for ${tournamentId} successful.`);
  } catch (cleanupError) {
    console.error(`CRITICAL: Failed to clean up ${tournamentId}`, cleanupError);
    // If cleanup fails, that's a serious server-side issue.
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const newOwnerId = new mongoose.Types.ObjectId(session.user.id);

  let newTournamentId: mongoose.Types.ObjectId | undefined = undefined;
  try {
    const body = await request.json();

    if (body.version !== "1.0.0" || !body.data) {
      throw new Error("Invalid or unsupported file format.");
    }

    const { tournament, participants, teams, rounds, matches } = body.data;

    const participantIdMap = new Map<string, mongoose.Types.ObjectId>();
    const teamIdMap = new Map<string, mongoose.Types.ObjectId>();
    const roundIdMap = new Map<string, mongoose.Types.ObjectId>();

    // 3. Import Tournament
    delete tournament._id;
    const newTournament = new Tournament({
      ...tournament,
      ownerId: newOwnerId,
      status: "draft",
      participants: [],
      rounds: [],
      settings: {
        ...tournament.settings,
        pointSystem: tournament.settings.pointSystem
          ? new Map(Object.entries(tournament.settings.pointSystem))
          : undefined,
        participantsLayout: undefined,
      },
    });
    await newTournament.save();
    newTournamentId = newTournament._id; // --- (MODIFIED) Store the ID

    // 4. Import Participants
    for (const p of participants) {
      const oldId = p._id;
      delete p._id;
      const newP = new Participant({ ...p, tournamentId: newTournamentId });
      await newP.save();
      participantIdMap.set(oldId, newP._id);
      newTournament.participants.push(newP._id);
    }

    // 5. Import Teams
    for (const t of teams) {
      const oldId = t._id;
      delete t._id;
      const newPlayerIds = t.playerIds
        .map((oldPId: string) => participantIdMap.get(oldPId)?.toString())
        .filter(Boolean) as string[];

      if (newPlayerIds.length === 0) continue;
      const newLookupKey = makeTeamLookupKey(newPlayerIds);

      const newT = new Team({
        ...t,
        tournamentId: newTournamentId,
        ownerId: newOwnerId,
        playerIds: newPlayerIds.map((id) => new mongoose.Types.ObjectId(id)),
        lookupKey: newLookupKey,
      });
      await newT.save();
      teamIdMap.set(oldId, newT._id);
    }

    // 6. Import Rounds
    for (const r of rounds) {
      const oldId = r._id;
      delete r._id;
      const newR = new Round({
        ...r,
        tournamentId: newTournamentId,
        matches: [],
        pointSystem: r.pointSystem
          ? new Map(Object.entries(r.pointSystem))
          : undefined,
        ffaPlacements: r.ffaPlacements
          ? new Map(Object.entries(r.ffaPlacements))
          : undefined,
      });
      await newR.save();
      roundIdMap.set(oldId, newR._id);
      newTournament.rounds.push(newR._id);
    }

    // 7. Import Matches
    const newRoundMatchesMap = new Map<string, mongoose.Types.ObjectId[]>();

    for (const m of matches) {
      delete m._id;
      const newRoundId = roundIdMap.get(m.roundId);
      if (!newRoundId) continue;

      const newParticipants = m.participants
        .map((p: any) => ({
          ...p,
          participantId: participantIdMap.get(p.participantId),
          customStats: p.customStats
            ? new Map(Object.entries(p.customStats))
            : undefined,
        }))
        .filter((p: any) => p.participantId);

      const newM = new Match({
        ...m,
        tournamentId: newTournamentId,
        roundId: newRoundId,
        participants: newParticipants,
        winner: m.winner ? participantIdMap.get(m.winner) : undefined,
        teamNames: m.teamNames
          ? new Map(Object.entries(m.teamNames))
          : undefined,
      });
      await newM.save();

      if (!newRoundMatchesMap.has(newRoundId.toString())) {
        newRoundMatchesMap.set(newRoundId.toString(), []);
      }
      newRoundMatchesMap.get(newRoundId.toString())!.push(newM._id);
    }

    // 8. Finalize Links (Rounds -> Matches)
    for (const [roundId, matchIds] of newRoundMatchesMap.entries()) {
      await Round.findByIdAndUpdate(roundId, { $set: { matches: matchIds } });
    }

    await newTournament.save();

    // 9. Commit
    // (No transaction, so we just return success)

    return NextResponse.json(
      { _id: newTournament._id.toString() },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Import failed:", error);

    if (newTournamentId) {
      await cleanupFailedImport(newTournamentId);
    }

    return NextResponse.json(
      { message: error.message || "Import failed" },
      { status: 500 }
    );
  }
  // 'finally' block is no longer needed
}