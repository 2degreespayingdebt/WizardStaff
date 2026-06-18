import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.js';
import leagueRoutes from './routes/leagues.js';
import playerRoutes from './routes/players.js';
import teamRoutes from './routes/teams.js';
import { authenticateToken, optionalAuth, AuthRequest } from './middleware/auth.js';
import * as seasonModel from './models/season.js';
import * as draftModel from './models/draft.js';
import { query } from './config/db.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);

// Get user's teams
app.get('/api/teams', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const teams = await teamModel.findTeamsByLeague(req.userId!);
    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

// Get team roster
app.get('/api/teams/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const team = await teamModel.findTeamById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const roster = await teamModel.getTeamRoster(team.id);
    res.json({ team, roster });
  } catch (error) {
    console.error('Get team roster error:', error);
    res.status(500).json({ error: 'Failed to get roster' });
  }
});

// Draft routes
app.get("/api/drafts/:id/board", optionalAuth, async (req, res) => {
  try {
    const board = await draftModel.getDraftBoard(req.params.id);
    res.json(board);
  } catch (error) {
    console.error('Get draft board error:', error);
    res.status(500).json({ error: 'Failed to get draft board' });
  }
});

app.post("/api/drafts/:id/pause", optionalAuth, async (req, res) => {
  try {
    const draft = await draftModel.pauseDraft(req.params.id);
    io.to(req.params.id).emit('draft:paused', { draft });
    const board = await draftModel.getDraftBoard(req.params.id);
    io.to(req.params.id).emit('draft:state', board);
    res.json({ draft });
  } catch (error) {
    console.error('Pause draft error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/drafts/:id/start", optionalAuth, async (req, res) => {
  try {
    // Get the draft to find its seasonId
    const draft = await draftModel.findDraftById(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    if (!draft.seasonId) {
      return res.status(400).json({ error: 'Draft has no associated season' });
    }

    // Get league and season teams from the draft's season
    const season = await seasonModel.findSeasonById(draft.seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    const seasonTeams = await seasonModel.getSeasonTeams(draft.seasonId);
    const teamIds = seasonTeams.map(st => st.teamId);

    if (teamIds.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 teams to start a draft' });
    }

    const updatedDraft = await draftModel.startDraft(req.params.id, teamIds);
    io.to(req.params.id).emit('draft:started', { draft: updatedDraft });
    const board = await draftModel.getDraftBoard(req.params.id);
    io.to(req.params.id).emit('draft:state', board);
    res.json({ draft: updatedDraft });
  } catch (error) {
    console.error('Start draft error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Make a pick via REST
app.post("/api/drafts/:id/pick", optionalAuth, async (req, res) => {
  try {
    const { teamId, playerId } = req.body;
    const { draft, pick } = await draftModel.makePick(req.params.id, teamId, playerId);
    res.json({ draft, pick });
  } catch (error) {
    console.error('Make pick error:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post("/api/drafts/:id/resume", optionalAuth, async (req, res) => {
  try {
    const draft = await draftModel.resumeDraft(req.params.id);
    io.to(req.params.id).emit('draft:resumed', { draft });
    const board = await draftModel.getDraftBoard(req.params.id);
    io.to(req.params.id).emit('draft:state', board);
    res.json({ draft });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Save draft — persist local picks to DB
app.post("/api/drafts/:id/save", optionalAuth, async (req, res) => {
  try {
    const { localPicks } = req.body as {
      localPicks: Array<{ teamId: string; playerId: string; round: number; pick: number }>;
    };
    if (Array.isArray(localPicks)) {
      await draftModel.saveDraftLocalPicks(req.params.id, localPicks);
    }
    const board = await draftModel.getDraftBoard(req.params.id);
    res.json({ success: true, board });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Undo last pick
app.post("/api/drafts/:id/undo", optionalAuth, async (req, res) => {
  try {
    const { draft, pick } = await draftModel.undoPick(req.params.id);
    io.to(req.params.id).emit('draft:undone', { draft, pick });
    const board = await draftModel.getDraftBoard(req.params.id);
    io.to(req.params.id).emit('draft:state', board);
    res.json({ draft, pick });
  } catch (error) {
    console.error('Undo pick error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Reset draft — clear all picks and roster
app.post("/api/drafts/:id/reset", optionalAuth, async (req, res) => {
  try {
    const draft = await draftModel.resetDraft(req.params.id);
    io.to(req.params.id).emit('draft:reset', { draft });
    const board = await draftModel.getDraftBoard(req.params.id);
    io.to(req.params.id).emit('draft:state', board);
    res.json({ draft });
  } catch (error) {
    console.error('Reset draft error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get or create draft for a season
app.post('/api/drafts/season/:seasonId', optionalAuth, async (req, res) => {
  try {
    const seasonId = req.params.seasonId;
    
    // Check if draft exists for this season
    let draft = await draftModel.findDraftBySeason(seasonId);
    
    if (!draft) {
      // Create a new draft
      const league = await seasonModel.findSeasonById(seasonId);
      if (!league) {
        return res.status(404).json({ error: 'Season not found' });
      }
      
      // Get teams from season
      const seasonTeams = await seasonModel.getSeasonTeams(seasonId);
      const teamIds = seasonTeams.map(st => st.teamId);
      
      if (teamIds.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 teams to start a draft' });
      }
      
      draft = await draftModel.createDraftForSeason(league.leagueId, seasonId, teamIds);
    }
    
    res.json({ draftId: draft.id });
  } catch (error) {
    console.error('Get/Create draft error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Socket.io for real-time draft
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join draft room
  socket.on('join:draft', async (draftId: string) => {
    socket.join(draftId);
    const board = await draftModel.getDraftBoard(draftId);
    if (board) {
      socket.emit('draft:state', board);
    } else {
      socket.emit('draft:error', { error: 'Draft not found' });
    }
  });

  // Make pick
  socket.on('draft:pick', async (data: { draftId: string; teamId: string; playerId: string }) => {
    try {
      const { draft, pick } = await draftModel.makePick(
        data.draftId,
        data.teamId,
        data.playerId
      );
      
      // Broadcast to all in draft room
      io.to(data.draftId).emit('draft:pick:made', { draft, pick });
      
      // Get updated board and broadcast
      const board = await draftModel.getDraftBoard(data.draftId);
      io.to(data.draftId).emit('draft:state', board);
    } catch (error) {
      socket.emit('draft:error', { error: (error as Error).message });
    }
  });

  // Pause/resume draft (commissioner only)
  socket.on('draft:pause', async (data: { draftId: string }) => {
    // TODO: Add authorization check
    const draft = await draftModel.findDraftById(data.draftId);
    if (draft) {
      // TODO: Update status
      io.to(data.draftId).emit('draft:paused', { draft });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🪄 WizardStaff server running on http://localhost:${PORT}`);
});

export { app, io };
// Get or update player points
app.get("/api/player-points", optionalAuth, async (req, res) => {
  try {
    const leagueId = req.query.league_id as string;
    const seasonId = req.query.season_id as string;
    const playerId = req.query.player_id as string;
    
    if (!leagueId || !seasonId || !playerId) {
      return res.status(400).json({ error: 'Missing league_id, season_id, or player_id' });
    }
    
    const result = await query(
      'SELECT points FROM player_points WHERE league_id = $1 AND season_id = $2 AND player_id = $3',
      [leagueId, seasonId, playerId]
    );
    
    res.json({ points: result.rows[0]?.points || 0 });
  } catch (error) {
    console.error('Get player points error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/player-points", optionalAuth, async (req, res) => {
  try {
    const { leagueId, seasonId, playerId, points } = req.body;
    
    if (!leagueId || !seasonId || !playerId || points === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await query(
      `INSERT INTO player_points (league_id, season_id, player_id, points, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (league_id, season_id, player_id)
       DO UPDATE SET points = $4, updated_at = NOW()`,
      [leagueId, seasonId, playerId, points]
    );
    
    res.json({ success: true, points });
  } catch (error) {
    console.error('Update player points error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get player team for a given season
app.get("/api/player-team", optionalAuth, async (req, res) => {
  try {
    const leagueId = req.query.league_id as string;
    const seasonId = req.query.season_id as string;
    const playerId = req.query.player_id as string;
    
    if (!leagueId || !seasonId || !playerId) {
      return res.status(400).json({ error: 'Missing league_id, season_id, or player_id' });
    }
    
    // Find which team drafted this player in the given season
    const result = await query(
      `SELECT t.name as team_name, t.id as team_id
       FROM draft_picks dp
       JOIN teams t ON t.id = dp.team_id
       JOIN drafts d ON d.id = dp.draft_id
       WHERE d.league_id = $1 AND d.season_id = $2 AND dp.player_id = $3
       LIMIT 1`,
      [leagueId, seasonId, playerId]
    );
    
    if (result.rows.length > 0) {
      res.json({ teamName: result.rows[0].team_name, teamId: result.rows[0].team_id });
    } else {
      res.json({ teamName: null, teamId: null });
    }
  } catch (error) {
    console.error('Get player team error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get leaderboard - sum of points per team for a season
app.get("/api/leaderboard", optionalAuth, async (req, res) => {
  try {
    const leagueId = req.query.league_id as string;
    const seasonId = req.query.season_id as string;
    
    if (!leagueId || !seasonId) {
      return res.status(400).json({ error: 'Missing league_id or season_id' });
    }
    
    // Get all teams in the league with their total points
    const result = await query(
      `SELECT 
        t.name as team_name,
        t.avatar_url as team_avatar,
        COALESCE(SUM(pp.points), 0) as total_points
       FROM teams t
       LEFT JOIN roster_slots rs ON rs.team_id = t.id
       LEFT JOIN player_points pp ON pp.player_id = rs.player_id AND pp.league_id = t.league_id AND pp.season_id = $2
       WHERE t.league_id = $1
       GROUP BY t.id, t.name, t.avatar_url
       ORDER BY total_points DESC`,
      [leagueId, seasonId]
    );
    
    res.json(result.rows.map(row => ({
      teamName: row.team_name,
      teamAvatar: row.team_avatar,
      totalPoints: parseInt(row.total_points) || 0
    })));
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get team rosters with player points for a season
app.get("/api/team-rosters", optionalAuth, async (req, res) => {
  try {
    const leagueId = req.query.league_id as string;
    const seasonId = req.query.season_id as string;
    
    if (!leagueId || !seasonId) {
      return res.status(400).json({ error: 'Missing league_id or season_id' });
    }
    
    // Get all teams with their players and points
    const result = await query(
      `SELECT 
        t.name as team_name,
        t.avatar_url as team_avatar,
        p.id as player_id,
        p.name as player_name,
        p.profile_image as player_avatar,
        COALESCE(pp.points, 0) as player_points
       FROM teams t
       LEFT JOIN roster_slots rs ON rs.team_id = t.id
       LEFT JOIN players p ON p.id = rs.player_id
       LEFT JOIN player_points pp ON pp.player_id = rs.player_id AND pp.league_id = t.league_id AND pp.season_id = $2
       WHERE t.league_id = $1 AND rs.player_id IS NOT NULL
       ORDER BY team_name, player_points DESC, player_name`,
      [leagueId, seasonId]
    );
    
    // Group by team
    const teamMap = new Map<string, { playerId: string; playerName: string; points: number; avatarUrl: string }[]>();
    for (const row of result.rows) {
      if (!teamMap.has(row.team_name)) {
        teamMap.set(row.team_name, []);
      }
      if (row.player_id) {
        teamMap.get(row.team_name)!.push({
          playerId: row.player_id,
          playerName: row.player_name,
          points: parseInt(row.player_points) || 0,
          avatarUrl: row.player_avatar
        });
      }
    }
    
    const rosterData = Array.from(teamMap.entries()).map(([teamName, players]) => ({
      teamName,
      teamAvatar: result.rows.find(r => r.team_name === teamName)?.team_avatar,
      players
    }));
    
    res.json(rosterData);
  } catch (error) {
    console.error('Get team rosters error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get players for a specific season (from roster_slots)
app.get("/api/season-players", optionalAuth, async (req, res) => {
  try {
    const leagueId = req.query.league_id as string;
    const seasonId = req.query.season_id as string;
    
    if (!leagueId || !seasonId) {
      return res.status(400).json({ error: 'Missing league_id or season_id' });
    }
    
    // Get players who are on a team roster for this season
    const result = await query(
      `SELECT DISTINCT 
        p.id,
        p.name,
        p.position,
        p.team,
        p.status,
        p.projected_points,
        p.adp,
        p.profile_image,
        p.image_data,
        p.description,
        p.created_at,
        t.name as team_name,
        COALESCE(pp.points, 0) as points
       FROM roster_slots rs
       JOIN players p ON p.id = rs.player_id
       JOIN teams t ON t.id = rs.team_id
       LEFT JOIN player_points pp ON pp.player_id = p.id AND pp.league_id = $1 AND pp.season_id = $2
       WHERE rs.league_id = $1 AND rs.season_id = $2
       ORDER BY p.name`,
      [leagueId, seasonId]
    );
    
    // Convert image_data to base64 if present
    const players = result.rows.map(p => ({
      ...p,
      imageData: p.image_data ? Buffer.from(p.image_data).toString('base64') : null
    }));
    
    res.json(players);
  } catch (error) {
    console.error('Get season players error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});
