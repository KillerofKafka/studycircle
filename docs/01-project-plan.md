# StudyCircle — Project Plan & Architecture (V1)

## 1. Project Brief

**Name:** StudyCircle
**One-liner:** A lightweight social network where students post questions and help each other across academic subjects.

### Core loop (MVP)
```
user → asks question → community answers → marks useful → interaction
```

### V1 Scope (what we build)
| # | Feature | Priority |
|---|---------|----------|
| 1 | User registration / login (email + password) | P0 |
| 2 | Profile: name, bio, list of subjects studied / mastered | P0 |
| 3 | Post a question (title, body, subject tag) | P0 |
| 4 | Answer a question (text response) | P0 |
| 5 | Feed: chronological list of questions + top answers | P0 |
| 6 | Upvote answers (one per user per answer) | P0 |
| 7 | Browse / filter by subject | P0 |
| 8 | User profile page (questions asked, answers given) | P1 |
| 9 | Search by keyword in questions | P1 |

### V1 Non-Scope (explicitly excluded)
- Real-time chat / WebSocket
- File/image uploads
- Notifications (email or in-app)
- Moderation / admin panel
- Following system
- Multi-language UI (English only)
- OAuth (Google, GitHub login)
- Rich-text / Markdown rendering in posts (plain text only)

---

## 2. Architecture

### 2.1 Stack
| Layer | Tech | Rationale |
|-------|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS 4 | Fast dev, well-known by LLMs, no build-config pain |
| Backend | Node.js 20 + Express 4 | Minimal, predictable, easy for LLMs to generate |
| Database | SQLite (better-sqlite3) | Zero-config, single file, perfect for V1 |
| Auth | JWT (httpOnly cookie) + bcrypt | Stateless, no session store needed |
| Monorepo layout | `client/` + `server/` + shared types | Two packages, one repo |

### 2.2 Repo structure
```
studycircle/
├── client/           # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route-level pages
│   │   ├── hooks/        # Custom hooks (auth, fetch)
│   │   ├── lib/          # API client, utilities
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── server/           # Express + SQLite
│   ├── src/
│   │   ├── routes/       # Express routers
│   │   ├── middleware/   # Auth, error handling
│   │   ├── db/           # Schema, migrations
│   │   ├── services/     # Business logic
│   │   └── index.ts      # Entry point
│   ├── data/             # SQLite file (gitignored)
│   └── package.json
├── shared/           # Shared TypeScript types
│   └── types.ts
├── docs/             # This planning folder
├── README.md
├── .gitignore
└── package.json      # Root workspace (npm workspaces)
```

### 2.3 Key decisions (ADRs)
- **ADR-001:** SQLite over Postgres → zero infra, single binary, enough for <10k users.
- **ADR-002:** JWT in httpOnly cookie → CSRF-safe, no token storage in localStorage.
- **ADR-003:** Plain-text posts (no Markdown) → reduces XSS surface, simpler parsing.
- **ADR-004:** npm workspaces monorepo → one repo, two deployable units, shared types.
- **ADR-005:** No ORM → raw SQL via better-sqlite3 for clarity and LLM-friendliness.

---

## 3. Data Model

### Tables
```sql
-- users
CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,          -- bcrypt hash
  display_name TEXT NOT NULL,
  bio         TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- user_subjects (many-to-many: user ↔ subject)
CREATE TABLE user_subjects (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,          -- e.g. 'Mathematics', 'Physics'
  role        TEXT NOT NULL DEFAULT 'studying',  -- 'studying' | 'mastered'
  PRIMARY KEY (user_id, subject, role)
);

-- questions
CREATE TABLE questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  subject     TEXT NOT NULL,          -- primary subject tag
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- answers
CREATE TABLE answers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- answer_votes (one vote per user per answer)
CREATE TABLE answer_votes (
  answer_id   INTEGER NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (answer_id, user_id)
);

-- Indexes
CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_created ON questions(created_at DESC);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_answers_votes ON answer_votes(answer_id);
```

### Subject list (seed)
`Mathematics`, `Physics`, `Chemistry`, `Biology`, `History`, `Literature`, `Programming`, `English`, `Spanish`, `French`, `German`, `Economics`, `Philosophy`, `Psychology`

Users can also type a custom subject on their profile (stored as-is, case-insensitive matching).

---

## 4. API Spec (REST)

Base: `http://localhost:3001/api`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | — | Register (email, password, display_name) → set JWT cookie |
| POST | /auth/login | — | Login → set JWT cookie |
| POST | /auth/logout | — | Clear cookie |
| GET | /auth/me | ✓ | Current user profile |
| GET | /users/:id | — | Public profile (name, bio, subjects, stats) |
| PUT | /users/me | ✓ | Update profile (display_name, bio, subjects[]) |
| GET | /questions | — | Feed; query: ?subject=&q=&page=&limit= |
| POST | /questions | ✓ | Create question (title, body, subject) |
| GET | /questions/:id | — | Question detail + answers (sorted by votes desc) |
| POST | /questions/:id/answers | ✓ | Add answer |
| POST | /answers/:id/vote | ✓ | Upvote answer (idempotent) |
| DELETE | /answers/:id/vote | ✓ | Remove upvote |
| GET | /subjects | — | List all distinct subjects with question counts |

### Error format
```json
{ "error": { "code": "NOT_FOUND", "message": "Question not found" } }
```

