// scripts/seed_annabelle_course.mjs
// Native integration script for "Learn the Simple Past Through the Legend of Annabelle"
// In EdTechra Course Studio (Strict 7-Day A1-A2 Curriculum, 100 Marks, 400 EdTechra Points)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or SERVICE ROLE KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COURSE_ID = 'e10c7ee9-0007-4000-8000-000000000007';
const TEACHER_ID = '548eea36-a825-4c69-9ca3-89fc06218c39'; // Primary Course Studio Teacher

const ASSETS = {
  coverUrl: 'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/annabelle/covers/annabelle-cover.png',
  coverKey: 'courses/annabelle/covers/annabelle-cover.png',
  storyCollage: 'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/annabelle/images/annabelle-story-collage.png',
  missingNoteCollage: 'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/annabelle/images/annabelle-missing-note-collage.png',
  museumVisit: 'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/annabelle/images/annabelle-museum-visit.png',
  day7PictureDescription: 'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/annabelle/images/annabelle-day7-picture-description.jpg'
};

const DAYS_DATA = [
  // --------------------------------------------------------------------------
  // DAY 1 — THE SIMPLE PAST TENSE (Grammar: 15 marks / 60 points)
  // Layout: Light educational workbook
  // --------------------------------------------------------------------------
  {
    dayNumber: 1,
    title: 'Day 1 — The Simple Past Tense',
    unitTitle: 'Unit 1: The Simple Past Tense',
    unitDescription: 'Grammar: Finished actions in the past • Regular (-ed) & Irregular verbs',
    estimatedMinutes: 25,
    blocks: [
      {
        block_type: 'text',
        content: {
          title: 'Learning Objectives • The Simple Past Tense',
          text: `### Today's Learning Goals

By the end of this lesson, you should be able to:
* **Explain** when to use the Simple Past Tense.
* **Identify** regular and irregular verbs.
* **Form** regular past-tense verbs by adding *-d, -ed, or -ied*.
* **Recognize** common irregular verbs.
* **Complete** sentences using the Simple Past.`
        }
      },
      {
        block_type: 'text',
        content: {
          title: '1. What Is the Simple Past Tense?',
          text: `We use the **Simple Past Tense** to talk about finished actions in the past.

### Sentence Structure

**Subject + Past Form of the Verb + Extra Information**

### Examples

* **We walked** in the park.
* **She ran** fast.
* **They visited** the museum.
* **He opened** the window.

These actions happened in the past and are completely finished.`
        }
      },
      {
        block_type: 'text',
        content: {
          title: '2. Two Types of Past Verbs',
          text: `We make the past form of verbs in two main ways:
1. **Regular verbs**
2. **Irregular verbs**

---

### 3. Regular Verbs

Regular verbs usually form the past tense by adding **-d, -ed or -ied**.

| Base Form | Past Form | Example |
| :--- | :--- | :--- |
| **live** | **lived** | She lived in the apartment. |
| **laugh** | **laughed** | We laughed together. |
| **study** | **studied** | They studied history. |
| **play** | **played** | The children played outside. |
| **dance** | **danced** | He danced at the party. |

💡 **Remember:**
* live → **lived**
* laugh → **laughed**
* study → **studied**
* play → **played**
* dance → **danced**

---

### 4. Irregular Verbs

Some verbs do not form the past tense by adding **-d, -ed or -ied**. These are called **irregular verbs**.

| Base Form | Past Form | Example |
| :--- | :--- | :--- |
| **see** | **saw** | She saw a bird. |
| **take** | **took** | We took the bus. |
| **put** | **put** | He put the book on the table. |
| **buy** | **bought** | I bought a new bag. |
| **write** | **wrote** | She wrote a letter. |
| **go** | **went** | They went home. |

💡 **Remember:**
Some irregular verbs change completely (*go → went*, *buy → bought*). Others, such as **put**, stay the same (*put → put*).`
        }
      },
      {
        block_type: 'text_image',
        content: {
          title: '5. Read the Short Paragraph',
          image: {
            url: ASSETS.storyCollage,
            alt: 'Illustrated story panels of Donna receiving the Annabelle doll, finding it in different places, and paranormal investigators placing it in a glass case',
            caption: 'The Legend of Annabelle: Donna received the doll in 1970, noticed it moving, and investigators later placed it inside a glass museum case.',
            position: 'above'
          },
          text: `In 1970, Donna received a strange doll from her mother. She lived with her friend Angie. At first, the doll looked normal. Then Donna saw it in different places. Donna became scared. Later, the two paranormal investigators took the doll to their museum and put it in a glass case.`
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Lesson Summary',
          text: `### Quick Review

* We use the Simple Past for finished actions in the past.
* Regular verbs usually add **-d, -ed or -ied**.
* Irregular verbs have different past forms.
* A positive sentence uses the past form of the verb.

**Day 1 Total: 15 marks / 60 EdTechra points**`
        }
      }
    ],
    questions: [
      // Activity 1 — Multiple Choice (5 questions x 1 mark = 5 marks)
      {
        question_text: 'What is the Simple Past form of clean?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'clean' },
          { id: 'B', text: 'cleaned' },
          { id: 'C', text: 'cleaning' },
          { id: 'D', text: 'cleans' }
        ],
        correct_answer: 'B',
        explanation: "Correct! 'clean' is a regular verb: clean + ed = cleaned.",
        skill: 'Grammar',
        concept: 'Regular Verbs',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'Which sentence describes a finished action?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'Tom opens the door.' },
          { id: 'B', text: 'Tom is opening the door.' },
          { id: 'C', text: 'Tom opened the door.' },
          { id: 'D', text: 'Tom will open the door.' }
        ],
        correct_answer: 'C',
        explanation: "Correct! 'Tom opened the door' describes a finished action in the past.",
        skill: 'Grammar',
        concept: 'Tense Identification',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'What is the Simple Past form of buy?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'buyed' },
          { id: 'B', text: 'buying' },
          { id: 'C', text: 'buys' },
          { id: 'D', text: 'bought' }
        ],
        correct_answer: 'D',
        explanation: "Correct! 'buy' is an irregular verb: buy → bought.",
        skill: 'Grammar',
        concept: 'Irregular Verbs',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'Which sentence is correct?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'Maya cook dinner yesterday.' },
          { id: 'B', text: 'Maya cooked dinner yesterday.' },
          { id: 'C', text: 'Maya cooking dinner yesterday.' },
          { id: 'D', text: 'Maya cooks dinner yesterday.' }
        ],
        correct_answer: 'B',
        explanation: "Correct! With the time expression 'yesterday', we use the past tense 'cooked'.",
        skill: 'Grammar',
        concept: 'Sentence Formation',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'What is the Simple Past form of write?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'wrote' },
          { id: 'B', text: 'writed' },
          { id: 'C', text: 'writes' },
          { id: 'D', text: 'writing' }
        ],
        correct_answer: 'A',
        explanation: "Correct! 'write' is an irregular verb: write → wrote.",
        skill: 'Grammar',
        concept: 'Irregular Verbs',
        difficulty: 'easy',
        points: 1
      },
      // Activity 2 — Fill in the Blanks (5 questions x 2 marks = 10 marks)
      {
        question_text: 'Ravi __________ his room yesterday. (clean)',
        question_type: 'fill_blank',
        options: ['cleaned'],
        correct_answer: 'cleaned',
        explanation: "Correct! The regular past form of clean is 'cleaned'.",
        skill: 'Grammar',
        concept: 'Regular Verbs',
        difficulty: 'medium',
        points: 2
      },
      {
        question_text: 'My father __________ a new phone last week. (buy)',
        question_type: 'fill_blank',
        options: ['bought'],
        correct_answer: 'bought',
        explanation: "Correct! The irregular past form of buy is 'bought'.",
        skill: 'Grammar',
        concept: 'Irregular Verbs',
        difficulty: 'medium',
        points: 2
      },
      {
        question_text: 'We __________ a letter to our teacher. (write)',
        question_type: 'fill_blank',
        options: ['wrote'],
        correct_answer: 'wrote',
        explanation: "Correct! The irregular past form of write is 'wrote'.",
        skill: 'Grammar',
        concept: 'Irregular Verbs',
        difficulty: 'medium',
        points: 2
      },
      {
        question_text: 'The children __________ some flowers in the garden. (plant)',
        question_type: 'fill_blank',
        options: ['planted'],
        correct_answer: 'planted',
        explanation: "Correct! The regular past form of plant is 'planted'.",
        skill: 'Grammar',
        concept: 'Regular Verbs',
        difficulty: 'medium',
        points: 2
      },
      {
        question_text: 'Nimal __________ his old friend at the station. (meet)',
        question_type: 'fill_blank',
        options: ['met'],
        correct_answer: 'met',
        explanation: "Correct! The irregular past form of meet is 'met'.",
        skill: 'Grammar',
        concept: 'Irregular Verbs',
        difficulty: 'medium',
        points: 2
      }
    ]
  },

  // --------------------------------------------------------------------------
  // DAY 2 — VIDEO LESSON: THE ANNABELLE STORY (Comprehension: 15 marks / 60 points)
  // Layout: Premium dark creepy horror
  // --------------------------------------------------------------------------
  {
    dayNumber: 2,
    title: 'Day 2 — Video Lesson: The Annabelle Story',
    unitTitle: 'Unit 2: The Annabelle Video',
    unitDescription: 'Video comprehension • Narrative sequencing & key details',
    estimatedMinutes: 25,
    blocks: [
      {
        block_type: 'text',
        content: {
          title: 'Learning Objectives • The Annabelle Video',
          text: `### Today's Learning Goals

By the end of this lesson, you should be able to:
* **Understand** the main events in the Annabelle video.
* **Identify** important story details.
* **Recognize** past-tense verbs in a narrative context.
* **Arrange** story events in the correct chronological order.`
        }
      },
      {
        block_type: 'video',
        content: {
          title: 'Watch the Video: The Legend of Annabelle',
          url: 'https://www.youtube.com/watch?v=jF_aT4ygkwo&list=PLDYRoRkP5Lq0',
          video_url: 'https://www.youtube.com/watch?v=jF_aT4ygkwo&list=PLDYRoRkP5Lq0',
          video_id: 'jF_aT4ygkwo',
          video: {
            url: 'https://www.youtube.com/watch?v=jF_aT4ygkwo&list=PLDYRoRkP5Lq0',
            video_id: 'jF_aT4ygkwo',
            title: 'The Legend of Annabelle'
          },
          text: `Watch the video carefully.

**Pay attention to:**
* Who received the doll.
* What happened in the apartment.
* What the medium said.
* What the Warrens did with the doll.

> ⚠️ *Note: Remember that the video presents the Annabelle legend. Supernatural claims are part of the story and Warrens' reported belief, not presented here as verified facts.*`
        }
      },
      {
        block_type: 'image',
        content: {
          title: 'Story Illustrations: Key Chronological Moments',
          url: ASSETS.storyCollage,
          image: {
            url: ASSETS.storyCollage,
            alt: 'Illustrated story progression of the Annabelle legend',
            caption: 'Chronological progression: Donna received the doll, the doll shifted positions, strange notes appeared, and investigators locked it in a case.'
          }
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Lesson Summary',
          text: `You watched a story and identified its important events.

Remember that stories often use the Simple Past to describe what happened first, next and finally.

**Day 2 Total: 15 marks / 60 EdTechra points**`
        }
      }
    ],
    questions: [
      // Activity 1 — Multiple Choice (3 questions x 2 marks = 6 marks)
      {
        question_text: 'What happened after Donna and Angie found Annabelle in different places?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'They took the doll to a museum.' },
          { id: 'B', text: 'Small notes appeared in the apartment.' },
          { id: 'C', text: 'Donna gave the doll to her mother.' },
          { id: 'D', text: 'A young girl visited the apartment.' }
        ],
        correct_answer: 'B',
        explanation: 'Correct! Small handwritten notes began appearing around the apartment.',
        skill: 'Comprehension',
        concept: 'Video Details',
        difficulty: 'medium',
        points: 2
      },
      {
        question_text: 'Why did Donna become scared?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'She found the doll in a museum.' },
          { id: 'B', text: 'She saw the doll in different places, and strange notes appeared.' },
          { id: 'C', text: 'Angie left the apartment.' },
          { id: 'D', text: 'Her mother took the doll away.' }
        ],
        correct_answer: 'B',
        explanation: 'Correct! The unexplainable movements of the doll and mysterious notes frightened Donna.',
        skill: 'Comprehension',
        concept: 'Character Reactions',
        difficulty: 'medium',
        points: 2
      },
      {
        question_text: 'According to Ed and Lorraine Warren, what was inside the Annabelle doll?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'The spirit of a young girl' },
          { id: 'B', text: 'An evil spirit' },
          { id: 'C', text: 'A harmless toy spirit' },
          { id: 'D', text: 'Nothing unusual' }
        ],
        correct_answer: 'B',
        explanation: 'Correct! The Warrens reported that an evil inhuman spirit was manipulating the doll.',
        skill: 'Comprehension',
        concept: 'Warrens Belief',
        difficulty: 'medium',
        points: 2
      },
      // Activity 2 — Fill in the Blanks (2 questions x 2 marks = 4 marks)
      {
        question_text: 'Donna and Angie found Annabelle in different __________ around the apartment.',
        question_type: 'fill_blank',
        options: ['places', 'rooms'],
        correct_answer: 'places',
        explanation: "Correct! The doll was discovered in different 'places' around the apartment.",
        skill: 'Vocabulary',
        concept: 'Video Detail',
        difficulty: 'medium',
        points: 2
      },
      {
        question_text: 'The Warrens put the doll in a glass __________.',
        question_type: 'fill_blank',
        options: ['case', 'cabinet'],
        correct_answer: 'case',
        explanation: "Correct! The doll was sealed inside a glass 'case'.",
        skill: 'Vocabulary',
        concept: 'Video Detail',
        difficulty: 'medium',
        points: 2
      },
      // Activity 3 — Rearrange the Story (1 ordering question = 5 marks, 1 mark per event)
      {
        question_text: 'Put these five events from the Annabelle story in the correct chronological order (1 to 5):',
        question_type: 'ordering',
        options: [
          'Donna received a strange doll from her mother.',
          'Donna and Angie found Annabelle in different places.',
          'Small notes appeared in the apartment.',
          'A medium visited the apartment.',
          'The Warrens took the doll to their museum.'
        ],
        correct_answer: 'C, E, A, B, D',
        explanation: 'Correct Chronological Sequence: 1. Donna received a strange doll from her mother (C) -> 2. Donna and Angie found Annabelle in different places (E) -> 3. Small notes appeared in the apartment (A) -> 4. A medium visited the apartment (B) -> 5. The Warrens took the doll to their museum (D).',
        skill: 'Comprehension',
        concept: 'Story Chronology',
        difficulty: 'hard',
        points: 5
      }
    ]
  },

  // --------------------------------------------------------------------------
  // DAY 3 — SIMPLE PAST NEGATIVES (Grammar: 10 marks / 40 points)
  // Layout: Light educational workbook
  // --------------------------------------------------------------------------
  {
    dayNumber: 3,
    title: 'Day 3 — Simple Past Negatives',
    unitTitle: 'Unit 3: Simple Past Negatives',
    unitDescription: "Grammar: didn't + base verb • Changing positive to negative",
    estimatedMinutes: 20,
    blocks: [
      {
        block_type: 'text',
        content: {
          title: 'Learning Objectives • Simple Past Negatives',
          text: `### Today's Learning Goals

By the end of this lesson, you should be able to:
* **Recognize** negative sentences in the Simple Past.
* **Use** *didn't + base verb* correctly.
* **Change** positive sentences into negative sentences.
* **Identify** common grammatical mistakes.`
        }
      },
      {
        block_type: 'text',
        content: {
          title: '1. What Is a Negative Sentence?',
          text: `A negative sentence tells us that something did not happen.

We use **did not** or its shorter form **didn't**.

### Sentence Structure

**Subject + didn't + Base Verb + Extra Information**

### Examples

* **Positive:** She visited the museum.
  **Negative:** She **didn't visit** the museum.
* **Positive:** They watched a movie.
  **Negative:** They **didn't watch** a movie.
* **Positive:** He opened the door.
  **Negative:** He **didn't open** the door.`
        }
      },
      {
        block_type: 'text',
        content: {
          title: '2. The Important Rule',
          text: `After **didn't**, always use the **base form** of the verb! The base form is the original form of the verb.

### Correct and Incorrect Examples

| Incorrect ❌ | Correct ✅ | Rule Reason |
| :--- | :--- | :--- |
| She didn't *visited* the museum. | She **didn't visit** the museum. | visited → visit |
| They didn't *watched* television. | They **didn't watch** television. | watched → watch |
| He didn't *bought* a ticket. | He **didn't buy** a ticket. | bought → buy |

💡 **Remember:**
* **Positive:** Subject + past verb (*He bought a ticket.*)
* **Negative:** Subject + **didn't + base verb** (*He didn't buy a ticket.*)`
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Lesson Summary',
          text: `Use: **Subject + didn't + base verb**

For example:
* visited → **didn't visit**
* watched → **didn't watch**
* bought → **didn't buy**
* went → **didn't go**
* wrote → **didn't write**

**Day 3 Total: 10 marks / 40 EdTechra points**`
        }
      }
    ],
    questions: [
      // Activity 1 — Choose the Correct Answer (5 questions x 1 mark = 5 marks)
      {
        question_text: 'Which sentence is correct?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: "She didn't visited the museum." },
          { id: 'B', text: "She didn't visit the museum." },
          { id: 'C', text: "She didn't visits the museum." },
          { id: 'D', text: 'She not visited the museum.' }
        ],
        correct_answer: 'B',
        explanation: "Correct! After didn't, always use the base form 'visit'.",
        skill: 'Grammar',
        concept: 'Negative Sentences',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'Choose the correct negative sentence.',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: "They didn't played football." },
          { id: 'B', text: "They don't played football." },
          { id: 'C', text: "They didn't play football." },
          { id: 'D', text: 'They not play football.' }
        ],
        correct_answer: 'C',
        explanation: "Correct! 'didn't play' uses didn't + base form.",
        skill: 'Grammar',
        concept: 'Negative Sentences',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'Which sentence is correct?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: "He didn't bought a ticket." },
          { id: 'B', text: "He didn't buy a ticket." },
          { id: 'C', text: "He didn't buys a ticket." },
          { id: 'D', text: 'He not buy a ticket.' }
        ],
        correct_answer: 'B',
        explanation: "Correct! The base form of bought is 'buy', so 'He didn't buy a ticket.'",
        skill: 'Grammar',
        concept: 'Irregular Verb Negation',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'Choose the correct sentence.',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: "We didn't went to school." },
          { id: 'B', text: "We didn't go to school." },
          { id: 'C', text: "We don't went to school." },
          { id: 'D', text: "We didn't goes to school." }
        ],
        correct_answer: 'B',
        explanation: "Correct! 'went' changes back to base verb 'go' after didn't.",
        skill: 'Grammar',
        concept: 'Irregular Verb Negation',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'Which sentence is correct?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: "Maya didn't wrote a letter." },
          { id: 'B', text: "Maya didn't writes a letter." },
          { id: 'C', text: "Maya didn't write a letter." },
          { id: 'D', text: "Maya doesn't wrote a letter." }
        ],
        correct_answer: 'C',
        explanation: "Correct! 'wrote' changes back to base verb 'write' after didn't.",
        skill: 'Grammar',
        concept: 'Irregular Verb Negation',
        difficulty: 'easy',
        points: 1
      },
      // Activity 2 — Make the Sentences Negative (5 questions x 1 mark = 5 marks)
      {
        question_text: "Rewrite using didn't: Sara opened the window.",
        question_type: 'short_answer',
        options: ["Sara didn't open the window.", "Sara didn't open the window", "Sara did not open the window.", "Sara did not open the window"],
        correct_answer: "Sara didn't open the window.",
        explanation: "Correct! Sara opened the window → Sara didn't open the window.",
        skill: 'Grammar',
        concept: 'Sentence Transformation',
        difficulty: 'medium',
        points: 1
      },
      {
        question_text: "Rewrite using didn't: They visited the library.",
        question_type: 'short_answer',
        options: ["They didn't visit the library.", "They didn't visit the library", "They did not visit the library.", "They did not visit the library"],
        correct_answer: "They didn't visit the library.",
        explanation: "Correct! They visited the library → They didn't visit the library.",
        skill: 'Grammar',
        concept: 'Sentence Transformation',
        difficulty: 'medium',
        points: 1
      },
      {
        question_text: "Rewrite using didn't: He watched television.",
        question_type: 'short_answer',
        options: ["He didn't watch television.", "He didn't watch television", "He did not watch television.", "He did not watch television"],
        correct_answer: "He didn't watch television.",
        explanation: "Correct! He watched television → He didn't watch television.",
        skill: 'Grammar',
        concept: 'Sentence Transformation',
        difficulty: 'medium',
        points: 1
      },
      {
        question_text: "Rewrite using didn't: We played tennis.",
        question_type: 'short_answer',
        options: ["We didn't play tennis.", "We didn't play tennis", "We did not play tennis.", "We did not play tennis"],
        correct_answer: "We didn't play tennis.",
        explanation: "Correct! We played tennis → We didn't play tennis.",
        skill: 'Grammar',
        concept: 'Sentence Transformation',
        difficulty: 'medium',
        points: 1
      },
      {
        question_text: "Rewrite using didn't: Maya bought a new bag.",
        question_type: 'short_answer',
        options: ["Maya didn't buy a new bag.", "Maya didn't buy a new bag", "Maya did not buy a new bag.", "Maya did not buy a new bag"],
        correct_answer: "Maya didn't buy a new bag.",
        explanation: "Correct! Maya bought a new bag → Maya didn't buy a new bag.",
        skill: 'Grammar',
        concept: 'Sentence Transformation',
        difficulty: 'medium',
        points: 1
      }
    ]
  },

  // --------------------------------------------------------------------------
  // DAY 4 — READING: THE ANNABELLE DOLL (Reading: 15 marks / 60 points)
  // Layout: Premium dark creepy horror
  // --------------------------------------------------------------------------
  {
    dayNumber: 4,
    title: 'Day 4 — Reading: The Annabelle Doll',
    unitTitle: 'Unit 4: The Annabelle Doll — The Missing Note',
    unitDescription: 'Reading: Short story comprehension • Past verbs in narrative context',
    estimatedMinutes: 25,
    blocks: [
      {
        block_type: 'text',
        content: {
          title: 'Learning Objectives • Reading: The Annabelle Doll',
          text: `### Today's Learning Goals

By the end of this lesson, you should be able to:
* **Read** and understand a short mystery story.
* **Identify** important narrative details.
* **Answer** comprehension questions accurately.
* **Recognize** past-tense verbs in context.`
        }
      },
      {
        block_type: 'text_image',
        content: {
          title: 'The Annabelle Doll — The Missing Note',
          image: {
            url: ASSETS.missingNoteCollage,
            alt: 'Illustrated story panels of Donna and Angie finding Annabelle, going to the kitchen, discovering the doll missing, and finding the two notes',
            caption: 'The Missing Note: The doll vanished from the chair, a "HELP ME" note appeared, and later Donna found Annabelle on her bed with a second mysterious message.',
            position: 'above'
          },
          text: `One evening, Donna and Angie stayed in their apartment. They saw Annabelle sitting on a chair. Donna did not touch the doll.

Later, they went to the kitchen. When they returned, Annabelle was gone. They looked under the table and behind the sofa, but they did not find her.

Then Angie saw a small note on the chair. It said, **“HELP ME.”**

They became frightened. Donna asked, “Who wrote this?” Nobody answered.

The next morning, they found Annabelle on Donna's bed. But there was something strange. A second note lay beside her.

It said, **“I DID NOT WRITE THE FIRST NOTE.”**`
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Lesson Summary',
          text: `Reading helps you understand how the Simple Past works in a story.

Look for verbs such as:
* **stayed**
* **saw**
* **went**
* **looked**
* **found**
* **became**
* **asked**

**Day 4 Total: 15 marks / 60 EdTechra points**`
        }
      }
    ],
    questions: [
      // Activity 1 — Multiple Choice (3 questions x 1 mark = 3 marks)
      {
        question_text: 'Where did Donna and Angie find Annabelle at the beginning?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'On a bed' },
          { id: 'B', text: 'Under a table' },
          { id: 'C', text: 'On a chair' },
          { id: 'D', text: 'Behind a sofa' }
        ],
        correct_answer: 'C',
        explanation: "Correct! The story says: 'They saw Annabelle sitting on a chair.'",
        skill: 'Comprehension',
        concept: 'Story Detail',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'What happened when Donna and Angie returned from the kitchen?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'The apartment was empty.' },
          { id: 'B', text: 'Annabelle was gone.' },
          { id: 'C', text: 'They found a new doll.' },
          { id: 'D', text: 'Donna opened the door.' }
        ],
        correct_answer: 'B',
        explanation: "Correct! When they returned, Annabelle was gone from the chair.",
        skill: 'Comprehension',
        concept: 'Story Detail',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'What was strange about the second note?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'It asked for help.' },
          { id: 'B', text: "It had Donna's name." },
          { id: 'C', text: 'It said the writer did not write the first note.' },
          { id: 'D', text: 'It was under the table.' }
        ],
        correct_answer: 'C',
        explanation: "Correct! The second note stated: 'I DID NOT WRITE THE FIRST NOTE.'",
        skill: 'Comprehension',
        concept: 'Story Detail',
        difficulty: 'easy',
        points: 1
      },
      // Activity 2 — True or False (3 questions x 1 mark = 3 marks)
      {
        question_text: 'Donna touched Annabelle when they first saw her on the chair.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: "Correct! False — the story explicitly states: 'Donna did not touch the doll.'",
        skill: 'Comprehension',
        concept: 'Fact Verification',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'Donna and Angie looked under the table and behind the sofa.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: "Correct! True — 'They looked under the table and behind the sofa, but they did not find her.'",
        skill: 'Comprehension',
        concept: 'Fact Verification',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'The second note said, “HELP ME.”',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: "Correct! False — the first note said 'HELP ME.' The second note said 'I DID NOT WRITE THE FIRST NOTE.'",
        skill: 'Comprehension',
        concept: 'Fact Verification',
        difficulty: 'easy',
        points: 1
      },
      // Activity 3 — Fill in the Blanks (3 questions x 2 marks = 6 marks)
      {
        question_text: 'Donna and Angie saw Annabelle sitting on a __________.',
        question_type: 'fill_blank',
        options: ['chair', 'armchair'],
        correct_answer: 'chair',
        explanation: "Correct! Annabelle was sitting on a 'chair'.",
        skill: 'Vocabulary',
        concept: 'Story Recall',
        difficulty: 'medium',
        points: 2
      },
      {
        question_text: 'Donna and Angie went to the __________ before returning to the room.',
        question_type: 'fill_blank',
        options: ['kitchen'],
        correct_answer: 'kitchen',
        explanation: "Correct! They went to the 'kitchen'.",
        skill: 'Vocabulary',
        concept: 'Story Recall',
        difficulty: 'medium',
        points: 2
      },
      {
        question_text: "The next morning, they found Annabelle on Donna's __________.",
        question_type: 'fill_blank',
        options: ['bed'],
        correct_answer: 'bed',
        explanation: "Correct! The doll was discovered on Donna's 'bed'.",
        skill: 'Vocabulary',
        concept: 'Story Recall',
        difficulty: 'medium',
        points: 2
      },
      // Activity 4 — Word Reorder (sentence_builder = 3 marks)
      {
        question_text: "Put the words in the correct order to make a sentence: found / They / Annabelle / on / Donna's / bed",
        question_type: 'sentence_builder',
        options: ['found', 'They', 'Annabelle', 'on', "Donna's", 'bed.'],
        correct_answer: "They found Annabelle on Donna's bed.",
        explanation: "Correct! Word order: 'They found Annabelle on Donna's bed.'",
        skill: 'Grammar',
        concept: 'Word Order',
        difficulty: 'medium',
        points: 3
      }
    ]
  },

  // --------------------------------------------------------------------------
  // DAY 5 — SIMPLE PAST QUESTIONS (Grammar: 10 marks / 40 points)
  // Layout: Light educational workbook
  // --------------------------------------------------------------------------
  {
    dayNumber: 5,
    title: 'Day 5 — Simple Past Questions',
    unitTitle: 'Unit 5: Simple Past Questions',
    unitDescription: 'Grammar: Yes/No & WH- questions • Question formation with did',
    estimatedMinutes: 20,
    blocks: [
      {
        block_type: 'text',
        content: {
          title: 'Learning Objectives • Simple Past Questions',
          text: `### Today's Learning Goals

By the end of this lesson, you should be able to:
* **Form** Yes/No questions in the Simple Past.
* **Form** WH- questions in the Simple Past.
* **Use** *did + subject + base verb* correctly.
* **Choose** suitable question words (*What, Where, When, Why, Who, How*).`
        }
      },
      {
        block_type: 'text',
        content: {
          title: '1. Yes/No Questions & Short Answers',
          text: `We use Yes/No questions when we expect an answer such as **Yes** or **No**.

### Sentence Structure

**Did + Subject + Base Verb + Extra Information?**

### Examples

* Statement: She visited the museum.
  **Question:** **Did she visit** the museum?
* Statement: They watched the movie.
  **Question:** **Did they watch** the movie?
* Statement: He bought a ticket.
  **Question:** **Did he buy** a ticket?

---

### 2. Short Answers

* **Question:** Did she visit the museum?
  * Positive answer: **Yes, she did.**
  * Negative answer: **No, she didn't.**

* **Question:** Did they watch the movie?
  * Positive answer: **Yes, they did.**
  * Negative answer: **No, they didn't.**`
        }
      },
      {
        block_type: 'text',
        content: {
          title: '3. WH- Questions & The Important Rule',
          text: `We use WH- questions to ask for specific information.

| Question Word | Use | Example |
| :--- | :--- | :--- |
| **What** | Ask about a thing or action | What did he buy? |
| **Where** | Ask about a place | Where did she go? |
| **When** | Ask about a time | When did they arrive? |
| **Who** | Ask about a person | Who did you meet? |
| **Why** | Ask about a reason | Why did she leave? |
| **How** | Ask about the way something happened | How did they travel? |

### Sentence Structure

**WH-word + did + subject + base verb?**

### 4. An Important Rule

After **did**, always use the base form of the verb!
* ❌ Where did she *went*? → ✅ **Where did she go?**
* ❌ What did he *bought*? → ✅ **What did he buy?**
* ❌ Did she *visited* the museum? → ✅ **Did she visit the museum?**`
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Lesson Summary',
          text: `Remember these two structures:

* **Yes/No questions:** Did + subject + base verb?
* **WH- questions:** WH-word + did + subject + base verb?

Always use the base form after **did**.

**Day 5 Total: 10 marks / 40 EdTechra points**`
        }
      }
    ],
    questions: [
      // Activity 1 — Choose the Correct Question (2 questions x 1 mark = 2 marks)
      {
        question_text: 'Which question is correct?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'Did he went to school?' },
          { id: 'B', text: 'Did he goes to school?' },
          { id: 'C', text: 'Did he go to school?' },
          { id: 'D', text: 'He did go to school?' }
        ],
        correct_answer: 'C',
        explanation: "Correct! 'Did he go to school?' uses did + subject + base verb 'go'.",
        skill: 'Grammar',
        concept: 'Question Structure',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'Which question asks about a place?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'When did she arrive?' },
          { id: 'B', text: 'Why did she arrive?' },
          { id: 'C', text: 'Where did she arrive?' },
          { id: 'D', text: 'Who did she arrive?' }
        ],
        correct_answer: 'C',
        explanation: "Correct! 'Where' asks about location/place.",
        skill: 'Grammar',
        concept: 'Question Words',
        difficulty: 'easy',
        points: 1
      },
      // Activity 2 — Make Yes/No Questions (3 questions x 1 mark = 3 marks)
      {
        question_text: 'Change into a Yes/No question: Ali cleaned his room.',
        question_type: 'short_answer',
        options: ['Did Ali clean his room?', 'Did Ali clean his room', 'did ali clean his room?'],
        correct_answer: 'Did Ali clean his room?',
        explanation: 'Correct! Ali cleaned his room → Did Ali clean his room?',
        skill: 'Grammar',
        concept: 'Yes/No Questions',
        difficulty: 'medium',
        points: 1
      },
      {
        question_text: 'Change into a Yes/No question: She bought a new dress.',
        question_type: 'short_answer',
        options: ['Did she buy a new dress?', 'Did she buy a new dress', 'did she buy a new dress?'],
        correct_answer: 'Did she buy a new dress?',
        explanation: 'Correct! She bought a new dress → Did she buy a new dress?',
        skill: 'Grammar',
        concept: 'Yes/No Questions',
        difficulty: 'medium',
        points: 1
      },
      {
        question_text: 'Change into a Yes/No question: They went to the park.',
        question_type: 'short_answer',
        options: ['Did they go to the park?', 'Did they go to the park', 'did they go to the park?'],
        correct_answer: 'Did they go to the park?',
        explanation: 'Correct! They went to the park → Did they go to the park?',
        skill: 'Grammar',
        concept: 'Yes/No Questions',
        difficulty: 'medium',
        points: 1
      },
      // Activity 3 — Complete the WH- Questions (5 questions x 1 mark = 5 marks)
      {
        question_text: '__________ did you buy yesterday? — I bought a new book. (What / Where / When / Why / Who)',
        question_type: 'fill_blank',
        options: ['What', 'what'],
        correct_answer: 'What',
        explanation: "Correct! 'What' asks about a thing/item (a book).",
        skill: 'Grammar',
        concept: 'WH- Questions',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: '__________ did they travel last summer? — They travelled to Kandy. (What / Where / When / Why / Who)',
        question_type: 'fill_blank',
        options: ['Where', 'where'],
        correct_answer: 'Where',
        explanation: "Correct! 'Where' asks about a place (Kandy).",
        skill: 'Grammar',
        concept: 'WH- Questions',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: '__________ did she leave early? — She felt tired. (What / Where / When / Why / Who)',
        question_type: 'fill_blank',
        options: ['Why', 'why'],
        correct_answer: 'Why',
        explanation: "Correct! 'Why' asks about a reason (felt tired).",
        skill: 'Grammar',
        concept: 'WH- Questions',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: '__________ did you meet at the station? — I met my cousin. (What / Where / When / Why / Who)',
        question_type: 'fill_blank',
        options: ['Who', 'who'],
        correct_answer: 'Who',
        explanation: "Correct! 'Who' asks about a person (my cousin).",
        skill: 'Grammar',
        concept: 'WH- Questions',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: '__________ did the class start? — It started at 8:00. (What / Where / When / Why / Who)',
        question_type: 'fill_blank',
        options: ['When', 'when'],
        correct_answer: 'When',
        explanation: "Correct! 'When' asks about time (at 8:00).",
        skill: 'Grammar',
        concept: 'WH- Questions',
        difficulty: 'easy',
        points: 1
      }
    ]
  },

  // --------------------------------------------------------------------------
  // DAY 6 — LISTENING: VISITING THE ANNABELLE MUSEUM (Listening: 15 marks / 60 points)
  // Layout: Premium dark creepy horror
  // --------------------------------------------------------------------------
  {
    dayNumber: 6,
    title: 'Day 6 — Listening: Visiting the Annabelle Museum',
    unitTitle: 'Unit 6: Visiting the Annabelle Museum',
    unitDescription: 'Listening: Narrative comprehension • Event ordering & detail extraction',
    estimatedMinutes: 25,
    blocks: [
      {
        block_type: 'text',
        content: {
          title: 'Learning Objectives • Visiting the Annabelle Museum',
          text: `### Today's Learning Goals

By the end of this lesson, you should be able to:
* **Understand** a short listening passage.
* **Identify** people, places and events.
* **Listen** for specific information.
* **Arrange** events in the correct chronological order.`
        }
      },
      {
        block_type: 'video',
        content: {
          title: 'Listening Passage: My Visit to See Annabelle',
          url: 'https://youtu.be/duhxVVZ4Gqk',
          video_url: 'https://youtu.be/duhxVVZ4Gqk',
          video_id: 'duhxVVZ4Gqk',
          video: {
            url: 'https://youtu.be/duhxVVZ4Gqk',
            video_id: 'duhxVVZ4Gqk',
            title: 'My Visit to See Annabelle'
          },
          text: `### Listening Instructions

Listen carefully to the passage. You will hear a visitor describe a museum visit connected with the Annabelle legend.

**Try to remember:**
* Who visited the museum.
* What the visitor saw.
* What the visitor read.
* What happened later.
* How the visitor felt.

🎧 *Tip: Play the listening passage once. Review the questions below, then play it a second time to verify your answers.*

> ℹ️ *Note: This is a fictionalized listening exercise based on the Annabelle legend, not a verified first-hand account.*`
        }
      },
      {
        block_type: 'image',
        content: {
          title: 'Occult Museum Display: Anna & Tom Beside the Glass Case',
          url: ASSETS.museumVisit,
          image: {
            url: ASSETS.museumVisit,
            alt: 'Anna and Tom looking into the glass case holding the Annabelle doll in the dark occult museum hallway',
            caption: 'Visitors Anna and Tom exploring the occult museum: looking at Annabelle inside her wooden glass case under warm lantern light.'
          }
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Lesson Summary',
          text: `Listening carefully helps you understand what happened in a story or personal account.

Listen for past-tense verbs such as:
* **visited**
* **walked**
* **saw**
* **looked**
* **read**
* **felt**
* **heard**
* **turned**
* **left**

**Day 6 Total: 15 marks / 60 EdTechra points**`
        }
      }
    ],
    questions: [
      // Activity 1 — Multiple Choice (3 questions x 1 mark = 3 marks)
      {
        question_text: 'Who visited the museum with the speaker?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'His teacher' },
          { id: 'B', text: 'His cousin' },
          { id: 'C', text: 'His friend' },
          { id: 'D', text: 'His brother' }
        ],
        correct_answer: 'B',
        explanation: "Correct! 'Last summer, I visited a museum with my cousin.'",
        skill: 'Listening',
        concept: 'People & Characters',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'What did the speaker do when they saw the doll?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'He touched the glass case.' },
          { id: 'B', text: 'He opened the case.' },
          { id: 'C', text: 'He looked at the doll carefully.' },
          { id: 'D', text: 'He moved the doll.' }
        ],
        correct_answer: 'C',
        explanation: "Correct! 'I looked at it carefully. It was smaller than I expected.'",
        skill: 'Listening',
        concept: 'Actions & Details',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'Why did the speaker leave the room quietly?',
        question_type: 'multiple_choice',
        options: [
          { id: 'A', text: 'The museum closed.' },
          { id: 'B', text: 'He lost his phone.' },
          { id: 'C', text: 'He heard a strange sound and felt nervous.' },
          { id: 'D', text: 'His cousin called him.' }
        ],
        correct_answer: 'C',
        explanation: 'Correct! He heard a strange sound behind them and felt nervous, so they left quietly.',
        skill: 'Listening',
        concept: 'Reason for Action',
        difficulty: 'easy',
        points: 1
      },
      // Activity 2 — Fill in the Blanks (3 questions x 1 mark = 3 marks)
      {
        question_text: 'The visitors walked through several __________ before seeing the doll.',
        question_type: 'fill_blank',
        options: ['rooms', 'Rooms'],
        correct_answer: 'rooms',
        explanation: "Correct! 'When we arrived, we walked through several rooms.'",
        skill: 'Listening',
        concept: 'Setting Detail',
        difficulty: 'medium',
        points: 1
      },
      {
        question_text: 'The Annabelle doll was __________ than the speaker expected.',
        question_type: 'fill_blank',
        options: ['smaller', 'Smaller'],
        correct_answer: 'smaller',
        explanation: "Correct! 'It was smaller than I expected.'",
        skill: 'Listening',
        concept: 'Physical Description',
        difficulty: 'medium',
        points: 1
      },
      {
        question_text: 'The visitors heard a strange __________ behind them.',
        question_type: 'fill_blank',
        options: ['sound', 'Sound', 'noise'],
        correct_answer: 'sound',
        explanation: "Correct! 'Then we heard a strange sound behind us.'",
        skill: 'Listening',
        concept: 'Auditory Detail',
        difficulty: 'medium',
        points: 1
      },
      // Activity 3 — True or False (3 questions x 1 mark = 3 marks)
      {
        question_text: 'The speaker expected the doll to be bigger.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: "Correct! True — saying 'It was smaller than I expected' means the speaker expected a bigger doll.",
        skill: 'Listening',
        concept: 'Inference',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'The speaker touched the Annabelle doll.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: 'Correct! False — the doll was kept locked inside a protective glass case.',
        skill: 'Listening',
        concept: 'Fact Verification',
        difficulty: 'easy',
        points: 1
      },
      {
        question_text: 'The speaker heard a strange sound behind them.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: "Correct! True — 'Then we heard a strange sound behind us. We turned around, but nobody was there.'",
        skill: 'Listening',
        concept: 'Fact Verification',
        difficulty: 'easy',
        points: 1
      },
      // Activity 4 — Put the Events in Order (1 ordering question = 5 marks, 1 mark per event)
      {
        question_text: 'Number the events from 1 to 5 in chronological order as heard in the passage:',
        question_type: 'ordering',
        options: [
          'The speaker arrived at the museum.',
          'The speaker saw Annabelle inside a glass case.',
          'The speaker read information about the legend.',
          'The speaker heard a strange sound.',
          'The speaker left the room quietly.'
        ],
        correct_answer: 'B, C, E, A, D',
        explanation: 'Correct Chronological Sequence: 1. Arrived at the museum (B) -> 2. Saw Annabelle inside a glass case (C) -> 3. Read information about the legend (E) -> 4. Heard a strange sound (A) -> 5. Left the room quietly (D).',
        skill: 'Listening',
        concept: 'Chronological Sequencing',
        difficulty: 'hard',
        points: 5
      },
      // Activity 5 — Short Answer (1 question = 1 mark)
      {
        question_text: 'How did the speaker feel near the glass case?',
        question_type: 'short_answer',
        options: ['The speaker felt nervous.', 'The speaker felt nervous', 'nervous', 'He felt nervous.', 'He felt nervous', 'felt nervous'],
        correct_answer: 'The speaker felt nervous.',
        explanation: "Correct! 'I felt nervous while I stood near the case.'",
        skill: 'Listening',
        concept: 'Emotional State',
        difficulty: 'easy',
        points: 1
      }
    ]
  },

  // --------------------------------------------------------------------------
  // DAY 7 — GUIDED WRITING: A STRANGE VISIT (Writing: 20 marks / 80 points)
  // Layout: Premium dark creepy horror
  // --------------------------------------------------------------------------
  {
    dayNumber: 7,
    title: 'Day 7 — Guided Writing: A Strange Visit',
    unitTitle: 'Unit 7: A Strange Visit',
    unitDescription: 'Guided Writing: 45–55-word story • Rubric assessment & Simple Past verbs',
    estimatedMinutes: 30,
    blocks: [
      {
        block_type: 'text',
        content: {
          title: 'Learning Objectives • Guided Writing: A Strange Visit',
          text: `### Today's Learning Goals

By the end of this lesson, you should be able to:
* **Describe** a picture using complete sentences.
* **Use** the Simple Past Tense in a short mystery story.
* **Organize** ideas in a logical order (beginning, middle, ending).
* **Write** a 45–55-word story with at least 5 past-tense verbs.`
        }
      },
      {
        block_type: 'text_image',
        content: {
          title: '1. Look at the Picture',
          image: {
            url: ASSETS.day7PictureDescription,
            alt: 'Anna and Tom look frightened as they see the Annabelle doll in an open glass case, with a HELP ME note on the floor.',
            caption: 'A Strange Visit: Anna and Tom notice the Annabelle doll inside the open glass case, with a note reading "HELP ME" on the floor.',
            position: 'above'
          },
          text: `### Picture Information

The picture shows:
* **Anna**, an adult visitor.
* **Tom**, a young visitor.
* The **Annabelle doll**.
* A glass display case with its door open.
* A note on the floor saying **“HELP ME.”**
* Anna and Tom looking surprised and frightened.

Use the picture to create your own story. You may decide what happened before or after the moment shown.`
        }
      },
      {
        block_type: 'text',
        content: {
          title: '2. Verbs & Story Building Guide',
          text: `### Useful Past-Tense Verbs

Use these verbs to help you describe the picture:

| Present Form | Simple Past | Present Form | Simple Past |
| :--- | :--- | :--- | :--- |
| **visit** | **visited** | **feel** | **felt** |
| **see** | **saw** | **hear** | **heard** |
| **look** | **looked** | **become** | **became** |
| **open** | **opened** | **walk** | **walked** |
| **find** | **found** | **leave** | **left** |

💡 *You do not need to use every verb. Choose the ones that fit your story.*

---

### 3. Build Your Story (Sentence Starters)

* **Beginning (Where they went):** *Anna and Tom visited...*
* **What they saw:** *They saw...*
* **The strange event:** *The glass case...*
* **The note:** *They found a note that said...*
* **Their feelings:** *They felt...*
* **Ending:** *They quickly...*

---

### 4. Writing Instructions

1. Write **45–55 words**.
2. Use the **Simple Past Tense**.
3. Include **at least five past-tense verbs**.
4. Write **complete sentences**.
5. Organize your ideas into a **beginning, middle and ending**.
6. Create your own ending!

---

### 5. Self-Check Checklist

Before submitting, check each statement:
* [x] I wrote 45–55 words.
* [x] I used the Simple Past Tense.
* [x] I used at least five past-tense verbs.
* [x] I wrote complete sentences.
* [x] I described the picture.
* [x] My story has a beginning, middle and ending.
* [x] I checked my spelling and punctuation.`
        }
      },
      {
        block_type: 'text',
        content: {
          title: '6. Writing Assessment Rubric (20 Marks)',
          text: `The teacher or assessment system evaluates your story using this authoritative 20-mark rubric:

| Assessment Area | Maximum Marks | What We Look For |
| :--- | :--- | :--- |
| **Relevant content & description** | **4 marks** | Describes relevant details from the museum picture |
| **Correct use of the Simple Past** | **6 marks** | Uses past-tense verbs correctly (regular & irregular) |
| **Sentence structure & grammar** | **4 marks** | Complete, understandable sentences with good word order |
| **Clear sequence of events** | **2 marks** | Clear beginning, middle, and ending |
| **Spelling and punctuation** | **2 marks** | Capital letters, periods, and understandable spelling |
| **45–55-word requirement** | **2 marks** | Meets the word count goal (45–55 words) |
| **TOTAL** | **20 marks** | **Converted to 80 EdTechra reward points** |`
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'Course Completion • Congratulations!',
          text: `You have successfully completed all 7 days of **Learn the Simple Past Through the Legend of Annabelle**!

**Your 7-Day Achievements:**
* ✓ Simple Past positive sentences & verb patterns
* ✓ Regular (-ed) and high-frequency irregular verbs
* ✓ Negative transformations using *didn't + base verb*
* ✓ Yes/No questions and WH- question formation
* ✓ Authentic narrative comprehension (video, reading, listening)
* ✓ Original 50-word mystery storytelling

**Course Complete: 7 Days | 100 Assessment Marks | 400 EdTechra Points**`
        }
      }
    ],
    questions: [
      {
        question_text: "Write your 45–55-word story titled 'A Strange Visit' describing what happened to Anna and Tom at the museum. Include at least 5 past-tense verbs.",
        question_type: 'essay',
        options: [],
        correct_answer: 'Last week, Anna and Tom visited the occult museum. They saw the famous Annabelle doll inside the glass case. Suddenly, the wooden door opened and a strange note fell to the floor. It said HELP ME. Anna and Tom felt very scared. They turned around and quickly left the dark room.',
        explanation: 'Model Story (52 words, 6 past verbs: visited, saw, opened, fell, said, felt, turned, left):\n\n"Last week, Anna and Tom visited the occult museum. They saw the famous Annabelle doll inside the glass case. Suddenly, the wooden door opened and a strange note fell to the floor. It said HELP ME. Anna and Tom felt very scared. They turned around and quickly left the dark room."',
        skill: 'Writing',
        concept: 'Narrative Storytelling',
        difficulty: 'medium',
        points: 20
      }
    ]
  }
];

