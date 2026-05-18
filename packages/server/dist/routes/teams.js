import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as teamModel from '../models/team.js';
import { optionalAuth } from '../middleware/auth.js';
const router = Router();
// Configure multer for team avatars
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/teams';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
router.use(optionalAuth);
// Create team with avatar (multipart form)
router.post('/with-avatar', upload.single('avatar'), async (req, res) => {
    try {
        const { leagueId, teamName } = req.body;
        if (!leagueId || !teamName) {
            return res.status(400).json({ error: 'League ID and team name required' });
        }
        // Use authenticated user or fall back to demo user
        const userId = req.userId || 'fcb5a616-deec-4153-baa9-3f8659f805a1';
        // Create the team
        const team = await teamModel.createTeam(leagueId, userId, teamName);
        // If avatar uploaded, update the team with avatar URL
        let avatarUrl = undefined;
        if (req.file) {
            avatarUrl = `/uploads/teams/${req.file.filename}`;
            await teamModel.updateTeam(team.id, { avatarUrl });
        }
        res.status(201).json({ ...team, avatar_url: avatarUrl });
    }
    catch (error) {
        console.error('Create team with avatar error:', error);
        res.status(500).json({ error: 'Failed to create team' });
    }
});
// Upload team avatar
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const team = await teamModel.findTeamById(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        const avatarUrl = `/uploads/teams/${req.file.filename}`;
        const updated = await teamModel.updateTeam(req.params.id, { avatarUrl });
        res.json({ ...updated, avatarUrl });
    }
    catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});
// Update team
router.put('/:id', async (req, res) => {
    try {
        const { teamName, avatarUrl } = req.body;
        const team = await teamModel.findTeamById(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        const updated = await teamModel.updateTeam(req.params.id, {
            teamName,
            avatarUrl,
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Failed to update team' });
    }
});
export default router;
//# sourceMappingURL=teams.js.map