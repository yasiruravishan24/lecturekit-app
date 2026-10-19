// The pipeline reports these stages, in this order. Anything else is shown as "Working".
export const STAGE_TEXT = {
  starting: 'Getting ready',
  queued: 'Waiting for its turn',
  prepare: 'Getting ready',
  transcribe: 'Turning speech into text',
  slides: 'Reading the slides',
  align: 'Matching slides to speech',
  filter: 'Removing off-topic parts',
  notes: 'Writing the notes',
  quiz: 'Writing the quiz',
  write: 'Saving',
  done: 'Done',
}

export const stageText = (stage) => STAGE_TEXT[stage] || 'Working'

// the four-step list of the processing screen, in the order the work really happens
export function stepList(hasSlides) {
  const steps = [
    { key: 'received', label: 'Recording received' },
    { key: 'speech', label: 'Speech to text' },
  ]
  if (hasSlides) steps.push({ key: 'slides', label: 'Slides read' })
  steps.push({ key: 'notes', label: 'Notes and quiz' })
  return steps
}

const STAGE_STEP = { starting: 'received', queued: 'received', prepare: 'received', transcribe: 'speech', slides: 'slides', align: 'slides', filter: 'notes', notes: 'notes', quiz: 'notes', write: 'notes' }

// index of the step being worked on (steps.length = all done). A stage this client does not know is placed by the percent.
export function currentStep(stage, state, hasSlides, percent = 0) {
  const steps = stepList(hasSlides)
  if (state === 'done') return steps.length
  const key = STAGE_STEP[stage] || (percent >= 40 ? 'notes' : 'speech')
  const index = steps.findIndex((s) => s.key === key)
  return index === -1 ? steps.findIndex((s) => s.key === 'notes') : index
}
