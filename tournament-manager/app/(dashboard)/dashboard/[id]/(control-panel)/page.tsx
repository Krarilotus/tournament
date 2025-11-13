"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { toast } from "sonner";
import { SerializedParticipant } from "@/lib/models/Participant";
import { AddParticipantDialog } from "./_components/AddParticipantDialog";
import { ParticipantsTable } from "./_components/ParticipantsTable";
import type { ParticipantsLayout } from "./_components/ParticipantsTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
// --- REMOVED: useRouter ---

type PageProps = {
  params: Promise<{ id: string }>;
};

type TournamentMeta = {
  settings?: {
    tieBreakers?: string[];
    participantsLayout?: ParticipantsLayout;
  };
};

export default function ParticipantsPage({ params }: PageProps) {
  const { id } = use(params);
  // --- REMOVED: router ---

  const [participants, setParticipants] = useState<SerializedParticipant[]>([]);
  const [tiebreakers, setTiebreakers] = useState<string[]>([]);
  const [layout, setLayout] = useState<ParticipantsLayout | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // --- REMOVED: redirectStatus state ---

  // --- SIMPLIFIED: Reverted to a standard fetchData callback ---
  const fetchData = useCallback(
    async (opts?: { initial?: boolean }) => {
      if (!id) return;

      const initial = opts?.initial ?? false;
      if (initial) setIsInitialLoading(true);

      try {
        const [participantsRes, tournamentRes] = await Promise.all([
          fetch(`/api/tournaments/${id}/participants`, {
            cache: "no-store",
          }),
          fetch(`/api/tournaments/${id}`, {
            cache: "no-store",
          }),
        ]);

        if (!participantsRes.ok) {
          throw new Error("Failed to fetch participants");
        }
        if (!tournamentRes.ok) {
          throw new Error("Failed to fetch tournament settings");
        }

        const participantsData = await participantsRes.json();
        const tournamentData: TournamentMeta = await tournamentRes.json();

        setParticipants(participantsData);

        const rawTieBreakers =
          tournamentData.settings?.tieBreakers ?? [];
        setTiebreakers(
          rawTieBreakers.length > 0 ? rawTieBreakers : ["points"]
        );

        if (tournamentData.settings?.participantsLayout) {
          setLayout(tournamentData.settings.participantsLayout);
        } else {
          setLayout(null);
        }
      } catch (error) {
        console.error(error);
        toast.error(
          "Could not load participants or tournament settings."
        );
      } finally {
        if (initial) setIsInitialLoading(false);
      }
    },
    [id]
  );

  // --- SIMPLIFIED: Standard useEffect for initial load ---
  useEffect(() => {
    fetchData({ initial: true });
  }, [fetchData]);
  // --- END MODIFICATION ---

  const handleParticipantsChanged = useCallback(() => {
    // silent refresh: no big spinner
    fetchData({ initial: false });
  }, [fetchData]);

  const handleLayoutChange = useCallback(
    (newLayout: ParticipantsLayout) => {
      setLayout(newLayout);

      // Persist to server (fire-and-forget)
      fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            participantsLayout: newLayout,
          },
        }),
      }).catch((err) => {
        console.error("Failed to save layout", err);
      });
    },
    [id]
  );

  // --- SIMPLIFIED: Reverted to simple loading check ---
  const showInitialSpinner =
    isInitialLoading && participants.length === 0;
  // --- END MODIFICATION ---

  // --- REMOVED: Full page loader for redirecting ---

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Participants</CardTitle>
          <AddParticipantDialog
            tournamentId={id}
            onParticipantsChanged={handleParticipantsChanged}
          />
        </div>
        <CardDescription>
          Add, remove, and manage participants. Dropped participants
          (toggled off) will be excluded from future matchmaking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showInitialSpinner ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading participants...
            </span>
          </div>
        ) : (
          <ParticipantsTable
            data={participants}
            tiebreakers={tiebreakers}
            initialLayout={layout || undefined}
            onParticipantsChanged={handleParticipantsChanged}
            onLayoutChange={handleLayoutChange}
          />
        )}
      </CardContent>
    </Card>
  );
}