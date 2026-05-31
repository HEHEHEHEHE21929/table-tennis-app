import { type FormEvent, useState } from 'react';
import { EventManager } from '../types';
import { useAppToast } from '../context/ToastContext';

interface Props {
  eventManager: EventManager;
}

export default function PlayersPage({ eventManager }: Props) {
  const [name, setName] = useState('');
  const { showToast } = useAppToast();

  const handleAddPlayer = () => {
    if (!name.trim()) {
      showToast('Please enter a player name', 'error');
      return;
    }
    if (eventManager.state.players.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
      showToast('Player name already exists', 'error');
      return;
    }
    eventManager.addPlayer(name.trim());
    setName('');
    showToast(`${name.trim()} added successfully!`, 'success');
  };

  const handleRemovePlayer = (playerId: string, playerName: string) => {
    if (window.confirm(`Remove ${playerName}?`)) {
      eventManager.removePlayer(playerId);
      showToast(`${playerName} removed`, 'info');
    }
  };

  const handleShufflePlayers = () => {
    eventManager.shufflePlayers();
    showToast('Players shuffled!', 'success');
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAddPlayer();
  };

  return (
    <section className="page-section">
      <div className="panel players-panel">
        <div className="panel-header">
          <div>
            <h3>Players ({eventManager.state.players.length})</h3>
            <p className="panel-note">Add, remove, and organize players</p>
          </div>
          <div className="player-actions">
            <button className="ghost-btn" onClick={handleShufflePlayers} disabled={eventManager.state.players.length < 2} title="Shuffle player order">
              🔀 Shuffle
            </button>
          </div>
        </div>

        <form className="form-row top-player-form" onSubmit={handleFormSubmit}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Type player name and press Enter"
            onKeyDown={(event) => event.key === 'Enter' && handleAddPlayer()}
            aria-label="New player name"
            autoFocus
          />
          <button className="primary-btn" type="submit" disabled={!name.trim()}>
            Add Player
          </button>
        </form>

        <ul className="player-list">
          {eventManager.state.players.map((player, index) => (
            <li key={player.id} className={`player-item status-${player.status.toLowerCase().replace(' ', '-')}`}>
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                <span className="player-status">{player.status}</span>
              </div>
              <div className="player-actions-inline">
                <button
                  className="icon-btn"
                  onClick={() => eventManager.reorderPlayers(player.id, 'up')}
                  disabled={index === 0}
                  title={`Move ${player.name} up`}
                  aria-label={`Move ${player.name} up`}
                >
                  ▲
                </button>
                <button
                  className="icon-btn"
                  onClick={() => eventManager.reorderPlayers(player.id, 'down')}
                  disabled={index === eventManager.state.players.length - 1}
                  title={`Move ${player.name} down`}
                  aria-label={`Move ${player.name} down`}
                >
                  ▼
                </button>
                <select
                  value={player.status}
                  onChange={(event) => eventManager.changePlayerStatus(player.id, event.target.value as any)}
                  title="Change player status"
                >
                  <option value="Active">Active</option>
                  <option value="Resting">Resting</option>
                  <option value="Left">Left</option>
                  <option value="Arriving later">Arriving later</option>
                </select>
                <button
                  className="remove-btn"
                  onClick={() => handleRemovePlayer(player.id, player.name)}
                  title="Remove player"
                  aria-label={`Remove ${player.name}`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
