import { http, data } from './client'

export const getQuiz = (sessionId) => data(http.get(`/sessions/${sessionId}/quiz`))
export const submitAttempt = (sessionId, answers) => data(http.post(`/sessions/${sessionId}/quiz/attempts`, { answers }))
export const listAttempts = (sessionId) => data(http.get(`/sessions/${sessionId}/quiz/attempts`))

// one entry per question, in order: the chosen option index, or null when skipped
export function buildAnswers(questions, chosen) {
  return questions.map((q) => (Number.isInteger(chosen[q.id]) ? chosen[q.id] : null))
}
