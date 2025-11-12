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
import { Switch } from "@/components/ui/switch";

export type SwissVariant = "GENERIC" | "FIDE_DUTCH";

type RoundSummary = {
  _id: string;
  roundNumber: number;
  system: string;
  status: string;
};

interface SwissOptionsSectionProps {
  swissVariant: SwissVariant;
  onSwissVariantChange: (v: SwissVariant) => void;

  byePoints: number | null;
  onByePointsChange: (value: number | null) => void;

  // <-- Props for avoid rematches -->
  avoidRematches: boolean;
  onAvoidRematchesChange: (value: boolean) => void;

  rounds: RoundSummary[];
  selectedRoundIds: string[];
  isLoadingRounds: boolean;
  onToggleRoundSelection: (id: string) => void;
}

export function SwissOptionsSection({
  swissVariant,
  onSwissVariantChange,
  byePoints,
  onByePointsChange,
  avoidRematches,
  onAvoidRematchesChange,
  rounds,
  selectedRoundIds,
  isLoadingRounds,
  onToggleRoundSelection,
}: SwissOptionsSectionProps) {
  return (
    <div className="space-y-4 rounded-md border p-3">
      <p className="text-sm font-medium">Swiss Options</p>

      <div className="space-y-2">
        <Label htmlFor="variant">Swiss variant</Label>
        <Select
          value={swissVariant}
          onValueChange={(v: SwissVariant) => onSwissVariantChange(v)}
        >
          <SelectTrigger id="variant">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GENERIC">
              Generic Swiss (Monrad-style)
            </SelectItem>
            <SelectItem value="FIDE_DUTCH">
              Official Swiss (FIDE Dutch-style)
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          FIDE Dutch pairs the top half vs the bottom half inside the bracket
          (1-N/2 vs N/2+1-N). Rematches are always avoided unless forced.
        </p>
      </div>

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

      {/* --- ADDED SECTION --- */}
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

      {/* This section is only shown if rematches are on */}
      {avoidRematches && (
        <div className="space-y-2">
          <Label>Ignore rematches from these rounds (optional)</Label>
          {isLoadingRounds && (
            <p className="text-xs text-muted-foreground">Loading rounds...</p>
          )}
          {!isLoadingRounds && rounds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No past rounds yet. Once rounds exist, you can exclude specific ones
              (e.g. fun FFAs) from rematch avoidance.
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
            By default, Swiss avoids rematches across all previous rounds.
            Checking a round here means its pairings are{" "}
            <span className="font-semibold">ignored</span> for rematch history.
          </p>
        </div>
      )}
    </div>
  );
}