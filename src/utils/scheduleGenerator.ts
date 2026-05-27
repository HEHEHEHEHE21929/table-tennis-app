import { Player, Round } from '../types';

interface PlayerStats {
  playerId: string;
  matchesScheduled: number;
  subsScheduled: number;
  restsScheduled: number;
  partners: Set<string>;
  opponents: Set<string>;
}

export function generateMatchSchedule(
  players: Player[],
  numRounds: number,
  numTables: number,
  initialStats?: Map<string, PlayerStats>
): Round[] {
  const activePlayers = players.filter((p) => p.status === 'Active' || p.status === 'Arriving later');

  if (activePlayers.length < 4 && numTables >= 1) {
    console.warn('Not enough players for a match');
    return [];
  }

  const rounds: Round[] = [];
  const playerStats = new Map<string, PlayerStats>();

  activePlayers.forEach((p) => {
    playerStats.set(p.id, {
      playerId: p.id,
      matchesScheduled: 0,
      subsScheduled: 0,
      restsScheduled: 0,
      partners: new Set(),
      opponents: new Set()
    });
  });

  if (initialStats) {
    for (const [playerId, initial] of initialStats.entries()) {
      const stats = playerStats.get(playerId);
      if (stats) {
        stats.matchesScheduled = initial.matchesScheduled;
        stats.subsScheduled = initial.subsScheduled;
        stats.restsScheduled = initial.restsScheduled;
        stats.partners = new Set(initial.partners);
        stats.opponents = new Set(initial.opponents);
      }
    }
  }

  for (let roundNum = 1; roundNum <= numRounds; roundNum++) {
    const matches: any[] = [];
    const roundUsedPlayers = new Set<string>();

    const neededPlayers = numTables * 4;
    const restCount = Math.max(0, activePlayers.length - neededPlayers);
    const restPlayers = selectRestPlayers(activePlayers, playerStats, restCount);
    const restPlayerIds = new Set(restPlayers.map((p) => p.id));

    restPlayers.forEach((p) => {
      playerStats.get(p.id)!.restsScheduled++;
      playerStats.get(p.id)!.subsScheduled++;
    });

    const availableForMatches = activePlayers.filter((p) => !restPlayerIds.has(p.id));

    for (let tableNum = 1; tableNum <= numTables; tableNum++) {
      const availablePlayers = availableForMatches.filter((p) => !roundUsedPlayers.has(p.id));
      if (availablePlayers.length < 4) break;

      const selected = selectPlayersForMatch(availablePlayers, playerStats, 4);
      if (selected.length < 4) break;

      const [p1, p2, p3, p4] = selected;
      roundUsedPlayers.add(p1.id);
      roundUsedPlayers.add(p2.id);
      roundUsedPlayers.add(p3.id);
      roundUsedPlayers.add(p4.id);

      const stats1 = playerStats.get(p1.id)!;
      const stats2 = playerStats.get(p2.id)!;
      const stats3 = playerStats.get(p3.id)!;
      const stats4 = playerStats.get(p4.id)!;

      stats1.matchesScheduled++;
      stats2.matchesScheduled++;
      stats3.matchesScheduled++;
      stats4.matchesScheduled++;

      stats1.partners.add(p2.id);
      stats2.partners.add(p1.id);
      stats3.partners.add(p4.id);
      stats4.partners.add(p3.id);

      stats1.opponents.add(p3.id);
      stats1.opponents.add(p4.id);
      stats2.opponents.add(p3.id);
      stats2.opponents.add(p4.id);
      stats3.opponents.add(p1.id);
      stats3.opponents.add(p2.id);
      stats4.opponents.add(p1.id);
      stats4.opponents.add(p2.id);

      matches.push({
        table: tableNum,
        teamA: { playerIds: [p1.id, p2.id] },
        teamB: { playerIds: [p3.id, p4.id] },
        subs: [],
        result: { winnerTeamIndex: null, locked: false }
      });
    }

    const playersInMatches = new Set(
      matches.flatMap((m) => [...m.teamA.playerIds, ...m.teamB.playerIds])
    );
    const subs = activePlayers
      .filter((p) => !playersInMatches.has(p.id))
      .map((p) => p.id);

    rounds.push({
      id: `round-${roundNum}`,
      roundNumber: roundNum,
      matches: matches.map((m) => ({
        ...m,
        subs
      })),
      restingPlayerIds: restPlayers.map((p) => p.id)
    });
  }

  return rounds;
}

