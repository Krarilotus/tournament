// app/dashboard/[id]/rounds/_components/CustomPairingsSection.tsx
"use client";

import * as React from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { SerializedParticipant } from "@/lib/models/Participant";
import type { MatchSeed } from "./GenerateRoundDialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Mode = "1v1" | "team" | "ffa";

interface Props {
  tournamentId: string;
  byePoints: number | null;
  onSeedsChange: (seeds: MatchSeed[]) => void;
}

type Slot = {
  participantId: string | null;
};

type MatchLayout = {
  id: string;
  slots: Slot[]; // order matters; for teams we'll interpret half as A, half as B
};

export function CustomPairingsSection({
  tournamentId,
  byePoints,
  onSeedsChange,
}: Props) {
  const { data: participants, isLoading } = useSWR<SerializedParticipant[]>(
    `/api/tournaments/${tournamentId}/standings`, // active players in sorted order
    fetcher
  );

  const [mode, setMode] = React.useState<Mode>("1v1");
  const [teamSize, setTeamSize] = React.useState(2); // per team
  const [ffaSize, setFfaSize] = React.useState(4);

  const [matches, setMatches] = React.useState<MatchLayout[]>([]);
  const [bench, setBench] = React.useState<string[]>([]); // participantIds not placed

  // initialise bench when participants load
  React.useEffect(() => {
    if (!participants) return;
    setBench(participants.map((p) => p._id));
    setMatches([]);
    onSeedsChange([]);
  }, [participants, onSeedsChange]);

  // whenever layout changes, recompute seeds
  React.useEffect(() => {
    if (!participants) return;

    const idToPlayer = new Map<string, SerializedParticipant>();
    for (const p of participants) idToPlayer.set(p._id, p);

    const seeds: MatchSeed[] = [];

    const byePointsValue = byePoints ?? 0;

    // 1) matches
    for (const m of matches) {
      const assigned = m.slots.filter((s) => s.participantId !== null) as {
        participantId: string;
      }[];

      if (assigned.length < 1) continue;

      if (mode === "1v1") {
        if (assigned.length < 2) {
          // treat lonely player as a bye
          const pid = assigned[0].participantId;
          seeds.push({
            status: "completed",
            participants: [
              {
                participantId: pid,
                result: "win",
                pointsAwarded: byePointsValue,
                customStats: {},
              },
            ],
          });
        } else {
          seeds.push({
            status: "pending",
            participants: assigned.slice(0, 2).map((s) => ({
              participantId: s.participantId,
              customStats: {},
            })),
          });
        }
      } else if (mode === "team") {
        const perTeam = teamSize;
        if (assigned.length < perTeam * 2) {
          // incomplete team vs team -> skip this match
          continue;
        }
        const teamA = assigned.slice(0, perTeam);
        const teamB = assigned.slice(perTeam, perTeam * 2);

        seeds.push({
          status: "pending",
          participants: [
            ...teamA.map((s) => ({
              participantId: s.participantId,
              team: "A" as const,
              customStats: {},
            })),
            ...teamB.map((s) => ({
              participantId: s.participantId,
              team: "B" as const,
              customStats: {},
            })),
          ],
        });
      } else {
        // FFA
        if (assigned.length < 2) {
          // 1 lonely player = bye
          const pid = assigned[0].participantId;
          seeds.push({
            status: "completed",
            participants: [
              {
                participantId: pid,
                result: "win",
                pointsAwarded: byePointsValue,
                customStats: {},
              },
            ],
          });
        } else {
          seeds.push({
            status: "pending",
            participants: assigned.map((s) => ({
              participantId: s.participantId,
              customStats: {},
            })),
          });
        }
      }
    }

    // 2) remaining bench players: give byes
    for (const pid of bench) {
      seeds.push({
        status: "completed",
        participants: [
          {
            participantId: pid,
            result: "win",
            pointsAwarded: byePointsValue,
            customStats: {},
          },
        ],
      });
    }

    onSeedsChange(seeds);
  }, [
    matches,
    bench,
    mode,
    teamSize,
    ffaSize,
    participants,
    byePoints,
    onSeedsChange,
  ]);

  function addMatch() {
    const slotsCount =
      mode === "1v1" ? 2 : mode === "team" ? teamSize * 2 : ffaSize;
    const newMatch: MatchLayout = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slots: Array.from({ length: slotsCount }, () => ({ participantId: null })),
    };
    setMatches((prev) => [...prev, newMatch]);
  }

  function clearAll() {
    if (!participants) return;
    setBench(participants.map((p) => p._id));
    setMatches([]);
  }

  function moveFromBenchToSlot(pid: string, matchId: string, slotIndex: number) {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const slots = [...m.slots];
        const current = slots[slotIndex].participantId;
        const newSlots = [...slots];
        newSlots[slotIndex] = { participantId: pid };
        // If the slot was occupied, put that player back to bench
        if (current && current !== pid) {
          setBench((old) => [...old, current]);
        }
        return { ...m, slots: newSlots };
      })
    );
    setBench((prev) => prev.filter((id) => id !== pid));
  }

  function removeFromSlot(matchId: string, slotIndex: number) {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const slots = [...m.slots];
        const pid = slots[slotIndex].participantId;
        if (pid) {
          setBench((old) => [...old, pid]);
        }
        slots[slotIndex] = { participantId: null };
        return { ...m, slots };
      })
    );
  }

  function participantName(pid: string): string {
    const p = participants?.find((x) => x._id === pid);
    if (!p) return pid.slice(-4);
    return p.customId ? `${p.name} (${p.customId})` : p.name;
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="space-y-2">
        <Label>Custom mode</Label>
        <p className="text-xs text-muted-foreground">
          Manually assign players into matches. Unassigned players will receive a
          bye.
        </p>
      </div>

      {/* mode selection */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label>Format</Label>
          <Select
            value={mode}
            onValueChange={(v: Mode) => {
              setMode(v);
              setMatches([]);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1v1">1 vs 1</SelectItem>
              <SelectItem value="team">Team vs Team</SelectItem>
              <SelectItem value="ffa">Free-for-all</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "team" && (
          <div className="space-y-1">
            <Label>Players per team</Label>
            <Select
              value={String(teamSize)}
              onValueChange={(v) => {
                setTeamSize(Number(v) || 2);
                setMatches([]);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2v2</SelectItem>
                <SelectItem value="3">3v3</SelectItem>
                <SelectItem value="4">4v4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === "ffa" && (
          <div className="space-y-1">
            <Label>Players per match</Label>
            <Select
              value={String(ffaSize)}
              onValueChange={(v) => {
                setFfaSize(Number(v) || 4);
                setMatches([]);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            Clear
          </Button>
          <Button type="button" size="sm" onClick={addMatch}>
            Add match
          </Button>
        </div>
      </div>

      <div className="relative rounded-md border p-3 space-y-3">
        {/* bench (sticky) */}
        {/* This will now be sticky to the dialog's scrollable pane */}
        <div className="sticky top-0 space-y-1 bg-background z-10 -mt-3 -mx-3 p-3 border-b mb-3">
          <Label>Unassigned players</Label>
          {isLoading && (
            <p className="text-xs text-muted-foreground pt-1">
              Loading players…
            </p>
          )}
          {!isLoading && (
            <div className="flex flex-wrap gap-2 pt-1">
              {bench.map((pid) => (
                <button
                  key={pid}
                  type="button"
                  className="rounded border px-2 py-1 text-xs hover:bg-accent"
                  onClick={() => {
                    // add to the first match with a free slot, otherwise do nothing
                    const target = matches.find((m) =>
                      m.slots.some((s) => s.participantId === null)
                    );
                    if (!target) return;
                    const slotIndex = target.slots.findIndex(
                      (s) => s.participantId === null
                    );
                    if (slotIndex === -1) return;
                    moveFromBenchToSlot(pid, target.id, slotIndex);
                  }}
                >
                  {participantName(pid)}
                </button>
              ))}
              {bench.length === 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  All players are assigned to matches.
                </p>
              )}
            </div>
          )}
        </div>

        {/* matches grid (will scroll as part of the parent) */}
        <div className="space-y-3">
          {matches.map((m, idx) => (
            <div
              key={m.id}
              className="rounded-md border bg-muted/30 px-3 py-2 space-y-1"
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Match {idx + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() =>
                    setMatches((prev) => prev.filter((x) => x.id !== m.id))
                  }
                >
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {m.slots.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex min-h-[28px] items-center justify-between rounded border px-2 py-1 hover:bg-accent"
                    onClick={() => {
                      if (slot.participantId) {
                        removeFromSlot(m.id, i);
                      }
                    }}
                  >
                    <span className="truncate">
                      {slot.participantId
                        ? participantName(slot.participantId)
                        : "Empty"}
                    </span>
                    {slot.participantId && (
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        click to remove
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {matches.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">
              No matches yet. Click "Add match" and then click players to fill
              slots.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}