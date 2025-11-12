// app/(dashboard)/dashboard/[id]/(control-panel)/layout.tsx
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Users, Swords, Settings as SettingsIcon, Users2 } from "lucide-react";
import dbConnect from "@/lib/db";
import Tournament from "@/lib/models/Tournament";

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

      <Tabs defaultValue="participants" className="w-full">
        <TabsList>
          <TabsTrigger value="participants" asChild>
            <Link href={`/dashboard/${id}`}>
              <Users className="mr-2 h-4 w-4" />
              Participants
            </Link>
          </TabsTrigger>

          <TabsTrigger value="rounds" asChild>
            <Link href={`/dashboard/${id}/rounds`}>
              <Swords className="mr-2 h-4 w-4" />
              Rounds &amp; Matches
            </Link>
          </TabsTrigger>

          <TabsTrigger value="teams" asChild>
            <Link href={`/dashboard/${id}/teams`}>
              <Users2 className="mr-2 h-4 w-4" />
              Teams
            </Link>
          </TabsTrigger>

          <TabsTrigger value="settings" asChild>
            <Link href={`/dashboard/${id}/settings`}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">{children}</div>
      </Tabs>
    </div>
  );
}