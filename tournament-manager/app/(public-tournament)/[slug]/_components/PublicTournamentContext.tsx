"use client";

import React, { createContext, useContext } from "react";
import type { PopulatedRound, SerializedMatch } from "@/lib/types";
import type { SerializedParticipant } from "@/lib/models/Participant";

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
      participantsLayout?: any;
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

type PublicTournamentContextValue = {
  publicData: PublicTournamentData;
  isReadOnly: boolean;
};

const PublicTournamentContext =
  createContext<PublicTournamentContextValue | undefined>(undefined);

export function PublicTournamentProvider({
  children,
  publicData,
  isReadOnly,
}: {
  children: React.ReactNode;
  publicData: PublicTournamentData;
  isReadOnly: boolean;
}) {
  return (
    <PublicTournamentContext.Provider value={{ publicData, isReadOnly }}>
      {children}
    </PublicTournamentContext.Provider>
  );
}

export function usePublicTournament(): PublicTournamentContextValue {
  const ctx = useContext(PublicTournamentContext);
  if (!ctx) {
    throw new Error(
      "usePublicTournament must be used within a PublicTournamentProvider"
    );
  }
  return ctx;
}
