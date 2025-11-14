"use client";

import React from "react";
import useSWR from "swr";
import { usePublicTournament } from "../../_components/PublicTournamentContext";
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
import { MatchCard } from "@/app/(dashboard)/dashboard/[id]/(control-panel)/rounds/_components/MatchCard";

import type { PopulatedRound, SerializedMatch } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PublicRoundsPage() {
  const { publicData, isReadOnly } = usePublicTournament();
  const tournamentId = publicData.tournament._id;

  const {
    data: rounds,
    error: roundsError,
    isLoading: roundsLoading,
  } = useSWR<PopulatedRound[]>(
    `/api/tournaments/${tournamentId}/rounds`,
    fetcher
  );

  const { data: allTeams } = useSWR<
    {
      _id: string;
      lookupKey: string;
      customName?: string;
      genericName?: string;
    }[]
  >(`/api/tournaments/${tournamentId}/teams`, fetcher);

  const [collapsedRounds, setCollapsedRounds] = React.useState<
    Record<string, boolean>
  >({});
  const [hasInitializedRounds, setHasInitializedRounds] =
    React.useState(false);

  React.useEffect(() => {
    if (rounds && !hasInitializedRounds) {
      const initialCollapsedState: Record<string, boolean> = {};
      for (const round of rounds) {
        if (round.status === "completed") {
          initialCollapsedState[round._id] = true;
        }
      }
      setCollapsedRounds(initialCollapsedState);
      setHasInitializedRounds(true);
    }
  }, [rounds, hasInitializedRounds]);

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

  if (roundsError) {
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
      <h2 className="text-2xl font-bold tracking-tight">
        Rounds &amp; Matches
      </h2>

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
                    </CardTitle>
                  </CardHeader>

                  {!isCollapsed && (
                    <CardContent className="space-y-2 pt-0">
                      {(round.matches as SerializedMatch[]).map((match) => (
                        <MatchCard
                          key={match._id}
                          match={match}
                          customStats={
                            publicData.tournament.settings?.customStats ?? []
                          }
                          teamNameMap={liveTeamNameMap}
                          // no-ops; isReadOnly stops any save anyway
                          onResultChanged={() => {}}
                          onStartSwap={() => {}}
                          isReadOnly={isReadOnly}
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
