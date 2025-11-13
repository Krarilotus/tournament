"use client";

import * as React from "react";
import { useMemo } from "react";
import useSWR from "swr";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { alphaCode } from "@/lib/utils";

import type { PopulatedRound } from "@/lib/types";
import type { SerializedParticipant } from "@/lib/models/Participant";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TeamStanding = {
  key: string;
  name: string;
  playerIds: string[];
  players: { _id: string; name: string; customId?: string; points: number }[];
  scores: Record<string, number>;
};

type Props = {
  tournamentId: string;
  rounds: PopulatedRound[];
  standings?: SerializedParticipant[];
  standingsLoading: boolean;
  tieBreakers: string[];
  version: number; // bump when results change
};

// Helper: format score keys
function formatScoreKey(key: string): string {
  if (key === "points") return "Points";
  if (key === "buchholz") return "Buchholz";
  if (key === "buchholz2") return "Buchholz-2";
  // Capitalize first letter for custom stats like "kills"
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// --- Consistent score formatting ---
function formatScoreValue(val: number): string | number {
  if (val % 1 !== 0) {
    return val.toFixed(2);
  }
  return val;
}

export function CurrentStandingsCard({
  tournamentId,
  rounds,
  standings,
  standingsLoading,
  tieBreakers,
  version,
}: Props) {
  const [showStandings, setShowStandings] = React.useState(true);
  const [mode, setMode] = React.useState<"players" | "teams">("players");

  const teamRounds = useMemo(
    () => rounds.filter((r) => r.system.startsWith("team-")),
    [rounds]
  );

  const [teamSeedRoundId, setTeamSeedRoundId] = React.useState<string | null>(
    () => (teamRounds.length > 0 ? teamRounds[0]._id : null)
  );

  React.useEffect(() => {
    if (teamRounds.length === 0) {
      setTeamSeedRoundId(null);
    } else if (
      !teamSeedRoundId ||
      !teamRounds.some((r) => r._id === teamSeedRoundId)
    ) {
      setTeamSeedRoundId(teamRounds[0]._id);
    }
  }, [teamRounds, teamSeedRoundId]);

  const scoreColumns = tieBreakers.filter((tb) => tb !== "directComparison");
  const hasStandings = !!standings && standings.length > 0;

  const {
    data: teamStandings,
    isLoading: teamStandingsLoading,
    error: teamStandingsError,
  } = useSWR<TeamStanding[]>(
    mode === "teams" && teamSeedRoundId
      ? `/api/tournaments/${tournamentId}/team-standings?seedRoundId=${teamSeedRoundId}&v=${version}`
      : null,
    fetcher
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">
            Current Standings
          </CardTitle>
          <div className="flex overflow-hidden rounded-md border text-xs">
            <button
              type="button"
              className={`px-2 py-1 ${
                mode === "players"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              }`}
              onClick={() => setMode("players")}
            >
              Players
            </button>
            <button
              type="button"
              className={`px-2 py-1 ${
                mode === "teams"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              }`}
              onClick={() => setMode("teams")}
            >
              Teams
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === "teams" && teamRounds.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">From round:</span>
              <select
                className="rounded border bg-background px-2 py-1"
                value={teamSeedRoundId ?? ""}
                onChange={(e) =>
                  setTeamSeedRoundId(
                    e.target.value === "" ? null : e.target.value
                  )
                }
              >
                {teamRounds.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.roundNumber} ({r.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowStandings((prev) => !prev)}
          >
            {showStandings ? (
              <>
                <ChevronDown className="mr-1 h-3 w-3" />
                Hide
              </>
            ) : (
              <>
                <ChevronRight className="mr-1 h-3 w-3" />
                Show
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {showStandings && (
        <CardContent className="pt-0">
          {mode === "players" && (
            <>
              {/* ... loading/empty states ... */}
              {!standingsLoading && !hasStandings && (
                <p className="py-2 text-sm text-muted-foreground">
                  No standings yet. Generate a round and report some results.
                </p>
              )}

              {hasStandings && (
                <>
                  {standingsLoading && (
                    <p className="py-1 text-xs text-muted-foreground">
                      Updating standings...
                    </p>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="py-1 pr-2 text-left">#</th>
                          <th className="py-1 pr-2 text-left">Participant</th>
                          {scoreColumns.map((key) => (
                            <th
                              key={key}
                              className="whitespace-nowrap py-1 pr-2 text-right"
                            >
                              {formatScoreKey(key)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {standings!.map((p, idx) => (
                          <tr key={p._id} className="border-b last:border-0">
                            <td className="py-1 pr-2 text-xs text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="py-1 pr-2">
                              <span className="block truncate font-medium">
                                {p.name}
                              </span>
                              {p.customId && (
                                <span className="block text-xs text-muted-foreground">
                                  {p.customId}
                                </span>
                              )}
                            </td>
                            {scoreColumns.map((key) => (
                              <td
                                key={key}
                                className="py-1 pr-2 text-right text-xs font-medium"
                              >
                                {formatScoreValue(p.scores?.[key] ?? 0)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {mode === "teams" && (
            <>
              {/* ... loading/empty states ... */}
              {teamRounds.length > 0 &&
                !teamStandingsLoading &&
                !teamStandingsError &&
                (!teamStandings || teamStandings.length === 0) && (
                  <p className="py-2 text-sm text-muted-foreground">
                    No teams detected for the selected round.
                  </p>
                )}

              {teamRounds.length > 0 &&
                teamStandings &&
                teamStandings.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="py-1 pr-2 text-left">#</th>
                          <th className="py-1 pr-2 text-left">Team</th>
                          <th className="py-1 pr-2 text-left">Players</th>
                          {scoreColumns.map((key) => (
                            <th
                              key={key}
                              className="whitespace-nowrap py-1 pr-2 text-right"
                            >
                              Total {formatScoreKey(key)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      
                      <tbody>
                        {teamStandings.map((t, idx) => (
                          <tr key={t.key} className="border-b last:border-0">
                            <td className="py-1 pr-2 text-xs text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="py-1 pr-2 text-xs font-semibold">
                              {t.name}
                            </td>
                            <td className="py-1 pr-2 text-xs">
                              {t.players
                                .map((p) => p.name || p._id.slice(-4))
                                .join(", ")}
                            </td>
                            {scoreColumns.map((key) => (
                              <td
                                key={key}
                                className="py-1 pr-2 text-right text-xs font-medium"
                              >
                                {formatScoreValue(t.scores[key] ?? 0)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}