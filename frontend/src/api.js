const BASE = '/api'

function getClientId() {
  let id = localStorage.getItem('client_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('client_id', id)
  }
  return id
}

const apiFetch = (url, opts = {}) =>
  fetch(url, { ...opts, headers: { 'X-Client-Id': getClientId(), ...opts.headers } })

const json = async (r) => {
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || `API error ${r.status}`)
  }
  return r.json()
}

export const uploadDocuments = (formData) =>
  apiFetch(`${BASE}/documents`, { method: 'POST', body: formData }).then(json)

export const createSession = (body) =>
  apiFetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const generateQuestions = (body) =>
  apiFetch(`${BASE}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const submitAnswer = (body) =>
  apiFetch(`${BASE}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const getDocuments = () =>
  apiFetch(`${BASE}/documents`).then(json)

export const deleteDocuments = () =>
  apiFetch(`${BASE}/documents`, { method: 'DELETE' }).then((r) => r.ok)

export const getSessions = () =>
  apiFetch(`${BASE}/sessions`).then(json)

export const getHistory = (sessionId) =>
  apiFetch(`${BASE}/history?session_id=${sessionId}`).then(json)

export const submitFollowUp = (body) =>
  apiFetch(`${BASE}/follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const askInterviewer = (body) =>
  apiFetch(`${BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

// ── Stage A: session-based turn API ──────────────────────────────

export const startSession = (sessionId, body) =>
  apiFetch(`${BASE}/sessions/${sessionId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const submitTurn = (sessionId, body) =>
  apiFetch(`${BASE}/sessions/${sessionId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const finishSession = (sessionId) =>
  apiFetch(`${BASE}/sessions/${sessionId}/finish`, { method: 'POST' }).then(json)

export const getReport = (sessionId) =>
  apiFetch(`${BASE}/sessions/${sessionId}/report`).then(json)
