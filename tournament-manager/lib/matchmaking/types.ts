import type { SerializedMatch } from "@/lib/types";

export type SwissEntity = {
  id: string;
  score: number;
  matchHistory: string[];
};

export type SwissVariant = "GENERIC" | "FIDE_DUTCH";

export interface SwissOptions {
  avoidRematches?: boolean;
  relevantRoundIds?: string[];
  onConflict?: "FLOAT_DOWN" | "PAIR_ANYWAY";

  variant?: SwissVariant; // "GENERIC" or "FIDE_DUTCH"
}

export type SwissContext = {
  matches: SerializedMatch[];
};

/**
 * Representation of a team as a Swiss entity.
 */
export type TeamEntity = SwissEntity & {
  playerIds: string[];
};

export type TeamOptions = {
  // how big are teams
  teamSize?: number;
  teamMethod?: "BALANCE_FIRST_LAST" | "RANDOM";

  // persistence mode
  teamPersistenceMode?: "NEW_TEAMS" | "REUSE_FROM_ROUND";
  teamPersistenceRoundId?: string | null;

  // Swiss-ish options for pairing teams
  avoidRematches?: boolean;
  relevantRoundIds?: string[];
  onConflict?: "FLOAT_DOWN" | "PAIR_ANYWAY";
};

export type FFAOptions = {
  groupSize: number;
  method: "SIMPLE_CHUNK" | "SWISS_GROUPING";
  avoidRematches: boolean;
  relevantRoundIds: string[];
  onConflict: "FLOAT_DOWN" | "PAIR_ANYWAY";
};

export type RoundSummary = {
  _id: string;
  roundNumber: number;
  system: string;
  status: string;
};