export function buildPlayerStatsFromRounds(players: Player[], rounds: Round[]): Map<string, PlayerStats> {
  const playerStats = new Map<string, PlayerStats>();

  players.forEach((player) => {
    playerStats.set(player.id, {
      playerId: player.id,
      matchesScheduled: 0,
      subsScheduled: 0,
      restsScheduled: 0,
      partners: new Set(),
      opponents: new Set()
    });
  });

  for (const round of rounds) {
    const roundCompleted = round.matches.every((match) => match.result.locked);
    const lockedMatches = round.matches.filter((match) => match.result.locked);

    for (const match of lockedMatches) {
      const teamAIds = match.teamA.playerIds;
      const teamBIds = match.teamB.playerIds;

      teamAIds.forEach((playerId) => {
        const stats = playerStats.get(playerId);
        if (stats) {
          stats.matchesScheduled++;
          teamBIds.forEach((opponentId) => stats.opponents.add(opponentId));
          teamAIds.filter((id) => id !== playerId).forEach((partnerId) => stats.partners.add(partnerId));
        }
      });

      teamBIds.forEach((playerId) => {
        const stats = playerStats.get(playerId);
        if (stats) {
          stats.matchesScheduled++;
          teamAIds.forEach((opponentId) => stats.opponents.add(opponentId));
          teamBIds.filter((id) => id !== playerId).forEach((partnerId) => stats.partners.add(partnerId));
        }
      });
    }

    if (roundCompleted) {
      round.restingPlayerIds.forEach((playerId) => {
        const stats = playerStats.get(playerId);
        if (stats) {
          stats.subsScheduled++;
          stats.restsScheduled++;
        }
      });
    }
  }

  return playerStats;
}
function selectRestPlayers(
  players: Player[],
  playerStats: Map<string, PlayerStats>,
  restCount: number
): Player[] {
  if (restCount <= 0) return [];

  const sortedPlayers = [...players].sort((a, b) => {
    const statsA = playerStats.get(a.id)!;
    const statsB = playerStats.get(b.id)!;
    const restDiff = statsA.restsScheduled - statsB.restsScheduled;
    if (restDiff !== 0) return restDiff;

    const aScore = statsA.subsScheduled + statsA.matchesScheduled;
    const bScore = statsB.subsScheduled + statsB.matchesScheduled;
    if (aScore !== bScore) return aScore - bScore;

    return a.name.localeCompare(b.name);
  });

  return sortedPlayers.slice(0, restCount);
}

function selectPlayersForMatch(
  players: Player[],
  playerStats: Map<string, PlayerStats>,
  needed: number
): Player[] {
  if (players.length < needed) {
    return [];
  }

  const sortedPlayers = [...players].sort((a, b) => {
    const statsA = playerStats.get(a.id)!;
    const statsB = playerStats.get(b.id)!;
    const aScore = statsA.matchesScheduled + statsA.subsScheduled;
    const bScore = statsB.matchesScheduled + statsB.subsScheduled;
    return aScore - bScore || a.name.localeCompare(b.name);
  });

  const first = sortedPlayers[0];
  const partner = findBestPartner(first, sortedPlayers.slice(1), playerStats);
  if (!partner) return [];

  const remainingAfterPartner = sortedPlayers.filter((player) => player.id !== partner.id && player.id !== first.id);
  const opponent1 = findBestOpponent([first, partner], remainingAfterPartner, playerStats);
  if (!opponent1) return [];

  const remainingAfterOpp1 = remainingAfterPartner.filter((player) => player.id !== opponent1.id);
  const opponent2 = findBestOpponent([first, partner], remainingAfterOpp1, playerStats);
  if (!opponent2) return [];

  if (new Set([first.id, partner.id, opponent1.id, opponent2.id]).size !== 4) {
    return [];
  }

  return [first, partner, opponent1, opponent2];
}

function findBestPartner(
  player: Player,
  candidates: Player[],
  playerStats: Map<string, PlayerStats>
): Player | null {
  let best: Player | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  const playerStat = playerStats.get(player.id)!;

  for (const candidate of candidates) {
    const candidateStat = playerStats.get(candidate.id)!;
    const repeatPartner = playerStat.partners.has(candidate.id) ? 1 : 0;
    const score = repeatPartner * 100 + candidateStat.matchesScheduled + candidateStat.subsScheduled;

    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function findBestOpponent(
  team: Player[],
  candidates: Player[],
  playerStats: Map<string, PlayerStats>
): Player | null {
  let best: Player | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const candidateStat = playerStats.get(candidate.id)!;
    let repeatOpponentCount = 0;
    for (const teamPlayer of team) {
      if (playerStats.get(teamPlayer.id)?.opponents.has(candidate.id)) {
        repeatOpponentCount += 1;
      }
    }
    const score = repeatOpponentCount * 100 + candidateStat.matchesScheduled + candidateStat.subsScheduled;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}
