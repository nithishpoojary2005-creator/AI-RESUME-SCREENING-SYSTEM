import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { deleteAllCandidates, deleteCandidate, getCandidate, getCandidates, getDashboard, updateCandidateStatus, uploadResume, uploadResumes } from "./api";
import { fallbackCandidates, fallbackDashboard } from "./mockData";

function App() {
  const [authed, setAuthed] = useState(true);
  const [dashboard, setDashboard] = useState(fallbackDashboard);
  const [candidates, setCandidates] = useState(fallbackCandidates);
  const [apiOnline, setApiOnline] = useState(false);
  const [lastBatchSummary, setLastBatchSummary] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function bootstrap() {
      try {
        const [dashboardData, candidateData] = await Promise.all([
          getDashboard(),
          getCandidates(),
        ]);
        if (!ignore) {
          setDashboard(dashboardData);
          setCandidates(candidateData);
          setApiOnline(true);
        }
      } catch {
        if (!ignore) {
          setApiOnline(false);
        }
      }
    }
    bootstrap();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <AmbientBackground />
      {!apiOnline && (
        <div className="api-banner">
          Demo mode active. Start the Python API to enable live resume analysis and MongoDB persistence.
        </div>
      )}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={<LoginPage onLogin={() => setAuthed(true)} />}
        />
        <Route
          path="/dashboard"
          element={
            <Protected authed={authed}>
              <DashboardPage dashboard={dashboard} />
            </Protected>
          }
        />
        <Route
          path="/upload"
          element={
            <Protected authed={authed}>
              <UploadPage
                onAnalyzed={(newCandidates, batchSummary) => {
                  const normalized = Array.isArray(newCandidates) ? newCandidates : [newCandidates];
                  setCandidates((current) => [
                    ...normalized.filter((candidate) => !current.some((item) => item.id === candidate.id)),
                    ...current,
                  ]);
                  setLastBatchSummary(batchSummary || null);
                }}
                apiOnline={apiOnline}
              />
            </Protected>
          }
        />
        <Route
          path="/candidates"
          element={
            <Protected authed={authed}>
              <CandidatesPage
                fallbackCandidates={candidates}
                apiOnline={apiOnline}
                lastBatchSummary={lastBatchSummary}
                onDeleteCandidate={(candidateId) =>
                  setCandidates((current) => current.filter((candidate) => candidate.id !== candidateId))
                }
                onDeleteAllCandidates={() => {
                  setCandidates([]);
                  setLastBatchSummary(null);
                }}
              />
            </Protected>
          }
        />
        <Route
          path="/candidates/:candidateId"
          element={
            <Protected authed={authed}>
              <CandidateDetailPage
                fallbackCandidates={candidates}
                apiOnline={apiOnline}
                onCandidateUpdated={(updatedCandidate) =>
                  setCandidates((current) =>
                    current.map((candidate) =>
                      candidate.id === updatedCandidate.id ? updatedCandidate : candidate
                    )
                  )
                }
                onDeleteCandidate={(candidateId) =>
                  setCandidates((current) => current.filter((candidate) => candidate.id !== candidateId))
                }
              />
            </Protected>
          }
        />
      </Routes>
    </div>
  );
}

