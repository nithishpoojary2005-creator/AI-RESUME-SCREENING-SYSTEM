# TalentLens AI Resume Screening

A polished full-stack starter for an AI resume screening website based on your page flow:

- Login page
- Dashboard
- Resume upload and analysis
- Candidate list
- Candidate profile view

## Stack

- React + Vite frontend
- Python FastAPI backend
- MongoDB-ready persistence
- Simple NLP-style keyword scoring for resume screening

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Backend

Install Python 3.11+ and then:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend runs on `http://localhost:8000`.

## MongoDB

Create a local MongoDB instance or MongoDB Atlas connection and set:

```bash
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=talentlens_ai
```

## Notes

- If the API is not running, the frontend automatically falls back to demo data.
- The upload flow is already wired to the backend endpoint `/api/resumes/analyze`.
- The backend scoring service is intentionally explainable and easy to extend with spaCy, transformers, or custom ranking rules later.
