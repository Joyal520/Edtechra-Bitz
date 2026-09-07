// ============================================================================
// EDTECHRA ASSESSMENT BLUEPRINT ENGINE
// Predefined curriculum-aligned blueprints for Standard and O/L Style Exams.
// Translates teacher lesson notes and content into balanced exam structures.
// ============================================================================

import {
  CanonicalAssessmentV2,
  ExamSection,
  CanonicalQuestion,
  ExamActivity,
  ExamDifficulty,
  ActivityRubric,
  MultipleChoiceQuestion
} from './ExamSchema';
import { THEME_PRESETS } from './themePresets';

export interface StandardExamInput {
  subject: string;
  grade: string;
  topic: string;
  lessonNotes?: string;
  difficulty?: ExamDifficulty;
  durationMinutes?: number;
  totalMarks?: number;
}

export interface AdjustExamOptions {
  moreGrammar?: boolean;
  moreVocabulary?: boolean;
  moreReading?: boolean;
  addListening?: boolean;
  addVideo?: boolean;
  addPictureDescription?: boolean;
  addWriting?: boolean;
  makeEasier?: boolean;
  makeChallenging?: boolean;
  questionCount?: number;
  durationMinutes?: number;
}

const STOPWORDS = new Set([
  'about', 'their', 'there', 'which', 'would', 'could', 'should',
  'these', 'those', 'where', 'after', 'before', 'because', 'between'
]);

/**
 * Extracts key sentences or terms from teacher lesson notes to ground questions
 */
export function extractKeywordsFromNotes(notes: string = ''): string[] {
  if (!notes || typeof notes !== 'string') return [];
  const words = notes
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOPWORDS.has(w.toLowerCase()));
  return Array.from(new Set(words)).slice(0, 10);
}

/**
 * 1. STANDARD EXAM BLUEPRINT GENERATOR
 * Generates a balanced question mix:
 * - Section A: Core Language & Grammar (MCQ, True/False, Fill in Blank, Sentence Completion, Error Correction)
 * - Section B: Reading Comprehension Activity (Passage + factual, inferential, vocab questions)
 * - Section C: Listening Activity (Audio track + teacher transcript + questions)
 * - Section D: Picture Description & Guided Writing (Visual prompt + rubric + writing task)
 */
