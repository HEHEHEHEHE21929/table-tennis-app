import { EventManager } from '../types';
import { useAppToast } from '../context/ToastContext';

interface Props {
  eventManager: EventManager;
}

export default function HistoryPage({ eventManager }: Props) {
  const { showToast } = useAppToast();
  const completedRounds = eventManager.state.rounds
    .map((round, roundIdx) => ({
      round,
      roundIdx,
      completedMatches: round.matches.filter((m) => m.result.locked)
    }))
    .filter((r) => r.completedMatches.length > 0);

  const getPlayerName = (playerId: string) => {
    const player = eventManager.state.players.find((p) => p.id === playerId);
    return player ? player.name : 'Unknown';
  };

  const getTeamDisplay = (playerIds: string[]) => {
    return playerIds.map(getPlayerName).join(' & ');
  };

  return (
    <section className="page-section" aria-labelledby="history-heading">
      <div className="page-header">
        <div>
          <p className="page-tag">History</p>
          <h2 id="history-heading">Completed matches</h2>
        </div>
        <div className="page-stats">
          <span className="stat-badge">{completedRounds.length} rounds completed</span>
        </div>
      </div>
      <div className="page-actions history-actions">
        <button onClick={() => { eventManager.undo(); showToast('Undo performed.', 'info'); }} disabled={eventManager.state.undoStack.length === 0}>
          Undo latest action
        </button>
      </div>

      {completedRounds.length === 0 ? (
        <div className="empty-state">
          <p>No completed matches yet. Results will appear here as matches are played.</p>
        </div>
      ) : (
        <div className="history-list" role="list" aria-label="Match history">
          {completedRounds.map(({ round, roundIdx, completedMatches }) =>
            completedMatches.map((match, matchIdx) => (
              <article key={`${roundIdx}-${matchIdx}`} className="history-card" role="listitem">
                <div className="history-header">
                  <h3>Round {round.roundNumber} — Table {match.table}</h3>
                  {match.result.timestamp && (
                    <time dateTime={match.result.timestamp} className="match-time">
                      {new Date(match.result.timestamp).toLocaleString()}
                    </time>
                  )}
                </div>
                <div className="history-teams">
                  <div className={`team ${match.result.winnerTeamIndex === 0 ? 'winner' : 'loser'}`}>
                    <span className="team-name">{getTeamDisplay(match.teamA.playerIds)}</span>
                    {match.result.winnerTeamIndex === 0 && <span className="winner-badge">🏆</span>}
                  </div>
                  <span className="vs-text">vs</span>
                  <div className={`team ${match.result.winnerTeamIndex === 1 ? 'winner' : 'loser'}`}>
                    <span className="team-name">{getTeamDisplay(match.teamB.playerIds)}</span>
                    {match.result.winnerTeamIndex === 1 && <span className="winner-badge">🏆</span>}
                  </div>
                </div>
                {match.subs.length > 0 && (
                  <p className="subs" aria-label={`Substitutes: ${match.subs.map(getPlayerName).join(', ')}`}>
                    Subs: {match.subs.map(getPlayerName).join(', ')}
                  </p>
                )}
                <button
                  className="secondary-btn edit-result-btn"
                  onClick={() => {
                    const newWinnerIndex = match.result.winnerTeamIndex === 0 ? 1 : 0;
                    const winnerName = newWinnerIndex === 0 ? getTeamDisplay(match.teamA.playerIds) : getTeamDisplay(match.teamB.playerIds);
                    if (window.confirm(`Change winner to ${winnerName}?`)) {
                      eventManager.recordResult(roundIdx, matchIdx, newWinnerIndex);
                      showToast('Match result updated.', 'success');
                    }
                  }}
                >
                  Edit result
                </button>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
