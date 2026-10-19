// What to tell the person for an error from the server, and what to do about it.
// The server's own message is already plain English; the client only adds a next step where it helps.
const NEXT_STEP = {
  daily_limit: "You have reached today's limit. Try again tomorrow.",
  network: 'Cannot reach the server. Check your connection and try again.',
  busy: 'This lecture is still being processed. Wait until it has finished.',
}

export function friendly(err) {
  if (!err) return 'Something went wrong. Please try again.'
  return NEXT_STEP[err.code] || err.message || 'Something went wrong. Please try again.'
}

export const isCode = (err, ...codes) => !!err && codes.includes(err.code)
