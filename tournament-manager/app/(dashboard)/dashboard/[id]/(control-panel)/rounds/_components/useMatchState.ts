"use client";

import React from "react";
import { SerializedMatch } from "@/lib/types";

type Mode = "1v1" | "team" | "ffa" | "bye";
type Winner = "A" | "B" | "DRAW" | null;

function getParticipantId(p: any): string {
  if (typeof p?.participantId === "string") {
    return p.participantId;
  }
  if (
    typeof p?.participantId === "object" &&
    p.participantId &&
    (p.participantId as { _id?: string })._id
  ) {
    return (p.participantId as { _id: string })._id;
  }
  return "";
}

function detectMode(match: SerializedMatch): Mode {
  const parts = ((match as any).participants as any[]) ?? [];

  if (parts.length === 0) return "ffa"; // harmless fallback
  if (parts.length === 1) return "bye";

  const hasTeam = parts.some((p: any) => p?.team);
  if (hasTeam) return "team";
  if (parts.length === 2) return "1v1";
  return "ffa";
}

function ordinal(n: number): string {
  if (n <= 0 || !Number.isFinite(n)) return "";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface UseMatchStateProps {
  match: SerializedMatch;
  statNames: string[];
  onResultChanged: () => void;
  isReadOnly?: boolean;
}

export function useMatchState({
  match,
  statNames,
  onResultChanged,
  isReadOnly = false,
}: UseMatchStateProps) {
  const participants = ((match as any).participants as any[]) ?? [];
  const mode = detectMode(match);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [winner, setWinner] = React.useState<Winner>(null);
  const [winnerTouched, setWinnerTouched] = React.useState(false);
  const [ffaPlacings, setFfaPlacings] = React.useState<
    Record<string, number | undefined>
  >({});
  const [statsState, setStatsState] = React.useState<
    Record<string, Record<string, number>>
  >({});
  
  const [statsCollapsed, setStatsCollapsed] = React.useState(true);
  
  // --- REFS ---
  const isHydrating = React.useRef(true);
  // Track previous status to detect transitions (pending -> completed)
  const prevStatusRef = React.useRef(match.status);
  
  const [hasTouched, setHasTouched] = React.useState(false);

  React.useEffect(() => {
    const participants = ((match as any).participants as any[]) ?? [];

    setWinner(null);
    setWinnerTouched(false);
    const nextFfaPlacings: Record<string, number | undefined> = {};
    const nextStats: Record<string, Record<string, number>> = {};

    if (mode === "1v1" && participants.length === 2) {
      const a = participants[0];
      const b = participants[1];
      const resA = (a.result || "").toLowerCase();
      const resB = (b.result || "").toLowerCase();
      if (resA === "win" && resB === "loss") setWinner("A");
      else if (resA === "loss" && resB === "win") setWinner("B");
      else if (resA === "draw" && resB === "draw") setWinner("DRAW");
      else setWinner(null);
    }

    if (mode === "team") {
      let teamARes: string | null = null;
      let teamBRes: string | null = null;
      for (const p of participants) {
        const team = (p.team ?? "").toString().toUpperCase();
        const res = (p.result || "").toLowerCase();
        if (team === "A") teamARes = res;
        if (team === "B") teamBRes = res;
      }
      if (teamARes === "win" && teamBRes === "loss") setWinner("A");
      else if (teamARes === "loss" && teamBRes === "win") setWinner("B");
      else if (teamARes === "draw" && teamBRes === "draw") setWinner("DRAW");
      else setWinner(null);
    }

    if (mode === "ffa") {
      for (const p of participants) {
        const pid = getParticipantId(p);
        const res = (p.result || "") as string;
        const n = parseInt(res, 10);
        if (!Number.isNaN(n)) nextFfaPlacings[pid] = n;
      }
    }

    let hasAnyStats = false;
    for (const p of participants) {
      const pid = getParticipantId(p);
      const stats: Record<string, number> = {};
      const raw = (p as any).customStats ?? {};
      let obj: Record<string, number> = {};
      if (raw instanceof Map) obj = Object.fromEntries(raw.entries());
      else obj = raw as Record<string, number>;

      for (const statName of statNames) {
        const val = obj?.[statName];
        if (typeof val === "number" && Number.isFinite(val)) {
          stats[statName] = val;
          if (val !== 0) hasAnyStats = true;
        }
      }
      if (Object.keys(stats).length > 0) nextStats[pid] = stats;
    }

    setFfaPlacings(nextFfaPlacings);
    setStatsState(nextStats);
    
    const isCompleted = match.status === "completed";
    const statusChanged = match.status !== prevStatusRef.current;

    if (isHydrating.current) {
      setStatsCollapsed(!hasAnyStats || isCompleted);
    } else {
      if (isCompleted) {
        if (statusChanged || !hasAnyStats) {
          setStatsCollapsed(true);
        }
      } else {
        setStatsCollapsed(!hasAnyStats);
      }
    }
    
    prevStatusRef.current = match.status;

    setError(null);
    setHasTouched(false);
    isHydrating.current = false;
  }, [
    match._id,
    match.status,
    mode,
    JSON.stringify((match as any).participants ?? []),
    JSON.stringify(statNames),
  ]);

  const save = React.useCallback(async () => {
    if (isHydrating.current || !hasTouched || isReadOnly) return;

    setSubmitting(true);
    setError(null);

    try {
      const participantsPayload: {
        participantId: string;
        result: string;
        pointsAwarded: number;
        customStats: Record<string, number>;
      }[] = [];

      const participants = ((match as any).participants as any[]) ?? [];
      const a = participants[0] as any;
      const b = participants[1] as any;

      for (const p of participants) {
        const pid = getParticipantId(p);
        if (!pid) continue;

        let result = "";
        const customStatsMap = statsState[pid] ?? {};
        const customStatsClean: Record<string, number> = {};

        for (const statName of statNames) {
          const val = customStatsMap[statName];
          customStatsClean[statName] = Number.isFinite(val) ? val : 0;
        }

        if (mode === "1v1") {
          if (!winnerTouched) result = (p.result as string) || "";
          else if (winner === null) result = "";
          else {
            const isA = pid === getParticipantId(a);
            if (winner === "DRAW") result = "draw";
            else if (winner === "A") result = isA ? "win" : "loss";
            else result = isA ? "loss" : "win";
          }
        } else if (mode === "team") {
          if (!winnerTouched) result = (p.result as string) || "";
          else if (winner === null) result = "";
          else {
            const team = (p.team ?? "").toString().toUpperCase();
            if (winner === "DRAW") result = "draw";
            else if (winner === "A") result = team === "A" ? "win" : "loss";
            else result = team === "B" ? "win" : "loss";
          }
        } else if (mode === "ffa") {
          const placement = ffaPlacings[pid];
          if (!placement) result = "";
          else result = ordinal(placement);
        } else {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: participantsPayload }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Failed to save result.");
        return;
      }

      onResultChanged();
    } catch (err: any) {
      console.error("Error reporting match result:", err);
      setError(err.message || "Unexpected error while saving result.");
    } finally {
      setSubmitting(false);
    }
  }, [
    match._id,
    (match as any).participants,
    mode,
    hasTouched,
    isReadOnly,
    statsState,
    statNames,
    winner,
    winnerTouched,
    ffaPlacings,
    onResultChanged,
  ]);

  React.useEffect(() => {
    if (isHydrating.current || !hasTouched) return;
    const timer = setTimeout(() => save(), 500);
    return () => clearTimeout(timer);
  }, [hasTouched, winner, ffaPlacings, statsState, save]);

  function updateStat(participantId: string, statName: string, value: number) {
    if (isReadOnly) return;
    setStatsState((prev) => ({
      ...prev,
      [participantId]: {
        ...(prev[participantId] ?? {}),
        [statName]: value,
      },
    }));
    setHasTouched(true);
  }

  function handleWinnerChange(newWinner: Winner) {
    if (isReadOnly) return;
    setWinner(newWinner);
    setWinnerTouched(true);
    setHasTouched(true);
  }

  function handleFfaChange(pid: string, value: string) {
    if (isReadOnly) return;
    setFfaPlacings((prev) => ({
      ...prev,
      [pid]: value === "" ? undefined : Number(value),
    }));
    setHasTouched(true);
  }

  function toggleStats() {
    setStatsCollapsed((s) => !s);
  }

  return {
    participants,
    mode,
    submitting,
    error,
    winner,
    ffaPlacings,
    statsState,
    statsCollapsed,
    handleWinnerChange,
    handleFfaChange,
    updateStat,
    toggleStats,
  };
}