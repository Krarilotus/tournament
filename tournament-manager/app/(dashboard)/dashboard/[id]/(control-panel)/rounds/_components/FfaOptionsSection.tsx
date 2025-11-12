"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; // <-- ADDED

export type GroupMethod = "SIMPLE_CHUNK" | "SWISS_GROUPING";

// <-- ADDED: RoundSummary type -->
type RoundSummary = {
  _id: string;
  roundNumber: number;
  system: string;
  status: string;
};

interface FfaOptionsSectionProps {
  groupSize: number;
  onGroupSizeChange: (value: number) => void;

  groupMethod: GroupMethod;
  onGroupMethodChange: (value: GroupMethod) => void;

  placementsByPlace: Record<number, number>;
  onPlacementsChange: (place: number, points: number) => void;

  // <-- ADDED: Props for new UI -->
  byePoints: number | null;
  onByePointsChange: (value: number | null) => void;
  
  avoidRematches: boolean;
  onAvoidRematchesChange: (value: boolean) => void;

  rounds: RoundSummary[];
  selectedRoundIds: string[];
  isLoadingRounds: boolean;
  onToggleRoundSelection: (id: string) => void;
  // <-- END ADDED -->
}

export function FfaOptionsSection({
  groupSize,
  onGroupSizeChange,
  groupMethod,
  onGroupMethodChange,
  placementsByPlace,
  onPlacementsChange,
  // <-- ADDED: Destructure new props -->
  byePoints,
  onByePointsChange,
  avoidRematches,
  onAvoidRematchesChange,
  rounds,
  selectedRoundIds,
  isLoadingRounds,
  onToggleRoundSelection,
}: FfaOptionsSectionProps) {
  return (
    <div className="space-y-4 rounded-md border p-3">
      <p className="text-sm font-medium">FFA Options</p>

      <div className="space-y-2">
        <Label htmlFor="groupSize">Players per match (N)</Label>
        <Input
          id="groupSize"
          type="number"
          min={2}
          max={16}
          value={groupSize}
          onChange={(e) => {
            const next = Math.max(
              2,
              Math.min(16, Number(e.target.value) || 2)
            );
            onGroupSizeChange(next);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="groupMethod">Grouping Method</Label>
        <Select
          value={groupMethod}
          onValueChange={(v: GroupMethod) => onGroupMethodChange(v)}
        >
          <SelectTrigger id="groupMethod">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SIMPLE_CHUNK">
              Simple chunk (top N, next N...)
            </SelectItem>
            <SelectItem value="SWISS_GROUPING">
              Swiss-like grouping (with rematch avoidance)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Points per placement</Label>
        <p className="text-xs text-muted-foreground">
          Define how many points each place gets in this FFA round.
          These override the global win/draw/loss scoring.
        </p>
        <div className="space-y-1">
          {Array.from({ length: groupSize }, (_, i) => i + 1).map((place) => (
            <div
              key={place}
              className="flex items-center justify-between gap-2"
            >
              <span className="w-16 text-xs">Place {place}</span>
              <Input
                type="number"
                className="w-24"
                value={placementsByPlace[place] ?? 0}
                onChange={(e) =>
                  onPlacementsChange(
                    place,
                    e.target.value === "" ? 0 : Number(e.target.value)
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* --- ADDED SECTION --- */}
      {/* This UI is copied from SwissOptionsSection for consistency */}

      <div className="space-y-2">
        <Label htmlFor="byePoints">Bye points (optional)</Label>
        <Input
          id="byePoints"
          type="number"
          placeholder="Leave empty to use global Win points"
          value={byePoints === null ? "" : byePoints}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") onByePointsChange(null);
            else onByePointsChange(Number(val));
          }}
        />
        <p className="text-xs text-muted-foreground">
          Applies when a player gets a free round (bye). If empty, uses the
          tournament&apos;s global Win points.
        </p>
      </div>
      
      <div className="flex items-center justify-between space-x-2 rounded-md border p-3">
        <Label htmlFor="avoidRematches" className="flex flex-col space-y-1">
          <span>Avoid rematches</span>
          <span className="font-normal text-xs text-muted-foreground">
            {avoidRematches
              ? "Will try to pair players who haven't met."
              : "Will pair players regardless of history."}
          </span>
        </Label>
        <Switch
          id="avoidRematches"
          checked={avoidRematches}
          onCheckedChange={onAvoidRematchesChange}
        />
      </div>

      {avoidRematches && (
        <div className="space-y-2">
          <Label>Ignore rematches from these rounds (optional)</Label>
          {isLoadingRounds && (
            <p className="text-xs text-muted-foreground">Loading rounds...</p>
          )}
          {!isLoadingRounds && rounds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No past rounds yet.
            </p>
          )}
          {!isLoadingRounds && rounds.length > 0 && (
            <div className="max-h-32 space-y-1 overflow-auto rounded border p-2 text-xs">
              {rounds
                .slice()
                .sort((a, b) => a.roundNumber - b.roundNumber)
                .map((round) => (
                  <label
                    key={round._id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      Round {round.roundNumber}{" "}
                      <span className="text-muted-foreground">
                        ({round.status})
                      </span>{" "}
                      - {round.system}
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedRoundIds.includes(round._id)}
                      onChange={() => onToggleRoundSelection(round._id)}
                    />
                  </label>
                ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Checking a round here means its pairings are{" "}
            <span className="font-semibold">ignored</span> for rematch history.
          </p>
        </div>
      )}
      {/* --- END ADDED SECTION --- */}
    </div>
  );
}