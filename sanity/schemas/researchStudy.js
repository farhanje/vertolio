const QUESTION_TYPES = [
  { title: 'Likert 1–7', value: 'likert' },
  { title: 'Single choice', value: 'single' },
  { title: 'Multiple choice', value: 'multi' },
  { title: 'Text', value: 'text' },
  { title: 'Number', value: 'number' },
]

const HOTSPOT_ACTIONS = [
  { title: 'Next screen', value: 'next' },
  { title: 'Go to screen', value: 'goToScreen' },
  { title: 'Back', value: 'back' },
  { title: 'Complete task', value: 'completeTask' },
]

export default {
  name: 'research