import { Router, Response } from 'express';
import * as leagueModel from '../models/league.js';
import * as teamModel from '../models/team.js';
import * as seasonModel from '../models/season.js';
import { AuthRequest, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Use optionalAuth middleware - won't block without token
router.use(optionalAuth);

// Create league - public (no auth required)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'League name required' });
    }
    
    // Use authenticated user or fall back to demo user
    const commissionerId = req.userId || 'fcb5a616-deec-4153-baa9-3f8659f805a1';
    
    const league = await leagueModel.createLeague(
      name,
      commissionerId,
      {}
    );
    
    // Create team for commissioner
    const teamName = commissionerId + ' Team';
    await teamModel.createTeam(
      league.id,
      commissionerId,
      teamName
    );
    
    // Generate invite code
    const inviteCode = await leagueModel.generateInviteCode(league.id);
    
    res.status(201).json({ ...league, inviteCode });
  } catch (error) {
    console.error('Create league error:', error);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// Get user's leagues
router.get('/', async (req: AuthRequest, res: Response) => {
  // Require auth for getting leagues
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.json([]); // Return empty if not authenticated
  }
  
  try {
    const leagues = await leagueModel.findLeaguesByUser(req.userId!);
    res.json(leagues);
  } catch (error) {
    console.error('Get leagues error:', error);
    res.status(500).json({ error: 'Failed to get leagues' });
  }
});

// Get league by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const league = await leagueModel.findLeagueById(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    // Get teams in league
    const teams = await teamModel.findTeamsByLeague(league.id);
    
    res.json({ ...league, teams });
  } catch (error) {
    console.error('Get league error:', error);
    res.status(500).json({ error: 'Failed to get league' });
  }
});

// Join league via code
router.post('/join', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Invite code required' });
    }
    
    const league = await leagueModel.findLeagueByInviteCode(code);
    if (!league) {
      return res.status(404).json({ error: 'Invalid or expired invite code' });
    }
    
    // Use authenticated user or fall back to demo user
    const userId = req.userId || 'fcb5a616-deec-4153-baa9-3f8659f805a1';
    
    // Create team for user
    const team = await teamModel.createTeam(
      league.id,
      userId,
      userId + ' Team'
    );
    
    res.status(201).json({ league, team });
  } catch (error) {
    if (error instanceof Error && error.message === 'League is full') {
      return res.status(400).json({ error: 'League is full' });
    }
    if (error instanceof Error && error.message === 'User already has a team in this league') {
      return res.status(400).json({ error: 'You already have a team in this league' });
    }
    console.error('Join league error:', error);
    res.status(500).json({ error: 'Failed to join league' });
  }
});

// Update league (commissioner only)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const league = await leagueModel.findLeagueById(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    if (league.commissionerId !== req.userId) {
      return res.status(403).json({ error: 'Only commissioner can update league settings' });
    }
    
    const { name, maxTeams, scoringFormat, draftDate, rosterPositions } = req.body;
    
    const updated = await leagueModel.updateLeague(req.params.id, {
      name,
      maxTeams,
      scoringFormat,
      draftDate,
      rosterPositions: rosterPositions ? JSON.stringify(rosterPositions) : undefined,
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Update league error:', error);
    res.status(500).json({ error: 'Failed to update league' });
  }
});

// Generate new invite code
router.post('/:id/invite', async (req: AuthRequest, res: Response) => {
  try {
    const league = await leagueModel.findLeagueById(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    if (league.commissionerId !== req.userId) {
      return res.status(403).json({ error: 'Only commissioner can generate invite codes' });
    }
    
    const inviteCode = await leagueModel.generateInviteCode(league.id);
    res.json({ inviteCode });
  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
});

// Get season leaderboard
router.get('/seasons/:seasonId/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const leaderboard = await seasonModel.getSeasonLeaderboard(req.params.seasonId);
    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Add/subtract drinks from team
router.post('/seasons/:seasonId/teams/:teamId/drinks', async (req: AuthRequest, res: Response) => {
  try {
    const { change } = req.body;
    if (typeof change !== 'number') {
      return res.status(400).json({ error: 'Change must be a number' });
    }
    
    const result = await seasonModel.updateDrinkCount(
      req.params.seasonId,
      req.params.teamId,
      change
    );
    res.json(result);
  } catch (error) {
    console.error('Update drink count error:', error);
    res.status(500).json({ error: 'Failed to update drink count' });
  }
});

// Get seasons for a league
router.get('/:id/seasons', async (req: AuthRequest, res: Response) => {
  try {
    const seasons = await seasonModel.findSeasonsByLeague(req.params.id);
    res.json(seasons);
  } catch (error) {
    console.error('Get seasons error:', error);
    res.status(500).json({ error: 'Failed to get seasons' });
  }
});

// Create season
router.post('/:id/seasons', async (req: AuthRequest, res: Response) => {
  try {
    const { name, isActive } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Season name required' });
    }
    
    const season = await seasonModel.createSeason(req.params.id, name, isActive);
    res.status(201).json(season);
  } catch (error) {
    console.error('Create season error:', error);
    res.status(500).json({ error: 'Failed to create season' });
  }
});

// Get teams for a season
router.get('/seasons/:seasonId/teams', async (req: AuthRequest, res: Response) => {
  try {
    const teams = await seasonModel.getSeasonTeams(req.params.seasonId);
    res.json(teams);
  } catch (error) {
    console.error('Get season teams error:', error);
    res.status(500).json({ error: 'Failed to get season teams' });
  }
});

// Add team to league
router.post('/:id/teams', async (req: AuthRequest, res: Response) => {
  try {
    const { teamName } = req.body;
    
    if (!teamName) {
      return res.status(400).json({ error: 'Team name required' });
    }
    
    const league = await leagueModel.findLeagueById(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    // Use authenticated user or fall back to demo user
    const userId = req.userId || 'fcb5a616-deec-4153-baa9-3f8659f805a1';
    
    const team = await teamModel.createTeam(
      league.id,
      userId,
      teamName
    );
    
    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

export default router;