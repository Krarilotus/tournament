"use client";

import React from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import { GenerateRoundDialog } from "./_components/GenerateRoundDialog";
// --- MODIFIED: Importing the new component ---
import { MatchCard } from "./_components/MatchCard";
// --- END MODIFIED ---
import { CurrentStandingsCard } from "./_components/CurrentStandingsCard";
import { DeleteRoundButton } from "./_components/DeleteRoundButton";

import type { PopulatedRound, SerializedMatch } from "@/lib/types";
import type { SerializedParticipant } from "@/lib/models/Participant";
import { makeTeamLookupKey } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Types for this page ---
type SerializedPlayer = {
  _id: string;
  name: string;
  customId?: string;
};
type SerializedTeam = {
  _id: string;
  lookupKey: string;
  customName?: string;
  genericName?: string;
};

// ---- main page -----------------------------------------------------

export default function RoundsPage(props: { params: Promise<{ id: string }> }) {
  const params = React.use(props.params);
  const { id: tournamentId } = params;

  // rounds (with matches populated)
  const {
    data: rounds,
    error: roundsError,
    isLoading: roundsLoading,
    mutate: mutateRounds,
  } = useSWR<PopulatedRound[]>(
    `/api/tournaments/${tournamentId}/rounds`,
    fetcher
  );

  // player standings
  const {
    data: standings,
    error: standingsError,
    isLoading: standingsLoading,
    mutate: mutateStandings,
  } = useSWR<SerializedParticipant[]>(
    `/api/tournaments/${tournamentId}/standings`,
    fetcher
  );

  // tournament meta (for custom stats + tie breakers)
  const { data: tournament } = useSWR<any>(
    `/api/tournaments/${tournamentId}`,
    fetcher
  );

  // --- Fetch all persistent teams ---
  const { data: allTeams } = useSWR<SerializedTeam[]>(
    `/api/tournaments/${tournamentId}/teams`,
    fetcher
  );

  // --- Create the live team name map ---
  const liveTeamNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (allTeams) {
      for (const team of allTeams) {
        const name = team.customName || team.genericName;
        if (name) {
          map.set(team.lookupKey, name);
        }
      }
    }
    return map;
  }, [allTeams]);
  // --- END ADDED SECTION ---

  const customStats: string[] =
    tournament?.settings?.customStats &&
    Array.isArray(tournament.settings.customStats)
      ? (tournament.settings.customStats as string[])
      : [];

  const tieBreakers: string[] =
    tournament?.settings?.tieBreakers &&
    Array.isArray(tournament.settings.tieBreakers)
      ? (tournament.settings.tieBreakers as string[])
      : ["points"];

  const [standingsVersion, setStandingsVersion] = React.useState(0);
  const [collapsedRounds, setCollapsedRounds] = React.useState<
    Record<string, boolean>
  >({});

  const refreshAll = React.useCallback(() => {
    mutateRounds();
    mutateStandings();
    setStandingsVersion((v) => v + 1);
  }, [mutateRounds, mutateStandings]);

  if (roundsError || standingsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load tournament data. Please refresh or try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Rounds &amp; Matches
        </h2>
        <GenerateRoundDialog
          tournamentId={tournamentId}
          onRoundGenerated={refreshAll}
        />
      </div>

      {/* Standings (players/teams) */}
      <CurrentStandingsCard
        tournamentId={tournamentId}
        rounds={rounds ?? []}
        standings={standings}
        standingsLoading={standingsLoading}
        tieBreakers={tieBreakers}
        version={standingsVersion}
      />

      {/* Rounds list */}
      {roundsLoading && (
        <p className="text-sm text-muted-foreground">Loading rounds...</p>
      )}

      {rounds && rounds.length === 0 && !roundsLoading && (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-sm text-muted-foreground">
              No rounds have been generated for this tournament yet.
            </p>
          </CardContent>
        </Card>
      )}

      {rounds && rounds.length > 0 && (
        <div className="space-y-6">
          {rounds
            .slice()
            .sort((a, b) => b.roundNumber - a.roundNumber)
            .map((round) => {
              const isCollapsed = collapsedRounds[round._id] ?? false;

              return (
                <Card key={round._id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            setCollapsedRounds((prev) => ({
                              ...prev,
                              [round._id]: !isCollapsed,
                            }))
                          }
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {isCollapsed ? "Show round" : "Hide round"}
                          </span>
                        </Button>
                        <span>Round {round.roundNumber}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          System: {round.system} • Status: {round.status}
                        </span>
                      </div>

                      <DeleteRoundButton
                        tournamentId={tournamentId}
                        roundId={round._id}
                        onDeleted={refreshAll}
                      />
                    </CardTitle>
                  </CardHeader>

                  {!isCollapsed && (
                    <CardContent className="space-y-2 pt-0">
                      {round.matches.map((match: SerializedMatch) => (
                        <MatchCard
                          key={match._id}
                          match={match}
                          customStats={customStats}
                          teamNameMap={liveTeamNameMap}
                          onResultChanged={refreshAll}
                        />
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}