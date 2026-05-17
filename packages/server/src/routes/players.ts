import { Router, Response } from 'express';
import * as playerModel from '../models/player.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get all players
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { team, status, limit, offset } = req.query;
    
    const players = await playerModel.findAllPlayers({
      team: team as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    
    res.json(players);
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Failed to get players' });
  }
});

// Search players
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { q, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const players = await playerModel.searchPlayers(
      q as string,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(players);
  } catch (error) {
    console.error('Search players error:', error);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

// Get available players for draft
router.get('/available/:leagueId', async (req: AuthRequest, res: Response) => {
  try {
    const { limit } = req.query;
    
    const players = await playerModel.findAvailablePlayers(req.params.leagueId, {
      limit: limit ? parseInt(limit as string) : undefined,
    });
    
    res.json(players);
  } catch (error) {
    console.error('Get available players error:', error);
    res.status(500).json({ error: 'Failed to get available players' });
  }
});

// Get player by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const player = await playerModel.findPlayerById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(player);
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({ error: 'Failed to get player' });
  }
});

// Update player (profile image & description)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { profileImage, description } = req.body;
    
    const player = await playerModel.updatePlayer(req.params.id, { profileImage, description });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(player);
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Create new custom drinker
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, profileImage } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const player = await playerModel.createDrinker(name, description, profileImage);
    
    res.status(201).json(player);
  } catch (error) {
    console.error('Create drinker error:', error);
    res.status(500).json({ error: 'Failed to create drinker' });
  }
});

// Bulk import players from CSV
router.post('/bulk-import', async (req: AuthRequest, res: Response) => {
  try {
    const { players } = req.body;
    
    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ error: 'No players to import' });
    }
    
    const results = {
      created: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const player of players) {
      try {
        if (!player.name) {
          results.failed++;
          results.errors.push(`Missing name for player`);
          continue;
        }
        
        await playerModel.createDrinker(
          player.name,
          player.description || null,
          player.profileImage || null,
          player.team || null,
          player.projectedPoints || null,
          player.adp || null
        );
        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Failed to create ${player.name}: ${(err as Error).message}`);
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import players' });
  }
});

export default router;