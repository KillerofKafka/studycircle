import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET /api/subjects — list subjects with question counts
router.get('/', (_req: Request, res: Response) => {
  const subjects = db.prepare(`
    SELECT s.name,
           (SELECT COUNT(*) FROM questions q WHERE q.subject = s.name) AS question_count
    FROM subjects s
    ORDER BY s.name
  `).all() as any[];

  res.json({ subjects });
});

export default router;
