from __future__ import annotations

import hashlib

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from .database import get_database
    from .sample_data import SAMPLE_CANDIDATES
    from .services.scoring import analyze_resume_text, extract_text
except ImportError:
    from database import get_database
    from sample_data import SAMPLE_CANDIDATES
    from services.scoring import analyze_resume_text, extract_text


app = FastAPI(title="TalentLens AI API", version="1.0.0")
db = get_database()
MEMORY_CANDIDATES: list[dict] = []


class CandidateStatusUpdate(BaseModel):
    status: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "mongo_connected": bool(db)}


@app.get("/api/dashboard")
def get_dashboard():
    candidates = load_candidates()
    total = len(candidates)
    shortlisted = len([item for item in candidates if item.get("status") == "Shortlisted"])
    rejected = len([item for item in candidates if item.get("status") == "Rejected"])
    average_score = round(sum(item.get("score", 0) for item in candidates) / total) if total else 0
    top_roles_map: dict[str, int] = {}
    for item in candidates:
        role = item.get("role", "Unknown")
        top_roles_map[role] = top_roles_map.get(role, 0) + 1
    top_roles = [
        {"role": role, "value": count}
        for role, count in sorted(top_roles_map.items(), key=lambda pair: pair[1], reverse=True)[:4]
    ]
    score_distribution = build_score_distribution(candidates)

    return {
        "metrics": {
            "total_resumes": total,
            "shortlisted": shortlisted,
            "rejected": rejected,
            "average_score": average_score,
        },
        "score_distribution": score_distribution,
        "top_roles": top_roles,
        "pipeline_steps": [
            "Parsing Resume",
            "Extracting Skills",
            "Scoring Candidate",
            "Recommending Role",
        ],
    }


@app.get("/api/candidates")
def list_candidates(
    role: str | None = Query(default=None),
    fit: str | None = Query(default=None),
):
    items = load_candidates()
    if role:
        items = [item for item in items if item["role"] == role]
    if fit:
        items = [item for item in items if item["fit"] == fit]
    return items


@app.delete("/api/candidates")
def delete_all_candidates():
    deleted_count = 0

    if db is not None:
        result = db.candidates.delete_many({})
        deleted_count = result.deleted_count
    else:
        deleted_count = len(MEMORY_CANDIDATES)
        MEMORY_CANDIDATES.clear()

    return {"success": True, "deleted_count": deleted_count}


@app.get("/api/candidates/{candidate_id}")
def get_candidate(candidate_id: str):
    for item in load_candidates():
        if item["id"] == candidate_id:
            return item
    raise HTTPException(status_code=404, detail="Candidate not found")


@app.delete("/api/candidates/{candidate_id}")
def delete_candidate(candidate_id: str):
    if db is not None:
        result = db.candidates.delete_one({"id": candidate_id})
        if result.deleted_count:
            return {"success": True, "id": candidate_id}

    for index, candidate in enumerate(MEMORY_CANDIDATES):
        if candidate["id"] == candidate_id:
            MEMORY_CANDIDATES.pop(index)
            return {"success": True, "id": candidate_id}

    raise HTTPException(status_code=404, detail="Candidate not found")


@app.post("/api/resumes/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    post: str = Form(...),
    required_skills: str = Form(...),
):
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    fingerprint = build_resume_fingerprint(payload, post)
    existing_candidate = find_candidate_by_fingerprint(fingerprint)
    if existing_candidate is not None:
        return {
            "candidate": existing_candidate,
            "duplicate": True,
            "message": "Resume already uploaded. Existing analysis returned.",
        }

    try:
        text = extract_text(payload, file.filename or "resume.txt")
    except Exception:
        text = payload.decode("utf-8", errors="ignore")

    skill_list = [item.strip() for item in required_skills.split(",") if item.strip()]
    candidate = analyze_resume_text(text, friendly_name(file.filename), post, skill_list)
    candidate["fingerprint"] = fingerprint

    if db is not None:
        db.candidates.insert_one(candidate)
    else:
        MEMORY_CANDIDATES.insert(0, candidate)

    return {
        "candidate": candidate,
        "duplicate": False,
    }


