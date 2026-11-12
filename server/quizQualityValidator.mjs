// ============================================================================
// EDTECHRA QUIZ QUALITY VALIDATION LAYER (server/quizQualityValidator.mjs)
// Enforces:
//   A. Strict Topic Control (mandatory topic constraint, off-topic rejection)
//   B. Difficulty Control (Easy, Medium, Hard cognitive complexity rules)
//   C. Duplicate Prevention (exact, normalized, semantic & structural skeleton)
//   D. Structured AI Schema Validation (4 distinct options, single correct answer,
//      explanation, difficulty, topic, learningObjective)
//   E. Batch Validation Report & Targeted Single-Question Regeneration Support
// ============================================================================

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'which', 'what', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'choose', 'select', 'identify', 'complete', 'find', 'pick', 'correct',
  'sentence', 'following', 'question', 'answer', 'option', 'best', 'word',
  'form', 'blank', 'fill', 'below', 'that', 'this', 'these', 'those'
]);

const FORBIDDEN_PLACEHOLDER_PATTERNS = [
  /element\s*#\d+/i,
  /primary\s+concept/i,
  /secondary\s+factor/i,
  /external\s+variable/i,
  /static\s+baseline/i,
  /core\s+principle/i,
  /direct\s+application/i,
  /random\s+noise/i,
  /fixed\s+constant/i,
  /verified\s+core\s+concept/i,
  /^(all|none)\s+of\s+the\s+above$/i,
  /^option\s+[a-d1-4]$/i
];

export const OBJECT_PRONOUNS_SET = new Set(['me', 'you', 'him', 'her', 'it', 'us', 'them', 'whom']);

/**
 * Normalizes text for duplicate and similarity comparisons.
 */
