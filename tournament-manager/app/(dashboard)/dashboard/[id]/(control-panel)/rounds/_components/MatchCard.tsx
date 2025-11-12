"use client";

import React from "react";
import { SerializedMatch } from "@/lib/types";
import { makeTeamLookupKey } from "@/lib/utils";
import { MatchResultStatsTable } from "./MatchResultForm";
import { useMatchState } from "./useMatchState"; // <-- IMPORT THE HOOK
import { MatchResultInputs } from "./MatchResultInputs"; // <-- IMPORT THE INPUTS

// ---- Helper Functions (Rendering Only) ----

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

function getParticipantId(p: any): string {
  if (typeof p.participantId === "string") {
    return p.participantId;
  }
  if (typeof p.participantId === "object" && p.participantId?._id) {
    return (p.participantId as { _id: string })._id;
  }
  return "";
}

// ---- Match card (Now a Clean Container) ------------------------------

interface MatchCardProps {
  match: SerializedMatch;
  customStats: string[];
  teamNameMap: Map<string, string>;
  onResultChanged: () => void;
}

export function MatchCard({
  match,
  customStats,
  teamNameMap,
  onResultChanged,
}: MatchCardProps) {
  // --- All logic is now handled by this single hook ---
  const {
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
  } = useMatchState({
    match,
    statNames: customStats,
    onResultChanged,
  });

  const [showPlayers, setShowPlayers] = React.useState(false);

  // --- Data for rendering ---
  const hasTeams = participants.some((p) => p.team);
  const teamAPlayers = hasTeams
    ? participants.filter((p) => (p.team ?? "").toUpperCase() === "A")
    : [];
  const teamBPlayers = hasTeams
    ? participants.filter((p) => (p.team ?? "").toUpperCase() === "B")
    : [];

  const isCompleted = match.status === "completed";
  const teamNames: Record<string, string> =
    (match as any).teamNames || {};

  const teamAPlayerIds = teamAPlayers.map(getParticipantId);
  const lookupKeyA = makeTeamLookupKey(teamAPlayerIds);
  const teamADisplay =
    teamNameMap.get(lookupKeyA) || teamNames.A || "Team A";

  const teamBPlayerIds = teamBPlayers.map(getParticipantId);
  const lookupKeyB = makeTeamLookupKey(teamBPlayerIds);
  const teamBDisplay =
    teamNameMap.get(lookupKeyB) || teamNames.B || "Team B";

  const title = hasTeams
    ? `${teamADisplay} vs ${teamBDisplay}`
    : (match.participants as any[])
        .map((p: any) => getParticipantName(p))
        .join(" vs ");

  // --- RENDER (Declarative JSX) ---
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card/40 px-3 py-2">
      {/* --- Header Row --- */}
      <div className="relative flex min-h-[28px] items-center justify-between gap-3">
        {/* Left: Title (Scrollable) & Status */}
        <div className="min-w-0 flex-shrink-0 max-w-xs md:max-w-md lg:max-w-lg overflow-x-auto">
          <p className="whitespace-nowrap text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
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

        {/* Right: Result Inputs (Flexible) */}
        <div className="flex-1 flex-shrink min-w-0 flex justify-end">
          {submitting && (
            <span className="absolute -top-1 right-0 text-[10px] text-muted-foreground">
              Saving…
            </span>
          )}

          {/* --- Use the new dumb component --- */}
          <MatchResultInputs
            mode={mode}
            participants={participants}
            winner={winner}
            ffaPlacings={ffaPlacings}
            teamADisplayName={teamADisplay}
            teamBDisplayName={teamBDisplay}
            onWinnerChange={handleWinnerChange}
            onFfaChange={handleFfaChange}
          />
        </div>
      </div>
      {/* --- END OF HEADER ROW --- */}

      {/* --- Body Row (Stats) --- */}
      {customStats.length > 0 && (
        <MatchResultStatsTable
          participants={participants}
          statNames={customStats}
          statsState={statsState}
          statsCollapsed={statsCollapsed}
          onToggleCollapse={toggleStats}
          onStatsChange={updateStat}
        />
      )}

      {error && (
        <p className="text-[11px] text-red-500" role="alert">
          {error}
        </p>
      )}

      {/* --- Player list (unchanged) --- */}
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