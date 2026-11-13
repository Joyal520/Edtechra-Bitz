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

// PART 14.2: Prohibited technical grammar terminology in student-facing content
const FORBIDDEN_GRAMMAR_JARGON_PATTERNS = [
  /\btransitive\s+verb\b/i,
  /\bintransitive\s+verb\b/i,
  /\bantecedents?\b/i,
  /\bnoun\s+phrases?\b/i,
  /\bpossessive\s+adjectives?\b/i,
  /\bpossessive\s+determiners?\b/i,
  /\breflexive\s+pronouns?\b/i,
  /\bgrammatical\s+(?:function|role|analysis|usage)\b/i,
  /\bsentence\s+structure\s+analysis\b/i,
  /\berror\s+identification\b/i,
  /\belliptical\s+comparisons?\b/i,
  /\bappositives?\b/i,
  /\bsubject\s+case\b/i,
  /\bobject\s+case\b/i
];

// PART 14.4: Prohibited internal generation labels in student-facing questions
const FORBIDDEN_CATEGORY_LABEL_REGEX =
  /^\s*(?:sentence\s+replacement|context\s+selection|error\s+identification|short\s+dialogue|correct\s+sentence|practical\s+application|contextual\s+usage|pronoun\s+identification)\s*:/i;

export const OBJECT_PRONOUNS_SET = new Set(['me', 'you', 'him', 'her', 'it', 'us', 'them', 'whom']);
export const SUBJECT_PRONOUNS_SET = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
export const SUBJECT_ONLY_PRONOUNS_SET = new Set(['i', 'he', 'she', 'we', 'they']);
export const OBJECT_ONLY_PRONOUNS_SET = new Set(['me', 'him', 'us', 'them', 'whom']);
export const POSSESSIVE_ADJECTIVES_SET = new Set(['my', 'your', 'his', 'her', 'its', 'our', 'their']);
export const POSSESSIVE_PRONOUNS_SET = new Set(['mine', 'yours', 'his', 'hers', 'its', 'ours', 'theirs']);
export const REFLEXIVE_PRONOUNS_SET = new Set([
  'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves'
]);

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
 * Checks whether a question complies with the requested cognitive difficulty level and
 * Part 14 beginner-friendly brevity/clarity limits.
 */
export function checkQuestionDifficultyCompliance(questionObj, requestedDifficulty = 'Medium', durationSec = 20) {
  const normReq = String(requestedDifficulty || 'Medium').trim().toLowerCase();
  const qText = String(questionObj?.question || '').trim();
  const body = extractQuestionBody(qText);
  const fullWords = qText.split(/\s+/).filter(Boolean);
  const bodyWords = body.split(/\s+/).filter(Boolean);

  if (bodyWords.length < 3) {
    return {
      compliant: false,
      reason: 'Question text is too short to form a valid assessment item.'
    };
  }

  // PART 14.3: Enforce concise, fast-readable questions (especially for 20s live quiz timers)
  const timerCapOffset = Number(durationSec) <= 20 ? 0 : 3;
  const maxWordsByDiff =
    normReq === 'easy'
      ? 16 + timerCapOffset
      : normReq === 'hard'
      ? 25 + timerCapOffset
      : 20 + timerCapOffset;

  if (fullWords.length > maxWordsByDiff) {
    return {
      compliant: false,
      reason: `Question is too long (${fullWords.length} words) for ${requestedDifficulty} level; keep wording short, natural, and under ${maxWordsByDiff} words.`
    };
  }

  const hasLongSentenceOptions =
    Array.isArray(questionObj?.options) &&
    questionObj.options.some((o) => String(o || '').trim().split(/\s+/).length >= 4);

  if (normReq === 'hard' && bodyWords.length < 5 && !hasLongSentenceOptions) {
    return {
      compliant: false,
      reason: 'Hard difficulty requires meaningful context sentences while still using simple everyday English.'
    };
  }

  return { compliant: true };
}

/**
 * PART 14.2 / 14.4 / 14.5: Validates beginner-friendly wording (no jargon, no category labels, no repeated instructions).
 */
