import { data, http } from './client'

export const listNotifications = () => data(http.get('/notifications'))
export const markRead = (id) => http.post(`/notifications/${id}/read`)
export const markAllRead = () => http.post('/notifications/read-all')
export const clearNotifications = () => http.delete('/notifications')
