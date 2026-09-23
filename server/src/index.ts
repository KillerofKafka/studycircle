import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { router } from './routes/index.js';
import { initDb } from './db/migrate.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api', router);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Initialize DB before listening
initDb();

app.listen(PORT, () => {
  console.log(`StudyCircle server running on http://localhost:${PORT}`);
});
