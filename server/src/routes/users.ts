import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/users/:id — public profile
router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid id' } });

  const user = db.prepare(
    'SELECT id, email, display_name, bio, created_at FROM users WHERE id = ?'
  ).get(id) as any;
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });

  const subjects = db.prepare(
    'SELECT subject, role FROM user_subjects WHERE user_id = ?'
  ).all(id) as any[];

  // Recent questions
  const questions = db.prepare(
    'SELECT id, title, subject, created_at, (SELECT COUNT(*) FROM answers WHERE question_id = questions.id) AS answer_count FROM questions WHERE author_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(id) as any[];

  res.json({ user, subjects, recent_questions: questions });
});

// PUT /api/users/me — update own profile (auth required)
router.put('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const { display_name, bio } = req.body;

  if (display_name !== undefined && display_name.trim().length < 2) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'display_name must be at least 2 chars' } });
  }

  if (display_name !== undefined) {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(display_name.trim(), req.user!.id);
  }
  if (bio !== undefined) {
    db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio.trim(), req.user!.id);
  }

  const user = db.prepare(
    'SELECT id, email, display_name, bio, created_at FROM users WHERE id = ?'
  ).get(req.user!.id) as any;
  const subjects = db.prepare('SELECT subject, role FROM user_subjects WHERE user_id = ?').all(req.user!.id) as any[];

  res.json({ user, subjects });
});

// PUT /api/users/me/subjects — set user subjects (auth required)
// Body: { subjects: [{ subject: string, role: 'studying'|'mastered' }] }
router.put('/me/subjects', requireAuth, (req: AuthRequest, res: Response) => {
  const { subjects } = req.body;
  if (!Array.isArray(subjects)) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'subjects must be an array' } });
  }

  // Replace all existing subjects
  db.prepare('DELETE FROM user_subjects WHERE user_id = ?').run(req.user!.id);

  const insert = db.prepare(
    'INSERT INTO user_subjects (user_id, subject, role) VALUES (?, ?, ?)'
  );
  for (const s of subjects) {
    if (s.subject && (s.role === 'studying' || s.role === 'mastered')) {
      insert.run(req.user!.id, s.subject.trim(), s.role);
    }
  }

  const updated = db.prepare('SELECT subject, role FROM user_subjects WHERE user_id = ?').all(req.user!.id) as any[];
  res.json({ subjects: updated });
});

export default router;
