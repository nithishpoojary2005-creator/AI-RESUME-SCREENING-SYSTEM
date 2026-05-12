export const fallbackDashboard = {
  metrics: {
    total_resumes: 0,
    shortlisted: 0,
    rejected: 0,
    average_score: 0,
  },
  score_distribution: [0, 0, 0, 0, 0, 0],
  top_roles: [],
  pipeline_steps: [
    "Parsing Resume",
    "Extracting Skills",
    "Scoring Candidate",
    "Recommending Role",
  ],
};

export const fallbackCandidates = [];
