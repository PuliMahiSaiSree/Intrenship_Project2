"""LLM service wrappers powered by emergentintegrations."""
import os
import json
import re
import uuid
from typing import Optional, List, Dict, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

MODEL_MAP = {
    "gpt-5.2": ("openai", "gpt-5.2"),
    "claude-sonnet-4.5": ("anthropic", "claude-sonnet-4-5-20250929"),
}
DEFAULT_MODEL = "gpt-5.2"


def _chat(session_id: str, system_message: str, model_key: str = DEFAULT_MODEL) -> LlmChat:
    provider, model = MODEL_MAP.get(model_key, MODEL_MAP[DEFAULT_MODEL])
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(provider, model)


def _level_tone(level: str) -> str:
    if level == "beginner":
        return "Use simple, everyday language. Explain like to a curious 12-year-old. Use vivid analogies. Avoid jargon."
    if level == "advanced":
        return "Use precise technical vocabulary. Skip basics. Reference advanced concepts and real-world systems."
    return "Use intermediate language. Define terms briefly but build on a high-school foundation."


async def tutor_reply(
    session_id: str,
    subject: str,
    level: str,
    prompt: str,
    model_key: str = DEFAULT_MODEL,
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    system = (
        f"You are an expert AI tutor for {subject}. The student is at the {level} level. "
        f"{_level_tone(level)} "
        "Teach by guiding questions and hints, not by handing over answers. "
        "Always include a 'Real-world example' section and a short 'Try this' practice question at the end. "
        "Use markdown. Be concise but thorough."
    )
    chat = _chat(session_id, system, model_key)
    # Stitch history into the user message for context
    ctx = ""
    if history:
        for h in history[-4:]:
            ctx += f"\n[Prev student]: {h.get('prompt','')}\n[Prev tutor]: {h.get('response','')}\n"
    full = (ctx + f"\n[Student question]: {prompt}").strip()
    resp = await chat.send_message(UserMessage(text=full))
    return resp if isinstance(resp, str) else str(resp)


def _extract_json(raw: str) -> Any:
    # Try to pull the first JSON block
    raw = raw.strip()
    # Strip markdown fences
    m = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
    if m:
        raw = m.group(1).strip()
    # Find first { or [
    start = min([p for p in [raw.find("{"), raw.find("[")] if p >= 0], default=-1)
    if start >= 0:
        raw = raw[start:]
    try:
        return json.loads(raw)
    except Exception:
        return None


async def generate_quiz(
    subject: str, topic: str, level: str, num_questions: int = 5, model_key: str = DEFAULT_MODEL
) -> List[Dict[str, Any]]:
    system = (
        "You are a quiz generator. Reply with STRICT JSON only — no prose, no markdown fences. "
        "JSON shape: an array of question objects."
    )
    prompt = f"""Create {num_questions} {level}-level questions on "{topic}" in subject "{subject}".
Mix question types: mostly MCQ, but include 1 short-answer and (if subject is Programming) 1 coding question.

JSON shape (array):
[
  {{
    "id": "q1",
    "type": "mcq" | "short" | "code",
    "question": "...",
    "options": ["A...", "B...", "C...", "D..."]  // only for mcq
    "answer": "Exact correct option text" or "expected short answer keywords" or "expected code idea",
    "explanation": "Why this is the answer"
  }}
]
Return ONLY the JSON array."""
    chat = _chat(f"quiz-{uuid.uuid4().hex[:8]}", system, model_key)
    raw = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(raw if isinstance(raw, str) else str(raw))
    if isinstance(data, list):
        return data
    return []


async def evaluate_answer(
    question: Dict[str, Any], student_answer: str, model_key: str = DEFAULT_MODEL
) -> Dict[str, Any]:
    """Returns {correct: bool, score: 0-1, feedback: str}."""
    if question.get("type") == "mcq":
        correct = (student_answer or "").strip().lower() == str(question.get("answer", "")).strip().lower()
        return {
            "correct": correct,
            "score": 1.0 if correct else 0.0,
            "feedback": question.get("explanation", "Correct!" if correct else "Review the concept."),
        }
    # For short/code, use LLM grader
    system = "You are a strict but fair grader. Reply with STRICT JSON only."
    prompt = f"""Grade the student's answer.
Question: {question.get('question')}
Expected answer / keywords: {question.get('answer')}
Student answer: {student_answer}

Return JSON: {{"correct": true|false, "score": 0.0-1.0, "feedback": "1-2 sentence explanation"}}"""
    chat = _chat(f"grade-{uuid.uuid4().hex[:8]}", system, model_key)
    raw = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(raw if isinstance(raw, str) else str(raw))
    if isinstance(data, dict):
        return {
            "correct": bool(data.get("correct")),
            "score": float(data.get("score", 0.0)),
            "feedback": str(data.get("feedback", "")),
        }
    return {"correct": False, "score": 0.0, "feedback": "Could not auto-grade. Please review."}


async def generate_study_plan(
    subject: str, level: str, weak_topics: List[str], goal: str, model_key: str = DEFAULT_MODEL
) -> Dict[str, Any]:
    system = "You are an expert tutor and study planner. Reply with STRICT JSON only."
    prompt = f"""Create a 7-day study plan for a {level} student in {subject}.
Goal: {goal or 'Improve overall mastery'}
Weak topics to prioritize: {', '.join(weak_topics) if weak_topics else 'None reported'}

Return JSON:
{{
  "summary": "1-2 sentence overview",
  "days": [
    {{"day": 1, "title": "...", "duration_minutes": 45, "topics": ["..."], "activities": ["read X", "do 5 MCQs"]}},
    ...
  ]
}}"""
    chat = _chat(f"plan-{uuid.uuid4().hex[:8]}", system, model_key)
    raw = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(raw if isinstance(raw, str) else str(raw))
    if isinstance(data, dict):
        return data
    return {"summary": "Could not generate plan.", "days": []}


async def summarize_notes(content: str, level: str, model_key: str = DEFAULT_MODEL) -> str:
    system = f"Summarise study material for a {level} learner. Be clear and well-structured in markdown."
    chat = _chat(f"sum-{uuid.uuid4().hex[:8]}", system, model_key)
    raw = await chat.send_message(UserMessage(text=content))
    return raw if isinstance(raw, str) else str(raw)
