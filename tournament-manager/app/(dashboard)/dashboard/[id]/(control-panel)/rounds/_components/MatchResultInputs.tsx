"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

// --- Types ---
type Mode = "1v1" | "team" | "ffa" | "bye";
type Winner = "A" | "B" | "DRAW" | null;

// ... (ResultButtonGroup component is unchanged) ...
function ResultButtonGroup({
  currentWinner,
  labelA,
  labelB,
  onChange,
}: {
  currentWinner: Winner;
  labelA: string;
  labelB: string;
  onChange: (winner: Winner) => void;
}) {
  const baseCn = "h-7 px-2 text-xs";
  const activeCn = "bg-primary text-primary-foreground hover:bg-primary/90";
  const inactiveCn =
    "bg-secondary text-secondary-foreground hover:bg-secondary/80";

  return (
    <div className="flex items-center gap-1 rounded-md border p-0.5">
      <Button
        type="button"
        className={`${baseCn} ${currentWinner === "A" ? activeCn : inactiveCn}`}
        onClick={() => onChange("A")}
      >
        {labelA}
      </Button>
      <Button
        type="button"
        className={`${baseCn} ${currentWinner === "B" ? activeCn : inactiveCn}`}
        onClick={() => onChange("B")}
      >
        {labelB}
      </Button>
      <Button
        type="button"
        className={`${baseCn} ${currentWinner === "DRAW" ? activeCn : inactiveCn}`}
        onClick={() => onChange("DRAW")}
      >
        Draw
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={() => onChange(null)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// --- (NEW) Read-Only Display Component ---
function ReadOnlyResultDisplay({
  mode,
  winner,
  participants,
  teamADisplayName,
  teamBDisplayName,
  ffaPlacings,
}: {
  mode: Mode;
  winner: Winner;
  participants: any[];
  teamADisplayName?: string;
  teamBDisplayName?: string;
  ffaPlacings: Record<string, number | undefined>;
}) {
  const textCn = "text-sm font-medium text-muted-foreground";

  if (mode === "1v1" || mode === "team") {
    let labelA =
      mode === "team"
        ? teamADisplayName || "Team A"
        : participants[0]?.participantId?.name ?? "Player A";
    let labelB =
      mode === "team"
        ? teamBDisplayName || "Team B"
        : participants[1]?.participantId?.name ?? "Player B";

    let resultText = "No result";
    if (winner === "DRAW") resultText = "Draw";
    else if (winner === "A") resultText = `${labelA} won`;
    else if (winner === "B") resultText = `${labelB} won`;

    return <span className={textCn}>{resultText}</span>;
  }

  if (mode === "ffa") {
    const sorted = participants
      .map((p) => ({
        id: getParticipantId(p),
        name:
          p.participantId?.name ||
          (getParticipantId(p) || "N/A").slice(-4),
        place: ffaPlacings[getParticipantId(p)],
      }))
      .sort((a, b) => (a.place ?? 999) - (b.place ?? 999));

    if (sorted.every((p) => !p.place)) {
      return <span className={textCn}>No results</span>;
    }

    return (
      <ol className="flex flex-wrap gap-x-3 gap-y-1">
        {sorted.map(
          (p, idx) =>
            p.place && (
              <li key={p.id} className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{p.place}.</span>{" "}
                {p.name}
              </li>
            )
        )}
      </ol>
    );
  }

  if (mode === "bye") {
    return <div className="text-sm text-muted-foreground">Bye (auto win)</div>;
  }
  return null;
}

// ... (getParticipantId helper is unchanged) ...
function getParticipantId(p: any): string {
  if (typeof p.participantId === "string") {
    return p.participantId;
  }
  if (typeof p.participantId === "object" && p.participantId?._id) {
    return (p.participantId as { _id: string })._id;
  }
  return "";
}

// --- Component Props ---
interface MatchResultInputsProps {
  mode: Mode;
  participants: any[];
  winner: Winner;
  ffaPlacings: Record<string, number | undefined>;
  teamADisplayName?: string;
  teamBDisplayName?: string;
  onWinnerChange: (winner: Winner) => void;
  onFfaChange: (pid: string, value: string) => void;
  isReadOnly?: boolean; // --- (NEW) ---
}

// --- (MODIFIED) Main Component ---
export function MatchResultInputs({
  mode,
  participants,
  winner,
  ffaPlacings,
  teamADisplayName,
  teamBDisplayName,
  onWinnerChange,
  onFfaChange,
  isReadOnly = false, // --- (NEW) ---
}: MatchResultInputsProps) {
  // --- (NEW) Render read-only view ---
  if (isReadOnly) {
    return (
      <ReadOnlyResultDisplay
        mode={mode}
        winner={winner}
        participants={participants}
        teamADisplayName={teamADisplayName}
        teamBDisplayName={teamBDisplayName}
        ffaPlacings={ffaPlacings}
      />
    );
  }

  // --- (EXISTING) Render editable inputs ---
  if (mode === "1v1" && participants.length === 2) {
    return (
      <ResultButtonGroup
        currentWinner={winner}
        labelA={participants[0].participantId?.name ?? "Player A"}
        labelB={participants[1].participantId?.name ?? "Player B"}
        onChange={onWinnerChange}
      />
    );
  }

  if (mode === "team") {
    return (
      <ResultButtonGroup
        currentWinner={winner}
        labelA={teamADisplayName || "Team A"}
        labelB={teamBDisplayName || "Team B"}
        onChange={onWinnerChange}
      />
    );
  }

  if (mode === "ffa") {
    return (
      <div className="flex flex-row items-center gap-2 text-xs flex-1 min-w-0">
        <span className="text-muted-foreground flex-shrink-0">
          Placements:
        </span>
        <div className="overflow-x-auto flex-1">
          <div className="flex flex-row gap-2">
            {participants.map((p) => {
              const pid = getParticipantId(p);
              const name =
                typeof p.participantId === "object" && p.participantId?.name
                  ? p.participantId.name
                  : pid.slice(-4);
              return (
                <div
                  key={pid}
                  className="flex items-center gap-1 flex-shrink-0"
                >
                  <span className="max-w-[80px] truncate">{name}</span>
                  <Input
                    type="number"
                    min={1}
                    placeholder="-"
                    className="h-7 w-14 border-0 border-b rounded-none px-1 text-center shadow-none focus-visible:ring-0"
                    value={ffaPlacings[pid] ?? ""}
                    onChange={(e) => onFfaChange(pid, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "bye") {
    return (
      <div className="text-[11px] text-muted-foreground">Bye (auto win)</div>
    );
  }

  return null;
}