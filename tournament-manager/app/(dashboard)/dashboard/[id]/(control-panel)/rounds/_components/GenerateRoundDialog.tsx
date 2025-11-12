"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { SwissOptionsSection, SwissVariant } from "./SwissOptionsSection";
import { FfaOptionsSection, GroupMethod } from "./FfaOptionsSection";
import { TeamOptionsSection } from "./TeamOptionsSection";
import { CustomPairingsSection } from "./CustomPairingsSection";

// --- types ----------------------------------------------------------

type System = "swiss-1v1" | "n-ffa" | "team-2v2" | "custom";
export type TeamMethod = "BALANCE_FIRST_LAST" | "RANDOM";

interface GenerateRoundDialogProps {
  tournamentId: string;
  onRoundGenerated: () => void;
}

type RoundSummary = {
  _id: string;
  roundNumber: number;
  system: string;
  status: string;
};

type TeamPersistenceMode = "NEW_TEAMS" | "REUSE_FROM_ROUND";

// This matches your MatchSeed from buildRound.ts
type MatchSeedParticipant = {
  participantId: string;
  team?: string;
  result?: string;
  pointsAwarded?: number;
  customStats?: Record<string, number>;
};

export type MatchSeed = {
  status: "pending" | "completed";
  participants: MatchSeedParticipant[];
  teamNames?: Record<string, string>;
};

// -------------------------------------------------------------------

