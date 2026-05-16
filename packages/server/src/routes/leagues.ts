import { Router, Response } from 'express';
import * as leagueModel from '../models/league.js';
import * as teamModel from '../models/team.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create league
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, maxTeams, scoringFormat, rosterPositions } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'League name required' });
    }
    
    const league = await leagueModel.createLeague(
      name,
      req.userId!,
      { maxTeams, scoringFormat, rosterPositions }
    );
    
    // Create team for commissioner
    await teamModel.createTeam(
      league.id,
      req.userId!,
      `${req.userId}'s Team`
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
    
    // Create team for user
    const team = await teamModel.createTeam(
      league.id,
      req.userId!,
      `${req.userId}'s Team`
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

export default router;