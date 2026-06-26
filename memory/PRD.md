# Personalized Learning — Generative Tutoring System

## Original problem
Build a full-stack AI tutoring web app: per-student adaptive explanations, AI-generated quizzes, study plans, knowledge gap detection, gamification, and admin analytics.

## Architecture
- **Frontend**: React 19 (CRA + craco), Tailwind, shadcn/ui, Phosphor icons, Recharts, sonner, framer-motion.
- **Backend**: FastAPI + Motor (async MongoDB) + JWT + Emergent Google session auth + `emergentintegrations` library.
- **DB**: MongoDB (`test_database`).
- **LLMs**: GPT-5.2 (default) and Claude Sonnet 4.5 via Emergent Universal Key.
- **STT/TTS**: Browser Web Speech API.

## Personas
- **Student**: registers/logs in, picks subject + level, chats with AI tutor, takes adaptive quizzes, gets a study plan, tracks XP/badges/progress, sees leaderboard.
- **Admin**: views platform analytics, student roster, AI interaction logs.

## What's been implemented (2026-06-25)
- Auth: register, login, /auth/me, Google OAuth callback, logout. JWT + cookie session both supported.
- Profile: skill level, preferred subjects, goal.
- AI Tutor Chat: model picker (GPT-5.2 / Claude Sonnet 4.5), history persistence, voice input + TTS, history shown.
- Quizzes: AI-generated MCQ/short/code; LLM-graded for non-MCQ; XP gain; weak/strong topic tracking; adaptive level (≥0.8 → up, <0.4 → down).
- Study Planner: 7-day plan, PDF print/download.
- Gamification: XP, 6 badge rules, leaderboard top 20.
- Dashboard: study minutes, quiz avg, predicted next score (linear projection), trend line chart, subject progress, weak areas, badges, recent quizzes.
- Admin: stats, students table, subject bar chart, AI logs.
- Theme: dark/light toggle (persisted), Outfit/Manrope typography, purple primary.

## Backlog
- **P1**: SSE streaming for chat (currently buffered); add knowledge-gap concept clustering; voice settings (pick voice/lang).
- **P2**: PDF generation server-side (jsPDF or wkhtmltopdf); per-subject leaderboards; richer Performance Prediction (regression with study minutes feature).
- **P2**: Email verification, password reset; rate limiting.

## Test credentials
- Student: `student@test.com` / `Student@123`
- Admin: `admin@test.com` / `Admin@123`
- Google: via "Continue with Google" on /login

## Deployment status
Health check: **WARN → fixed** (query projections added). Ready to deploy.
