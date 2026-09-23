import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/questions/:qid/answers — add answer (auth required)
router.post('/questions/:qid/answers', requireAuth, (req: AuthRequest, res: Response) => {
  const qid = parseInt(req.params.qid);
  const { body } = req.body;
  if (!body || body.trim().length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'body required' } });
  }
  const question = db.prepare('SELECT id FROM questions WHERE id = ?').get(qid);
  if (!question) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Question not found' } });

  const result = db.prepare(
    'INSERT INTO answers (question_id, author_id, body) VALUES (?, ?, ?)'
  ).run(qid, req.user!.id, body.trim());

  const answer = db.prepare(`
    SELECT a.*, u.display_name AS author_name, u.id AS author_id, 0 AS vote_count
    FROM answers a JOIN users u ON u.id = a.author_id
    WHERE a.id = ?
  `).get(result.lastInsertRowid) as any;

  res.status(201).json(answer);
});

// POST /api/answers/:id/vote — upvote / remove vote (toggle, auth required)
router.post('/answers/:id/vote', requireAuth, (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const answer = db.prepare('SELECT id, question_id FROM answers WHERE id = ?').get(id);
  if (!answer) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Answer not found' } });

  const existing = db.prepare(
    'SELECT 1 FROM answer_votes WHERE answer_id = ? AND user_id = ?'
  ).get(id, req.user!.id);

  if (existing) {
    db.prepare('DELETE FROM answer_votes WHERE answer_id = ? AND user_id = ?').run(id, req.user!.id);
  } else {
    db.prepare('INSERT INTO answer_votes (answer_id, user_id) VALUES (?, ?)').run(id, req.user!.id);
  }

  const voteCount = (db.prepare(
    'SELECT COUNT(*) AS cnt FROM answer_votes WHERE answer_id = ?'
  ).get(id) as any).cnt;

  res.json({ answer_id: id, vote_count: voteCount, voted: !existing });
});

export default router;
