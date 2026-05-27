import { EventManager } from '../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  eventManager: EventManager;
}

export default function SchedulePage({ eventManager }: Props) {
  const navigate = useNavigate();
  const getPlayerName = (playerId: string) => {
    const player = eventManager.state.players.find((p) => p.id === playerId);
    return player ? player.name : 'Unknown';
  };

  const getTeamDisplay = (playerIds: string[]) => {
    return playerIds.map(getPlayerName).join(' & ');
  };

  const getRestingDisplay = (playerIds: string[]) => {
    return playerIds.map(getPlayerName).join(', ');
  };

  const getRoundStatus = (roundNumber: number) => {
    if (roundNumber - 1 === eventManager.state.currentRoundIndex) return 'Current';
    if (roundNumber - 1 < eventManager.state.currentRoundIndex) return 'Completed';
    return 'Upcoming';
  };

  const handleJumpToCurrent = () => navigate('/current');

  const handleRegenerateFromCurrent = () => {
    eventManager.regenerateFromCurrent();
  };

  return (
    <section className="page-section" aria-labelledby="schedule-heading">
      <div className="page-header">
        <div>
          <p className="page-tag">Schedule</p>
          <h2 id="schedule-heading">Full match plan</h2>
        </div>
        <div className="page-actions">
          <button className="secondary-btn" onClick={handleJumpToCurrent}>
            Jump to current match
          </button>
          <button className="secondary-btn" onClick={handleRegenerateFromCurrent} disabled={eventManager.state.rounds.length === 0}>
            Regenerate from current round
          </button>
        </div>
      </div>

      {eventManager.state.rounds.length === 0 ? (
        <div className="empty-state">
          <p>No schedule generated yet. Go to Setup to generate a match plan.</p>
        </div>
      ) : (
        <div className="schedule-list" role="list" aria-label="Match schedule rounds">
          {eventManager.state.rounds.map((round) => (
            <article key={round.id} className="round-card" role="listitem" aria-labelledby={`round-${round.roundNumber}-heading`}>
              <div className="round-card-header">
                <div>
                  <span className="round-pill" id={`round-${round.roundNumber}-heading`}>Round {round.roundNumber}</span>
                  <p className="round-status" aria-live="polite">{getRoundStatus(round.roundNumber)}</p>
                </div>
                <div className="round-meta" aria-label={`${round.matches.length} tables in this round`}>{round.matches.length} tables</div>
              </div>

              <div className="match-grid" role="list" aria-label={`Matches for round ${round.roundNumber}`}>
                {round.matches.map((match, idx) => (
                  <div key={idx} className={`match-card ${match.result.locked ? 'locked' : 'upcoming'}`} role="listitem" aria-label={`Match on table ${match.table}: ${getTeamDisplay(match.teamA.playerIds)} vs ${getTeamDisplay(match.teamB.playerIds)}`}>
                    <div className="table-tag" aria-label={`Table ${match.table}`}>Table {match.table}</div>
                    <div className="teams-row">
                      <div className="team-box">{getTeamDisplay(match.teamA.playerIds)}</div>
                      <div className="vs-box">vs</div>
                      <div className="team-box">{getTeamDisplay(match.teamB.playerIds)}</div>
                    </div>
                    {match.result.locked && (
                      <p className="result">Winner: {match.result.winnerTeamIndex === 0 ? getTeamDisplay(match.teamA.playerIds) : getTeamDisplay(match.teamB.playerIds)}</p>
                    )}
                  </div>
                ))}
              </div>

              {round.restingPlayerIds.length > 0 && (
                <div className="resting-info">Resting: {getRestingDisplay(round.restingPlayerIds)}</div>
              )}
              {round.matches[0]?.subs.length > 0 && (
                <div className="subs-info">Subs: {round.matches[0].subs.map(getPlayerName).join(', ')}</div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