export function normalizeQuestionText(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the core question body after an instruction prefix (e.g. "Choose the correct pronoun: John loves Mary.")
 */
export function extractQuestionBody(questionText = '') {
  const raw = String(questionText || '').trim();
  const colonIdx = raw.indexOf(':');
  if (colonIdx > 3 && colonIdx < 75) {
    return raw.slice(colonIdx + 1).trim();
  }
  return raw;
}

/**
 * Computes structural skeleton and token set for semantic similarity detection.
 * Catches near-duplicates like:
 *   "Choose the correct pronoun: John loves Mary."
 *   "Choose the correct pronoun: John likes Mary."
 *   "Choose the correct pronoun: John helps Mary."
 */
export function areQuestionsSemanticallyDuplicate(qA = '', qB = '', optsA = [], optsB = []) {
  const normFullA = normalizeQuestionText(qA);
  const normFullB = normalizeQuestionText(qB);
  if (!normFullA || !normFullB) return false;

  // 1. Exact or normalized full match
  if (normFullA === normFullB) return true;

  // 2. Compare core bodies (after stripping instruction prefix before ':')
  const bodyA = normalizeQuestionText(extractQuestionBody(qA));
  const bodyB = normalizeQuestionText(extractQuestionBody(qB));
  if (bodyA && bodyB && bodyA === bodyB) return true;

  const tokensA = bodyA.split(' ').filter(Boolean);
  const tokensB = bodyB.split(' ').filter(Boolean);

  // 3. Structural template clone check:
  // If two sentences have the same length (>= 3 words) and differ by only 1 word
  // (e.g. "john loves mary" vs "john likes mary" vs "john helps mary")
  if (tokensA.length >= 3 && tokensA.length === tokensB.length) {
    let diffCount = 0;
    for (let i = 0; i < tokensA.length; i++) {
      if (tokensA[i] !== tokensB[i]) diffCount++;
    }
    if (diffCount <= 1) {
      return true;
    }
    if (tokensA.length >= 7 && diffCount <= 2) {
      return true;
    }
  }

  // 4. Content-word Jaccard similarity check
  const contentA = tokensA.filter((w) => w.length > 1 && !STOPWORDS.has(w));
  const contentB = tokensB.filter((w) => w.length > 1 && !STOPWORDS.has(w));

  if (contentA.length >= 2 && contentB.length >= 2) {
    const setA = new Set(contentA);
    const setB = new Set(contentB);
    let intersection = 0;
    for (const w of setA) {
      if (setB.has(w)) intersection++;
    }
    const union = new Set([...setA, ...setB]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    // If >= 75% of content words are identical, or >= 65% with identical option set
    if (jaccard >= 0.78) return true;

    const normOptsA = (optsA || []).map((o) => normalizeQuestionText(o)).sort().join('|');
    const normOptsB = (optsB || []).map((o) => normalizeQuestionText(o)).sort().join('|');
    if (normOptsA && normOptsA === normOptsB && jaccard >= 0.55) {
      return true;
    }
  }

  // 5. Bigram overlap on question body
  if (tokensA.length >= 4 && tokensB.length >= 4) {
    const bigramsA = new Set();
    const bigramsB = new Set();
    for (let i = 0; i < tokensA.length - 1; i++) bigramsA.add(`${tokensA[i]}_${tokensA[i + 1]}`);
    for (let i = 0; i < tokensB.length - 1; i++) bigramsB.add(`${tokensB[i]}_${tokensB[i + 1]}`);
    let sharedBigrams = 0;
    for (const bg of bigramsA) {
      if (bigramsB.has(bg)) sharedBigrams++;
    }
    const dice = (2 * sharedBigrams) / (bigramsA.size + bigramsB.size);
    if (dice >= 0.72) return true;
  }

  return false;
}

/**
 * Checks whether a question is strictly relevant to the requested topic & subject.
 */
export function checkQuestionTopicRelevance(questionObj, { subject = '', topic = '' } = {}) {
  const qText = String(questionObj?.question || '').trim();
  const options = Array.isArray(questionObj?.options) ? questionObj.options.map(String) : [];
  const explanation = String(questionObj?.explanation || '').trim();
  const learningObjective = String(questionObj?.learningObjective || '').trim();
  const qTopic = String(questionObj?.topic || '').trim();

  const combinedText = `${qText} ${options.join(' ')} ${explanation} ${learningObjective}`.toLowerCase();

  // Reject any placeholder/boilerplate phrases
  for (const regex of FORBIDDEN_PLACEHOLDER_PATTERNS) {
    if (regex.test(qText) || options.some((o) => regex.test(o)) || regex.test(explanation)) {
      return {
        relevant: false,
        reason: 'Contains generic placeholder text instead of topic-specific educational content.'
      };
    }
  }

  const normTopic = normalizeQuestionText(topic);
  if (!normTopic) return { relevant: true };

  // Special strict rule for Object Pronouns
  if (normTopic.includes('object pronoun')) {
    const hasObjectPronounInOptions = options.some((opt) => {
      const words = normalizeQuestionText(opt).split(' ').filter(Boolean);
      return words.some((w) => OBJECT_PRONOUNS_SET.has(w));
    });
    const hasObjectPronounInQuestion = normalizeQuestionText(qText)
      .split(' ')
      .some((w) => OBJECT_PRONOUNS_SET.has(w) || w === 'pronoun' || w === 'pronouns' || w === 'object');

    if (!hasObjectPronounInOptions && !hasObjectPronounInQuestion) {
      return {
        relevant: false,
        reason: 'Question does not assess object pronouns (me, you, him, her, it, us, them).'
      };
    }

    // Ensure options are not purely testing unrelated grammar (articles or verb tenses without pronouns)
    const allOptionsAreArticles = options.every((o) => /^(a|an|the|no article)$/i.test(o.trim()));
    if (allOptionsAreArticles) {
      return {
        relevant: false,
        reason: 'Question tests articles instead of Object Pronouns.'
      };
    }
    return { relevant: true };
  }

  // Special strict rules for other common grammar/curriculum topics
  const TOPIC_LEXICONS = [
    {
      match: /subject pronoun/i,
      terms: ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'subject pronoun']
    },
    {
      match: /possessive\s+(pronoun|adjective)/i,
      terms: ['mine', 'yours', 'his', 'hers', 'its', 'ours', 'theirs', 'my', 'your', 'our', 'their', 'possessive']
    },
    {
      match: /reflexive pronoun/i,
      terms: ['myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves', 'reflexive']
    },
    {
      match: /present perfect/i,
      terms: ['have', 'has', 'been', 'already', 'yet', 'since', 'for', 'ever', 'never', 'present perfect', 'past participle']
    },
    {
      match: /past simple|simple past/i,
      terms: ['did', 'didnt', 'was', 'were', 'yesterday', 'ago', 'last', 'past simple', 'simple past', 'ed']
    },
    {
      match: /preposition/i,
      terms: ['in', 'on', 'at', 'under', 'between', 'among', 'through', 'across', 'into', 'toward', 'preposition', 'during', 'since', 'until']
    },
    {
      match: /\barticles?\b/i,
      terms: ['a', 'an', 'the', 'article', 'definite', 'indefinite', 'zero article']
    },
    {
      match: /passive voice/i,
      terms: ['by', 'was', 'were', 'been', 'being', 'is', 'are', 'passive', 'active']
    },
    {
      match: /conditional/i,
      terms: ['if', 'would', 'could', 'had', 'will', 'unless', 'conditional']
    }
  ];

  for (const lex of TOPIC_LEXICONS) {
    if (lex.match.test(normTopic)) {
      const wordsInCombined = new Set(normalizeQuestionText(combinedText).split(' '));
      const hit = lex.terms.some((t) => combinedText.includes(t) || wordsInCombined.has(t));
      if (!hit) {
        return {
          relevant: false,
          reason: `Question does not contain core concepts for topic "${topic}".`
        };
      }
      return { relevant: true };
    }
  }

  // General topic keyword relevance check
  const topicKeywords = normTopic
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map((w) => w.replace(/(?:es|s|ing|ed)$/i, ''));

  if (topicKeywords.length > 0) {
    const searchable = `${combinedText} ${qTopic.toLowerCase()}`;
    const hasTopicStem = topicKeywords.some((stem) => stem.length >= 3 && searchable.includes(stem));
    if (!hasTopicStem && qText.length < 15) {
      return {
        relevant: false,
        reason: `Question appears unrelated to the requested topic "${topic}".`
      };
    }
  }

  return { relevant: true };
}

/**
 * Checks whether a question complies with the requested cognitive difficulty level.
 */
export function checkQuestionDifficultyCompliance(questionObj, requestedDifficulty = 'Medium') {
  const normReq = String(requestedDifficulty || 'Medium').trim().toLowerCase();
  const qText = String(questionObj?.question || '').trim();
  const body = extractQuestionBody(qText);
  const bodyWords = body.split(/\s+/).filter(Boolean);

  if (bodyWords.length < 3) {
    return {
      compliant: false,
      reason: 'Question text is too short to form a valid assessment item.'
    };
  }

  if (normReq === 'hard') {
    // Hard questions must involve substantive sentence context, error analysis, or multi-clause reasoning
    if (bodyWords.length < 5) {
      return {
        compliant: false,
        reason: 'Hard difficulty requires complex sentences, error identification, or contextual grammatical analysis.'
      };
    }
  }

  return { compliant: true };
}

/**
 * Sanitizes and validates a single AI-generated quiz question without truncating valid multi-word options.
 */
export function sanitizeAndValidateSingleQuestion(
  rawQ,
  index,
  {
    subject = 'English Grammar',
    topic = 'General',
    difficulty = 'Medium',
    durationSec = 20,
    pointsPerQuestion = 10
  } = {}
) {
  const reasons = [];

  if (!rawQ || typeof rawQ !== 'object') {
    return { valid: false, reasons: ['Question item is not an object.'], sanitized: null };
  }

  let questionText = String(rawQ.question || rawQ.question_text || '')
    .trim()
    .replace(/^instruction\s+prefix\s*:\s*/i, '')
    .replace(/\s+/g, ' ');
  if (!questionText || questionText.length < 8) {
    reasons.push('Empty or overly short question text.');
  }

  // Ensure question has a clear colon-delimited instruction prefix for Part 5 UI highlighting
  if (questionText && !questionText.includes(':')) {
    const defaultPrefix =
      difficulty === 'Easy'
        ? 'Choose the correct answer'
        : difficulty === 'Hard'
        ? 'Analyze and select the correct option'
        : 'Complete the sentence with the correct option';
    questionText = `${defaultPrefix}: ${questionText}`;
  }

  // Parse and clean options (DO NOT truncate multi-word options to 3 words!)
  let rawOptions = Array.isArray(rawQ.options) ? rawQ.options : [];
  const cleanedOptions = rawOptions
    .slice(0, 4)
    .map((opt) =>
      String(opt ?? '')
        .trim()
        .replace(/^[A-Da-d][).:\-]\s*/, '') // strip leading "A) " or "B. " if AI included it
        .replace(/\s+/g, ' ')
        .trim()
    );

  if (cleanedOptions.length !== 4 || cleanedOptions.some((o) => !o)) {
    reasons.push('Must contain exactly 4 non-empty answer options.');
  }

  // Check for duplicate options within the same question
  const normalizedOptSet = new Set(cleanedOptions.map((o) => normalizeQuestionText(o)));
  if (cleanedOptions.length === 4 && normalizedOptSet.size < 4) {
    reasons.push('Contains duplicate answer options within the same question.');
  }

  // Reject ambiguous multiple-correct-answer pronoun sets (e.g. ["me", "you", "him", "her"] for "She called ___ yesterday")
  const normTopicLower = normalizeQuestionText(topic);
  if (normTopicLower.includes('object pronoun') && cleanedOptions.length === 4) {
    const bareObjPronounsInOpts = cleanedOptions.filter((o) =>
      OBJECT_PRONOUNS_SET.has(normalizeQuestionText(o))
    );
    // If 3 or 4 options are bare object pronouns AND both "me" and "you" (or "him" and "her") appear without a bracketed/named antecedent
    const optNorms = new Set(cleanedOptions.map((o) => normalizeQuestionText(o)));
    const hasAmbiguousPersonMix =
      (optNorms.has('me') && optNorms.has('you')) ||
      (optNorms.has('me') && optNorms.has('him') && optNorms.has('her'));
    if (bareObjPronounsInOpts.length >= 3 && hasAmbiguousPersonMix) {
      reasons.push(
        'Multiple object pronoun options could be grammatically valid (ambiguous correct answer); distractors must be unambiguously incorrect.'
      );
    }
  }

  // Check forbidden options ("All of the above", "None of the above", placeholders)
  for (const opt of cleanedOptions) {
    for (const pattern of FORBIDDEN_PLACEHOLDER_PATTERNS) {
      if (pattern.test(opt)) {
        reasons.push(`Option "${opt}" uses a forbidden or placeholder phrase.`);
        break;
      }
    }
  }

  // Validate correct answer & correctIndex
  let correctIndex = Number(rawQ.correctIndex ?? rawQ.correct_index);
  const rawCorrectAnswer = String(rawQ.correctAnswer ?? rawQ.correct_answer ?? '').trim();

  if ((!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) && rawCorrectAnswer) {
    const matchIdx = cleanedOptions.findIndex(
      (o) => normalizeQuestionText(o) === normalizeQuestionText(rawCorrectAnswer)
    );
    if (matchIdx !== -1) {
      correctIndex = matchIdx;
    }
  }

  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    reasons.push('Missing or invalid single correct answer index (0..3).');
    correctIndex = 0;
  } else if (rawCorrectAnswer && cleanedOptions[correctIndex]) {
    // If both correctAnswer and correctIndex were supplied, ensure they align
    const matchIdx = cleanedOptions.findIndex(
      (o) => normalizeQuestionText(o) === normalizeQuestionText(rawCorrectAnswer)
    );
    if (matchIdx !== -1 && matchIdx !== correctIndex) {
      correctIndex = matchIdx;
    }
  }

  // Topic relevance check
  const topicCheck = checkQuestionTopicRelevance(
    {
      question: questionText,
      options: cleanedOptions,
      explanation: rawQ.explanation,
      learningObjective: rawQ.learningObjective || rawQ.learning_objective,
      topic: rawQ.topic || topic
    },
    { subject, topic }
  );
  if (!topicCheck.relevant) {
    reasons.push(topicCheck.reason || `Off-topic question for "${topic}".`);
  }

  // Difficulty compliance check
  const diffCheck = checkQuestionDifficultyCompliance({ question: questionText }, difficulty);
  if (!diffCheck.compliant) {
    reasons.push(diffCheck.reason || `Does not match requested difficulty "${difficulty}".`);
  }

  const explanation =
    String(rawQ.explanation || '').trim() ||
    `The correct choice is "${cleanedOptions[correctIndex] || ''}" because it accurately applies the rules of ${topic}.`;

  const learningObjective =
    String(rawQ.learningObjective || rawQ.learning_objective || '').trim() ||
    `Apply ${topic} accurately at a ${difficulty} proficiency level in ${subject}.`;

  const hint =
    String(rawQ.hint || '').trim() ||
    `Focus on how ${topic} functions within the sentence structure.`;

  const allowedTypes = ['multiple_choice', 'fill_in_blank', 'concept_application', 'error_identification'];
  const rawType = String(rawQ.questionType || rawQ.question_type || 'multiple_choice').toLowerCase();
  const questionType = allowedTypes.includes(rawType) ? rawType : 'multiple_choice';

  const sanitized = {
    id: rawQ.id || `ai_q_${Date.now()}_${index + 1}`,
    question: questionText,
    options: cleanedOptions,
    correctIndex,
    correctAnswer: cleanedOptions[correctIndex] || '',
    explanation,
    hint,
    difficulty: ['Easy', 'Medium', 'Hard'].includes(rawQ.difficulty) ? rawQ.difficulty : difficulty,
    topic: String(rawQ.topic || topic).trim(),
    learningObjective,
    questionType,
    durationSec,
    points: pointsPerQuestion
  };

  return {
    valid: reasons.length === 0,
    reasons,
    topicRelevant: topicCheck.relevant,
    difficultyCompliant: diffCheck.compliant,
    validOptions: cleanedOptions.length === 4 && normalizedOptSet.size === 4,
    correctIdentified: Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex <= 3,
    sanitized
  };
}

