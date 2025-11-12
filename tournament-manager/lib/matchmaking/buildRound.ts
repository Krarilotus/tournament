// lib/matchmaking/buildRound.ts
import mongoose from "mongoose";

import type { GenerateRoundFormData } from "@/lib/validators";
import type { SerializedParticipant } from "@/lib/models/Participant";
import type { SerializedMatch } from "@/lib/types";
import type {
  TeamOptions,
  TeamEntity,
  RoundSummary,
  FFAOptions,
  SwissContext,
  SwissOptions,
  SwissEntity,
} from "@/lib/matchmaking/types";

import Team from "@/lib/models/Team";
import { pairSwiss } from "@/lib/matchmaking/core/swiss";
import { groupFFA } from "@/lib/matchmaking/core/ffa";
import {
  buildNewTeams,
  buildTeamsWithPersistence,
} from "@/lib/matchmaking/core/teamBuilding";
import { pairTeamsSwiss } from "@/lib/matchmaking/core/teams";

import { alphaCode, makeTeamLookupKey } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types shared with the route                                        */
/* ------------------------------------------------------------------ */

export type MatchSeedParticipant = {
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

export interface BuildNextRoundArgs {
  config: GenerateRoundFormData;
  standings: SerializedParticipant[];
  allMatches: SerializedMatch[];
  rounds: RoundSummary[];
  pointSystem: Map<string, number>;
  tournamentId: string;
  ownerId: string;
}

export interface BuildNextRoundResult {
  matchSeeds: MatchSeed[];
}

/* ------------------------------------------------------------------ */
/* Main entry point                                                   */
/* ------------------------------------------------------------------ */

export async function buildNextRound({
  config,
  standings,
  allMatches,
  rounds,
  pointSystem,
  tournamentId,
  ownerId,
}: BuildNextRoundArgs): Promise<BuildNextRoundResult> {
  if (config.system !== "custom" && standings.length === 0) {
    // For custom, it's fine if standings are empty (e.g. testing)
    // For all others, we need players.
    return { matchSeeds: [] };
  }

  switch (config.system) {
    case "swiss-1v1":
      return buildSwiss1v1Round(config, standings, allMatches, pointSystem);

    case "n-ffa":
      return buildNffaRound(config, standings, allMatches, pointSystem);

    case "team-2v2":
      return await buildTeamRound(
        config,
        standings,
        allMatches,
        rounds,
        pointSystem,
        tournamentId,
        ownerId
      );

    // --- ADDED CASE ---
    case "custom":
      // The seeds were already built by the client UI.
      // The validator has confirmed they are in the correct format.
      // We just pass them straight through to the route.
      return { matchSeeds: config.matchSeeds };
    // --- END ADDED CASE ---

    default:
      return { matchSeeds: [] };
  }
}

/* ------------------------------------------------------------------ */
/* Helpers: generic utilities                                         */
/* ------------------------------------------------------------------ */

function getByePlayersFromHistory(allMatches: SerializedMatch[]): Set<string> {
  const byePlayers = new Set<string>();

  for (const m of allMatches) {
    if (m.participants.length === 1 && m.status === "completed") {
      const pid = toId(m.participants[0].participantId);
      byePlayers.add(pid);
    }
  }
  return byePlayers;
}

function toId(p: string | SerializedParticipant): string {
  return typeof p === "string" ? p : p._id;
}

function getByePoints(
  config: GenerateRoundFormData,
  pointSystem: Map<string, number>
): number {
  // Handle custom system not having 'options'
  if (config.system === "custom") {
    // Custom seeds should have bye points pre-calculated.
    // This is a fallback just in case.
    return pointSystem.get("win") ?? 0;
  }
  
  const byePointsOption = (config.options as any).byePoints;
  const byePoints =
    typeof byePointsOption === "number" ? byePointsOption : null;

  // Per-round byePoints if set, otherwise fall back to global "win" points
  return byePoints !== null && byePoints !== undefined
    ? byePoints
    : pointSystem.get("win") ?? 0;
}

/* ------------------------------------------------------------------ */
/* 1. Swiss 1v1                                                       */
/* ------------------------------------------------------------------ */

type ParticipantSwissEntity = SwissEntity & {
  participant: SerializedParticipant;
};

function buildSwiss1v1Round(
  config: Extract<GenerateRoundFormData, { system: "swiss-1v1" }>,
  standings: SerializedParticipant[],
  allMatches: SerializedMatch[],
  pointSystem: Map<string, number>
): BuildNextRoundResult {
  const { variant, avoidRematches, relevantRoundIds, onConflict } =
    config.options;

  // standings are already sorted by the standings API
  const entities = [...standings];

  const byePlayersHistory = getByePlayersFromHistory(allMatches);
  const byeWinPoints = getByePoints(config, pointSystem);

  const matchSeeds: MatchSeed[] = [];

  // Handle "bye" (odd player count)
  let pool = [...entities];
  if (pool.length % 2 !== 0) {
    // Pick lowest-ranked player who hasn't had a bye yet
    let byeCandidate: SerializedParticipant | undefined;
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      if (!byePlayersHistory.has(p._id)) {
        byeCandidate = p;
        pool.splice(i, 1);
        break;
      }
    }
    // If all players had a bye already, just give it to the last one
    if (!byeCandidate) {
      byeCandidate = pool.pop();
    }

    if (byeCandidate) {
      matchSeeds.push({
        status: "completed",
        participants: [
          {
            participantId: byeCandidate._id,
            result: "win",
            pointsAwarded: byeWinPoints,
            customStats: {},
          },
        ],
      });
    }
  }

  if (pool.length < 2) {
    // Only bye(s), nothing to pair
    return { matchSeeds };
  }

  // Map participants to Swiss entities (including full score vector)
  const swissEntities: ParticipantSwissEntity[] = pool.map((p) => ({
    id: p._id,
    score: p.scores?.points ?? 0,
    scores: p.scores ?? {},
    matchHistory: p.matchHistory ?? [],
    participant: p,
  }));

  const swissOptions: SwissOptions = {
    avoidRematches,
    relevantRoundIds,
    onConflict,
    variant, // "FIDE_DUTCH" or generic
  };

  const swissContext: SwissContext = {
    matches: allMatches,
  };

  const swissPairs = pairSwiss<ParticipantSwissEntity>(
    swissEntities,
    swissOptions,
    swissContext
  );

  for (const [a, b] of swissPairs) {
    matchSeeds.push({
      status: "pending",
      participants: [
        { participantId: a.participant._id, customStats: {} },
        { participantId: b.participant._id, customStats: {} },
      ],
    });
  }

  return { matchSeeds };
}

