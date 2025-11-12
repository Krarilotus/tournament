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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type RoundSummary = {
  _id: string;
  roundNumber: number;
  system: string;
  status: string;
};

type TeamPersistenceMode = "NEW_TEAMS" | "REUSE_FROM_ROUND";
type TeamMethod = "BALANCE_FIRST_LAST" | "RANDOM";

interface TeamOptionsSectionProps {
  teamSize: number;
  onTeamSizeChange: (value: number) => void;

  teamMethod: TeamMethod;
  onTeamMethodChange: (value: TeamMethod) => void;

  teamPersistenceMode: TeamPersistenceMode;
  onTeamPersistenceModeChange: (value: TeamPersistenceMode) => void;

  teamPersistenceRoundId: string | null;
  onTeamPersistenceRoundIdChange: (value: string | null) => void;

  rounds: RoundSummary[];
  isLoadingRounds: boolean;
}

export function TeamOptionsSection({
  teamSize,
  onTeamSizeChange,
  teamMethod,
  onTeamMethodChange,
  teamPersistenceMode,
  onTeamPersistenceModeChange,
  teamPersistenceRoundId,
  onTeamPersistenceRoundIdChange,
  rounds,
  isLoadingRounds,
}: TeamOptionsSectionProps) {
  const teamRounds = rounds
    .filter((r) => r.system === "team-2v2")
    .sort((a, b) => a.roundNumber - b.roundNumber);

  return (
    <div className="space-y-4 rounded-md border p-3">
      <p className="text-sm font-medium">Team Options</p>

      <div className="space-y-2">
        <Label htmlFor="teamSize">Players per team</Label>
        <Input
          id="teamSize"
          type="number"
          min={2}
          max={50}
          value={teamSize}
          onChange={(e) =>
            onTeamSizeChange(
              Math.max(2, Math.min(50, Number(e.target.value) || 2))
            )
          }
        />
        <p className="text-xs text-muted-foreground">
          Teams can be 2v2 up to 50v50. 2v2 uses a strict first+last pairing;
          larger teams use balanced grouping based on current standings.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="teamMethod">Team formation</Label>
        <Select
          value={teamMethod}
          onValueChange={(v: TeamMethod) => onTeamMethodChange(v)}
        >
          <SelectTrigger id="teamMethod">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BALANCE_FIRST_LAST">
              Balance (1st + last, 2nd + second last, ...)
            </SelectItem>
            <SelectItem value="RANDOM">Random teams</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Team persistence</Label>
        <RadioGroup
          value={teamPersistenceMode}
          onValueChange={(v: TeamPersistenceMode) =>
            onTeamPersistenceModeChange(v)
          }
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="NEW_TEAMS" id="tp-new" />
            <Label htmlFor="tp-new" className="text-xs">
              Create new teams from current standings
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="REUSE_FROM_ROUND" id="tp-reuse" />
            <Label htmlFor="tp-reuse" className="text-xs">
              Reuse teams from a previous team round
            </Label>
          </div>
        </RadioGroup>
      </div>

      {teamPersistenceMode === "REUSE_FROM_ROUND" && (
        <div className="space-y-2">
          <Label htmlFor="teamPersistenceRoundId">
            Base teams on round
          </Label>
          {isLoadingRounds && (
            <p className="text-xs text-muted-foreground">Loading rounds...</p>
          )}
          {!isLoadingRounds && teamRounds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No previous team rounds yet. Generate at least one team round to
              reuse its teams.
            </p>
          )}
          {!isLoadingRounds && teamRounds.length > 0 && (
            <Select
              value={teamPersistenceRoundId ?? ""}
              onValueChange={(v) =>
                onTeamPersistenceRoundIdChange(v === "" ? null : v)
              }
            >
              <SelectTrigger id="teamPersistenceRoundId">
                <SelectValue placeholder="Select a team round..." />
              </SelectTrigger>
              <SelectContent>
                {teamRounds.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    Round {r.roundNumber} ({r.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            The selected team round is used as a template: each team from that
            round is kept together, and any new players are added via the
            balanced team builder.
          </p>
        </div>
      )}
    </div>
  );
}
