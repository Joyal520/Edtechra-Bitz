// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CONCEPT NORMALIZATION & DIAGNOSTIC ENGINE
// Normalizes and deduplicates educational topics into canonical pedagogical concepts.
// Distinguishes specific subskills (Simple Past subskills, Object Pronouns,
// Modal Verbs can vs could, Preposition "at", Preposition "on", Preposition "in",
// Articles a/an/the, Subject-Verb Agreement, Spelling, Vocabulary, Writing, Reading).
// ============================================================================

/**
 * Configurable Class Performance Distribution Thresholds
 */
export const CLASS_PERFORMANCE_THRESHOLDS = {
  excellent: {
    key: 'excellent',
    label: 'Excellent',
    min: 85,
    max: 100,
    color: '#10B981',
    description: '85% – 100% normalized score across completed assessments'
  },
  good: {
    key: 'good',
    label: 'Good',
    min: 70,
    max: 84.99,
    color: '#3B82F6',
    description: '70% – 84.99% normalized score across completed assessments'
  },
  pretty: {
    key: 'pretty',
    label: 'Pretty',
    min: 50,
    max: 69.99,
    color: '#F59E0B',
    description: '50% – 69.99% normalized score across completed assessments'
  },
  bad: {
    key: 'bad',
    label: 'Bad',
    min: 0,
    max: 49.99,
    color: '#EF4444',
    description: 'Below 50% normalized score across completed assessments'
  }
};

/**
 * Classifies a student's normalized percentage into one of the four performance bands,
 * or 'unclassified' when the student has no completed scored assessments.
 * @param {number|null|undefined} avgScore
 * @param {number} completedAssessmentCount
 * @returns {'excellent'|'good'|'pretty'|'bad'|'unclassified'}
 */
export function classifyStudentPerformanceBand(avgScore, completedAssessmentCount = 0) {
  if (
    completedAssessmentCount < 1 ||
    avgScore === null ||
    avgScore === undefined ||
    Number.isNaN(Number(avgScore))
  ) {
    return 'unclassified';
  }
  const score = Math.max(0, Math.min(100, Number(avgScore)));
  if (score >= CLASS_PERFORMANCE_THRESHOLDS.excellent.min) return 'excellent';
  if (score >= CLASS_PERFORMANCE_THRESHOLDS.good.min) return 'good';
  if (score >= CLASS_PERFORMANCE_THRESHOLDS.pretty.min) return 'pretty';
  return 'bad';
}

/**
 * Standard Canonical Concepts Dictionary
 * Covers all required specific grammatical, lexical, orthographic, reading, and writing subskills.
 */
