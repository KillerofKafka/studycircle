import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'studycircle-dev-secret';
const router = Router();

// GET /api/questions — feed with filters
router.get('/', (req: Request, res: Response) => {
  const { subject, q, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const lim = Math.min(50, parseInt(limit as string) || 20);
  const offset = (pageNum - 1) * lim;

  let where = '1=1';
  const params: unknown[] = [];

  if (subject) {
    where += ' AND q.subject = ?';
    params.push(subject);
  }
  if (q) {
    where += ' AND (q.title LIKE ? OR q.body LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM questions q WHERE ${where}`).get(...params) as any).cnt;

  const questions = db.prepare(`
    SELECT q.*, u.display_name AS author_name, u.id AS author_id,
           (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answer_count
    FROM questions q
    JOIN users u ON u.id = q.author_id
    WHERE ${where}
    ORDER BY q.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, lim, offset) as any[];

  res.json({ questions, total, page: pageNum, limit: lim });
});

// POST /api/questions — create question (auth required)
router.post('/', requireAuth, (req: AuthRequest, res: Response) => {
  const { title, body, subject } = req.body;
  if (!title || !body || !subject) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'title, body, subject required' } });
  }
  const result = db.prepare(
    'INSERT INTO questions (author_id, title, body, subject) VALUES (?, ?, ?, ?)'
  ).run(req.user!.id, title, body, subject);

  const question = db.prepare(`
    SELECT q.*, u.display_name AS author_name, u.id AS author_id, 0 AS answer_count
    FROM questions q JOIN users u ON u.id = q.author_id
    WHERE q.id = ?
  `).get(result.lastInsertRowid) as any;

  res.status(201).json(question);
});

// GET /api/questions/:id — question detail with answers
router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid id' } });

  const question = db.prepare(`
    SELECT q.*, u.display_name AS author_name, u.id AS author_id,
           (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answer_count
    FROM questions q JOIN users u ON u.id = q.author_id
    WHERE q.id = ?
  `).get(id) as any;

  if (!question) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Question not found' } });

  const answers = db.prepare(`
    SELECT a.*, au.display_name AS author_name, au.id AS author_id,
           (SELECT COUNT(*) FROM answer_votes v WHERE v.answer_id = a.id) AS vote_count
    FROM answers a
    JOIN users au ON au.id = a.author_id
    WHERE a.question_id = ?
    ORDER BY vote_count DESC, a.created_at ASC
  `).all(id) as any[];

  // Check votes for current user
  const token = req.cookies?.token;
  let currentUserId: number | null = null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: number };
      currentUserId = payload.id;
    } catch { /* ignore */ }
  }

  if (currentUserId) {
    for (const a of answers) {
      const voted = db.prepare('SELECT 1 FROM answer_votes WHERE answer_id = ? AND user_id = ?').get(a.id, currentUserId);
      a.voted_by_me = !!voted;
    }
  }

  res.json({ question, answers });
});

export default router;
