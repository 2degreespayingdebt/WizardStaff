import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import type { Player } from '../types';

export default function PlayerHomePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams] = useSearchParams();
  const password = searchParams.get('password') || '';
  const leagueId = searchParams.get('league') || '';
  const seasonId = searchParams.get('seasonId') || '';
  const teamName = searchParams.get('team') || '';
  const seasonName = searchParams.get('season') || '';
  const [player, setPlayer] = useState<Player | null>(null);
  const [count, setCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [selectedPlayerInModal, setSelectedPlayerInModal] = useState<Player | null>(null);
  const [selectedPlayerTeam, setSelectedPlayerTeam] = useState<string | null>(null);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<{ teamName: string; totalPoints: number }[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [teamRosters, setTeamRosters] = useState<{ teamName: string; players: { playerId: string; playerName: string; points: number; avatarUrl: string }[] }[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showDropdown && !target.closest('.relative')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  const handleLogout = () => {
    localStorage.removeItem('wizardstaff_role');
    localStorage.removeItem('wizardstaff_auth');
    localStorage.removeItem('wizardstaff_token');
    window.location.href = '/login';
  };

  useEffect(() => {
    if (playerId && password) {
      loadPlayer(playerId);
    }
  }, [playerId, password]);

  const loadPlayer = async (id: string) => {
    try {
      const data = await api.getPlayer(id);
      if (data && password && data.name === password) {
        setPlayer(data);
        setAuthorized(true);
        if (leagueId && seasonId) {
          const savedPoints = await api.getPlayerPoints(leagueId, seasonId, id);
          setCount(savedPoints);
        }
      } else if (data && !password) {
        setPlayer(data);
        setAuthorized(true);
      }
    } catch (error) {
      console.error('Failed to load player:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMinus = async () => {
    const newCount = Math.max(0, count - 1);
    setCount(newCount);
    if (authorized && leagueId && seasonId && playerId) {
      await api.updatePlayerPoints(leagueId, seasonId, playerId, newCount);
    }
  };

  const handlePlus = async () => {
    const newCount = count + 1;
    setCount(newCount);
    if (authorized && leagueId && seasonId && playerId) {
      await api.updatePlayerPoints(leagueId, seasonId, playerId, newCount);
    }
  };

  const loadAllPlayers = async () => {
    if (allPlayers.length > 0) return;
    setPlayersLoading(true);
    try {
      const players = await api.getPlayers();
      setAllPlayers(players.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setPlayersLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    if (!leagueId || !seasonId) return;
    setLeaderboardLoading(true);
    setRosterLoading(true);
    try {
      const [leaderData, rosterData] = await Promise.all([
        api.getLeaderboard(leagueId, seasonId),
        api.getTeamRosters(leagueId, seasonId)
      ]);
      setLeaderboardData(leaderData);
      setTeamRosters(rosterData);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLeaderboardLoading(false);
      setRosterLoading(false);
    }
  };

  const toggleTeamExpand = (teamName: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamName)) {
        newSet.delete(teamName);
      } else {
        newSet.add(teamName);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#023E8A' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#D4A574' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#023E8A' }}>
      {/* Header */}
      <header className="bg-ocean-800 border-b border-ocean-700 h-[60px]">
        <div className="max-w-md mx-auto px-3 w-full h-full flex items-center justify-between">
          <span className="text-sm font-bold self-center" style={{ color: '#D4A574' }}>
            {seasonName || 'Season'}
          </span>
          <div className="flex items-center gap-4 self-center">
            <button onClick={() => { loadLeaderboard(); setShowLeaderboardModal(true); }} className="text-sand-500 hover:text-white text-sm">
              Leaderboard
            </button>
            <button onClick={() => { loadAllPlayers(); setShowPlayersModal(true); }} className="text-sand-500 hover:text-white text-sm">
              Players
            </button>
          </div>
          <div className="relative self-center">
            <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2">
              {player?.profileImage || player?.profile_image ? (
                <img src={'http://localhost:3001' + (player.profileImage || player.profile_image)} alt={player?.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-ocean-700 flex items-center justify-center">🏈</div>
              )}
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-ocean-800 border border-ocean-700 rounded-lg shadow-lg z-50">
                <div className="px-4 py-2 border-b border-ocean-700">
                  <span className="text-sand-500 text-sm">Signed in as:</span>
                  <p className="font-bold">{player?.name || 'Unknown'}</p>
                </div>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-ocean-700 text-sand-500">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 py-8">
        <div className="flex flex-col items-center">
          {player?.profileImage || player?.profile_image ? (
            <img src={'http://localhost:3001' + (player.profileImage || player.profile_image)} alt={player.name} className="w-[240px] h-[300px] rounded-full object-cover mb-4" />
          ) : (
            <div className="w-[240px] h-[300px] rounded-full bg-ocean-700 flex items-center justify-center text-6xl mb-4">🏈</div>
          )}
          <h1 className="text-3xl font-bold text-center mb-2">{player?.name || 'Unknown Player'}</h1>
          {teamName && (
            <div className="bg-ocean-800 px-6 py-3 rounded-lg border border-ocean-700 mb-6">
              <span className="text-sand-500">Team: </span>
              <span className="font-bold">{teamName}</span>
            </div>
          )}
          <div className="flex items-center gap-6">
            <button onClick={handleMinus} className="w-14 h-14 rounded-full bg-ocean-700 hover:bg-ocean-600 text-2xl font-bold flex items-center justify-center">−</button>
            <span className="text-4xl font-bold w-12 text-center">{count}</span>
            <button onClick={handlePlus} className="w-14 h-14 rounded-full bg-ocean-700 hover:bg-ocean-600 text-2xl font-bold flex items-center justify-center">+</button>
          </div>
        </div>
      </main>

      {/* Players Modal */}
      {showPlayersModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-ocean-900 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-ocean-700">
              <h2 className="text-lg font-bold">Players</h2>
              <button onClick={() => setShowPlayersModal(false)} className="text-sand-500 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {playersLoading ? (
                <p className="text-sand-500 text-center py-8">Loading...</p>
              ) : allPlayers.length === 0 ? (
                <p className="text-sand-500 text-center py-8">No players found.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {allPlayers.map((p) => (
                    <button key={p.id} onClick={async () => {
                    // Fetch player's team for this season
                    let playerTeamName = null;
                    if (leagueId && seasonId) {
                      const teamData = await api.getPlayerTeam(leagueId, seasonId, p.id);
                      playerTeamName = teamData.teamName;
                    }
                    setSelectedPlayerTeam(playerTeamName);
                    setSelectedPlayerInModal(p);
                  }} className="flex flex-col items-center p-2 bg-ocean-800 rounded-lg hover:bg-ocean-700">
                      {p.profileImage || p.profile_image ? (
                        <img src={'http://localhost:3001' + (p.profileImage || p.profile_image)} alt={p.name} className="w-24 h-24 rounded-full object-cover mb-1" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-ocean-700 flex items-center justify-center mb-1">🏈</div>
                      )}
                      <span className="text-sm text-center">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Player Detail Modal */}
      {selectedPlayerInModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-ocean-900 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-ocean-700">
              <h2 className="text-lg font-bold">{selectedPlayerInModal.name}</h2>
              <button onClick={() => setSelectedPlayerInModal(null)} className="text-sand-500 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="flex flex-col items-center">
                {selectedPlayerInModal.profileImage || selectedPlayerInModal.profile_image ? (
                  <img src={'http://localhost:3001' + (selectedPlayerInModal.profileImage || selectedPlayerInModal.profile_image)} alt={selectedPlayerInModal.name} className="w-48 h-48 rounded-full object-cover mb-4" />
                ) : (
                  <div className="w-48 h-48 rounded-full bg-ocean-700 flex items-center justify-center text-6xl mb-4">🏈</div>
                )}
                <p className="text-sand-500 mb-2">Team: {selectedPlayerTeam || 'Not drafted'}</p>
                <p className="text-sand-500">Season: {seasonName || 'Unknown'}</p>
                {selectedPlayerInModal.description && (
                  <p className="text-sand-500 mt-4 text-center">{selectedPlayerInModal.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-ocean-900 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-ocean-700">
              <h2 className="text-lg font-bold">{seasonName || 'Leaderboard'}</h2>
              <button onClick={() => setShowLeaderboardModal(false)} className="text-sand-500 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="p-1 flex items-center justify-between border-b border-ocean-700">
              <span className="text-sand-500 text-sm">Leaderboard</span>
              <button onClick={loadLeaderboard} className="text-sand-500 hover:text-white text-sm">
                🔄 Refresh
              </button>
            </div>
            <div className="p-4 flex-1">
              {leaderboardLoading ? (
                <p className="text-sand-500 text-center py-8">Loading...</p>
              ) : leaderboardData.length === 0 ? (
                <p className="text-sand-500 text-center py-8">No data found.</p>
              ) : (
                <div className="flex items-end justify-around h-48 gap-2">
                  {leaderboardData.map((team, idx) => {
                    const maxPoints = Math.max(...leaderboardData.map(d => d.totalPoints), 1) + 10;
                    const barHeight = team.totalPoints > 0 ? (team.totalPoints / maxPoints) * 100 : (team.totalPoints === 0 ? 2 : 5);
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1">
                        <span className="text-xs text-sand-500 mb-1">{team.totalPoints}</span>
                        <div 
                          className="w-full rounded-t" 
                          style={{ 
                            height: `${barHeight}%`, 
                            backgroundColor: '#D4A574',
                            minHeight: '4px',
                            maxWidth: '40px'
                          }}
                        />
                        <span className="text-xs mt-1 truncate w-16 text-center">{team.teamName}</span>
                        </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Team Rosters - Collapsible */}
            <div className="border-t border-ocean-700">
              <div className="p-3 bg-ocean-800">
                <span className="text-sand-500 text-sm">Team Rosters (Sorted by Points)</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {rosterLoading ? (
                  <p className="text-sand-500 text-center py-4">Loading...</p>
                ) : teamRosters.length === 0 ? (
                  <p className="text-sand-500 text-center py-4">No rosters found.</p>
                ) : (
                  // Sort teams by their total points (matching graph order)
                  [...teamRosters].sort((a, b) => {
                    const aTotal = a.players.reduce((sum, p) => sum + p.points, 0);
                    const bTotal = b.players.reduce((sum, p) => sum + p.points, 0);
                    return bTotal - aTotal;
                  }).map((team) => (
                    <div key={team.teamName} className="border-b border-ocean-700">
                      <button 
                        onClick={() => toggleTeamExpand(team.teamName)}
                        className="w-full p-3 flex items-center justify-between hover:bg-ocean-800"
                      >
                        <span className="font-medium">{team.teamName}
                          {(() => {
                            const aTotal = team.players.reduce((sum, p) => sum + p.points, 0);
                            const maxTotal = Math.max(...teamRosters.map(t => t.players.reduce((s, p) => s + p.points, 0)), 0);
                            const minTotal = Math.min(...teamRosters.map(t => t.players.reduce((s, p) => s + p.points, 0)), 0);
                            if (aTotal === maxTotal && maxTotal > 0) return ' - 1st place';
                            const sortedTotals = [...new Set(teamRosters.map(t => t.players.reduce((s, p) => s + p.points, 0)))].sort((a, b) => b - a);
                            const rank = sortedTotals.indexOf(aTotal) + 1;
                            if (rank === 2) return ' - 2nd place';
                            return '';
                          })()}
                        </span>
                        <span className="text-sand-500">
                          {expandedTeams.has(team.teamName) ? '▲' : '▼'}
                        </span>
                      </button>
                      {expandedTeams.has(team.teamName) && (
                        <div className="p-3 flex flex-wrap gap-3 bg-ocean-800/50">
                          {team.players.map((player) => (
                            <div key={player.playerId} className="flex flex-col items-center">
                              {player.avatarUrl ? (
                                <img src={'http://localhost:3001' + player.avatarUrl} alt={player.playerName} className="w-10 h-10 rounded-full object-cover mb-1" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-ocean-700 flex items-center justify-center mb-1">🏈</div>
                              )}
                              <span className="text-xs text-center">{player.playerName}</span>
                              <span className="text-xs text-sand-500"> {player.points}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}