// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CONCEPT NORMALIZATION & DIAGNOSTIC ENGINE
// Normalizes and deduplicates educational topics into canonical pedagogical concepts.
// Synthesizes multi-source evidence across OCR, Tasks, Quizzes, Exams & Competitions.
// ============================================================================

/**
 * Standard Canonical Concepts Dictionary
 */
export const CANONICAL_CONCEPTS = {
  // Grammar — Tenses & Verbs
  SIMPLE_PRESENT_NEGATIVE: {
    category: 'Grammar',
    topic: 'Simple Present',
    skill: 'Negative Forms',
    displayName: 'Simple Present — Negative Forms',
    teachAction: 'Teach forming negative sentences in the Simple Present using do/does + not + base verb and give students guided sentence transformation practice.',
    commonError: {
      student_error: "He don't like tea.",
      correct_form: "He doesn't like tea."
    }
  },
  SIMPLE_PRESENT_THIRD_PERSON: {
    category: 'Grammar',
    topic: 'Simple Present',
    skill: 'Third Person Singular',
    displayName: 'Simple Present — Third Person Singular',
    teachAction: 'Review third-person singular verb endings (-s, -es, -ies) with subject-verb substitution drills.',
    commonError: {
      student_error: "She go to school every day.",
      correct_form: "She goes to school every day."
    }
  },
  SIMPLE_PRESENT_AFFIRMATIVE: {
    category: 'Grammar',
    topic: 'Simple Present',
    skill: 'Affirmative & Question Forms',
    displayName: 'Simple Present — Affirmative & Questions',
    teachAction: 'Review daily routine verbs and question formation with do/does + subject + verb.',
    commonError: {
      student_error: "Where she live?",
      correct_form: "Where does she live?"
    }
  },
  SIMPLE_PAST_NEGATIVE: {
    category: 'Grammar',
    topic: 'Simple Past',
    skill: 'Negative Forms',
    displayName: 'Simple Past — Negative Forms',
    teachAction: 'Teach forming negative sentences in the Simple Past using did + not + base verb.',
    commonError: {
      student_error: "He didn't went to the park.",
      correct_form: "He didn't go to the park."
    }
  },
  SIMPLE_PAST_FORMS: {
    category: 'Grammar',
    topic: 'Simple Past',
    skill: 'Past Tense Forms',
    displayName: 'Simple Past — Past Tense Forms',
    teachAction: 'Practice regular (-ed) and common irregular past tense forms with timeline storytelling.',
    commonError: {
      student_error: "They eated dinner early.",
      correct_form: "They ate dinner early."
    }
  },
  PAST_CONTINUOUS: {
    category: 'Grammar',
    topic: 'Past Continuous',
    skill: 'was/were + verb-ing',
    displayName: 'Past Continuous — was / were + -ing',
    teachAction: 'Review interrupted past actions using was/were + verb-ing and when/while clauses.',
    commonError: {
      student_error: "I was play football when it rained.",
      correct_form: "I was playing football when it rained."
    }
  },
  BE_VERBS: {
    category: 'Grammar',
    topic: 'Be Verbs',
    skill: 'am / is / are / was / were',
    displayName: 'Be Verbs — am / is / are / was / were',
    teachAction: 'Clarify subject concord with be verbs across present (am/is/are) and past (was/were) forms.',
    commonError: {
      student_error: "They was very happy yesterday.",
      correct_form: "They were very happy yesterday."
    }
  },

  // Grammar — Concord & Mechanics
  SUBJECT_VERB_AGREEMENT: {
    category: 'Grammar',
    topic: 'Subject-Verb Agreement',
    skill: 'Singular & Plural Concord',
    displayName: 'Subject–Verb Agreement',
    teachAction: 'Review singular vs. plural subject-verb concord with contrast error correction exercises.',
    commonError: {
      student_error: "My friends likes football. / It give me knowledge.",
      correct_form: "My friends like football. / It gives me knowledge."
    }
  },
  PREPOSITIONS_TIME_PLACE: {
    category: 'Grammar',
    topic: 'Prepositions',
    skill: 'at / in / on',
    displayName: 'Prepositions — at / in / on',
    teachAction: 'Review at + exact time, on + day/date, and in + month/year/period with a time-preposition anchor chart.',
    commonError: {
      student_error: "I wake up in 7 o'clock.",
      correct_form: "I wake up at 7 o'clock."
    }
  },
  CONJUNCTIONS_CLAUSES: {
    category: 'Grammar',
    topic: 'Conjunctions',
    skill: 'Connecting Clauses',
    displayName: 'Conjunctions — Connecting Clauses',
    teachAction: 'Practice connecting ideas using coordinating (and, but, so, or) and subordinating (because, although) conjunctions.',
    commonError: {
      student_error: "I like tea so I don't like coffee.",
      correct_form: "I like tea, but I don't like coffee."
    }
  },
  ARTICLES_DETERMINERS: {
    category: 'Grammar',
    topic: 'Articles & Determiners',
    skill: 'a / an / the',
    displayName: 'Articles — a / an / the',
    teachAction: 'Review vowel vs. consonant sound rules for a/an and specific vs. general usage with the.',
    commonError: {
      student_error: "She is an university student.",
      correct_form: "She is a university student."
    }
  },
  SENTENCE_MECHANICS: {
    category: 'Grammar',
    topic: 'Sentence Mechanics',
    skill: 'Word Order & Punctuation',
    displayName: 'Sentence Mechanics — Word Order & Punctuation',
    teachAction: 'Teach standard Subject-Verb-Object word order and proper sentence ending punctuation.',
    commonError: {
      student_error: "Always he plays in evening",
      correct_form: "He always plays in the evening."
    }
  },

  // Spelling
  SPELLING_COMMON_ERRORS: {
    category: 'Spelling',
    topic: 'Spelling',
    skill: 'Recurring Word Errors',
    displayName: 'Spelling — Recurring Word Errors',
    teachAction: 'Run a short spelling practice activity using the recurring error words and mnemonic contrasts.',
    commonError: {
      student_error: "becouse → because, recieve → receive, beautifull → beautiful",
      correct_form: "because, receive, beautiful"
    }
  },
  SPELLING_HOMOPHONES: {
    category: 'Spelling',
    topic: 'Spelling',
    skill: 'Homophones (their / there / they\'re)',
    displayName: 'Spelling — Homophones (their / there / they\'re)',
    teachAction: 'Practice distinguishing homophones (their / there / they\'re, its / it\'s, to / two / too) in context.',
    commonError: {
      student_error: "Their going to they're house.",
      correct_form: "They're going to their house."
    }
  },
  SPELLING_DOUBLE_CONSONANTS: {
    category: 'Spelling',
    topic: 'Spelling',
    skill: 'Double Consonants',
    displayName: 'Spelling — Double Consonants',
    teachAction: 'Review the CVC doubling rule for adding -ing and -ed suffixes (e.g., run → running, swim → swimming).',
    commonError: {
      student_error: "runing, swiming, droped",
      correct_form: "running, swimming, dropped"
    }
  },

  // Writing & Reading
  PARAGRAPH_ORGANIZATION: {
    category: 'Writing',
    topic: 'Paragraph Writing',
    skill: 'Topic Sentences & Flow',
    displayName: 'Paragraph Organization — Topic Sentences & Flow',
    teachAction: 'Guide students to start paragraphs with a clear topic sentence followed by 2-3 supporting details.',
    commonError: {
      student_error: "Writing list of ideas without a topic sentence or cohesive transitions.",
      correct_form: "Clear topic sentence + supporting details + concluding sentence."
    }
  },
  ESSAY_STRUCTURE: {
    category: 'Writing',
    topic: 'Essay Writing',
    skill: 'Structure & Development',
    displayName: 'Essay Writing — Structure & Development',
    teachAction: 'Model a 3-part essay outline (Introduction with thesis, Body paragraphs with evidence, Conclusion).',
    commonError: {
      student_error: "Single unbroken block of text lacking paragraph breaks and clear conclusion.",
      correct_form: "Clear introduction, body paragraphs, and concluding evaluation."
    }
  },
  CREATIVE_WRITING: {
    category: 'Writing',
    topic: 'Creative Writing',
    skill: 'Narrative Development',
    displayName: 'Creative Writing — Narrative Development',
    teachAction: 'Focus on sensory descriptions, dialogue formatting, and dynamic plot pacing.',
    commonError: {
      student_error: "Overly summary-style telling instead of showing scene details.",
      correct_form: "Show, don't tell with descriptive verbs and sensory details."
    }
  },
  VOCABULARY_CONTEXT: {
    category: 'Vocabulary',
    topic: 'Vocabulary',
    skill: 'Context & Confused Words',
    displayName: 'Vocabulary — Context & Commonly Confused Words',
    teachAction: 'Clarify pairs of commonly confused words (e.g. borrow vs. lend, accept vs. except) with sentence frames.',
    commonError: {
      student_error: "Can you borrow me your book?",
      correct_form: "Can you lend me your book?"
    }
  },
  READING_INFERENCE: {
    category: 'Reading',
    topic: 'Reading Comprehension',
    skill: 'Inference & Context Clues',
    displayName: 'Reading Comprehension — Inference & Context Clues',
    teachAction: 'Model how to use textual clues to deduce implicit meanings and author intention.',
    commonError: {
      student_error: "Selecting literal answers when implicit inference was asked.",
      correct_form: "Use contextual evidence clues from surrounding sentences."
    }
  },
  READING_FACTUAL: {
    category: 'Reading',
    topic: 'Reading Comprehension',
    skill: 'Factual Recall & Main Ideas',
    displayName: 'Reading Comprehension — Factual Recall',
    teachAction: 'Practice scanning techniques to locate explicit facts, dates, and core concepts.',
    commonError: {
      student_error: "Missing key factual details stated in the text.",
      correct_form: "Scan for keywords and cross-reference with question stems."
    }
  }
};

