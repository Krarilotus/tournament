import type {
  SwissEntity,
  SwissOptions,
  SwissContext,
} from "@/lib/matchmaking/types";
import type { SerializedMatch } from "@/lib/types";

/**
 * Normalize a participantId or entity id into a string.
 * Handles string, {_id}, or ObjectId-ish values.
 */
export function normalizeId(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    if (typeof raw._id === "string") return raw._id;
    if (raw._id && typeof raw._id.toString === "function") {
      return raw._id.toString();
    }
    if (typeof raw.id === "string") return raw.id;
  }
  if (typeof raw.toString === "function") {
    return raw.toString();
  }
  return null;
}

/**
 * Build a map of opponents for each entity, based on past matches and
 * round-level options (avoidRematches, relevantRoundIds).
 *
 * opponentMap.get("playerA") -> Set(["playerB", "playerC", ...])
 */
export function buildOpponentMap(
  entities: SwissEntity[],
  options: SwissOptions,
  ctx: SwissContext
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  // If we don't care about rematches, skip all this work
  if (!options.avoidRematches) {
    return map;
  }

  const relevantRounds = new Set(options.relevantRoundIds ?? []);
  const idsOfInterest = new Set(entities.map((e) => e.id));

  const matches: SerializedMatch[] = (ctx.matches || []) as any[];

  for (const match of matches) {
    const roundId = normalizeId((match as any).roundId);
    const status: string | undefined = (match as any).status;

    // Only consider completed matches
    if (status && status !== "completed") continue;

    // If relevantRoundIds is non-empty, filter by them
    if (relevantRounds.size > 0 && roundId && !relevantRounds.has(roundId)) {
      continue;
    }

    const participants = ((match as any).participants ?? []) as any[];

    // Build edges between all pairs of participants in this match
    const participantIds = participants
      .map((p) => normalizeId(p.participantId))
      .filter((id): id is string => !!id);

    const n = participantIds.length;
    for (let i = 0; i < n; i++) {
      const a = participantIds[i];
      if (!idsOfInterest.has(a)) continue;

      for (let j = i + 1; j < n; j++) {
        const b = participantIds[j];
        if (!idsOfInterest.has(b)) continue;

        // a <-> b
        if (!map.has(a)) map.set(a, new Set<string>());
        if (!map.has(b)) map.set(b, new Set<string>());

        map.get(a)!.add(b);
        map.get(b)!.add(a);
      }
    }
  }

  return map;
}

/**
 * Check if two entities have played before, according to the opponent map.
 */
export function havePlayedBefore(
  aId: string,
  bId: string,
  options: SwissOptions,
  opponentMap: Map<string, Set<string>>
): boolean {
  if (!options.avoidRematches) return false;
  const opponentsOfA = opponentMap.get(aId);
  if (!opponentsOfA) return false;
  return opponentsOfA.has(bId);
}

/* ------------------------------------------------------------------ */
/* Helpers for score vectors / equality                               */
/* ------------------------------------------------------------------ */

/**
 * Extract a "score vector" from an entity.
 * - If entity has a `scores` object, we use all numeric fields from it.
 * - Otherwise, if it has a numeric `score` field, we use that as `points`.
 * - Otherwise we return an empty vector.
 *
 * This way, grouping respects all tie-breakers as long as they are encoded
 * in the `scores` object (points, buchholz, buchholz2, GameWins, ...).
 */
function getScoreVector(e: SwissEntity): Record<string, number> {
  const anyE = e as any;

  if (anyE && typeof anyE.scores === "object" && anyE.scores !== null) {
    const vec: Record<string, number> = {};
    for (const [k, v] of Object.entries<any>(anyE.scores)) {
      if (typeof v === "number") {
        vec[k] = v;
      }
    }
    return vec;
  }

  if (typeof anyE?.score === "number") {
    return { points: anyE.score };
  }

  return {};
}

/**
 * Two entities are in the same "score group" iff all numeric entries in
 * their score vectors are identical. This includes points *and* all
 * tie-breakers present in `scores`.
 */
