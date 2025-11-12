// lib/standings/getStandings.ts
import Participant, {
  IParticipant,
  SerializedParticipant,
} from "@/lib/models/Participant";

const serializeParticipant = (p: IParticipant): SerializedParticipant => {
  const rawScores: any = (p as any).scores || {};

  const scores =
    rawScores && typeof rawScores.toObject === "function"
      ? rawScores.toObject({ minimize: false })
      : { ...rawScores };

  return {
    _id: p._id.toString(),
    tournamentId: p.tournamentId.toString(),
    name: p.name,
    customId: p.customId,
    isActive: p.isActive,
    scores,
    matchHistory: p.matchHistory.map((id) => id.toString()),
  };
};

export async function getStandings(
  tournamentId: string,
  tieBreakers: string[],
  activeOnly: boolean = false
): Promise<SerializedParticipant[]> {
  const participantFilter: { tournamentId: any; isActive?: boolean } = {
    tournamentId,
  };
  if (activeOnly) {
    participantFilter.isActive = true;
  }

  const participants = await Participant.find(participantFilter);
  const effectiveTieBreakers =
    tieBreakers.length > 0 ? tieBreakers : ["points"];

  participants.sort((a, b) => {
    for (const tieBreaker of effectiveTieBreakers) {
      if (tieBreaker === "directComparison") continue;

      let valA: number = (a.scores as any)?.[tieBreaker] ?? 0;
      let valB: number = (b.scores as any)?.[tieBreaker] ?? 0;

      if (valB > valA) return 1;
      if (valB < valA) return -1;
    }
    return 0;
  });

  const serialized = participants.map(serializeParticipant);

  return serialized;
}
