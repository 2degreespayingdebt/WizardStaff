import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import leagueRoutes from './routes/leagues.js';
import playerRoutes from './routes/players.js';
import { authenticateToken, AuthRequest } from './middleware/auth.js';
import * as draftModel from './models/draft.js';
import * as teamModel from './models/team.js';

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/players', playerRoutes);

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

// Socket.io for real-time draft
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join draft room
  socket.on('join:draft', async (draftId: string) => {
    socket.join(draftId);
    const board = await draftModel.getDraftBoard(draftId);
    socket.emit('draft:state', board);
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