function Protected({ authed, children }) {
  if (!authed) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AmbientBackground() {
  return (
    <div className="ambient-layer" aria-hidden="true">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />
      <div className="grid-mask" />
    </div>
  );
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");

  function handleSubmit(event) {
    event.preventDefault();
    onLogin();
    navigate("/dashboard");
  }

  return (
    <main className="screen login-screen reveal-in">
      <section className="hero-copy">
        <span className="eyebrow">Final Year Project</span>
        <h1>AI Resume Screening System</h1>
        <p>
          This project helps recruiters upload resumes, compare them with required skills,
          and view candidate scores in a simple dashboard.
        </p>
        <div className="hero-pills">
          <span>Resume Parsing</span>
          <span>Skill Matching</span>
          <span>Candidate Scoring</span>
        </div>
      </section>

      <section className="auth-card glass-card">
        <div className="auth-brand">
          <span className="logo-mark">TL</span>
          <div>
            <h2>{mode === "login" ? "AI Resume Screening" : "Create Recruiter Account"}</h2>
            <p>
              {mode === "login"
                ? "Welcome back. Sign in to continue hiring with confidence."
                : "Create your recruiter portal account to manage jobs, resumes, and candidate screening."}
            </p>
          </div>
        </div>
        <div className="auth-toggle">
          <button
            type="button"
            className={mode === "login" ? "toggle-chip active-chip" : "toggle-chip"}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "toggle-chip active-chip" : "toggle-chip"}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <label>
                Full Name
                <input type="text" placeholder="Enter recruiter name" required />
              </label>
              <label>
                Company Name
                <input type="text" placeholder="Enter company name" required />
              </label>
            </>
          )}
          <label>
            Email
            <input type="email" placeholder="talent@company.com" required />
          </label>
          <label>
            Password
            <input type="password" placeholder="Enter your password" required />
          </label>
          {mode === "signup" && (
            <label>
              Confirm Password
              <input type="password" placeholder="Confirm your password" required />
            </label>
          )}
          <button type="submit" className="primary-btn">
            {mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
        <div className="auth-links">
          <button type="button">
            {mode === "login" ? "Forgot Password?" : "Need help creating an account?"}
          </button>
          <span>
            {mode === "login" ? "Don&apos;t have an account?" : "Already have an account?"}{" "}
            <button type="button" className="inline-link" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Sign Up" : "Login"}
            </button>
          </span>
        </div>
      </section>
    </main>
  );
}

function DashboardPage({ dashboard }) {
  const navigate = useNavigate();
  const roleTotal = dashboard.top_roles.reduce((sum, item) => sum + item.value, 0);

  return (
    <PageFrame
      title="Recruitment Command Center"
      subtitle="View uploaded resumes, screening scores, and candidate details."
      actions={
        <>
          <button className="secondary-btn" onClick={() => navigate("/candidates")}>
            View Candidates
          </button>
          <button className="primary-btn" onClick={() => navigate("/upload")}>
            Upload Resume
          </button>
        </>
      }
    >
      <section className="metrics-grid">
        <MetricCard label="Total Resumes" value={dashboard.metrics.total_resumes} tone="blue" />
        <MetricCard label="Shortlisted" value={dashboard.metrics.shortlisted} tone="orange" />
        <MetricCard label="Rejected" value={dashboard.metrics.rejected} tone="red" />
        <MetricCard label="Avg Score" value={`${dashboard.metrics.average_score}%`} tone="green" />
      </section>

      <section className="chart-grid">
        <article className="panel glass-card">
          <div className="panel-head">
            <h3>Candidate Score Distribution</h3>
            <span>Live pipeline snapshot</span>
          </div>
          <div className="bars-chart">
            {dashboard.score_distribution.map((value, index) => (
              <div key={`${value}-${index}`} className="bar-col">
                <div
                  className="bar-fill"
                  style={{ height: `${dashboard.metrics.total_resumes ? Math.max(18, value * 18) : 12}%`, animationDelay: `${index * 80}ms` }}
                />
              </div>
            ))}
          </div>
        </article>

        <article className="panel glass-card">
          <div className="panel-head">
            <h3>Top Roles</h3>
            <span>Most aligned recommendation categories</span>
          </div>
          <div
            className="donut-chart"
            style={{
              background: `conic-gradient(
                #0d6efd 0 ${dashboard.top_roles[0] ? dashboard.top_roles[0].value / roleTotal * 360 : 0}deg,
                #7db7ff ${dashboard.top_roles[0] ? dashboard.top_roles[0].value / roleTotal * 360 : 0}deg ${dashboard.top_roles[1] ? (dashboard.top_roles[0].value + dashboard.top_roles[1].value) / roleTotal * 360 : 360}deg,
                #3f8cff ${dashboard.top_roles[1] ? (dashboard.top_roles[0].value + dashboard.top_roles[1].value) / roleTotal * 360 : 360}deg ${dashboard.top_roles[2] ? (dashboard.top_roles[0].value + dashboard.top_roles[1].value + dashboard.top_roles[2].value) / roleTotal * 360 : 360}deg,
                #dcebff ${dashboard.top_roles[2] ? (dashboard.top_roles[0].value + dashboard.top_roles[1].value + dashboard.top_roles[2].value) / roleTotal * 360 : 360}deg 360deg
              )`,
            }}
          >
            <div className="donut-hole">
              <span>{dashboard.metrics.total_resumes}</span>
              <small>Resumes</small>
            </div>
          </div>
          <div className="role-legend">
            {dashboard.top_roles.length ? dashboard.top_roles.map((role, index) => (
              <div key={role.role} className="legend-item">
                <span className={`legend-dot dot-${index + 1}`} />
                <span>{role.role}</span>
                <strong>{role.value}</strong>
              </div>
            )) : <div className="empty-note">No role insights yet. Upload a real resume to start screening.</div>}
          </div>
        </article>
      </section>
    </PageFrame>
  );
}

