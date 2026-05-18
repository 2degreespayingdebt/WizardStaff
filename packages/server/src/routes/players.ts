import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as playerModel from '../models/player.js';
import { AuthRequest, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Configure multer for player avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/players';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, req.params.id + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

router.use(optionalAuth);

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

// Update player (name, profile image, description, projected points)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, profileImage, description, projectedPoints } = req.body;
    
    const player = await playerModel.updatePlayer(req.params.id, { name, profileImage, description, projectedPoints });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(player);
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Upload player avatar
router.post('/:id/avatar', upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file uploaded' });
    }

    const avatarUrl = `/uploads/players/${req.file.filename}`;
    const updated = await playerModel.updatePlayer(req.params.id, { profileImage: avatarUrl });
    
    if (!updated) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({ ...updated, profileImage: avatarUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Delete player
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const player = await playerModel.findPlayerById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    await playerModel.deletePlayer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

// Set player status (activate/inactivate)
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status, seasonId } = req.body;
    
    if (!status || !['active', 'injured', 'out', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Check if player was drafted in current season
    if (seasonId) {
      const isDrafted = await playerModel.checkPlayerDraftedInCurrentSeason(req.params.id, seasonId);
      if (isDrafted && status !== 'active') {
        return res.status(400).json({ 
          error: 'Cannot inactivate player that has been drafted in the current season' 
        });
      }
    }
    
    const player = await playerModel.setPlayerStatus(req.params.id, status);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(player);
  } catch (error) {
    console.error('Update player status error:', error);
    res.status(500).json({ error: 'Failed to update player status' });
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