export function GenerateRoundDialog({
  tournamentId,
  onRoundGenerated,
}: GenerateRoundDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [system, setSystem] = React.useState<System>("swiss-1v1");

  // --- Shared Swiss options ---
  const [swissVariant, setSwissVariant] =
    React.useState<SwissVariant>("FIDE_DUTCH");
  const [byePoints, setByePoints] = React.useState<number | null>(null);
  const [avoidRematches, setAvoidRematches] = React.useState(true);
  const [onConflict, setOnConflict] = React.useState<"FLOAT_DOWN" | "PAIR_ANYWAY">(
    "FLOAT_DOWN"
  ); // still not in UI

  // Round list for advanced options
  const [rounds, setRounds] = React.useState<RoundSummary[]>([]);
  const [selectedRoundIds, setSelectedRoundIds] = React.useState<string[]>([]);
  const [isLoadingRounds, setIsLoadingRounds] = React.useState(false);

  // --- N-FFA options ---
  const [groupSize, setGroupSize] = React.useState<number>(4);
  const [groupMethod, setGroupMethod] =
    React.useState<GroupMethod>("SIMPLE_CHUNK");
  const [ffaPlacementsByPlace, setFfaPlacementsByPlace] = React.useState<
    Record<number, number>
  >({
    1: 3,
    2: 1,
    3: 0,
    4: 0,
  });

  // --- Team options ---
  const [teamSize, setTeamSize] = React.useState<number>(2);
  const [teamMethod, setTeamMethod] =
    React.useState<TeamMethod>("BALANCE_FIRST_LAST");
  const [teamPersistenceMode, setTeamPersistenceMode] =
    React.useState<TeamPersistenceMode>("NEW_TEAMS");
  const [teamPersistenceRoundId, setTeamPersistenceRoundId] =
    React.useState<string | null>(null);

  // --- Custom mode state ---  // <<< CUSTOM
  const [customSeeds, setCustomSeeds] = React.useState<MatchSeed[]>([]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch rounds once the dialog opens
  React.useEffect(() => {
    if (!open) return;
    if (rounds.length > 0) return;

    (async () => {
      try {
        setIsLoadingRounds(true);
        const res = await fetch(`/api/tournaments/${tournamentId}/rounds`);
        if (!res.ok) return;
        const data = (await res.json()) as any[];
        const mapped: RoundSummary[] = data.map((r) => ({
          _id: r._id,
          roundNumber: r.roundNumber,
          system: r.system,
          status: r.status,
        }));
        setRounds(mapped);
      } catch (e) {
        console.error("Failed to fetch rounds for advanced options:", e);
      } finally {
        setIsLoadingRounds(false);
      }
    })();
  }, [open, rounds.length, tournamentId]);

  function toggleRoundSelection(id: string) {
    setSelectedRoundIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function ensureFfaPlacementsSize(nextGroupSize: number) {
    setFfaPlacementsByPlace((prev) => {
      const next: Record<number, number> = {};
      for (let place = 1; place <= nextGroupSize; place++) {
        next[place] = prev[place] ?? 0;
      }
      return next;
    });
  }

  function handleGroupSizeChange(next: number) {
    setGroupSize(next);
    ensureFfaPlacementsSize(next);
  }

  // Compute relevantRoundIds for Swiss engines
  function computeRelevantRoundIds(): string[] {
    if (selectedRoundIds.length === 0) {
      // No exclusions -> engine treats this as "all rounds relevant"
      return [];
    }
    const excluded = new Set(selectedRoundIds);
    const allIds = rounds.map((r) => r._id);
    return allIds.filter((id) => !excluded.has(id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // CUSTOM MODE: just send the seeds we built
      if (system === "custom") {
        if (customSeeds.length === 0) {
          setError("You have not created any matches.");
          setIsSubmitting(false);
          return;
        }

        const body = {
          system: "custom",
          matchSeeds: customSeeds,
        };

        const res = await fetch(
          `/api/tournaments/${tournamentId}/generate-round`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.message || "Failed to generate custom round.");
          return;
        }

        onRoundGenerated();
        setOpen(false);
        return;
      }
      // END CUSTOM MODE

      const relevantRoundIds = computeRelevantRoundIds();
      let body: any;

      if (system === "swiss-1v1") {
        const swissOptions: any = {
          variant: swissVariant,
          avoidRematches,
          relevantRoundIds,
          onConflict,
        };
        if (byePoints !== null && !Number.isNaN(byePoints)) {
          swissOptions.byePoints = byePoints;
        }

        body = {
          system: "swiss-1v1",
          options: swissOptions,
        };
      } else if (system === "n-ffa") {
        const placements: Record<string, number> = {};
        for (let place = 1; place <= groupSize; place++) {
          const pts = ffaPlacementsByPlace[place] ?? 0;
          placements[String(place)] = pts;
        }

        const ffaOptions: any = {
          groupSize,
          groupMethod,
          ffaPlacements: placements,
          avoidRematches,
          relevantRoundIds,
          onConflict,
        };
        if (byePoints !== null && !Number.isNaN(byePoints)) {
          ffaOptions.byePoints = byePoints;
        }

        body = {
          system: "n-ffa",
          options: ffaOptions,
        };
      } else {
        // team-2v2, but supports teamSize up to 50
        const teamOptions: any = {
          variant: swissVariant,
          avoidRematches,
          relevantRoundIds,
          onConflict,
          teamSize,
          teamMethod,
          teamPersistenceMode,
          teamPersistenceRoundId,
        };
        if (byePoints !== null && !Number.isNaN(byePoints)) {
          teamOptions.byePoints = byePoints;
        }

        body = {
          system: "team-2v2",
          options: teamOptions,
        };
      }

      const res = await fetch(
        `/api/tournaments/${tournamentId}/generate-round`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Failed to generate round.");
        return;
      }

      onRoundGenerated();
      setOpen(false);
    } catch (err) {
      console.error("Error generating round:", err);
      setError("Unexpected error while generating round.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Generate Next Round</Button>
      </DialogTrigger>
      {/* --- MODIFIED: Fixed height and wider dialog --- */}
      <DialogContent className="sm:max-w-2xl h-[80dvh] flex flex-col">
        {/* --- MODIFIED: Form layout for scrolling content --- */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Generate Next Round</DialogTitle>
            <DialogDescription>
              Choose the matchmaking system and round-specific options.
            </DialogDescription>
          </DialogHeader>

          {/* --- MODIFIED: This div becomes the scrollable part --- */}
          <div className="flex-1 overflow-y-auto space-y-4 p-6">
            {/* System selection */}
            <div className="space-y-2">
              <Label htmlFor="system">Matchmaking System</Label>
              <Select
                value={system}
                onValueChange={(value: System) => setSystem(value)}
              >
                <SelectTrigger id="system">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="swiss-1v1">Swiss (1v1)</SelectItem>
                  <SelectItem value="n-ffa">Free-For-All (N-Player)</SelectItem>
                  <SelectItem value="team-2v2">Team vs Team (2v2+)</SelectItem>
                  <SelectItem value="custom">Custom / Manual seeding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Swiss options for swiss & team */}
            {(system === "swiss-1v1" || system === "team-2v2") && (
              <SwissOptionsSection
                swissVariant={swissVariant}
                onSwissVariantChange={setSwissVariant}
                byePoints={byePoints}
                onByePointsChange={setByePoints}
                avoidRematches={avoidRematches}
                onAvoidRematchesChange={setAvoidRematches}
                rounds={rounds}
                selectedRoundIds={selectedRoundIds}
                isLoadingRounds={isLoadingRounds}
                onToggleRoundSelection={toggleRoundSelection}
              />
            )}

            {/* FFA options */}
            {system === "n-ffa" && (
              <FfaOptionsSection
                groupSize={groupSize}
                onGroupSizeChange={handleGroupSizeChange}
                groupMethod={groupMethod}
                onGroupMethodChange={setGroupMethod}
                placementsByPlace={ffaPlacementsByPlace}
                onPlacementsChange={(place, points) =>
                  setFfaPlacementsByPlace((prev) => ({
                    ...prev,
                    [place]: points,
                  }))
                }
                byePoints={byePoints}
                onByePointsChange={setByePoints}
                avoidRematches={avoidRematches}
                onAvoidRematchesChange={setAvoidRematches}
                rounds={rounds}
                selectedRoundIds={selectedRoundIds}
                isLoadingRounds={isLoadingRounds}
                onToggleRoundSelection={toggleRoundSelection}
              />
            )}

            {/* Team options */}
            {system === "team-2v2" && (
              <TeamOptionsSection
                teamSize={teamSize}
                onTeamSizeChange={setTeamSize}
                teamMethod={teamMethod}
                onTeamMethodChange={setTeamMethod}
                teamPersistenceMode={teamPersistenceMode}
                onTeamPersistenceModeChange={setTeamPersistenceMode}
                teamPersistenceRoundId={teamPersistenceRoundId}
                onTeamPersistenceRoundIdChange={setTeamPersistenceRoundId}
                rounds={rounds}
                isLoadingRounds={isLoadingRounds}
              />
            )}

            {/* Custom/manual pairing UI */}
            {system === "custom" && (
              <CustomPairingsSection
                tournamentId={tournamentId}
                byePoints={byePoints}
                onSeedsChange={setCustomSeeds}
              />
            )}
          </div>
          {/* --- END Scrollable div --- */}

          {error && (
            <p className="text-sm text-red-500 px-6" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="px-6 pb-6 pt-4 border-t">
            <Button type="submit" disabled={isSubmitting} className="ml-auto">
              {isSubmitting ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </form>
        {/* --- END Form --- */}
      </DialogContent>
    </Dialog>
  );
}