export function checkBeginnerFriendlyLanguage({ questionText = '', options = [], explanation = '', hint = '' }) {
  if (FORBIDDEN_CATEGORY_LABEL_REGEX.test(questionText)) {
    return {
      valid: false,
      reason: 'Question starts with an internal category label (such as "Sentence replacement:" or "Context selection:"); use a simple direct instruction.'
    };
  }

  // PART 14.5: Avoid repeated instructions / stacked colons
  const colonCount = (questionText.match(/:/g) || []).length;
  if (colonCount > 1) {
    return {
      valid: false,
      reason: 'Question contains multiple colons / repeated instructions; use at most one simple instruction.'
    };
  }

  // Check all student-facing text for forbidden technical grammar jargon
  const fieldsToScan = [questionText, explanation, hint, ...options];
  for (const field of fieldsToScan) {
    const text = String(field || '');
    for (const pat of FORBIDDEN_GRAMMAR_JARGON_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        return {
          valid: false,
          reason: `Contains technical grammar term "${match[0]}". Use simple everyday English suitable for beginners.`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * PART 12.B: Enforces strict concept boundaries (e.g., Subject vs Object vs Possessive vs Reflexive pronouns)
 * so related concepts do not leak into the wrong topic quiz.
 */
export function checkConceptBoundary({ questionText = '', correctAnswer = '', questionFormat = '' }, topic = '') {
  const normTopic = normalizeQuestionText(topic);
  const normAns = normalizeQuestionText(correctAnswer);
  const ansWords = normAns.split(' ').filter(Boolean);
  const singleAns = ansWords.length === 1 ? ansWords[0] : '';

  if (normTopic.includes('object pronoun')) {
    if (singleAns) {
      if (SUBJECT_ONLY_PRONOUNS_SET.has(singleAns)) {
        return {
          valid: false,
          reason: `Concept leakage: "${correctAnswer}" is a subject pronoun, not an object pronoun.`
        };
      }
      if (POSSESSIVE_PRONOUNS_SET.has(singleAns) && singleAns !== 'his' && singleAns !== 'its') {
        return {
          valid: false,
          reason: `Concept leakage: "${correctAnswer}" is a possessive pronoun, not an object pronoun.`
        };
      }
      if (['my', 'your', 'our', 'their'].includes(singleAns)) {
        return {
          valid: false,
          reason: `Concept leakage: "${correctAnswer}" is a possessive adjective, not an object pronoun.`
        };
      }
      if (REFLEXIVE_PRONOUNS_SET.has(singleAns)) {
        return {
          valid: false,
          reason: `Concept leakage: "${correctAnswer}" is a reflexive pronoun, not an object pronoun.`
        };
      }
    }

    // Reject blanks in subject position (start of sentence/clause OR after conjunction like ", and ___ would ...")
    const body = extractQuestionBody(questionText);
    if (
      questionFormat !== 'error_identification' &&
      questionFormat !== 'correct_sentence'
    ) {
      const subjectPosMatch = body.match(
        /(?:^|[.!?]\s+|(?:,|;|\band\b|\bbut\b|\bso\b|\bbecause\b|\bthat\b|\bwhen\b|\bif\b)\s+)(?:_+|\[\s*_+\s*\])\s+([a-z]+)/i
      );
      const nextWord = subjectPosMatch?.[1]?.toLowerCase() || '';
      if (nextWord && !['and', 'or', 'to', 'for', 'at', 'in', 'on', 'with', 'about', 'from', 'after', 'before', 'yesterday', 'today', 'now', 'here', 'there', 'home'].includes(nextWord)) {
        return {
          valid: false,
          reason: 'Blank appears in subject position, which tests Subject Pronouns instead of Object Pronouns.'
        };
      }

      // Reject possessive slots where ___ directly modifies a noun (e.g. "shared ___ observations", "lost ___ keys")
      // after a non-ditransitive verb (unless preceded by a ditransitive verb like give/send/lend/show/tell/hand/pass/buy/bring/offer/teach/ask)
      const possessiveSlotMatch = body.match(
        /\b([a-z]+)\s+(?:_+|\[\s*_+\s*\])\s+([a-z]{3,})\b/i
      );
      if (possessiveSlotMatch) {
        const prevVerb = possessiveSlotMatch[1].toLowerCase();
        const followingWord = possessiveSlotMatch[2].toLowerCase();
        const ditransitive = new Set([
          'give', 'gives', 'gave', 'giving',
          'send', 'sends', 'sent',
          'lend', 'lends', 'lent',
          'show', 'shows', 'showed',
          'tell', 'tells', 'told',
          'hand', 'hands', 'handed',
          'pass', 'passes', 'passed',
          'buy', 'buys', 'bought',
          'bring', 'brings', 'brought',
          'offer', 'offers', 'offered',
          'teach', 'teaches', 'taught',
          'ask', 'asks', 'asked',
          'write', 'wrote', 'read', 'make', 'made', 'find', 'found', 'call', 'called', 'name', 'named'
        ]);
        const nonNounModifiers = new Set([
          'the', 'this', 'that', 'these', 'those', 'about', 'after', 'before', 'because', 'during',
          'every', 'for', 'from', 'here', 'home', 'into', 'last', 'more', 'near', 'next', 'now',
          'out', 'over', 'some', 'soon', 'than', 'then', 'there', 'today', 'together', 'tomorrow',
          'tonight', 'under', 'until', 'very', 'well', 'when', 'while', 'with', 'yesterday', 'too', 'right', 'all', 'away', 'back', 'down', 'off', 'up'
        ]);
        const isPrepBeforeBlank = ['to', 'for', 'with', 'at', 'from', 'about', 'by', 'of', 'near', 'beside', 'behind'].includes(prevVerb);
        if (!isPrepBeforeBlank && !ditransitive.has(prevVerb) && !nonNounModifiers.has(followingWord) && /s$/.test(followingWord)) {
          return {
            valid: false,
            reason: `Blank before plural noun "${followingWord}" likely requires a possessive word (like their/his/her) rather than an object pronoun.`
          };
        }
      }
    }
  } else if (normTopic.includes('subject pronoun')) {
    if (singleAns) {
      if (OBJECT_ONLY_PRONOUNS_SET.has(singleAns)) {
        return {
          valid: false,
          reason: `Concept leakage: "${correctAnswer}" is an object pronoun, not a subject pronoun.`
        };
      }
      if (REFLEXIVE_PRONOUNS_SET.has(singleAns) || POSSESSIVE_PRONOUNS_SET.has(singleAns)) {
        return {
          valid: false,
          reason: `Concept leakage: "${correctAnswer}" is not a subject pronoun.`
        };
      }
    }
  } else if (normTopic.includes('possessive pronoun')) {
    if (singleAns && (['my', 'your', 'our', 'their'].includes(singleAns) || OBJECT_ONLY_PRONOUNS_SET.has(singleAns))) {
      return {
        valid: false,
        reason: `Concept leakage: "${correctAnswer}" is not a possessive pronoun.`
      };
    }
  } else if (normTopic.includes('possessive adjective')) {
    if (singleAns && (['mine', 'yours', 'hers', 'ours', 'theirs'].includes(singleAns) || OBJECT_ONLY_PRONOUNS_SET.has(singleAns))) {
      return {
        valid: false,
        reason: `Concept leakage: "${correctAnswer}" is a possessive pronoun, not a possessive adjective.`
      };
    }
  } else if (normTopic.includes('reflexive pronoun')) {
    if (singleAns && !REFLEXIVE_PRONOUNS_SET.has(singleAns) && (SUBJECT_PRONOUNS_SET.has(singleAns) || OBJECT_PRONOUNS_SET.has(singleAns))) {
      return {
        valid: false,
        reason: `Concept leakage: "${correctAnswer}" is not a reflexive pronoun.`
      };
    }
  }

  return { valid: true };
}

/**
 * PART 12.F: Validates explanation accuracy and prevents hallucinated antecedents or contradictory rules.
 */
export function validateExplanationAccuracy({ questionText = '', correctAnswer = '', explanation = '' }) {
  const exp = String(explanation || '').trim();
  if (!exp || exp.length < 15) {
    return {
      valid: false,
      reason: 'Explanation is missing or too brief to explain the grammatical/subject rule.'
    };
  }
  if (/^(this is (the )?correct( answer)?|option [a-d] is correct)\.?$/i.test(exp)) {
    return {
      valid: false,
      reason: 'Explanation is generic boilerplate instead of explaining the actual rule.'
    };
  }

  // Check for hallucinated antecedents: if explanation says "replaces <Name>" or "refers to <Name>",
  // verify <Name> appears in the question text.
  const refMatches = [...exp.matchAll(/\b(?:replaces|refers to|antecedent(?:\s+is)?)\s+["']?([A-Z][a-z]{2,})["']?/g)];
  for (const m of refMatches) {
    const mentionedName = m[1];
    if (
      mentionedName &&
      !['The', 'This', 'That', 'Object', 'Subject', 'Pronoun', 'Noun', 'Plural', 'Singular', 'English'].includes(mentionedName) &&
      !questionText.includes(mentionedName)
    ) {
      return {
        valid: false,
        reason: `Explanation invents antecedent "${mentionedName}" not present in the question.`
      };
    }
  }

  // Check if explanation explicitly claims a different single-word pronoun is the correct answer
  const ansNorm = normalizeQuestionText(correctAnswer);
  const explicitClaim = exp.match(/\b(?:correct (?:answer|pronoun|option|word) is)\s+["']?([a-zA-Z]+)["']?/i);
  if (explicitClaim && explicitClaim[1]) {
    const claimedNorm = normalizeQuestionText(explicitClaim[1]);
    if (ansNorm && claimedNorm && claimedNorm !== ansNorm && ansNorm.split(' ').length === 1) {
      return {
        valid: false,
        reason: `Explanation states "${explicitClaim[1]}" is correct, contradicting answer "${correctAnswer}".`
      };
    }
  }

  // Check if explanation makes an inverted claim like "'me' is a subject pronoun" or "'they' is an object pronoun"
  const nonsenseObjAsSubj = exp.match(/["']?(me|him|us|them|whom)["']?\s+is\s+(?:a|an)?\s*subject\s+pronoun/i);
  if (nonsenseObjAsSubj) {
    return {
      valid: false,
      reason: `Explanation incorrectly describes object pronoun "${nonsenseObjAsSubj[1]}" as a subject pronoun.`
    };
  }
  const nonsenseSubjAsObj = exp.match(/["']?(i|he|she|we|they)["']?\s+is\s+(?:a|an)?\s*object\s+pronoun/i);
  if (nonsenseSubjAsObj) {
    return {
      valid: false,
      reason: `Explanation incorrectly describes subject pronoun "${nonsenseSubjAsObj[1]}" as an object pronoun.`
    };
  }

  return { valid: true };
}

/**
 * Extracts a structural pattern signature (instruction prefix + length bucket) to detect repetitive templates.
 */
export function getQuestionPatternSignature(questionText = '') {
  const raw = String(questionText || '').trim();
  const colonIdx = raw.indexOf(':');
  const prefix = colonIdx > 0 && colonIdx < 60 ? normalizeQuestionText(raw.slice(0, colonIdx)) : 'noprefix';
  const body = extractQuestionBody(raw);
  const words = normalizeQuestionText(body).split(' ').filter(Boolean);
  const opening = words.slice(0, 3).join('_') || 'empty';
  const hasBlank = /_{2,}|\[blank\]/i.test(raw) ? 'blank' : 'choice';
  const lenBucket = Math.ceil(words.length / 4);
  return `${prefix}::${hasBlank}::${opening}::b${lenBucket}`;
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

  // Reject ambiguous multiple-correct-answer pronoun sets (e.g. ["her", "him", "them", "us"] for "Sara gave a book to Tom and ____.")
  const normTopicLower = normalizeQuestionText(topic);
  if (normTopicLower.includes('object pronoun') && cleanedOptions.length === 4) {
    const bareObjPronounsInOpts = cleanedOptions.filter((o) =>
      OBJECT_PRONOUNS_SET.has(normalizeQuestionText(o))
    );
    const hasBlank = /_{2,}|\[blank\]/i.test(questionText);
    if (bareObjPronounsInOpts.length >= 3 && hasBlank) {
      reasons.push(
        'Multiple object pronoun options could fit the blank; use non-object pronouns (e.g. I, he, she, we, they, my, his) as clear distractors.'
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

  // Difficulty & Part 14 brevity compliance check
  const diffCheck = checkQuestionDifficultyCompliance(
    { question: questionText, options: cleanedOptions },
    difficulty,
    durationSec
  );
  if (!diffCheck.compliant) {
    reasons.push(diffCheck.reason || `Does not match requested difficulty "${difficulty}".`);
  }

  // PART 12.B Concept Boundary Check (Subject vs Object vs Possessive vs Reflexive)
  const conceptCheck = checkConceptBoundary(
    {
      questionText,
      correctAnswer: cleanedOptions[correctIndex] || '',
      questionFormat: rawQ.questionFormat || rawQ.question_format || rawQ.questionType || rawQ.question_type || ''
    },
    topic
  );
  if (!conceptCheck.valid) {
    reasons.push(conceptCheck.reason || 'Concept boundary violation.');
  }

  // PART 12.F Explanation Validation
  const explanation =
    String(rawQ.explanation || '').trim() ||
    `"${cleanedOptions[correctIndex] || ''}" is correct because it matches the person or things receiving the action.`;

  const expCheck = validateExplanationAccuracy({
    questionText,
    correctAnswer: cleanedOptions[correctIndex] || '',
    explanation
  });
  if (!expCheck.valid) {
    reasons.push(expCheck.reason || 'Invalid explanation.');
  }

  const learningObjective =
    String(rawQ.learningObjective || rawQ.learning_objective || '').trim() ||
    `Practice ${topic} using simple, everyday English sentences.`;

  const hint =
    String(rawQ.hint || '').trim() ||
    `Read the sentence carefully and check which word fits naturally.`;

  // PART 14 Beginner-friendly language, label, and single-instruction validation
  const langCheck = checkBeginnerFriendlyLanguage({
    questionText,
    options: cleanedOptions,
    explanation,
    hint
  });
  if (!langCheck.valid) {
    reasons.push(langCheck.reason || 'Question uses complex wording, internal labels, or repeated instructions.');
  }

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

  // Track answer frequencies and structural pattern frequencies so the AI doesn't repeat the same template
  const answerWordCounts = new Map();
  const patternCounts = new Map();
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

      // Check repeated sentence-pattern template (Part 12.G)
      const patSig = getQuestionPatternSignature(q.question);
      const currentPatCount = patternCounts.get(patSig) || 0;
      if (currentPatCount >= 2) {
        isDuplicate = true;
        itemReasons.push(
          `Repeated sentence pattern detected (${patSig}); vary question format and sentence structure.`
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
      const patSig = getQuestionPatternSignature(q.question);
      patternCounts.set(patSig, (patternCounts.get(patSig) || 0) + 1);
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
 * Curated, beginner-friendly Object Pronouns bank (short, natural everyday English,
 * zero technical grammar jargon) used only to recover an isolated failed AI slot.
 * Never generates generic placeholder questions for arbitrary topics.
 */
const OBJECT_PRONOUN_CURATED_BANK = {
  Easy: [
    {
      question: 'Sarah lost her keys. Did you see ____?',
      options: ['them', 'they', 'their', 'she'],
      correctAnswer: 'them',
      explanation: '"Keys" is plural, so we use "them" after the verb "see".',
      hint: '"Keys" means more than one thing.',
      learningObjective: 'Use "them" for plural nouns after a verb.'
    },
    {
      question: 'Choose the correct word: My brother called ____ this morning.',
      options: ['me', 'I', 'my', 'mine'],
      correctAnswer: 'me',
      explanation: 'We use "me" after a verb like "called", not "I".',
      hint: 'Pick the word that follows an action verb.',
      learningObjective: 'Use "me" after an action verb.'
    },
    {
      question: 'The teacher praised Daniel. She gave ____ a star.',
      options: ['him', 'he', 'his', 'they'],
      correctAnswer: 'him',
      explanation: 'Daniel is one boy, so we use "him" after "gave".',
      hint: 'Which word matches one boy after a verb?',
      learningObjective: 'Replace a boy name with "him".'
    },
    {
      question: 'This box is heavy. Can you help ____ carry it?',
      options: ['us', 'we', 'our', 'they'],
      correctAnswer: 'us',
      explanation: 'We use "us" after the verb "help", not "we".',
      hint: '"We" goes before a verb; choose the word that goes after a verb.',
      learningObjective: 'Use "us" after a verb.'
    },
    {
      question: 'Maria is my friend. I sit next to ____ in class.',
      options: ['her', 'she', 'hers', 'it'],
      correctAnswer: 'her',
      explanation: 'After "to", we use "her" for Maria, not "she".',
      hint: 'Which word matches a girl after "to"?',
      learningObjective: 'Use "her" after "to".'
    },
    {
      question: 'Look at that fresh apple. I want to eat ____.',
      options: ['it', 'them', 'they', 'he'],
      correctAnswer: 'it',
      explanation: '"Apple" is one thing, so we use "it" after "eat".',
      hint: 'How many apples are there?',
      learningObjective: 'Use "it" for one thing.'
    },
    {
      question: 'Complete the sentence: Coach Lee wants to talk with ____.',
      options: ['you', 'your', 'yours', 'they'],
      correctAnswer: 'you',
      explanation: 'After "with", we use "you", not "your" or "yours".',
      hint: 'Pick the pronoun that is not showing ownership.',
      learningObjective: 'Use "you" after "with".'
    },
    {
      question: 'Choose the correct word: Our friends invited ____ to dinner.',
      options: ['us', 'we', 'our', 'ours'],
      correctAnswer: 'us',
      explanation: 'We use "us" after "invited" to show who received the invitation.',
      hint: 'Use the form that comes after the verb "invited".',
      learningObjective: 'Tell the difference between "we" and "us".'
    },
    {
      question: 'Choose the correct sentence.',
      options: [
        'Grandma smiled at him.',
        'Grandma smiled at he.',
        'Grandma smiled at his.',
        'Grandma smiled at they.'
      ],
      correctAnswer: 'Grandma smiled at him.',
      explanation: 'After "at", we use "him", not "he" or "his".',
      hint: 'Look at the word right after "at".',
      learningObjective: 'Choose a sentence with the right object pronoun.'
    },
    {
      question: 'Look at those cute dogs! Do you like ____?',
      options: ['them', 'they', 'their', 'it'],
      correctAnswer: 'them',
      explanation: '"Dogs" means more than one, so we use "them" after "like".',
      hint: 'There is more than one dog.',
      learningObjective: 'Use "them" for more than one animal or person.'
    }
  ],
  Medium: [
    {
      question: 'The math puzzle was hard, but Mia finished ____ on time.',
      options: ['it', 'them', 'they', 'its'],
      correctAnswer: 'it',
      explanation: '"Puzzle" is one thing, so we use "it" after "finished".',
      hint: 'Check if "puzzle" means one thing or many things.',
      learningObjective: 'Match one thing with "it" in a two-part sentence.'
    },
    {
      question: 'The teacher explained the game to Maya and ____.',
      options: ['me', 'I', 'my', 'mine'],
      correctAnswer: 'me',
      explanation: 'Try removing "Maya and": "explained the game to me" sounds right, not "to I".',
      hint: 'Say the sentence without "Maya and".',
      learningObjective: 'Use "me" with another name after "to".'
    },
    {
      question: 'Tom asks: "Did you call Lucas?" Lily says: "Yes, I texted ____."',
      options: ['him', 'he', 'his', 'they'],
      correctAnswer: 'him',
      explanation: 'Lucas is one boy, so Lily texted "him", not "he".',
      hint: 'Who did Lily text?',
      learningObjective: 'Use object pronouns naturally in a short conversation.'
    },
    {
      question: 'Choose the correct sentence.',
      options: [
        'The coach thanked us after the match.',
        'The coach thanked we after the match.',
        'Us thanked the coach after the match.',
        'The coach thanked our after the match.'
      ],
      correctAnswer: 'The coach thanked us after the match.',
      explanation: '"Us" goes after the action word "thanked", while "we" goes before a verb.',
      hint: 'Check which word comes right after "thanked".',
      learningObjective: 'Spot correct pronoun order in a sentence.'
    },
    {
      question: 'Both sisters forgot lunch, so Mom shared snacks with ____.',
      options: ['them', 'her', 'they', 'their'],
      correctAnswer: 'them',
      explanation: '"Both sisters" is two people, so we use "them" after "with".',
      hint: 'How many sisters are there?',
      learningObjective: 'Use "them" after "with" for two people.'
    },
    {
      question: 'Choose the correct word: Ms. Kim asked Elena and ____ to clean.',
      options: ['me', 'I', 'my', 'mine'],
      correctAnswer: 'me',
      explanation: 'Say "Ms. Kim asked me to clean". That shows "me" is right after "asked".',
      hint: 'Test the sentence without "Elena and".',
      learningObjective: 'Use "me" in compound pairs after a verb.'
    },
    {
      question: 'Sofia lost her eraser, so Leo lent ____ an extra one.',
      options: ['her', 'she', 'hers', 'him'],
      correctAnswer: 'her',
      explanation: 'Leo lent the eraser to Sofia, so we use "her".',
      hint: 'Who received the eraser from Leo?',
      learningObjective: 'Choose "her" for a girl receiving something.'
    },
    {
      question: 'The school song was great, so everyone clapped for ____.',
      options: ['it', 'them', 'they', 'its'],
      correctAnswer: 'it',
      explanation: '"The school song" is one thing, so we use "it" after "for".',
      hint: '"Song" is singular.',
      learningObjective: 'Match singular events and things with "it".'
    }
  ],
  Hard: [
    {
      question: 'Choose the correct sentence.',
      options: [
        'Between you and me, this science project looks great.',
        'Between you and I, this science project looks great.',
        'Between your and me, this science project looks great.',
        'Between you and mine, this science project looks great.'
      ],
      correctAnswer: 'Between you and me, this science project looks great.',
      explanation: 'After "between", always use object pronouns: "between you and me".',
      hint: 'Check the words right after "between".',
      learningObjective: 'Avoid using "I" after prepositions like "between".'
    },
    {
      question: 'Which sentence sounds completely right?',
      options: [
        'The principal invited Sara and me to speak on stage.',
        'The principal invited Sara and I to speak on stage.',
        'The principal invited she and me to speak on stage.',
        'The principal invited Sara and my to speak on stage.'
      ],
      correctAnswer: 'The principal invited Sara and me to speak on stage.',
      explanation: 'Both people follow "invited", so we say "invited Sara and me".',
      hint: 'Drop "Sara and" to hear which pronoun sounds right.',
      learningObjective: 'Choose the right pronoun pair after a verb.'
    },
    {
      question: 'Which sentence has NO pronoun mistake?',
      options: [
        'She gave the extra tickets to Ben and him.',
        'She gave the extra tickets to Ben and he.',
        'Her gave the extra tickets to Ben and him.',
        'She gave the extra tickets to Ben and his.'
      ],
      correctAnswer: 'She gave the extra tickets to Ben and him.',
      explanation: '"She" does the action, and "Ben and him" come after "to".',
      hint: 'Look at the word after "to Ben and".',
      learningObjective: 'Check both the doer and receiver in a sentence.'
    },
    {
      question: 'Nobody heard the loud thunder except Leo and ____.',
      options: ['me', 'I', 'my', 'mine'],
      correctAnswer: 'me',
      explanation: 'After "except", we use the object pronoun "me", not "I".',
      hint: 'Test the sentence without "Leo and".',
      learningObjective: 'Use object pronouns after "except".'
    },
    {
      question: 'Pick the sentence that fixes "Please tell Mark and I the time".',
      options: [
        'Please tell Mark and me the time.',
        'Please tell Mark and my the time.',
        'Please tell he and I the time.',
        'Please tell we the time.'
      ],
      correctAnswer: 'Please tell Mark and me the time.',
      explanation: 'After "tell", use "me" instead of "I": "Please tell Mark and me."',
      hint: 'Say "Please tell ___ the time" without "Mark and".',
      learningObjective: 'Fix common mistakes with "I" and "me" in everyday requests.'
    },
    {
      question: 'Maya waited outside with Carlos and ____ for ten minutes.',
      options: ['him', 'he', 'his', 'they'],
      correctAnswer: 'him',
      explanation: 'After "with", we use the object pronoun "him", not "he".',
      hint: 'Remove "Carlos and" to check which word sounds natural.',
      learningObjective: 'Use object pronouns in pairs after "with".'
    },
    {
      question: 'Those noisy birds woke both my sister and ____ early today.',
      options: ['us', 'we', 'our', 'ours'],
      correctAnswer: 'us',
      explanation: '"Us" comes after the action verb "woke", not "we".',
      hint: 'Pick the word that receives the action.',
      learningObjective: 'Use "us" correctly after action verbs.'
    }
  ]
};

/**
 * Provides strictly curated, topic-accurate beginner-friendly fallback items ONLY for
 * supported curated banks (never synthetic generic boilerplate). Returns [] otherwise.
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

  if (!normTopic.includes('object pronoun')) {
    return [];
  }

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

  return results;
}
