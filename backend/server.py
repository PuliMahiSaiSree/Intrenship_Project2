"""Personalized Learning with Generative Tutoring — FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import uuid
import asyncio
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- DB ----------
from database import client, db  # noqa: E402

# Import after db is defined to avoid circular import in auth.py
from auth import (  # noqa: E402
    hash_password, verify_password, create_jwt, fetch_google_session_data,
    get_current_user, require_admin, new_user_id,
)
from llm import (  # noqa: E402
    tutor_reply, generate_quiz, evaluate_answer, generate_study_plan, summarize_notes,
)

app = FastAPI(title="AI Tutor API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

SUBJECTS = ["Mathematics", "Science", "Programming", "English", "History"]
LEVELS = ["beginner", "intermediate", "advanced"]

# ---------- Models ----------
class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class SessionReq(BaseModel):
    session_id: str

class ProfileUpdate(BaseModel):
    preferred_subjects: Optional[List[str]] = None
    skill_level: Optional[str] = None
    goal: Optional[str] = None

class ChatReq(BaseModel):
    subject: str
    level: str
    prompt: str
    model: Optional[str] = "gpt-5.2"

class QuizGenReq(BaseModel):
    subject: str
    topic: str
    level: str
    num_questions: int = 5
    model: Optional[str] = "gpt-5.2"

class QuizSubmitReq(BaseModel):
    quiz_id: str
    answers: Dict[str, str]  # question_id -> student answer

class StudyPlanReq(BaseModel):
    subject: str
    level: str
    goal: Optional[str] = ""
    model: Optional[str] = "gpt-5.2"

class SummarizeReq(BaseModel):
    content: str
    level: str = "intermediate"

# ---------- Helpers ----------
def utcnow() -> datetime:
    return datetime.now(timezone.utc)

def serialize_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "name": u.get("name"),
        "email": u.get("email"),
        "role": u.get("role", "student"),
        "picture": u.get("picture"),
        "xp": u.get("xp", 0),
        "badges": u.get("badges", []),
        "level": u.get("level", "beginner"),
        "preferred_subjects": u.get("preferred_subjects", []),
        "goal": u.get("goal", ""),
        "created_at": u.get("created_at"),
    }

BADGES_RULES = [
    ("first_steps", "First Steps", "Completed your first quiz", lambda s: s["quizzes_taken"] >= 1),
    ("quiz_master_10", "Quiz Master", "Completed 10 quizzes", lambda s: s["quizzes_taken"] >= 10),
    ("sharp_shooter", "Sharp Shooter", "Scored 100% on a quiz", lambda s: s["perfect_scores"] >= 1),
    ("xp_500", "Rising Star", "Earned 500 XP", lambda s: s["xp"] >= 500),
    ("xp_2000", "Scholar", "Earned 2000 XP", lambda s: s["xp"] >= 2000),
    ("streak_3", "Consistent Learner", "Studied 3 days in a row", lambda s: s["streak"] >= 3),
]

async def update_badges(user_id: str):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return
    results = await db.quiz_results.find(
        {"user_id": user_id},
        {"_id": 0, "score": 1, "date": 1},
    ).to_list(1000)
    quizzes_taken = len(results)
    perfect_scores = sum(1 for r in results if r.get("score", 0) >= 0.99)
    xp = user.get("xp", 0)
    # streak = consecutive UTC days with at least one quiz
    days = sorted({r["date"][:10] for r in results if r.get("date")})
    streak = 0
    if days:
        cur = datetime.fromisoformat(days[-1]).date()
        for d in reversed(days):
            if datetime.fromisoformat(d).date() == cur:
                streak += 1
                cur = cur - timedelta(days=1)
            else:
                break
    stats = {"quizzes_taken": quizzes_taken, "perfect_scores": perfect_scores, "xp": xp, "streak": streak}
    earned = [{"id": bid, "name": name, "description": desc, "earned_at": utcnow().isoformat()}
              for bid, name, desc, rule in BADGES_RULES if rule(stats)]
    existing = {b["id"] for b in user.get("badges", [])}
    new_badges = [b for b in earned if b["id"] not in existing]
    if new_badges:
        merged = user.get("badges", []) + new_badges
        await db.users.update_one({"user_id": user_id}, {"$set": {"badges": merged}})

def adapt_level(current: str, score: float) -> str:
    order = LEVELS
    idx = order.index(current) if current in order else 1
    if score >= 0.8 and idx < 2:
        return order[idx + 1]
    if score < 0.4 and idx > 0:
        return order[idx - 1]
    return current

# ---------- Auth ----------
@api.post("/auth/register")
async def register(req: RegisterReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    uid = new_user_id()
    doc = {
        "user_id": uid,
        "name": req.name,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "role": "student",
        "level": "beginner",
        "preferred_subjects": [],
        "goal": "",
        "xp": 0,
        "badges": [],
        "weak_topics": [],
        "strong_topics": [],
        "created_at": utcnow().isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_jwt(uid, "student")
    return {"token": token, "user": serialize_user(doc)}

@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not user.get("password_hash"):
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_jwt(user["user_id"], user.get("role", "student"))
    return {"token": token, "user": serialize_user(user)}

@api.post("/auth/session")
async def google_session(req: SessionReq, response: Response):
    """Exchange Emergent session_id for a session_token; create user if new."""
    data = await fetch_google_session_data(req.session_id)
    if not data:
        raise HTTPException(401, "Invalid Google session")
    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        uid = new_user_id()
        user = {
            "user_id": uid,
            "name": data.get("name", ""),
            "email": email,
            "picture": data.get("picture"),
            "role": "student",
            "level": "beginner",
            "preferred_subjects": [],
            "goal": "",
            "xp": 0,
            "badges": [],
            "weak_topics": [],
            "strong_topics": [],
            "created_at": utcnow().isoformat(),
        }
        await db.users.insert_one(user)
    # store session
    session_token = data["session_token"]
    expires_at = utcnow() + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": user["user_id"], "session_token": session_token,
                  "expires_at": expires_at.isoformat(), "created_at": utcnow().isoformat()}},
        upsert=True,
    )
    response.set_cookie("session_token", session_token, httponly=True, secure=True,
                        samesite="none", path="/", max_age=7 * 24 * 3600)
    return {"user": serialize_user(user)}

@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)

# ---------- Profile ----------
@api.put("/profile")
async def update_profile(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update.get("skill_level") and update["skill_level"] not in LEVELS:
        raise HTTPException(400, "Invalid skill level")
    if update.get("skill_level"):
        update["level"] = update.pop("skill_level")
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return serialize_user(fresh)

@api.get("/meta/subjects")
async def meta_subjects():
    return {"subjects": SUBJECTS, "levels": LEVELS}

# ---------- Chat ----------
@api.post("/chat")
async def chat(req: ChatReq, user: dict = Depends(get_current_user)):
    history = await db.chat_history.find(
        {"user_id": user["user_id"], "subject": req.subject}, {"_id": 0}
    ).sort("created_at", -1).to_list(8)
    history = list(reversed(history))
    reply = await tutor_reply(
        session_id=f"chat-{user['user_id']}-{req.subject}",
        subject=req.subject, level=req.level, prompt=req.prompt,
        model_key=req.model or "gpt-5.2", history=history,
    )
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["user_id"], "subject": req.subject,
        "level": req.level, "prompt": req.prompt, "response": reply,
        "model": req.model, "created_at": utcnow().isoformat(),
    }
    await db.chat_history.insert_one(doc)
    # study minutes proxy
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"xp": 5}})
    await update_badges(user["user_id"])
    return {"response": reply, "id": doc["id"]}

@api.get("/chat/history")
async def chat_history(subject: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"user_id": user["user_id"]}
    if subject:
        q["subject"] = subject
    items = await db.chat_history.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"items": items}

# ---------- Quiz ----------
@api.post("/quiz/generate")
async def quiz_generate(req: QuizGenReq, user: dict = Depends(get_current_user)):
    questions = await generate_quiz(req.subject, req.topic, req.level, req.num_questions, req.model or "gpt-5.2")
    if not questions:
        raise HTTPException(500, "Failed to generate quiz")
    quiz_id = str(uuid.uuid4())
    doc = {
        "quiz_id": quiz_id, "user_id": user["user_id"], "subject": req.subject,
        "topic": req.topic, "level": req.level, "questions": questions,
        "created_at": utcnow().isoformat(),
    }
    await db.quizzes.insert_one(doc)
    # return without answers
    public = [{k: v for k, v in q.items() if k != "answer" and k != "explanation"} for q in questions]
    return {"quiz_id": quiz_id, "subject": req.subject, "topic": req.topic, "level": req.level, "questions": public}

@api.post("/quiz/submit")
async def quiz_submit(req: QuizSubmitReq, user: dict = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"quiz_id": req.quiz_id, "user_id": user["user_id"]}, {"_id": 0})
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    results = []
    correct_count = 0
    for q in quiz["questions"]:
        ans = req.answers.get(q["id"], "")
        ev = await evaluate_answer(q, ans)
        if ev["correct"]:
            correct_count += 1
        results.append({"id": q["id"], "question": q["question"], "your_answer": ans,
                        "expected": q.get("answer"), **ev})
    total = len(quiz["questions"]) or 1
    score = correct_count / total
    # weak/strong topic tracking (topic-level)
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    weak = set(user_doc.get("weak_topics", []))
    strong = set(user_doc.get("strong_topics", []))
    if score < 0.5:
        weak.add(quiz["topic"])
    if score >= 0.8:
        strong.add(quiz["topic"])
        weak.discard(quiz["topic"])
    new_level = adapt_level(user_doc.get("level", "beginner"), score)
    xp_gain = int(score * 100) + 20
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"weak_topics": list(weak), "strong_topics": list(strong), "level": new_level},
         "$inc": {"xp": xp_gain}},
    )
    await db.quiz_results.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["user_id"], "quiz_id": quiz["quiz_id"],
        "subject": quiz["subject"], "topic": quiz["topic"], "level": quiz["level"],
        "score": score, "correct": correct_count, "total": total,
        "date": utcnow().isoformat(),
    })
    await update_badges(user["user_id"])
    return {"score": score, "correct": correct_count, "total": total, "results": results,
            "new_level": new_level, "xp_gain": xp_gain}

@api.get("/quiz/history")
async def quiz_history(user: dict = Depends(get_current_user)):
    items = await db.quiz_results.find({"user_id": user["user_id"]}, {"_id": 0}).sort("date", -1).to_list(50)
    return {"items": items}

# ---------- Study Plan ----------
@api.post("/study-plan")
async def study_plan(req: StudyPlanReq, user: dict = Depends(get_current_user)):
    weak = user.get("weak_topics", [])
    plan = await generate_study_plan(req.subject, req.level, weak, req.goal or user.get("goal", ""), req.model or "gpt-5.2")
    doc = {"id": str(uuid.uuid4()), "user_id": user["user_id"], "subject": req.subject,
           "level": req.level, "plan": plan, "created_at": utcnow().isoformat()}
    await db.study_plans.insert_one(doc)
    return {"id": doc["id"], "plan": plan}

@api.get("/study-plan/latest")
async def study_plan_latest(user: dict = Depends(get_current_user)):
    doc = await db.study_plans.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
    return doc or {}

# ---------- Summarize ----------
@api.post("/summarize")
async def summarize(req: SummarizeReq, user: dict = Depends(get_current_user)):
    text = await summarize_notes(req.content, req.level)
    return {"summary": text}

# ---------- Dashboard ----------
@api.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    uid = user["user_id"]
    results = await db.quiz_results.find(
        {"user_id": uid},
        {"_id": 0, "score": 1, "date": 1, "subject": 1, "topic": 1, "level": 1, "correct": 1, "total": 1},
    ).sort("date", -1).to_list(200)
    chat_count = await db.chat_history.count_documents({"user_id": uid})
    total_quizzes = len(results)
    avg_score = sum(r["score"] for r in results) / total_quizzes if total_quizzes else 0
    by_subject: Dict[str, Dict[str, float]] = {}
    for r in results:
        s = by_subject.setdefault(r["subject"], {"count": 0, "score_sum": 0})
        s["count"] += 1
        s["score_sum"] += r["score"]
    subject_progress = [
        {"subject": k, "avg_score": v["score_sum"] / v["count"], "attempts": v["count"]}
        for k, v in by_subject.items()
    ]
    # study minutes proxy: 3 min per chat msg + 5 min per quiz attempt
    study_minutes = chat_count * 3 + total_quizzes * 5
    # weekly trend (last 7 quizzes)
    trend = [{"date": r["date"][:10], "score": round(r["score"] * 100, 1), "subject": r["subject"]}
             for r in reversed(results[:14])]
    # performance prediction: simple linear projection of last 5 scores
    last5 = [r["score"] for r in results[:5]]
    if len(last5) >= 2:
        diff = (last5[0] - last5[-1]) / (len(last5) - 1)
        predicted = max(0, min(1, last5[0] + diff))
    else:
        predicted = avg_score
    fresh_user = await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})
    return {
        "user": serialize_user(fresh_user),
        "stats": {
            "total_quizzes": total_quizzes,
            "avg_score": round(avg_score * 100, 1),
            "study_minutes": study_minutes,
            "chat_count": chat_count,
            "xp": fresh_user.get("xp", 0),
            "level": fresh_user.get("level", "beginner"),
            "predicted_next_score": round(predicted * 100, 1),
        },
        "subject_progress": subject_progress,
        "weak_topics": fresh_user.get("weak_topics", []),
        "strong_topics": fresh_user.get("strong_topics", []),
        "trend": trend,
        "badges": fresh_user.get("badges", []),
        "recent_quizzes": results[:5],
    }

# ---------- Leaderboard ----------
@api.get("/leaderboard")
async def leaderboard():
    top = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("xp", -1).to_list(20)
    return {"items": [
        {"user_id": u["user_id"], "name": u.get("name", "Anon"), "xp": u.get("xp", 0),
         "level": u.get("level", "beginner"), "badges_count": len(u.get("badges", []))}
        for u in top
    ]}

# ---------- Admin ----------
@api.get("/admin/students")
async def admin_students(_: dict = Depends(require_admin)):
    users = await db.users.find(
        {"role": {"$ne": "admin"}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1, "level": 1, "xp": 1,
         "badges": 1, "preferred_subjects": 1, "goal": 1, "picture": 1, "created_at": 1},
    ).to_list(500)
    return {"items": [serialize_user(u) for u in users]}

@api.get("/admin/analytics")
async def admin_analytics(_: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({"role": {"$ne": "admin"}})
    total_quizzes = await db.quiz_results.count_documents({})
    total_chats = await db.chat_history.count_documents({})
    results = await db.quiz_results.find({}, {"_id": 0, "score": 1, "subject": 1}).to_list(2000)
    avg_score = sum(r["score"] for r in results) / len(results) if results else 0
    by_subject: Dict[str, Dict[str, float]] = {}
    for r in results:
        s = by_subject.setdefault(r["subject"], {"count": 0, "score_sum": 0})
        s["count"] += 1
        s["score_sum"] += r["score"]
    subject_breakdown = [
        {"subject": k, "avg_score": round((v["score_sum"] / v["count"]) * 100, 1), "attempts": v["count"]}
        for k, v in by_subject.items()
    ]
    return {"total_users": total_users, "total_quizzes": total_quizzes,
            "total_chats": total_chats, "avg_score": round(avg_score * 100, 1),
            "subject_breakdown": subject_breakdown}

@api.get("/admin/logs")
async def admin_logs(limit: int = 50, _: dict = Depends(require_admin)):
    logs = await db.chat_history.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    # attach user emails
    user_ids = {l["user_id"] for l in logs}
    users = await db.users.find({"user_id": {"$in": list(user_ids)}}, {"_id": 0, "user_id": 1, "email": 1, "name": 1}).to_list(500)
    umap = {u["user_id"]: u for u in users}
    for log in logs:
        u = umap.get(log["user_id"], {})
        log["user_email"] = u.get("email")
        log["user_name"] = u.get("name")
    return {"items": logs}

# ---------- Health ----------
@api.get("/")
async def root():
    return {"ok": True, "service": "ai-tutor"}

# ---------- Seed admin ----------
@app.on_event("startup")
async def seed_admin():
    admin_email = "admin@test.com"
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "user_id": new_user_id(),
            "name": "Admin",
            "email": admin_email,
            "password_hash": hash_password("Admin@123"),
            "role": "admin",
            "level": "advanced",
            "preferred_subjects": [],
            "goal": "",
            "xp": 0,
            "badges": [],
            "weak_topics": [],
            "strong_topics": [],
            "created_at": utcnow().isoformat(),
        })
        logger.info("Seeded admin user")
    # seed a default student for testing
    student_email = "student@test.com"
    if not await db.users.find_one({"email": student_email}):
        await db.users.insert_one({
            "user_id": new_user_id(),
            "name": "Student",
            "email": student_email,
            "password_hash": hash_password("Student@123"),
            "role": "student",
            "level": "intermediate",
            "preferred_subjects": ["Mathematics", "Programming"],
            "goal": "Improve problem solving",
            "xp": 120,
            "badges": [],
            "weak_topics": [],
            "strong_topics": [],
            "created_at": utcnow().isoformat(),
        })
        logger.info("Seeded student user")

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