/**
 * Normalizes any freeform text, activity title, raw topic, or rubric criterion
 * into a single canonical pedagogical concept.
 *
 * Deduplication rules:
 *  - "Simple Present negative", "Present simple negatives", "Don't / doesn't" -> Simple Present — Negative Forms
 *  - "at/in/on", "time prepositions", "prepositions of time" -> Prepositions — at / in / on
 *  - "their/there", "spelling errors", "misspelled words" -> Spelling — Recurring Word Errors
 *  - "subject-verb concord", "it give", "friends likes" -> Subject–Verb Agreement
 *
 * @param {string} rawString - Any combination of title, topic, rubric, error text
 * @param {string} [categoryHint] - Optional category hint ('Grammar', 'Spelling', 'Writing', etc.)
 * @returns {typeof CANONICAL_CONCEPTS[keyof typeof CANONICAL_CONCEPTS] | null}
 */
export function normalizeConcept(rawString, categoryHint = '') {
  if (!rawString && !categoryHint) return null;
  const combined = `${rawString || ''} ${categoryHint || ''}`.toLowerCase().trim();
  if (!combined) return null;

  // 1. Prepositions at / in / on
  if (
    /at[\s/]+in[\s/]+on|in[\s/]+on[\s/]+at|preposition.*(?:time|place|at|in|on)|(?:in|at|on)\s+(?:7\s*o['’]clock|monday|morning|the evening|june)/i.test(combined) ||
    (/preposition/i.test(combined) && !/conjunction/i.test(combined))
  ) {
    return CANONICAL_CONCEPTS.PREPOSITIONS_TIME_PLACE;
  }

  // 2. Simple Present Negative
  if (
    /(?:simple\s*present|present\s*simple).*(?:negative|don'?t|doesn'?t|not\s+like|not\s+play)/i.test(combined) ||
    /(?:don'?t\s*\/\s*doesn'?t|do\s*not\s*\/\s*does\s*not|negative\s*present\s*tense)/i.test(combined) ||
    (/negative\s*form/i.test(combined) && /present/i.test(combined))
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_NEGATIVE;
  }

  // 3. Simple Present Third Person Singular
  if (
    /(?:simple\s*present|present\s*simple).*(?:third\s*person|3rd\s*person|singular\s*subject|verb-s|-es)/i.test(combined) ||
    /(?:he\/she\/it|third\s*person\s*singular)/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_THIRD_PERSON;
  }

  // 4. Simple Present General / Affirmative
  if (/simple\s*present|present\s*simple/i.test(combined)) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_AFFIRMATIVE;
  }

  // 5. Simple Past Negative
  if (
    /(?:simple\s*past|past\s*simple).*(?:negative|didn'?t|did\s*not)/i.test(combined) ||
    /didn'?t\s*\+\s*verb|did\s*not\s*\+\s*base/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_NEGATIVE;
  }

  // 6. Simple Past Past Tense Forms
  if (
    /(?:simple\s*past|past\s*simple|past\s*tense|regular\s*past|irregular\s*past)/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_FORMS;
  }

  // 7. Past Continuous
  if (/past\s*continuous|past\s*progressive|was.*reading|were.*playing/i.test(combined)) {
    return CANONICAL_CONCEPTS.PAST_CONTINUOUS;
  }

  // 8. Subject–Verb Agreement
  if (
    /subject[- ]*verb\s*agreement|subject\s*verb\s*concord|singular\s*subject|plural\s*subject|concord/i.test(combined) ||
    /friends\s*likes|it\s*give|he\s*play|she\s*go|hobby\s*are/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SUBJECT_VERB_AGREEMENT;
  }

  // 9. Be Verbs
  if (/be\s*verbs?|am,\s*is,\s*are|was,\s*were|am\s*\/\s*is\s*\/\s*are/i.test(combined)) {
    return CANONICAL_CONCEPTS.BE_VERBS;
  }

  // 10. Conjunctions
  if (/conjunction|connecting\s*clauses|and\s*but\s*so\s*or|coordinating\s*conjunction/i.test(combined)) {
    return CANONICAL_CONCEPTS.CONJUNCTIONS_CLAUSES;
  }

  // 11. Articles & Determiners
  if (/articles?|determiners?|a\s*\/\s*an\s*\/\s*the|indefinite\s*article|definite\s*article/i.test(combined)) {
    return CANONICAL_CONCEPTS.ARTICLES_DETERMINERS;
  }

  // 12. Sentence Mechanics / Word Order
  if (/sentence\s*structure|sentence\s*mechanics|word\s*order|syntax|punctuation/i.test(combined)) {
    return CANONICAL_CONCEPTS.SENTENCE_MECHANICS;
  }

  // 13. Spelling — Homophones
  if (/their.*there|they'?re|homophones?|its.*it'?s/i.test(combined)) {
    return CANONICAL_CONCEPTS.SPELLING_HOMOPHONES;
  }

  // 14. Spelling — Double Consonants
  if (/double\s*consonant|cvc|runing|swiming/i.test(combined)) {
    return CANONICAL_CONCEPTS.SPELLING_DOUBLE_CONSONANTS;
  }

  // 15. Spelling — General / Common Errors
  if (/spelling|orthography|becouse|recieve|beautifull/i.test(combined)) {
    return CANONICAL_CONCEPTS.SPELLING_COMMON_ERRORS;
  }

  // 16. Vocabulary — Confused Words / Context
  if (/borrow.*lend|vocabulary|word\s*choice|word\s*precision|confused\s*words/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_CONTEXT;
  }

  // 17. Paragraph Organization
  if (/paragraph|topic\s*sentence|paragraph\s*flow|paragraph\s*organization|rainy\s*day|favourite\s*hobby/i.test(combined)) {
    return CANONICAL_CONCEPTS.PARAGRAPH_ORGANIZATION;
  }

  // 18. Essay Structure
  if (/essay|essay\s*writing|thesis|importance\s*of\s*trees/i.test(combined)) {
    return CANONICAL_CONCEPTS.ESSAY_STRUCTURE;
  }

  // 19. Creative Writing
  if (/story\s*writing|creative\s*writing|narrative|mermaids|competition/i.test(combined)) {
    return CANONICAL_CONCEPTS.CREATIVE_WRITING;
  }

  // 20. Reading Comprehension
  if (/reading|comprehension|animal\s*facts|mars|factual\s*recall/i.test(combined)) {
    return /inference|context\s*clues/i.test(combined)
      ? CANONICAL_CONCEPTS.READING_INFERENCE
      : CANONICAL_CONCEPTS.READING_FACTUAL;
  }

  // Skip useless placeholder generic terms
  if (/^(?:assignment|task|general|other|science|test|unit\s*test)$/i.test(combined)) {
    return null;
  }

  // Fallback: Capitalize clean topic
  const cleanTitle = (rawString || categoryHint || '')
    .replace(/^(?:Unit Test on the|Unit Test on|Quiz on|Assessment:|Test on|Classroom Activity)\s*/i, '')
    .trim();

  if (cleanTitle.length < 2) return null;

  return {
    category: categoryHint || 'General',
    topic: cleanTitle,
    skill: 'Core Comprehension',
    displayName: `${cleanTitle} — Core Concepts`,
    teachAction: `Review foundational concepts for ${cleanTitle} with direct examples and guided practice.`,
    commonError: null
  };
}

/**
 * Extracts and normalizes detected student errors from OCR and writing evaluations.
 *
 * @param {Object} ev - Learning event or submission object
 * @returns {Array<{ concept: string, error_type: string, student_error: string, correct_form: string }>}
 */
export function extractStructuredErrorsFromEvent(ev) {
  const errors = [];
  if (!ev) return errors;

  // Check metadata.detected_errors
  if (Array.isArray(ev.metadata?.detected_errors)) {
    ev.metadata.detected_errors.forEach(err => {
      if (err && (err.student_error || err.text)) {
        const canonical = normalizeConcept(err.concept || err.rule || err.error_type || ev.topic);
        errors.push({
          concept: canonical ? canonical.displayName : (err.concept || 'Grammar'),
          error_type: err.error_type || 'grammar',
          student_error: err.student_error || err.text,
          correct_form: err.correct_form || err.suggestion || err.correction || ''
        });
      }
    });
  }

  // Check writing evaluation mistakes / grammar_errors
  const wEval = ev.metadata?.writing_evaluation || ev.metadata;
  if (wEval) {
    if (Array.isArray(wEval.mistakes)) {
      wEval.mistakes.forEach(m => {
        if (m && m.original) {
          const canonical = normalizeConcept(m.explanation || wEval.topic || ev.topic);
          errors.push({
            concept: canonical ? canonical.displayName : (wEval.topic || 'Grammar'),
            error_type: 'grammar',
            student_error: m.original,
            correct_form: m.correction || ''
          });
        }
      });
    }

    if (Array.isArray(wEval.grammar_errors)) {
      wEval.grammar_errors.forEach(ge => {
        if (ge && ge.text) {
          const canonical = normalizeConcept(ge.rule || ge.text);
          errors.push({
            concept: canonical ? canonical.displayName : (ge.rule || 'Grammar'),
            error_type: 'grammar',
            student_error: ge.text,
            correct_form: ge.suggestion || ''
          });
        }
      });
    }

    if (Array.isArray(wEval.spelling_errors)) {
      wEval.spelling_errors.forEach(se => {
        if (se && (se.text || se.misspelled_word)) {
          const orig = se.text || se.misspelled_word;
          const corr = se.suggestion || se.correct_word || se.correction || '';
          errors.push({
            concept: CANONICAL_CONCEPTS.SPELLING_COMMON_ERRORS.displayName,
            error_type: 'spelling',
            student_error: orig,
            correct_form: corr
          });
        }
      });
    }
  }

  return errors;
}
