"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Swords, BarChart3 } from "lucide-react";
import { usePublicTournament } from "./PublicTournamentContext";

export function PublicTournamentShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const { publicData } = usePublicTournament();
  const pathname = usePathname();

  const basePath = `/${slug}`;

  // Default to standings
  let activeTab: "standings" | "rounds" | "participants" = "standings";
  if (pathname === `${basePath}/rounds`) activeTab = "rounds";
  else if (pathname === `${basePath}/participants`) activeTab = "participants";
  // anything else (/, /standings, /teams, weird stuff) falls back to "standings"

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">
            {publicData.tournament.name || "Tournament"}
          </h1>
          {publicData.tournament.description && (
            <p className="text-sm text-muted-foreground">
              {publicData.tournament.description}
            </p>
          )}
        </div>

        <Tabs value={activeTab} className="w-full">
          <TabsList>
            <TabsTrigger value="standings" asChild>
              <Link href={`${basePath}/standings`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Standings
              </Link>
            </TabsTrigger>
            <TabsTrigger value="rounds" asChild>
              <Link href={`${basePath}/rounds`}>
                <Swords className="mr-2 h-4 w-4" />
                Rounds
              </Link>
            </TabsTrigger>
            <TabsTrigger value="participants" asChild>
              <Link href={`${basePath}/participants`}>
                <Users className="mr-2 h-4 w-4" />
                Participants
              </Link>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">{children}</div>
        </Tabs>
      </div>
    </main>
  );
}
