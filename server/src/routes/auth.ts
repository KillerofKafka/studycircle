import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'studycircle-dev-secret';
const router = Router();

function signToken(userId: number, email: string) {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  const { email, password, display_name } = req.body;
  if (!email || !password || !display_name) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'email, password, display_name required' } });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'password must be at least 6 characters' } });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Email already registered' } });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password, display_name) VALUES (?, ?, ?)').run(email, hash, display_name);
  const token = signToken(result.lastInsertRowid as number, email);
  res.status(201).cookie('token', token, { httpOnly: true, sameSite: 'strict', path: '/' }).json({ id: result.lastInsertRowid, email, display_name });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'email and password required' } });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
  }
  const token = signToken(user.id, user.email);
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict', path: '/' }).json({ id: user.id, email: user.email, display_name: user.display_name });
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' }).json({ status: 'ok' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT id, email, display_name, bio, created_at FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  const subjects = db.prepare('SELECT subject, role FROM user_subjects WHERE user_id = ?').all(user.id) as any[];
  res.json({ ...user, subjects });
});

export default router;
