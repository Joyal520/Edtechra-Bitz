// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: WRITING TYPES, AUTO-INSTRUCTIONS & WORD COUNTER
// ============================================================================

export const WRITING_TYPES = [
  'Creative Writing',
  'Descriptive Writing',
  'Narrative Writing',
  'Persuasive Writing',
  'Opinion Writing',
  'Informative Writing',
  'Expository Writing',
  'Letter Writing',
  'Essay Writing',
  'Story Writing',
  'Report Writing',
  'Article Writing',
  'Speech Writing',
  'Dialogue Writing',
  'Journal Writing',
  'Summary Writing',
  'Other'
] as const;

export type WritingType = (typeof WRITING_TYPES)[number] | string;

export const WORD_LENGTH_PRESETS = [20, 50, 100, 150, 200, 500] as const;

/**
 * Generates a clear, grade-appropriate writing instruction that explicitly
 * includes the teacher's selected Writing Type and Required Word Length.
 */
export function generateWritingInstruction(
  writingType: string,
  requiredWordLength: number,
  taskTitle?: string
): string {
  const validWordCount =
    Number.isInteger(requiredWordLength) && requiredWordLength > 0
      ? requiredWordLength
      : 50;

  const cleanTitle = (taskTitle || '').trim();
  const topicPhrase = cleanTitle ? ` on "${cleanTitle}"` : '';

  switch (writingType) {
    case 'Creative Writing':
      return `Write a creative piece${topicPhrase || ' about a surprising day at school'}. Use vivid imagination and expressive language. Write at least ${validWordCount} words.`;

    case 'Descriptive Writing':
      return `Write a descriptive paragraph${topicPhrase || ' about your favourite place'}. Use clear sensory details about what you can see, hear, smell, and feel. Write at least ${validWordCount} words.`;

    case 'Narrative Writing':
      return `Write a personal or fictional narrative${topicPhrase || ' about a memorable experience'}. Include a clear beginning, middle, and ending. Write at least ${validWordCount} words.`;

    case 'Persuasive Writing':
      return `Write a persuasive response${topicPhrase || ' convincing your readers to support an important idea'}. Present strong reasons and clear examples to support your viewpoint. Write at least ${validWordCount} words.`;

    case 'Opinion Writing':
      return `Write an opinion piece${topicPhrase || ' sharing your point of view on a topic you care about'}. State your opinion clearly and support it with convincing reasons. Write at least ${validWordCount} words.`;

    case 'Informative Writing':
      return `Write an informative piece${topicPhrase || ' explaining a topic clearly to your classmates'}. Include accurate facts, clear definitions, and helpful details. Write at least ${validWordCount} words.`;

    case 'Expository Writing':
      return `Write an expository response${topicPhrase || ' explaining how something works or why an event happens'}. Organize your ideas logically with clear supporting evidence. Write at least ${validWordCount} words.`;

    case 'Letter Writing':
      return `Write a well-structured letter${topicPhrase || ' to a friend, teacher, or community leader'}. Include an appropriate greeting, clear body paragraphs, and a polite closing. Write at least ${validWordCount} words.`;

    case 'Essay Writing':
      return `Write a structured essay${topicPhrase || ' exploring the assigned theme'}. Include an engaging introduction, well-developed body paragraphs, and a strong conclusion. Write at least ${validWordCount} words.`;

    case 'Story Writing':
      return `Write an original story${topicPhrase || ' with interesting characters, a clear setting, and an engaging plot'}. Show how the characters solve a problem or learn a lesson. Write at least ${validWordCount} words.`;

    case 'Report Writing':
      return `Write a clear and factual report${topicPhrase || ' summarizing your findings on the topic'}. Present key information in an organized and objective manner. Write at least ${validWordCount} words.`;

    case 'Article Writing':
      return `Write an engaging article${topicPhrase || ' for your school magazine or classroom newsletter'}. Capture the reader's attention and present ideas clearly. Write at least ${validWordCount} words.`;

    case 'Speech Writing':
      return `Write a compelling speech${topicPhrase || ' to deliver to your classmates'}. Address your audience directly, use persuasive language, and end with a memorable conclusion. Write at least ${validWordCount} words.`;

    case 'Dialogue Writing':
      return `Write a natural and expressive dialogue${topicPhrase || ' between two characters discussing an important moment'}. Use clear speaker labels or punctuation to show who is speaking. Write at least ${validWordCount} words.`;

    case 'Journal Writing':
      return `Write a thoughtful journal entry${topicPhrase || ' reflecting on your thoughts, feelings, and lessons learned'}. Be honest, descriptive, and expressive. Write at least ${validWordCount} words.`;

    case 'Summary Writing':
      return `Write a concise summary${topicPhrase || ' capturing the main ideas and key supporting points in your own words'}. Focus on the most important takeaways. Write at least ${validWordCount} words.`;

    case 'Other':
    default:
      return `Complete your written response${topicPhrase} using clear, well-structured sentences and accurate grammar. Write at least ${validWordCount} words.`;
  }
}