### Auth mechanism
- `Authorization` not used; JWT in `Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Strict`
- Server middleware reads cookie, verifies, attaches `req.user`

---

## 5. Frontend Pages & Components

### Routes (React Router)
| Path | Page | Description |
|------|------|-------------|
| `/` | FeedPage | List of questions, filter bar (subject dropdown, search) |
| `/question/:id` | QuestionPage | Question detail, answers list, answer form, vote buttons |
| `/profile` | MyProfilePage | Edit own profile, view my questions/answers |
| `/user/:id` | UserProfilePage | View another user's public profile |
| `/register` | RegisterPage | Signup form |
| `/login` | LoginPage | Login form |

### Key components
- `Navbar` — logo, search bar, user avatar, nav links
- `QuestionCard` — title, excerpt, subject badge, author, answer count, date
- `AnswerCard` — body, author, vote button + count, date
- `SubjectBadge` — colored pill per subject
- `SubjectFilter` — dropdown / chip selector
- `AnswerForm` — textarea + submit
- `ProfileForm` — name, bio, subject multi-select
- `VoteButton` — toggle upvote with optimistic UI

### Visual design principles
- Clean, minimal, **white background + dark text** (readable, academic feel)
- Primary color: indigo-600 (`#4F46E5`)
- Subject badges: deterministic color from subject name hash (Tailwind palette)
- Max-width container: `max-w-3xl` for readability
- Rounded corners: `rounded-lg`
- Subtle shadows: `shadow-sm`
- Font: system stack (Tailwind default)
- Mobile-first responsive

---

## 6. Roadmap & Task Decomposition

Each task is sized to be delegable to a single arena.ai model session.

| Phase | Task | Output | Est. complexity |
|-------|------|--------|-----------------|
| **P0** | T1: Scaffold monorepo (npm workspaces, Vite, Express, TS config, .gitignore) | Working `npm run dev` for both | Low |
| **P0** | T2: DB schema + seed subjects + migration runner | `server/data/studycircle.db` with tables | Low |
| **P0** | T3: Auth endpoints (register, login, logout, me) + JWT middleware | Working auth flow | Medium |
| **P0** | T4: Questions CRUD (list, create, detail) | Working questions API | Medium |
| **P0** | T5: Answers + votes API | Working answers/votes API | Medium |
| **P0** | T6: Users API (profile get/update, subjects) | Working profile API | Low |
| **P0** | T7: Frontend scaffold (Vite+React+Tailwind+Router+Navbar+layout) | Working shell | Low |
| **P0** | T8: FeedPage (list questions, subject filter, search) | Working feed UI | Medium |
| **P0** | T9: QuestionPage (detail, answers, vote, answer form) | Working Q&A UI | Medium |
| **P0** | T10: Auth pages (Register, Login) + protected route hook | Working auth UI | Medium |
| **P1** | T11: Profile pages (my profile, user profile) | Working profiles | Medium |
| **P1** | T12: Polish — empty states, error toasts, loading skeletons, responsive fixes | Visual quality | Low |
| **P1** | T13: README, deployment notes, final QA pass | Shippable V1 | Low |

### Dependencies
```
T1 → T2, T7
T2 → T3, T4, T5, T6
T3 → T4, T5, T6, T10
T4 → T5, T8, T9
T5 → T9
T6 → T10, T11
T7 → T8, T9, T10, T11
T8, T9, T10, T11 → T12
T12 → T13
```

---

## 7. Acceptance Criteria (V1 Done = all pass)

- [ ] New user can register, log in, log out
- [ ] User can set profile (name, bio, 1+ subjects)
- [ ] User can post a question with title, body, subject
- [ ] Other user can see question in feed
- [ ] Other user can write an answer
- [ ] Any user can upvote an answer (toggle on/off)
- [ ] Answers sorted by vote count desc on question page
- [ ] Feed filterable by subject
- [ ] Feed searchable by keyword in title
- [ ] User profile shows their questions and answers
- [ ] App is responsive (mobile 375px, tablet 768px, desktop 1280px)
- [ ] No console errors in browser
- [ ] `npm run build` succeeds for both client and server
- [ ] All endpoints return correct status codes (200, 201, 400, 401, 404)
- [ ] SQLite DB is created automatically on first run

---

## 8. Deployment (V1)
- `client/`: Vite build → static files (Netlify, Vercel, or nginx)
- `server/`: Node process (PM2, Docker, or VPS)
- For local dev: `npm run dev` (concurrently runs both)
- V1 target: localhost. Production deploy is a post-V1 concern.

---

## 9. Arena.ai Delegation Strategy

Each task (T1–T13) will be sent to arena.ai as a **self-contained prompt** that includes:
1. Reference to the repo (GitHub URL)
2. This planning doc (or relevant section)
3. The specific task description
4. Acceptance criteria for that task
5. Constraint: "commit your changes with a descriptive message; do not modify files outside your task scope"

Model selection heuristic:
- **Scaffolding / boilerplate** → any fast model (GPT-4o-mini, Haiku)
- **Complex logic (auth, API)** → strong model (Claude Sonnet, GPT-4o)
- **UI / styling** → model strong in JSX + Tailwind (Claude, GPT-4o)
- **Bug-fixing / integration** → model with good context window (Claude Sonnet, Gemini Pro)

I (the orchestrator) will:
- Review each model's output before merging
- Run tests / verify endpoints
- Fix integration issues locally if needed
- Update this doc as decisions evolve
- Commit everything to the shared repo