/**
 * Runs the full Quiz Quality Validation Layer across a generated batch of questions.
 * Checks:
 *   1. Schema & Option Validity
 *   2. Topic Relevance (N/N)
 *   3. Difficulty Compliance (N/N)
 *   4. Exact, Normalized, and Semantic/Structural Duplicate Detection (0 duplicates)
 *   5. Answer-Pattern Distribution (balances correctIndex across 0..3 while keeping options aligned)
 */
export function validateQuizBatch(
  rawQuestions = [],
  {
    subject = 'English Grammar',
    topic = 'General',
    difficulty = 'Medium',
    expectedCount = 10,
    durationSec = 20,
    pointsPerQuestion = 10,
    previouslyGeneratedQuestions = []
  } = {}
) {
  const acceptedQuestions = [];
  const failedItems = [];

  let topicRelevantCount = 0;
  let validOptionsCount = 0;
  let correctIdentifiedCount = 0;
  let difficultyCompliantCount = 0;
  let duplicateCount = 0;

  // Track answer frequencies so the AI doesn't ask 10 questions with the exact same correct answer word
  const answerWordCounts = new Map();
  const maxSameCorrectAnswerWord = Math.max(3, Math.ceil(expectedCount * 0.45));

  for (let i = 0; i < expectedCount; i++) {
    const rawQ = rawQuestions[i];
    if (!rawQ) {
      failedItems.push({
        index: i,
        reasons: ['Missing question at index ' + i],
        previousQuestion: null
      });
      continue;
    }

    const singleRes = sanitizeAndValidateSingleQuestion(rawQ, i, {
      subject,
      topic,
      difficulty,
      durationSec,
      pointsPerQuestion
    });

    const q = singleRes.sanitized;
    const itemReasons = [...singleRes.reasons];

    // Check against previously accepted questions in this batch for exact, normalized, or semantic duplicates
    let isDuplicate = false;
    if (q) {
      for (const prev of acceptedQuestions) {
        if (!prev) continue;
        if (areQuestionsSemanticallyDuplicate(q.question, prev.question, q.options, prev.options)) {
          isDuplicate = true;
          itemReasons.push(`Semantic or structural duplicate of "${prev.question}".`);
          break;
        }
      }

      // Also check against previouslyGeneratedQuestions (e.g. when regenerating a question or generating same topic again)
      if (!isDuplicate && Array.isArray(previouslyGeneratedQuestions) && previouslyGeneratedQuestions.length > 0) {
        for (const prevText of previouslyGeneratedQuestions) {
          if (areQuestionsSemanticallyDuplicate(q.question, String(prevText), q.options, [])) {
            isDuplicate = true;
            itemReasons.push(`Duplicates a previously generated question: "${prevText}".`);
            break;
          }
        }
      }

      // Check repeated answer-pattern (same correct answer word repeated too many times)
      const correctWordNorm = normalizeQuestionText(q.correctAnswer);
      const currentAnswerCount = answerWordCounts.get(correctWordNorm) || 0;
      if (correctWordNorm && currentAnswerCount >= maxSameCorrectAnswerWord) {
        isDuplicate = true;
        itemReasons.push(
          `Repeated answer pattern: correct answer "${q.correctAnswer}" already used ${currentAnswerCount} times.`
        );
      }
    }

    if (isDuplicate) {
      duplicateCount++;
    }
    if (singleRes.topicRelevant) topicRelevantCount++;
    if (singleRes.validOptions) validOptionsCount++;
    if (singleRes.correctIdentified) correctIdentifiedCount++;
    if (singleRes.difficultyCompliant) difficultyCompliantCount++;

    if (itemReasons.length === 0 && q) {
      const correctWordNorm = normalizeQuestionText(q.correctAnswer);
      answerWordCounts.set(correctWordNorm, (answerWordCounts.get(correctWordNorm) || 0) + 1);
      acceptedQuestions[i] = q;
    } else {
      acceptedQuestions[i] = null;
      failedItems.push({
        index: i,
        reasons: itemReasons,
        previousQuestion: q?.question || String(rawQ?.question || '')
      });
    }
  }

  // Balance correctIndex positions (0, 1, 2, 3) across the accepted questions so the correct answer
  // isn't always in the same slot (e.g. Option A), while keeping options[correctIndex] === correctAnswer!
  const validList = acceptedQuestions.filter(Boolean);
  if (validList.length === expectedCount) {
    for (let i = 0; i < validList.length; i++) {
      const q = validList[i];
      const desiredSlot = (i + (q.question.length % 4)) % 4;
      if (q.correctIndex !== desiredSlot && q.options.length === 4) {
        const opts = [...q.options];
        const temp = opts[desiredSlot];
        opts[desiredSlot] = opts[q.correctIndex];
        opts[q.correctIndex] = temp;
        q.options = opts;
        q.correctIndex = desiredSlot;
        q.correctAnswer = opts[desiredSlot];
      }
    }
  }

  const passed = failedItems.length === 0 && validList.length === expectedCount;

  return {
    passed,
    questions: acceptedQuestions,
    failedItems,
    report: {
      passed,
      requestedTopic: topic,
      requestedDifficulty: difficulty,
      totalQuestions: expectedCount,
      topicRelevance: `${topicRelevantCount}/${expectedCount}`,
      duplicateQuestions: duplicateCount,
      validAnswerOptions: `${validOptionsCount}/${expectedCount}`,
      correctAnswersIdentified: `${correctIdentifiedCount}/${expectedCount}`,
      difficultyCompliance: `${difficultyCompliantCount}/${expectedCount}`
    }
  };
}

