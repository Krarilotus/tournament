// lib/matchmaking/core/teamBuilding.ts
import type { SerializedParticipant } from "@/lib/models/Participant";
import type {
  TeamEntity,
  TeamOptions,
  RoundSummary,
} from "@/lib/matchmaking/types";
import type { SerializedMatch } from "@/lib/types";
import { makeTeamLookupKey } from "@/lib/utils"; // <-- ADDED

/**
 * Create new teams from the current standings.
 *
 * BALANCE_FIRST_LAST:
 * Generalizes "1st + last, 2nd + second last, ..." for any team size.
 * RANDOM:
 * Fisher-Yates shuffle then chunk.
 */
export function buildNewTeams(
  standings: SerializedParticipant[],
  options: TeamOptions
): TeamEntity[] {
  const teamSize = options.teamSize ?? 2;
  const method = options.teamMethod ?? "BALANCE_FIRST_LAST";

  const sorted = [...standings];
  if (sorted.length < teamSize) return [];

  let pool = [...sorted];

  if (method === "RANDOM") {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }

  const teams: TeamEntity[] = [];

  if (method === "BALANCE_FIRST_LAST") {
    while (pool.length >= teamSize) {
      const members: SerializedParticipant[] = [];

      while (members.length < teamSize && pool.length > 0) {
        if (members.length % 2 === 0) {
          members.push(pool.shift()!); // highest remaining
        } else {
          members.push(pool.pop()!); // lowest remaining
        }
      }

      if (members.length > 0) {
        teams.push(createTeamEntity(members));
      }
    }
  } else {
    // RANDOM: already shuffled, just chunk in order
    while (pool.length >= teamSize) {
      const members = pool.splice(0, teamSize);
      if (members.length > 0) {
        teams.push(createTeamEntity(members));
      }
    }
  }

  return teams;
}

/**
 * Re-builds a list of teams based on the team composition in a
 * given set of matches.
 *
 * This is the core logic for "team persistence" - used by both the
 * team standings UI and the next-round generator.
 */
export function reconstructTeamsFromMatches(
  matchesInSeedRound: SerializedMatch[],
  playersById: Map<string, SerializedParticipant>,
  teamSize: number
): { teams: TeamEntity[]; assignedPlayerIds: Set<string> } {
  const teamsMap = new Map<string, Set<string>>();

  for (const m of matchesInSeedRound) {
    const byLabel = new Map<string, Set<string>>();

    for (const p of m.participants as any[]) {
      const pid =
        typeof p.participantId === "string"
          ? p.participantId
          : p.participantId?._id?.toString() ?? "";
      const label = (p.team ?? "").toString();
      if (!label || !pid) continue;

      if (!byLabel.has(label)) {
        byLabel.set(label, new Set());
      }
      byLabel.get(label)!.add(pid);
    }

    for (const [, playerSet] of byLabel.entries()) {
      const playerIds = Array.from(playerSet);
      if (playerIds.length === 0) continue;

      const key = makeTeamLookupKey(playerIds); // <-- UPDATED
      if (!teamsMap.has(key)) {
        teamsMap.set(key, new Set(playerIds));
      } else {
        const s = teamsMap.get(key)!;
        for (const id of playerIds) s.add(id);
      }
    }
  }

  const assignedPlayerIds = new Set<string>();
  const teams: TeamEntity[] = [];

  for (const [, playerSet] of teamsMap.entries()) {
    const playerIds = Array.from(playerSet).filter((id) =>
      playersById.has(id)
    );
    if (playerIds.length === 0) continue;

    const trimmed = playerIds.slice(0, teamSize);
    trimmed.forEach((id) => assignedPlayerIds.add(id));

    const members = trimmed
      .map((id) => playersById.get(id))
      .filter(Boolean) as SerializedParticipant[];

    if (members.length > 0) {
      teams.push(createTeamEntity(members));
    }
  }

  return { teams, assignedPlayerIds };
}

/**
 * Build teams by reusing the composition from a previous team round.
 * Any players not covered by those teams are grouped using buildNewTeams.
 */
export function buildTeamsWithPersistence(
  standings: SerializedParticipant[],
  allMatches: SerializedMatch[],
  rounds: RoundSummary[],
  playersById: Map<string, SerializedParticipant>,
  teamSize: number,
  seedRoundId: string | null
): TeamEntity[] {
  let roundIdToUse = seedRoundId;

  if (!roundIdToUse) {
    const teamRounds = rounds
      .filter((r) => r.system.startsWith("team-"))
      .sort((a, b) => b.roundNumber - a.roundNumber);
    if (teamRounds.length === 0) {
      // no previous team round, fall back to fresh teams
      return buildNewTeams(standings, {
        teamSize,
        teamMethod: "BALANCE_FIRST_LAST",
      });
    }
    roundIdToUse = teamRounds[0]._id;
  }

  const matchesInSeedRound = allMatches.filter(
    (m) => m.roundId === roundIdToUse
  );

  // Use the new, centralized helper
  const { teams, assignedPlayerIds } = reconstructTeamsFromMatches(
    matchesInSeedRound,
    playersById,
    teamSize
  );

  // Unassigned players -> new balanced teams
  const unassigned = standings.filter((p) => !assignedPlayerIds.has(p._id));
  if (unassigned.length > 0) {
    const extraTeams = buildNewTeams(unassigned, {
      teamSize,
      teamMethod: "BALANCE_FIRST_LAST",
    });
    teams.push(...extraTeams);
  }

  return teams;
}

/* helpers */

function createTeamEntity(members: SerializedParticipant[]): TeamEntity {
  const ids = members.map((p) => p._id);

  const totalPoints = members.reduce(
    (sum, p) => sum + (p.scores?.points ?? 0),
    0
  );
  const score = members.length === 0 ? 0 : totalPoints / members.length;

  const matchHistory = Array.from(
    new Set(members.flatMap((p) => p.matchHistory ?? []))
  );

  return {
    id: makeTeamLookupKey(ids), // <-- UPDATED
    playerIds: ids,
    score,
    matchHistory,
  };
}

// <-- REMOVED makeTeamId function -->