# Tutorly — Personalized Learning with Generative Tutoring

An AI-powered tutoring platform that adapts to each student's level, generates explanations, quizzes, study plans, detects knowledge gaps, and gamifies progress with XP, badges, and a leaderboard.

> **Status**: MVP complete · deployment-ready (deployment_agent: **pass**) · 24/24 backend tests + 8/8 frontend smoke flows passed.

---

## Features

### Student
- Email/password (JWT) **or** Google sign-in (Emergent OAuth)
- AI Tutor chat (GPT-5.2 or Claude Sonnet 4.5) with conversation history
- Voice input + text-to-speech (Web Speech API)
- Subject + difficulty selection (Mathematics, Science, Programming, English, History · Beginner/Intermediate/Advanced)
- AI-generated quizzes — MCQ, short-answer, and coding questions with auto-grading
- Adaptive difficulty (score ≥ 0.8 → level up · < 0.4 → level down)
- AI 7-day study planner targeting your weak topics + printable PDF export
- Personalized dashboard: study minutes, quiz averages, subject trends, predicted next score, weak areas, recent activity
- Gamification: XP, 6 unlockable badges, global leaderboard
- Dark/light mode

### Admin
- Platform analytics (users, quizzes, AI interactions, average score)
- Student roster with XP and badges
- Subject performance bar chart
- AI interaction log viewer

### AI Tutor capabilities
- Level-aware explanations (simple analogies for beginners · technical vocab for advanced)
- Real-world examples + hint-driven teaching
- Multi-model: pick GPT-5.2 (default) or Claude Sonnet 4.5 per message
- Knowledge gap detection from quiz scores (auto-tracks weak/strong topics)
- Performance prediction (linear projection of recent scores)

---

## Tech Stack

| Layer       | Technology |
|-------------|------------|
| Frontend    | React 19, Tailwind CSS, shadcn/ui, Phosphor Icons, Recharts, sonner |
| Backend     | FastAPI, Motor (async MongoDB), PyJWT, bcrypt |
| Database    | MongoDB |
| AI / LLMs   | GPT-5.2 + Claude Sonnet 4.5 via **Emergent Universal Key** (`emergentintegrations`) |
| Auth        | JWT (custom) + Emergent Google OAuth (cookie session) |
| Voice       | Web Speech API (browser-native STT + TTS) |
| Tooling     | yarn, craco, supervisor, ESLint, ruff |

---

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI app, routes, seed users
│   ├── auth.py            # JWT + Google session auth helpers
│   ├── llm.py             # Tutor/quiz/plan LLM wrappers (emergentintegrations)
│   ├── database.py        # Shared Mongo client/db
│   ├── requirements.txt
│   └── .env               # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, JWT_SECRET …
└── frontend/
    ├── src/
    │   ├── App.js                 # Routes + AuthProvider + OAuth callback
    │   ├── lib/api.js             # Axios client (uses REACT_APP_BACKEND_URL)
    │   ├── contexts/AuthContext.jsx
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   ├── Layout.jsx
    │   │   ├── ThemeToggle.jsx
    │   │   └── ui/                # shadcn/ui primitives
    │   └── pages/
    │       ├── Landing.jsx · Login.jsx · Register.jsx · AuthCallback.jsx
    │       ├── Dashboard.jsx · Chat.jsx · Quiz.jsx · StudyPlan.jsx
    │       ├── Leaderboard.jsx · Profile.jsx · AdminDashboard.jsx
    └── .env               # REACT_APP_BACKEND_URL
```

---

## Environment Variables

### `backend/.env`
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY=sk-emergent-...
JWT_SECRET=<32+ byte random>
JWT_ALGORITHM=HS256
JWT_EXPIRES_HOURS=168
```

### `frontend/.env`
```
REACT_APP_BACKEND_URL=https://<your-app>.preview.emergentagent.com
WDS_SOCKET_PORT=443
```

> The `EMERGENT_LLM_KEY` unlocks GPT-5.2 / Claude Sonnet 4.5 / Gemini through one universal key. Replace with your own provider keys if you prefer.

---

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (in another terminal)
cd frontend
yarn install
yarn start
```

On startup, the backend auto-seeds two users:
- `student@test.com` / `Student@123`
- `admin@test.com` / `Admin@123`

---

## REST API

All routes are prefixed with `/api`. Auth via `Authorization: Bearer <jwt>` or `session_token` cookie (Google).

| Method | Endpoint                  | Description                              |
|--------|---------------------------|------------------------------------------|
| POST   | `/api/auth/register`      | Create user → returns JWT + user         |
| POST   | `/api/auth/login`         | Email/password login → JWT               |
| POST   | `/api/auth/session`       | Exchange Emergent OAuth `session_id`     |
| POST   | `/api/auth/logout`        | Invalidate session cookie                |
| GET    | `/api/auth/me`            | Current user                             |
| PUT    | `/api/profile`            | Update level / goal / preferred subjects |
| GET    | `/api/meta/subjects`      | Subjects + levels enum                   |
| POST   | `/api/chat`               | Ask AI tutor (model picker)              |
| GET    | `/api/chat/history`       | Past chats                               |
| POST   | `/api/quiz/generate`      | LLM-generate quiz                        |
| POST   | `/api/quiz/submit`        | Grade quiz, update XP/level/badges       |
| GET    | `/api/quiz/history`       | Past quiz results                        |
| POST   | `/api/study-plan`         | Generate 7-day plan                      |
| GET    | `/api/study-plan/latest`  | Latest plan                              |
| POST   | `/api/summarize`          | Summarise study notes                    |
| GET    | `/api/dashboard`          | Aggregated student dashboard             |
| GET    | `/api/leaderboard`        | Top 20 by XP                             |
| GET    | `/api/admin/students`     | (admin) student list                     |
| GET    | `/api/admin/analytics`    | (admin) platform analytics               |
| GET    | `/api/admin/logs`         | (admin) recent AI interactions           |

---

## MongoDB Collections

- `users` — `user_id, name, email, password_hash, role, level, preferred_subjects, goal, xp, badges[], weak_topics[], strong_topics[], created_at`
- `user_sessions` — `user_id, session_token, expires_at` (Google OAuth)
- `chat_history` — `id, user_id, subject, level, prompt, response, model, created_at`
- `quizzes` — `quiz_id, user_id, subject, topic, level, questions[], created_at`
- `quiz_results` — `id, user_id, quiz_id, subject, topic, level, score, correct, total, date`
- `study_plans` — `id, user_id, subject, level, plan{summary, days[]}, created_at`

All user IDs are custom UUIDs (`user_<hex>`); MongoDB's `_id` is excluded from API responses.

---

## Deployment

Pre-flight checks pass on Emergent (`deployment_agent` status: **pass**). Click **Deploy** in the Emergent UI — supervisor, CORS, env var loading, and the React build are all configured.

For other platforms, ensure:
- Backend exposed on `:8001` (or env-driven), all routes mounted under `/api`
- Frontend built with the production `REACT_APP_BACKEND_URL`
- MongoDB reachable via `MONGO_URL`

---

## Roadmap

- [ ] Server-side PDF generation for study plans
- [ ] SSE token-by-token streaming for chat (`stream_message`)
- [ ] Per-subject leaderboards
- [ ] Weekly email digests (Resend) summarising weak topics + next lesson
- [ ] Replace localStorage JWT with httpOnly session cookies for the custom auth flow
- [ ] Email verification + password reset
