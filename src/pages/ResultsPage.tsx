import { EventManager } from '../types';

interface Props {
  eventManager: EventManager;
}

export default function ResultsPage({ eventManager }: Props) {
  const sortedPlayers = [...eventManager.state.players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
    return a.losses - b.losses;
  });

  const getWinDisplay = (wins: number, subs: number) => `${wins} (${subs} subs)`;
  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  };

  const totalMatches = eventManager.state.rounds.reduce((acc, round) =>
    acc + round.matches.filter(m => m.result.locked).length, 0
  );

  const completedRounds = eventManager.state.rounds.filter(round =>
    round.matches.every(m => m.result.locked)
  ).length;

  return (
    <section className="page-section" aria-labelledby="results-heading">
      <div className="page-header">
        <div>
          <p className="page-tag">Results</p>
          <h2 id="results-heading">Final standings</h2>
        </div>
        <div className="page-stats">
          <span className="stat-badge">{totalMatches} matches played</span>
          <span className="stat-badge">{completedRounds} rounds completed</span>
        </div>
      </div>

      {sortedPlayers.length === 0 ? (
        <div className="empty-state">
          <p>No players yet. Add players on the Setup page.</p>
        </div>
      ) : (
        <div className="results-container">
          <div className="results-table-wrapper">
            <table className="results-table" role="table" aria-label="Player standings">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Player</th>
                  <th scope="col">Wins</th>
                  <th scope="col">Matches</th>
                  <th scope="col">Losses</th>
                  <th scope="col">Win Rate</th>
                  <th scope="col">Subs</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, index) => (
                  <tr key={player.id} className={index < 3 ? `rank-${index + 1}` : ''}>
                    <td className="rank-cell">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </td>
                    <td className="player-cell">
                      <span className="player-name">{player.name}</span>
                      <span className={`status-badge status-${player.status.toLowerCase().replace(' ', '-')}`}>
                        {player.status}
                      </span>
                    </td>
                    <td className="wins-cell">{getWinDisplay(player.wins, player.subs)}</td>
                    <td className="matches-cell">{player.matchesPlayed}</td>
                    <td className="losses-cell">{player.losses}</td>
                    <td className="winrate-cell">{getWinRate(player.wins, player.losses)}%</td>
                    <td className="subs-cell">{player.subs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalMatches > 0 && (
            <div className="results-summary">
              <h3>Event Summary</h3>
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Matches:</span>
                  <span className="stat-value">{totalMatches}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Completed Rounds:</span>
                  <span className="stat-value">{completedRounds} / {eventManager.state.rounds.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Active Players:</span>
                  <span className="stat-value">
                    {eventManager.state.players.filter(p => p.status === 'Active' || p.status === 'Arriving later').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
