import React from "react";
import { getPublicTournamentData } from "@/lib/api/publicData";
import { PublicTournamentProvider } from "../_components/PublicTournamentContext";
import { PublicTournamentShell } from "../_components/PublicTournamentShell";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function PublicTournamentLayout({
  children,
  params,
}: LayoutProps) {
  const { slug } = await params;
  const publicData = await getPublicTournamentData(slug);

  return (
    <PublicTournamentProvider publicData={publicData} isReadOnly={true}>
      <PublicTournamentShell slug={slug}>{children}</PublicTournamentShell>
    </PublicTournamentProvider>
  );
}
