const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return response.json();
}

export function getDashboard() {
  return request("/api/dashboard");
}

export function getCandidates(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return request(`/api/candidates${query ? `?${query}` : ""}`);
}

export function getCandidate(candidateId) {
  return request(`/api/candidates/${candidateId}`);
}

export function updateCandidateStatus(candidateId, status) {
  return request(`/api/candidates/${candidateId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
}

export function deleteCandidate(candidateId) {
  return request(`/api/candidates/${candidateId}`, {
    method: "DELETE",
  });
}

export function deleteAllCandidates() {
  return request("/api/candidates", {
    method: "DELETE",
  });
}

export async function uploadResume(file, post, requiredSkills) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("post", post);
  formData.append("required_skills", requiredSkills);
  return request("/api/resumes/analyze", {
    method: "POST",
    body: formData,
  });
}

export async function uploadResumes(files, post, requiredSkills) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("post", post);
  formData.append("required_skills", requiredSkills);
  return request("/api/resumes/analyze-batch", {
    method: "POST",
    body: formData,
  });
}
