// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CONCEPT NORMALIZATION & DIAGNOSTIC ENGINE
// Normalizes and deduplicates educational topics into canonical pedagogical concepts.
// Strips raw JSON, activity metadata, session IDs, and general trivia quizzes.
// Synthesizes multi-source evidence across Tasks, OCR, Exams, and Competitions.
// ============================================================================

/**
 * Standard Canonical Concepts Dictionary
 */
export const CANONICAL_CONCEPTS = {
  // 1. Grammar — Simple Present Third Person Singular
  SIMPLE_PRESENT_THIRD_PERSON: {
    diagnosis_id: 'diag_grammar_simple_present_third_person',
    category: 'Grammar',
    skill: 'subject_verb_agreement',
    subskill: 'simple_present_third_person',
    topic: 'Simple Present',
    displayName: 'Simple Present — third-person singular "-s"',
    specific_problem: 'Students frequently use the base verb after he/she/it instead of adding -s or -es.',
    teachAction: 'Teach simple present third-person singular subject–verb agreement (-s/-es with he/she/it) using short sentence-building and correction practice.',
    recommended_teaching: 'Teach simple present third-person singular subject–verb agreement using short sentence-building practice.',
    commonError: {
      student_error: 'He work in an office.',
      correct_form: 'He works in an office.'
    },
    commonErrors: [
      { student_error: 'He work in an office.', correct_form: 'He works in an office.' },
      { student_error: 'My mother take care of us.', correct_form: 'My mother takes care of us.' },
      { student_error: 'She help me with homework.', correct_form: 'She helps me with homework.' }
    ]
  },

  // 2. Grammar — There is / There are
  THERE_IS_THERE_ARE: {
    diagnosis_id: 'diag_grammar_there_is_there_are',
    category: 'Grammar',
    skill: 'subject_verb_agreement',
    subskill: 'there_is_there_are_agreement',
    topic: 'There is / There are',
    displayName: 'There is / There are — Singular vs Plural',
    specific_problem: 'Students use "there is" before plural nouns instead of "there are".',
    teachAction: 'Practice choosing "there is" for singular nouns and "there are" for plural nouns using contrast sentence frames.',
    recommended_teaching: 'Practice choosing "there is" for singular nouns and "there are" for plural nouns.',
    commonError: {
      student_error: 'There is five members in my family.',
      correct_form: 'There are five members in my family.'
    },
    commonErrors: [
      { student_error: 'There is five members in my family.', correct_form: 'There are five members in my family.' },
      { student_error: 'There is many books on the desk.', correct_form: 'There are many books on the desk.' }
    ]
  },

  // 3. Grammar — General Subject-Verb Agreement / Plural Concord
  SUBJECT_VERB_AGREEMENT: {
    diagnosis_id: 'diag_grammar_subject_verb_agreement',
    category: 'Grammar',
    skill: 'subject_verb_agreement',
    subskill: 'plural_subject_verb_concord',
    topic: 'Subject–Verb Agreement',
    displayName: 'Subject–Verb Agreement',
    specific_problem: 'Students add -s to verbs with plural subjects or use incorrect verb forms with compound subjects.',
    teachAction: 'Review singular vs plural subject-verb concord with contrast error correction exercises.',
    recommended_teaching: 'Review singular vs plural subject-verb concord with contrast error correction exercises.',
    commonError: {
      student_error: 'My friends likes football.',
      correct_form: 'My friends like football.'
    },
    commonErrors: [
      { student_error: 'My friends likes football.', correct_form: 'My friends like football.' },
      { student_error: 'The students is reading.', correct_form: 'The students are reading.' }
    ]
  },

  // 4. Grammar — Simple Present Negative
  SIMPLE_PRESENT_NEGATIVE: {
    diagnosis_id: 'diag_grammar_simple_present_negative',
    category: 'Grammar',
    skill: 'Negative Forms',
    subskill: 'negative_forms',
    topic: 'Simple Present',
    displayName: 'Simple Present — Negative Forms',
    specific_problem: 'Students confuse "don’t" and "doesn’t" or add -s after does not.',
    teachAction: 'Teach forming negative sentences in the Simple Present using do/does + not + base verb and practice sentence transformation drills.',
    recommended_teaching: 'Teach forming negative sentences in the Simple Present using do/does + not + base verb.',
    commonError: {
      student_error: "He don't like football.",
      correct_form: "He doesn't like football."
    },
    commonErrors: [
      { student_error: "He don't like football.", correct_form: "He doesn't like football." },
      { student_error: "She doesn't goes to school.", correct_form: "She doesn't go to school." }
    ]
  },

  // 5. Grammar — Simple Present Affirmative & Questions
  SIMPLE_PRESENT_AFFIRMATIVE: {
    diagnosis_id: 'diag_grammar_simple_present_affirmative',
    category: 'Grammar',
    skill: 'simple_present',
    subskill: 'affirmative_and_questions',
    topic: 'Simple Present',
    displayName: 'Simple Present — Affirmative & Questions',
    specific_problem: 'Students omit auxiliary do/does when forming present tense questions.',
    teachAction: 'Review daily routine verbs and question formation with do/does + subject + base verb.',
    recommended_teaching: 'Review daily routine verbs and question formation with do/does + subject + base verb.',
    commonError: {
      student_error: 'Where she live?',
      correct_form: 'Where does she live?'
    }
  },

  // 6. Grammar — Simple Past Regular & Irregular
  SIMPLE_PAST_FORMS: {
    diagnosis_id: 'diag_grammar_simple_past_forms',
    category: 'Grammar',
    skill: 'simple_past',
    subskill: 'regular_and_irregular_forms',
    topic: 'Simple Past',
    displayName: 'Simple Past — Regular & Irregular Verb Forms',
    specific_problem: 'Students incorrectly apply regular -ed to irregular verbs (e.g. eated, goed) or misform common past verbs.',
    teachAction: 'Practice regular (-ed) and high-frequency irregular past tense forms with timeline storytelling.',
    recommended_teaching: 'Practice regular (-ed) and high-frequency irregular past tense forms with timeline storytelling.',
    commonError: {
      student_error: 'They eated dinner early.',
      correct_form: 'They ate dinner early.'
    },
    commonErrors: [
      { student_error: 'They eated dinner early.', correct_form: 'They ate dinner early.' },
      { student_error: 'I goed to school yesterday.', correct_form: 'I went to school yesterday.' },
      { student_error: 'She seed the teacher.', correct_form: 'She saw the teacher.' }
    ]
  },

  // 7. Grammar — Simple Past Negative
  SIMPLE_PAST_NEGATIVE: {
    diagnosis_id: 'diag_grammar_simple_past_negative',
    category: 'Grammar',
    skill: 'simple_past',
    subskill: 'negative_past_forms',
    topic: 'Simple Past',
    displayName: 'Simple Past — Negative Forms (didn’t + base)',
    specific_problem: 'Students use past tense verbs after didn’t instead of returning to the base verb.',
    teachAction: 'Teach forming negative sentences in the Simple Past using did + not + base verb.',
    recommended_teaching: 'Teach forming negative sentences in the Simple Past using did + not + base verb.',
    commonError: {
      student_error: "He didn't went to the park.",
      correct_form: "He didn't go to the park."
    },
    commonErrors: [
      { student_error: "He didn't went to the park.", correct_form: "He didn't go to the park." },
      { student_error: "I didn't saw him.", correct_form: "I didn't see him." }
    ]
  },

  // 8. Grammar — Past Continuous
  PAST_CONTINUOUS: {
    diagnosis_id: 'diag_grammar_past_continuous',
    category: 'Grammar',
    skill: 'past_continuous',
    subskill: 'was_were_verb_ing',
    topic: 'Past Continuous',
    displayName: 'Past Continuous — was / were + -ing',
    specific_problem: 'Students omit the auxiliary was/were or the -ing suffix in interrupted past descriptions.',
    teachAction: 'Review interrupted past actions using was/were + verb-ing and when/while clauses.',
    recommended_teaching: 'Review interrupted past actions using was/were + verb-ing and when/while clauses.',
    commonError: {
      student_error: 'I was play football when it rained.',
      correct_form: 'I was playing football when it rained.'
    }
  },

  // 9. Grammar — Be Verbs
  BE_VERBS: {
    diagnosis_id: 'diag_grammar_be_verbs',
    category: 'Grammar',
    skill: 'be_verbs',
    subskill: 'am_is_are_was_were_concord',
    topic: 'Be Verbs',
    displayName: 'Be Verbs — am / is / are / was / were',
    specific_problem: 'Students confuse singular and plural forms of be verbs across present and past tenses.',
    teachAction: 'Clarify subject concord with be verbs across present (am/is/are) and past (was/were) forms.',
    recommended_teaching: 'Clarify subject concord with be verbs across present (am/is/are) and past (was/were) forms.',
    commonError: {
      student_error: 'They was very happy yesterday.',
      correct_form: 'They were very happy yesterday.'
    }
  },

  // 10. Grammar — Prepositions of Time & Place
  PREPOSITIONS_TIME_PLACE: {
    diagnosis_id: 'diag_grammar_prepositions_in_on_at',
    category: 'Grammar',
    skill: 'at / in / on',
    subskill: 'in_on_at_time_place',
    topic: 'Prepositions',
    displayName: 'Prepositions — in / on / at',
    specific_problem: 'Students confuse in, on, and at when indicating specific times, dates, and physical locations.',
    teachAction: 'Teach at + exact time, on + day/date, and in + month/year/period with anchor chart contrast frames.',
    recommended_teaching: 'Practice time and place prepositions (at 7 o’clock, on Monday, in June) using anchor charts.',
    commonError: {
      student_error: 'I wake up in 7 o’clock.',
      correct_form: 'I wake up at 7 o’clock.'
    },
    commonErrors: [
      { student_error: 'I wake up in 7 o’clock.', correct_form: 'I wake up at 7 o’clock.' },
      { student_error: 'We have class at Monday.', correct_form: 'We have class on Monday.' },
      { student_error: 'She is on the room.', correct_form: 'She is in the room.' }
    ]
  },

  // 11. Grammar — Conjunctions
  CONJUNCTIONS_CLAUSES: {
    diagnosis_id: 'diag_grammar_conjunctions',
    category: 'Grammar',
    skill: 'conjunctions',
    subskill: 'connecting_clauses',
    topic: 'Conjunctions',
    displayName: 'Conjunctions — Connecting Clauses',
    specific_problem: 'Students use inappropriate conjunctions to link cause, effect, and contrast.',
    teachAction: 'Practice connecting ideas using coordinating (and, but, so, or) and subordinating (because, although) conjunctions.',
    recommended_teaching: 'Practice connecting clauses with coordinating and subordinating conjunctions.',
    commonError: {
      student_error: "I like tea so I don't like coffee.",
      correct_form: "I like tea, but I don't like coffee."
    }
  },

  // 12. Grammar — Articles & Determiners
  ARTICLES_DETERMINERS: {
    diagnosis_id: 'diag_grammar_articles',
    category: 'Grammar',
    skill: 'articles',
    subskill: 'a_an_the_selection',
    topic: 'Articles & Determiners',
    displayName: 'Articles — a / an / the',
    specific_problem: 'Students confuse vowel sound rules for a/an or omit definite articles.',
    teachAction: 'Review vowel vs. consonant sound rules for a/an and specific vs. general usage with the.',
    recommended_teaching: 'Review vowel vs consonant sound rules for a/an and specific usage with the.',
    commonError: {
      student_error: 'She is an university student.',
      correct_form: 'She is a university student.'
    },
    commonErrors: [
      { student_error: 'She is an university student.', correct_form: 'She is a university student.' },
      { student_error: 'He ate a apple.', correct_form: 'He ate an apple.' }
    ]
  },

  // 13. Grammar — Sentence Mechanics & Punctuation
  SENTENCE_MECHANICS: {
    diagnosis_id: 'diag_grammar_sentence_mechanics',
    category: 'Grammar',
    skill: 'sentence_mechanics',
    subskill: 'word_order_and_punctuation',
    topic: 'Sentence Mechanics',
    displayName: 'Sentence Mechanics — Word Order & Punctuation',
    specific_problem: 'Students use non-standard word order or omit period and comma boundaries between clauses.',
    teachAction: 'Teach standard Subject-Verb-Object word order and proper sentence ending punctuation.',
    recommended_teaching: 'Teach standard Subject-Verb-Object word order and proper sentence ending punctuation.',
    commonError: {
      student_error: 'Always he plays in evening',
      correct_form: 'He always plays in the evening.'
    }
  },

  // 14. Spelling — Common Word Errors
  SPELLING_COMMON_ERRORS: {
    diagnosis_id: 'diag_spelling_common_errors',
    category: 'Spelling',
    skill: 'spelling',
    subskill: 'high_frequency_word_patterns',
    topic: 'Spelling',
    displayName: 'Spelling — Common Word Errors',
    specific_problem: 'Students make recurring orthographic errors on high-frequency academic vocabulary.',
    teachAction: 'Run targeted spelling practice on high-frequency error words using mnemonic contrasts and visual chunking.',
    recommended_teaching: 'Conduct short spelling retrieval practice using visual chunking and contrast exercises.',
    commonError: {
      student_error: 'becouse → because',
      correct_form: 'because'
    }
  },

  // 15. Spelling — Homophones
  SPELLING_HOMOPHONES: {
    diagnosis_id: 'diag_spelling_homophones',
    category: 'Spelling',
    skill: 'spelling',
    subskill: 'homophone_distinction',
    topic: 'Spelling',
    displayName: 'Spelling — Homophones (their / there / they’re)',
    specific_problem: 'Students confuse phonetic homophones (their/there/they’re, its/it’s, to/two/too).',
    teachAction: 'Practice distinguishing homophones (their / there / they’re, its / it’s, to / two / too) in context.',
    recommended_teaching: 'Practice distinguishing homophones in complete sentence contexts.',
    commonError: {
      student_error: "Their going to they're house.",
      correct_form: "They're going to their house."
    }
  },

  // 16. Spelling — Double Consonants
  SPELLING_DOUBLE_CONSONANTS: {
    diagnosis_id: 'diag_spelling_double_consonants',
    category: 'Spelling',
    skill: 'spelling',
    subskill: 'cvc_suffix_doubling',
    topic: 'Spelling',
    displayName: 'Spelling — Suffix Doubling Rule',
    specific_problem: 'Students omit consonant doubling when adding -ing or -ed suffixes (runing, swiming).',
    teachAction: 'Review the CVC doubling rule for adding -ing and -ed suffixes (e.g., run → running, swim → swimming).',
    recommended_teaching: 'Review the CVC consonant doubling rule when adding -ing and -ed suffixes.',
    commonError: {
      student_error: 'runing, swiming, droped',
      correct_form: 'running, swimming, dropped'
    }
  },

  // 17. Vocabulary — borrow vs lend
  VOCABULARY_BORROW_LEND: {
    diagnosis_id: 'diag_vocab_borrow_lend',
    category: 'Vocabulary',
    skill: 'vocabulary',
    subskill: 'borrow_vs_lend_confusion',
    topic: 'Vocabulary',
    displayName: 'Vocabulary — "borrow" vs "lend"',
    specific_problem: 'Students confuse the direction of transfer between "borrow" (receive temporarily) and "lend" (give temporarily).',
    teachAction: 'Teach "borrow from" vs "lend to" with classroom object transfer drills.',
    recommended_teaching: 'Teach the distinction between "borrow" and "lend" using directional sentence frames.',
    commonError: {
      student_error: 'Can you borrow me your book?',
      correct_form: 'Can you lend me your book?'
    }
  },

  // 18. Vocabulary — say vs tell
  VOCABULARY_SAY_TELL: {
    diagnosis_id: 'diag_vocab_say_tell',
    category: 'Vocabulary',
    skill: 'vocabulary',
    subskill: 'say_vs_tell_confusion',
    topic: 'Vocabulary',
    displayName: 'Vocabulary — "say" vs "tell"',
    specific_problem: 'Students use "say" with a direct personal object or "tell" without one.',
    teachAction: 'Teach that "tell" requires a personal object (tell someone something), while "say" takes direct or that-clauses.',
    recommended_teaching: 'Clarify "say" vs "tell" with direct dialogue and reporting exercises.',
    commonError: {
      student_error: 'He said me the answer.',
      correct_form: 'He told me the answer.'
    }
  },

  // 19. Vocabulary — make vs do
  VOCABULARY_MAKE_DO: {
    diagnosis_id: 'diag_vocab_make_do',
    category: 'Vocabulary',
    skill: 'vocabulary',
    subskill: 'make_vs_do_collocations',
    topic: 'Vocabulary',
    displayName: 'Vocabulary — "make" vs "do"',
    specific_problem: 'Students confuse standard collocations with "make" (create/produce) and "do" (activities/tasks).',
    teachAction: 'Practice high-frequency collocations for "make" (make a mistake, make dinner) vs "do" (do homework, do exercise).',
    recommended_teaching: 'Practice collocations for "make" vs "do" with flashcard categorization drills.',
    commonError: {
      student_error: 'I made my homework.',
      correct_form: 'I did my homework.'
    }
  },

  // 20. Vocabulary — General Context & Word Choice
  VOCABULARY_CONTEXT: {
    diagnosis_id: 'diag_vocab_word_choice',
    category: 'Vocabulary',
    skill: 'vocabulary',
    subskill: 'word_choice_precision',
    topic: 'Vocabulary',
    displayName: 'Vocabulary — Word Choice & Precision',
    specific_problem: 'Students rely on repetitive, overly generic vocabulary instead of precise descriptive terms.',
    teachAction: 'Introduce specific vocabulary replacements and semantic gradient scales.',
    recommended_teaching: 'Introduce context-specific vocabulary replacements to enhance word precision.',
    commonError: {
      student_error: 'He was a very nice and good person.',
      correct_form: 'He was a kind, generous mentor.'
    }
  },

  // 21. Writing — Topic Sentences
  PARAGRAPH_TOPIC_SENTENCES: {
    diagnosis_id: 'diag_writing_paragraph_topic_sentences',
    category: 'Writing',
    skill: 'paragraph_writing',
    subskill: 'missing_topic_sentence',
    topic: 'Paragraph Writing',
    displayName: 'Paragraph Writing — Topic Sentences',
    specific_problem: 'Students begin paragraphs without a clear topic sentence that states the central claim.',
    teachAction: 'Guide students to start each paragraph with a clear topic sentence stating the main idea, followed by 2-3 supporting details.',
    recommended_teaching: 'Teach paragraph topic sentence formulation followed by supporting detail development.',
    commonError: {
      student_error: 'Writing a list of ideas without a clear opening topic sentence.',
      correct_form: 'Clear topic sentence stating main claim + 2 supporting details.'
    }
  },

  // 22. Writing — Paragraph Organization & Transitions
  PARAGRAPH_ORGANIZATION: {
    diagnosis_id: 'diag_writing_paragraph_organization',
    category: 'Writing',
    skill: 'paragraph_writing',
    subskill: 'logical_flow_and_transitions',
    topic: 'Paragraph Writing',
    displayName: 'Paragraph Organization — Flow & Transitions',
    specific_problem: 'Ideas are listed disjointedly without connective transition words between thoughts.',
    teachAction: 'Teach transitional words (first, next, however, therefore) to sequence supporting arguments logically.',
    recommended_teaching: 'Teach logical paragraph sequencing and transitional connectors.',
    commonError: {
      student_error: 'Abrupt shifts between unrelated points in the same paragraph.',
      correct_form: 'Cohesive sequence linked with logical transitional markers.'
    }
  },

  // 23. Writing — Sentence Variety & Repetitive Openings
  SENTENCE_VARIETY: {
    diagnosis_id: 'diag_writing_sentence_variety',
    category: 'Writing',
    skill: 'sentence_mechanics',
    subskill: 'repetitive_sentence_openings',
    topic: 'Sentence Variety',
    displayName: 'Sentence Variety — Repetitive Openings',
    specific_problem: 'Students repeatedly begin consecutive sentences with the same subject or pronoun (e.g. "He... He... He...").',
    teachAction: 'Practice sentence combining and varied adverbial or participial sentence openers.',
    recommended_teaching: 'Practice combining simple sentences and varying sentence openers.',
    commonError: {
      student_error: 'He went to school. He saw his friend. He ate lunch.',
      correct_form: 'After arriving at school, he met his friend and they had lunch together.'
    }
  },

  // 24. Writing — Essay Structure
  ESSAY_STRUCTURE: {
    diagnosis_id: 'diag_writing_essay_structure',
    category: 'Writing',
    skill: 'essay_writing',
    subskill: 'structure_and_development',
    topic: 'Essay Writing',
    displayName: 'Essay Writing — Structure & Development',
    specific_problem: 'Students submit unbroken text blocks lacking distinct introduction, body paragraphs, and conclusion.',
    teachAction: 'Model a 3-part essay outline: Introduction with thesis, focused body paragraphs, and synthesizing conclusion.',
    recommended_teaching: 'Model a 3-part essay outline (Introduction, Body Paragraphs, Conclusion).',
    commonError: {
      student_error: 'Single unbroken block of text lacking paragraph breaks and conclusion.',
      correct_form: 'Clear introduction, structured body paragraphs, and concluding evaluation.'
    }
  },

  // 25. Writing — Creative Writing
  CREATIVE_WRITING: {
    diagnosis_id: 'diag_writing_creative_narrative',
    category: 'Writing',
    skill: 'creative_writing',
    subskill: 'narrative_development',
    topic: 'Creative Writing',
    displayName: 'Creative Writing — Narrative Development',
    specific_problem: 'Narratives rely on summary exposition rather than descriptive sensory details and dialogue.',
    teachAction: 'Focus on sensory descriptions, dialogue formatting, and dynamic plot pacing.',
    recommended_teaching: 'Teach narrative showing techniques with sensory description and dialogue.',
    commonError: {
      student_error: 'Overly summary-style telling instead of showing scene details.',
      correct_form: 'Show, don’t tell with descriptive verbs and sensory details.'
    }
  },

  // 26. Reading — Inference & Context Clues
  READING_INFERENCE: {
    diagnosis_id: 'diag_reading_inference',
    category: 'Reading',
    skill: 'reading_comprehension',
    subskill: 'inference_and_context_clues',
    topic: 'Reading Comprehension',
    displayName: 'Reading Comprehension — Inference & Context Clues',
    specific_problem: 'Students select literal surface answers when implicit deduction from context is required.',
    teachAction: 'Model how to use textual clues to deduce implicit meanings and author intention.',
    recommended_teaching: 'Model how to use textual context clues to deduce implicit meaning.',
    commonError: {
      student_error: 'Selecting literal answers when implicit inference was asked.',
      correct_form: 'Use contextual evidence clues from surrounding sentences.'
    }
  },

  // 27. Reading — Factual Recall
  READING_FACTUAL: {
    diagnosis_id: 'diag_reading_factual',
    category: 'Reading',
    skill: 'reading_comprehension',
    subskill: 'factual_recall_and_scanning',
    topic: 'Reading Comprehension',
    displayName: 'Reading Comprehension — Factual Recall',
    specific_problem: 'Students miss key explicit details or facts directly stated in the passage.',
    teachAction: 'Practice scanning techniques to locate explicit facts, dates, and core concepts.',
    recommended_teaching: 'Practice scanning techniques to locate explicit facts, dates, and keywords.',
    commonError: {
      student_error: 'Missing key factual details stated directly in the text.',
      correct_form: 'Scan for keywords and cross-reference with question stems.'
    }
  }
};

