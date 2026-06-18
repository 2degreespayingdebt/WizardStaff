import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Label, LabelList } from 'recharts';
import { api } from '../services/api';
import type { Player } from '../types';

export default function PlayerHomePage() {
  const { playerId: paramPlayerId } = useParams<{ playerId: string }>();
  const [searchParams] = useSearchParams();
  const playerId = paramPlayerId || searchParams.get('playerId') || '';
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
  const [teamRosters, setTeamRosters] = useState<{ teamName: string; teamAvatar?: string; players: { playerId: string; playerName: string; points: number; avatarUrl: string }[] }[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

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
    } else if (!playerId) {
      // No player selected - still show the page but without authorization
      setLoading(false);
    } else if (playerId && !password) {
      // Player selected but no password - still load player
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
      showToastMessage();
    }
  };

  const handlePlus = async () => {
    const newCount = count + 1;
    setCount(newCount);
    if (authorized && leagueId && seasonId && playerId) {
      await api.updatePlayerPoints(leagueId, seasonId, playerId, newCount);
      showToastMessage();
    }
  };

  const showToastMessage = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const loadAllPlayers = async () => {
    if (allPlayers.length > 0) {
      setShowPlayersModal(true);
      return;
    }
    setPlayersLoading(true);
    try {
      console.log('Loading all players...');
      const players = await api.getPlayers();
      console.log('Loaded players:', players.length);
      if (players && players.length > 0) {
        setAllPlayers(players.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        console.log('No players returned from API');
      }
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setPlayersLoading(false);
      setShowPlayersModal(true);
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
      <header className="bg-ocean-800 border-b border-ocean-700 h-[60px] relative">
        <div className="max-w-md mx-auto px-1 w-full h-full flex items-center justify-between">
          <button onClick={() => { 
            if (leagueId && seasonId) {
              loadLeaderboard(); 
              setShowLeaderboardModal(true); 
            } else {
              navigate('/select-player');
            }
          }} className="text-sand-500 hover:text-white text-sm sm:text-base absolute left-1">
            Leaderboard
          </button>
          <button onClick={() => { loadAllPlayers(); setShowPlayersModal(true); }} className="text-sand-500 hover:text-white text-sm sm:text-base absolute left-1/2 transform -translate-x-1/2">
            Players
          </button>
          <div className="absolute right-1">
            <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center">
              {player?.profileImage || player?.profile_image ? (
                <img src={player.profileImage || player.profile_image} alt={player?.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-ocean-700 flex items-center justify-center">🧙‍♂️</div>
              )}
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-ocean-800 border border-ocean-700 rounded-lg shadow-lg z-50">
                <div className="px-4 py-2 border-b border-ocean-700">
                  <span className="text-sand-500 text-sm">Season:</span>
                  <p className="font-bold">{seasonName || 'Unknown'}</p>
                </div>
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
            <img src={player.profileImage || player.profile_image} alt={player.name} className="w-[240px] h-[300px] rounded-full object-cover mb-4" />
          ) : (
            <div className="w-[240px] h-[300px] rounded-full bg-ocean-700 flex items-center justify-center text-6xl mb-4">🧙‍♂️</div>
          )}
          <h1 className="text-3xl font-bold text-center mb-2">{player?.name || 'Wizard Observer'}</h1>
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
            <div className="flex items-center justify-between p-1.5 border-b border-ocean-700">
              <div></div>
              <h2 className="text-lg font-bold">Players</h2>
              <button onClick={() => setShowPlayersModal(false)} className="text-sand-500 hover:text-white active:text-sand-400 text-xl font-bold w-8 h-8 flex items-center justify-center">
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
                        <img src={p.profileImage || p.profile_image} alt={p.name} className="w-24 h-24 rounded-full object-cover mb-1" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-ocean-700 flex items-center justify-center mb-1">🧙‍♂️</div>
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2">
          <div className="bg-ocean-900 rounded-lg w-full max-w-md h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-1.5 border-b border-ocean-700">
              <h2 className="text-lg font-bold">{selectedPlayerInModal.name}</h2>
              <button onClick={() => setSelectedPlayerInModal(null)} className="text-sand-500 hover:text-white active:text-sand-400 text-xl font-bold w-8 h-8 flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center">
              <div className="flex flex-col items-center">
                {selectedPlayerInModal.profileImage || selectedPlayerInModal.profile_image ? (
                  <img src={selectedPlayerInModal.profileImage || selectedPlayerInModal.profile_image} alt={selectedPlayerInModal.name} className="h-[60vh] max-h-[240px] rounded-full object-cover mb-4" style={{ width: 'auto', maxWidth: '100%' }} />
                ) : (
                  <div className="h-[60vh] max-h-[240px] rounded-full bg-ocean-700 flex items-center justify-center text-6xl mb-4">🧙‍♂️</div>
                )}
                <div className="flex gap-4">
                  <div className="bg-ocean-800 rounded px-3 py-1 border border-sand-700">
                    <p className="text-sand-500"><span className="font-bold">Team:</span> {selectedPlayerTeam || 'Not drafted'}</p>
                  </div>
                  <div className="bg-ocean-800 rounded px-3 py-1 border border-sand-700">
                    <p className="text-sand-500"><span className="font-bold">Season:</span> {seasonName || 'Unknown'}</p>
                  </div>
                </div>
                {selectedPlayerInModal.description && (
                  <p className="text-sand-500 mt-4 text-center italic">{selectedPlayerInModal.description}</p>
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
            <div className="flex items-center justify-between p-1.5 border-b border-ocean-700">
              <div></div>
              <h2 className="text-lg font-bold">{seasonName || 'Leaderboard'}</h2>
              <button onClick={() => setShowLeaderboardModal(false)} className="text-sand-500 hover:text-white active:text-sand-400 text-xl font-bold w-8 h-8 flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="p-1 flex items-center justify-between border-b border-ocean-700">
              {!playerId ? (
                <button onClick={() => navigate('/select-player')} className="text-sand-500 hover:text-white text-sm">
                  ← Back to Select Player
                </button>
              ) : (
                <span className="text-sand-500 text-sm">Leaderboard</span>
              )}
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
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={leaderboardData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="category" dataKey="teamName" tick={{ fill: '#D4A574', fontSize: 12 }} />
                    <YAxis type="number" tick={{ fill: '#D4A574', fontSize: 12 }} />
                    <Bar dataKey="totalPoints" radius={[0, 4, 4, 0]} fill="#D4A574">
                      <LabelList dataKey="totalPoints" position="top" fill="#D4A574" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            
            {/* Team Rosters - Collapsible */}
            <div className="border-t border-ocean-700">
              <div className="p-3 bg-ocean-800">
                <span className="text-sand-500 text-sm">Team Rosters (Sorted by Points)</span>
              </div>
              <div className="flex-1">
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
                        <div className="flex items-center gap-2">
                          {team.teamAvatar ? (
                            <img src={team.teamAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-ocean-700 flex items-center justify-center text-xs">👥</div>
                          )}
                          <span className="font-medium">{team.teamName}
                          {(() => {
                            const aTotal = team.players.reduce((sum, p) => sum + p.points, 0);
                            const maxTotal = Math.max(...teamRosters.map(t => t.players.reduce((s, p) => s + p.points, 0)), 0);
                            if (aTotal === maxTotal && maxTotal > 0) return ' - 1st place';
                            const sortedTotals = [...new Set(teamRosters.map(t => t.players.reduce((s, p) => s + p.points, 0)))].sort((a, b) => b - a);
                            const rank = sortedTotals.indexOf(aTotal) + 1;
                            if (rank === 2) return ' - 2nd place';
                            return '';
                          })()}
                          </span>
                        </div>
                        <span className="text-sand-500">
                          {expandedTeams.has(team.teamName) ? '▲' : '▼'}
                        </span>
                      </button>
                      {expandedTeams.has(team.teamName) && (
                        <div className="p-3 flex flex-wrap gap-3 bg-ocean-800/50">
                          {team.players.map((player) => (
                            <div key={player.playerId} className="flex flex-col items-center">
                              {player.avatarUrl ? (
                                <button onClick={() => setSelectedPlayerInModal({ playerId: player.playerId, name: player.playerName, profileImage: player.avatarUrl, points: player.points } as Player)} className="focus:outline-none">
                                  <img src={player.avatarUrl} alt={player.playerName} className="w-10 h-10 rounded-full object-cover mb-1 hover:opacity-80" />
                                </button>
                              ) : (
                                <button onClick={() => setSelectedPlayerInModal({ playerId: player.playerId, name: player.playerName, profileImage: player.avatarUrl, points: player.points } as Player)} className="focus:outline-none">
                                  <div className="w-10 h-10 rounded-full bg-ocean-700 flex items-center justify-center mb-1">🧙‍♂️</div>
                                </button>
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
      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-sand-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Leaderboard Updated
        </div>
      )}
    </div>
  );
}