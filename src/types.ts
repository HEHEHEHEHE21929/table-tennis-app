export type PlayerStatus = 'Active' | 'Resting' | 'Left' | 'Arriving later';

export interface Player {
  id: string;
  name: string;
  status: PlayerStatus;
  wins: number;
  losses: number;
  subs: number;
  matchesPlayed: number;
}

export interface MatchTeam {
  playerIds: string[];
}

export interface MatchResult {
  winnerTeamIndex: 0 | 1 | null;
  locked: boolean;
  timestamp?: string;
}

export interface RoundMatch {
  table: number;
  teamA: MatchTeam;
  teamB: MatchTeam;
  subs: string[];
  result: MatchResult;
}

export interface Round {
  id: string;
  roundNumber: number;
  matches: RoundMatch[];
  restingPlayerIds: string[];
}

export interface EventSettings {
  numTables: 1 | 2;
  teamSize: 1 | 2;
  numRounds: number;
}

export interface EventState {
  players: Player[];
  rounds: Round[];
  currentRoundIndex: number;
  currentMatchIndex: number;
  undoStack: EventState[];
  settings: EventSettings;
}

export interface EventManager {
  state: EventState;
  addPlayer: (name: string, status?: PlayerStatus) => void;
  changePlayerStatus: (playerId: string, status: PlayerStatus) => void;
  removePlayer: (playerId: string) => void;
  shufflePlayers: () => void;
  reorderPlayers: (playerId: string, direction: 'up' | 'down') => void;
  clearPlayers: () => void;
  updateSettings: (settings: Partial<EventSettings>) => void;
  generateSchedule: () => void;
  regenerateFromCurrent: () => void;
  recordResult: (roundIndex: number, matchIndex: number, winnerTeamIndex: 0 | 1) => void;
  nextRound: () => void;
  undo: () => void;
}