/**
 * Common high-frequency spelling patterns lookup map
 */
export const HIGH_FREQUENCY_SPELLING_MAP = {
  becouse: 'because',
  beacuse: 'because',
  beause: 'because',
  beautifull: 'beautiful',
  beutiful: 'beautiful',
  diferent: 'different',
  diffrent: 'different',
  recieve: 'receive',
  untill: 'until',
  tommorow: 'tomorrow',
  tomorow: 'tomorrow',
  wich: 'which',
  freind: 'friend',
  definately: 'definitely',
  definitly: 'definitely',
  seperate: 'separate',
  begining: 'beginning',
  succesfull: 'successful',
  enviroment: 'environment',
  embarass: 'embarrass',
  goverment: 'government',
  necesary: 'necessary',
  alot: 'a lot',
  truely: 'truly',
  writting: 'writing'
};

/**
 * Sanitizes input string to prevent raw JSON, session IDs, final_rank,
 * and activity result metadata from leaking into concept names.
 * @param {string} str 
 * @returns {string} Clean string without JSON or session artifacts
 */
export function sanitizeConceptInput(str) {
  if (!str || typeof str !== 'string') return '';

  let cleaned = str;

  // 1. If string is or contains JSON object/array, strip it
  cleaned = cleaned.replace(/\{[\s\S]*?\}/g, ' ');
  cleaned = cleaned.replace(/\[[\s\S]*?\]/g, ' ');

  // 2. Strip common raw metadata field names & values
  cleaned = cleaned.replace(/"?(?:final_rank|session_id|sessionId|wrong_count|correct_count|total_questions|points_awarded|accuracy_percentage)"?\s*:\s*[^,\}\]]+/gi, ' ');

  // 3. Strip braces, brackets, quotes, escapes
  cleaned = cleaned.replace(/[{}\[\]\\"]/g, ' ');

  // 4. Strip boilerplate assessment prefixes
  cleaned = cleaned.replace(/^(?:Unit Test on the|Unit Test on|Quiz on|Assessment:|Test on|Classroom Activity|Live Quiz Session)\s*/gi, ' ');

  // 5. Clean whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes any freeform text, activity title, raw topic, or rubric criterion
 * into a single canonical pedagogical concept.
 *
 * Excludes raw JSON, session IDs, and general trivia quizzes.
 *
 * @param {string} rawString - Any combination of title, topic, rubric, error text
 * @param {string} [categoryHint] - Optional category hint ('Grammar', 'Spelling', 'Writing', etc.)
 * @returns {typeof CANONICAL_CONCEPTS[keyof typeof CANONICAL_CONCEPTS] | null}
 */
export function normalizeConcept(rawString, categoryHint = '') {
  if (!rawString && !categoryHint) return null;

  const sanitized = sanitizeConceptInput(rawString);
  const combined = `${sanitized} ${categoryHint || ''}`.toLowerCase().trim();
  if (!combined || combined.length < 2) return null;

  // Reject raw metadata strings or session IDs
  if (/session[-_]?id|final[-_]?rank|wrong[-_]?count|correct[-_]?count|points[-_]?awarded|[0-9a-f]{8}-[0-9a-f]{4}/i.test(combined)) {
    return null;
  }

  // Reject general trivia / non-curriculum quizzes from creating curriculum concepts
  if (/general\s*knowledge|trivia|entertainment|fun\s*quiz|pub\s*quiz|movie\s*quiz|world\s*capitals/i.test(combined)) {
    return null;
  }

  // 1. There is / There are (Singular vs Plural)
  if (
    /there\s*is[\s/]+there\s*are|there\s*is\s*vs\s*there\s*are|there\s*is\s*five|there\s*is\s*many|there\s*are\s*vs\s*there\s*is/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.THERE_IS_THERE_ARE;
  }

  // 2. Prepositions at / in / on
  if (
    /at[\s/]+in[\s/]+on|in[\s/]+on[\s/]+at|preposition.*(?:time|place|at|in|on)|(?:in|at|on)\s+(?:7\s*o['’]clock|monday|morning|the evening|june)/i.test(combined) ||
    (/preposition/i.test(combined) && !/conjunction/i.test(combined))
  ) {
    return CANONICAL_CONCEPTS.PREPOSITIONS_TIME_PLACE;
  }

  // 3. Simple Present Third Person Singular (-s / -es)
  if (
    /(?:simple\s*present|present\s*simple).*(?:third\s*person|3rd\s*person|singular\s*subject|verb-s|-es|missing\s*-s)/i.test(combined) ||
    /(?:he\/she\/it|third\s*person\s*singular|he\s*work|she\s*take|mother\s*take|father\s*work|she\s*help)/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_THIRD_PERSON;
  }

  // 4. Simple Present Negative (don't / doesn't)
  if (
    /(?:simple\s*present|present\s*simple).*(?:negative|don'?t|doesn'?t|not\s+like|not\s+play)/i.test(combined) ||
    /(?:don'?t\s*\/\s*doesn'?t|do\s*not\s*\/\s*does\s*not|negative\s*present\s*tense|does\s*not\s*like|do\s*not\s*like|doesn'?t|don'?t)/i.test(combined) ||
    (/negative\s*form/i.test(combined) && /present/i.test(combined))
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_NEGATIVE;
  }

  // 5. Simple Present General / Affirmative
  if (/simple\s*present|present\s*simple/i.test(combined)) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_AFFIRMATIVE;
  }

  // 6. Simple Past Negative (didn't + base)
  if (
    /(?:simple\s*past|past\s*simple).*(?:negative|didn'?t|did\s*not)/i.test(combined) ||
    /didn'?t\s*\+\s*verb|did\s*not\s*\+\s*base|didn'?t\s*went|didn'?t\s*saw/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_NEGATIVE;
  }

  // 7. Simple Past Regular & Irregular Verb Forms
  if (
    /(?:simple\s*past|past\s*simple|past\s*tense|regular\s*past|irregular\s*past|eated|goed)/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_FORMS;
  }

  // 8. Past Continuous
  if (/past\s*continuous|past\s*progressive|was.*reading|were.*playing/i.test(combined)) {
    return CANONICAL_CONCEPTS.PAST_CONTINUOUS;
  }

  // 9. Subject–Verb Agreement (General)
  if (
    /subject[- ]*verb\s*agreement|subject\s*verb\s*concord|singular\s*subject|plural\s*subject|concord/i.test(combined) ||
    /friends\s*likes|it\s*give|hobby\s*are/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SUBJECT_VERB_AGREEMENT;
  }

  // 10. Be Verbs
  if (/be\s*verbs?|am,\s*is,\s*are|was,\s*were|am\s*\/\s*is\s*\/\s*are/i.test(combined)) {
    return CANONICAL_CONCEPTS.BE_VERBS;
  }

  // 11. Conjunctions
  if (/conjunction|connecting\s*clauses|and\s*but\s*so\s*or|coordinating\s*conjunction/i.test(combined)) {
    return CANONICAL_CONCEPTS.CONJUNCTIONS_CLAUSES;
  }

  // 12. Articles & Determiners
  if (/articles?|determiners?|a\s*\/\s*an\s*\/\s*the|indefinite\s*article|definite\s*article/i.test(combined)) {
    return CANONICAL_CONCEPTS.ARTICLES_DETERMINERS;
  }

  // 13. Sentence Mechanics / Word Order
  if (/sentence\s*structure|sentence\s*mechanics|word\s*order|syntax|punctuation/i.test(combined)) {
    return CANONICAL_CONCEPTS.SENTENCE_MECHANICS;
  }

  // 14. Vocabulary — borrow vs lend
  if (/borrow.*lend|lend.*borrow|borrow\s*me/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_BORROW_LEND;
  }

  // 15. Vocabulary — say vs tell
  if (/say.*tell|tell.*say|said\s*me/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_SAY_TELL;
  }

  // 16. Vocabulary — make vs do
  if (/make.*do|do.*make|made\s*homework/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_MAKE_DO;
  }

  // 17. Vocabulary — General / Word Choice
  if (/vocabulary|word\s*choice|word\s*precision|confused\s*words/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_CONTEXT;
  }

  // 18. Spelling — Homophones
  if (/their.*there|they'?re|homophones?|its.*it'?s/i.test(combined)) {
    return CANONICAL_CONCEPTS.SPELLING_HOMOPHONES;
  }

  // 19. Spelling — Double Consonants
  if (/double\s*consonant|cvc|runing|swiming|droped/i.test(combined)) {
    return CANONICAL_CONCEPTS.SPELLING_DOUBLE_CONSONANTS;
  }

  // 20. Spelling — Specific Word or General
  if (/spelling|orthography|becouse|recieve|beautifull|diferent/i.test(combined)) {
    return CANONICAL_CONCEPTS.SPELLING_COMMON_ERRORS;
  }

  // 21. Writing — Topic Sentences
  if (/topic\s*sentence|missing\s*topic|opening\s*sentence/i.test(combined)) {
    return CANONICAL_CONCEPTS.PARAGRAPH_TOPIC_SENTENCES;
  }

  // 22. Writing — Paragraph Organization
  if (/paragraph|paragraph\s*flow|paragraph\s*organization|rainy\s*day|favourite\s*hobby/i.test(combined)) {
    return CANONICAL_CONCEPTS.PARAGRAPH_ORGANIZATION;
  }

  // 23. Writing — Sentence Variety
  if (/sentence\s*variety|repetitive\s*openings|repetitive\s*sentences/i.test(combined)) {
    return CANONICAL_CONCEPTS.SENTENCE_VARIETY;
  }

  // 24. Writing — Essay Structure
  if (/essay|essay\s*writing|thesis|importance\s*of\s*trees/i.test(combined)) {
    return CANONICAL_CONCEPTS.ESSAY_STRUCTURE;
  }

  // 25. Writing — Creative Writing
  if (/story\s*writing|creative\s*writing|narrative|mermaids|competition/i.test(combined)) {
    return CANONICAL_CONCEPTS.CREATIVE_WRITING;
  }

  // 26. Reading Comprehension
  if (/reading|comprehension|animal\s*facts|mars|factual\s*recall/i.test(combined)) {
    return /inference|context\s*clues/i.test(combined)
      ? CANONICAL_CONCEPTS.READING_INFERENCE
      : CANONICAL_CONCEPTS.READING_FACTUAL;
  }

  // Skip useless generic / placeholder terms
  if (/^(?:assignment|task|general|other|science|test|unit\s*test|homework|classwork|exam|quiz|live\s*quiz)$/i.test(combined)) {
    return null;
  }

  // Never return bare generic categories as a standalone concept
  if (/^(?:grammar|spelling|writing|vocabulary|reading)$/i.test(sanitized.toLowerCase().trim())) {
    return null;
  }

  // Clean fallback: Only accept clean, non-JSON educational titles
  if (sanitized.length < 3 || sanitized.length > 50) return null;

  return {
    diagnosis_id: `diag_custom_${sanitized.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    category: categoryHint || 'Curriculum',
    topic: sanitized,
    skill: 'Core Comprehension',
    subskill: 'foundational_concept',
    displayName: `${sanitized} — Core Concepts`,
    specific_problem: `Students show concept gaps in ${sanitized}.`,
    teachAction: `Review foundational concepts for ${sanitized} with direct examples and guided practice.`,
    recommended_teaching: `Review foundational concepts for ${sanitized} with direct examples and guided practice.`,
    commonError: null,
    commonErrors: []
  };
}

/**
 * Extracts and normalizes detected student errors from OCR, writing evaluations,
 * and text responses.
 *
 * @param {Object} ev - Learning event or submission object
 * @returns {Array<{ concept: string, error_type: string, student_error: string, correct_form: string, specific_rule?: string, student_id?: string }>}
 */
export function extractStructuredErrorsFromEvent(ev) {
  const errors = [];
  if (!ev) return errors;

  const studentId = ev.student_id || ev.studentId;

  // 1. Check metadata.detected_errors
  if (Array.isArray(ev.metadata?.detected_errors)) {
    ev.metadata.detected_errors.forEach(err => {
      if (err && (err.student_error || err.text)) {
        const studentErr = err.student_error || err.text;
        const correctForm = err.correct_form || err.suggestion || err.correction || '';
        const canonical = mapErrorToCanonicalConcept(studentErr, correctForm, err.rule || err.error_type || ev.topic);
        errors.push({
          concept: canonical ? canonical.displayName : (err.concept || 'Grammar'),
          category: canonical ? canonical.category : 'Grammar',
          skill: canonical ? canonical.skill : 'grammar',
          subskill: canonical ? canonical.subskill : 'general_rule',
          error_type: err.error_type || 'grammar',
          student_error: studentErr,
          correct_form: correctForm,
          specific_rule: err.rule || err.specific_rule || canonical?.specific_problem,
          student_id: studentId
        });
      }
    });
  }

  // 2. Check writing evaluation mistakes / grammar_errors / spelling_errors
  const wEval = ev.metadata?.writing_evaluation || ev.metadata;
  if (wEval) {
    if (Array.isArray(wEval.mistakes)) {
      wEval.mistakes.forEach(m => {
        if (m && (m.original || m.student_error)) {
          const orig = m.original || m.student_error;
          const corr = m.correction || m.correct_form || '';
          const canonical = mapErrorToCanonicalConcept(orig, corr, m.explanation || wEval.topic || ev.topic);
          errors.push({
            concept: canonical ? canonical.displayName : (wEval.topic || 'Grammar'),
            category: canonical ? canonical.category : 'Grammar',
            skill: canonical ? canonical.skill : 'grammar',
            subskill: canonical ? canonical.subskill : 'general_rule',
            error_type: m.error_type || 'grammar',
            student_error: orig,
            correct_form: corr,
            specific_rule: m.explanation || canonical?.specific_problem,
            student_id: studentId
          });
        }
      });
    }

    if (Array.isArray(wEval.grammar_errors)) {
      wEval.grammar_errors.forEach(ge => {
        if (ge && (ge.text || ge.student_error)) {
          const orig = ge.text || ge.student_error;
          const corr = ge.suggestion || ge.correction || '';
          const canonical = mapErrorToCanonicalConcept(orig, corr, ge.rule || ge.text);
          errors.push({
            concept: canonical ? canonical.displayName : (ge.rule || 'Grammar'),
            category: canonical ? canonical.category : 'Grammar',
            skill: canonical ? canonical.skill : 'grammar',
            subskill: canonical ? canonical.subskill : 'general_rule',
            error_type: 'grammar',
            student_error: orig,
            correct_form: corr,
            specific_rule: ge.rule || canonical?.specific_problem,
            student_id: studentId
          });
        }
      });
    }

    if (Array.isArray(wEval.spelling_errors)) {
      wEval.spelling_errors.forEach(se => {
        if (se && (se.text || se.misspelled_word || se.student_error)) {
          const orig = se.text || se.misspelled_word || se.student_error;
          const corr = se.suggestion || se.correct_word || se.correction || HIGH_FREQUENCY_SPELLING_MAP[orig.toLowerCase().trim()] || '';
          const wordKey = corr || orig;
          errors.push({
            concept: `Spelling — "${wordKey}"`,
            category: 'Spelling',
            skill: 'spelling',
            subskill: `spelling_${wordKey.toLowerCase()}`,
            error_type: 'spelling',
            student_error: orig,
            correct_form: corr,
            specific_rule: `Spelling pattern for "${wordKey}"`,
            student_id: studentId,
            target_word: wordKey
          });
        }
      });
    }
  }

  // 3. Inspect raw text / ocr_text for signature high-frequency error patterns if not already extracted
  const rawText = ev.metadata?.ocr_text || ev.metadata?.text_response || ev.metadata?.original_text || '';
  if (rawText && typeof rawText === 'string' && errors.length === 0) {
    const textLower = rawText.toLowerCase();

    // Check specific third-person singular errors
    const s3Match = textLower.match(/\b(?:he|she|my father|my mother)\s+(work|take|help|play|live|go)\b/i);
    if (s3Match) {
      const v = s3Match[1];
      const correctV = v === 'go' ? 'goes' : `${v}s`;
      errors.push({
        concept: CANONICAL_CONCEPTS.SIMPLE_PRESENT_THIRD_PERSON.displayName,
        category: 'Grammar',
        skill: 'subject_verb_agreement',
        subskill: 'simple_present_third_person',
        error_type: 'grammar',
        student_error: s3Match[0],
        correct_form: s3Match[0].replace(v, correctV),
        specific_rule: 'Third-person singular -s/-es requirement in Simple Present',
        student_id: studentId
      });
    }

    // Check "there is" plural error
    const thereIsMatch = textLower.match(/\bthere is\s+(?:five|many|three|four|two|several|a lot of)\b/i);
    if (thereIsMatch) {
      errors.push({
        concept: CANONICAL_CONCEPTS.THERE_IS_THERE_ARE.displayName,
        category: 'Grammar',
        skill: 'subject_verb_agreement',
        subskill: 'there_is_there_are_agreement',
        error_type: 'grammar',
        student_error: thereIsMatch[0],
        correct_form: thereIsMatch[0].replace(/there is/i, 'there are'),
        specific_rule: 'Plural concord with there is / there are',
        student_id: studentId
      });
    }

    // Check high-frequency spelling words in text
    for (const [misspelled, correct] of Object.entries(HIGH_FREQUENCY_SPELLING_MAP)) {
      const regex = new RegExp(`\\b${misspelled}\\b`, 'i');
      if (regex.test(textLower)) {
        errors.push({
          concept: `Spelling — "${correct}"`,
          category: 'Spelling',
          skill: 'spelling',
          subskill: `spelling_${correct}`,
          error_type: 'spelling',
          student_error: misspelled,
          correct_form: correct,
          specific_rule: `Spelling pattern for "${correct}"`,
          student_id: studentId,
          target_word: correct
        });
      }
    }

    // Check borrow vs lend
    if (/\bborrow\s+me\b/i.test(textLower)) {
      errors.push({
        concept: CANONICAL_CONCEPTS.VOCABULARY_BORROW_LEND.displayName,
        category: 'Vocabulary',
        skill: 'vocabulary',
        subskill: 'borrow_vs_lend_confusion',
        error_type: 'vocabulary',
        student_error: 'borrow me',
        correct_form: 'lend me',
        specific_rule: 'Directional usage of borrow vs lend',
        student_id: studentId
      });
    }
  }

  return errors;
}

/**
 * Maps a specific student error string and correction to its most precise canonical concept.
 */
export function mapErrorToCanonicalConcept(studentError = '', correctForm = '', hint = '') {
  const combined = `${studentError} ${correctForm} ${hint}`.toLowerCase();

  // There is / There are
  if (/there is.*(?:five|many|three|four|members|books)|there are.*vs.*there is/i.test(combined)) {
    return CANONICAL_CONCEPTS.THERE_IS_THERE_ARE;
  }

  // Simple Present Third-Person Singular
  if (
    /(?:he|she|mother|father|it)\s+(?:work|take|help|go|play|live)\b/i.test(studentError) ||
    /third\s*person|missing\s*-s|-s\s*ending|singular\s*verb/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_THIRD_PERSON;
  }

  // Simple Past Negative (didn't went)
  if (/didn'?t\s+(?:went|saw|ate|played)/i.test(studentError) || /didn'?t\s*\+\s*base/i.test(combined)) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_NEGATIVE;
  }

  // Simple Past Forms (eated -> ate)
  if (/eated|goed|seed/i.test(studentError) || /irregular\s*past/i.test(combined)) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_FORMS;
  }

  // Prepositions in / on / at
  if (/(?:in|on|at)\s+(?:7\s*o['’]clock|monday|morning|the room)/i.test(combined) || /preposition/i.test(hint)) {
    return CANONICAL_CONCEPTS.PREPOSITIONS_TIME_PLACE;
  }

  // Vocabulary borrow vs lend
  if (/borrow\s*me|lend\s*me/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_BORROW_LEND;
  }

  // Vocabulary say vs tell
  if (/said\s*me|told\s*me/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_SAY_TELL;
  }

  // Spelling specific words
  for (const [misspelled, correct] of Object.entries(HIGH_FREQUENCY_SPELLING_MAP)) {
    if (studentError.toLowerCase().includes(misspelled) || correctForm.toLowerCase() === correct) {
      return {
        diagnosis_id: `diag_spelling_${correct}`,
        category: 'Spelling',
        skill: 'spelling',
        subskill: `spelling_${correct}`,
        topic: 'Spelling',
        displayName: `Spelling — "${correct}"`,
        specific_problem: `Students repeatedly misspell "${correct}" as "${misspelled}".`,
        teachAction: `Teach the spelling pattern in "${correct}" and use short retrieval practice in complete sentences.`,
        recommended_teaching: `Teach the spelling pattern in "${correct}" using short retrieval practice.`,
        commonError: { student_error: misspelled, correct_form: correct },
        commonErrors: [{ student_error: misspelled, correct_form: correct }]
      };
    }
  }

  return normalizeConcept(hint || studentError);
}
