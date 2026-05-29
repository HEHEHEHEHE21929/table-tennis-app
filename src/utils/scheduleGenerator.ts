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
  teamSize: number,
  initialStats?: Map<string, PlayerStats>
): Round[] {
  const activePlayers = players.filter((p) => p.status === 'Active' || p.status === 'Arriving later');

  const neededPlayers = numTables * teamSize * 2;
  if (activePlayers.length < neededPlayers && numTables >= 1) {
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

  let previousSubIds = new Set<string>();

  for (let roundNum = 1; roundNum <= numRounds; roundNum++) {
    const matches: any[] = [];
    const roundUsedPlayers = new Set<string>();

    const neededPlayers = numTables * teamSize * 2;
    const restCount = Math.max(0, activePlayers.length - neededPlayers);
    const restPlayers = selectRestPlayers(activePlayers, playerStats, restCount, previousSubIds);
    const restPlayerIds = new Set(restPlayers.map((p) => p.id));

    restPlayers.forEach((p) => {
      playerStats.get(p.id)!.restsScheduled++;
      playerStats.get(p.id)!.subsScheduled++;
    });

    const availableForMatches = activePlayers.filter((p) => !restPlayerIds.has(p.id));

    for (let tableNum = 1; tableNum <= numTables; tableNum++) {
      const availablePlayers = availableForMatches.filter((p) => !roundUsedPlayers.has(p.id));
      if (availablePlayers.length < teamSize * 2) break;

      const selected = selectPlayersForMatch(availablePlayers, playerStats, teamSize);
      if (selected.length < teamSize * 2) break;

      selected.forEach((player) => roundUsedPlayers.add(player.id));

      selected.forEach((player) => {
        playerStats.get(player.id)!.matchesScheduled++;
      });

      const teamAIds = selected.slice(0, teamSize).map((player) => player.id);
      const teamBIds = selected.slice(teamSize).map((player) => player.id);

      const teamAPlayers = selected.slice(0, teamSize);
      const teamBPlayers = selected.slice(teamSize);

      teamAPlayers.forEach((player) => {
        const stats = playerStats.get(player.id)!;
        for (const partner of teamAPlayers) {
          if (partner.id !== player.id) stats.partners.add(partner.id);
        }
        for (const opponent of teamBPlayers) {
          stats.opponents.add(opponent.id);
        }
      });

      teamBPlayers.forEach((player) => {
        const stats = playerStats.get(player.id)!;
        for (const partner of teamBPlayers) {
          if (partner.id !== player.id) stats.partners.add(partner.id);
        }
        for (const opponent of teamAPlayers) {
          stats.opponents.add(opponent.id);
        }
      });

      matches.push({
        table: tableNum,
        teamA: { playerIds: teamAIds },
        teamB: { playerIds: teamBIds },
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

    previousSubIds = new Set(restPlayers.map((p) => p.id));
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
  restCount: number,
  previousSubIds: Set<string> = new Set()
): Player[] {
  if (restCount <= 0) return [];

  const sortedPlayers = [...players].sort((a, b) => {
    const statsA = playerStats.get(a.id)!;
    const statsB = playerStats.get(b.id)!;
    const restDiff = statsA.restsScheduled - statsB.restsScheduled;
    if (restDiff !== 0) return restDiff;

    const penaltyA = previousSubIds.has(a.id) ? 10000 : 0;
    const penaltyB = previousSubIds.has(b.id) ? 10000 : 0;

    const aScore = statsA.subsScheduled + statsA.matchesScheduled + penaltyA;
    const bScore = statsB.subsScheduled + statsB.matchesScheduled + penaltyB;
    if (aScore !== bScore) return aScore - bScore;

    return a.name.localeCompare(b.name);
  });

  return sortedPlayers.slice(0, restCount);
}

function selectPlayersForMatch(
  players: Player[],
  playerStats: Map<string, PlayerStats>,
  teamSize: number
): Player[] {
  const needed = teamSize * 2;
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

  const selected: Player[] = [];
  const first = sortedPlayers[0];
  selected.push(first);

  let remaining = sortedPlayers.filter((player) => player.id !== first.id);

  if (teamSize > 1) {
    const partner = findBestPartner(first, remaining, playerStats);
    if (!partner) return [];
    selected.push(partner);
    remaining = remaining.filter((player) => player.id !== partner.id);
  }

  while (selected.length < needed) {
    const teamA = selected.slice(0, teamSize);
    const opponent = findBestOpponent(teamA, remaining, playerStats);
    if (!opponent) return [];
    selected.push(opponent);
    remaining = remaining.filter((player) => player.id !== opponent.id);
  }

  if (new Set(selected.map((player) => player.id)).size !== needed) {
    return [];
  }

  return selected;
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
