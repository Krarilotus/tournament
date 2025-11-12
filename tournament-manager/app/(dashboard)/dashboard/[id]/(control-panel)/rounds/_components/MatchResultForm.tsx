"use client";

import * as React from "react";
import { SerializedMatch } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Mode = "1v1" | "team" | "ffa" | "bye";

export interface MatchResultFormProps {
  match: SerializedMatch;
  customStats?: string[];
  onResultReported: () => void;
}

function detectMode(match: SerializedMatch): Mode {
  const parts = match.participants as any[];
  if (parts.length === 1) return "bye";
  const hasTeam = parts.some((p: any) => p.team);
  if (hasTeam) return "team";
  if (parts.length === 2) return "1v1";
  return "ffa";
}

function getParticipantIdRaw(p: any): string {
  if (typeof p.participantId === "string") return p.participantId;
  if (p.participantId && typeof p.participantId === "object") {
    return p.participantId._id?.toString() ?? "";
  }
  return "";
}

function ordinal(n: number): string {
  if (n <= 0 || !Number.isFinite(n)) return "";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function MatchResultForm({
  match,
  customStats,
  onResultReported,
}: MatchResultFormProps) {
  const mode = detectMode(match);
  const statNames = customStats ?? [];

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  type Winner = "A" | "B" | "DRAW" | null;
  const [winner, setWinner] = React.useState<Winner>(null);
  const [winnerTouched, setWinnerTouched] = React.useState(false);

  const [ffaPlacings, setFfaPlacings] = React.useState<
    Record<string, number | undefined>
  >({});
  const [statsState, setStatsState] = React.useState<
    Record<string, Record<string, number>>
  >({});

  const isHydrating = React.useRef(true);
  const [hasTouched, setHasTouched] = React.useState(false);

  // Hydrate from existing match data whenever participants change
  React.useEffect(() => {
    const participants = match.participants as any[];

    setWinner(null);
    setWinnerTouched(false);
    const nextFfaPlacings: Record<string, number | undefined> = {};
    const nextStats: Record<string, Record<string, number>> = {};

    // 1v1 winner
    if (mode === "1v1" && participants.length === 2) {
      const a = participants[0];
      const b = participants[1];
      const resA = (a.result || "").toLowerCase();
      const resB = (b.result || "").toLowerCase();
      if (resA === "win" && resB === "loss") {
        setWinner("A");
      } else if (resA === "loss" && resB === "win") {
        setWinner("B");
      } else if (resA === "draw" && resB === "draw") {
        setWinner("DRAW");
      } else {
        setWinner(null);
      }
    }

    // Team winner
    if (mode === "team") {
      let teamARes: string | null = null;
      let teamBRes: string | null = null;
      for (const p of participants) {
        const team = (p.team ?? "").toString().toUpperCase();
        const res = (p.result || "").toLowerCase();
        if (team === "A") teamARes = res;
        if (team === "B") teamBRes = res;
      }
      if (teamARes === "win" && teamBRes === "loss") {
        setWinner("A");
      } else if (teamARes === "loss" && teamBRes === "win") {
        setWinner("B");
      } else if (teamARes === "draw" && teamBRes === "draw") {
        setWinner("DRAW");
      } else {
        setWinner(null);
      }
    }

    // FFA placements from results like "1st", "2nd"
    if (mode === "ffa") {
      for (const p of participants) {
        const pid = getParticipantIdRaw(p);
        const res = (p.result || "") as string;
        const n = parseInt(res, 10);
        if (!Number.isNaN(n)) {
          nextFfaPlacings[pid] = n;
        }
      }
    }

    // Custom stats
    for (const p of participants) {
      const pid = getParticipantIdRaw(p);
      const stats: Record<string, number> = {};
      const raw = (p as any).customStats ?? {};
      let obj: Record<string, number> = {};
      if (raw instanceof Map) {
        obj = Object.fromEntries(raw.entries());
      } else {
        obj = raw as Record<string, number>;
      }

      for (const statName of statNames) {
        const val = obj?.[statName];
        if (typeof val === "number" && Number.isFinite(val)) {
          stats[statName] = val;
        }
      }
      if (Object.keys(stats).length > 0) {
        nextStats[pid] = stats;
      }
    }

    setFfaPlacings(nextFfaPlacings);
    setStatsState(nextStats);
    setError(null);
    setHasTouched(false);
    isHydrating.current = false;
  }, [
    match._id,
    mode,
    JSON.stringify(match.participants),
    JSON.stringify(statNames),
  ]);

  function updateStat(
    participantId: string,
    statName: string,
    value: number
  ) {
    setStatsState((prev) => ({
      ...prev,
      [participantId]: {
        ...(prev[participantId] ?? {}),
        [statName]: value,
      },
    }));
    setHasTouched(true);
  }

  async function save() {
    if (isHydrating.current || !hasTouched) return;

    setSubmitting(true);
    setError(null);

    try {
      const participantsPayload: {
        participantId: string;
        result: string;
        pointsAwarded: number;
        customStats: Record<string, number>;
      }[] = [];

      const participants = match.participants as any[];
      const a = participants[0] as any;
      const b = participants[1] as any;

      for (const p of participants) {
        const pid = getParticipantIdRaw(p);
        if (!pid) continue;

        let result = "";
        const customStatsMap = statsState[pid] ?? {};
        const customStatsClean: Record<string, number> = {};

        for (const statName of statNames) {
          const val = customStatsMap[statName];
          customStatsClean[statName] = Number.isFinite(val) ? val : 0;
        }

        if (mode === "1v1") {
          if (!winnerTouched) {
            // Keep whatever is in DB if user never touched the winner selector
            result = (p.result as string) || "";
          } else if (winner === null) {
            // Explicit "Clear result"
            result = "";
          } else {
            const isA = pid === getParticipantIdRaw(a);
            if (winner === "DRAW") {
              result = "draw";
            } else if (winner === "A") {
              result = isA ? "win" : "loss";
            } else {
              result = isA ? "loss" : "win";
            }
          }
        } else if (mode === "team") {
          if (!winnerTouched) {
            result = (p.result as string) || "";
          } else if (winner === null) {
            result = "";
          } else {
            const team = (p.team ?? "").toString().toUpperCase();
            if (winner === "DRAW") {
              result = "draw";
            } else if (winner === "A") {
              result = team === "A" ? "win" : "loss";
            } else {
              result = team === "B" ? "win" : "loss";
            }
          }
        } else if (mode === "ffa") {
          const placement = ffaPlacings[pid];
          if (!placement) {
            result = "";
          } else {
            result = ordinal(placement);
          }
        } else {
          // bye: read-only for now; keep DB value
          result = (p.result as string) || "";
        }

        participantsPayload.push({
          participantId: pid,
          result,
          pointsAwarded: 0,
          customStats: customStatsClean,
        });
      }

      const res = await fetch(`/api/matches/${match._id}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participants: participantsPayload }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Failed to save result.");
        return;
      }

      onResultReported();
    } catch (err: any) {
      console.error("Error reporting match result:", err);
      setError(err.message || "Unexpected error while saving result.");
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-save whenever something meaningful changes
  React.useEffect(() => {
    if (isHydrating.current || !hasTouched) return;
    void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasTouched,
    winner,
    JSON.stringify(ffaPlacings),
    JSON.stringify(statsState),
  ]);

  const participants = match.participants as any[];

  // --- RENDER ---

  // Bye matches: read-only label, no inputs
  if (mode === "bye" && participants.length === 1) {
    const p = participants[0];
    const name =
      typeof p.participantId === "object" && p.participantId?.name
        ? p.participantId.name
        : getParticipantIdRaw(p).slice(-4);

    return (
      <div className="text-[11px] text-muted-foreground">
        Bye (auto win for {name})
      </div>
    );
  }

    return (
    <div className="relative flex flex-col items-end gap-1 text-xs">
      {submitting && (
        <span className="absolute -top-3 right-0 text-[10px] text-muted-foreground">
          Saving…
        </span>
      )}

      {/* Mode-specific result UI */}
      {mode === "1v1" && participants.length === 2 && (
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground md:inline">
            Result:
          </span>
          <Select
            value={winner ?? "NONE"}
            onValueChange={(v: "A" | "B" | "DRAW" | "NONE") => {
              setWinner(v === "NONE" ? null : v);
              setWinnerTouched(true);
              setHasTouched(true);
            }}
          >
            <SelectTrigger className="h-7 w-44">
              <SelectValue placeholder="Set result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">
                {participants[0].participantId?.name ?? "Player A"} wins
              </SelectItem>
              <SelectItem value="B">
                {participants[1].participantId?.name ?? "Player B"} wins
              </SelectItem>
              <SelectItem value="DRAW">Draw</SelectItem>
              <SelectItem value="NONE">Clear result</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {mode === "team" && (
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground md:inline">
            Result:
          </span>
          <Select
            value={winner ?? "NONE"}
            onValueChange={(v: "A" | "B" | "DRAW" | "NONE") => {
              setWinner(v === "NONE" ? null : v);
              setWinnerTouched(true);
              setHasTouched(true);
            }}
          >
            <SelectTrigger className="h-7 w-44">
              <SelectValue placeholder="Set result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">Team A wins</SelectItem>
              <SelectItem value="B">Team B wins</SelectItem>
              <SelectItem value="DRAW">Draw</SelectItem>
              <SelectItem value="NONE">Clear result</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {mode === "ffa" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground md:inline">
            Placements:
          </span>
          {participants.map((p) => {
            const pid = getParticipantIdRaw(p);
            const name =
              typeof p.participantId === "object" && p.participantId?.name
                ? p.participantId.name
                : pid.slice(-4);
            return (
              <div key={pid} className="flex items-center gap-1">
                <span className="max-w-[80px] truncate text-[11px]">
                  {name}
                </span>
                <Input
                  type="number"
                  min={1}
                  className="h-7 w-14"
                  value={ffaPlacings[pid] ?? ""}
                  onChange={(e) => {
                    setFfaPlacings((prev) => ({
                      ...prev,
                      [pid]:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }));
                    setHasTouched(true);
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Custom stats per participant */}
      {statNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground md:inline">
            Stats:
          </span>
          {participants.map((p) => {
            const pid = getParticipantIdRaw(p);
            const name =
              typeof p.participantId === "object" && p.participantId?.name
                ? p.participantId.name
                : pid.slice(-4);

            return (
              <div key={pid} className="flex items-center gap-1">
                <span className="max-w-[80px] truncate text-[11px]">
                  {name}
                </span>
                {statNames.map((statName) => (
                  <div
                    key={`${pid}-${statName}`}
                    className="flex items-center gap-1"
                  >
                    <Label
                      htmlFor={`${pid}-${statName}`}
                      className="text-[10px]"
                    >
                      {statName}
                    </Label>
                    <Input
                      id={`${pid}-${statName}`}
                      type="number"
                      min={0}
                      className="h-7 w-16"
                      value={statsState[pid]?.[statName] ?? ""}
                      onChange={(e) =>
                        updateStat(
                          pid,
                          statName,
                          e.target.value === ""
                            ? 0
                            : Number(e.target.value)
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
