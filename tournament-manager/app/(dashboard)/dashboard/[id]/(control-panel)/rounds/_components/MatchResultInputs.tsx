"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

// --- Types ---
type Mode = "1v1" | "team" | "ffa" | "bye";
type Winner = "A" | "B" | "DRAW" | null;

// --- ResultButtonGroup (Internal Component) ---
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

// --- Helper to get Participant ID (for FFA) ---
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
}

// --- Dumb Component for Rendering Inputs ---
export function MatchResultInputs({
  mode,
  participants,
  winner,
  ffaPlacings,
  teamADisplayName,
  teamBDisplayName,
  onWinnerChange,
  onFfaChange,
}: MatchResultInputsProps) {
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
        {/* Scrollable container for inputs */}
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