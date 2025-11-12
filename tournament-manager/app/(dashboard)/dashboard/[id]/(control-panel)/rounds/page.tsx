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
import { MatchResultForm } from "./_components/MatchResultForm";
import { CurrentStandingsCard } from "./_components/CurrentStandingsCard";
import { DeleteRoundButton } from "./_components/DeleteRoundButton";

import type { PopulatedRound, SerializedMatch } from "@/lib/types";
import type { SerializedParticipant } from "@/lib/models/Participant";
import { makeTeamLookupKey } from "@/lib/utils"; // <-- 1. IMPORT THE HELPER

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

// ---- helper for participant names ----

function getParticipantName(p: any): string {
  if (typeof p.participantId === "object" && p.participantId?.name) {
    return p.participantId.name as string;
  }
  const id =
    typeof p.participantId === "string"
      ? p.participantId
      : p.participantId?._id?.toString() ?? "";
  return id ? `ID: ${id.slice(-4)}` : "Unknown";
}

// --- ADDED: Helper to get a string ID from a populated or unpopulated participant ---
function getParticipantId(p: any): string {
  if (typeof p.participantId === "string") {
    return p.participantId;
  }
  if (typeof p.participantId === "object" && p.participantId?._id) {
    return (p.participantId as SerializedPlayer)._id;
  }
  return "";
}

// ---- Match card ----------------------------------------------------

function MatchCard({
  match,
  customStats,
  teamNameMap, // <-- 2. ACCEPT THE LIVE NAME MAP
  onResultChanged,
}: {
  match: SerializedMatch;
  customStats: string[];
  teamNameMap: Map<string, string>; // <-- 2. ACCEPT THE LIVE NAME MAP
  onResultChanged: () => void;
}) {
  const participants = match.participants as any[];
  const hasTeams = participants.some((p) => p.team);

  const teamAPlayers = hasTeams
    ? participants.filter((p) => (p.team ?? "").toUpperCase() === "A")
    : [];
  const teamBPlayers = hasTeams
    ? participants.filter((p) => (p.team ?? "").toUpperCase() === "B")
    : [];

  const [showPlayers, setShowPlayers] = React.useState(false);

  const isCompleted = match.status === "completed";

  // --- 3. MODIFIED: Use live names from the map ---
  const teamNames: Record<string, string> =
    (match as any).teamNames || {};

  // Get live name for Team A
  const teamAPlayerIds = teamAPlayers.map(getParticipantId);
  const lookupKeyA = makeTeamLookupKey(teamAPlayerIds);
  const teamADisplay =
    teamNameMap.get(lookupKeyA) || teamNames.A || "Team A";

  // Get live name for Team B
  const teamBPlayerIds = teamBPlayers.map(getParticipantId);
  const lookupKeyB = makeTeamLookupKey(teamBPlayerIds);
  const teamBDisplay =
    teamNameMap.get(lookupKeyB) || teamNames.B || "Team B";
  // --- END MODIFICATION ---

  const title = hasTeams
    ? `${teamADisplay} vs ${teamBDisplay}`
    : (match.participants as any[])
        .map((p: any) => getParticipantName(p))
        .join(" vs ");

  return (
    <div className="flex flex-col gap-1 rounded-md border bg-card/40 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Status:{" "}
            <span
              className={
                isCompleted
                  ? "text-emerald-400 font-medium"
                  : "text-yellow-400"
              }
            >
              {isCompleted ? "completed" : "set results"}
            </span>
          </p>
        </div>
        <MatchResultForm
          match={match}
          customStats={customStats}
          onResultReported={onResultChanged}
        />
      </div>

      {hasTeams && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => setShowPlayers((prev) => !prev)}
          >
            {showPlayers ? "Hide players" : "Show players"}
          </button>
        </div>
      )}

      {hasTeams && showPlayers && (
        <div className="mt-1 grid gap-4 border-t pt-2 text-xs md:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold">{teamADisplay}</p>
            <ul className="space-y-0.5">
              {teamAPlayers.map((p: any) => (
                <li key={getParticipantName(p)} className="truncate">
                  {getParticipantName(p)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-semibold">{teamBDisplay}</p>
            <ul className="space-y-0.5">
              {teamBPlayers.map((p: any) => (
                <li key={getParticipantName(p)} className="truncate">
                  {getParticipantName(p)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

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

  // --- 4. ADDED: Fetch all persistent teams ---
  const { data: allTeams } = useSWR<SerializedTeam[]>(
    `/api/tournaments/${tournamentId}/teams`,
    fetcher
  );

  // --- 5. ADDED: Create the live team name map ---
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

  // nudge team-standings SWR on result change
  const [standingsVersion, setStandingsVersion] = React.useState(0);

  // per-round collapse state
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
                          teamNameMap={liveTeamNameMap} // <-- 6. PASS THE MAP
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