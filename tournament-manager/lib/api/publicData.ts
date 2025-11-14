import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Tournament from "@/lib/models/Tournament";
import Participant from "@/lib/models/Participant";
import Round from "@/lib/models/Round";
import Match from "@/lib/models/Match";
import Team from "@/lib/models/Team";
import type { SerializedParticipant } from "@/lib/models/Participant";
import type { PopulatedRound, SerializedMatch } from "@/lib/types";

// ---- Generic serializer (BSON -> JSON-safe) -------------------------

type AnyObject = Record<string, any>;

function isPlainObject(value: unknown): value is AnyObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof Map) &&
    !(value instanceof mongoose.Types.ObjectId)
  );
}

function serializeValue(value: any): any {
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Map) {
    const obj: AnyObject = {};
    for (const [k, v] of value.entries()) {
      obj[String(k)] = serializeValue(v);
    }
    return obj;
  }
  if (Array.isArray(value)) {
    return value.map((v) => serializeValue(v));
  }
  if (isPlainObject(value)) {
    const result: AnyObject = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = serializeValue(v);
    }
    return result;
  }
  return value;
}

function serializeDoc<T extends AnyObject>(doc: T): AnyObject {
  return serializeValue(doc);
}

function serializeDocs<T extends AnyObject>(docs: T[]): AnyObject[] {
  return docs.map((d) => serializeDoc(d));
}

// ---- Public data type ------------------------------------------------

export type PublicTournamentData = {
  tournament: {
    _id: string;
    name: string;
    description?: string;
    urlSlug: string;
    status: string;
    settings?: {
      pointsWin?: number;
      pointsDraw?: number;
      pointsLoss?: number;
      customStats?: string[];
      tieBreakers?: string[];
      participantsLayout?: any; // matches your existing type client-side
    };
  };
  participants: SerializedParticipant[];
  rounds: PopulatedRound[];
  matches: SerializedMatch[];
  teams: {
    _id: string;
    tournamentId: string;
    playerIds: string[];
    lookupKey: string;
    customName?: string;
    genericName?: string;
  }[];
};

// ---- Main function ---------------------------------------------------

export async function getPublicTournamentData(
  slug: string
): Promise<PublicTournamentData> {
  await dbConnect();

  const rawTournament = await Tournament.findOne({
    urlSlug: slug,
    status: { $ne: "draft" }, // public: anything not draft
  }).lean();

  if (!rawTournament) {
    throw new Error("Tournament not found");
  }

  const tournamentId = rawTournament._id;

  const [rawParticipants, rawRounds, rawMatches, rawTeams] = await Promise.all([
    Participant.find({ tournamentId }).lean(),
    Round.find({ tournamentId }).lean(),
    Match.find({ tournamentId }).lean(),
    Team.find({ tournamentId }).lean(),
  ]);

  // Serialize everything
  const tournamentSerialized = serializeDoc(rawTournament);
  const participantsSerialized = serializeDocs(
    rawParticipants
  ) as SerializedParticipant[];
  const roundsSerialized = serializeDocs(rawRounds) as PopulatedRound[];
  const matchesSerialized = serializeDocs(rawMatches) as SerializedMatch[];
  const teamsSerialized = serializeDocs(rawTeams).map((t: any) => ({
    _id: t._id as string,
    tournamentId: t.tournamentId as string,
    playerIds: (t.playerIds || []).map((id: any) => String(id)),
    lookupKey: t.lookupKey as string,
    customName: t.customName,
    genericName: t.genericName,
  }));

  // Scrub sensitive fields from tournament
  delete (tournamentSerialized as any).ownerId;
  delete (tournamentSerialized as any).adminIds;

  return {
    tournament: {
      _id: tournamentSerialized._id,
      name: tournamentSerialized.name,
      description: tournamentSerialized.description,
      urlSlug: tournamentSerialized.urlSlug,
      status: tournamentSerialized.status,
      settings: tournamentSerialized.settings ?? {},
    },
    participants: participantsSerialized,
    rounds: roundsSerialized,
    matches: matchesSerialized,
    teams: teamsSerialized,
  };
}