/**
 * Updates an existing instruction string when the teacher changes the Required Word Length,
 * preserving manual edits if the teacher only tweaked the prompt text.
 */
export function updateInstructionWordCount(
  currentInstruction: string,
  newWordLength: number,
  writingType: string,
  taskTitle?: string
): string {
  const validWordCount =
    Number.isInteger(newWordLength) && newWordLength > 0 ? newWordLength : 50;

  if (!currentInstruction || !currentInstruction.trim()) {
    return generateWritingInstruction(writingType, validWordCount, taskTitle);
  }

  // Replace patterns like "Write at least 50 words" or "at least 100 words" or "50-word"
  const atLeastPattern = /(write\s+at\s+least\s+)\d+(\s+words)/i;
  if (atLeastPattern.test(currentInstruction)) {
    return currentInstruction.replace(atLeastPattern, `$1${validWordCount}$2`);
  }

  const genericWordsPattern = /(\bat\s+least\s+)\d+(\s+words\b)/i;
  if (genericWordsPattern.test(currentInstruction)) {
    return currentInstruction.replace(genericWordsPattern, `$1${validWordCount}$2`);
  }

  const hyphenWordPattern = /\b\d+(-word\b)/i;
  if (hyphenWordPattern.test(currentInstruction)) {
    return currentInstruction.replace(hyphenWordPattern, `${validWordCount}$1`);
  }

  // If no existing word count phrase is present, append it cleanly
  const trimmed = currentInstruction.trim();
  const endsWithPunctuation = /[.!?]$/.test(trimmed);
  return `${trimmed}${endsWithPunctuation ? '' : '.'} Write at least ${validWordCount} words.`;
}

/**
 * Accurate word tokenizer.
 * Handles:
 * - multiple spaces
 * - line breaks (\n, \r)
 * - punctuation attached to words ("Hello, my name is John." -> 5 words)
 * - standalone punctuation tokens (e.g. " - " or "..." -> not counted as words)
 * - leading/trailing spaces
 * - empty input
 */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0;

  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Split by whitespace (spaces, tabs, newlines)
  const rawTokens = trimmed.split(/\s+/);

  let count = 0;
  for (const token of rawTokens) {
    // Strip leading/trailing punctuation/symbols, check if token contains at least one letter or digit (Unicode-aware)
    const cleaned = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (cleaned.length > 0) {
      count += 1;
    }
  }

  return count;
}

/**
 * Validates whether a required word length value is a valid positive whole number.
 */
export function validateRequiredWordLength(value: string | number): {
  valid: boolean;
  numericValue: number;
  value: number | null;
  error?: string;
} {
  const str = String(value ?? '').trim();
  if (!str) {
    return { valid: false, numericValue: 0, value: null, error: 'Required word length is required.' };
  }

  // Must only contain digits (positive whole number)
  if (!/^\d+$/.test(str)) {
    return {
      valid: false,
      numericValue: 0,
      value: null,
      error: 'Please enter a positive whole number (e.g. 50, 100).'
    };
  }

  const num = parseInt(str, 10);
  if (isNaN(num) || num <= 0) {
    return {
      valid: false,
      numericValue: 0,
      value: null,
      error: 'Required word length must be greater than 0.'
    };
  }

  if (num > 10000) {
    return {
      valid: false,
      numericValue: num,
      value: null,
      error: 'Required word length cannot exceed 10,000 words.'
    };
  }

  return { valid: true, numericValue: num, value: num };
}
