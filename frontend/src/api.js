const BASE = '/api'

const json = async (r) => {
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || `API error ${r.status}`)
  }
  return r.json()
}

export const uploadDocuments = (formData) =>
  fetch(`${BASE}/documents`, { method: 'POST', body: formData }).then(json)

export const createSession = (body) =>
  fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const generateQuestions = (body) =>
  fetch(`${BASE}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const submitAnswer = (body) =>
  fetch(`${BASE}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const getDocuments = () =>
  fetch(`${BASE}/documents`).then(json)

export const deleteDocuments = () =>
  fetch(`${BASE}/documents`, { method: 'DELETE' }).then((r) => r.ok)

export const getSessions = () =>
  fetch(`${BASE}/sessions`).then(json)

export const getHistory = (sessionId) =>
  fetch(`${BASE}/history?session_id=${sessionId}`).then(json)

export const submitFollowUp = (body) =>
  fetch(`${BASE}/follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const askInterviewer = (body) =>
  fetch(`${BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

// ── Stage A: session-based turn API ──────────────────────────────

export const startSession = (sessionId, body) =>
  fetch(`${BASE}/sessions/${sessionId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const submitTurn = (sessionId, body) =>
  fetch(`${BASE}/sessions/${sessionId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json)

export const finishSession = (sessionId) =>
  fetch(`${BASE}/sessions/${sessionId}/finish`, { method: 'POST' }).then(json)

export const getReport = (sessionId) =>
  fetch(`${BASE}/sessions/${sessionId}/report`).then(json)
