import { SerializedParticipant } from "./models/Participant";

// A serialized version of our Match model
export type SerializedMatch = {
  _id: string;
  tournamentId: string;
  roundId: string;
  status: "pending" | "completed";
  participants: {
    participantId: string | SerializedParticipant;
    team?: string;
    result?: string;
    pointsAwarded?: number;
    customStats?: Record<string, number>;
  }[];
  winner?: string;
  isDraw: boolean;
  teamNames?: Record<string, string>;
};


// A serialized version of our Round model, populated with its matches
export type PopulatedRound = {
  _id: string;
  tournamentId: string;
  roundNumber: number;
  system: string;
  status: 'pending' | 'running' | 'completed';
  matches: SerializedMatch[];
};