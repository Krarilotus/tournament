import type {
  TeamOptions,
  TeamEntity,
  SwissOptions,
  SwissContext,
} from "@/lib/matchmaking/types";
import type { SerializedParticipant } from "@/lib/models/Participant";
import { pairSwiss } from "@/lib/matchmaking/core/swiss";

/**
 * Pair teams using the Swiss core.
 *
 * For now, teamPersistence is acknowledged but not yet implemented;
 * we always form fresh teams for this round. A future step will:
 * - inspect past rounds + systemOptions to reuse stable teams.
 */
export function pairTeamsSwiss(
  teams: TeamEntity[],
  options: TeamOptions,
  ctx: SwissContext
): [TeamEntity, TeamEntity][] {
  const swissOptions: SwissOptions = {
    avoidRematches: options.avoidRematches ?? true,
    relevantRoundIds: options.relevantRoundIds ?? [],
    onConflict: options.onConflict ?? "FLOAT_DOWN",
  };

  return pairSwiss(teams, swissOptions, ctx);
}