import { Router } from 'express';
import authRouter from './auth.js';
import questionsRouter from './questions.js';
import answersRouter from './answers.js';
import usersRouter from './users.js';
import subjectsRouter from './subjects.js';

export const router = Router();

// Auth: /api/auth/*
router.use('/auth', authRouter);

// Questions: /api/questions/*
router.use('/questions', questionsRouter);

// Answers: /api/questions/:qid/answers, /api/answers/:id/vote
router.use('/', answersRouter);

// Users: /api/users/*, /api/users/me
router.use('/users', usersRouter);

// Subjects: /api/subjects
router.use('/subjects', subjectsRouter);