/* ------------------------------------------------------------------ */
/* 2. N-player FFA                                                    */
/* ------------------------------------------------------------------ */

function buildNffaRound(
  config: Extract<GenerateRoundFormData, { system: "n-ffa" }>,
  standings: SerializedParticipant[],
  allMatches: SerializedMatch[],
  pointSystem: Map<string, number>
): BuildNextRoundResult {
  const options: FFAOptions = {
    groupSize: config.options.groupSize,
    method: config.options.groupMethod,
    avoidRematches: config.options.avoidRematches,
    relevantRoundIds: config.options.relevantRoundIds,
    onConflict: config.options.onConflict,
  };

  const context: SwissContext = {
    matches: allMatches,
  };

  const groups = groupFFA(standings, options, context);

  const matchSeeds: MatchSeed[] = [];
  const byeWinPoints = getByePoints(config, pointSystem);

  for (const group of groups) {
    if (group.length === 0) continue;

    if (group.length === 1) {
      // This is a bye, treat it like a 1v1 bye
      const p = group[0];
      matchSeeds.push({
        status: "completed",
        participants: [
          {
            participantId: p._id,
            result: "win",
            pointsAwarded: byeWinPoints,
            customStats: {},
          },
        ],
      });
    } else {
      // This is a real match
      matchSeeds.push({
        status: "pending",
        participants: group.map((p) => ({
          participantId: p._id,
          customStats: {},
        })),
      });
    }
  }

  return { matchSeeds };
}

/* ------------------------------------------------------------------ */
/* 3. Team vs Team (2v2 / 3v3 / ... up to 50v50)                       */
/* ------------------------------------------------------------------ */

