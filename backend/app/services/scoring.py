from __future__ import annotations

import re
import uuid
from io import BytesIO
from pathlib import Path

from PyPDF2 import PdfReader


EDUCATION_MAP = ["b.tech", "bca", "mca", "b.sc", "b.e", "mba"]


def extract_text(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(BytesIO(file_bytes))
        return " ".join((page.extract_text() or "") for page in reader.pages)
    return file_bytes.decode("utf-8", errors="ignore")


def analyze_resume_text(text: str, display_name: str, post: str, required_skills: list[str]) -> dict:
    cleaned = re.sub(r"\s+", " ", text.lower()).strip()
    normalized_skills = [skill.strip() for skill in required_skills if skill.strip()]
    normalized_lower = [skill.lower() for skill in normalized_skills]
    hits = sum(1 for keyword in normalized_lower if keyword in cleaned)
    base_score = round((hits / len(normalized_lower)) * 100) if normalized_lower else 0
    score = min(95, max(12, base_score + infer_experience_bonus(cleaned)))
    fit = "Strong" if score >= 70 else "Moderate" if score >= 45 else "Weak"
    matched = [keyword for keyword, lower in zip(normalized_skills, normalized_lower) if lower in cleaned]
    missing = [keyword for keyword, lower in zip(normalized_skills, normalized_lower) if lower not in cleaned][:5]
    recommended_role = post.strip() or "General Role"

    return {
        "id": f"cand-{uuid.uuid4().hex[:8]}",
        "name": display_name,
        "initials": "".join(part[0] for part in display_name.split()[:2]).upper() or "AI",
        "score": score,
        "fit": fit,
        "role": recommended_role,
        "status": "Pending Review",
        "required_skills": normalized_skills,
        "experience": infer_experience(cleaned),
        "education": infer_education(cleaned),
        "location": infer_location(cleaned),
        "skills_match": matched or ["Communication"],
        "missing_skills": missing,
        "summary": build_summary(recommended_role, score, matched, missing),
    }


def infer_experience_bonus(text: str) -> int:
    if "3 years" in text or "three years" in text:
        return 18
    if "2 years" in text or "two years" in text:
        return 12
    if "1 year" in text or "one year" in text:
        return 6
    return 0


def infer_experience(text: str) -> str:
    matches = re.findall(r"(\d+)\+?\s+years?", text)
    return f"{matches[0]} Years" if matches else "Fresher"


def infer_education(text: str) -> str:
    for item in EDUCATION_MAP:
        if item in text:
            return item.upper()
    return "Graduate"


def infer_location(text: str) -> str:
    for city in ["bengaluru", "chennai", "hyderabad", "pune", "mumbai", "remote"]:
        if city in text:
            return city.title()
    return "Remote"


def build_summary(role: str, score: int, matched: list[str], missing: list[str]) -> str:
    matched_text = ", ".join(matched[:4]) if matched else "core transferable skills"
    missing_text = ", ".join(missing[:2]) if missing else "no critical gaps"
    return (
        f"Recommended for {role} with a score of {score}. "
        f"Matched strengths include {matched_text}, while improvement areas include {missing_text}."
    )
