"use client";

import React, { useMemo, useState } from "react";
import { PopulatedRound, SerializedMatch } from "@/lib/types";
import { SerializedParticipant } from "@/lib/models/Participant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// --- MODIFIED: Import ArrowLeftRight ---
import { ArrowLeftRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// --- Types ---
type Player = SerializedParticipant;
type MatchParticipant = {
  participantId: Player;
  [key: string]: any;
};
// --- MODIFIED: match can be null (for benched players) ---
type SwapCandidate = {
  participant: Player;
  match: SerializedMatch | null;
  context: "Pending Match" | "Bye" | "Bench";
};

// --- Props ---
interface SwapParticipantsDialogProps {
  tournamentId: string;
  roundId: string;
  matchA: SerializedMatch;
  allRounds: PopulatedRound[];
  standings: SerializedParticipant[]; // <-- ADDED
  onClose: () => void;
  onSwapped: () => void;
}

export function SwapParticipantsDialog({
  tournamentId,
  roundId,
  matchA,
  allRounds,
  standings, // <-- ADDED
  onClose,
  onSwapped,
}: SwapParticipantsDialogProps) {
  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<SwapCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participantsA = (matchA.participants as MatchParticipant[]).map(
    (p) => p.participantId
  );

  // --- MODIFIED: Reworked logic to find all candidates ---
  const swapCandidates = useMemo(() => {
    const currentRound = allRounds.find((r) => r._id === roundId);
    if (!currentRound) return [];

    const candidates: SwapCandidate[] = [];
    const playersInThisRound = new Set<string>();

    // 1. Get all players from pending and bye matches in this round
    for (const match of currentRound.matches as SerializedMatch[]) {
      if (match._id === matchA._id) {
        // Add players from matchA to the set so they aren't marked as "benched"
        match.participants.forEach((p) =>
          playersInThisRound.add((p.participantId as Player)._id)
        );
        continue;
      }

      const matchParticipants = match.participants as MatchParticipant[];

      if (match.status === "pending") {
        for (const p of matchParticipants) {
          candidates.push({
            participant: p.participantId,
            match: match,
            context: "Pending Match",
          });
          playersInThisRound.add(p.participantId._id);
        }
      } else if (
        match.status === "completed" &&
        matchParticipants.length === 1
      ) {
        // This is a "Bye" match
        const p = matchParticipants[0];
        candidates.push({
          participant: p.participantId,
          match: match,
          context: "Bye",
        });
        playersInThisRound.add(p.participantId._id);
      }
    }

    // 2. Get all "benched" players
    for (const player of standings) {
      if (player.isActive && !playersInThisRound.has(player._id)) {
        candidates.push({
          participant: player,
          match: null,
          context: "Bench",
        });
      }
    }

    return candidates.sort((a, b) =>
      a.participant.name.localeCompare(b.participant.name)
    );
  }, [allRounds, roundId, matchA._id, standings]);
  // --- END MODIFIED ---

  const handleConfirmSwap = async () => {
    if (!playerA || !playerB) return;

    setIsLoading(true);
    setError(null);

    const body = {
      matchAId: matchA._id,
      playerAId: playerA._id,
      matchBId: playerB.match ? playerB.match._id : undefined, // <-- MODIFIED
      playerBId: playerB.participant._id,
    };

    try {
      // --- MODIFIED: Corrected fetch URL (removed /swap-participants) ---
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      // --- END MODIFIED ---

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to swap participants");
      }

      toast.success(
        `Swapped ${playerA.name} with ${playerB.participant.name}.`
      );
      onSwapped();
    } catch (err: any) {
      console.error("Swap error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <DialogTitle>Swap Participant</DialogTitle>
      <DialogDescription>
        Who do you want to swap from this match?
      </DialogDescription>
      <div className="flex flex-col gap-2 pt-4">
        {participantsA.map((p) => (
          <Button
            key={p._id}
            variant="outline"
            className="w-full justify-start"
            onClick={() => setPlayerA(p)}
          >
            {p.name}
          </Button>
        ))}
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <DialogTitle>Swap with...</DialogTitle>
      <DialogDescription>
        Swapping{" "}
        <span className="font-bold text-primary">{playerA?.name}</span>. Select
        a participant to swap with.
      </DialogDescription>
      <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
        {swapCandidates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No other active participants found to swap with.
          </p>
        ) : (
          swapCandidates.map((c) => (
            <Button
              key={c.participant._id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => setPlayerB(c)}
            >
              {c.participant.name}{" "}
              <span className="ml-2 text-xs text-muted-foreground">
                ({c.context})
              </span>
            </Button>
          ))
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => setPlayerA(null)}>
          Back
        </Button>
      </DialogFooter>
    </>
  );

  const renderStep3 = () => (
    <>
      <DialogTitle>Confirm Swap</DialogTitle>
      <DialogDescription>
        Are you sure you want to proceed with this swap? This cannot be undone.
      </DialogDescription>
      <div className="flex items-center justify-center gap-4 py-8 text-center">
        <div className="flex-1 rounded-md border p-4">
          <p className="font-bold text-primary">{playerA?.name}</p>
          <p className="text-xs text-muted-foreground">From this match</p>
        </div>
        <ArrowLeftRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 rounded-md border p-4">
          <p className="font-bold text-primary">{playerB?.participant.name}</p>
          <p className="text-xs text-muted-foreground">
            (From {playerB?.context})
          </p>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive-foreground">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <DialogFooter>
        <Button
          variant="ghost"
          onClick={() => setPlayerB(null)}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button onClick={handleConfirmSwap} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Confirm Swap
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        {!playerA
          ? renderStep1()
          : !playerB
          ? renderStep2()
          : renderStep3()}
      </DialogContent>
    </Dialog>
  );
}