// app/(dashboard)/dashboard/[id]/(control-panel)/layout.tsx
import React from "react";
import dbConnect from "@/lib/db";
import Tournament from "@/lib/models/Tournament";
import { TournamentTabs } from "./_components/TournamentTabs";

async function getTournament(id: string) {
  await dbConnect();
  const tournament = await Tournament.findById(id).select("name").lean();
  return tournament;
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function TournamentControlPanelLayout({
  children,
  params,
}: LayoutProps) {
  const { id } = await params;
  const tournament = await getTournament(id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">
          {tournament?.name || "Tournament"}
        </h1>
        <p className="text-muted-foreground">
          Manage your participants, rounds, and settings.
        </p>
      </div>

      <TournamentTabs id={id}>{children}</TournamentTabs>
    </div>
  );
}