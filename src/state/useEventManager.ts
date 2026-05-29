import { useState, useCallback, useEffect } from 'react';
import { EventManager, EventSettings, EventState, Player, PlayerStatus, Round, RoundMatch } from '../types';
import { generateMatchSchedule, buildPlayerStatsFromRounds } from '../utils/scheduleGenerator';
import { NUM_ROUNDS, NUM_TABLES, STORAGE_KEY, OLD_STORAGE_KEY } from '../constants';
import { generatePlayerId, loadEventState, saveEventState } from '../utils/helpers';

const initialState: EventState = {
  players: [],
  rounds: [],
  currentRoundIndex: 0,
  currentMatchIndex: 0,
  undoStack: [],
  settings: {
    numTables: NUM_TABLES as 1 | 2,
    teamSize: 2,
    numRounds: NUM_ROUNDS
  }
};

function createEmptyRounds(numRounds: number, numTables: number): Round[] {
  return Array.from({ length: numRounds }, (_, index) => ({
    id: `round-${index + 1}`,
    roundNumber: index + 1,
    matches: Array.from({ length: numTables }, (_, tableIndex) => ({
      table: (tableIndex + 1) as 1 | 2 | 3 | 4 | 5,
      teamA: { playerIds: ['', ''] },
      teamB: { playerIds: ['', ''] },
      subs: [],
      result: { winnerTeamIndex: null, locked: false }
    })),
    restingPlayerIds: []
  }));
}

function computePlayerStatsFromLockedRounds(players: Player[], rounds: Round[]): Player[] {
  const updatedPlayers = players.map((player) => ({
    ...player,
    wins: 0,
    losses: 0,
    subs: 0,
    matchesPlayed: 0
  }));

  const playerMap = new Map<string, Player>(updatedPlayers.map((player) => [player.id, player]));

  for (const round of rounds) {
    const roundCompleted = round.matches.every((match) => match.result.locked);

    for (const match of round.matches) {
      if (!match.result.locked || match.result.winnerTeamIndex === null) continue;

      const winningIds = match.result.winnerTeamIndex === 0 ? match.teamA.playerIds : match.teamB.playerIds;
      const losingIds = match.result.winnerTeamIndex === 0 ? match.teamB.playerIds : match.teamA.playerIds;

      winningIds.forEach((playerId) => {
        const player = playerMap.get(playerId);
        if (player) {
          player.wins++;
          player.matchesPlayed++;
        }
      });

      losingIds.forEach((playerId) => {
        const player = playerMap.get(playerId);
        if (player) {
          player.losses++;
          player.matchesPlayed++;
        }
      });
    }

    if (roundCompleted) {
      round.restingPlayerIds.forEach((playerId) => {
        const player = playerMap.get(playerId);
        if (player) {
          player.wins++;
          player.subs++;
          player.matchesPlayed++;
        }
      });
    }
  }

  return updatedPlayers;
}

