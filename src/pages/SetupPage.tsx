import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventManager, PlayerStatus } from '../types';
import { useAppToast } from '../context/ToastContext';

interface Props {
  eventManager: EventManager;
}

const statuses: PlayerStatus[] = ['Active', 'Resting', 'Left', 'Arriving later'];

export default function SetupPage({ eventManager }: Props) {
  const [name, setName] = useState('');
  const { showToast } = useAppToast();
  const navigate = useNavigate();

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

  const handleMovePlayer = (playerId: string, direction: 'up' | 'down') => {
    eventManager.reorderPlayers(playerId, direction);
    showToast('Player order updated', 'success');
  };

  const handleGenerateSchedule = () => {
    if (eventManager.state.players.filter(p => p.status === 'Active' || p.status === 'Arriving later').length < 4) {
      showToast('Need at least 4 active or arriving players to generate a schedule', 'error');
      return;
    }
    eventManager.generateSchedule();
    showToast('Schedule generated successfully!', 'success');
    setTimeout(() => navigate('/schedule'), 0);
  };

  const handleRegenerateFromCurrent = () => {
    if (eventManager.state.rounds.length === 0) {
      showToast('No schedule to regenerate yet.', 'error');
      return;
    }
    eventManager.regenerateFromCurrent();
    showToast('Schedule regenerated from current round. Completed matches remain locked.', 'success');
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAddPlayer();
  };

  const handleExportPlayers = () => {
    const playerData = eventManager.state.players.map((p) => `${p.name} (${p.status})`).join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(playerData));
    element.setAttribute('download', 'table-tennis-players.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Players exported!', 'success');
  };

  const handleClearAllPlayers = () => {
    if (window.confirm('Are you sure you want to remove all players? This cannot be undone.')) {
      const count = eventManager.state.players.length;
      eventManager.clearPlayers();
      showToast(`${count} players removed`, 'info');
    }
  };

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="page-tag">Setup</p>
          <h2>Manage players and generate the match plan</h2>
        </div>
        <button
          className="primary-btn"
          onClick={handleGenerateSchedule}
          disabled={eventManager.state.players.filter(p => p.status === 'Active' || p.status === 'Arriving later').length < 4}
          title="Generate schedule and navigate to Schedule page"
        >
          Generate Plan
        </button>
      </div>

      <div className="setup-grid">
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
              <button className="ghost-btn" onClick={handleExportPlayers} disabled={eventManager.state.players.length === 0} title="Export player list">
                📤 Export
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
                    onClick={() => handleMovePlayer(player.id, 'up')}
                    disabled={index === 0}
                    title="Move up"
                    aria-label={`Move ${player.name} up`}
                  >
                    ▲
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => handleMovePlayer(player.id, 'down')}
                    disabled={index === eventManager.state.players.length - 1}
                    title="Move down"
                    aria-label={`Move ${player.name} down`}
                  >
                    ▼
                  </button>
                  <select
                    value={player.status}
                    onChange={(event) => {
                      eventManager.changePlayerStatus(player.id, event.target.value as PlayerStatus);
                      showToast(`${player.name} status changed to ${event.target.value}`, 'success');
                    }}
                    title="Change player status"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
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

        <div className="panel settings-panel">
          <div className="panel-header">
            <div>
              <h3>Event Settings</h3>
              <p className="panel-note">Quick actions and info</p>
            </div>
          </div>

          <div className="settings-card success-box">
            <h4>Current Configuration</h4>
            <div className="settings-info">
              <p><strong>Tables:</strong> 2</p>
              <p><strong>Game type:</strong> 2v2</p>
              <p><strong>Total rounds:</strong> 10</p>
              <p><strong>Active players:</strong> {eventManager.state.players.filter(p => p.status === 'Active' || p.status === 'Arriving later').length}</p>
            </div>
            <button
              className="success-btn"
              onClick={handleGenerateSchedule}
              disabled={eventManager.state.players.filter(p => p.status === 'Active' || p.status === 'Arriving later').length < 4}
            >
              Generate New Schedule
            </button>
              <button
                className="secondary-btn"
                onClick={handleRegenerateFromCurrent}
                disabled={eventManager.state.rounds.length === 0}
              >
                Regenerate from current round
              </button>
              <p className="warning-note">Completed matches will stay locked. Only upcoming matches will change.</p>
            <button className="danger-btn" onClick={handleClearAllPlayers} disabled={eventManager.state.players.length === 0}>
              Clear All Players
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