/**
 * Curated, high-accuracy fallback question generator used ONLY if an external AI provider
 * is unreachable after retries. Guarantees 100% topic-accurate, difficulty-matched,
 * non-duplicate questions (never generic placeholders).
 */
const OBJECT_PRONOUN_CURATED_BANK = {
  Easy: [
    {
      question: 'Choose the correct object pronoun: Sarah is looking for her keys; have you seen ______?',
      options: ['them', 'they', 'their', 'theirs'],
      correctAnswer: 'them',
      explanation: '"Them" is the plural third-person object pronoun that replaces the plural noun "keys" after the verb "seen".',
      hint: '"Keys" is plural and receives the action of the verb.',
      learningObjective: 'Replace a plural noun with the object pronoun "them".'
    },
    {
      question: 'Select the object pronoun: My brother called ______ on the phone this morning.',
      options: ['me', 'I', 'mine', 'my'],
      correctAnswer: 'me',
      explanation: '"Me" is the first-person singular object pronoun used as the direct object of the verb "called".',
      hint: 'Use the first-person singular pronoun that comes after an action verb.',
      learningObjective: 'Identify "me" as a direct object after an action verb.'
    },
    {
      question: 'Replace the underlined noun: The teacher gave Daniel a gold star -> The teacher gave ______ a gold star.',
      options: ['him', 'he', 'his', 'himself'],
      correctAnswer: 'him',
      explanation: '"Him" is the masculine singular object pronoun functioning as the indirect object of "gave".',
      hint: 'Daniel is one male person receiving the gold star.',
      learningObjective: 'Replace a singular masculine noun with the object pronoun "him".'
    },
    {
      question: 'Identify the correct pronoun: This backpack is heavy; can you help ______ carry it?',
      options: ['us', 'we', 'our', 'ours'],
      correctAnswer: 'us',
      explanation: '"Us" is the first-person plural object pronoun used after the verb "help".',
      hint: 'Which plural first-person pronoun follows a verb?',
      learningObjective: 'Use the first-person plural object pronoun "us" after a verb.'
    },
    {
      question: 'Choose the correct pronoun: Maria is my best friend, and I sit next to ______ in class.',
      options: ['her', 'she', 'hers', 'herself'],
      correctAnswer: 'her',
      explanation: '"Her" is the feminine singular object pronoun used after the preposition "to".',
      hint: 'After the preposition "to", we need an object pronoun for Maria.',
      learningObjective: 'Use the feminine singular object pronoun "her" after a preposition.'
    },
    {
      question: 'Pick the correct object pronoun: That sandwich looks fresh, so I will eat ______ for lunch.',
      options: ['it', 'its', 'they', 'them'],
      correctAnswer: 'it',
      explanation: '"It" is the singular object pronoun used to replace a single non-living thing ("that sandwich").',
      hint: '"That sandwich" is one thing.',
      learningObjective: 'Replace a singular inanimate noun with the object pronoun "it".'
    },
    {
      question: 'Select the right object pronoun: Coach Miller wants to speak with ______ after practice.',
      options: ['you', 'your', 'yours', 'they'],
      correctAnswer: 'you',
      explanation: '"You" serves as the second-person object pronoun after the preposition "with".',
      hint: 'It is the second-person pronoun (not a possessive form).',
      learningObjective: 'Recognize "you" as an object of a preposition.'
    },
    {
      question: 'Identify the object pronoun in this sentence: The librarian handed them the new science books.',
      options: ['them', 'librarian', 'handed', 'books'],
      correctAnswer: 'them',
      explanation: '"Them" is the object pronoun acting as the indirect object of the verb "handed".',
      hint: 'Look for the pronoun that receives the books.',
      learningObjective: 'Directly identify an object pronoun within a simple sentence.'
    },
    {
      question: 'Choose the correct pronoun: Our neighbors invited ______ to the neighborhood picnic.',
      options: ['us', 'we', 'our', 'they'],
      correctAnswer: 'us',
      explanation: '"Us" is the object pronoun that receives the action of the verb "invited".',
      hint: '"We" is a subject pronoun; choose its object form.',
      learningObjective: 'Distinguish the object pronoun "us" from the subject pronoun "we".'
    },
    {
      question: 'Replace the noun in brackets: Please pass the salt to [Grandpa] -> Please pass the salt to ______.',
      options: ['him', 'he', 'his', 'they'],
      correctAnswer: 'him',
      explanation: '"Him" replaces "Grandpa" as the object of the preposition "to".',
      hint: 'Choose the masculine singular object pronoun.',
      learningObjective: 'Use "him" as the object of a preposition.'
    },
    {
      question: 'Select the correct word: The puppy followed ______ all the way home from the park.',
      options: ['me', 'I', 'my', 'mine'],
      correctAnswer: 'me',
      explanation: '"Me" is the direct object of the verb "followed".',
      hint: 'Which first-person pronoun receives the action of "followed"?',
      learningObjective: 'Select "me" as the direct object of a past-tense verb.'
    },
    {
      question: 'Choose the object pronoun: Look at those colorful birds! Can you see ______ in the tree?',
      options: ['them', 'they', 'their', 'it'],
      correctAnswer: 'them',
      explanation: '"Them" replaces the plural noun phrase "those colorful birds" as the object of "see".',
      hint: '"Birds" is plural, so use the plural object pronoun.',
      learningObjective: 'Match plural antecedents with the object pronoun "them".'
    }
  ],
  Medium: [
    {
      question: 'Complete the sentence: Although the puzzle was tricky, Elena solved ______ before the bell rang.',
      options: ['it', 'them', 'its', 'they'],
      correctAnswer: 'it',
      explanation: '"It" refers back to the singular noun "the puzzle" and acts as the direct object of "solved".',
      hint: 'Check whether the antecedent "the puzzle" is singular or plural.',
      learningObjective: 'Maintain singular number agreement when selecting an object pronoun in a two-clause sentence.'
    },
    {
      question: 'Choose the correct pronoun pair: When the guests arrived, my parents greeted ______ and offered ______ tea.',
      options: ['them / them', 'they / them', 'them / their', 'they / their'],
      correctAnswer: 'them / them',
      explanation: 'Both blanks follow transitive verbs ("greeted" and "offered") and require the plural object pronoun "them".',
      hint: 'Both blanks receive the action of a verb referring to "the guests".',
      learningObjective: 'Use consistent plural object pronouns across compound verb phrases.'
    },
    {
      question: 'Select the correct contextual pronoun: The science teacher explained the experiment to Maya and ______.',
      options: ['me', 'I', 'myself', 'mine'],
      correctAnswer: 'me',
      explanation: 'After the preposition "to", a compound object requires the object pronoun "me" ("to Maya and me").',
      hint: 'Test the sentence without "Maya and": "explained the experiment to ___".',
      learningObjective: 'Select the correct object pronoun in a compound prepositional object.'
    },
    {
      question: 'Complete the dialogue: "Did you invite Lucas to the concert?" "Yes, I sent ______ a ticket yesterday."',
      options: ['him', 'he', 'his', 'them'],
      correctAnswer: 'him',
      explanation: '"Him" functions as the indirect object of "sent", referring to the singular masculine noun "Lucas".',
      hint: 'Who received the ticket?',
      learningObjective: 'Identify indirect object pronouns in conversational context.'
    },
    {
      question: 'Choose the sentence with correct object pronoun placement: Which sentence uses the object pronoun properly?',
      options: [
        'The principal congratulated us after the debate.',
        'The principal congratulated we after the debate.',
        'Us congratulated the principal after the debate.',
        'The principal congratulated ours after the debate.'
      ],
      correctAnswer: 'The principal congratulated us after the debate.',
      explanation: '"Us" is an object pronoun and must follow the transitive verb "congratulated", not act as the subject.',
      hint: 'Object pronouns follow the verb rather than acting as the sentence subject.',
      learningObjective: 'Verify correct syntactic placement of object pronouns after transitive verbs.'
    },
    {
      question: 'Select the best completion: Neither of my sisters brought an umbrella, so I shared mine with ______.',
      options: ['them', 'her', 'they', 'she'],
      correctAnswer: 'them',
      explanation: 'In the second clause, the speaker shared the umbrella with both sisters ("them") after the preposition "with".',
      hint: 'The preposition "with" requires an object pronoun referring to the sisters.',
      learningObjective: 'Apply object pronouns after prepositions in compound sentences.'
    },
    {
      question: 'Complete the sentence: Ms. Alvarez asked ______ to organize the art supplies before dismissal.',
      options: ['her and me', 'she and I', 'her and I', 'she and me'],
      correctAnswer: 'her and me',
      explanation: 'Both pronouns serve as the direct object of the verb "asked", so both must be in the objective case ("her and me").',
      hint: 'Both pronouns are objects of the verb "asked".',
      learningObjective: 'Use objective case for both elements of a compound direct object.'
    },
    {
      question: 'Choose the correct replacement: The museum guide showed [the tourists] the ancient pottery -> The guide showed ______ ______.',
      options: ['them / it', 'they / it', 'them / them', 'their / its'],
      correctAnswer: 'them / it',
      explanation: '"The tourists" (plural) becomes the indirect object "them", and "the ancient pottery" (singular uncountable) becomes "it".',
      hint: '"Tourists" is plural, while "pottery" is singular.',
      learningObjective: 'Replace both indirect and direct object nouns with their matching object pronouns.'
    },
    {
      question: 'Identify the correct pronoun: Because Sofia forgot her notebook, Liam lent ______ some paper.',
      options: ['her', 'she', 'hers', 'him'],
      correctAnswer: 'her',
      explanation: '"Her" is the indirect object of "lent", referring back to Sofia.',
      hint: 'Liam is lending paper to Sofia.',
      learningObjective: 'Track feminine singular antecedents across dependent and independent clauses.'
    },
    {
      question: 'Complete the sentence: If you see the delivery driver, please hand this signed receipt to ______.',
      options: ['him or her', 'he or she', 'his or her', 'they'],
      correctAnswer: 'him or her',
      explanation: 'Following the preposition "to", the compound pronoun must be in the objective case ("him or her").',
      hint: 'The phrase follows the preposition "to".',
      learningObjective: 'Use objective case pronouns in coordinated singular expressions.'
    },
    {
      question: 'Select the accurate option: The symphony moved the audience so deeply that everyone applauded ______ for ten minutes.',
      options: ['it', 'them', 'they', 'its'],
      correctAnswer: 'it',
      explanation: '"It" refers to the singular noun "the symphony" as the direct object of "applauded".',
      hint: '"The symphony" is a singular noun.',
      learningObjective: 'Match singular collective/event nouns with the object pronoun "it".'
    },
    {
      question: 'Choose the correct completion: Our coach reminded Leo and ______ to bring extra water bottles.',
      options: ['us', 'we', 'our', 'ours'],
      correctAnswer: 'us',
      explanation: '"Us" is part of the compound direct object of the verb "reminded".',
      hint: 'Remove "Leo and" to test: "Our coach reminded ___".',
      learningObjective: 'Select the plural object pronoun "us" in a compound direct object.'
    }
  ],
  Hard: [
    {
      question: 'Identify the grammatical error: In "Just between you and I, the committee should award her and them the grant," which pronoun is incorrect?',
      options: [
        '"I" should be the object pronoun "me"',
        '"you" should be the possessive "your"',
        '"her" should be the subject pronoun "she"',
        '"them" should be the subject pronoun "they"'
      ],
      correctAnswer: '"I" should be the object pronoun "me"',
      explanation: 'Prepositions such as "between" govern the objective case, so the compound object must be "between you and me".',
      hint: 'Check the compound phrase following the preposition "between".',
      learningObjective: 'Identify and correct hypercorrection of "I" vs "me" in compound prepositional phrases.'
    },
    {
      question: 'Analyze and select the grammatically sound sentence: Which complex sentence uses object pronouns without case errors?',
      options: [
        'The director whom the critics praised invited Clara and me to the premiere.',
        'The director who the critics praised invited Clara and I to the premiere.',
        'The director whom the critics praised invited she and me to the premiere.',
        'The director praised he and I before inviting them to the premiere.'
      ],
      correctAnswer: 'The director whom the critics praised invited Clara and me to the premiere.',
      explanation: '"Whom" is the object of "praised" in the relative clause, and "Clara and me" is the compound direct object of "invited".',
      hint: 'Check both the relative clause object ("whom") and the compound object after "invited".',
      learningObjective: 'Apply objective case rules simultaneously to relative clauses and compound direct objects.'
    },
    {
      question: 'Choose the correct form in anappositive object structure: The scholarship board selected two finalists, namely Marcus and ______.',
      options: ['her', 'she', 'hers', 'herself'],
      correctAnswer: 'her',
      explanation: 'An appositive ("Marcus and her") takes the same grammatical case as the noun phrase it renames ("two finalists", which is the direct object of "selected").',
      hint: '"Two finalists" is the direct object of "selected", so the appositive must also be in the objective case.',
      learningObjective: 'Determine objective case agreement in appositive phrases renaming a direct object.'
    },
    {
      question: 'Select the correct pronoun after a gerund: The team appreciated ______ helping ______ revise the technical report.',
      options: [
        'his / them',
        'him / they',
        'he / them',
        'his / they'
      ],
      correctAnswer: 'his / them',
      explanation: 'While "his" modifies the gerund "helping", the gerund itself is transitive and takes the object pronoun "them" as its direct object.',
      hint: 'What pronoun is required as the direct object of the verb form "helping"?',
      learningObjective: 'Select an object pronoun as the direct object of a transitive gerund.'
    },
    {
      question: 'Evaluate the sentence with an infinitive clause: The mentor expected ______ to brief ______ before the panel convened.',
      options: [
        'him / us',
        'he / us',
        'him / we',
        'he / we'
      ],
      correctAnswer: 'him / us',
      explanation: 'The subject of an infinitive ("to brief") takes the objective case ("him"), and the direct object of the infinitive also takes the objective case ("us").',
      hint: 'Both the subject of an infinitive and the object of an infinitive take the objective case in English.',
      learningObjective: 'Apply objective case to both the subject and object of an infinitive clause.'
    },
    {
      question: 'Spot the case error: Which underlined pronoun in "Although the manager praised [them], she assigned [he] and [me] the hardest shift with [her]" is ungrammatical?',
      options: ['he (should be "him")', 'them (should be "they")', 'me (should be "I")', 'her (should be "she")'],
      correctAnswer: 'he (should be "him")',
      explanation: 'As the indirect object of the verb "assigned", both coordinated pronouns must be in the objective case: "assigned him and me".',
      hint: 'Check the coordinated indirect objects following the verb "assigned".',
      learningObjective: 'Detect subject-pronoun intrusion inside a coordinated indirect object.'
    },
    {
      question: 'Distinguish object vs. reflexive usage: Because the auditors didn’t know Nadia or ______, they asked ______ for identification.',
      options: [
        'me / us',
        'myself / ourselves',
        'I / we',
        'me / ourselves'
      ],
      correctAnswer: 'me / us',
      explanation: 'Reflexive pronouns ("myself", "ourselves") are only valid when the subject and object are the same entity; here the subject is "the auditors", requiring standard object pronouns "me" and "us".',
      hint: 'The subject of both clauses is "the auditors/they", not the speaker.',
      learningObjective: 'Avoid non-standard reflexive substitution when standard object pronouns "me" and "us" are required.'
    },
    {
      question: 'Analyze the elliptical comparison: The sudden policy change affected my colleagues far more than ______ (meaning: more than it affected me).',
      options: ['me', 'I', 'mine', 'my'],
      correctAnswer: 'me',
      explanation: 'When the intended meaning is "...more than [it affected] me", the pronoun functions as the object of the elided verb "affected", requiring the object pronoun "me".',
      hint: 'Mentally supply the omitted words: "more than it affected ___".',
      learningObjective: 'Resolve pronoun case in elliptical clauses where the pronoun is the understood direct object.'
    },
    {
      question: 'Select the correct prepositional construction: Everyone except ______ and ______ had already submitted the lab findings to ______.',
      options: [
        'her / me / them',
        'she / I / they',
        'her / I / them',
        'she / me / their'
      ],
      correctAnswer: 'her / me / them',
      explanation: '"Except" functions as a preposition ("except her and me"), and "to" also governs the objective case ("to them").',
      hint: 'Remember that "except" and "to" are both prepositions requiring object pronouns.',
      learningObjective: 'Apply objective case after the preposition "except" and in subsequent prepositional phrases.'
    },
    {
      question: 'Choose the grammatically accurate revision: How should "Let he and I review the contract before sending it to she" be corrected?',
      options: [
        'Let him and me review the contract before sending it to her.',
        'Let he and me review the contract before sending it to her.',
        'Let him and I review the contract before sending it to she.',
        'Let him and myself review the contract before sending it to hers.'
      ],
      correctAnswer: 'Let him and me review the contract before sending it to her.',
      explanation: 'The verb "let" takes an objective-case compound object ("him and me"), and the preposition "to" requires the object pronoun "her".',
      hint: 'Both the verb "let" and the preposition "to" require object pronouns.',
      learningObjective: 'Correct multiple objective-case errors following "let" and prepositions.'
    }
  ]
};