export function useEventManager(): EventManager {
  const [state, setState] = useState<EventState>(() => {
    // Clean up old storage key if it exists
    if (typeof localStorage !== 'undefined' && localStorage.getItem(OLD_STORAGE_KEY)) {
      localStorage.removeItem(OLD_STORAGE_KEY);
    }
    const loaded = loadEventState(STORAGE_KEY);
    if (!loaded) return initialState;
    return {
      ...initialState,
      ...loaded,
      settings: {
        ...initialState.settings,
        ...(loaded.settings ?? {})
      }
    };
  });

  // Save event state to localStorage whenever it changes
  useEffect(() => {
    saveEventState(state, STORAGE_KEY);
  }, [state]);

  const addPlayer = useCallback((name: string, status: PlayerStatus = 'Active') => {
    setState((current: EventState) => ({
      ...current,
      undoStack: [...current.undoStack, { ...current, undoStack: [] }],
      players: [
        ...current.players,
        {
          id: generatePlayerId(),
          name,
          status,
          wins: 0,
          losses: 0,
          subs: 0,
          matchesPlayed: 0
        }
      ]
    }));
  }, []);

  const changePlayerStatus = useCallback((playerId: string, status: PlayerStatus) => {
    setState((current: EventState) => ({
      ...current,
      undoStack: [...current.undoStack, { ...current, undoStack: [] }],
      players: current.players.map((player) =>
        player.id === playerId ? { ...player, status } : player
      )
    }));
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    setState((current: EventState) => ({
      ...current,
      undoStack: [...current.undoStack, { ...current, undoStack: [] }],
      players: current.players.filter((p) => p.id !== playerId)
    }));
  }, []);

  const shufflePlayers = useCallback(() => {
    setState((current: EventState) => ({
      ...current,
      undoStack: [...current.undoStack, { ...current, undoStack: [] }],
      players: [...current.players].sort(() => Math.random() - 0.5)
    }));
  }, []);

  const reorderPlayers = useCallback((playerId: string, direction: 'up' | 'down') => {
    setState((current: EventState) => {
      const players = [...current.players];
      const index = players.findIndex((player) => player.id === playerId);
      if (index === -1) return current;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= players.length) return current;
      [players[index], players[targetIndex]] = [players[targetIndex], players[index]];
      return {
        ...current,
        undoStack: [...current.undoStack, { ...current, undoStack: [] }],
        players
      };
    });
  }, []);

  const clearPlayers = useCallback(() => {
    setState((current: EventState) => ({
      ...current,
      undoStack: [...current.undoStack, { ...current, undoStack: [] }],
      players: [],
      rounds: [],
      currentRoundIndex: 0,
      currentMatchIndex: 0
    }));
  }, []);

  const updateSettings = useCallback((settings: Partial<EventSettings>) => {
    setState((current: EventState) => ({
      ...current,
      undoStack: [...current.undoStack, { ...current, undoStack: [] }],
      settings: {
        ...current.settings,
        ...settings
      }
    }));
  }, []);

  const generateSchedule = useCallback(() => {
    setState((current: EventState) => ({
      ...current,
      undoStack: [...current.undoStack, { ...current, undoStack: [] }],
      players: current.players.map((player) => ({
        ...player,
        wins: 0,
        losses: 0,
        subs: 0,
        matchesPlayed: 0
      })),
      rounds: generateMatchSchedule(
        current.players,
        current.settings.numRounds,
        current.settings.numTables,
        current.settings.teamSize
      ),
      currentRoundIndex: 0,
      currentMatchIndex: 0
    }));
  }, []);

  const regenerateFromCurrent = useCallback(() => {
    setState((current: EventState) => {
      if (current.rounds.length === 0) return current;

      const activePlayers = current.players.filter((player) =>
        player.status === 'Active' || player.status === 'Arriving later'
      );

      const requiredPlayers = current.settings.numTables * current.settings.teamSize * 2;
      if (activePlayers.length < requiredPlayers) return current;

      const currentRoundIndex = current.currentRoundIndex;
      const currentRound = current.rounds[currentRoundIndex];
      const completedRounds = current.rounds.slice(0, currentRoundIndex);
      const lockedMatches = currentRound.matches.filter((match) => match.result.locked);
      const unlockedTables = currentRound.matches.length - lockedMatches.length;
      const lockedPlayerIds = new Set<string>(
        lockedMatches.flatMap((match) => [...match.teamA.playerIds, ...match.teamB.playerIds])
      );
      const unlockedPlayers = activePlayers.filter((player) => !lockedPlayerIds.has(player.id));
      const playerStats = buildPlayerStatsFromRounds(activePlayers, current.rounds);

      let regeneratedCurrentRound: Round = currentRound;
      if (unlockedTables > 0 && unlockedPlayers.length >= 4) {
        const generatedCurrentRounds = generateMatchSchedule(unlockedPlayers, 1, unlockedTables, current.settings.teamSize, playerStats);
        if (generatedCurrentRounds.length > 0) {
          regeneratedCurrentRound = {
            ...currentRound,
            matches: [...lockedMatches, ...generatedCurrentRounds[0].matches].sort((a, b) => a.table - b.table),
            restingPlayerIds: generatedCurrentRounds[0].restingPlayerIds
          };
        }
      }

      const futureRoundCount = current.rounds.length - currentRoundIndex - 1;
      const regeneratedFutureRounds = futureRoundCount > 0
        ? generateMatchSchedule(activePlayers, futureRoundCount, current.settings.numTables, current.settings.teamSize, playerStats).map((round, index) => ({
            ...round,
            id: `round-${currentRoundIndex + 2 + index}`,
            roundNumber: currentRoundIndex + 2 + index
          }))
        : [];

      return {
        ...current,
        undoStack: [...current.undoStack, { ...current, undoStack: [] }],
        rounds: [...completedRounds, regeneratedCurrentRound, ...regeneratedFutureRounds]
      };
    });
  }, []);

  const recordResult = useCallback((roundIndex: number, matchIndex: number, winnerTeamIndex: 0 | 1) => {
    setState((current: EventState) => {
      const rounds = [...current.rounds];
      const matches = [...rounds[roundIndex].matches];
      const match = { ...matches[matchIndex] };
      match.result = { winnerTeamIndex, locked: true, timestamp: new Date().toISOString() };
      matches[matchIndex] = match;
      rounds[roundIndex] = { ...rounds[roundIndex], matches };

      const updatedPlayers = computePlayerStatsFromLockedRounds(current.players, rounds);

      return {
        ...current,
        undoStack: [...current.undoStack, { ...current, undoStack: [] }],
        players: updatedPlayers,
        rounds,
        currentRoundIndex: roundIndex,
        currentMatchIndex: matchIndex
      };
    });
  }, []);

  const nextRound = useCallback(() => {
    setState((current: EventState) => ({
      ...current,
      undoStack: [...current.undoStack, { ...current, undoStack: [] }],
      currentRoundIndex: Math.min(current.currentRoundIndex + 1, current.rounds.length - 1)
    }));
  }, []);

  const undo = useCallback(() => {
    setState((current: EventState) => {
      if (current.undoStack.length === 0) {
        console.warn('No actions to undo');
        return current;
      }
      const previousState = current.undoStack[current.undoStack.length - 1];
      return {
        ...previousState,
        undoStack: current.undoStack.slice(0, -1)
      };
    });
  }, []);

  return {
    state,
    addPlayer,
    changePlayerStatus,
    removePlayer,
    shufflePlayers,
    reorderPlayers,
    clearPlayers,
    updateSettings,
    generateSchedule,
    regenerateFromCurrent,
    recordResult,
    nextRound,
    undo
  };
}
