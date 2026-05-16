import re
import uuid
import PyPDF2


# =========================
# EXTRACT TEXT FROM RESUME
# =========================
def extract_text(file):
    text = ""

    try:
        # PDF FILE
        if file.filename.endswith(".pdf"):

            pdf_reader = PyPDF2.PdfReader(file.file)

            for page in pdf_reader.pages:
                extracted = page.extract_text()

                if extracted:
                    text += extracted

        # TEXT FILE
        else:
            text = file.file.read().decode("utf-8")

    except Exception as e:
        print("Text Extraction Error:", e)

    return text


# =========================
# EXPERIENCE DETECTION
# =========================
def infer_experience(text: str) -> str:

    patterns = [
        r"(\d+)\+?\s+years",
        r"experience\s+of\s+(\d+)",
        r"(\d+)\s+yrs",
    ]

    for pattern in patterns:

        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            years = match.group(1)
            return f"{years}+ years"

    return "Fresher"


# =========================
# EXPERIENCE BONUS
# =========================
def infer_experience_bonus(text: str) -> int:

    patterns = [
        r"(\d+)\+?\s+years",
        r"experience\s+of\s+(\d+)",
        r"(\d+)\s+yrs",
    ]

    for pattern in patterns:

        match = re.search(pattern, text, re.IGNORECASE)

        if match:

            years = int(match.group(1))

            if years >= 5:
                return 20

            elif years >= 3:
                return 15

            elif years >= 1:
                return 10

    return 5


# =========================
# EDUCATION DETECTION
# =========================
def infer_education(text: str) -> str:

    education_keywords = {
        "PhD": ["phd", "doctorate"],
        "Master's": ["mtech", "mba", "msc", "master"],
        "Bachelor's": ["btech", "be", "bsc", "bca", "bachelor"],
        "Diploma": ["diploma"],
    }

    text = text.lower()

    for degree, keywords in education_keywords.items():

        for keyword in keywords:

            if keyword in text:
                return degree

    return "Not Specified"


# =========================
# LOCATION DETECTION
# =========================
def infer_location(text: str) -> str:

    locations = [
        "bangalore",
        "mysore",
        "mumbai",
        "delhi",
        "hyderabad",
        "chennai",
        "pune",
        "kolkata",
    ]

    text = text.lower()

    for location in locations:

        if location in text:
            return location.title()

    return "Not Mentioned"


# =========================
# BUILD SUMMARY
# =========================
def build_summary(
    role: str,
    score: int,
    matched: list,
    missing: list,
) -> str:

    matched_text = (
        ", ".join(matched[:4])
        if matched
        else "No major skills matched"
    )

    missing_text = (
        ", ".join(missing[:3])
        if missing
        else "No major missing skills"
    )

    return (
        f"Candidate is suitable for {role}. "
        f"Resume score is {score}%. "
        f"Matched skills: {matched_text}. "
        f"Missing skills: {missing_text}."
    )


# =========================
# MAIN ANALYSIS FUNCTION
# =========================
def analyze_resume_text(
    text: str,
    display_name: str,
    post: str,
    required_skills: list[str],
) -> dict:

    # CLEAN TEXT
    cleaned = re.sub(r"\s+", " ", text.lower()).strip()

    # REMOVE EMPTY SKILLS
    normalized_skills = [
        skill.strip()
        for skill in required_skills
        if skill.strip()
    ]

    normalized_lower = [
        skill.lower()
        for skill in normalized_skills
    ]

    matched = []
    missing = []

    # =========================
    # SKILL MATCHING
    # =========================
    for skill, lower in zip(
        normalized_skills,
        normalized_lower,
    ):

        pattern = rf"\b{re.escape(lower)}\b"

        if re.search(pattern, cleaned):
            matched.append(skill)

        else:
            missing.append(skill)

    # =========================
    # SCORE CALCULATION
    # =========================
    total_skills = len(normalized_lower)

    if total_skills > 0:
        skill_score = (
            len(matched) / total_skills
        ) * 100
    else:
        skill_score = 0

    experience_bonus = infer_experience_bonus(
        cleaned
    )

    score = round(
        skill_score + experience_bonus
    )

    # LIMIT SCORE
    if score > 100:
        score = 100

    # =========================
    # FIT CATEGORY
    # =========================
    if score >= 70:
        fit = "Strong"

    elif score >= 45:
        fit = "Moderate"

    else:
        fit = "Weak"

    # ROLE
    recommended_role = (
        post.strip()
        if post
        else "General Role"
    )

    # =========================
    # FINAL RESPONSE
    # =========================
    return {

        "id": f"cand-{uuid.uuid4().hex[:8]}",

        "name": display_name,

        "initials": "".join(
            part[0]
            for part in display_name.split()[:2]
        ).upper() or "AI",

        "score": score,

        "fit": fit,

        "role": recommended_role,

        "status": "Pending Review",

        "required_skills": normalized_skills,

        "experience": infer_experience(
            cleaned
        ),

        "education": infer_education(
            cleaned
        ),

        "location": infer_location(
            cleaned
        ),

        "skills_match": matched,

        "missing_skills": missing[:5],

        "summary": build_summary(
            recommended_role,
            score,
            matched,
            missing,
        ),
    }