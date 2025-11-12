"use client";

import React, { useState, use, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { SerializedParticipant } from "@/lib/models/Participant";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Edit, Check, X } from "lucide-react";
import { PopulatedRound, SerializedMatch } from "@/lib/types";
// --- ADDED IMPORTS ---
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
// --- END ADDED IMPORTS ---

// --- Types ---

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type SerializedPlayer = {
  _id: string;
  name: string;
  customId?: string;
};

type SerializedTeam = {
  _id: string;
  tournamentId: string;
  playerIds: SerializedPlayer[];
  lookupKey: string;
  customName?: string;
  genericName?: string;
};

// --- Rename Form Sub-Component ---

function RenameTeamForm({
  tournamentId,
  team,
  onRenamed,
}: {
  tournamentId: string;
  team: SerializedTeam;
  onRenamed: () => void;
}) {
  const [name, setName] = useState(team.customName || team.genericName || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/teams/${team._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customName: name }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save name");
      }

      toast.success(`Team renamed to "${name}"`);
      setIsEditing(false);
      onRenamed(); // This triggers a SWR re-fetch
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">
          {team.customName || team.genericName}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsEditing(true)}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-green-500"
        disabled={isLoading}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500"
        onClick={() => setIsEditing(false)}
        disabled={isLoading}
      >
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}

// --- Main Page Component ---

export default function TeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = use(params);
  const { mutate } = useSWRConfig();

  // 1. Fetch all persistent teams
  const {
    data: allTeams,
    error: teamsError,
    isLoading: teamsLoading,
  } = useSWR<SerializedTeam[]>(
    `/api/tournaments/${tournamentId}/teams`,
    fetcher
  );

  // 2. Fetch all rounds
  const {
    data: allRounds,
    error: roundsError,
    isLoading: roundsLoading,
  } = useSWR<PopulatedRound[]>(
    `/api/tournaments/${tournamentId}/rounds`,
    fetcher
  );

  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

  // 3. Filter rounds to find only "Team Rounds"
  const teamRounds = useMemo(() => {
    return (allRounds || [])
      .filter((r) => r.system.startsWith("team-"))
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }, [allRounds]);

  // 4. Get the lookup keys for teams that played in the selected round
  const teamKeysInSelectedRound = useMemo(() => {
    if (!selectedRoundId) return null;
    const round = teamRounds.find((r) => r._id === selectedRoundId);
    if (!round) return null;

    const keys = new Set<string>();
    for (const match of round.matches as SerializedMatch[]) {
      const teamsInMatch: Record<string, string[]> = {}; // "A" -> [p1, p2]
      for (const p of match.participants) {
        const teamLabel = p.team;
        // This logic correctly handles participantId being a string or an object
        const pId =
          typeof p.participantId === "string"
            ? p.participantId
            : (p.participantId as SerializedPlayer)?._id;

        if (teamLabel && pId) {
          if (!teamsInMatch[teamLabel]) teamsInMatch[teamLabel] = [];
          teamsInMatch[teamLabel].push(pId);
        }
      }
      for (const playerIds of Object.values(teamsInMatch)) {
        // We must sort the IDs to create the lookup key,
        const lookupKey = playerIds.slice().sort().join("|");
        keys.add(lookupKey);
      }
    }
    return keys;
  }, [selectedRoundId, teamRounds]);

  // 5. Filter the master team list based on the keys from step 4
  const filteredTeams = useMemo(() => {
    if (!teamKeysInSelectedRound) return allTeams || [];
    return (allTeams || []).filter((team) =>
      teamKeysInSelectedRound.has(team.lookupKey)
    );
  }, [allTeams, teamKeysInSelectedRound]);

  // 6. Handler to refresh SWR cache after renaming
  const handleTeamRenamed = () => {
    mutate(`/api/tournaments/${tournamentId}/teams`);
  };

  // --- Render Logic ---

  if (roundsLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (roundsError || teamsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Could not load teams or rounds data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Management</CardTitle>
        <CardDescription>
          View and rename persistent teams created during team-based rounds.
          Names will be re-used in future rounds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select a Team Round</label>
          <Select
            value={selectedRoundId || "all"}
            onValueChange={(val) =>
              setSelectedRoundId(val === "all" ? null : val)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a round..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All Teams ({allTeams?.length || 0})
              </SelectItem>
              {teamRounds.map((r) => (
                <SelectItem key={r._id} value={r._id}>
                  Round {r.roundNumber} ({r.system})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <Card key={team._id} className="flex flex-col">
              <CardHeader className="pb-2">
                <RenameTeamForm
                  tournamentId={tournamentId}
                  team={team}
                  onRenamed={handleTeamRenamed}
                />
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {team.playerIds.map((p) => (
                    <li key={p._id}>
                      {p.name} {p.customId ? `(${p.customId})` : ""}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center text-sm text-muted-foreground p-8">
            {teamRounds.length === 0
              ? "No team-based rounds have been generated yet."
              : selectedRoundId
                ? "No teams found for this round."
                : "No teams found for this tournament."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}