async function buildTeamRound(
  config: Extract<GenerateRoundFormData, { system: "team-2v2" }>,
  standings: SerializedParticipant[],
  allMatches: SerializedMatch[],
  rounds: RoundSummary[],
  pointSystem: Map<string, number>,
  tournamentId: string,
  ownerId: string
): Promise<BuildNextRoundResult> {
  const opt = config.options;
  const teamSize: number = opt.teamSize ?? 2;
  const teamMethod: "BALANCE_FIRST_LAST" | "RANDOM" =
    opt.teamMethod ?? "BALANCE_FIRST_LAST";
  const teamPersistenceMode = opt.teamPersistenceMode;

  const playersById = new Map<string, SerializedParticipant>();
  for (const p of standings) {
    playersById.set(p._id, p);
  }

  let teams: TeamEntity[];

  if (teamPersistenceMode === "REUSE_FROM_ROUND") {
    // reuse from last team round (or fallback to new teams)
    teams = buildTeamsWithPersistence(
      standings,
      allMatches,
      rounds,
      playersById,
      teamSize,
      opt.teamPersistenceRoundId ?? null
    );
  } else {
    // brand new balanced teams based on current standings
    teams = buildNewTeams(standings, { teamSize, teamMethod });
  }

  if (teams.length === 0) {
    return { matchSeeds: [] };
  }

  // sort teams by score descending (as required by Swiss pairing)
  teams.sort((a, b) => b.score - a.score);

  const matchSeeds: MatchSeed[] = [];
  const matchedPlayerIds = new Set<string>();
  const byeWinPoints = getByePoints(config, pointSystem);

  let pool = [...teams];

  // --- Team Name Logic ---
  // 1. Fetch all existing teams for this tournament
  const existingTeams = await Team.find({ tournamentId }).lean();
  const teamNameMap = new Map<string, string>();
  for (const team of existingTeams as any[]) {
    const name = team.customName || team.genericName || "Team";
    teamNameMap.set(team.lookupKey, name);
  }

  // 2. Set the counter to the *next* available index
  let teamCounter = existingTeams.length;
  const newTeamsToCreate: any[] = [];
  // --- END Team Name Logic ---

  // Handle "bye" (odd number of teams)
  if (pool.length % 2 !== 0) {
    const byeTeam = pool.pop(); // Lowest ranked team
    if (byeTeam) {
      const lookupKey = makeTeamLookupKey(byeTeam.playerIds);
      if (!teamNameMap.has(lookupKey)) {
        const genericName = `Team ${alphaCode(teamCounter++)}`;
        teamNameMap.set(lookupKey, genericName);
        newTeamsToCreate.push({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          ownerId: new mongoose.Types.ObjectId(ownerId),
          playerIds: byeTeam.playerIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
          lookupKey,
          genericName,
        });
      }

      // Create completed "bye" matches for each player on that team
      for (const pid of byeTeam.playerIds) {
        matchSeeds.push({
          status: "completed",
          participants: [
            {
              participantId: pid,
              result: "win",
              pointsAwarded: byeWinPoints,
              customStats: {},
            },
          ],
        });
        matchedPlayerIds.add(pid);
      }
    }
  }

  // Now we have an even number of teams in pool.
  const teamPairingOptions: TeamOptions = {
    ...opt,
  };

  const swissContext: SwissContext = {
    matches: allMatches,
  };

  const pairs = pairTeamsSwiss(pool, teamPairingOptions, swissContext);

  for (const [a, b] of pairs) {
    const participants: MatchSeedParticipant[] = [];

    // --- Team A ---
    const lookupKeyA = makeTeamLookupKey(a.playerIds);
    let teamAName = teamNameMap.get(lookupKeyA);
    if (!teamAName) {
      teamAName = `Team ${alphaCode(teamCounter++)}`;
      teamNameMap.set(lookupKeyA, teamAName);
      newTeamsToCreate.push({
        tournamentId: new mongoose.Types.ObjectId(tournamentId),
        ownerId: new mongoose.Types.ObjectId(ownerId),
        playerIds: a.playerIds.map((id) => new mongoose.Types.ObjectId(id)),
        lookupKey: lookupKeyA,
        genericName: teamAName,
      });
    }

    for (const pid of a.playerIds) {
      participants.push({
        participantId: pid,
        team: "A",
        customStats: {},
      });
      matchedPlayerIds.add(pid);
    }

    // --- Team B ---
    const lookupKeyB = makeTeamLookupKey(b.playerIds);
    let teamBName = teamNameMap.get(lookupKeyB);
    if (!teamBName) {
      teamBName = `Team ${alphaCode(teamCounter++)}`;
      teamNameMap.set(lookupKeyB, teamBName);
      newTeamsToCreate.push({
        tournamentId: new mongoose.Types.ObjectId(tournamentId),
        ownerId: new mongoose.Types.ObjectId(ownerId),
        playerIds: b.playerIds.map((id) => new mongoose.Types.ObjectId(id)),
        lookupKey: lookupKeyB,
        genericName: teamBName,
      });
    }

    for (const pid of b.playerIds) {
      participants.push({
        participantId: pid,
        team: "B",
        customStats: {},
      });
      matchedPlayerIds.add(pid);
    }

    const teamNames: Record<string, string> = {
      A: teamAName,
      B: teamBName,
    };

    matchSeeds.push({
      status: "pending",
      participants,
      teamNames,
    });
  }

  // Any players who were *not* put into a team (e.g., 3 leftovers
  // when teamSize is 4) get a bye.
  const byePlayers = standings.filter((p) => !matchedPlayerIds.has(p._id));

  for (const p of byePlayers) {
    matchSeeds.push({
      status: "completed",
      participants: [
        {
          participantId: p._id,
          result: "win",
          pointsAwarded: byeWinPoints,
          customStats: {},
        },
      ],
    });
  }

  // Save any new teams to the DB
  if (newTeamsToCreate.length > 0) {
    try {
      await Team.insertMany(newTeamsToCreate, { ordered: false });
    } catch (error: any) {
      // Ignore duplicate key errors, which are expected if
      // two processes run at once.
      if (error.code !== 11000) {
        console.error("Error saving new teams:", error);
      }
    }
  }

  return { matchSeeds };
}