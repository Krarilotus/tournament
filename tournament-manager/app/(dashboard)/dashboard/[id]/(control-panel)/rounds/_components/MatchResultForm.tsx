"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface MatchResultStatsTableProps {
  participants: any[]; // The participants from the match
  statNames: string[]; // List of custom stats
  statsState: Record<string, Record<string, number>>; // The current state of stats
  statsCollapsed: boolean; // If the table is visible
  onToggleCollapse: () => void; // Callback to toggle visibility
  onStatsChange: (pid: string, statName: string, value: number) => void; // Callback to update state
}

function getParticipantIdRaw(p: any): string {
  if (typeof p.participantId === "string") return p.participantId;
  if (p.participantId && typeof p.participantId === "object") {
    return p.participantId._id?.toString() ?? "";
  }
  return "";
}

export function MatchResultStatsTable({
  participants,
  statNames,
  statsState,
  statsCollapsed,
  onToggleCollapse,
  onStatsChange,
}: MatchResultStatsTableProps) {
  if (statNames.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-row items-start gap-1 text-xs">
      {/* Column 1: The Toggle Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 justify-start px-1 text-xs text-muted-foreground"
        onClick={onToggleCollapse}
      >
        {statsCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span className="sr-only">
          {statsCollapsed ? "Show" : "Hide"} Custom Stats
        </span>
      </Button>

      {/* Column 2: Content (Text or Table) */}
      <div className="pt-1 min-w-0">
        {statsCollapsed ? (
          <span
            className="text-muted-foreground cursor-pointer hover:underline"
            onClick={onToggleCollapse}
          >
            Custom Stats
          </span>
        ) : (
          <div className="flex w-full max-w-full rounded-md border p-2">
            {/* --- Column 1: Static Player Names --- */}
            <div className="w-[150px] flex-shrink-0 space-y-1">
              {/* Player Header */}
              <div className="pr-2 text-[10px] font-medium text-muted-foreground h-4 flex items-center">
                Player
              </div>
              {/* Player Names */}
              {participants.map((p) => {
                const name =
                  typeof p.participantId === "object" && p.participantId?.name
                    ? p.participantId.name
                    : getParticipantIdRaw(p).slice(-4);
                return (
                  <div
                    key={getParticipantIdRaw(p)}
                    className="truncate pr-2 text-[11px] h-7 flex items-center"
                  >
                    {name}
                  </div>
                );
              })}
            </div>

            {/* --- Column 2: Scrollable Stats Grid --- */}
            <div className="flex-1 overflow-x-auto">
              <div
                className="grid items-center gap-x-2 gap-y-1"
                style={{
                  gridTemplateColumns: `repeat(${statNames.length}, minmax(64px, 80px))`,
                }}
              >
                {/* Header Row (Stats Only) */}
                {statNames.map((statName) => (
                  <div
                    key={statName}
                    /* --- MODIFIED: Removed text-center, added pl-1 --- */
                    className="truncate text-[10px] font-medium text-muted-foreground h-4 flex items-center justify-start pl-1"
                  >
                    {statName}
                  </div>
                ))}

                {/* Player Rows (Inputs Only) */}
                {participants.map((p) => {
                  const pid = getParticipantIdRaw(p);
                  return (
                    <React.Fragment key={pid}>
                      {/* Stat Inputs */}
                      {statNames.map((statName) => (
                        <Input
                          key={`${pid}-${statName}`}
                          id={`${pid}-${statName}`}
                          type="number"
                          min={0}
                          placeholder="0"
                          /* --- MODIFIED: Removed text-center --- */
                          className="h-7 w-full border-0 border-b rounded-none px-1 shadow-none focus-visible:ring-0"
                          value={statsState[pid]?.[statName] ?? ""}
                          onChange={(e) =>
                            onStatsChange(
                              pid,
                              statName,
                              e.target.value === "" ? 0 : Number(e.target.value)
                            )
                          }
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}