import mongoose from 'mongoose';
import Participant from '@/lib/models/Participant';
import Match, { IMatch } from '@/lib/models/Match';
import Round from '@/lib/models/Round';
import { ITournament } from '@/lib/models/Tournament';

// --- Type Definitions ---
type ParticipantUpdate = {
  scores: {
    points: number;
    wins: number;
    losses: number;
    draws: number;
    buchholz: number;
    buchholz2: number;
    [key: string]: any;
  };
  matchHistory: mongoose.Types.ObjectId[];
  opponentIds: Set<string>;
};

// --- HELPER: Safe Map/Object Access ---
function safelyGetPointValue(source: any, key: string): number {
  if (!source) return 0;
  if (source instanceof Map) return source.get(key) ?? 0;
  if (typeof source === 'object') return source[key] ?? 0;
  return 0;
}

// --- HELPER: Calculate Points for a single result ---
function computePointsForResult(
  tournamentSettings: ITournament['settings'],
  round: any,
  match: IMatch,
  matchParticipant: any
): number {
  // Robustly determine if round options exist
  const roundMap = round?.pointSystem;
  const tournamentMap = tournamentSettings.pointSystem;

  let useRoundMap = false;
  if (roundMap) {
    if (roundMap instanceof Map && roundMap.size > 0) useRoundMap = true;
    else if (typeof roundMap === 'object' && Object.keys(roundMap).length > 0) useRoundMap = true;
  }

  const activeSource = useRoundMap ? roundMap : tournamentMap;
  const isTeamMatch = (match.participants as any[]).some((p) => p.team);
  const isFFA = !isTeamMatch && match.participants.length > 2;

  // FFA Logic
  if (isFFA) {
    const ffaMap = round?.ffaPlacements;
    const res = (matchParticipant.result || '').toString().toLowerCase();
    const placeMatch = res.match(/\d+/);
    if (!placeMatch) return 0;
    return safelyGetPointValue(ffaMap, placeMatch[0]);
  }

  // 1v1 / Team Logic
  const res = (matchParticipant.result || '').toString().toLowerCase();
  if (res === 'win' || res === '1st') return safelyGetPointValue(activeSource, 'win');
  if (res === 'draw') return safelyGetPointValue(activeSource, 'draw');
  if (res === 'loss') return safelyGetPointValue(activeSource, 'loss');

  return 0;
}

// --- HELPER: Tally W/L/D ---
function tallyResult(scores: ParticipantUpdate['scores'], result: string | undefined) {
  if (!result) return;
  const res = result.toLowerCase();
  
  if (res === 'win' || res === '1st') scores.wins += 1;
  else if (res === 'loss' || res.includes('nd') || res.includes('rd') || res.includes('th')) scores.losses += 1;
  else if (res === 'draw') scores.draws += 1;
}

// --- MAIN LOGIC ---
export async function recalculateStandings(tournamentId: string, tournamentSettings: ITournament['settings']) {
  const allParticipants = await Participant.find({ tournamentId });
  const allCompletedMatches: IMatch[] = await Match.find({ tournamentId, status: 'completed' });
  const allRounds = await Round.find({ tournamentId });
  
  const roundsMap = new Map<string, any>();
  for (const r of allRounds) roundsMap.set(r._id.toString(), r);

  // 1. Reset Scores
  const participantUpdates = new Map<string, ParticipantUpdate>();
  const customStatKeys = tournamentSettings.customStats || [];

  for (const p of allParticipants) {
    const baseScores: any = { points: 0, wins: 0, losses: 0, draws: 0, buchholz: 0, buchholz2: 0 };
    for (const key of customStatKeys) baseScores[key] = 0;
    
    participantUpdates.set(p._id.toString(), {
      scores: baseScores,
      matchHistory: [],
      opponentIds: new Set<string>(),
    });
  }

  // 2. Tally Matches
  for (const match of allCompletedMatches) {
    const round = roundsMap.get(match.roundId.toString());
    const isByeMatch = match.participants.length === 1;
    const pIdsInMatch = match.participants.map((p: any) => p.participantId.toString());

    for (const mp of match.participants as any[]) {
      const pid = mp.participantId.toString();
      const update = participantUpdates.get(pid);
      if (!update) continue;

      // Points
      const pts = isByeMatch ? (mp.pointsAwarded || 0) : computePointsForResult(tournamentSettings, round, match, mp);
      update.scores.points += pts;

      // W/L/D
      tallyResult(update.scores, mp.result);

      // Custom Stats (Fixed TypeScript Error)
      if (mp.customStats) {
        let entries: [string, any][] = [];
        
        if (mp.customStats instanceof Map) {
          entries = Array.from(mp.customStats.entries());
        } else if (typeof mp.customStats === 'object') {
          entries = Object.entries(mp.customStats);
        }

        // Now 'entries' is guaranteed to be iterable
        for (const [k, v] of entries) {
           if (typeof v === 'number') {
             update.scores[k] = (update.scores[k] || 0) + v;
           }
        }
      }

      update.matchHistory.push(match._id);

      // Opponents (for Buchholz)
      if (!isByeMatch) {
        pIdsInMatch.forEach(oppId => {
          if (oppId !== pid) update.opponentIds.add(oppId);
        });
      }
    }
  }

  // 3. Buchholz (Pass 1)
  const finalPointsMap = new Map<string, number>();
  participantUpdates.forEach((u, id) => finalPointsMap.set(id, u.scores.points));

  const finalBuchholzMap = new Map<string, number>();
  for (const [pid, update] of participantUpdates.entries()) {
    let score = 0;
    update.opponentIds.forEach(oid => score += (finalPointsMap.get(oid) || 0));
    update.scores.buchholz = score;
    finalBuchholzMap.set(pid, score);
  }

  // 4. Buchholz-2 (Pass 2)
  for (const [_, update] of participantUpdates.entries()) {
    let score = 0;
    update.opponentIds.forEach(oid => score += (finalBuchholzMap.get(oid) || 0));
    update.scores.buchholz2 = score;
  }

  // 5. Bulk Save
  const bulkOps = [];
  for (const [pid, update] of participantUpdates.entries()) {
    bulkOps.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(pid) },
        update: { $set: { scores: update.scores, matchHistory: update.matchHistory } },
      },
    });
  }

  if (bulkOps.length > 0) {
    await Participant.bulkWrite(bulkOps);
  }
}