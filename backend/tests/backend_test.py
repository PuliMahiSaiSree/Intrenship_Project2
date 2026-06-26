"""Backend API tests for AI Tutor."""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://ai-tutor-hub-290.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

STUDENT = {"email": "student@test.com", "password": "Student@123"}
ADMIN = {"email": "admin@test.com", "password": "Admin@123"}


@pytest.fixture(scope="session")
def student_token():
    r = requests.post(f"{API}/auth/login", json=STUDENT, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# Auth ----
def test_register_new_user():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register",
                      json={"name": "Tester", "email": email, "password": "Pass@1234"}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "token" in d and d["user"]["email"] == email and d["user"]["role"] == "student"


def test_login_student(student_token):
    assert student_token


def test_login_admin_role():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "admin"


def test_login_bad_password():
    r = requests.post(f"{API}/auth/login", json={"email": "student@test.com", "password": "wrong"}, timeout=20)
    assert r.status_code == 401


def test_me(student_token):
    r = requests.get(f"{API}/auth/me", headers=auth(student_token), timeout=20)
    assert r.status_code == 200
    assert r.json()["email"] == "student@test.com"


def test_me_unauthorized():
    r = requests.get(f"{API}/auth/me", timeout=20)
    assert r.status_code == 401


# Meta + Profile ----
def test_meta_subjects():
    r = requests.get(f"{API}/meta/subjects", timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert "Mathematics" in d["subjects"] and "beginner" in d["levels"]


def test_profile_update(student_token):
    r = requests.put(f"{API}/profile",
                     json={"skill_level": "intermediate", "goal": "Master math",
                           "preferred_subjects": ["Mathematics"]},
                     headers=auth(student_token), timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d["level"] == "intermediate"
    assert d["goal"] == "Master math"


# Chat ----
def test_chat_gpt(student_token):
    r = requests.post(f"{API}/chat",
                      json={"subject": "Mathematics", "level": "beginner",
                            "prompt": "Explain fractions in 1 sentence.", "model": "gpt-5.2"},
                      headers=auth(student_token), timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert isinstance(d["response"], str) and len(d["response"]) > 5
    assert "id" in d


def test_chat_claude(student_token):
    r = requests.post(f"{API}/chat",
                      json={"subject": "Science", "level": "beginner",
                            "prompt": "Define gravity briefly.", "model": "claude-sonnet-4.5"},
                      headers=auth(student_token), timeout=90)
    assert r.status_code == 200, r.text
    assert isinstance(r.json()["response"], str)


def test_chat_history(student_token):
    r = requests.get(f"{API}/chat/history", headers=auth(student_token), timeout=20)
    assert r.status_code == 200
    assert "items" in r.json()


# Quiz ----
@pytest.fixture(scope="session")
def generated_quiz(student_token):
    r = requests.post(f"{API}/quiz/generate",
                      json={"subject": "Mathematics", "topic": "Linear equations",
                            "level": "beginner", "num_questions": 3},
                      headers=auth(student_token), timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "quiz_id" in d and len(d["questions"]) >= 1
    for q in d["questions"]:
        assert "answer" not in q
    return d


def test_quiz_generate(generated_quiz):
    assert generated_quiz["quiz_id"]


def test_quiz_submit(student_token, generated_quiz):
    answers = {q["id"]: (q.get("options", ["A"])[0] if q.get("options") else "test") for q in generated_quiz["questions"]}
    r = requests.post(f"{API}/quiz/submit",
                      json={"quiz_id": generated_quiz["quiz_id"], "answers": answers},
                      headers=auth(student_token), timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "score" in d and "results" in d and "new_level" in d and "xp_gain" in d


def test_quiz_history(student_token):
    r = requests.get(f"{API}/quiz/history", headers=auth(student_token), timeout=20)
    assert r.status_code == 200
    assert "items" in r.json()


# Study Plan ----
def test_study_plan_create(student_token):
    r = requests.post(f"{API}/study-plan",
                      json={"subject": "Mathematics", "level": "beginner", "goal": "Learn fractions"},
                      headers=auth(student_token), timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "plan" in d


def test_study_plan_latest(student_token):
    r = requests.get(f"{API}/study-plan/latest", headers=auth(student_token), timeout=20)
    assert r.status_code == 200


# Summarize ----
def test_summarize(student_token):
    r = requests.post(f"{API}/summarize",
                      json={"content": "Fractions represent parts of a whole. The top is numerator.", "level": "beginner"},
                      headers=auth(student_token), timeout=60)
    assert r.status_code == 200
    assert "summary" in r.json()


# Dashboard ----
def test_dashboard(student_token):
    r = requests.get(f"{API}/dashboard", headers=auth(student_token), timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["stats", "subject_progress", "weak_topics", "trend", "badges", "recent_quizzes"]:
        assert k in d
    assert "predicted_next_score" in d["stats"]


def test_leaderboard():
    r = requests.get(f"{API}/leaderboard", timeout=20)
    assert r.status_code == 200
    assert "items" in r.json()


# Admin ----
def test_admin_students_as_admin(admin_token):
    r = requests.get(f"{API}/admin/students", headers=auth(admin_token), timeout=20)
    assert r.status_code == 200


def test_admin_students_forbidden_for_student(student_token):
    r = requests.get(f"{API}/admin/students", headers=auth(student_token), timeout=20)
    assert r.status_code == 403


def test_admin_analytics(admin_token):
    r = requests.get(f"{API}/admin/analytics", headers=auth(admin_token), timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert "total_users" in d and "subject_breakdown" in d


def test_admin_logs(admin_token):
    r = requests.get(f"{API}/admin/logs?limit=10", headers=auth(admin_token), timeout=20)
    assert r.status_code == 200
    assert "items" in r.json()


def test_admin_logs_forbidden(student_token):
    r = requests.get(f"{API}/admin/logs", headers=auth(student_token), timeout=20)
    assert r.status_code == 403
