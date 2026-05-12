from pydantic import BaseModel


class Candidate(BaseModel):
    id: str
    name: str
    initials: str
    score: int
    fit: str
    role: str
    experience: str
    education: str
    location: str
    skills_match: list[str]
    missing_skills: list[str]
    summary: str