@app.post("/api/resumes/analyze-batch")
async def analyze_resume_batch(
    files: list[UploadFile] = File(...),
    post: str = Form(...),
    required_skills: str = Form(...),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    skill_list = [item.strip() for item in required_skills.split(",") if item.strip()]
    analyzed_candidates: list[dict] = []
    skipped_duplicates: list[str] = []

    for file in files:
        payload = await file.read()
        if not payload:
            continue

        fingerprint = build_resume_fingerprint(payload, post)
        if find_candidate_by_fingerprint(fingerprint) is not None:
            skipped_duplicates.append(file.filename or "Unknown Resume")
            continue

        try:
            text = extract_text(payload, file.filename or "resume.txt")
        except Exception:
            text = payload.decode("utf-8", errors="ignore")

        candidate = analyze_resume_text(text, friendly_name(file.filename), post, skill_list)
        candidate["fingerprint"] = fingerprint
        analyzed_candidates.append(candidate)

    if not analyzed_candidates:
        raise HTTPException(status_code=400, detail="All selected resumes were duplicates or unreadable")

    if db is not None:
        db.candidates.insert_many(analyzed_candidates)
    else:
        MEMORY_CANDIDATES[0:0] = analyzed_candidates

    average_score = round(sum(item["score"] for item in analyzed_candidates) / len(analyzed_candidates))
    shortlisted = len([item for item in analyzed_candidates if item["status"] == "Shortlisted" or item["fit"] == "Strong"])

    return {
        "candidates": analyzed_candidates,
        "summary": {
            "uploaded_count": len(analyzed_candidates),
            "average_score": average_score,
            "shortlisted_count": shortlisted,
            "duplicate_count": len(skipped_duplicates),
            "skipped_duplicates": skipped_duplicates,
            "post": post,
            "required_skills": skill_list,
        },
    }


@app.patch("/api/candidates/{candidate_id}/status")
def update_candidate_status(candidate_id: str, payload: CandidateStatusUpdate):
    if db is not None:
        db.candidates.update_one(
            {"id": candidate_id},
            {"$set": {"status": payload.status}},
        )
        result = db.candidates.find_one({"id": candidate_id}, {"_id": 0})
        if result:
            return result

    for candidate in MEMORY_CANDIDATES:
        if candidate["id"] == candidate_id:
            candidate["status"] = payload.status
            return candidate

    raise HTTPException(status_code=404, detail="Candidate not found")


def load_candidates() -> list[dict]:
    if db is None:
        return MEMORY_CANDIDATES.copy()

    stored = list(db.candidates.find({}, {"_id": 0}))
    return stored + [item for item in SAMPLE_CANDIDATES if item["id"] not in {row["id"] for row in stored}]


def find_candidate_by_fingerprint(fingerprint: str) -> dict | None:
    if db is not None:
        stored = db.candidates.find_one({"fingerprint": fingerprint}, {"_id": 0})
        if stored:
            return stored

    for candidate in MEMORY_CANDIDATES:
        if candidate.get("fingerprint") == fingerprint:
            return candidate
    return None


def build_resume_fingerprint(payload: bytes, post: str) -> str:
    return hashlib.sha256(payload + post.strip().lower().encode("utf-8")).hexdigest()


def friendly_name(filename: str | None) -> str:
    if not filename:
        return "Uploaded Candidate"
    stem = (filename.rsplit(".", 1)[0]).replace("_", " ").replace("-", " ").strip()
    return stem.title() or "Uploaded Candidate"


def build_score_distribution(candidates: list[dict]) -> list[int]:
    if not candidates:
        return [0, 0, 0, 0, 0, 0]

    buckets = [0, 0, 0, 0, 0, 0]
    for candidate in candidates:
        score = candidate.get("score", 0)
        index = min(score // 20, 5)
        buckets[index] += 1
    return buckets


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
