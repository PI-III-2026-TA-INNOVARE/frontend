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

export function getAuthenticatedProfile() {
  return apiRequest('/auth/profile/')
}

export function listCompanies() {
  return fetchPaginatedCollection('/companies/')
}

export function getCompany(id) {
  return apiRequest(`/companies/${id}`)
}

export function createCompany(payload) {
  return apiRequest('/companies/', {
    method: 'POST',
    body: payload,
  })
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

export function getResearcher(id) {
  return apiRequest(`/researchers/${id}`)
}

export function createResearcher(payload) {
  return apiRequest('/researchers/', {
    method: 'POST',
    body: payload,
  })
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

export function createResearch(payload) {
  return apiRequest('/research/', {
    method: 'POST',
    body: payload,
  })
}

export function listUniversities() {
  return fetchPaginatedCollection('/universities/')
}

export function getUniversity(id) {
  return apiRequest(`/universities/${id}`)
}

export function createUniversity(payload) {
  return apiRequest('/universities/', {
    method: 'POST',
    body: payload,
  })
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

export function createSkill(payload) {
  return apiRequest('/skills/', {
    method: 'POST',
    body: payload,
  })
}