function scoresEqual(a: SwissEntity, b: SwissEntity): boolean {
  const va = getScoreVector(a);
  const vb = getScoreVector(b);

  const keys = new Set([...Object.keys(va), ...Object.keys(vb)]);
  for (const key of keys) {
    const aVal = va[key] ?? 0;
    const bVal = vb[key] ?? 0;
    if (aVal !== bVal) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  Generic Swiss (simple top-down neighbour pairing)                 */
/* ------------------------------------------------------------------ */

function pairSwissGeneric<T extends SwissEntity>(
  entities: T[],
  options: SwissOptions,
  opponentMap: Map<string, Set<string>>
): [T, T][] {
  const list: T[] = [...entities];
  const pairs: [T, T][] = [];

  if (list.length < 2) return pairs;

  const avoidRematches = !!options.avoidRematches;
  const conflictMode: "FLOAT_DOWN" | "PAIR_ANYWAY" =
    (options.onConflict as any) || "PAIR_ANYWAY";

  while (list.length > 1) {
    const a = list.shift() as T;

    // Try to find best non-rematch opponent
    let chosenIndex = -1;

    if (avoidRematches) {
      for (let i = 0; i < list.length; i++) {
        const candidate = list[i];
        if (!havePlayedBefore(a.id, candidate.id, options, opponentMap)) {
          chosenIndex = i;
          break;
        }
      }
    }

    if (chosenIndex === -1) {
      // We either don't avoid rematches at all,
      // or couldn't find a non-rematch candidate.
      if (!avoidRematches || list.length === 0) {
        chosenIndex = 0;
      } else if (conflictMode === "PAIR_ANYWAY") {
        // Pair with the strongest remaining opponent (top of the list)
        chosenIndex = 0;
      } else {
        // FLOAT_DOWN: put A at the end and try again later
        list.push(a);
        continue;
      }
    }

    const [b] = list.splice(chosenIndex, 1);
    if (!b) break;

    pairs.push([a, b]);
  }

  return pairs;
}

/* ------------------------------------------------------------------ */
/*  FIDE / Dutch Swiss                                                */
/* ------------------------------------------------------------------ */

/**
 * FIDE Dutch–style pairing:
 * - `entities` are assumed pre-sorted by standings (points + all tie-breakers).
 * - Build score groups as contiguous runs of entities with identical score
 *   vectors (via `scoresEqual`).
 * - For each group: split into upper/lower halves, pair top[i] vs bottom[j].
 * - If group size is odd, float the lowest entity down to the next group.
 * - Avoid rematches via opponentMap + havePlayedBefore.
 * - If constraints are impossible under FLOAT_DOWN, fall back to the
 *   generic Swiss on the remaining pool.
 */
function pairSwissFideDutch<T extends SwissEntity>(
  entities: T[],
  options: SwissOptions,
  opponentMap: Map<string, Set<string>>
): [T, T][] {
  const pairs: [T, T][] = [];

  if (entities.length < 2) return pairs;

  const avoidRematches = !!options.avoidRematches;
  const conflictMode: "FLOAT_DOWN" | "PAIR_ANYWAY" =
    (options.onConflict as any) || "PAIR_ANYWAY";

  // 1) Build groups as contiguous runs of equal score vectors
  const groups: T[][] = [];
  let currentGroup: T[] = [];

  for (const e of entities) {
    if (currentGroup.length === 0) {
      currentGroup.push(e);
    } else {
      const last = currentGroup[currentGroup.length - 1];
      if (scoresEqual(last, e)) {
        currentGroup.push(e);
      } else {
        groups.push(currentGroup);
        currentGroup = [e];
      }
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // 2) Float down: if a group is odd, move its last element to the next group
  let carry: T | null = null;

  for (let gi = 0; gi < groups.length; gi++) {
    let group = groups[gi];

    if (carry) {
      group = [carry, ...group];
      groups[gi] = group;
      carry = null;
    }

    if (group.length % 2 === 1) {
      carry = group.pop() || null;
    }
  }

  if (carry) {
    groups[groups.length - 1].push(carry);
  }

  // 3) Pair inside each group (top vs bottom) with rematch avoidance
  const leftovers: T[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    if (group.length === 0) continue;
    if (group.length === 1) {
      leftovers.push(group[0]);
      continue;
    }

    const half = Math.floor(group.length / 2);
    const top = group.slice(0, half);
    const bottomPool = group.slice(half); // will mutate

    for (let i = 0; i < top.length; i++) {
      const a = top[i];
      if (!a) continue;

      if (bottomPool.length === 0) {
        leftovers.push(a);
        continue;
      }

      // Default FIDE correspondence: a[i] vs bottom[i]
      let bIndex = i < bottomPool.length ? i : bottomPool.length - 1;

      if (avoidRematches) {
        let foundIndex = -1;

        for (let j = 0; j < bottomPool.length; j++) {
          const candidate = bottomPool[j];
          if (!havePlayedBefore(a.id, candidate.id, options, opponentMap)) {
            foundIndex = j;
            break;
          }
        }

        if (foundIndex === -1) {
          // No non-rematch candidate in this group
          if (conflictMode === "PAIR_ANYWAY") {
            // Take strongest remaining from lower half
            bIndex = 0;
          } else {
            // FLOAT_DOWN: fall back to generic Swiss for the rest
            const remainingFromThisGroup: T[] = [
              ...top.slice(i), // includes current 'a'
              ...bottomPool,
            ];
            const remainingFromLaterGroups: T[] = groups
              .slice(gi + 1)
              .flat();

            const genericInput: T[] = [
              ...remainingFromThisGroup,
              ...remainingFromLaterGroups,
            ];

            const genericPairs = pairSwissGeneric(
              genericInput,
              options,
              opponentMap
            );
            return [...pairs, ...genericPairs];
          }
        } else {
          bIndex = foundIndex;
        }
      }

      const [b] = bottomPool.splice(bIndex, 1);
      if (!b) {
        leftovers.push(a);
        continue;
      }

      pairs.push([a, b]);
    }
  }

  // 4) Any leftovers get paired by the generic Swiss engine
  if (leftovers.length > 0) {
    const extraPairs = pairSwissGeneric(leftovers, options, opponentMap);
    pairs.push(...extraPairs);
  }

  return pairs;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Swiss pairing function.
 *
 * Behaviour:
 * - Entities are assumed sorted by score/tiebreaks descending before this call.
 * - Variant:
 *   - options.variant === "FIDE_DUTCH" -> grouped top-vs-bottom Dutch system
 *   - otherwise -> simple top-down neighbour Swiss
 *
 * Notes:
 * - Bye handling is done outside this function (we assume an even number of entities).
 * - This function is generic in T, as long as T extends SwissEntity.
 */
export function pairSwiss<T extends SwissEntity>(
  entities: T[],
  options: SwissOptions,
  ctx: SwissContext
): [T, T][] {
  const opponentMap = buildOpponentMap(entities, options, ctx);
  const variant = (options as any).variant || "GENERIC";

  if (variant === "FIDE_DUTCH") {
    return pairSwissFideDutch(entities, options, opponentMap);
  }

  // Default: simple generic Swiss
  return pairSwissGeneric(entities, options, opponentMap);
}
