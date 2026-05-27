// Utility functions for the app
import { Player, EventState } from '../types';

export function generatePlayerId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadPlayersFromStorage(storageKey: string): Player[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load players from storage:', error);
  }
  return [];
}

export function savePlayersToStorage(players: Player[], storageKey: string): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(players));
  } catch (error) {
    console.error('Failed to save players to storage:', error);
  }
}

export function loadEventState(storageKey: string): EventState | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        undoStack: []
      };
    }
  } catch (error) {
    console.error('Failed to load event state from storage:', error);
  }
  return null;
}

export function saveEventState(state: EventState, storageKey: string): void {
  try {
    const stateToSave = {
      ...state,
      undoStack: []
    };
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    // Clear old key if it exists
    const oldKey = 'tt-event-players';
    if (localStorage.getItem(oldKey)) {
      localStorage.removeItem(oldKey);
    }
  } catch (error) {
    console.error('Failed to save event state to storage:', error);
  }
}