function UploadPage({ onAnalyzed, apiOnline }) {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [post, setPost] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [progress, setProgress] = useState([]);
  const [busy, setBusy] = useState(false);
  const [batchSummary, setBatchSummary] = useState(null);
  const [selectionNote, setSelectionNote] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  async function handleAnalyze() {
    if (!files.length || !post.trim() || !requiredSkills.trim()) return;

    setBusy(true);
    setUploadMessage("");
    setProgress([
      "Reading uploaded resumes",
      "Extracting skills from all resumes",
      "Matching all resumes with requirements",
      "Generating bulk scores and report",
    ]);

    try {
      let newCandidates;
      let summary;
      if (apiOnline) {
        if (files.length === 1) {
          const response = await uploadResume(files[0], post, requiredSkills);
          const candidate = response.candidate;
          newCandidates = response.duplicate ? [] : [candidate];
          summary = {
            uploaded_count: response.duplicate ? 0 : 1,
            average_score: candidate.score,
            shortlisted_count: candidate.fit === "Strong" ? 1 : 0,
            duplicate_count: response.duplicate ? 1 : 0,
            skipped_duplicates: response.duplicate ? [candidate.name] : [],
            post,
            required_skills: requiredSkills.split(",").map((item) => item.trim()).filter(Boolean),
          };
        } else {
          const response = await uploadResumes(files, post, requiredSkills);
          newCandidates = response.candidates;
          summary = response.summary;
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1400));
        const requiredSkillList = requiredSkills.split(",").map((item) => item.trim()).filter(Boolean);
        newCandidates = files.map((file, index) => ({
          id: `cand-${Date.now()}-${index}`,
          name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          initials: "AI",
          score: 84 - Math.min(index * 3, 24),
          fit: index < 3 ? "Strong" : index < 6 ? "Moderate" : "Weak",
          role: post,
          status: "Pending Review",
          required_skills: requiredSkillList,
          experience: "2+ Years",
          education: "B.Tech",
          location: "Remote",
          skills_match: requiredSkillList.slice(0, Math.min(4, requiredSkillList.length)),
          missing_skills: requiredSkillList.slice(4),
          summary:
            `AI-generated screening preview against the ${post} requirements.`,
        }));
        summary = {
          uploaded_count: newCandidates.length,
          average_score: Math.round(newCandidates.reduce((sum, item) => sum + item.score, 0) / newCandidates.length),
          shortlisted_count: newCandidates.filter((item) => item.fit === "Strong").length,
          duplicate_count: 0,
          skipped_duplicates: [],
          post,
          required_skills: requiredSkillList,
        };
      }

      setProgress((current) => [...current, "Batch analysis completed"]);
      setBatchSummary(summary);
      if (summary.uploaded_count > 0) {
        setUploadMessage(
          summary.uploaded_count === 1
            ? "Resume uploaded and analyzed successfully."
            : `${summary.uploaded_count} resumes uploaded and analyzed successfully.`
        );
      } else {
        setUploadMessage("No new resumes were uploaded because all selected files were duplicates.");
      }
      onAnalyzed(newCandidates, summary);
      navigate("/candidates");
    } finally {
      setBusy(false);
    }
  }

  function handleDownloadBatchReport() {
    if (!batchSummary) return;
    const report = [
      "Bulk Resume Screening Report",
      `Post: ${batchSummary.post}`,
      `Required Skills: ${batchSummary.required_skills.join(", ")}`,
      `Uploaded Resumes: ${batchSummary.uploaded_count}`,
      `Skipped Duplicates: ${batchSummary.duplicate_count || 0}`,
      `Average Score: ${batchSummary.average_score}`,
      `Strong Matches: ${batchSummary.shortlisted_count}`,
      `Duplicate File Names: ${(batchSummary.skipped_duplicates || []).join(", ") || "None"}`,
    ].join("\n");
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bulk_resume_report.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageFrame
      title="Upload And Analyze"
      subtitle="Enter the job post and required skills, then upload a resume for analysis."
    >
      <section className="upload-layout">
        <article className="glass-card upload-card">
          <label className="form-stack">
            <span>Post</span>
            <input
              type="text"
              value={post}
              onChange={(e) => setPost(e.target.value)}
              placeholder="Example: Data Analyst"
            />
          </label>

          <label className="form-stack">
            <span>Required Skills</span>
            <input
              type="text"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="Example: Python, SQL, Power BI, Excel"
            />
          </label>

          <div className="dropzone">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                const selected = Array.from(e.target.files || []);
                const unique = [];
                const seen = new Set();
                for (const file of selected) {
                  const key = `${file.name}-${file.size}-${file.lastModified}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(file);
                  }
                }
                setFiles(unique);
                setSelectionNote(selected.length !== unique.length ? "Duplicate files were removed from the selection." : "");
              }}
            />
            <div className="dropzone-copy">
              <span className="eyebrow">Resume intake</span>
              <h3>{files.length ? `${files.length} resume(s) selected` : "Choose one or more resume files"}</h3>
              <p>Supports PDF, DOCX, DOC, and TXT formats for bulk screening.</p>
              {selectionNote ? <small className="selection-note">{selectionNote}</small> : null}
            </div>
          </div>

          <button className="primary-btn full-width" disabled={!files.length || !post.trim() || !requiredSkills.trim() || busy} onClick={handleAnalyze}>
            {busy ? "Analyzing..." : "Upload & Analyze All"}
          </button>

          {uploadMessage ? <div className="success-message">{uploadMessage}</div> : null}

          {batchSummary && (
            <div className="batch-summary">
              <strong>Last Batch Summary</strong>
              <span>Uploaded: {batchSummary.uploaded_count}</span>
              <span>Skipped Duplicates: {batchSummary.duplicate_count || 0}</span>
              <span>Average Score: {batchSummary.average_score}</span>
              <span>Strong Matches: {batchSummary.shortlisted_count}</span>
              <button className="secondary-btn" onClick={handleDownloadBatchReport}>Download Batch Report</button>
            </div>
          )}

          <div className="pipeline-list">
            {(progress.length ? progress : ["Resume parsing", "Bulk skill extraction", "Requirement matching", "Batch scoring"]).map((step, index) => (
              <div className="pipeline-item" key={`${step}-${index}`}>
                <span className="pulse-dot" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card helper-card">
          <span className="eyebrow">How scoring works</span>
          <h3>Smart but explainable</h3>
          <p>
            The backend extracts skills, education, and experience cues, then compares them against
            role keywords to produce a fit score and role recommendation.
          </p>
          <ul className="info-list">
            <li>Skill relevance weighting</li>
            <li>Experience and education signals</li>
            <li>Missing skill detection</li>
            <li>MongoDB persistence for recruiter actions</li>
          </ul>
        </article>
      </section>
    </PageFrame>
  );
}

function CandidatesPage({ fallbackCandidates, apiOnline, lastBatchSummary, onDeleteCandidate, onDeleteAllCandidates }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ role: "", fit: "" });
  const [items, setItems] = useState(fallbackCandidates);
  const [deletingId, setDeletingId] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!apiOnline) {
        setItems(filterCandidates(fallbackCandidates, filters));
        return;
      }
      try {
        const data = await getCandidates(filters);
        if (!ignore) setItems(data);
      } catch {
        if (!ignore) setItems(filterCandidates(fallbackCandidates, filters));
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [filters, fallbackCandidates, apiOnline]);

  async function handleDelete(candidateId) {
    setDeletingId(candidateId);
    try {
      if (apiOnline) {
        await deleteCandidate(candidateId);
      }
      onDeleteCandidate(candidateId);
      setItems((current) => current.filter((candidate) => candidate.id !== candidateId));
    } finally {
      setDeletingId("");
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      if (apiOnline) {
        await deleteAllCandidates();
      }
      onDeleteAllCandidates();
      setItems([]);
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <PageFrame
      title="Candidate Pipeline"
      subtitle="View all screened candidates and open each profile for details."
      actions={
        items.length ? (
          <button className="danger-btn" disabled={deletingAll} onClick={handleDeleteAll}>
            {deletingAll ? "Deleting..." : "Delete All"}
          </button>
        ) : null
      }
    >
      <section className="glass-card table-card">
        {lastBatchSummary && (
          <div className="batch-summary inline-summary">
            <strong>Latest Bulk Analysis</strong>
            <span>Post: {lastBatchSummary.post}</span>
            <span>Uploaded: {lastBatchSummary.uploaded_count}</span>
            <span>Duplicates Skipped: {lastBatchSummary.duplicate_count || 0}</span>
            <span>Average Score: {lastBatchSummary.average_score}</span>
          </div>
        )}
        <div className="filter-row">
          <label>
            <span>Role</span>
            <select value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
              <option value="">All roles</option>
              <option value="Data Analyst">Data Analyst</option>
              <option value="Web Developer">Web Developer</option>
              <option value="ML Engineer">ML Engineer</option>
            </select>
          </label>
          <label>
            <span>Fit</span>
            <select value={filters.fit} onChange={(e) => setFilters((f) => ({ ...f, fit: e.target.value }))}>
              <option value="">All fits</option>
              <option value="Strong">Strong</option>
              <option value="Moderate">Moderate</option>
              <option value="Weak">Weak</option>
            </select>
          </label>
        </div>

        <div className="candidate-table">
          <div className="table-head">
            <span>Name</span>
            <span>Score</span>
            <span>Fit</span>
            <span>Recommended Role</span>
            <span>Actions</span>
          </div>
          {items.length ? items.map((candidate) => (
            <div className="table-row" key={candidate.id}>
              <div className="candidate-name">
                <span className="avatar-chip">{candidate.initials}</span>
                <div>
                  <strong>{candidate.name}</strong>
                  <small>{candidate.location}</small>
                </div>
              </div>
              <span>{candidate.score}</span>
              <span className={`fit-badge fit-${candidate.fit.toLowerCase()}`}>{candidate.fit}</span>
              <span>{candidate.role} {candidate.status ? `- ${candidate.status}` : ""}</span>
              <div className="row-actions">
                <button className="secondary-btn small-btn" onClick={() => navigate(`/candidates/${candidate.id}`)}>
                  View
                </button>
                <button
                  className="danger-btn small-btn"
                  disabled={deletingId === candidate.id}
                  onClick={() => handleDelete(candidate.id)}
                >
                  {deletingId === candidate.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )) : <div className="empty-note empty-table">No resumes uploaded yet. Use Upload Resume to add real candidates.</div>}
        </div>
      </section>
    </PageFrame>
  );
}

function CandidateDetailPage({ fallbackCandidates, apiOnline, onCandidateUpdated, onDeleteCandidate }) {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [candidate, setCandidate] = useState(
    fallbackCandidates.find((item) => item.id === candidateId) || null
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await getCandidate(candidateId);
        if (!ignore) setCandidate(data);
      } catch {
        if (!ignore) {
          const fallback = fallbackCandidates.find((item) => item.id === candidateId);
          if (fallback) setCandidate(fallback);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [candidateId, fallbackCandidates]);

  const scoreClass = useMemo(() => {
    if (!candidate) return "weak";
    if (candidate.score >= 75) return "strong";
    if (candidate.score >= 50) return "moderate";
    return "weak";
  }, [candidate]);

  async function handleStatusUpdate(nextStatus) {
    let updatedCandidate;
    if (apiOnline) {
      updatedCandidate = await updateCandidateStatus(candidate.id, nextStatus);
    } else {
      updatedCandidate = { ...candidate, status: nextStatus };
    }
    setCandidate(updatedCandidate);
    onCandidateUpdated(updatedCandidate);
  }

  function handleDownloadReport() {
    const report = [
      `Candidate Name: ${candidate.name}`,
      `Recommended Post: ${candidate.role}`,
      `Status: ${candidate.status || "Pending Review"}`,
      `Score: ${candidate.score}`,
      `Fit: ${candidate.fit}`,
      `Experience: ${candidate.experience}`,
      `Education: ${candidate.education}`,
      `Location: ${candidate.location}`,
      `Required Skills: ${(candidate.required_skills || []).join(", ") || "Not provided"}`,
      `Matched Skills: ${candidate.skills_match.join(", ")}`,
      `Missing Skills: ${candidate.missing_skills.join(", ") || "None"}`,
      `Summary: ${candidate.summary}`,
    ].join("\n");
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${candidate.name.replace(/\s+/g, "_")}_report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteResume() {
    if (!candidate) return;
    setDeleting(true);
    try {
      if (apiOnline) {
        await deleteCandidate(candidate.id);
      }
      onDeleteCandidate(candidate.id);
      navigate("/candidates", { state: { from: location.pathname } });
    } finally {
      setDeleting(false);
    }
  }

  if (!candidate) {
    return (
      <PageFrame
        title="Candidate Profile"
        subtitle="No resume profile is available yet."
        actions={
          <button className="secondary-btn" onClick={() => navigate("/candidates", { state: { from: location.pathname } })}>
            Back To List
          </button>
        }
      >
        <section className="glass-card empty-state-panel">
          <h3>No candidate found</h3>
          <p>Upload a real resume first, then open it from the candidates page.</p>
        </section>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="Candidate Profile"
      subtitle="View score, matching skills, and candidate status."
      actions={
        <button className="secondary-btn" onClick={() => navigate("/candidates", { state: { from: location.pathname } })}>
          Back To List
        </button>
      }
    >
      <section className="detail-layout">
        <article className="glass-card candidate-hero">
          <div className="profile-photo">{candidate.initials}</div>
          <div className="score-banner">
            <div>
              <small>Score</small>
              <strong>{candidate.score}</strong>
            </div>
            <div>
              <small>Fit</small>
              <strong>{candidate.fit}</strong>
            </div>
            <div>
              <small>Recommended Role</small>
              <strong>{candidate.role}</strong>
            </div>
            <div>
              <small>Status</small>
              <strong>{candidate.status || "Pending Review"}</strong>
            </div>
          </div>
          <div className="candidate-text">
            <h3>{candidate.name}</h3>
            <p>{candidate.summary}</p>
          </div>
        </article>

        <article className="glass-card details-panel">
          <div className="details-grid">
            <div>
              <span>Skill Match</span>
              <strong>{candidate.skills_match.join(", ")}</strong>
            </div>
            <div>
              <span>Experience</span>
              <strong>{candidate.experience}</strong>
            </div>
            <div>
              <span>Education</span>
              <strong>{candidate.education}</strong>
            </div>
            <div>
              <span>Missing Skill</span>
              <strong>{candidate.missing_skills.join(", ") || "None"}</strong>
            </div>
            <div>
              <span>Required Skills</span>
              <strong>{(candidate.required_skills || []).join(", ") || "Not provided"}</strong>
            </div>
          </div>

          <div className={`fit-meter meter-${scoreClass}`}>
            <div className="fit-meter-fill" style={{ width: `${candidate.score}%` }} />
          </div>

          <div className="action-row">
            <button className="primary-btn" onClick={() => handleStatusUpdate("Shortlisted")}>Shortlist</button>
            <button className="secondary-btn" onClick={() => handleStatusUpdate("Rejected")}>Reject</button>
            <button className="accent-btn" onClick={handleDownloadReport}>Download Report</button>
            <button className="danger-btn" disabled={deleting} onClick={handleDeleteResume}>
              {deleting ? "Deleting..." : "Delete Resume"}
            </button>
          </div>
        </article>
      </section>
    </PageFrame>
  );
}

function PageFrame({ title, subtitle, actions, children }) {
  const navigate = useNavigate();

  return (
    <main className="screen page-screen reveal-in">
      <aside className="sidebar glass-card">
        <div className="sidebar-brand">
          <span className="logo-mark">TL</span>
          <div>
            <strong>TalentLens AI</strong>
            <small>Resume screening project</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button onClick={() => navigate("/upload")}>Upload Resume</button>
          <button onClick={() => navigate("/candidates")}>Candidates</button>
        </nav>
      </aside>

      <section className="page-content">
        <header className="page-header">
          <div>
            <span className="eyebrow">AI Resume Screening</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <div className="header-actions">{actions}</div>
        </header>
        {children}
      </section>
    </main>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="metric-card glass-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="metric-glow" />
    </article>
  );
}

function filterCandidates(candidates, filters) {
  return candidates.filter((candidate) => {
    const roleMatch = !filters.role || candidate.role === filters.role;
    const fitMatch = !filters.fit || candidate.fit === filters.fit;
    return roleMatch && fitMatch;
  });
}

export default App;
