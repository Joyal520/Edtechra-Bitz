// ============================================================================
// EDTECHRA-BITZ: Poll Configuration & Prompt Templates
// ============================================================================

export const POLL_CONFIG = {
  ENABLED: true,
  // Interleaving pacing
  POLL_FEED_INTERVAL_MIN: 5,
  POLL_FEED_INTERVAL_MAX: 7,

  // Suggested prompt ideas for Admin
  SAMPLE_PROMPTS: [
    'Create a poll for Grade 8 students about their favourite way to learn science. Give four options.',
    'Create a poll asking teenagers which space exploration mission excites them most (Mars, Moon base, Europa ocean, James Webb telescope).',
    'Create an engaging poll about ethical questions in Artificial Intelligence for high school students.',
    'Create a poll about study habits and peak productivity times (early morning, afternoon, night owl, interval pomodoro).'
  ]
} as const;
