import { apiRequest, fetchPaginatedCollection } from '../lib/api'

export function requestAuthToken(payload) {
  return apiRequest('/auth/token/', {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipAuthRefresh: true,
  })
}

export function registerUser(payload) {
  return apiRequest('/auth/register/', {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipAuthRefresh: true,
  })
}

export function lookupCompanyCnpj(payload) {
  return apiRequest('/companies/cnpj-lookup/', {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipAuthRefresh: true,
  })
}

export function getAuthenticatedProfile() {
  return apiRequest('/auth/profile/')
}

export function listCompanies() {
  return fetchPaginatedCollection('/companies/')
}

export function getCompany(id) {
  return apiRequest(`/companies/${id}`)
}

export function updateCompany(id, payload) {
  return apiRequest(`/companies/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function listResearchers() {
  return fetchPaginatedCollection('/researchers/')
}

function buildQueryString(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  return query.toString() ? `?${query.toString()}` : ''
}

export function searchResearchers(params = {}) {
  const suffix = buildQueryString(params)
  return apiRequest(`/search/researchers/${suffix}`)
}

export function searchResearch(params = {}) {
  const suffix = buildQueryString(params)
  return apiRequest(`/search/research/${suffix}`)
}

export function getResearcher(id) {
  return apiRequest(`/researchers/${id}`)
}

export function updateResearcher(id, payload) {
  return apiRequest(`/researchers/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function getResearcherResume(id) {
  return apiRequest(`/researchers/${id}/resume/`)
}

export function listResearchAreas() {
  return fetchPaginatedCollection('/research/area/')
}

export function listResearches() {
  return fetchPaginatedCollection('/research/')
}

export function getResearch(id) {
  return apiRequest(`/research/${id}`)
}

export function listMyResearchInterests() {
  return fetchPaginatedCollection('/research/my-interests/')
}

export function createResearch(payload) {
  return apiRequest('/research/', {
    method: 'POST',
    body: payload,
  })
}

export function updateResearch(id, payload) {
  return apiRequest(`/research/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function createResearchInterest(researchId, payload = {}) {
  return apiRequest(`/research/${researchId}/interest/`, {
    method: 'POST',
    body: payload,
  })
}

export function listResearchCandidates(researchId, params = {}) {
  const suffix = buildQueryString(params)
  return fetchPaginatedCollection(`/research/${researchId}/candidates/${suffix}`)
}

export function updateResearchCandidateStatus(researchId, candidateId, status) {
  return apiRequest(`/research/${researchId}/candidates/${candidateId}/`, {
    method: 'PATCH',
    body: { status },
  })
}

export function runResearchMatch(researchId) {
  return apiRequest(`/research/${researchId}/match/run/`, {
    method: 'POST',
    body: {},
  })
}

export function listUniversities() {
  return fetchPaginatedCollection('/universities/')
}

export function listPublicUniversities() {
  return fetchPaginatedCollection('/universities/', {
    skipAuth: true,
    skipAuthRefresh: true,
  })
}

export function getUniversity(id) {
  return apiRequest(`/universities/${id}`)
}

export function listResumes() {
  return fetchPaginatedCollection('/resumes/')
}

export function getResume(id) {
  return apiRequest(`/resumes/${id}`)
}

export function createResume(payload = {}) {
  return apiRequest('/resumes/', {
    method: 'POST',
    body: payload,
  })
}

export function updateResume(id, payload) {
  return apiRequest(`/resumes/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function listEducations() {
  return fetchPaginatedCollection('/educations/')
}

export function createEducation(payload) {
  return apiRequest('/educations/', {
    method: 'POST',
    body: payload,
  })
}

export function deleteEducation(id) {
  return apiRequest(`/educations/${id}`, {
    method: 'DELETE',
  })
}

export function listExperiences() {
  return fetchPaginatedCollection('/experiences/')
}

export function createExperience(payload) {
  return apiRequest('/experiences/', {
    method: 'POST',
    body: payload,
  })
}

export function deleteExperience(id) {
  return apiRequest(`/experiences/${id}`, {
    method: 'DELETE',
  })
}

export function listSkills() {
  return fetchPaginatedCollection('/skills/')
}

export function forgotPassword(payload) {
  return apiRequest('/auth/forgot-password/', {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipAuthRefresh: true,
  })
}

export function resetPassword(payload) {
  return apiRequest('/auth/reset-password/', {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipAuthRefresh: true,
  })
}
