import type { SerializedParticipant } from "@/lib/models/Participant";
import type {
  FFAOptions,
  SwissContext,
  SwissEntity,
  SwissOptions,
} from "@/lib/matchmaking/types";
import { buildOpponentMap, havePlayedBefore } from "./swiss";

/**
 * Checks if a candidate has played anyone in the current group.
 */
function hasPlayedInGroup(
  candidate: SerializedParticipant,
  group: SerializedParticipant[],
  options: SwissOptions,
  opponentMap: Map<string, Set<string>>
): boolean {
  for (const member of group) {
    if (havePlayedBefore(candidate._id, member._id, options, opponentMap)) {
      return true;
    }
  }
  return false;
}

/**
 * Group players into FFA matches.
 *
 * SWISS_GROUPING:
 * - Tries to group players who have not played each other before.
 * - Pulls top player, then fills their group with the highest-ranked
 * non-rematch players.
 *
 * SIMPLE_CHUNK:
 * - just chunk the sorted list into groups of size N.
 */
export function groupFFA(
  standings: SerializedParticipant[],
  options: FFAOptions,
  ctx: SwissContext
): SerializedParticipant[][] {
  const { groupSize, method, avoidRematches } = options;
  const pool = [...standings];
  const groups: SerializedParticipant[][] = [];

  if (pool.length === 0 || groupSize <= 0) {
    return groups;
  }

  // --- SIMPLE_CHUNK (default, no rematch logic) ---
  if (method === "SIMPLE_CHUNK" || !avoidRematches) {
    while (pool.length > 0) {
      groups.push(pool.splice(0, groupSize));
    }
    return groups;
  }

  // --- SWISS_GROUPING (with rematch avoidance) ---

  // Build the opponent map using the shared Swiss helper
  const swissEntities: SwissEntity[] = pool.map((p) => ({
    id: p._id,
    score: p.scores.points,
    matchHistory: p.matchHistory,
  }));
  const swissOptions: SwissOptions = {
    avoidRematches: options.avoidRematches,
    relevantRoundIds: options.relevantRoundIds,
    onConflict: options.onConflict,
  };
  const opponentMap = buildOpponentMap(swissEntities, swissOptions, ctx);

  const matched = new Set<string>();

  while (pool.length > 0) {
    // 1. Find the top-ranked player who isn't in a group yet
    let topPlayer: SerializedParticipant | undefined;
    let topPlayerIndex = -1;
    for (let i = 0; i < pool.length; i++) {
      if (!matched.has(pool[i]._id)) {
        topPlayer = pool[i];
        topPlayerIndex = i;
        break;
      }
    }

    if (!topPlayer) break; // Everyone is matched

    // 2. Start a new group with this player
    const currentGroup = [topPlayer];
    pool.splice(topPlayerIndex, 1); // Remove from pool
    matched.add(topPlayer._id);

    // 3. Fill the rest of the group
    let candidates = [...pool]; // Search remaining pool
    let forcePair = false; // "onConflict" flag

    while (currentGroup.length < groupSize && pool.length > 0) {
      let foundIndex = -1;

      // First, try to find a non-rematch
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (
          !hasPlayedInGroup(candidate, currentGroup, swissOptions, opponentMap)
        ) {
          foundIndex = i;
          break;
        }
      }

      // If no non-rematch found, handle conflict
      if (foundIndex === -1) {
        if (options.onConflict === "PAIR_ANYWAY" || forcePair) {
          foundIndex = 0; // Just take the top remaining player
        } else {
          // We can't find anyone. Switch to force-pair mode
          // for the *next* iteration to fill the group.
          // This isn't perfect, but it's better than stranding players.
          forcePair = true;
          // For now, we'll just break and let the group be smaller.
          // A more complex "float down" for FFA is non-trivial.
          // We'll just PAIR_ANYWAY from the start.
          
          // Let's simplify: if we can't find a non-rematch, we
          // will just pair anyway.
          if (candidates.length > 0) {
            foundIndex = 0;
          } else {
            break; // No candidates left at all
          }
        }
      }
      
      if (foundIndex === -1) {
        break; // No one left to add
      }

      // 4. Add the chosen candidate to the group
      const [chosen] = candidates.splice(foundIndex, 1);
      currentGroup.push(chosen);
      matched.add(chosen._id);

      // Remove the chosen player from the *main* pool
      const mainPoolIndex = pool.findIndex((p) => p._id === chosen._id);
      if (mainPoolIndex > -1) {
        pool.splice(mainPoolIndex, 1);
      }
    }
    
    // 5. Add the finalized group
    groups.push(currentGroup);
  }

  return groups;
}