export function generateStandardExamBlueprint(input: StandardExamInput): CanonicalAssessmentV2 {
  const {
    subject = 'English Language',
    grade = 'Grade 10',
    topic = 'Simple Present Tense',
    lessonNotes = '',
    difficulty = 'Medium',
    durationMinutes = 45,
    totalMarks = 50
  } = input;

  const timestamp = Date.now().toString(36).slice(-4);
  const keywords = extractKeywordsFromNotes(lessonNotes);
  const focusWord = keywords[0] || 'grammar';
  const secondWord = keywords[1] || 'expression';

  // Section A: Core Language & Grammar (8 Questions, 13 Marks)
  const secAQuestions: CanonicalQuestion[] = [
    {
      id: `q_${timestamp}_1`,
      type: 'multiple_choice',
      question: `Which sentence accurately demonstrates the core rule of ${topic}?`,
      options: [
        { id: 'a', text: `The teacher explains ${topic} with clear contextual examples daily.` },
        { id: 'b', text: `The teacher are explaining ${topic} with clear examples.` },
        { id: 'c', text: `The teacher have explain ${topic} yesterday.` },
        { id: 'd', text: `The teacher will be explain ${topic} tomorrow.` }
      ],
      correctAnswer: ['a'],
      difficulty: 'medium',
      marks: 1,
      required: true,
      explanation: `Option A correctly adheres to standard subject-verb agreement and the rules of ${topic}.`
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_2`,
      type: 'true_false',
      question: `In standard English usage, statements concerning ${topic} require the verb to agree in number and person with its subject.`,
      correctAnswer: true,
      difficulty: 'easy',
      marks: 1,
      required: true,
      explanation: 'Subject-verb agreement is a fundamental grammatical requirement across all registers.'
    } as any,
    {
      id: `q_${timestamp}_3`,
      type: 'fill_in_blank',
      question: `Complete the sentence: "Every student in our class _____ (understand/understands) the significance of ${topic}."`,
      acceptedAnswers: ['understands'],
      caseSensitive: false,
      difficulty: 'medium',
      marks: 1,
      required: true,
      explanation: '"Every student" is singular and takes the singular verb "understands".'
    } as any,
    {
      id: `q_${timestamp}_4`,
      type: 'fill_in_blank',
      question: `Sentence Completion: "Neither the captain nor the players _____ (was/were) ready to concede defeat."`,
      acceptedAnswers: ['were'],
      caseSensitive: false,
      difficulty: 'medium',
      marks: 1,
      required: true,
      explanation: 'When subjects are joined by "neither... nor", the verb agrees with the closer subject ("players" -> "were").'
    } as any,
    {
      id: `q_${timestamp}_5`,
      type: 'short_answer',
      question: `Sentence Transformation: Rewrite the following sentence into the negative form without altering its intended meaning: "He always speaks the truth."`,
      sampleAnswer: 'He never tells a lie. / He does not tell lies.',
      rubric: 'Full marks for grammatically sound negative construction conveying the original sense.',
      difficulty: 'hard',
      marks: 2,
      required: true,
      explanation: 'Rewriting with "never tells a lie" or appropriate negative syntax preserves the original meaning.'
    } as any,
    {
      id: `q_${timestamp}_6`,
      type: 'short_answer',
      question: `Error Correction: Identify and correct the single error in: "Each of the books on the shelf have been catalogued by the librarian."`,
      sampleAnswer: 'Replace "have" with "has". Correct sentence: "Each of the books on the shelf has been catalogued by the librarian."',
      difficulty: 'medium',
      marks: 2,
      required: true,
      explanation: '"Each" is the singular grammatical subject and requires the singular auxiliary "has".'
    } as any,
    {
      id: `q_${timestamp}_7`,
      type: 'matching',
      question: `Match each language concept related to ${topic} with its corresponding definition:`,
      pairs: [
        { id: 'p1', left: focusWord.charAt(0).toUpperCase() + focusWord.slice(1), right: `Key terminology extracted from lesson notes on ${topic}` },
        { id: 'p2', left: secondWord.charAt(0).toUpperCase() + secondWord.slice(1), right: 'Contextual expression reinforcing standard English structure' },
        { id: 'p3', left: 'Subject-Verb Agreement', right: 'Verb matches the subject in number and person' }
      ],
      difficulty: 'medium',
      marks: 3,
      required: true,
      explanation: 'Correct conceptual pairings for standard English language instruction.'
    } as any,
    {
      id: `q_${timestamp}_8`,
      type: 'reorder',
      question: 'Arrange these scrambled words into a grammatically coherent sentence:',
      items: [
        { id: 'w1', text: 'Diligent students' },
        { id: 'w2', text: 'consistently achieve' },
        { id: 'w3', text: 'remarkable academic progress' },
        { id: 'w4', text: 'through deliberate practice.' }
      ],
      correctOrder: ['w1', 'w2', 'w3', 'w4'],
      difficulty: 'medium',
      marks: 2,
      required: true,
      explanation: 'Subject ("Diligent students") + Verb ("consistently achieve") + Object ("remarkable academic progress") + Adverbial modifier.'
    } as any
  ];

  // Section B: Reading Comprehension Activity (1 Passage, 4 Questions, 10 Marks)
  const samplePassage = lessonNotes.trim().length > 120
    ? lessonNotes.trim()
    : `Language is a living, evolving instrument of human connection and intellectual inquiry. When students examine how words interact within structured sentences, they develop more than grammatical accuracy—they cultivate precision of thought. Mastery of ${topic} allows learners to articulate observations, describe ongoing realities, and debate viewpoints with clarity. In both scholarly prose and everyday dialogue, intentional phrasing ensures that complex ideas are communicated without ambiguity. By actively analyzing authentic texts, students transition from passive readers into critical evaluators of meaning and tone.`;

  const readingActivity: ExamActivity = {
    id: `act_reading_${timestamp}`,
    activityType: 'reading_activity',
    title: `Reading Passage: Understanding ${topic} in Practice`,
    passage: samplePassage,
    questions: [
      {
        id: `q_rc_${timestamp}_1`,
        type: 'multiple_choice',
        question: 'According to the passage, what major capability develops when students master foundational sentence structure?',
        options: [
          { id: 'a', text: 'Precision of thought and clarity in communicating complex ideas' },
          { id: 'b', text: 'Memorization of isolated terminology without contextual practice' },
          { id: 'c', text: 'Elimination of all informal conversation in social settings' },
          { id: 'd', text: 'Preference for written communication over spoken dialogue' }
        ],
        correctAnswer: ['a'],
        difficulty: 'easy',
        marks: 2,
        required: true,
        explanation: 'The author states that intentional structural understanding cultivates precision of thought.'
      } as any,
      {
        id: `q_rc_${timestamp}_2`,
        type: 'short_answer',
        question: `Vocabulary in Context: Find a word or phrase in the passage that carries the closest meaning to "clarity and exactness".`,
        sampleAnswer: 'Precision / Precision of thought',
        difficulty: 'medium',
        marks: 2,
        required: true,
        explanation: '"Precision" represents exactness and freedom from vagueness.'
      } as any,
      {
        id: `q_rc_${timestamp}_3`,
        type: 'multiple_choice',
        question: 'Inference: What can be inferred about the author\'s view of authentic reading materials?',
        options: [
          { id: 'a', text: 'They empower students to become active, critical evaluators of meaning.' },
          { id: 'b', text: 'They are only useful for advanced post-graduate researchers.' },
          { id: 'c', text: 'They cause confusion when introduced prior to full grammar mastery.' },
          { id: 'd', text: 'They should be replaced entirely by multiple-choice exercises.' }
        ],
        correctAnswer: ['a'],
        difficulty: 'hard',
        marks: 3,
        required: true,
        explanation: 'The closing sentence highlights that analyzing authentic texts enables critical evaluation.'
      } as any,
      {
        id: `q_rc_${timestamp}_4`,
        type: 'short_answer',
        question: `Based on the text, state two distinct benefits students gain from deliberate language study.`,
        sampleAnswer: '1. Articulating observations with clarity. 2. Developing critical thinking and precision of thought.',
        difficulty: 'medium',
        marks: 3,
        required: true,
        explanation: 'Passage mentions clarity of communication and critical thinking evaluation.'
      } as any
    ]
  };

  // Section C: Listening Activity (1 Audio Stimulus, 3 Questions, 10 Marks)
  const listeningActivity: ExamActivity = {
    id: `act_listening_${timestamp}`,
    activityType: 'listening_activity',
    title: `Listening Activity: Classroom Discussion on ${topic}`,
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg',
    transcript: `Teacher: Good morning, everyone. Today we are examining how language functions in daily routines. Notice how we say "the sun rises in the east" rather than "the sun is rising" when describing a universal truth. Who can provide another natural example?
Student: Sir, water boils at 100 degrees Celsius!
Teacher: Excellent observation, Nethmi. That is a scientific principle expressed through simple, direct grammar. When writing essays, maintaining consistent tense keeps your argument coherent and persuasive.`,
    showTranscriptToStudents: false,
    questions: [
      {
        id: `q_list_${timestamp}_1`,
        type: 'multiple_choice',
        question: 'According to the teacher in the recording, why do we say "the sun rises in the east"?',
        options: [
          { id: 'a', text: 'Because it represents a timeless universal truth' },
          { id: 'b', text: 'Because it is an action occurring only right now' },
          { id: 'c', text: 'Because it happened exclusively in the past' },
          { id: 'd', text: 'Because it is an unverified hypothesis' }
        ],
        correctAnswer: ['a'],
        difficulty: 'medium',
        marks: 3,
        required: true,
        explanation: 'The teacher states that universal truths are naturally conveyed in this structure.'
      } as any,
      {
        id: `q_list_${timestamp}_2`,
        type: 'fill_in_blank',
        question: 'What scientific example did the student Nethmi provide in the conversation? "Water boils at _____ degrees Celsius."',
        acceptedAnswers: ['100', '100 degrees', 'one hundred'],
        difficulty: 'easy',
        marks: 3,
        required: true,
        explanation: 'Nethmi states that water boils at 100 degrees Celsius.'
      } as any,
      {
        id: `q_list_${timestamp}_3`,
        type: 'short_answer',
        question: 'What key writing advice does the teacher conclude with at the end of the audio clip?',
        sampleAnswer: 'Maintaining consistent tense keeps essays coherent and persuasive.',
        difficulty: 'medium',
        marks: 4,
        required: true,
        explanation: 'Consistent tense ensures coherence and persuasive strength in composition.'
      } as any
    ]
  };

  // Section D: Picture Description & Writing (1 Stimulus Image, Rubric, 15 Marks)
  const defaultRubric: ActivityRubric = {
    content: 4,
    vocabulary: 4,
    grammar: 4,
    organization: 3
  };

  const pictureActivity: ExamActivity = {
    id: `act_picture_${timestamp}`,
    activityType: 'picture_description_activity',
    title: `Picture Description & Composition Task`,
    imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80',
    pictureTaskType: 'write_paragraph',
    instructions: `Study the image carefully. Write a cohesive paragraph of about 80–100 words describing the collaborative activity taking place. Ensure you apply the rules of ${topic} and maintain correct punctuation and spelling.`,
    rubric: defaultRubric,
    marks: 15,
    questions: []
  };

  const sections: ExamSection[] = [
    {
      id: `sec_${timestamp}_A`,
      title: 'Section A — Grammar & Core Language',
      description: `Answer all questions testing grammatical precision and vocabulary on ${topic}.`,
      questions: secAQuestions,
      activities: []
    },
    {
      id: `sec_${timestamp}_B`,
      title: 'Section B — Reading Comprehension',
      description: 'Read the passage carefully and respond to the questions based on context and inference.',
      questions: [],
      activities: [readingActivity]
    },
    {
      id: `sec_${timestamp}_C`,
      title: 'Section C — Listening Activity',
      description: 'Listen attentively to the audio track and answer the comprehension questions. The recording can be played up to twice.',
      questions: [],
      activities: [listeningActivity]
    },
    {
      id: `sec_${timestamp}_D`,
      title: 'Section D — Picture Description & Writing',
      description: 'Review the visual stimulus and compose your response according to the provided instructions and marking rubric.',
      questions: [],
      activities: [pictureActivity]
    }
  ];

  return {
    schemaVersion: '2.0',
    assessmentType: 'exam',
    exam: {
      title: `${subject}: ${topic} Examination`,
      subject,
      grade,
      examType: 'Standard Exam',
      difficulty,
      topic,
      description: `Comprehensive curriculum assessment for ${grade} covering Core Language, Reading Comprehension, Listening, and Guided Writing on "${topic}".`,
      instructions: 'Read each section carefully. Attempt all objective and comprehension questions before composing your writing task. Manage your time efficiently.',
      durationMinutes,
      passPercentage: 50,
      totalMarks,
      maxAttempts: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
      showMarksImmediately: true,
      showCorrectAnswers: true
    },
    theme: THEME_PRESETS.edtechra_light,
    brandKit: {
      enabled: false,
      watermark: false
    },
    surveySettings: {
      isAnonymous: false,
      collectEmail: true,
      oneResponsePerUser: true,
      thankYouMessage: 'Your examination has been submitted successfully!'
    },
    sections
  };
}

/**
 * 2. O/L STYLE EXAM BLUEPRINT GENERATOR
 * Strictly models Sri Lankan G.C.E. Ordinary Level English Language assessment practices:
 * - Section A: Vocabulary & Grammar (Test 1-4 format: gap fill, matching, sentence completion, verb forms)
 * - Section B: Reading Comprehension (Test 5-6 format: passage reading, true/false check, vocabulary in context)
 * - Section C: Picture Description (Test 7 format: visual stimulus with official 4-trait rubric: Content, Language, Format, Organization)
 * - Section D: Guided Writing (Test 8/14 format: formal notice, informal letter, or guided paragraph)
 * - Section E: Listening Practice (Authentic dialog with factual recall questions)
 */
export function generateOLStyleBlueprint(input: StandardExamInput): CanonicalAssessmentV2 {
  const {
    subject = 'English Language',
    grade = 'Grade 10',
    topic = 'Grammar & Functional Writing',
    lessonNotes = '',
    difficulty = 'Medium',
    durationMinutes = 60,
    totalMarks = 60
  } = input;

  const timestamp = Date.now().toString(36).slice(-4);

  // Section A: O/L Grammar & Vocabulary
  const secAQuestions: CanonicalQuestion[] = [
    {
      id: `ol_q_${timestamp}_1`,
      type: 'fill_in_blank',
      question: 'Test 1: Fill in each blank with the most appropriate preposition from the brackets [ in / on / at / for / through ]:\n"The annual school science exhibition will be held _____ Monday morning in the main auditorium."',
      acceptedAnswers: ['on'],
      caseSensitive: false,
      difficulty: 'easy',
      marks: 2,
      required: true,
      explanation: 'Use the preposition "on" for days of the week ("on Monday").'
    } as any,
    {
      id: `ol_q_${timestamp}_2`,
      type: 'matching',
      question: 'Test 2: Match the situations in Column A with the most appropriate polite responses in Column B:',
      pairs: [
        { id: 'ol_p1', left: 'A friend passes an examination with distinctions', right: 'Warmest congratulations on your success!' },
        { id: 'ol_p2', left: 'Accidentally bumping into someone in a queue', right: 'I beg your pardon, excuse me.' },
        { id: 'ol_p3', left: 'Declining a formal dinner invitation politely', right: 'Thank you for the invitation, but I am unable to attend.' }
      ],
      difficulty: 'medium',
      marks: 3,
      required: true,
      explanation: 'Matches standard functional English expressions in daily communication.'
    } as any,
    {
      id: `ol_q_${timestamp}_3`,
      type: 'multiple_choice',
      question: 'Test 3: Select the correct verb form to complete the sentence:\n"Neither the teacher nor the head prefect _____ arrived at the meeting yet."',
      options: [
        { id: 'a', text: 'has' },
        { id: 'b', text: 'have' },
        { id: 'c', text: 'are' },
        { id: 'd', text: 'were' }
      ],
      correctAnswer: ['a'],
      difficulty: 'medium',
      marks: 2,
      required: true,
      explanation: 'The verb agrees with the closer singular noun "head prefect" -> "has arrived".'
    } as MultipleChoiceQuestion,
    {
      id: `ol_q_${timestamp}_4`,
      type: 'short_answer',
      question: 'Test 4: Rewrite the sentence in the Passive Voice:\n"The local municipal council renovated the ancient public library last month."',
      sampleAnswer: 'The ancient public library was renovated by the local municipal council last month.',
      difficulty: 'medium',
      marks: 3,
      required: true,
      explanation: 'Object ("The ancient public library") + Past tense passive auxiliary ("was renovated") + Agent ("by the local municipal council").'
    } as any
  ];

  // Section B: O/L Reading Comprehension
  const olReadingPassage = lessonNotes.trim().length > 150
    ? lessonNotes.trim()
    : `The ancient irrigation network of Sri Lanka stands as one of the world's most sophisticated civil engineering achievements. Built between the 3rd century BCE and the 12th century CE, these colossal man-made reservoirs, known locally as "wewas", sustained agricultural civilizations in the arid dry zones. The ancient hydraulic engineers mastered the construction of the "bisokotuwa", an ingenious valve tower that regulated water pressure and prevented reservoir embankments from collapsing under torrential monsoon rains. Today, modern environmental scientists study these ancient catchment systems to learn sustainable methods for combating climate irregularities and water scarcity.`;

  const olReadingActivity: ExamActivity = {
    id: `ol_act_reading_${timestamp}`,
    activityType: 'reading_activity',
    title: 'Test 5: Reading Comprehension — Sri Lanka\'s Hydraulic Heritage',
    passage: olReadingPassage,
    questions: [
      {
        id: `ol_q_rc_${timestamp}_1`,
        type: 'multiple_choice',
        question: 'What was the primary purpose of the ancient "bisokotuwa" valve tower?',
        options: [
          { id: 'a', text: 'To regulate water pressure and protect reservoir embankments from collapsing' },
          { id: 'b', text: 'To store grain reserves during seasonal harvest droughts' },
          { id: 'c', text: 'To generate mechanical electricity for royal workshops' },
          { id: 'd', text: 'To serve as an astronomical observation deck' }
        ],
        correctAnswer: ['a'],
        difficulty: 'medium',
        marks: 2,
        required: true,
        explanation: 'The text specifies the bisokotuwa regulated water pressure and prevented collapse.'
      } as any,
      {
        id: `ol_q_rc_${timestamp}_2`,
        type: 'true_false',
        question: 'State True or False: Modern scientists study the ancient reservoirs to discover sustainable techniques for dealing with water scarcity.',
        correctAnswer: true,
        difficulty: 'easy',
        marks: 2,
        required: true,
        explanation: 'Directly supported by the final sentence of the text.'
      } as any,
      {
        id: `ol_q_rc_${timestamp}_3`,
        type: 'short_answer',
        question: 'Write down a word from the text that means "colossal or exceptionally large".',
        sampleAnswer: 'Colossal',
        difficulty: 'medium',
        marks: 2,
        required: true,
        explanation: '"Colossal" directly appears in the second sentence.'
      } as any
    ]
  };

  // Section C: O/L Picture Description
  const olPictureActivity: ExamActivity = {
    id: `ol_act_picture_${timestamp}`,
    activityType: 'picture_description_activity',
    title: 'Test 6: Picture Description Activity',
    imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80',
    pictureTaskType: 'describe',
    instructions: 'Look at the picture given below. Write 5 grammatically correct sentences describing the scene. You may mention what the people are doing, their surroundings, and expressions.',
    rubric: {
      content: 3,
      vocabulary: 2,
      grammar: 3,
      organization: 2
    },
    marks: 10,
    questions: []
  };

  // Section D: O/L Guided Writing
  const secDQuestions: CanonicalQuestion[] = [
    {
      id: `ol_q_writing_${timestamp}`,
      type: 'paragraph',
      question: `Test 7: Guided Writing Task\n\nYou are the secretary of the English Literary Association of your school. Write a formal NOTICE informing members about an upcoming debate competition on "${topic}".\nInclude:\n- Date, time, and venue\n- Topic of debate\n- Criteria for eligibility\n- Deadline for registration\n(Word limit: 50–60 words)`,
      minWords: 45,
      maxWords: 75,
      rubric: 'Marks allocation: Content (3), Language & Accuracy (4), Format & Layout (3) = 10 Marks.',
      difficulty: 'medium',
      marks: 10,
      required: true,
      explanation: 'Evaluates standard formal notice format, clarity of particulars, and grammatical precision.'
    } as any
  ];

  // Section E: O/L Listening Practice
  const olListeningActivity: ExamActivity = {
    id: `ol_act_listening_${timestamp}`,
    activityType: 'listening_activity',
    title: 'Test 8: Listening Comprehension Practice',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg',
    transcript: `Announcement: Attention all passengers traveling on the Express Train to Kandy, scheduled for 10:15 AM from Platform 3. Due to essential track maintenance between Polgahawela and Rambukkana, departure is rescheduled to 10:45 AM from Platform 5. Refreshment services are available at the main station concourse. We apologize for any inconvenience.`,
    showTranscriptToStudents: false,
    questions: [
      {
        id: `ol_q_list_${timestamp}_1`,
        type: 'multiple_choice',
        question: 'What is the updated departure time announced for the Kandy Express Train?',
        options: [
          { id: 'a', text: '10:45 AM' },
          { id: 'b', text: '10:15 AM' },
          { id: 'c', text: '11:00 AM' },
          { id: 'd', text: '09:45 AM' }
        ],
        correctAnswer: ['a'],
        difficulty: 'easy',
        marks: 2,
        required: true,
        explanation: 'The announcement states departure is rescheduled to 10:45 AM.'
      } as any,
      {
        id: `ol_q_list_${timestamp}_2`,
        type: 'fill_in_blank',
        question: 'Passengers should now proceed to Platform number _____ for boarding.',
        acceptedAnswers: ['5', 'five', 'Platform 5'],
        difficulty: 'easy',
        marks: 2,
        required: true,
        explanation: 'The revised platform is Platform 5.'
      } as any
    ]
  };

  const sections: ExamSection[] = [
    {
      id: `ol_sec_A_${timestamp}`,
      title: 'Section A — Vocabulary & Language Structures',
      description: 'Grammar mechanics, prepositions, functional communication, and sentence transformation.',
      questions: secAQuestions,
      activities: []
    },
    {
      id: `ol_sec_B_${timestamp}`,
      title: 'Section B — Reading Comprehension',
      description: 'Reading passage analysis, factual retrieval, and vocabulary in context.',
      questions: [],
      activities: [olReadingActivity]
    },
    {
      id: `ol_sec_C_${timestamp}`,
      title: 'Section C — Picture Description',
      description: 'Visual scene description with structured assessment rubric.',
      questions: [],
      activities: [olPictureActivity]
    },
    {
      id: `ol_sec_D_${timestamp}`,
      title: 'Section D — Guided Writing',
      description: 'Functional writing (notice/letter/paragraph) following official examination rubrics.',
      questions: secDQuestions,
      activities: []
    },
    {
      id: `ol_sec_E_${timestamp}`,
      title: 'Section E — Listening Practice',
      description: 'Audio comprehension testing attentive listening and information retrieval.',
      questions: [],
      activities: [olListeningActivity]
    }
  ];

  return {
    schemaVersion: '2.0',
    assessmentType: 'exam',
    exam: {
      title: `O/L Style Practice: ${subject} (${topic})`,
      subject,
      grade,
      examType: 'O/L Practice',
      difficulty,
      topic,
      description: `Curriculum practice paper aligned with Sri Lankan G.C.E. O/L English Language format for ${grade}. Note: This is an EdTechra practice simulation designed for syllabus preparation.`,
      instructions: 'Answer all questions across Sections A to E. Follow specific instructions under each test format. Write legibly and review before submitting.',
      durationMinutes,
      passPercentage: 45,
      totalMarks,
      maxAttempts: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
      showMarksImmediately: true,
      showCorrectAnswers: true
    },
    theme: THEME_PRESETS.edtechra_light,
    brandKit: {
      enabled: false,
      watermark: false
    },
    surveySettings: {
      isAnonymous: false,
      collectEmail: true,
      oneResponsePerUser: true,
      thankYouMessage: 'Your O/L Style Practice examination has been recorded!'
    },
    sections
  };
}

/**
 * 3. ADJUST EXAM ENGINE ("Adjust Exam" instead of forcing question-type selection)
 * Takes simple teacher adjustments and recalculates the assessment blueprint:
 * - More grammar
 * - More vocabulary
 * - More reading
 * - Add listening
 * - Add video
 * - Add picture description
 * - Add more writing
 * - Make easier / challenging
 * - Total questions & duration
 */
export function adjustExamBlueprint(
  current: CanonicalAssessmentV2,
  options: AdjustExamOptions
): CanonicalAssessmentV2 {
  const timestamp = Date.now().toString(36).slice(-4);
  const updated = JSON.parse(JSON.stringify(current)) as CanonicalAssessmentV2;

  // 1. Duration & Difficulty Updates
  if (options.durationMinutes && options.durationMinutes > 0) {
    updated.exam.durationMinutes = options.durationMinutes;
  }

  if (options.makeEasier) {
    updated.exam.difficulty = 'Easy';
    updated.sections.forEach((sec) => {
      sec.questions?.forEach((q) => {
        q.difficulty = 'easy';
      });
      sec.activities?.forEach((act) => {
        act.questions?.forEach((q) => {
          q.difficulty = 'easy';
        });
      });
    });
  } else if (options.makeChallenging) {
    updated.exam.difficulty = 'Hard';
    updated.sections.forEach((sec) => {
      sec.questions?.forEach((q) => {
        q.difficulty = 'hard';
      });
      sec.activities?.forEach((act) => {
        act.questions?.forEach((q) => {
          q.difficulty = 'hard';
        });
      });
    });
  }

  // 2. More Grammar / Vocabulary
  if (options.moreGrammar || options.moreVocabulary) {
    const grammarSection = updated.sections.find((s) => s.title.toLowerCase().includes('grammar')) || updated.sections[0];
    if (grammarSection) {
      const currentCount = grammarSection.questions.length;
      grammarSection.questions.push({
        id: `q_adj_mcq_${timestamp}_${currentCount + 1}`,
        type: 'multiple_choice',
        question: `Additional practice: Which sentence represents standard grammatical agreement in context?`,
        options: [
          { id: 'a', text: 'Accurate syntax with clear subject-verb concord.' },
          { id: 'b', text: 'Syntax with missing auxiliary markers.' },
          { id: 'c', text: 'Mismatched plural subject with singular marker.' },
          { id: 'd', text: 'Incorrect participle placement.' }
        ],
        correctAnswer: ['a'],
        difficulty: updated.exam.difficulty.toLowerCase() as any,
        marks: 1,
        required: true,
        explanation: 'Follows standard concord and structural agreement rules.'
      } as any);

      if (options.moreVocabulary) {
        grammarSection.questions.push({
          id: `q_adj_vocab_${timestamp}_${currentCount + 2}`,
          type: 'fill_in_blank',
          question: 'Vocabulary expansion: Select the precise term to complete: "The speaker\'s arguments were _____ (convince/convincing/convinced) to the audience."',
          acceptedAnswers: ['convincing'],
          caseSensitive: false,
          difficulty: updated.exam.difficulty.toLowerCase() as any,
          marks: 1,
          required: true,
          explanation: 'The adjective form "convincing" describes the quality of the arguments.'
        } as any);
      }
    }
  }

  // 3. More Reading
  if (options.moreReading) {
    let readingSec = updated.sections.find((s) => s.title.toLowerCase().includes('reading'));
    if (!readingSec) {
      readingSec = {
        id: `sec_reading_new_${timestamp}`,
        title: 'Section — Reading Comprehension',
        description: 'Read the supplementary passage and answer the questions below.',
        questions: [],
        activities: []
      };
      updated.sections.push(readingSec);
    }

    let readingAct = readingSec.activities?.find((a) => a.activityType === 'reading_activity');
    if (!readingAct) {
      readingAct = {
        id: `act_reading_new_${timestamp}`,
        activityType: 'reading_activity',
        title: `Reading Activity: ${updated.exam.topic || 'Analytical Passage'}`,
        passage: `Effective literacy requires evaluating evidence, recognizing assumptions, and discerning tone. When encountering unfamiliar vocabulary, proficient readers leverage context clues, prefix markers, and structural syntax to ascertain precise nuances of meaning.`,
        questions: []
      };
      readingSec.activities = readingSec.activities || [];
      readingSec.activities.push(readingAct);
    }

    const qCount = (readingAct.questions || []).length;
    readingAct.questions.push({
      id: `q_rc_adj_${timestamp}_${qCount + 1}`,
      type: 'multiple_choice',
      question: 'What technique does the passage recommend for determining unfamiliar word meanings?',
      options: [
        { id: 'a', text: 'Leveraging context clues, prefix markers, and sentence syntax' },
        { id: 'b', text: 'Skipping sentences with unfamiliar words entirely' },
        { id: 'c', text: 'Guessing randomly without consulting the surrounding paragraph' },
        { id: 'd', text: 'Replacing original words with unrelated vocabulary' }
      ],
      correctAnswer: ['a'],
      difficulty: 'medium',
      marks: 2,
      required: true,
      explanation: 'The author states proficient readers leverage context clues and structural syntax.'
    } as any);
  }

  // 4. Add Listening
  if (options.addListening) {
    const hasListening = updated.sections.some((s) => s.activities?.some((a) => a.activityType === 'listening_activity'));
    if (!hasListening) {
      const listeningSec: ExamSection = {
        id: `sec_listening_new_${timestamp}`,
        title: 'Section — Listening Activity',
        description: 'Listen carefully to the audio stimulus and answer the comprehension items.',
        questions: [],
        activities: [
          {
            id: `act_listening_new_${timestamp}`,
            activityType: 'listening_activity',
            title: `Listening Comprehension: ${updated.exam.topic || 'Dialogue'}`,
            audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_market.ogg',
            transcript: `Speaker 1: Welcome to the weekly briefing. Today we are prioritizing three key educational objectives. First, active participation in seminars. Second, thorough reading analysis. And third, timely submission of coursework.
Speaker 2: Thank you for the clarity. The student body will observe these guidelines promptly.`,
            showTranscriptToStudents: false,
            questions: [
              {
                id: `q_list_adj_${timestamp}_1`,
                type: 'multiple_choice',
                question: 'Which of the following was listed as the first priority in the briefing?',
                options: [
                  { id: 'a', text: 'Active participation in seminars' },
                  { id: 'b', text: 'Cancelling upcoming exams' },
                  { id: 'c', text: 'Postponing all coursework submissions' },
                  { id: 'd', text: 'Organizing extracurricular sports' }
                ],
                correctAnswer: ['a'],
                difficulty: 'easy',
                marks: 2,
                required: true,
                explanation: 'Speaker 1 clearly identifies seminar participation as the first objective.'
              } as any
            ]
          }
        ]
      };
      updated.sections.push(listeningSec);
    }
  }

  // 5. Add Video
  if (options.addVideo) {
    const hasVideo = updated.sections.some((s) => s.activities?.some((a) => a.activityType === 'video_activity'));
    if (!hasVideo) {
      const videoSec: ExamSection = {
        id: `sec_video_new_${timestamp}`,
        title: 'Section — Video Activity',
        description: 'Watch the instructional video and complete the accompanying comprehension questions.',
        questions: [],
        activities: [
          {
            id: `act_video_new_${timestamp}`,
            activityType: 'video_activity',
            title: `Video Activity: ${updated.exam.topic || 'Video Lesson'}`,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            transcript: 'Educational video narrative detailing essential concepts with visual diagrams and practical demonstrations.',
            showTranscriptToStudents: false,
            questions: [
              {
                id: `q_vid_adj_${timestamp}_1`,
                type: 'multiple_choice',
                question: 'What is the primary conceptual demonstration presented in the video clip?',
                options: [
                  { id: 'a', text: 'Practical demonstration supporting the lesson core' },
                  { id: 'b', text: 'Historical background unrelated to the current unit' },
                  { id: 'c', text: 'Contradictory examples disproving the topic' },
                  { id: 'd', text: 'Theoretical speculation without visual examples' }
                ],
                correctAnswer: ['a'],
                difficulty: 'medium',
                marks: 2,
                required: true,
                explanation: 'Directly depicted in the video sequence.'
              } as any
            ]
          }
        ]
      };
      updated.sections.push(videoSec);
    }
  }

  // 6. Add Picture Description
  if (options.addPictureDescription) {
    const hasPicture = updated.sections.some((s) => s.activities?.some((a) => a.activityType === 'picture_description_activity'));
    if (!hasPicture) {
      const picSec: ExamSection = {
        id: `sec_picture_new_${timestamp}`,
        title: 'Section — Picture Description',
        description: 'Examine the visual stimulus and respond according to the prompt instructions.',
        questions: [],
        activities: [
          {
            id: `act_picture_new_${timestamp}`,
            activityType: 'picture_description_activity',
            title: 'Picture Description Activity',
            imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80',
            pictureTaskType: 'describe',
            instructions: 'Look at the image carefully. Write 5 clear and grammatically correct sentences describing what you observe in the picture.',
            rubric: { content: 3, vocabulary: 2, grammar: 3, organization: 2 },
            marks: 10,
            questions: []
          }
        ]
      };
      updated.sections.push(picSec);
    }
  }

  // 7. Add More Writing
  if (options.addWriting) {
    const writingSec = updated.sections.find((s) => s.title.toLowerCase().includes('writing')) || updated.sections[updated.sections.length - 1];
    if (writingSec) {
      writingSec.questions.push({
        id: `q_writing_adj_${timestamp}`,
        type: 'paragraph',
        question: `Guided Composition: In approximately 80 words, write a paragraph discussing the real-world applications of ${updated.exam.topic || 'the topic studied today'}.`,
        minWords: 60,
        maxWords: 100,
        rubric: 'Evaluated on Content (4), Grammar & Accuracy (4), and Structure (2).',
        difficulty: 'medium',
        marks: 10,
        required: true,
        explanation: 'Evaluates coherent paragraph construction, topic sentence, and supporting ideas.'
      } as any);
    }
  }

  return updated;
}
