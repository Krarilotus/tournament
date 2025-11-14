"use client";

import React from "react";
import { usePublicTournament } from "../../_components/PublicTournamentContext";
import { CurrentStandingsCard } from "@/app/(dashboard)/dashboard/[id]/(control-panel)/rounds/_components/CurrentStandingsCard";
import type { SerializedParticipant } from "@/lib/models/Participant";

// Same helper as in rounds page
function sortStandings(
  participants: SerializedParticipant[],
  tieBreakers: string[]
): SerializedParticipant[] {
  const keys = tieBreakers.filter((tb) => tb !== "directComparison");

  return [...participants].sort((a, b) => {
    for (const key of keys) {
      const av = a.scores?.[key] ?? 0;
      const bv = b.scores?.[key] ?? 0;
      if (av > bv) return -1;
      if (av < bv) return 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export default function PublicStandingsPage() {
  const { publicData, isReadOnly } = usePublicTournament();
  const { tournament, participants, rounds } = publicData;

  const tieBreakers =
    tournament.settings?.tieBreakers && tournament.settings.tieBreakers.length
      ? tournament.settings.tieBreakers
      : ["points"];

  const standings = sortStandings(participants, tieBreakers);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Standings</h2>
      <p className="text-sm text-muted-foreground">
        Overall standings for this tournament, sorted by your configured tie
        breakers.
      </p>

      <CurrentStandingsCard
        tournamentId={tournament._id}
        rounds={rounds}
        standings={standings}
        standingsLoading={false}
        tieBreakers={tieBreakers}
        version={0}
        isReadOnly={isReadOnly}
        defaultCollapsed={false}
      />
    </div>
  );
}
