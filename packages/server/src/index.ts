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
app.use(express.json());

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
app.get('/api/drafts/:id/board', authenticateToken, async (req, res) => {
  try {
    const board = await draftModel.getDraftBoard(req.params.id);
    res.json(board);
  } catch (error) {
    console.error('Get draft board error:', error);
    res.status(500).json({ error: 'Failed to get draft board' });
  }
});

app.post('/api/drafts/:id/pause', authenticateToken, async (req, res) => {
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

app.post('/api/drafts/:id/resume', authenticateToken, async (req, res) => {
  try {
    const draft = await draftModel.resumeDraft(req.params.id);
    io.to(req.params.id).emit('draft:resumed', { draft });
    const board = await draftModel.getDraftBoard(req.params.id);
    io.to(req.params.id).emit('draft:state', board);
    res.json({ draft });
  } catch (error) {
    console.error('Resume draft error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Undo last pick
app.post('/api/drafts/:id/undo', authenticateToken, async (req, res) => {
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