export const CANONICAL_CONCEPTS = {
  // 1. Grammar — Simple Present Third Person Singular
  SIMPLE_PRESENT_THIRD_PERSON: {
    diagnosis_id: 'diag_grammar_simple_present_third_person',
    category: 'Grammar',
    skill: 'subject_verb_agreement',
    subskill: 'simple_present_third_person',
    topic: 'Subject–Verb Agreement',
    displayName: 'Simple Present — Third-Person Singular "-s / -es"',
    specific_problem: 'Students omit -s or -es on main verbs after third-person singular subjects (he/she/it) in the Simple Present tense.',
    teachAction: 'Contrast I/you/we/they + base verb against he/she/it + verb-s/-es using side-by-side sentence transformation frames.',
    recommended_teaching: 'Teach Simple Present third-person singular subject–verb agreement (-s/-es after he/she/it) using contrast sentence frames.',
    follow_up_activity: 'Complete a 6-sentence daily routine transformation drill converting "I" sentences into "He/She" sentences.',
    reassessment_method: 'Give a 5-question exit check requiring students to choose or write the correct verb form after singular vs. plural subjects.',
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
    topic: 'Subject–Verb Agreement',
    displayName: 'There is / There are — Singular vs. Plural Concord',
    specific_problem: 'Students use singular "there is" before plural countable nouns instead of "there are".',
    teachAction: 'Practice identifying the head noun after the blank (singular vs. plural count noun) to select "there is" or "there are".',
    recommended_teaching: 'Practice choosing "there is" for singular nouns and "there are" for plural nouns using classroom description frames.',
    follow_up_activity: 'Students write 6 descriptive sentences about a classroom picture (3 using "There is a/an..." and 3 using "There are...").',
    reassessment_method: 'Run a 5-item multiple-choice and fill-in-the-blank check mixing singular, plural, and number-quantified nouns.',
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
    displayName: 'Subject–Verb Agreement — Plural & Compound Subjects',
    specific_problem: 'Students attach singular -s verb endings to plural subjects or mismatch verb number with compound subjects.',
    teachAction: 'Review singular vs. plural subject–verb concord by underlining the subject number before selecting the verb form.',
    recommended_teaching: 'Review singular vs. plural subject–verb concord with subject-identification and error-correction exercises.',
    follow_up_activity: 'Pair error-spotting worksheet where students underline the subject, mark it S or P, and correct mismatched verbs.',
    reassessment_method: 'Administer a 5-item sentence correction check featuring plural nouns and compound subjects.',
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
    skill: 'simple_present',
    subskill: 'negative_forms',
    topic: 'Simple Present',
    displayName: 'Simple Present — Negative Forms (don’t / doesn’t + base verb)',
    specific_problem: 'Students use "don’t" with third-person singular subjects or keep the -s ending on the main verb after "doesn’t".',
    teachAction: 'Teach the rule that "does/doesn’t" absorbs the -s marker, requiring the main verb to return to its base form.',
    recommended_teaching: 'Teach forming negative sentences in the Simple Present using do/does + not + base verb.',
    follow_up_activity: 'Convert 6 affirmative third-person sentences (e.g., "She plays tennis") into negative form ("She doesn’t play tennis").',
    reassessment_method: 'Check mastery with a 5-question mini-quiz targeting "don’t vs. doesn’t" and base verbs after "doesn’t".',
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
    displayName: 'Simple Present — Question Formation (Do / Does + Subject + Base Verb)',
    specific_problem: 'Students omit auxiliary "do/does" or invert word order when forming Simple Present questions.',
    teachAction: 'Model the Do/Does + Subject + Base Verb question formula and contrast it with statement word order.',
    recommended_teaching: 'Review Simple Present question formation with do/does + subject + base verb.',
    follow_up_activity: 'Partner interview activity where students write and ask 5 Wh- and Yes/No questions using do/does.',
    reassessment_method: '5-item question-reordering and auxiliary-selection check.',
    commonError: {
      student_error: 'Where she live?',
      correct_form: 'Where does she live?'
    }
  },

  // 6A. Grammar — Simple Past: Base/Present Verb Substitution for Completed Past Actions
  SIMPLE_PAST_BASE_SUBSTITUTION: {
    diagnosis_id: 'diag_grammar_simple_past_base_substitution',
    category: 'Grammar',
    skill: 'simple_past',
    subskill: 'simple_past_vs_present_completed_actions',
    topic: 'Simple Past Tense',
    displayName: 'Simple Past Tense — Using Base/Present Form for Completed Past Actions',
    specific_problem: 'Students incorrectly use the base form or Simple Present form instead of the Simple Past form when describing completed actions with past time markers (e.g., yesterday, last night, ago).',
    teachAction: 'Review past time signals (yesterday, last week, two days ago) and model shifting present/base verbs into Simple Past forms for completed events.',
    recommended_teaching: 'Teach students to identify past time markers (yesterday, last week, ago) and convert base/present verbs into Simple Past forms for completed actions.',
    follow_up_activity: 'Give a 6-sentence timeline rewriting task where students convert "Every day..." sentences into "Yesterday..." sentences.',
    reassessment_method: 'Administer a 6-question cloze check mixing present habit markers (every day) and past completion markers (yesterday, last night).',
    commonError: {
      student_error: 'Yesterday I go to the market and buy fruit.',
      correct_form: 'Yesterday I went to the market and bought fruit.'
    },
    commonErrors: [
      { student_error: 'Yesterday I go to school early.', correct_form: 'Yesterday I went to school early.' },
      { student_error: 'Last night she watch a movie.', correct_form: 'Last night she watched a movie.' },
      { student_error: 'They visit their grandmother last weekend.', correct_form: 'They visited their grandmother last weekend.' }
    ]
  },

  // 6B. Grammar — Simple Past: Regular -ed Verb Formation
  SIMPLE_PAST_REGULAR_ED: {
    diagnosis_id: 'diag_grammar_simple_past_regular_ed',
    category: 'Grammar',
    skill: 'simple_past',
    subskill: 'regular_ed_past_forms',
    topic: 'Simple Past Tense',
    displayName: 'Simple Past Tense — Regular "-ed" Verb Formation',
    specific_problem: 'Students omit the "-ed" past suffix or misapply spelling rules (consonant + y → -ied, CVC doubling) on regular verbs in the Simple Past.',
    teachAction: 'Explicitly teach the three regular Simple Past spelling rules (+ed, e + d, consonant + y → ied, CVC double consonant + ed).',
    recommended_teaching: 'Teach regular Simple Past "-ed" formation and spelling rules (walk → walked, study → studied, stop → stopped).',
    follow_up_activity: 'Sorting and sentence-completion drill with 9 regular verbs across the three spelling categories (-ed, -ied, doubled consonant).',
    reassessment_method: '5-item past-tense verb transformation check testing regular -ed spelling patterns.',
    commonError: {
      student_error: 'She studyed hard and walk home yesterday.',
      correct_form: 'She studied hard and walked home yesterday.'
    },
    commonErrors: [
      { student_error: 'He walk to the station yesterday.', correct_form: 'He walked to the station yesterday.' },
      { student_error: 'She studyed for the exam.', correct_form: 'She studied for the exam.' },
      { student_error: 'The bus stoped at the corner.', correct_form: 'The bus stopped at the corner.' }
    ]
  },

  // 6C. Grammar — Simple Past: Irregular Past Tense Verb Forms
  SIMPLE_PAST_IRREGULAR: {
    diagnosis_id: 'diag_grammar_simple_past_forms',
    category: 'Grammar',
    skill: 'simple_past',
    subskill: 'irregular_past_verb_forms',
    topic: 'Simple Past Tense',
    displayName: 'Simple Past Tense — Irregular Past Verb Forms',
    specific_problem: 'Students overgeneralize the regular "-ed" ending onto irregular verbs (e.g., goed, eated, buyed) or use the wrong irregular stem in the Simple Past.',
    teachAction: 'Contrast regular "-ed" verbs with high-frequency irregular verb pairs (go → went, eat → ate, see → saw, buy → bought, take → took) using retrieval cards.',
    recommended_teaching: 'Practice high-frequency irregular Simple Past verb forms (go → went, see → saw, eat → ate, buy → bought) in context.',
    follow_up_activity: 'Complete a 6-item story gap-fill requiring students to supply the irregular Simple Past form of bracketed base verbs.',
    reassessment_method: 'Run a 6-question check mixing regular verbs and common irregular verbs (go, eat, see, buy, take, come).',
    commonError: {
      student_error: 'They eated dinner early and goed home.',
      correct_form: 'They ate dinner early and went home.'
    },
    commonErrors: [
      { student_error: 'They eated dinner early.', correct_form: 'They ate dinner early.' },
      { student_error: 'I goed to school yesterday.', correct_form: 'I went to school yesterday.' },
      { student_error: 'She buyed a new book.', correct_form: 'She bought a new book.' }
    ]
  },

  // 6D. Grammar — Simple Past: Alias kept for backward compatibility
  get SIMPLE_PAST_FORMS() {
    return this.SIMPLE_PAST_IRREGULAR;
  },

  // 7. Grammar — Simple Past Negative (did not / didn't + base verb)
  SIMPLE_PAST_NEGATIVE: {
    diagnosis_id: 'diag_grammar_simple_past_negative',
    category: 'Grammar',
    skill: 'simple_past',
    subskill: 'negative_past_forms',
    topic: 'Simple Past Tense',
    displayName: 'Simple Past Tense — Negative Forms ("didn’t" + Base Verb)',
    specific_problem: 'Students double-mark the past tense by using a past-tense verb after "did not / didn’t" instead of returning to the base verb.',
    teachAction: 'Demonstrate that "did" already carries the past tense marker, so the main verb after "did not / didn’t" must always be in the base form.',
    recommended_teaching: 'Teach forming negative sentences in the Simple Past using did not / didn’t + base verb.',
    follow_up_activity: 'Sentence correction and transformation drill converting 6 affirmative Simple Past sentences into negative "didn’t + base verb" sentences.',
    reassessment_method: '5-item error-identification and fill-in-the-blank quiz on "didn’t + base verb".',
    commonError: {
      student_error: "He didn't went to the park.",
      correct_form: "He didn't go to the park."
    },
    commonErrors: [
      { student_error: "He didn't went to the park.", correct_form: "He didn't go to the park." },
      { student_error: "I didn't saw him yesterday.", correct_form: "I didn't see him yesterday." },
      { student_error: "She did not watched TV.", correct_form: "She did not watch TV." }
    ]
  },

  // 7B. Grammar — Simple Past Questions (Did + subject + base verb)
  SIMPLE_PAST_QUESTIONS: {
    diagnosis_id: 'diag_grammar_simple_past_questions',
    category: 'Grammar',
    skill: 'simple_past',
    subskill: 'question_past_forms',
    topic: 'Simple Past Tense',
    displayName: 'Simple Past Tense — Question Formation ("Did" + Subject + Base Verb)',
    specific_problem: 'Students use a past-tense verb after auxiliary "Did" (e.g., "Did you went?") or omit "Did" when forming Simple Past questions.',
    teachAction: 'Model the "Did + subject + base verb?" structure and contrast it with affirmative past statements.',
    recommended_teaching: 'Teach Simple Past question formation using Did + subject + base form of the verb.',
    follow_up_activity: 'Students write 5 past-tense interview questions for a classmate using "Did you + base verb...?" and record answers.',
    reassessment_method: '5-item question transformation check converting past statements into "Did...?" questions.',
    commonError: {
      student_error: 'Did you went to the library yesterday?',
      correct_form: 'Did you go to the library yesterday?'
    },
    commonErrors: [
      { student_error: 'Did you went to the library yesterday?', correct_form: 'Did you go to the library yesterday?' },
      { student_error: 'Where did she bought that dress?', correct_form: 'Where did she buy that dress?' }
    ]
  },

  // 8. Grammar — Object Pronouns (me, him, her, us, them)
  OBJECT_PRONOUNS: {
    diagnosis_id: 'diag_grammar_object_pronouns',
    category: 'Grammar',
    skill: 'object_pronouns',
    subskill: 'subject_vs_object_pronouns',
    topic: 'Pronouns',
    displayName: 'Object Pronouns — Using "me / him / her / us / them" After Verbs & Prepositions',
    specific_problem: 'Students use subject pronouns (I, he, she, we, they) instead of object pronouns (me, him, her, us, them) in object position after verbs or prepositions.',
    teachAction: 'Contrast subject pronouns (before the verb: I, he, she, we, they) with object pronouns (after the verb or preposition: me, him, her, us, them) using sentence-slot charts.',
    recommended_teaching: 'Teach the distinction between subject pronouns (before the verb) and object pronouns (me, him, her, us, them after verbs and prepositions).',
    follow_up_activity: 'Complete a 6-sentence pronoun replacement exercise replacing underlined noun phrases after verbs and prepositions (to, with, for) with object pronouns.',
    reassessment_method: 'Administer a 5-question multiple-choice check contrasting subject vs. object pronouns after action verbs and prepositions.',
    commonError: {
      student_error: 'The teacher gave he a book and spoke to they.',
      correct_form: 'The teacher gave him a book and spoke to them.'
    },
    commonErrors: [
      { student_error: 'She called I yesterday.', correct_form: 'She called me yesterday.' },
      { student_error: 'The teacher helped he with the task.', correct_form: 'The teacher helped him with the task.' },
      { student_error: 'Can you come with we?', correct_form: 'Can you come with us?' },
      { student_error: 'I saw she at the library.', correct_form: 'I saw her at the library.' }
    ]
  },

  // 9. Grammar — Modal Verbs: "can" vs "could"
  MODAL_CAN_VS_COULD: {
    diagnosis_id: 'diag_grammar_modal_can_vs_could',
    category: 'Grammar',
    skill: 'modal_verbs_can_could',
    subskill: 'can_vs_could_usage_and_base_verb',
    topic: 'Modal Verbs (can / could)',
    displayName: 'Modal Verbs — "can" vs. "could" (Present vs. Past Ability & Polite Requests)',
    specific_problem: 'Students confuse present ability "can" with past ability/polite request "could", or use an inflected verb / "to + verb" instead of the base verb after "can / could".',
    teachAction: 'Clarify when to use "can" (present ability/permission) vs. "could" (past ability and polite requests), and reinforce the rule "can/could + base verb (without to or -ed/-s)".',
    recommended_teaching: 'Teach the distinction between "can" (present ability) and "could" (past ability / polite requests) followed by a base verb.',
    follow_up_activity: 'Complete a 6-item contrast worksheet comparing "Now I can..." vs. "When I was five, I could..." and writing polite requests with "Could you...?".',
    reassessment_method: 'Give a 5-item cloze and error-correction check testing "can" vs. "could" in past contexts, polite requests, and base-verb complements.',
    commonError: {
      student_error: 'When I was five, I can swim fast.',
      correct_form: 'When I was five, I could swim fast.'
    },
    commonErrors: [
      { student_error: 'When I was young, I can run very fast.', correct_form: 'When I was young, I could run very fast.' },
      { student_error: 'She can plays the piano.', correct_form: 'She can play the piano.' },
      { student_error: 'He could swam across the river.', correct_form: 'He could swim across the river.' },
      { student_error: 'I can to speak English.', correct_form: 'I can speak English.' }
    ]
  },

  // 10A. Grammar — Preposition "at" (Clock Times & Specific Points/Locations)
  PREPOSITION_AT: {
    diagnosis_id: 'diag_grammar_preposition_at',
    category: 'Grammar',
    skill: 'preposition_at',
    subskill: 'preposition_at_time_and_point',
    topic: 'Prepositions (at / on / in)',
    displayName: 'Preposition "at" — Clock Times & Specific Points/Locations',
    specific_problem: 'Students use "in" or "on" instead of "at" before exact clock times (e.g., at 7 o’clock, at noon, at night) and specific points or locations (e.g., at the bus stop, at school, at the door).',
    teachAction: 'Teach the rule that "at" targets a precise clock time (at 7:30, at noon, at night) or a specific point/institution (at the bus stop, at home, at school).',
    recommended_teaching: 'Explicitly teach preposition "at" for exact clock times (at 7 o’clock, at night) and specific points/locations (at the station, at school).',
    follow_up_activity: 'Students complete 6 schedule and location sentences selecting between "at", "on", and "in" with clock times and specific meeting points.',
    reassessment_method: 'Run a 5-question check focusing on clock times, "at night/noon", and specific point locations.',
    commonError: {
      student_error: 'I wake up in 7 o’clock and wait on the bus stop.',
      correct_form: 'I wake up at 7 o’clock and wait at the bus stop.'
    },
    commonErrors: [
      { student_error: 'I wake up in 7 o’clock.', correct_form: 'I wake up at 7 o’clock.' },
      { student_error: 'The train arrives on 3:30 PM.', correct_form: 'The train arrives at 3:30 PM.' },
      { student_error: 'She is waiting in the bus stop.', correct_form: 'She is waiting at the bus stop.' }
    ]
  },

  // 10B. Grammar — Preposition "on" (Days, Dates & Surfaces)
  PREPOSITION_ON: {
    diagnosis_id: 'diag_grammar_preposition_on',
    category: 'Grammar',
    skill: 'preposition_on',
    subskill: 'preposition_on_days_dates_surfaces',
    topic: 'Prepositions (at / on / in)',
    displayName: 'Preposition "on" — Days of the Week, Specific Dates & Surfaces',
    specific_problem: 'Students use "in" or "at" instead of "on" before days of the week (e.g., on Monday), calendar dates (e.g., on May 5th), and physical surfaces (e.g., on the table, on the wall).',
    teachAction: 'Teach that "on" is used for days and dates containing a day (on Monday, on Friday morning, on July 12th) as well as flat surfaces (on the desk, on the wall).',
    recommended_teaching: 'Teach preposition "on" for days of the week (on Monday), specific dates (on June 1st), and surfaces (on the table).',
    follow_up_activity: 'Weekly planner gap-fill activity where students write 6 sentences about events on specific days, dates, and classroom surfaces using "on".',
    reassessment_method: '5-item fill-in-the-blank exit ticket contrasting days/dates/surfaces ("on") against clock times ("at") and months ("in").',
    commonError: {
      student_error: 'We have English class at Monday and my birthday is in May 10th.',
      correct_form: 'We have English class on Monday and my birthday is on May 10th.'
    },
    commonErrors: [
      { student_error: 'We have class at Monday.', correct_form: 'We have class on Monday.' },
      { student_error: 'The exam is in Friday.', correct_form: 'The exam is on Friday.' },
      { student_error: 'Put your book at the desk.', correct_form: 'Put your book on the desk.' }
    ]
  },

  // 10C. Grammar — Preposition "in" (Months, Years, Seasons, Time Periods & Enclosed Spaces)
  PREPOSITION_IN: {
    diagnosis_id: 'diag_grammar_preposition_in',
    category: 'Grammar',
    skill: 'preposition_in',
    subskill: 'preposition_in_months_years_enclosed_spaces',
    topic: 'Prepositions (at / on / in)',
    displayName: 'Preposition "in" — Months, Years, Seasons, Parts of the Day & Enclosed Spaces',
    specific_problem: 'Students use "on" or "at" instead of "in" before months, years, seasons, parts of the day (e.g., in July, in 2025, in winter, in the morning), and enclosed spaces/cities/countries (e.g., in the room, in London).',
    teachAction: 'Use a container/span visual to show that "in" covers longer time spans (months, years, seasons, in the morning/afternoon/evening) and enclosed 3D spaces/regions (in the classroom, in Paris).',
    recommended_teaching: 'Teach preposition "in" for months, years, seasons, parts of the day (in the morning), and enclosed spaces/cities.',
    follow_up_activity: 'Complete a 6-sentence sorting and gap-fill exercise using "in" with months, years, seasons, parts of the day, and rooms/cities.',
    reassessment_method: '5-item check testing "in" before months, years, parts of the day, and enclosed locations.',
    commonError: {
      student_error: 'School starts on September and she is Studying at the room.',
      correct_form: 'School starts in September and she is studying in the room.'
    },
    commonErrors: [
      { student_error: 'My birthday is on July.', correct_form: 'My birthday is in July.' },
      { student_error: 'She is on the room.', correct_form: 'She is in the room.' },
      { student_error: 'He likes reading at the morning.', correct_form: 'He likes reading in the morning.' }
    ]
  },

  // 10D. Combined fallback when a generic topic label mentions prepositions without specific item detail
  PREPOSITIONS_TIME_PLACE: {
    diagnosis_id: 'diag_grammar_prepositions_in_on_at',
    category: 'Grammar',
    skill: 'prepositions_in_on_at',
    subskill: 'in_on_at_time_place',
    topic: 'Prepositions (at / on / in)',
    displayName: 'Prepositions — Distinguishing "at" (Time/Point), "on" (Day/Surface) & "in" (Span/Space)',
    specific_problem: 'Students confuse "at", "on", and "in" when expressing clock times, days/dates, longer periods, and physical locations.',
    teachAction: 'Use the Preposition Pyramid (AT = exact time/point, ON = day/date/surface, IN = month/year/enclosed space) with guided contrast examples.',
    recommended_teaching: 'Teach the Preposition Pyramid: "at" for clock times/points, "on" for days/dates/surfaces, and "in" for months/years/enclosed spaces.',
    follow_up_activity: '9-item mixed preposition sorting and sentence completion drill (3 "at", 3 "on", 3 "in").',
    reassessment_method: '6-item quick check with two items each for "at", "on", and "in".',
    commonError: {
      student_error: 'I wake up in 7 o’clock at Monday.',
      correct_form: 'I wake up at 7 o’clock on Monday.'
    },
    commonErrors: [
      { student_error: 'I wake up in 7 o’clock.', correct_form: 'I wake up at 7 o’clock.' },
      { student_error: 'We have class at Monday.', correct_form: 'We have class on Monday.' },
      { student_error: 'She is on the room.', correct_form: 'She is in the room.' }
    ]
  },

  // 11. Grammar — Past Continuous
  PAST_CONTINUOUS: {
    diagnosis_id: 'diag_grammar_past_continuous',
    category: 'Grammar',
    skill: 'past_continuous',
    subskill: 'was_were_verb_ing',
    topic: 'Past Continuous',
    displayName: 'Past Continuous — "was / were + verb-ing"',
    specific_problem: 'Students omit the auxiliary "was/were" or the "-ing" suffix when describing ongoing past actions.',
    teachAction: 'Review interrupted past actions using "was/were + verb-ing" contrasted with Simple Past "when" clauses.',
    recommended_teaching: 'Review ongoing and interrupted past actions using was/were + verb-ing and when/while clauses.',
    follow_up_activity: 'Complete 5 interrupted-action sentences combining Past Continuous ("was/were + -ing") and Simple Past.',
    reassessment_method: '5-item cloze check on "was vs. were + verb-ing".',
    commonError: {
      student_error: 'I was play football when it rained.',
      correct_form: 'I was playing football when it rained.'
    }
  },

  // 12. Grammar — Be Verbs
  BE_VERBS: {
    diagnosis_id: 'diag_grammar_be_verbs',
    category: 'Grammar',
    skill: 'be_verbs',
    subskill: 'am_is_are_was_were_concord',
    topic: 'Be Verbs',
    displayName: 'Be Verbs — "am / is / are / was / were" Subject Concord',
    specific_problem: 'Students confuse singular and plural forms of "be" verbs across present (am/is/are) and past (was/were) tenses.',
    teachAction: 'Clarify subject concord with "be" verbs across present (I am, he/she/it is, we/you/they are) and past (I/he/she/it was, we/you/they were).',
    recommended_teaching: 'Clarify subject concord with be verbs across present (am/is/are) and past (was/were) forms.',
    follow_up_activity: '6-item subject-verb matching and sentence completion exercise across present and past "be" forms.',
    reassessment_method: '5-item check contrasting "was vs. were" and "is vs. are".',
    commonError: {
      student_error: 'They was very happy yesterday.',
      correct_form: 'They were very happy yesterday.'
    }
  },

  // 13. Grammar — Conjunctions
  CONJUNCTIONS_CLAUSES: {
    diagnosis_id: 'diag_grammar_conjunctions',
    category: 'Grammar',
    skill: 'conjunctions',
    subskill: 'connecting_clauses',
    topic: 'Conjunctions',
    displayName: 'Conjunctions — Connecting Clauses (and / but / so / because / although)',
    specific_problem: 'Students select inappropriate conjunctions when linking cause, effect, and contrast clauses.',
    teachAction: 'Practice connecting ideas using coordinating (and, but, so, or) and subordinating (because, although) conjunctions by identifying clause relationships.',
    recommended_teaching: 'Practice connecting clauses with coordinating (but, so) and subordinating (because, although) conjunctions.',
    follow_up_activity: 'Sentence-combining task joining 6 pairs of clauses using "but" (contrast), "because" (reason), and "so" (result).',
    reassessment_method: '5-item clause-linking multiple-choice check.',
    commonError: {
      student_error: "I like tea so I don't like coffee.",
      correct_form: "I like tea, but I don't like coffee."
    }
  },

  // 14. Grammar — Articles & Determiners
  ARTICLES_DETERMINERS: {
    diagnosis_id: 'diag_grammar_articles',
    category: 'Grammar',
    skill: 'articles',
    subskill: 'a_an_the_selection',
    topic: 'Articles & Determiners',
    displayName: 'Articles — Choosing "a", "an" (Vowel Sound Rule) & "the"',
    specific_problem: 'Students use "a" instead of "an" before vowel sounds (or vice versa with initial u/h sounds) or omit definite article "the" for specific nouns.',
    teachAction: 'Review the initial vowel-sound vs. consonant-sound rule for "an" vs. "a" (an apple, an hour, a university) and first-mention ("a/an") vs. specific/second-mention ("the").',
    recommended_teaching: 'Review vowel vs. consonant sound rules for "a/an" and specific reference usage with "the".',
    follow_up_activity: '8-item article selection drill including vowel-letter traps (a university, an hour) and short paragraph gap-fills.',
    reassessment_method: '5-item check on "a / an / the" in sentence context.',
    commonError: {
      student_error: 'He ate a apple and she is an university student.',
      correct_form: 'He ate an apple and she is a university student.'
    },
    commonErrors: [
      { student_error: 'She is an university student.', correct_form: 'She is a university student.' },
      { student_error: 'He ate a apple.', correct_form: 'He ate an apple.' }
    ]
  },

  // 15. Grammar — Sentence Mechanics & Punctuation
  SENTENCE_MECHANICS: {
    diagnosis_id: 'diag_grammar_sentence_mechanics',
    category: 'Grammar',
    skill: 'sentence_mechanics',
    subskill: 'word_order_and_punctuation',
    topic: 'Sentence Mechanics',
    displayName: 'Sentence Mechanics — Word Order & Clause Punctuation',
    specific_problem: 'Students use non-standard Subject–Verb–Object word order or omit punctuation boundaries between independent clauses.',
    teachAction: 'Teach standard Subject–Verb–Object word order, adverb placement, and proper sentence boundary punctuation.',
    recommended_teaching: 'Teach standard Subject–Verb–Object word order and sentence boundary punctuation.',
    follow_up_activity: 'Unscramble 5 jumbled sentences and add missing capitalization and end punctuation.',
    reassessment_method: '5-item word-order and punctuation editing check.',
    commonError: {
      student_error: 'Always he plays in evening',
      correct_form: 'He always plays in the evening.'
    }
  },

  // 16. Spelling — Common Word Errors
  SPELLING_COMMON_ERRORS: {
    diagnosis_id: 'diag_spelling_common_errors',
    category: 'Spelling',
    skill: 'spelling',
    subskill: 'high_frequency_word_patterns',
    topic: 'Spelling',
    displayName: 'Spelling — High-Frequency Academic Words',
    specific_problem: 'Students make recurring orthographic errors on high-frequency vocabulary words (e.g., because, receive, different, beautiful).',
    teachAction: 'Run targeted spelling instruction on high-frequency error words using syllable chunking and vowel-pattern mnemonics.',
    recommended_teaching: 'Conduct short spelling retrieval practice using syllable chunking and vowel-pattern contrasts.',
    follow_up_activity: 'Look-Say-Cover-Write-Check drill and sentence dictation with the class’s top 5 misspelled words.',
    reassessment_method: '5-word contextual sentence dictation check.',
    commonError: {
      student_error: 'becouse → because',
      correct_form: 'because'
    }
  },

  // 17. Spelling — Homophones
  SPELLING_HOMOPHONES: {
    diagnosis_id: 'diag_spelling_homophones',
    category: 'Spelling',
    skill: 'spelling',
    subskill: 'homophone_distinction',
    topic: 'Spelling',
    displayName: 'Spelling — Homophones (their / there / they’re, its / it’s, to / too / two)',
    specific_problem: 'Students confuse phonetic homophones (their/there/they’re, its/it’s, to/two/too) in written sentences.',
    teachAction: 'Teach substitution tests for homophones (they’re = they are, their = possession, there = place/existence; it’s = it is).',
    recommended_teaching: 'Practice distinguishing homophones in complete sentence contexts using substitution checks.',
    follow_up_activity: '6-sentence homophone replacement check where students justify their choice using the expansion rule.',
    reassessment_method: '5-item homophone cloze check.',
    commonError: {
      student_error: "Their going to they're house.",
      correct_form: "They're going to their house."
    }
  },

  // 18. Spelling — Double Consonants
  SPELLING_DOUBLE_CONSONANTS: {
    diagnosis_id: 'diag_spelling_double_consonants',
    category: 'Spelling',
    skill: 'spelling',
    subskill: 'cvc_suffix_doubling',
    topic: 'Spelling',
    displayName: 'Spelling — CVC Consonant Doubling Before "-ing" and "-ed"',
    specific_problem: 'Students omit consonant doubling when adding -ing or -ed suffixes to short-vowel CVC verbs (runing, swiming, droped).',
    teachAction: 'Review the 1-1-1 CVC doubling rule (1 syllable, 1 short vowel, 1 final consonant → double the final consonant before -ing/-ed).',
    recommended_teaching: 'Review the CVC consonant doubling rule when adding -ing and -ed suffixes (run → running, drop → dropped).',
    follow_up_activity: 'Word-building table adding -ing and -ed to 8 CVC and non-CVC base verbs.',
    reassessment_method: '5-item suffix-spelling check.',
    commonError: {
      student_error: 'runing, swiming, droped',
      correct_form: 'running, swimming, dropped'
    }
  },

  // 19. Vocabulary — borrow vs lend
  VOCABULARY_BORROW_LEND: {
    diagnosis_id: 'diag_vocab_borrow_lend',
    category: 'Vocabulary',
    skill: 'vocabulary',
    subskill: 'borrow_vs_lend_confusion',
    topic: 'Vocabulary',
    displayName: 'Vocabulary — Confusing "borrow" (Take From) vs. "lend" (Give To)',
    specific_problem: 'Students confuse the direction of transfer between "borrow" (receive temporarily from someone) and "lend" (give temporarily to someone).',
    teachAction: 'Teach the structural patterns "borrow [something] from [someone]" vs. "lend [someone] [something] / lend [something] to [someone]".',
    recommended_teaching: 'Teach the distinction between "borrow from" and "lend to" using directional sentence frames.',
    follow_up_activity: '6-item classroom dialogue completion drill contrasting "Can I borrow...?" and "Can you lend me...?".',
    reassessment_method: '5-item gap-fill check testing "borrow" vs. "lend".',
    commonError: {
      student_error: 'Can you borrow me your book?',
      correct_form: 'Can you lend me your book?'
    }
  },

  // 20. Vocabulary — say vs tell
  VOCABULARY_SAY_TELL: {
    diagnosis_id: 'diag_vocab_say_tell',
    category: 'Vocabulary',
    skill: 'vocabulary',
    subskill: 'say_vs_tell_confusion',
    topic: 'Vocabulary',
    displayName: 'Vocabulary — Confusing "say" vs. "tell" With Personal Objects',
    specific_problem: 'Students use "say" directly before a personal object ("said me") or use "tell" without a recipient.',
    teachAction: 'Teach that "tell" takes an indirect personal object (tell me/him/us + something), whereas "say" takes the message directly or uses "say to someone".',
    recommended_teaching: 'Clarify "say something (to someone)" vs. "tell someone something" with dialogue reporting exercises.',
    follow_up_activity: '6-sentence reporting drill converting quotes using "said (that)..." and "told me (that)...".',
    reassessment_method: '5-item multiple-choice check on "say/said" vs. "tell/told".',
    commonError: {
      student_error: 'He said me the answer.',
      correct_form: 'He told me the answer.'
    }
  },

  // 21. Vocabulary — make vs do
  VOCABULARY_MAKE_DO: {
    diagnosis_id: 'diag_vocab_make_do',
    category: 'Vocabulary',
    skill: 'vocabulary',
    subskill: 'make_vs_do_collocations',
    topic: 'Vocabulary',
    displayName: 'Vocabulary — Collocations With "make" vs. "do"',
    specific_problem: 'Students confuse standard collocations taking "make" (produce/create/decision) and "do" (tasks/work/homework/exercise).',
    teachAction: 'Contrast high-frequency collocations for "do" (do homework, do exercise, do a task) vs. "make" (make a mistake, make a decision, make breakfast).',
    recommended_teaching: 'Practice collocations for "make" vs. "do" with categorization and sentence-completion drills.',
    follow_up_activity: 'Collocation sorting task + 6 sentence completions using "make" and "do" in correct tense.',
    reassessment_method: '5-item collocation quiz.',
    commonError: {
      student_error: 'I made my homework last night.',
      correct_form: 'I did my homework last night.'
    }
  },

  // 22. Vocabulary — General Context & Word Choice
  VOCABULARY_CONTEXT: {
    diagnosis_id: 'diag_vocab_word_choice',
    category: 'Vocabulary',
    skill: 'vocabulary',
    subskill: 'word_choice_precision',
    topic: 'Vocabulary',
    displayName: 'Vocabulary — Contextual Word Choice & Precision',
    specific_problem: 'Students select words that do not fit the sentence context or rely on overly generic adjectives/verbs.',
    teachAction: 'Model using surrounding context clues and collocations to choose the exact target word.',
    recommended_teaching: 'Introduce context-clue analysis and precise vocabulary replacements.',
    follow_up_activity: '6-item contextual vocabulary replacement exercise.',
    reassessment_method: '5-item vocabulary-in-context check.',
    commonError: {
      student_error: 'He was a very nice and good person.',
      correct_form: 'He was a kind, generous mentor.'
    }
  },

  // 23. Writing — Topic Sentences
  PARAGRAPH_TOPIC_SENTENCES: {
    diagnosis_id: 'diag_writing_paragraph_topic_sentences',
    category: 'Writing',
    skill: 'paragraph_writing',
    subskill: 'missing_topic_sentence',
    topic: 'Paragraph Writing',
    displayName: 'Paragraph Writing — Formulating Clear Topic Sentences',
    specific_problem: 'Students begin paragraphs by listing details immediately without an opening topic sentence that states the central idea.',
    teachAction: 'Guide students to start each paragraph with a clear topic sentence (Topic + Controlling Idea), followed by 2–3 supporting details.',
    recommended_teaching: 'Teach paragraph topic sentence formulation (Topic + Main Claim) followed by supporting detail development.',
    follow_up_activity: 'Write suitable opening topic sentences for 3 body paragraphs that currently only have supporting details.',
    reassessment_method: 'Short paragraph writing prompt evaluated specifically for a clear opening topic sentence.',
    commonError: {
      student_error: 'Writing a list of details without a clear opening topic sentence.',
      correct_form: 'Clear topic sentence stating main claim + 2–3 supporting details.'
    }
  },

  // 24. Writing — Paragraph Organization & Transitions
  PARAGRAPH_ORGANIZATION: {
    diagnosis_id: 'diag_writing_paragraph_organization',
    category: 'Writing',
    skill: 'paragraph_writing',
    subskill: 'logical_flow_and_transitions',
    topic: 'Paragraph Writing',
    displayName: 'Paragraph Organization — Logical Sequencing & Transition Markers',
    specific_problem: 'Students list ideas disjointedly without transitional connectors to show sequence, addition, or contrast.',
    teachAction: 'Teach transitional words (First, Furthermore, For example, However, Therefore) to link supporting sentences coherently.',
    recommended_teaching: 'Teach logical paragraph sequencing and transitional connectors.',
    follow_up_activity: 'Revise a 5-sentence paragraph by ordering sentences logically and inserting appropriate transition markers.',
    reassessment_method: 'Paragraph coherence check scoring logical order and use of at least 3 transition connectors.',
    commonError: {
      student_error: 'Abrupt shifts between unrelated points in the same paragraph.',
      correct_form: 'Cohesive sequence linked with logical transitional markers.'
    }
  },

  // 25. Writing — Sentence Variety & Repetitive Openings
  SENTENCE_VARIETY: {
    diagnosis_id: 'diag_writing_sentence_variety',
    category: 'Writing',
    skill: 'sentence_mechanics',
    subskill: 'repetitive_sentence_openings',
    topic: 'Sentence Variety',
    displayName: 'Sentence Variety — Avoiding Repetitive Sentence Openings',
    specific_problem: 'Students repeatedly begin consecutive sentences with the same pronoun or subject (e.g., "He... He... He...").',
    teachAction: 'Practice sentence combining and varied time/prepositional phrase openers (e.g., "After arriving at school, ...").',
    recommended_teaching: 'Practice combining simple sentences and varying sentence openers.',
    follow_up_activity: 'Rewrite a 5-sentence repetitive paragraph into 3 varied sentences using time openers and conjunctions.',
    reassessment_method: 'Short writing check requiring varied sentence beginnings across 4 consecutive sentences.',
    commonError: {
      student_error: 'He went to school. He saw his friend. He ate lunch.',
      correct_form: 'After arriving at school, he met his friend and they had lunch together.'
    }
  },

  // 26. Writing — Essay Structure
  ESSAY_STRUCTURE: {
    diagnosis_id: 'diag_writing_essay_structure',
    category: 'Writing',
    skill: 'essay_writing',
    subskill: 'structure_and_development',
    topic: 'Essay Writing',
    displayName: 'Essay Writing — Multi-Paragraph Structure (Introduction, Body, Conclusion)',
    specific_problem: 'Students submit unbroken text blocks lacking distinct introduction, body paragraphs, and conclusion.',
    teachAction: 'Model a 3-part essay outline: Introduction with thesis, focused body paragraphs, and synthesizing conclusion.',
    recommended_teaching: 'Model a 3-part essay structure (Introduction with thesis, Body Paragraphs, Conclusion).',
    follow_up_activity: 'Outline and segment a single-block draft into 3 distinct paragraphs with a concluding summary sentence.',
    reassessment_method: 'Rubric check on paragraphing and thesis-to-conclusion alignment in the next writing task.',
    commonError: {
      student_error: 'Single unbroken block of text lacking paragraph breaks and conclusion.',
      correct_form: 'Clear introduction, structured body paragraphs, and concluding evaluation.'
    }
  },

  // 27. Writing — Creative Writing
  CREATIVE_WRITING: {
    diagnosis_id: 'diag_writing_creative_narrative',
    category: 'Writing',
    skill: 'creative_writing',
    subskill: 'narrative_development',
    topic: 'Creative Writing',
    displayName: 'Creative Writing — Descriptive Sensory Detail & Narrative Pacing',
    specific_problem: 'Narratives rely on bare summary statements rather than descriptive sensory details and dialogue.',
    teachAction: 'Model "Show, Don’t Tell" techniques using sensory adjectives, vivid action verbs, and punctuated dialogue.',
    recommended_teaching: 'Teach narrative showing techniques with sensory description and dialogue.',
    follow_up_activity: 'Expand 3 "telling" sentences (e.g., "The room was scary") into 2–3 "showing" sentences with sensory details.',
    reassessment_method: 'Short narrative scene rubric scoring sensory detail and action verb variety.',
    commonError: {
      student_error: 'Overly summary-style telling instead of showing scene details.',
      correct_form: 'Show, don’t tell with descriptive verbs and sensory details.'
    }
  },

  // 28. Reading — Inference & Context Clues
  READING_INFERENCE: {
    diagnosis_id: 'diag_reading_inference',
    category: 'Reading',
    skill: 'reading_comprehension',
    subskill: 'inference_and_context_clues',
    topic: 'Reading Comprehension',
    displayName: 'Reading Comprehension — Making Inferences From Context Clues',
    specific_problem: 'Students choose literal surface distractors when the question requires inferring implicit meaning or character motive from context clues.',
    teachAction: 'Model the "Text Clue + Background Knowledge = Inference" strategy by highlighting evidence phrases in the passage.',
    recommended_teaching: 'Model how to combine textual clues with context to deduce implicit meaning and author intent.',
    follow_up_activity: 'Read a short passage and answer 3 inference questions by quoting the exact clue phrase that supports each answer.',
    reassessment_method: '4-question reading comprehension check targeting implicit inference and vocabulary-in-context.',
    commonError: {
      student_error: 'Selecting literal surface distractors when implicit inference is required.',
      correct_form: 'Combine contextual evidence clues from surrounding sentences.'
    }
  },

  // 29. Reading — Factual Recall
  READING_FACTUAL: {
    diagnosis_id: 'diag_reading_factual',
    category: 'Reading',
    skill: 'reading_comprehension',
    subskill: 'factual_recall_and_scanning',
    topic: 'Reading Comprehension',
    displayName: 'Reading Comprehension — Locating Explicit Factual Details',
    specific_problem: 'Students miss key explicit details, dates, or cause-effect statements directly stated in the passage.',
    teachAction: 'Practice keyword scanning and underlining question stems to verify facts directly in the passage before answering.',
    recommended_teaching: 'Practice scanning for keywords in the question stem and verifying explicit details in the passage.',
    follow_up_activity: 'Passage scanning exercise where students highlight the exact sentence that proves each of 5 factual questions.',
    reassessment_method: '5-question factual detail verification check on a short informational text.',
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
 * High-frequency irregular verb lookup (base -> simple past)
 */
export const IRREGULAR_PAST_VERBS = {
  go: 'went',
  eat: 'ate',
  see: 'saw',
  buy: 'bought',
  take: 'took',
  come: 'came',
  give: 'gave',
  make: 'made',
  write: 'wrote',
  speak: 'spoke',
  run: 'ran',
  drink: 'drank',
  sing: 'sang',
  begin: 'began',
  find: 'found',
  think: 'thought',
  bring: 'brought',
  teach: 'taught',
  catch: 'caught',
  leave: 'left',
  feel: 'felt',
  keep: 'kept',
  sleep: 'slept',
  know: 'knew',
  grow: 'grew',
  fly: 'flew',
  draw: 'drew',
  break: 'broke',
  choose: 'chose',
  drive: 'drove',
  ride: 'rode',
  swim: 'swam',
  meet: 'met',
  lose: 'lost',
  win: 'won',
  build: 'built',
  send: 'sent',
  spend: 'spent',
  hear: 'heard',
  tell: 'told',
  sell: 'sold',
  pay: 'paid',
  say: 'said',
  stand: 'stood',
  understand: 'understood',
  wear: 'wore',
  forget: 'forgot',
  get: 'got',
  have: 'had',
  do: 'did'
};

const PAST_TO_BASE_IRREGULAR = Object.fromEntries(
  Object.entries(IRREGULAR_PAST_VERBS).map(([base, past]) => [past, base])
);

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
  cleaned = cleaned.replace(
    /"?(?:final_rank|session_id|sessionId|wrong_count|correct_count|total_questions|points_awarded|accuracy_percentage)"?\s*:\s*[^,\}\]]+/gi,
    ' '
  );

  // 3. Strip braces, brackets, quotes, escapes
  cleaned = cleaned.replace(/[{}\[\]\\"]/g, ' ');

  // 4. Strip boilerplate assessment prefixes
  cleaned = cleaned.replace(
    /^(?:Unit Test on the|Unit Test on|Quiz on|Assessment:|Test on|Classroom Activity|Live Quiz Session)\s*/gi,
    ' '
  );

  // 5. Clean whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Inspects a question prompt, target/correct answer, and optional student answer
 * to determine the exact canonical concept tested by that question item.
 *
 * Crucially distinguishes:
 *  - Preposition "at" vs. Preposition "on" vs. Preposition "in"
 *  - Object pronouns (me, him, her, us, them)
 *  - Modal verbs "can" vs "could"
 *  - Simple Past subskills (base/present substitution for completed actions, regular -ed, irregular past, negative didn't + base, questions Did + base)
 *  - Articles (a/an/the)
 *  - Subject-Verb Agreement (3rd person -s, there is/are, plural concord)
 *
 * @param {Object} params
 * @param {string} [params.questionText]
 * @param {string} [params.correctAnswer]
 * @param {string} [params.studentAnswer]
 * @param {string} [params.topicHint]
 * @param {string} [params.explanation]
 * @returns {typeof CANONICAL_CONCEPTS[keyof typeof CANONICAL_CONCEPTS] | null}
 */
export function classifyQuestionAndAnswerToConcept({
  questionText = '',
  correctAnswer = '',
  studentAnswer = '',
  topicHint = '',
  explanation = ''
} = {}) {
  const qLower = String(questionText || '').toLowerCase().trim();
  const cLower = String(correctAnswer || '').toLowerCase().trim();
  const sLower = String(studentAnswer || '').toLowerCase().trim();
  const hLower = String(topicHint || '').toLowerCase().trim();
  const eLower = String(explanation || '').toLowerCase().trim();
  const allText = `${qLower} ${cLower} ${sLower} ${hLower} ${eLower}`.trim();

  if (!allText) return null;

  // -------------------------------------------------------------------------
  // 1. SPECIFIC PREPOSITIONS: "at" vs "on" vs "in"
  // -------------------------------------------------------------------------
  const isPrepChoice =
    ['at', 'on', 'in'].includes(cLower) ||
    ['at', 'on', 'in'].includes(sLower) ||
    /\bpreposition\b/i.test(allText) ||
    /\b(?:at|on|in)\s*\/\s*(?:at|on|in)\b/i.test(allText);

  if (cLower === 'at' || /\bpreposition\s+['"]?at['"]?\b/i.test(allText)) {
    return CANONICAL_CONCEPTS.PREPOSITION_AT;
  }
  if (cLower === 'on' || /\bpreposition\s+['"]?on['"]?\b/i.test(allText)) {
    return CANONICAL_CONCEPTS.PREPOSITION_ON;
  }
  if (cLower === 'in' || /\bpreposition\s+['"]?in['"]?\b/i.test(allText)) {
    return CANONICAL_CONCEPTS.PREPOSITION_IN;
  }

  if (isPrepChoice) {
    // Check contextual cues in the sentence stem or correction
    if (
      /\b(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:o['’]?clock|am|pm|a\.m\.|p\.m\.)?|noon|midnight|night|the\s+bus\s+stop|the\s+station|the\s+door|the\s+moment|the\s+weekend|home|school|work)\b/i.test(
        `${qLower} ${cLower}`
      )
    ) {
      return CANONICAL_CONCEPTS.PREPOSITION_AT;
    }
    if (
      /\b(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekdays|weekends|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}(?:st|nd|rd|th)\s+of|the\s+(?:table|desk|wall|floor|shelf|page|screen|bus|train|left|right)|my\s+birthday)\b/i.test(
        `${qLower} ${cLower}`
      )
    ) {
      return CANONICAL_CONCEPTS.PREPOSITION_ON;
    }
    if (
      /\b(?:in\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|fall|winter|the\s+(?:morning|afternoon|evening|room|classroom|kitchen|garden|park|box|bag|world|city|country)|19\d{2}|20\d{2})\b/i.test(
        `${qLower} ${cLower}`
      )
    ) {
      return CANONICAL_CONCEPTS.PREPOSITION_IN;
    }
  }

  // -------------------------------------------------------------------------
  // 2. OBJECT PRONOUNS (me, him, her, us, them)
  // -------------------------------------------------------------------------
  const objectPronounSet = new Set(['me', 'him', 'her', 'us', 'them']);
  const subjectPronounSet = new Set(['i', 'he', 'she', 'we', 'they']);
  if (
    objectPronounSet.has(cLower) ||
    (objectPronounSet.has(cLower) && subjectPronounSet.has(sLower)) ||
    /\bobject\s+pronouns?\b|\bsubject\s+(?:and|vs\.?|or)\s+object\s+pronouns?\b/i.test(allText) ||
    /\b(?:gave|told|helped|called|saw|asked|invited|met|with|for|to|at|from|between)\s+(?:i|he|she|we|they)\b/i.test(
      sLower || qLower
    )
  ) {
    return CANONICAL_CONCEPTS.OBJECT_PRONOUNS;
  }

  // -------------------------------------------------------------------------
  // 3. MODAL VERBS: "can" vs "could"
  // -------------------------------------------------------------------------
  if (
    ['can', 'could', "can't", "couldn't", 'cannot', 'could not'].includes(cLower) ||
    ['can', 'could', "can't", "couldn't"].includes(sLower) ||
    /\bmodal\b.*\b(?:can|could)\b|\bcan\s*(?:vs\.?|\/|or|and)\s*could\b|\bpast\s+ability\b.*\b(?:can|could)\b|\bpolite\s+request\b.*\bcould\b/i.test(
      allText
    ) ||
    /\b(?:can|could)\s+(?:to\s+\w+|went|swam|played|plays|goes|ate|saw)\b/i.test(sLower || qLower) ||
    (/\bwhen\s+(?:i|he|she|we|they)\s+(?:was|were)\b/i.test(qLower) && /\b(?:can|could)\b/i.test(`${cLower} ${sLower}`))
  ) {
    return CANONICAL_CONCEPTS.MODAL_CAN_VS_COULD;
  }

  // -------------------------------------------------------------------------
  // 4. SIMPLE PAST TENSE SUBSKILLS
  // -------------------------------------------------------------------------
  // 4A. Simple Past Negative (didn't + base verb)
  if (
    /\bdid(?:n['’]t|\s+not)\s+\w+/i.test(`${cLower} ${sLower} ${qLower}`) &&
    (/\bdid(?:n['’]t|\s+not)\s+(?:went|saw|ate|bought|took|came|made|wrote|ran|had|did|\w+ed)\b/i.test(
      `${sLower} ${qLower}`
    ) ||
      /\bdid(?:n['’]t|\s+not)\b/i.test(cLower) ||
      /\bnegative\b.*\b(?:simple\s*past|past\s*simple|past\s*tense)\b/i.test(allText))
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_NEGATIVE;
  }

  // 4B. Simple Past Questions (Did + subject + base verb)
  if (
    (/\bdid\s+(?:you|he|she|they|we|it)\s+(?:went|saw|ate|bought|took|\w+ed)\b/i.test(`${sLower} ${qLower}`) ||
      (/\bdid\b/i.test(cLower) && /\?/.test(qLower)) ||
      /\b(?:simple\s*past|past\s*simple).*\bquestion/i.test(allText))
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_QUESTIONS;
  }

  // Check if the question/answer involves a past tense context
  const hasPastTimeMarker =
    /\b(?:yesterday|last\s+(?:night|week|month|year|weekend|monday|friday|summer)|(?:\d+|two|three|few)\s+(?:days|weeks|years|hours|minutes)\s+ago|in\s+(?:19\d{2}|20[01]\d)|this\s+morning)\b/i.test(
      qLower
    ) || /\b(?:simple\s*past|past\s*simple|past\s*tense)\b/i.test(`${hLower} ${eLower}`);

  const cleanCWord = cLower.replace(/[^a-z']/g, '');
  const cleanSWord = sLower.replace(/[^a-z']/g, '');

  const isCorrectIrregularPast = Boolean(PAST_TO_BASE_IRREGULAR[cleanCWord]);
  const isCorrectRegularEd = cleanCWord.length > 3 && cleanCWord.endsWith('ed') && !PAST_TO_BASE_IRREGULAR[cleanCWord];

  if (hasPastTimeMarker || isCorrectIrregularPast || isCorrectRegularEd) {
    // Did the student use a base or present-tense verb instead of the Simple Past for a completed action?
    const expectedBaseForIrregular = PAST_TO_BASE_IRREGULAR[cleanCWord];
    const isStudentBaseOrPresent =
      (expectedBaseForIrregular &&
        (cleanSWord === expectedBaseForIrregular ||
          cleanSWord === `${expectedBaseForIrregular}s` ||
          cleanSWord === `${expectedBaseForIrregular}es`)) ||
      (isCorrectRegularEd &&
        cleanSWord.length >= 2 &&
        !cleanSWord.endsWith('ed') &&
        (cleanCWord.startsWith(cleanSWord.replace(/s$/, '')) ||
          cleanCWord.replace(/ied$/, 'y') === cleanSWord.replace(/ies$/, 'y')));

    if (
      /\b(?:base\s+form|present\s+tense|present\s+form)\s+instead\s+of\s+(?:the\s+)?simple\s+past\b/i.test(allText) ||
      (hasPastTimeMarker && isStudentBaseOrPresent)
    ) {
      return CANONICAL_CONCEPTS.SIMPLE_PAST_BASE_SUBSTITUTION;
    }

    // Did the student overgeneralize -ed on an irregular verb (goed, eated, buyed, taked) or miss an irregular past verb?
    if (
      isCorrectIrregularPast ||
      /\b(?:goed|eated|seed|buyed|taked|comed|gived|maked|writed|runned|drinked|singed|beginned|finded|thinked|bringed|teached|catched|leaved|feeled|keeped|sleeped|knowed|growed|flyed|drawed|breaked|choosed|drived|rided|swimmed|meeted|losed|winned|builded|sended|spended|heared|telled|selled|payed|standed|wearied|forgetted)\b/i.test(
        sLower
      ) ||
      /\birregular\s+past\b/i.test(allText)
    ) {
      return CANONICAL_CONCEPTS.SIMPLE_PAST_IRREGULAR;
    }

    if (isCorrectRegularEd || /\bregular\s+(?:past|-ed)\b/i.test(allText)) {
      return CANONICAL_CONCEPTS.SIMPLE_PAST_REGULAR_ED;
    }
  }

  // -------------------------------------------------------------------------
  // 5. ARTICLES (a / an / the)
  // -------------------------------------------------------------------------
  if (
    ['a', 'an', 'the'].includes(cLower) ||
    /\barticles?\b|\ba\s*\/\s*an\b/i.test(`${hLower} ${eLower}`)
  ) {
    return CANONICAL_CONCEPTS.ARTICLES_DETERMINERS;
  }

  // -------------------------------------------------------------------------
  // 6. SUBJECT-VERB AGREEMENT & SIMPLE PRESENT
  // -------------------------------------------------------------------------
  if (/\bthere\s+is\b|\bthere\s+are\b/i.test(`${cLower} ${sLower} ${qLower}`)) {
    return CANONICAL_CONCEPTS.THERE_IS_THERE_ARE;
  }

  if (
    /\b(?:don['’]?t|doesn['’]?t|do\s+not|does\s+not)\b/i.test(`${cLower} ${sLower}`)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_NEGATIVE;
  }

  if (
    /\b(?:he|she|it|my\s+(?:mother|father|brother|sister|friend|teacher)|the\s+(?:dog|cat|student|boy|girl|man|woman))\s+___/i.test(
      qLower
    ) &&
    cleanCWord.endsWith('s') &&
    !['is', 'was', 'has', 'does'].includes(cleanCWord)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_THIRD_PERSON;
  }

  // Fallback to general error/topic mapper
  return mapErrorToCanonicalConcept(studentAnswer || questionText, correctAnswer, `${topicHint} ${explanation} ${questionText}`);
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
  if (
    /session[-_]?id|final[-_]?rank|wrong[-_]?count|correct[-_]?count|points[-_]?awarded|[0-9a-f]{8}-[0-9a-f]{4}/i.test(
      combined
    )
  ) {
    return null;
  }

  // Reject general trivia / non-curriculum quizzes from creating curriculum concepts
  if (/general\s*knowledge|trivia|entertainment|fun\s*quiz|pub\s*quiz|movie\s*quiz|world\s*capitals/i.test(combined)) {
    return null;
  }

  // 1. Object Pronouns
  if (
    /\bobject\s*pronouns?\b|\bsubject\s*(?:vs\.?|and|or)\s*object\s*pronouns?\b|\bpronouns?\s*(?:me|him|her|us|them)\b|\b(?:me\s*\/\s*him\s*\/\s*her|him\s*\/\s*her\s*\/\s*them)\b/i.test(
      combined
    )
  ) {
    return CANONICAL_CONCEPTS.OBJECT_PRONOUNS;
  }

  // 2. Modal Verbs (can vs could)
  if (
    /\bmodal\s*verbs?\b.*\b(?:can|could)\b|\bcan\s*(?:vs\.?|\/|or|and)\s*could\b|\bcould\s*(?:vs\.?|\/|or|and)\s*can\b|\bpast\s*ability\b.*\bcould\b|\bpolite\s*requests?\b.*\bcould\b/i.test(
      combined
    )
  ) {
    return CANONICAL_CONCEPTS.MODAL_CAN_VS_COULD;
  }

  // 3. Specific Prepositions: "at", "on", "in"
  if (
    /\bpreposition\s*['"]?at['"]?\b|\bat\s+for\s+(?:time|clock|location|point)|\b(?:in|on)\s+\d{1,2}(?::\d{2})?\s*o['’]?clock\b|\bwake\s+up\s+in\s+7\b|\bat\s+\d{1,2}\s*o['’]?clock\b/i.test(
      combined
    )
  ) {
    return CANONICAL_CONCEPTS.PREPOSITION_AT;
  }

  if (
    /\bpreposition\s*['"]?on['"]?\b|\bon\s+for\s+(?:days?|dates?|surfaces?)|\b(?:in|at)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\bon\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
      combined
    )
  ) {
    return CANONICAL_CONCEPTS.PREPOSITION_ON;
  }

  if (
    /\bpreposition\s*['"]?in['"]?\b|\bin\s+for\s+(?:months?|years?|seasons?|enclosed|spaces?)|\b(?:on|at)\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|the\s+morning|the\s+evening|the\s+room)\b/i.test(
      combined
    )
  ) {
    return CANONICAL_CONCEPTS.PREPOSITION_IN;
  }

  if (
    /at[\s/]+in[\s/]+on|in[\s/]+on[\s/]+at|preposition.*(?:time|place|at|in|on)/i.test(combined) ||
    (/preposition/i.test(combined) && !/conjunction/i.test(combined))
  ) {
    return CANONICAL_CONCEPTS.PREPOSITIONS_TIME_PLACE;
  }

  // 4. There is / There are (Singular vs Plural)
  if (
    /there\s*is[\s/]+there\s*are|there\s*is\s*vs\s*there\s*are|there\s*is\s*five|there\s*is\s*many|there\s*are\s*vs\s*there\s*is/i.test(
      combined
    )
  ) {
    return CANONICAL_CONCEPTS.THERE_IS_THERE_ARE;
  }

  // 5. Simple Present Third Person Singular (-s / -es)
  if (
    /(?:simple\s*present|present\s*simple).*(?:third\s*person|3rd\s*person|singular\s*subject|verb-s|-es|missing\s*-s)/i.test(
      combined
    ) ||
    /(?:he\/she\/it|third\s*person\s*singular|he\s*work|she\s*take|mother\s*take|father\s*work|she\s*help)/i.test(
      combined
    )
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_THIRD_PERSON;
  }

  // 6. Simple Present Negative (don't / doesn't)
  if (
    /(?:simple\s*present|present\s*simple).*(?:negative|don'?t|doesn'?t|not\s+like|not\s+play)/i.test(combined) ||
    /(?:don'?t\s*\/\s*doesn'?t|do\s*not\s*\/\s*does\s*not|negative\s*present\s*tense|does\s*not\s*like|do\s*not\s*like|doesn'?t|don'?t)/i.test(
      combined
    ) ||
    (/negative\s*form/i.test(combined) && /present/i.test(combined))
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_NEGATIVE;
  }

  // 7. Simple Present General / Affirmative
  if (/simple\s*present|present\s*simple/i.test(combined)) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_AFFIRMATIVE;
  }

  // 8. Simple Past Subskills
  if (
    /(?:simple\s*past|past\s*simple).*(?:negative|didn'?t|did\s*not)/i.test(combined) ||
    /didn'?t\s*\+\s*verb|did\s*not\s*\+\s*base|didn'?t\s*went|didn'?t\s*saw/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_NEGATIVE;
  }

  if (
    /(?:simple\s*past|past\s*simple).*(?:question|interrogative|did\s*\+\s*subject)/i.test(combined) ||
    /\bdid\s+(?:you|he|she|they)\s+(?:went|saw|ate|bought)\b/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_QUESTIONS;
  }

  if (
    /(?:base\s*form|present\s*tense|present\s*form).*(?:instead\s*of|for).*(?:simple\s*past|past\s*tense|completed\s*action)/i.test(
      combined
    ) ||
    /\b(?:yesterday|last\s+night|last\s+week)\s+(?:i|he|she|we|they)\s+(?:go|eat|see|buy|walk|watch|visit)\b/i.test(
      combined
    )
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_BASE_SUBSTITUTION;
  }

  if (/\bregular\s*(?:past|-ed\s*verb|-ed\s*ending|simple\s*past)/i.test(combined)) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_REGULAR_ED;
  }

  if (/(?:simple\s*past|past\s*simple|past\s*tense|irregular\s*past|eated|goed|buyed)/i.test(combined)) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_IRREGULAR;
  }

  // 9. Past Continuous
  if (/past\s*continuous|past\s*progressive|was.*reading|were.*playing/i.test(combined)) {
    return CANONICAL_CONCEPTS.PAST_CONTINUOUS;
  }

  // 10. Subject–Verb Agreement (General)
  if (
    /subject[- ]*verb\s*agreement|subject\s*verb\s*concord|singular\s*subject|plural\s*subject|concord/i.test(
      combined
    ) ||
    /friends\s*likes|it\s*give|hobby\s*are/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SUBJECT_VERB_AGREEMENT;
  }

  // 11. Be Verbs
  if (/be\s*verbs?|am,\s*is,\s*are|was,\s*were|am\s*\/\s*is\s*\/\s*are/i.test(combined)) {
    return CANONICAL_CONCEPTS.BE_VERBS;
  }

  // 12. Conjunctions
  if (/conjunction|connecting\s*clauses|and\s*but\s*so\s*or|coordinating\s*conjunction/i.test(combined)) {
    return CANONICAL_CONCEPTS.CONJUNCTIONS_CLAUSES;
  }

  // 13. Articles & Determiners
  if (/articles?|determiners?|a\s*\/\s*an\s*\/\s*the|indefinite\s*article|definite\s*article/i.test(combined)) {
    return CANONICAL_CONCEPTS.ARTICLES_DETERMINERS;
  }

  // 14. Sentence Mechanics / Word Order
  if (/sentence\s*structure|sentence\s*mechanics|word\s*order|syntax|punctuation/i.test(combined)) {
    return CANONICAL_CONCEPTS.SENTENCE_MECHANICS;
  }

  // 15. Vocabulary — borrow vs lend
  if (/borrow.*lend|lend.*borrow|borrow\s*me/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_BORROW_LEND;
  }

  // 16. Vocabulary — say vs tell
  if (/say.*tell|tell.*say|said\s*me/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_SAY_TELL;
  }

  // 17. Vocabulary — make vs do
  if (/make.*do|do.*make|made\s*homework/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_MAKE_DO;
  }

  // 18. Vocabulary — General / Word Choice
  if (/vocabulary|word\s*choice|word\s*precision|confused\s*words/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_CONTEXT;
  }

  // 19. Spelling — Homophones
  if (/their.*there|they'?re|homophones?|its.*it'?s/i.test(combined)) {
    return CANONICAL_CONCEPTS.SPELLING_HOMOPHONES;
  }

  // 20. Spelling — Double Consonants
  if (/double\s*consonant|cvc|runing|swiming|droped/i.test(combined)) {
    return CANONICAL_CONCEPTS.SPELLING_DOUBLE_CONSONANTS;
  }

  // 21. Spelling — Specific Word or General
  if (/spelling|orthography|becouse|recieve|beautifull|diferent/i.test(combined)) {
    return CANONICAL_CONCEPTS.SPELLING_COMMON_ERRORS;
  }

  // 22. Writing — Topic Sentences
  if (/topic\s*sentence|missing\s*topic|opening\s*sentence/i.test(combined)) {
    return CANONICAL_CONCEPTS.PARAGRAPH_TOPIC_SENTENCES;
  }

  // 23. Writing — Paragraph Organization
  if (/paragraph|paragraph\s*flow|paragraph\s*organization|rainy\s*day|favourite\s*hobby/i.test(combined)) {
    return CANONICAL_CONCEPTS.PARAGRAPH_ORGANIZATION;
  }

  // 24. Writing — Sentence Variety
  if (/sentence\s*variety|repetitive\s*openings|repetitive\s*sentences/i.test(combined)) {
    return CANONICAL_CONCEPTS.SENTENCE_VARIETY;
  }

  // 25. Writing — Essay Structure
  if (/essay|essay\s*writing|thesis|importance\s*of\s*trees/i.test(combined)) {
    return CANONICAL_CONCEPTS.ESSAY_STRUCTURE;
  }

  // 26. Writing — Creative Writing
  if (/story\s*writing|creative\s*writing|narrative|mermaids|competition/i.test(combined)) {
    return CANONICAL_CONCEPTS.CREATIVE_WRITING;
  }

  // 27. Reading Comprehension
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
  if (/^(?:grammar|spelling|writing|vocabulary|reading|tenses|prepositions|pronouns|modals)$/i.test(sanitized.toLowerCase().trim())) {
    return null;
  }

  // Clean fallback: Only accept clean, non-JSON educational titles
  if (sanitized.length < 3 || sanitized.length > 60) return null;

  return {
    diagnosis_id: `diag_custom_${sanitized.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    category: categoryHint || 'Curriculum',
    topic: sanitized,
    skill: sanitized.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    subskill: 'foundational_concept',
    displayName: `${sanitized} — Concept Application`,
    specific_problem: `Students show specific application errors in ${sanitized}.`,
    teachAction: `Review key rules and worked examples for ${sanitized} with guided error correction.`,
    recommended_teaching: `Review key rules and worked examples for ${sanitized} with guided error correction.`,
    follow_up_activity: `Complete a 5-item guided practice check focusing on ${sanitized}.`,
    reassessment_method: `Administer a short 5-question exit check on ${sanitized}.`,
    commonError: null,
    commonErrors: []
  };
}

/**
 * Extracts and normalizes detected student errors from OCR, writing evaluations,
 * question answers, and text responses.
 *
 * @param {Object} ev - Learning event or submission object
 * @returns {Array<{ diagnosis_id?: string, concept: string, category: string, topic?: string, skill: string, subskill: string, error_type: string, student_error: string, correct_form: string, specific_rule?: string, student_id?: string }>}
 */
export function extractStructuredErrorsFromEvent(ev) {
  const errors = [];
  if (!ev) return errors;

  const studentId = ev.student_id || ev.studentId;

  const pushCanonicalError = (canonical, studentErr, correctForm, fallbackRule, errorType = 'grammar') => {
    if (!canonical) return;
    errors.push({
      diagnosis_id: canonical.diagnosis_id,
      concept: canonical.displayName,
      category: canonical.category || 'Grammar',
      topic: canonical.topic || canonical.category || 'Grammar',
      skill: canonical.skill || 'grammar',
      subskill: canonical.subskill || 'general_rule',
      error_type: errorType,
      student_error: studentErr,
      correct_form: correctForm,
      specific_rule: fallbackRule || canonical.specific_problem,
      student_id: studentId
    });
  };

  // 1. Check metadata.detected_errors
  if (Array.isArray(ev.metadata?.detected_errors)) {
    ev.metadata.detected_errors.forEach(err => {
      if (err && (err.student_error || err.text)) {
        const studentErr = err.student_error || err.text;
        const correctForm = err.correct_form || err.suggestion || err.correction || '';
        const canonical = mapErrorToCanonicalConcept(studentErr, correctForm, err.rule || err.error_type || ev.topic);
        if (canonical) {
          pushCanonicalError(canonical, studentErr, correctForm, err.rule || err.specific_rule, err.error_type || 'grammar');
        }
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
          if (canonical) {
            pushCanonicalError(canonical, orig, corr, m.explanation, m.error_type || 'grammar');
          }
        }
      });
    }

    if (Array.isArray(wEval.grammar_errors)) {
      wEval.grammar_errors.forEach(ge => {
        if (ge && (ge.text || ge.student_error)) {
          const orig = ge.text || ge.student_error;
          const corr = ge.suggestion || ge.correction || '';
          const canonical = mapErrorToCanonicalConcept(orig, corr, ge.rule || ge.text);
          if (canonical) {
            pushCanonicalError(canonical, orig, corr, ge.rule, 'grammar');
          }
        }
      });
    }

    if (Array.isArray(wEval.spelling_errors)) {
      wEval.spelling_errors.forEach(se => {
        if (se && (se.text || se.misspelled_word || se.student_error)) {
          const orig = se.text || se.misspelled_word || se.student_error;
          const corr =
            se.suggestion ||
            se.correct_word ||
            se.correction ||
            HIGH_FREQUENCY_SPELLING_MAP[orig.toLowerCase().trim()] ||
            '';
          const wordKey = corr || orig;
          errors.push({
            diagnosis_id: `diag_spelling_${wordKey.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
            concept: `Spelling — "${wordKey}"`,
            category: 'Spelling',
            topic: 'Spelling',
            skill: 'spelling',
            subskill: `spelling_${wordKey.toLowerCase()}`,
            error_type: 'spelling',
            student_error: orig,
            correct_form: corr,
            specific_rule: `Students misspell "${wordKey}" as "${orig}".`,
            student_id: studentId,
            target_word: wordKey
          });
        }
      });
    }
  }

  // 3. Inspect raw text / ocr_text / text_response for specific error patterns
  const rawText = ev.metadata?.ocr_text || ev.metadata?.text_response || ev.metadata?.original_text || '';
  if (rawText && typeof rawText === 'string' && errors.length === 0) {
    const textLower = rawText.toLowerCase();

    // 3a. Simple Past: Base/present verb used with past time marker ("yesterday I go", "last night she watch")
    const pastBaseMatch = rawText.match(
      /\b(?:yesterday|last\s+(?:night|week|weekend|month|year))\s+(?:i|he|she|we|they)\s+(go|goes|eat|eats|see|sees|buy|buys|take|takes|come|comes|walk|walks|watch|watches|visit|visits|play|plays)\b/i
    );
    if (pastBaseMatch) {
      const rawVerb = pastBaseMatch[1].toLowerCase().replace(/e?s$/, '');
      const pastForm = IRREGULAR_PAST_VERBS[rawVerb] || `${rawVerb}ed`;
      pushCanonicalError(
        CANONICAL_CONCEPTS.SIMPLE_PAST_BASE_SUBSTITUTION,
        pastBaseMatch[0],
        pastBaseMatch[0].replace(new RegExp(`\\b${pastBaseMatch[1]}\\b`, 'i'), pastForm),
        CANONICAL_CONCEPTS.SIMPLE_PAST_BASE_SUBSTITUTION.specific_problem
      );
    }

    // 3b. Simple Past Irregular overgeneralization (goed, eated, buyed, seed, taked)
    const irregOverMatch = rawText.match(/\b(goed|eated|seed|buyed|taked|comed|gived|maked|writed|runned)\b/i);
    if (irregOverMatch) {
      const wrongV = irregOverMatch[1].toLowerCase();
      const baseV = wrongV.replace(/ed$/, '');
      const rightV = IRREGULAR_PAST_VERBS[baseV] || 'went';
      pushCanonicalError(
        CANONICAL_CONCEPTS.SIMPLE_PAST_IRREGULAR,
        irregOverMatch[0],
        rightV,
        CANONICAL_CONCEPTS.SIMPLE_PAST_IRREGULAR.specific_problem
      );
    }

    // 3c. Simple Past Negative ("didn't went", "didn't saw", "didn't ate")
    const didntPastMatch = rawText.match(/\bdid(?:n['’]t|\s+not)\s+(went|saw|ate|bought|took|came|made|watched|played|walked)\b/i);
    if (didntPastMatch) {
      const pVerb = didntPastMatch[1].toLowerCase();
      const baseV = PAST_TO_BASE_IRREGULAR[pVerb] || pVerb.replace(/ed$/, '');
      pushCanonicalError(
        CANONICAL_CONCEPTS.SIMPLE_PAST_NEGATIVE,
        didntPastMatch[0],
        didntPastMatch[0].replace(new RegExp(`\\b${didntPastMatch[1]}\\b`, 'i'), baseV),
        CANONICAL_CONCEPTS.SIMPLE_PAST_NEGATIVE.specific_problem
      );
    }

    // 3d. Object Pronouns ("gave he", "helped she", "called I", "with we", "to they")
    const objPronounMatch = rawText.match(
      /\b(gave|told|helped|called|saw|asked|invited|with|for|to)\s+(I|he|she|we|they)\b/i
    );
    if (objPronounMatch) {
      const subjToObj = { i: 'me', he: 'him', she: 'her', we: 'us', they: 'them' };
      const rightObj = subjToObj[objPronounMatch[2].toLowerCase()] || 'him';
      pushCanonicalError(
        CANONICAL_CONCEPTS.OBJECT_PRONOUNS,
        objPronounMatch[0],
        `${objPronounMatch[1]} ${rightObj}`,
        CANONICAL_CONCEPTS.OBJECT_PRONOUNS.specific_problem
      );
    }

    // 3e. Modal verbs can vs could ("when I was ... I can", "can plays", "could went", "can to go")
    const modalErrMatch =
      rawText.match(/\bwhen\s+(?:i|he|she|we|they)\s+(?:was|were)\s+\w+\s*,?\s*(?:i|he|she|we|they)\s+can\s+\w+/i) ||
      rawText.match(/\b(?:can|could)\s+(?:to\s+\w+|went|swam|played|plays|goes)\b/i);
    if (modalErrMatch) {
      pushCanonicalError(
        CANONICAL_CONCEPTS.MODAL_CAN_VS_COULD,
        modalErrMatch[0],
        modalErrMatch[0]
          .replace(/\bcan\b/i, 'could')
          .replace(/\bto\s+(\w+)/i, '$1')
          .replace(/\bplays\b/i, 'play')
          .replace(/\bwent\b/i, 'go'),
        CANONICAL_CONCEPTS.MODAL_CAN_VS_COULD.specific_problem
      );
    }

    // 3f. Specific Prepositions: at / on / in
    const prepAtMatch = rawText.match(/\b(?:in|on)\s+(\d{1,2}(?::\d{2})?\s*o['’]?clock|noon|midnight|night|the\s+bus\s+stop)\b/i);
    if (prepAtMatch) {
      pushCanonicalError(
        CANONICAL_CONCEPTS.PREPOSITION_AT,
        prepAtMatch[0],
        `at ${prepAtMatch[1]}`,
        CANONICAL_CONCEPTS.PREPOSITION_AT.specific_problem
      );
    }

    const prepOnMatch = rawText.match(
      /\b(?:in|at)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    );
    if (prepOnMatch) {
      pushCanonicalError(
        CANONICAL_CONCEPTS.PREPOSITION_ON,
        prepOnMatch[0],
        `on ${prepOnMatch[1]}`,
        CANONICAL_CONCEPTS.PREPOSITION_ON.specific_problem
      );
    }

    const prepInMatch = rawText.match(
      /\b(?:on|at)\s+(january|february|march|april|may|june|july|august|september|october|november|december|the\s+morning|the\s+afternoon|the\s+evening|the\s+room)\b/i
    );
    if (prepInMatch) {
      pushCanonicalError(
        CANONICAL_CONCEPTS.PREPOSITION_IN,
        prepInMatch[0],
        `in ${prepInMatch[1]}`,
        CANONICAL_CONCEPTS.PREPOSITION_IN.specific_problem
      );
    }

    // 3g. Third-person singular Simple Present errors
    const s3Match = textLower.match(/\b(?:he|she|my father|my mother)\s+(work|take|help|play|live|go)\b/i);
    if (s3Match) {
      const v = s3Match[1];
      const correctV = v === 'go' ? 'goes' : `${v}s`;
      pushCanonicalError(
        CANONICAL_CONCEPTS.SIMPLE_PRESENT_THIRD_PERSON,
        s3Match[0],
        s3Match[0].replace(v, correctV),
        CANONICAL_CONCEPTS.SIMPLE_PRESENT_THIRD_PERSON.specific_problem
      );
    }

    // 3h. "there is" plural error
    const thereIsMatch = textLower.match(/\bthere is\s+(?:five|many|three|four|two|several|a lot of)\b/i);
    if (thereIsMatch) {
      pushCanonicalError(
        CANONICAL_CONCEPTS.THERE_IS_THERE_ARE,
        thereIsMatch[0],
        thereIsMatch[0].replace(/there is/i, 'there are'),
        CANONICAL_CONCEPTS.THERE_IS_THERE_ARE.specific_problem
      );
    }

    // 3i. High-frequency spelling words in text
    for (const [misspelled, correct] of Object.entries(HIGH_FREQUENCY_SPELLING_MAP)) {
      const regex = new RegExp(`\\b${misspelled}\\b`, 'i');
      if (regex.test(textLower)) {
        errors.push({
          diagnosis_id: `diag_spelling_${correct}`,
          concept: `Spelling — "${correct}"`,
          category: 'Spelling',
          topic: 'Spelling',
          skill: 'spelling',
          subskill: `spelling_${correct}`,
          error_type: 'spelling',
          student_error: misspelled,
          correct_form: correct,
          specific_rule: `Students misspell "${correct}" as "${misspelled}".`,
          student_id: studentId,
          target_word: correct
        });
      }
    }

    // 3j. borrow vs lend
    if (/\bborrow\s+me\b/i.test(textLower)) {
      pushCanonicalError(
        CANONICAL_CONCEPTS.VOCABULARY_BORROW_LEND,
        'borrow me',
        'lend me',
        CANONICAL_CONCEPTS.VOCABULARY_BORROW_LEND.specific_problem,
        'vocabulary'
      );
    }
  }

  return errors;
}

/**
 * Maps a specific student error string and correction to its most precise canonical concept.
 */
export function mapErrorToCanonicalConcept(studentError = '', correctForm = '', hint = '') {
  const sLower = String(studentError || '').toLowerCase().trim();
  const cLower = String(correctForm || '').toLowerCase().trim();
  const hLower = String(hint || '').toLowerCase().trim();
  const combined = `${sLower} ${cLower} ${hLower}`.trim();

  // 1. Specific Prepositions: at vs on vs in
  if (
    cLower === 'at' ||
    /\bat\s+(?:\d{1,2}(?::\d{2})?\s*o['’]?clock|noon|midnight|night|the\s+bus\s+stop|the\s+station|the\s+door|school|home)\b/i.test(
      cLower
    ) ||
    /\b(?:in|on)\s+(?:\d{1,2}(?::\d{2})?\s*o['’]?clock|noon|midnight|night|the\s+bus\s+stop)\b/i.test(sLower) ||
    /\bpreposition\s+['"]?at['"]?\b/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.PREPOSITION_AT;
  }

  if (
    cLower === 'on' ||
    /\bon\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekdays|weekends|the\s+(?:table|desk|wall|floor|shelf|bus|train))\b/i.test(
      cLower
    ) ||
    /\b(?:in|at)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(sLower) ||
    /\bpreposition\s+['"]?on['"]?\b/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.PREPOSITION_ON;
  }

  if (
    cLower === 'in' ||
    /\bin\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|fall|winter|the\s+(?:morning|afternoon|evening|room|classroom|kitchen|park|garden|world|city))\b/i.test(
      cLower
    ) ||
    /\b(?:on|at)\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|the\s+morning|the\s+afternoon|the\s+evening|the\s+room)\b/i.test(
      sLower
    ) ||
    /\bpreposition\s+['"]?in['"]?\b/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.PREPOSITION_IN;
  }

  // 2. Object Pronouns
  if (
    ['me', 'him', 'her', 'us', 'them'].includes(cLower) ||
    /\b(?:gave|told|helped|called|saw|asked|invited|met|with|for|to|from)\s+(?:i|he|she|we|they)\b/i.test(sLower) ||
    /\b(?:gave|told|helped|called|saw|asked|invited|met|with|for|to|from)\s+(?:me|him|her|us|them)\b/i.test(cLower) ||
    /\bobject\s*pronouns?\b/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.OBJECT_PRONOUNS;
  }

  // 3. Modal Verbs: can vs could
  if (
    ['can', 'could', "can't", "couldn't"].includes(cLower) ||
    /\b(?:can|could)\s+(?:to\s+\w+|went|swam|played|plays|goes)\b/i.test(sLower) ||
    /\bmodal\b.*\b(?:can|could)\b|\bcan\s*(?:vs\.?|\/|or|and)\s*could\b|\bpast\s+ability\b/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.MODAL_CAN_VS_COULD;
  }

  // 4. There is / There are
  if (/there is.*(?:five|many|three|four|members|books)|there are.*vs.*there is/i.test(combined)) {
    return CANONICAL_CONCEPTS.THERE_IS_THERE_ARE;
  }

  // 5. Simple Present Third-Person Singular
  if (
    /(?:he|she|mother|father|it)\s+(?:work|take|help|go|play|live)\b/i.test(sLower) ||
    /third\s*person|missing\s*-s|-s\s*ending|singular\s*verb/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PRESENT_THIRD_PERSON;
  }

  // 6. Simple Past Subskills
  if (/didn'?t\s+(?:went|saw|ate|played|watched|bought|took)/i.test(sLower) || /didn'?t\s*\+\s*base/i.test(combined)) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_NEGATIVE;
  }

  if (/\bdid\s+(?:you|he|she|they|we)\s+(?:went|saw|ate|bought|watched|played)\b/i.test(sLower)) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_QUESTIONS;
  }

  if (
    /\b(?:yesterday|last\s+(?:night|week|weekend|month|year)|ago)\b.*\b(?:go|goes|eat|eats|see|sees|buy|buys|walk|walks|watch|watches|visit|visits)\b/i.test(
      sLower
    ) ||
    /\b(?:base\s+form|present\s+tense|present\s+form)\s+instead\s+of\s+(?:the\s+)?simple\s+past\b/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_BASE_SUBSTITUTION;
  }

  if (
    /\b(?:eated|goed|seed|buyed|taked|comed|gived|maked|writed|runned)\b/i.test(sLower) ||
    /\birregular\s*past\b/i.test(combined)
  ) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_IRREGULAR;
  }

  if (/\bregular\s*(?:past|-ed)\b/i.test(combined)) {
    return CANONICAL_CONCEPTS.SIMPLE_PAST_REGULAR_ED;
  }

  // 7. Vocabulary borrow vs lend
  if (/borrow\s*me|lend\s*me/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_BORROW_LEND;
  }

  // 8. Vocabulary say vs tell
  if (/said\s*me|told\s*me/i.test(combined)) {
    return CANONICAL_CONCEPTS.VOCABULARY_SAY_TELL;
  }

  // 9. Spelling specific words
  for (const [misspelled, correct] of Object.entries(HIGH_FREQUENCY_SPELLING_MAP)) {
    if (sLower.includes(misspelled) || cLower === correct) {
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
        follow_up_activity: `Write 4 complete sentences using "${correct}" after a Look-Say-Cover-Write check.`,
        reassessment_method: `Dictate 4 sentences containing "${correct}" and related vowel-pattern words.`,
        commonError: { student_error: misspelled, correct_form: correct },
        commonErrors: [{ student_error: misspelled, correct_form: correct }]
      };
    }
  }

  return normalizeConcept(hint || studentError);
}