async function seedAnnabelleCourse() {
  console.log('================================================================');
  console.log('SEEDING COURSE: Learn the Simple Past Through the Legend of Annabelle');
  console.log('================================================================');

  // 1. Clean existing records for this COURSE_ID only (safe and isolated)
  console.log('Step 1: Cleaning previous records for COURSE_ID:', COURSE_ID);
  await supabase.from('course_questions').delete().eq('course_id', COURSE_ID);
  await supabase.from('course_blocks').delete().eq('course_id', COURSE_ID);
  await supabase.from('course_episodes').delete().eq('course_id', COURSE_ID);
  await supabase.from('course_units').delete().eq('course_id', COURSE_ID);
  await supabase.from('courses').delete().eq('id', COURSE_ID);

  // 2. Insert Course Record
  console.log('Step 2: Creating new Course entry in Supabase...');
  const courseRecord = {
    id: COURSE_ID,
    teacher_id: TEACHER_ID,
    title: 'Learn the Simple Past Through the Legend of Annabelle',
    short_description: 'In this seven-day course, students learn how to use the Simple Past Tense through the legend of Annabelle. Combines grammar, video, reading, listening and writing.',
    subject: 'English',
    grade_level: 'A1–A2',
    cover_image_url: ASSETS.coverUrl,
    cover_image_key: ASSETS.coverKey,
    cover_aspect_ratio: '16:9',
    course_type: 'full',
    status: 'draft', // Saved safely in teacher Course Studio
    estimated_hours: 4,
    daily_release_enabled: false,
    course_timezone: 'Asia/Colombo',
    course_start_date: new Date().toISOString()
  };

  const { data: insertedCourse, error: cErr } = await supabase
    .from('courses')
    .insert(courseRecord)
    .select()
    .single();

  if (cErr) {
    console.error('Fatal error inserting course record:', cErr);
    process.exit(1);
  }
  console.log('✓ Course created:', insertedCourse.title, '(ID:', insertedCourse.id, ')');

  // 3. Insert Units, Episodes, Blocks, and Questions
  let totalBlocks = 0;
  let totalQuestions = 0;
  let totalMarks = 0;

  for (let idx = 0; idx < DAYS_DATA.length; idx++) {
    const day = DAYS_DATA[idx];
    const dayNum = day.dayNumber;
    const unitId = `e10c7ee9-0007-4000-8001-${String(dayNum).padStart(12, '0')}`;
    const epId = `e10c7ee9-0007-4000-8002-${String(dayNum).padStart(12, '0')}`;

    console.log(`\nInserting Day ${dayNum}: ${day.title}...`);

    // A. Unit
    const { error: uErr } = await supabase.from('course_units').insert({
      id: unitId,
      course_id: COURSE_ID,
      title: day.unitTitle,
      description: day.unitDescription,
      order_index: idx
    });
    if (uErr) {
      console.error(`Error inserting Unit ${dayNum}:`, uErr);
      process.exit(1);
    }

    // B. Episode
    const { error: eErr } = await supabase.from('course_episodes').insert({
      id: epId,
      unit_id: unitId,
      course_id: COURSE_ID,
      title: day.title,
      episode_type: 'lesson',
      order_index: idx,
      estimated_minutes: day.estimatedMinutes,
      position: dayNum,
      daily_release_enabled: false,
      release_day: dayNum,
      is_manually_unlocked: false
    });
    if (eErr) {
      console.error(`Error inserting Episode ${dayNum}:`, eErr);
      process.exit(1);
    }

    // C. Blocks
    const blocksToInsert = day.blocks.map((b, bIdx) => ({
      id: `e10c7ee9-0007-4000-8003-${String(dayNum * 100 + bIdx + 1).padStart(12, '0')}`,
      episode_id: epId,
      course_id: COURSE_ID,
      block_type: b.block_type,
      order_index: bIdx,
      content: b.content
    }));

    const { error: bErr } = await supabase.from('course_blocks').insert(blocksToInsert);
    if (bErr) {
      console.error(`Error inserting blocks for Day ${dayNum}:`, bErr);
      process.exit(1);
    }
    totalBlocks += blocksToInsert.length;

    // D. Questions
    const questionsToInsert = day.questions.map((q, qIdx) => {
      totalMarks += q.points;
      return {
        id: `e10c7ee9-0007-4000-8004-${String(dayNum * 100 + qIdx + 1).padStart(12, '0')}`,
        episode_id: epId,
        course_id: COURSE_ID,
        block_id: null,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        skill: q.skill || 'English',
        concept: q.concept || 'Simple Past',
        difficulty: q.difficulty || 'medium',
        points: q.points,
        order_index: qIdx
      };
    });

    const { error: qErr } = await supabase.from('course_questions').insert(questionsToInsert);
    if (qErr) {
      console.error(`Error inserting questions for Day ${dayNum}:`, qErr);
      process.exit(1);
    }
    totalQuestions += questionsToInsert.length;
    console.log(`  ✓ Day ${dayNum} inserted: ${blocksToInsert.length} blocks, ${questionsToInsert.length} questions.`);
  }

  console.log('\n================================================================');
  console.log('SEEDING SUMMARY:');
  console.log('Course ID:', COURSE_ID);
  console.log('Total Days / Units / Episodes:', DAYS_DATA.length);
  console.log('Total Content Blocks:', totalBlocks);
  console.log('Total Interactive Questions:', totalQuestions);
  console.log('Total Assessment Marks:', totalMarks, '(Target: 100 marks)');
  console.log('Total EdTechra Reward Points:', totalMarks * 4, '(Target: 400 points)');
  console.log('================================================================');
}

seedAnnabelleCourse();
