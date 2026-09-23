import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History',
  'Literature', 'Programming', 'English', 'Spanish', 'French',
  'German', 'Economics', 'Philosophy', 'Psychology'
];

export function initDb() {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('DB schema initialized.');
}
