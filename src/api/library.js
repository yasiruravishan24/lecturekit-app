import { http, data } from './client'

export const listCourses = () => data(http.get('/courses'))
export const createCourse = (name) => data(http.post('/courses', { name }))
export const renameCourse = (id, name) => data(http.patch(`/courses/${id}`, { name }))
export const deleteCourse = (id) => http.delete(`/courses/${id}`)

export const listModules = (courseId) => data(http.get(`/courses/${courseId}/modules`))
export const createModule = (courseId, name) => data(http.post(`/courses/${courseId}/modules`, { name }))
export const renameModule = (id, name) => data(http.patch(`/modules/${id}`, { name }))
export const deleteModule = (id) => http.delete(`/modules/${id}`)

export const listSessions = (moduleId) => data(http.get(`/modules/${moduleId}/sessions`))
export const recentSessions = (limit = 5) => data(http.get('/sessions', { params: { limit } }))
export const createSession = (moduleId, title) => data(http.post(`/modules/${moduleId}/sessions`, { title }))
export const getSession = (id) => data(http.get(`/sessions/${id}`))
export const renameSession = (id, title) => data(http.patch(`/sessions/${id}`, { title }))
export const deleteSession = (id) => http.delete(`/sessions/${id}`)
