import axios from 'axios'

// Every error from the server is {"error": {"code", "message"}}; the app only ever sees ApiError.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const http = axios.create({ timeout: 0 })

let tokenGetter = () => null
let baseGetter = () => '/api'
let onUnauthorized = () => {}

export function configureClient({ getToken, getBase, unauthorized }) {
  tokenGetter = getToken
  baseGetter = getBase
  onUnauthorized = unauthorized
}

http.interceptors.request.use((config) => {
  config.baseURL = baseGetter()                       // the server can be changed in the app, so it is read for every call
  const token = tokenGetter()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function toApiError(err) {
  if (err instanceof ApiError) return err
  if (err.response) {
    const e = err.response.data && err.response.data.error
    return new ApiError(err.response.status, (e && e.code) || 'unexpected', (e && e.message) || 'Something went wrong. Please try again.')
  }
  if (err.code === 'ERR_CANCELED') return new ApiError(0, 'canceled', 'Canceled')
  return new ApiError(0, 'network', 'Cannot reach the server. Check your connection and the server address.')
}

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const apiErr = toApiError(err)
    if (apiErr.status === 401 && apiErr.code === 'unauthorized') onUnauthorized()
    return Promise.reject(apiErr)
  },
)

export const data = (promise) => promise.then((r) => r.data)
