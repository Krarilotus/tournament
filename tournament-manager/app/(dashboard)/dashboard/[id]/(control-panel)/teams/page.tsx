// app/(dashboard)/dashboard/[id]/(control-panel)/teams/page.tsx
"use client";

import React, { useState, use, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import {
  Card,
  CardContent,
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
import { makeTeamLookupKey } from "@/lib/utils";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

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
      onRenamed();
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

export default function TeamsPage({
  params: paramsPromise,
  isReadOnly = false,
}: {
  params: Promise<{ id: string }>;
  isReadOnly?: boolean;
}) {
  const { id: tournamentId } = use(paramsPromise);
  const { mutate } = useSWRConfig();

  const {
    data: allTeams,
    error: teamsError,
    isLoading: teamsLoading,
  } = useSWR<SerializedTeam[]>(
    `/api/tournaments/${tournamentId}/teams`,
    fetcher
  );

  const {
    data: allRounds,
    error: roundsError,
    isLoading: roundsLoading,
  } = useSWR<PopulatedRound[]>(
    `/api/tournaments/${tournamentId}/rounds`,
    fetcher
  );

  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

  const teamRounds = useMemo(() => {
    return (allRounds || [])
      .filter((r) => r.system.startsWith("team-"))
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }, [allRounds]);

  const teamKeysInSelectedRound = useMemo(() => {
    if (!selectedRoundId) return null;
    const round = teamRounds.find((r) => r._id === selectedRoundId);
    if (!round) return null;

    const keys = new Set<string>();
    for (const match of round.matches as SerializedMatch[]) {
      const teamsInMatch: Record<string, string[]> = {};
      for (const p of match.participants) {
        const teamLabel = p.team;
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
        const lookupKey = makeTeamLookupKey(playerIds);
        keys.add(lookupKey);
      }
    }
    return keys;
  }, [selectedRoundId, teamRounds]);

  const filteredTeams = useMemo(() => {
    if (!teamKeysInSelectedRound) return allTeams || [];
    return (allTeams || []).filter((team) =>
      teamKeysInSelectedRound.has(team.lookupKey)
    );
  }, [allTeams, teamKeysInSelectedRound]);

  const handleTeamRenamed = () => {
    mutate(`/api/tournaments/${tournamentId}/teams`);
  };

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

  const description = isReadOnly
    ? "Viewing persistent teams created during team-based rounds."
    : "View and rename persistent teams created during team-based rounds. Names will be re-used in future rounds.";

  return (
    <div className="space-y-6">
      {/* Header like Rounds/Participants */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Teams</h2>
        {/* future: “Create team” button could go here */}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>

      <Card>
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
                <CardContent className="pt-4">
                  {isReadOnly ? (
                    <span className="text-lg font-semibold">
                      {team.customName || team.genericName}
                    </span>
                  ) : (
                    <RenameTeamForm
                      tournamentId={tournamentId}
                      team={team}
                      onRenamed={handleTeamRenamed}
                    />
                  )}
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
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
    </div>
  );
}