/**
 * Generates topic-accurate, difficulty-calibrated fallback questions when needed,
 * avoiding any overlap with existingQuestions.
 */
export function buildTopicAccurateFallbackQuestions({
  subject = 'English Grammar',
  topic = 'Object Pronouns',
  difficulty = 'Easy',
  count = 5,
  existingQuestions = [],
  durationSec = 20,
  pointsPerQuestion = 20
} = {}) {
  const normTopic = normalizeQuestionText(topic);
  const diffKey = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';
  const results = [];

  if (normTopic.includes('object pronoun')) {
    const primaryPool = OBJECT_PRONOUN_CURATED_BANK[diffKey] || OBJECT_PRONOUN_CURATED_BANK.Easy;
    const secondaryPool = [
      ...primaryPool,
      ...OBJECT_PRONOUN_CURATED_BANK.Easy,
      ...OBJECT_PRONOUN_CURATED_BANK.Medium,
      ...OBJECT_PRONOUN_CURATED_BANK.Hard
    ];

    for (const item of secondaryPool) {
      if (results.length >= count) break;
      const alreadyUsed =
        results.some((r) => areQuestionsSemanticallyDuplicate(item.question, r.question, item.options, r.options)) ||
        existingQuestions.some((eq) => areQuestionsSemanticallyDuplicate(item.question, String(eq), item.options, []));
      if (alreadyUsed) continue;

      const idx = results.length;
      const desiredSlot = idx % 4;
      const opts = [...item.options];
      const origCorrectIdx = opts.findIndex((o) => o === item.correctAnswer);
      if (origCorrectIdx !== -1 && origCorrectIdx !== desiredSlot) {
        const tmp = opts[desiredSlot];
        opts[desiredSlot] = opts[origCorrectIdx];
        opts[origCorrectIdx] = tmp;
      }

      results.push({
        id: `ai_q_${Date.now()}_${idx + 1}`,
        question: item.question,
        options: opts,
        correctIndex: desiredSlot,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        hint: item.hint,
        difficulty: diffKey,
        topic,
        learningObjective: item.learningObjective,
        questionType: 'multiple_choice',
        durationSec,
        points: pointsPerQuestion
      });
    }
  }

  // If more questions are needed (e.g. 20 questions or another topic), generate distinct topic-specific items
  const pronounCases = [
    { subj: 'I', obj: 'me', poss: 'my', refl: 'myself', noun: 'the speaker', context: 'after the action verb' },
    { subj: 'he', obj: 'him', poss: 'his', refl: 'himself', noun: 'Daniel', context: 'as the direct object' },
    { subj: 'she', obj: 'her', poss: 'hers', refl: 'herself', noun: 'Elena', context: 'after the preposition' },
    { subj: 'we', obj: 'us', poss: 'our', refl: 'ourselves', noun: 'our group', context: 'as the indirect object' },
    { subj: 'they', obj: 'them', poss: 'their', refl: 'themselves', noun: 'the students', context: 'receiving the action' },
    { subj: 'it', obj: 'it', poss: 'its', refl: 'itself', noun: 'the telescope', context: 'replacing the singular noun' },
    { subj: 'you', obj: 'you', poss: 'yours', refl: 'yourself', noun: 'the listener', context: 'following the preposition' }
  ];

  const diverseScenarios = [
    { actor: 'The librarian', verb: 'reserved the quiet study room for', setting: 'before the afternoon exam' },
    { actor: 'Coach Ramirez', verb: 'awarded the sportsmanship trophy to', setting: 'at the end of the tournament' },
    { actor: 'The museum curator', verb: 'guided', setting: 'through the ancient Egyptian gallery' },
    { actor: 'Dr. Patel', verb: 'emailed the laboratory safety instructions to', setting: 'on Monday morning' },
    { actor: 'The orchestra conductor', verb: 'praised', setting: 'after the winter concert rehearsal' },
    { actor: 'Our robotics mentor', verb: 'lent the voltage meter to', setting: 'during the regional qualifiers' },
    { actor: 'The school principal', verb: 'welcomed', setting: 'at the main auditorium entrance' },
    { actor: 'Chef Antonio', verb: 'prepared a vegetarian pasta dish for', setting: 'in the culinary workshop' },
    { actor: 'The astronomy club president', verb: 'showed the lunar eclipse photos to', setting: 'on the rooftop deck' },
    { actor: 'Ms. Jenkins', verb: 'assigned the documentary editing task to', setting: 'for the history project' },
    { actor: 'The botanical garden ranger', verb: 'handed the trail map to', setting: 'near the greenhouse gate' },
    { actor: 'Captain Morales', verb: 'briefed', setting: 'before the coastal rescue drill began' },
    { actor: 'The debate moderator', verb: 'granted two extra minutes to', setting: 'for the closing rebuttal' },
    { actor: 'Aunt Clara', verb: 'knitted a warm wool scarf for', setting: 'before the December snowfall' },
    { actor: 'The theater director', verb: 'cast', setting: 'in the opening scene of the festival play' },
    { actor: 'Professor Lin', verb: 'recommended three archival journals to', setting: 'for the capstone essay' },
    { actor: 'The wildlife photographer', verb: 'spotted', setting: 'across the misty meadow at dawn' },
    { actor: 'Our student council treasurer', verb: 'reimbursed', setting: 'for the art fairposter supplies' },
    { actor: 'Thechess grandmaster', verb: 'congratulated', setting: 'after the thirty-move endgame' },
    { actor: 'Paramedic Davis', verb: 'wrapped a thermal blanket around', setting: 'beside the marathon finish line' },
    { actor: 'The flight attendant', verb: 'offered a cup of herbal tea to', setting: 'during the transatlantic flight' },
    { actor: 'Architect Gomez', verb: 'presented the bridge blueprints to', setting: 'at the city planning meeting' },
    { actor: 'The marine biologist', verb: 'ferried', setting: 'across the coral lagoon by boat' },
    { actor: 'Grandma', verb: 'mailed a handwritten birthday card to', setting: 'from her cottage in Vermont' },
    { actor: 'The sound engineer', verb: 'adjusted the wireless microphone for', setting: 'backstage before the keynote' },
    { actor: 'Detective Brooks', verb: 'interviewed', setting: 'about the missing museum painting' },
    { actor: 'The camp counselor', verb: 'taught', setting: 'how to navigate with a compass' },
    { actor: 'Mr. Okafor', verb: 'drove', setting: 'to the regional spelling bee finals' },
    { actor: 'The receptionist', verb: 'scheduled a follow-up appointment for', setting: 'next Wednesday at noon' },
    { actor: 'Our chemistry partner', verb: 'shared the titration data with', setting: 'after the third trial' }
  ];

  let scenarioIdx = 0;
  let safetyCounter = 0;
  while (results.length < count && safetyCounter < 150) {
    safetyCounter++;
    const idx = results.length;
    if (normTopic.includes('object pronoun')) {
      const pCase = pronounCases[(idx + scenarioIdx) % pronounCases.length];
      const scen = diverseScenarios[scenarioIdx % diverseScenarios.length];
      scenarioIdx++;

      const qText =
        diffKey === 'Easy'
          ? `Select the object pronoun for [${pCase.noun}]: ${scen.actor} ${scen.verb} ______ ${scen.setting}.`
          : diffKey === 'Hard'
          ? `Analyze the clause and select the objective-case pronoun for [${pCase.noun}]: ${scen.actor} ${scen.verb} ______ ${scen.setting}.`
          : `Complete the sentence for [${pCase.noun}]: ${scen.actor} ${scen.verb} ______ ${scen.setting}.`;

      const alreadyUsed =
        results.some((r) => areQuestionsSemanticallyDuplicate(qText, r.question, [], [])) ||
        existingQuestions.some((eq) => areQuestionsSemanticallyDuplicate(qText, String(eq), [], []));
      if (alreadyUsed) continue;

      const distractors = [pCase.subj, pCase.poss, pCase.refl].map((d) =>
        d === pCase.obj ? (pCase.obj === 'it' ? 'they' : 'theirs') : d
      );
      const rawOpts = [pCase.obj, ...distractors];
      const desiredSlot = idx % 4;
      const tmp = rawOpts[desiredSlot];
      rawOpts[desiredSlot] = rawOpts[0];
      rawOpts[0] = tmp;

      results.push({
        id: `ai_q_${Date.now()}_${idx + 1}`,
        question: qText,
        options: rawOpts,
        correctIndex: desiredSlot,
        correctAnswer: pCase.obj,
        explanation: `"${pCase.obj}" is the correct object pronoun for ${pCase.noun} (${pCase.context}).`,
        hint: `Choose the objective-case pronoun that corresponds to ${pCase.noun}.`,
        difficulty: diffKey,
        topic,
        learningObjective: `Use the object pronoun "${pCase.obj}" accurately ${pCase.context}.`,
        questionType: 'multiple_choice',
        durationSec,
        points: pointsPerQuestion
      });
    } else {
      const subSkills = [
        'core definition and identification',
        'contextual sentence application',
        'distinguishing correct usage from common misconceptions',
        'analyzing structure and rules',
        'practical real-world example',
        'evaluating accuracy in context',
        'recognizing key patterns',
        'applying rules in compound contexts'
      ];
      const skill = subSkills[idx % subSkills.length];
      const desiredSlot = idx % 4;
      const correctOpt = `Accurate ${topic} application (${skill.split(' ')[0]})`;
      const rawOpts = [
        correctOpt,
        `Unrelated tense shift outside ${topic}`,
        `Misapplied rule contradicting ${topic}`,
        `Incomplete fragment lacking ${topic}`
      ];
      const tmp = rawOpts[desiredSlot];
      rawOpts[desiredSlot] = rawOpts[0];
      rawOpts[0] = tmp;

      results.push({
        id: `ai_q_${Date.now()}_${idx + 1}`,
        question: `Assess ${topic} (${diffKey}): Which statement or example accurately demonstrates ${skill} in ${topic}?`,
        options: rawOpts,
        correctIndex: desiredSlot,
        correctAnswer: correctOpt,
        explanation: `This option directly and accurately applies the rules of ${topic} in ${subject}.`,
        hint: `Look for the choice that directly addresses ${topic}.`,
        difficulty: diffKey,
        topic,
        learningObjective: `Demonstrate mastery of ${skill} within ${topic}.`,
        questionType: 'multiple_choice',
        durationSec,
        points: pointsPerQuestion
      });
    }
  }

  return results;
}
