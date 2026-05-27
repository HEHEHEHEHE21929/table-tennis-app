import { useState } from 'react';
import { EventManager } from '../types';
import { useAppToast } from '../context/ToastContext';
import { Link, useNavigate } from 'react-router-dom';

interface Props {
  eventManager: EventManager;
}

export default function CurrentMatchPage({ eventManager }: Props) {
  const { rounds, currentRoundIndex, players } = eventManager.state;
  const round = rounds[currentRoundIndex];
  const { showToast } = useAppToast();
  const navigate = useNavigate();
  const [animating, setAnimating] = useState<{ matchIndex: number; side: 0 | 1 } | null>(null);

  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? player.name : 'Unknown';
  };

  const getTeamDisplay = (playerIds: string[]) => {
    return playerIds.map(getPlayerName).join(' & ');
  };

  if (!round) {
    return (
      <section className="page-section" aria-labelledby="current-heading">
        <div className="page-header">
          <div>
            <p className="page-tag">Current</p>
            <h2 id="current-heading">Current match</h2>
          </div>
        </div>
        <div className="empty-state">
          <p>No active round. Generate the schedule first on the Setup page.</p>
        </div>
      </section>
    );
  }

  const restingPlayers = round.restingPlayerIds.map(getPlayerName).join(', ');
  const allResultsEntered = round.matches.every((m) => m.result.locked);

  const handleNextRound = () => {
    if (currentRoundIndex < rounds.length - 1) {
      eventManager.nextRound();
      showToast('Moved to next round!', 'success');
    } else {
      showToast('Event complete! Redirecting to results…', 'success');
      navigate('/results');
    }
  };

  const handleSelectWinner = (matchIndex: number, side: 0 | 1) => {
    const match = round.matches[matchIndex];
    if (!match || match.result.locked) return;
    setAnimating({ matchIndex, side });
    // brief animation then record result
    setTimeout(() => {
      eventManager.recordResult(currentRoundIndex, matchIndex, side);
      setAnimating(null);
    }, 300);
  };

  const handleUndo = () => {
    eventManager.undo();
    showToast('Undo performed.', 'info');
  };

  return (
    <section className="page-section" aria-labelledby="current-heading">
      <div className="page-header">
        <div>
          <p className="page-tag">Current</p>
          <h2 id="current-heading">Round {round.roundNumber} matches</h2>
        </div>
        <div className="page-stats">
          <span className="stat-badge">{round.matches.filter(m => m.result.locked).length} / {round.matches.length} completed</span>
        </div>
      </div>

      <div className="current-match-grid">
        {round.matches.map((match, matchIndex) => (
          <article key={match.table} className={`match-card ${match.result.locked ? 'locked' : ''}`} aria-labelledby={`match-${match.table}-heading`}>
            <h3 id={`match-${match.table}-heading`}>Table {match.table}</h3>
            
            {match.subs.length > 0 && (
              <p className="subs" aria-label={`Substitutes: ${restingPlayers}`}>
                Subs: {restingPlayers}
              </p>
            )}
            <div className="pingpong-wrapper">
              <div
                className={`pingpong-table ${match.result.locked ? 'locked' : ''}`}
                role={match.result.locked ? undefined : 'group'}
                aria-label={`Table ${match.table} live match`}
              >
                <div
                  className={`pp-side pp-left ${((animating?.matchIndex === matchIndex && animating.side === 0) || (match.result.locked && match.result.winnerTeamIndex === 0)) ? 'clicked' : ''}`}
                  role={match.result.locked ? undefined : 'button'}
                  tabIndex={match.result.locked ? -1 : 0}
                  onClick={() => handleSelectWinner(matchIndex, 0)}
                  onKeyDown={(e) => { if (!match.result.locked && (e.key === 'Enter' || e.key === ' ')) { handleSelectWinner(matchIndex, 0); } }}
                  aria-label={`Select ${getTeamDisplay(match.teamA.playerIds)} as winner`}
                >
                  <div className="pp-team-name">{getTeamDisplay(match.teamA.playerIds)}</div>
                  {(((animating?.matchIndex === matchIndex && animating.side === 0) || (match.result.locked && match.result.winnerTeamIndex === 0))) && (
                    <div className="pp-check"><span className="icon">✓</span></div>
                  )}
                </div>

                <div className="pp-net" aria-hidden="true" />

                <div
                  className={`pp-side pp-right ${((animating?.matchIndex === matchIndex && animating.side === 1) || (match.result.locked && match.result.winnerTeamIndex === 1)) ? 'clicked' : ''}`}
                  role={match.result.locked ? undefined : 'button'}
                  tabIndex={match.result.locked ? -1 : 0}
                  onClick={() => handleSelectWinner(matchIndex, 1)}
                  onKeyDown={(e) => { if (!match.result.locked && (e.key === 'Enter' || e.key === ' ')) { handleSelectWinner(matchIndex, 1); } }}
                  aria-label={`Select ${getTeamDisplay(match.teamB.playerIds)} as winner`}
                >
                  <div className="pp-team-name">{getTeamDisplay(match.teamB.playerIds)}</div>
                  {(((animating?.matchIndex === matchIndex && animating.side === 1) || (match.result.locked && match.result.winnerTeamIndex === 1))) && (
                    <div className="pp-check"><span className="icon">✓</span></div>
                  )}
                </div>
              </div>

              {match.result.locked && (
                <p className="result-badge" aria-live="polite">
                  Winner: {match.result.winnerTeamIndex === 0 ? getTeamDisplay(match.teamA.playerIds) : getTeamDisplay(match.teamB.playerIds)}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="page-actions">
        <button className="primary-btn" disabled={!allResultsEntered} onClick={handleNextRound}>
          {currentRoundIndex < rounds.length - 1 ? 'Next round' : 'Finish event'}
        </button>
        <button className="secondary-btn" onClick={handleUndo} disabled={eventManager.state.undoStack.length === 0}>
          Undo last action
        </button>
        <Link to="/schedule" className="link-button">View schedule</Link>
      </div>
    </section>
  );
}
