// app/(dashboard)/dashboard/[id]/(control-panel)/page.tsx
"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { toast } from "sonner";
import { SerializedParticipant } from "@/lib/models/Participant";
import { AddParticipantDialog } from "./_components/AddParticipantDialog";
import { ParticipantsTable } from "./_components/ParticipantsTable";
import type { ParticipantsLayout } from "./_components/ParticipantsTable";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// NOTE: params is a Promise here (Next 16 behavior).
type PageProps = {
  params: Promise<{ id: string }>;
  isReadOnly?: boolean;
};

type TournamentMeta = {
  settings?: {
    tieBreakers?: string[];
    participantsLayout?: ParticipantsLayout;
  };
};

export default function ParticipantsPage({
  params,
  isReadOnly = false,
}: PageProps) {
  // Properly unwrap params in a client component
  const { id } = use(params);

  const [participants, setParticipants] = useState<SerializedParticipant[]>([]);
  const [tiebreakers, setTiebreakers] = useState<string[]>([]);
  const [layout, setLayout] = useState<ParticipantsLayout | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

        const rawTieBreakers = tournamentData.settings?.tieBreakers ?? [];
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

  useEffect(() => {
    fetchData({ initial: true });
  }, [fetchData]);

  const handleParticipantsChanged = useCallback(() => {
    fetchData({ initial: false });
  }, [fetchData]);

  const handleLayoutChange = useCallback(
    (newLayout: ParticipantsLayout) => {
      // Do not save layout in read-only mode
      if (isReadOnly) return;

      setLayout(newLayout);

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
    [id, isReadOnly]
  );

  const showInitialSpinner =
    isInitialLoading && participants.length === 0;

  return (
    <div className="space-y-6">
      {/* Header – same pattern as Rounds */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Participants</h2>
        {!isReadOnly && (
          <AddParticipantDialog
            tournamentId={id}
            onParticipantsChanged={handleParticipantsChanged}
          />
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {isReadOnly
          ? "A list of all participants in this tournament."
          : "Add, remove, and manage participants. Dropped participants (toggled off) will be excluded from future matchmaking."}
      </p>

      <Card>
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
              isReadOnly={isReadOnly}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
