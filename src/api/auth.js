import { http, data } from './client'

export const getConfig = () => data(http.get('/auth/config'))
export const register = (body) => data(http.post('/auth/register', body))
export const verifyEmail = (email, code) => data(http.post('/auth/verify-email', { email, code }))
export const resendCode = (email) => data(http.post('/auth/resend-verification', { email }))
export const login = (email, password) => data(http.post('/auth/login', { email, password }))
export const googleLogin = (idToken, acceptTerms) => data(http.post('/auth/google', { id_token: idToken, accept_terms: acceptTerms }))
export const me = () => data(http.get('/auth/me'))
export const deleteAccount = () => http.delete('/auth/me')
export const getUsage = () => data(http.get('/auth/usage'))
