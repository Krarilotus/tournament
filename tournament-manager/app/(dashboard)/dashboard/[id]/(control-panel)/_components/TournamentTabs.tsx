"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Swords,
  Settings as SettingsIcon,
  Users2,
} from "lucide-react";

export function TournamentTabs({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  let activeTab = "settings"; // Default to settings
  if (pathname === `/dashboard/${id}`) {
    activeTab = "participants";
  } else if (pathname === `/dashboard/${id}/rounds`) {
    activeTab = "rounds";
  } else if (pathname === `/dashboard/${id}/teams`) {
    activeTab = "teams";
  }
  // Note: /dashboard/[id]/settings will correctly default to "settings"

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList>
        {/* --- REORDERED TABS --- */}
        <TabsTrigger value="settings" asChild>
          <Link href={`/dashboard/${id}/settings`}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </TabsTrigger>

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
      </TabsList>

      <div className="mt-6">{children}</div>
    </Tabs>
  );
}