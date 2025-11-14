// app/(public-tournament)/[slug]/(public-control-panel)/participants/page.tsx
"use client";

import React from "react";
import { usePublicTournament } from "../../_components/PublicTournamentContext";
import { ParticipantsTable } from "@/app/(dashboard)/dashboard/[id]/(control-panel)/_components/ParticipantsTable";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function PublicParticipantsPage() {
  const { publicData, isReadOnly } = usePublicTournament();
  const { tournament, participants } = publicData;

  const tiebreakers =
    tournament.settings?.tieBreakers && tournament.settings.tieBreakers.length
      ? tournament.settings.tieBreakers
      : ["points"];

  const layout = tournament.settings?.participantsLayout;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
        <CardDescription>
          A public, read-only list of all participants in this tournament.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ParticipantsTable
          data={participants}
          tiebreakers={tiebreakers}
          initialLayout={layout}
          onParticipantsChanged={undefined}
          onLayoutChange={undefined}
          isReadOnly={isReadOnly}
        />
      </CardContent>
    </Card>
  );
}
