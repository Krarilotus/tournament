import mongoose, { FlattenMaps } from "mongoose";
import { ITournament } from "@/lib/models/Tournament";
import { IParticipant } from "@/lib/models/Participant";
import { ITeam } from "@/lib/models/Team";
import { IRound } from "@/lib/models/Round";
import { IMatch, IMatchParticipant } from "@/lib/models/Match";

// ---  HELPER ---
/**
 * Safely converts a Map (from a full Mongoose doc)
 * or a Record (from a .lean() object) into a plain object.
 */
function mapToObject(map: any): Record<string, any> | undefined {
  if (!map) return undefined;

  // Case 1: It's a Mongoose Map. Convert it.
  if (map instanceof Map) {
    return Object.fromEntries(map);
  }

  // Case 2: It's already a plain object (from .lean()). Return it.
  if (typeof map === "object" && !(map instanceof Map)) {
    return map;
  }

  return undefined;
}

// Helper to safely convert an array of ObjectIds to strings
function idsToStrings(ids: any[] | undefined) {
  if (!ids) return [];
  return ids.map((id) => id.toString());
}

// This function receives the FULL document from validateTournamentRequest
export function serializeTournament(doc: ITournament) {
  return {
    _id: doc._id.toString(),
    ownerId: doc.ownerId.toString(),
    name: doc.name,
    description: doc.description,
    status: doc.status,
    participants: [], // Stub for export format
    rounds: [], // Stub for export format
    settings: {
      pointSystem: mapToObject(doc.settings.pointSystem),
      customStats: doc.settings.customStats,
      tieBreakers: doc.settings.tieBreakers,
    },
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function serializeParticipant(doc: FlattenMaps<IParticipant> | IParticipant) {
  return {
    _id: doc._id.toString(),
    tournamentId: doc.tournamentId.toString(),
    name: doc.name,
    customId: doc.customId,
    isActive: doc.isActive,
    scores: JSON.parse(JSON.stringify(doc.scores)),
    matchHistory: idsToStrings(doc.matchHistory),
  };
}

export function serializeTeam(doc: FlattenMaps<ITeam> | ITeam) {
  return {
    _id: doc._id.toString(),
    tournamentId: doc.tournamentId.toString(),
    ownerId: doc.ownerId.toString(),
    playerIds: idsToStrings(doc.playerIds),
    lookupKey: doc.lookupKey,
    customName: doc.customName,
    genericName: doc.genericName,
  };
}

export function serializeRound(doc: FlattenMaps<IRound> | IRound) {
  return {
    _id: doc._id.toString(),
    tournamentId: doc.tournamentId.toString(),
    roundNumber: doc.roundNumber,
    system: doc.system,
    status: doc.status,
    matches: [], 
    systemOptions: doc.systemOptions,
    pointSystem: mapToObject(doc.pointSystem as any),
    ffaPlacements: mapToObject(doc.ffaPlacements as any), 
  };
}

function serializeMatchParticipant(mp: {
  participantId: any;
  team?: string;
  result?: string;
  pointsAwarded?: number;
  customStats?: any; 
}) {
  return {
    participantId: mp.participantId.toString(),
    team: mp.team,
    result: mp.result,
    pointsAwarded: mp.pointsAwarded,
    customStats: mapToObject(mp.customStats), 
  };
}

export function serializeMatch(doc: FlattenMaps<IMatch> | IMatch) {
  return {
    _id: doc._id.toString(),
    tournamentId: doc.tournamentId.toString(),
    roundId: doc.roundId.toString(),
    status: doc.status,
    participants: doc.participants.map(serializeMatchParticipant),
    winner: doc.winner ? doc.winner.toString() : undefined,
    isDraw: doc.isDraw,
    teamNames: mapToObject(doc.teamNames as any),
    createdAt: (doc as any).createdAt?.toISOString(),
    updatedAt: (doc as any).updatedAt?.toISOString(),
  };
}