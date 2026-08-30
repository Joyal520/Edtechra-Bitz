# EDTECHRA COURSE STUDIO — TECHNICAL ARCHITECTURE & SYSTEM OVERVIEW

> **Authoritative System Audit & Reference Specification**  
> **Date of Audit:** August 29, 2026  
> **Status:** Current Production Architecture (Git Branch: `main`)

---

## 1. APP IDENTITY

- **Application Name:** EdTechra Bitz / EdTechra Digital Classroom (Course Studio).
- **Purpose of the Application:** A modern digital learning studio and interactive classroom delivery platform that allows educators to author, organize, and publish rich multimodal courses (with reading passages, embedded images, videos, and interactive gamified assessments), and distribute them to classroom cohorts with automated daily pacing, telemetry, and mastery tracking.
- **Target Users:**
  1. **Teachers / Educators:** Content authors who build courses, design question blueprints, generate questions with AI assistance, manage classroom assignments, and monitor student progress and concept mastery analytics.
  2. **Students / Learners:** Classroom members who consume lesson materials, interact with 8+ types of practice activities, receive immediate audio-visual feedback, and progress through structured daily roadmaps.
  3. **Platform Administrators:** Superusers who moderate user-generated content, manage platform-wide vocabulary/quiz bits, oversee user profiles, and manage system resources.
- **Main Use Case:** Authoring digital modular courses with integrated reading experiences (Apple Books / Kindle typography), generating structured practice exercises via AI-assisted schema workflows, and delivering them to enrolled students either as open-access modules or day-by-day locked schedules.
- **Core Problem Solved:** Eliminates fragmented, unengaging PDF worksheets and generic form builders by uniting curriculum authoring, multimodal media (Cloudflare R2 WebP optimization), AI question planning, rich interactive question widgets, and automated daily release scheduling in a single responsive web platform.
- **Current Technology Stack:**
  - **Frontend:** React 18.3.1, TypeScript 5.7.3, Vite 6.1.0, TailwindCSS 3.4.17, React Router DOM 6.29.0, Lucide React icons, Canvas Confetti, Web Audio API.
  - **Backend Server:** Node.js (v22 ESM) with Express 4.21.2 (`server.mjs`).
  - **Database & Auth:** Supabase PostgreSQL with Row-Level Security (RLS), Supabase Auth (JWT & Google OAuth).
  - **Cloud Media Storage:** Cloudflare R2 (S3-compatible API via `@aws-sdk/client-s3`) with client-side Canvas WebP optimization.
  - **AI Intelligence Engines:** Google Gemini API (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`) as primary, OpenAI API (`gpt-4o-mini`, `gpt-4o`) as secondary, and deterministic rule-based evaluation heuristics as fallback.

---

## 2. USER ROLES

The application currently supports **three (3) distinct user roles** managed via `public.profiles.role` and Supabase Auth metadata:

| Role | What the User Can See | What the User Can Create | What the User Can Edit | What the User Can Publish / Assign | Permissions & Restrictions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Teacher** (`teacher`) | Course Studio dashboard, course editor, lesson outlines, question planner, preview mode, classroom rosters, student progress, cross-classroom analytics. | Courses, Units, Lessons (Episodes), Content Blocks (Text, Image, Video), Practice Questions, Classrooms, Resource assignments. | Own courses, units, lessons, content blocks, practice questions, and classroom settings. | Can publish draft courses to `published` status and assign them to one or multiple active classrooms. | Restricted from accessing `/admin` pages. Cannot modify or delete courses owned by other teachers. |
| **Student** (`student`) | Assigned classrooms, enrolled courses, student course player (`/learn`), progression roadmap, question cards, personal completion stats. | Question attempts, essay answers, reading session completions, student discussion posts. | Own profile name, avatar, text-size preferences, and unsubmitted draft essay responses. | Cannot publish or assign courses. Cannot create courses, units, or questions. | Cannot access `/course-studio`, `/course-studio/:id`, or teacher analytics. Can only read courses published and assigned to their active classroom. |
| **Admin** (`admin`) | Full platform access: All teacher views, Admin Moderation Queue (`/admin`), user tables, content approval queues, all classrooms and courses. | Any content type across the platform (courses, lessons, global vocabulary bits, quiz bits, word of the day). | Any course, lesson, classroom, profile, or student submission across the platform. | Can publish, archive, or assign any course across any classroom. | Superuser privileges. Hardcoded bypass email in `AuthContext.tsx`: `roshanjoyal520@gmail.com`. |

---

## 3. COMPLETE APPLICATION STRUCTURE

```
/ (Root Layout: AppLayout)
├── / ............................................ Public Landing Page (HomePage)
├── /explore .................................... Public / Community Content Discovery
├── /dashboard .................................. Student / User Hub (Stats, Enrolled Classes, Daily Bits)
├── /auth, /login, /signup ...................... Authentication & Onboarding Modal Pages
├── /admin ...................................... Admin Dashboard (AdminRoute Protected)
│
├── /classes .................................... Classroom Management Hub
│   ├── /classes/create ......................... Create New Classroom (Teacher only)
│   ├── /classes/join, /classes/join/:code ...... Student Join Classroom by Code
│   ├── /classes/:id ............................ Classroom Detail (Roster, Assigned Courses, Posts)
│   ├── /classes/:id/resources .................. Teacher Resource Repository
│   └── /classes/:id/courses/:courseId/learn .... Student Course Player & Interactive Roadmap
│
├── /course-studio .............................. Teacher Course Studio Hub (CourseStudioDashboardPage)
│   ├── /course-studio/:courseId ................ Full Studio Lesson & Outline Editor (CourseEditorPage)
│   ├── /course-studio/:courseId/preview ........ Student Simulation Preview (CoursePreviewPage)
│   └── /course-studio/:courseId/analytics ...... Cross-Classroom Analytics & Insights (CourseAnalyticsPage)
│
└── /classes/live-quiz .......................... Real-time Classroom Live Quiz (Host, Lobby, Play, Join)
```

---

## 4. COURSE STRUCTURE

The application models courses in a strict 4-level relational hierarchy:

```
Course (public.courses)
 └── Unit (public.course_units)
      └── Lesson / Episode (public.course_episodes)
           ├── Content Blocks (public.course_blocks)
           │    ├── text
           │    ├── text_image
           │    ├── text_video
           │    ├── image
           │    ├── youtube_video
           │    └── youtube_short
           └── Practice Questions (public.course_questions)
                ├── Multiple Choice
                ├── True / False
                ├── Fill in the Blank
                ├── Matching Pairs
                ├── Sentence Builder
                ├── Ordering Sequence
                ├── Short Answer
                ├── Cloze Passage (Multi-Blank)
                └── Essay / Descriptive Response
```

- **Maximum Number of Units:** No hard database limit. The UI supports unbounded units; typically courses contain 1 to 20 units.
- **Lesson Creation:** Created inside a Unit via `POST /api/course-studio/courses/:id/episodes`. Automatically provisions with a default 15-minute duration.
- **Lesson Ordering:** Managed via `order_index` (0-indexed) and explicit `position` (1-indexed). Teachers use accessible Up (`↑`) and Down (`↓`) buttons on each row. Persisted synchronously via `POST /api/course-studio/courses/:id/episodes/reorder`.
- **Lesson Editing:** Inline title editing, episode type switcher (`lesson`, `practice`, `assessment`, `revision`), and estimated minutes.
- **Lesson Deletion:** Deleting a lesson cascades and deletes all child `course_blocks` and `course_questions` (`DELETE /api/course-studio/courses/:id/episodes/:episodeId`).
- **Lesson Duplication:** Course-level duplication clones all units, episodes, blocks, and questions (`POST /api/course-studio/courses/:id/duplicate`). Single-episode duplication is currently handled via block cloning.
- **Lesson Sections (Blocks):** Stored in `public.course_blocks` ordered by `order_index`. Can be moved up/down, duplicated, or deleted.
- **Supported Section Types:**
  - `text`: Rich formatted body text with markdown-style headings, bold, italic, callouts, and lists.
  - `text_image`: Section text paired with an uploaded Cloudflare R2 image, caption, position (`above` / `below` / `left` / `right`), and size.
  - `text_video`: Section text paired with an embedded video.
  - `image`: Standalone responsive visual card.
  - `youtube_video`: Standard 16:9 YouTube player embed.
  - `youtube_short`: Vertical 9:16 YouTube Shorts embed.
- **Lesson Duration:** Configurable per episode via `estimated_minutes` integer (default: 15).
- **Publishing Status:** `draft` (editing in studio), `published` (accessible by students in assigned classrooms), or `archived` (hidden).

---

## 5. COURSE CREATION WORKFLOW

```
Step 1: Create Course Modal
  │  Teacher inputs Title, Subject, Grade Level, Course Type (Full vs Quick),
  │  Cover Format (1:1 Square vs 16:9 Banner), and optional Cover Image.
  │  Backend provisions Course + Unit 1 + Day 1 (Episode 1).
  ▼
Step 2: Studio Outline & Lesson Architecture
  │  Teacher adds Units, reorders Lessons using ↑/↓ arrows,
  │  configures Daily Lesson Release (Asia/Colombo timezone) or Open Access.
  ▼
Step 3: Content Authoring (Lesson Editor)
  │  Teacher writes text blocks, uploads R2 WebP images, embeds YouTube videos,
  │  or uses AI Content Tools ("Improve Text", "Build Lesson from Material").
  ▼
Step 4: Interactive Assessment Planning & AI Importer
  │  Teacher configures Question Plan blueprint (types, counts, difficulty, marks).
  │  Studio builds v1.0 AI Prompt. External AI or Internal API generates JSON.
  │  Studio validates schema strictly and imports questions into the lesson.
  ▼
Step 5: Student Simulation Preview
  │  Teacher toggles to /preview to test reading flow, 10 light theme presets,
  │  question answering, Web Audio chimes, confetti bursts, and completion modal.
  ▼
Step 6: Non-Blocking Autosave
  │  Debounced 1500ms background saving synchronizes blocks and questions without
  │  stealing input focus or resetting cursor position.
  ▼
Step 7: Publish & Multi-Classroom Assignment
  │  Teacher opens Publish Modal, selects target classrooms, sets start/due dates,
  │  and publishes. Backend creates course_classroom_assignments and auto-enrolls students.
```

---

## 6. LESSON EDITOR

The Lesson Editor ([CourseEditorPage.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/pages/course-studio/CourseEditorPage.tsx)) is the primary workspace for content creation.

### Components & Panels:
1. **Top Header Bar:** Course title, back button, lesson switcher, preview button, autosave status indicator (`Saved` / `Saving...`), and Publish button.
2. **Left Panel (Course Outline):** Tree hierarchy of units and lessons with reordering arrows (`↑`/`↓`), `+ Add Day/Lesson`, `+ Add Unit`, and lesson deletion.
3. **Center Panel (Content Stream):** Vertical canvas displaying all content blocks in sequence, with "+ Add Section" dropdown and inline block controls (Move Up, Move Down, Duplicate, Delete).
4. **Questions Section:** Dedicated interactive practice question manager below content blocks. Displays question list, type badges, point badges, inline editing, and "Open Question Planner" trigger.
5. **Right Panel (AI & Settings Drawer):**
   - **AI Tab:** AI Assistant tools ("Build Lesson from Notes", "Generate Practice Questions", "Improve Section").
   - **Settings Tab:** Learning Progression toggle (`Open Access` vs `Daily Release`), Timezone selector (`Asia/Colombo`), Course Cover Aspect Ratio switcher (`1:1 Square` vs `16:9 Banner`), Image Uploader, and Course Metadata.

### Content Block Specifications:

| Block Type | UI / Controls | Stored Data Schema | Required Fields | Media Handling | Validation & Preview Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text` | Multi-line textarea with auto-grow and typography formatting preview. | `{ text: string, title?: string }` | `text` | None | Renders formatted markdown headings, lists, bold/italic, and quotes. |
| `text_image` | Text editor + image upload dropzone + caption input + position selector. | `{ text: string, title?: string, image: { url: string, storage_key?: string, caption?: string, position: 'above'\|'below'\|'left'\|'right', size: 'small'\|'medium'\|'large' } }` | `text` | Uploads to Cloudflare R2 via presigned PUT. Client converts to WebP. | Renders image responsive alongside text with caption. |
| `text_video` | Text editor + Video URL input + short toggle. | `{ text: string, title?: string, video: { url: string, position: 'above'\|'below', is_short: boolean } }` | `text`, `video.url` | Direct URL embed. | Renders responsive video iframe. |
| `image` | Standalone image dropzone + caption input. | `{ url: string, storage_key?: string, caption?: string, size: 'small'\|'medium'\|'large' }` | `url` | Cloudflare R2 presigned WebP upload. | Renders centered visual card with subtle rounded border. |
| `youtube_video` | YouTube URL input + title field. | `{ url: string, title?: string, is_short: false }` | `url` | YouTube iframe player API embed. | Validates YouTube URL ID and renders 16:9 responsive frame. |
| `youtube_short` | YouTube Shorts URL input + title. | `{ url: string, title?: string, is_short: true }` | `url` | YouTube iframe player API embed. | Renders centered 9:16 portrait video container. |

---

## 7. INTERACTIVE PRACTICE / ASSESSMENT SYSTEM

The practice system supports **8 interactive question types** defined in `src/types/courseStudio.ts` and validated via `src/utils/questionSchemaValidator.ts`:

### 1. Multiple Choice (`multiple_choice`)
- **Teacher Config:** Question prompt, 2–4 options (A, B, C, D), correct option selection, explanation, difficulty (`easy`/`medium`/`hard`), points (default: 10).
- **Data Structure:** `question_text: string`, `options: string[]`, `correct_answer: string`, `explanation: string`, `points: number`.
- **Student UI:** Question card with lettered option chips (A, B, C, D).
- **Validation:** Exact case-insensitive string equality against `correct_answer`.
- **Feedback:** Immediate green highlight on correct option; red highlight on selected wrong option with green reveal on correct option. Web Audio chime + confetti burst on correct answer.

### 2. True / False (`true_false`)
- **Teacher Config:** Statement text, true/false toggle, explanation, difficulty, points (default: 10).
- **Data Structure:** `question_text: string`, `options: ["True", "False"]`, `correct_answer: "True" | "False"`, `explanation: string`, `points: number`.
- **Student UI:** Statement text with two large pill buttons: `[ True ]` and `[ False ]`.
- **Validation:** Boolean equality (`"true"` vs `"false"`).
- **Feedback:** Green/red pill styling + explanation banner.

### 3. Fill in the Blank (`fill_blank`)
- **Teacher Config:** Sentence containing `______` blank, exact correct word/phrase, explanation, points (default: 10).
- **Data Structure:** `question_text: string`, `correct_answer: string`, `options: []`, `explanation: string`, `points: number`.
- **Student UI:** Sentence text with a high-contrast inline typed input field (`#FFFFFF` text on dark theme, `#0f172a` on light theme).
- **Validation:** Normalized whitespace, case-insensitive string match.
- **Feedback:** Shows correct answer if wrong; audio chime + confetti if correct.

### 4. Matching Pairs (`matching`)
- **Teacher Config:** Question prompt, array of left-right pair items (`{ left: string, right: string }`), explanation, points (default: 10).
- **Data Structure:** `question_text: string`, `options: ["LeftItem -> RightItem", ...]`, `correct_answer: string`, `explanation: string`, `points: number`.
- **Student UI:** Left items column paired with interactive matching buttons on the right.
- **Validation:** Evaluates all paired mappings against canonical pairs.
- **Feedback:** Highlight matched pairs in emerald; incorrect pairs in rose.

### 5. Sentence Builder (`sentence_builder`)
- **Teacher Config:** Prompt, word token array, canonical sentence, explanation, points (default: 10).
- **Data Structure:** `question_text: string`, `options: string[]` (words), `correct_answer: string` (full sentence), `points: number`.
- **Student UI:** Word bank chips that tap into an assembled sentence line.
- **Validation:** Assembled string compared against `correct_answer`.
- **Feedback:** Visual chip state locks on submit.

### 6. Ordering Sequence (`ordering`)
- **Teacher Config:** Chronological story events array (`items: string[]`), explanation, points per activity (default: 10).
- **Data Structure:** `question_text: string`, `options: string[]` (canonical ordered sentences), `correct_answer: string` (canonical order joined by `\|\|\|`), `points: number`.
- **Student UI:** Draggable vertical cards with grab handles, touch support, number badges (01, 02...), and accessible `▲` / `▼` buttons.
- **Validation:** Evaluates submitted sequence string (`item1|||item2|||item3`) against canonical sequence.
- **Feedback:** Evaluates on "Check Order" click. If wrong, highlights red and reveals canonical chronological timeline.

### 7. Cloze Passage (`cloze_passage`)
- **Teacher Config:** Complete passage text containing blanks (e.g. `The bird looked at the [ sky ]...`), array of blanks with exactly 4 options each (1 correct + 3 distractors), points per passage (default: 20).
- **Data Structure:** `question_text: string`, `passage: string`, `blanks: ClozeBlank[]`, `options: { passage, blanks }`, `points: number`.
- **Student UI:** Editorial reading passage with embedded inline dropdown chips. Tapping a blank opens a 4-option dropdown menu.
- **Validation:** Evaluates each blank individually on selection. Complete score awarded when all blanks are filled.
- **Feedback:** Instant green/red badge per blank with Web Audio chime; completion confetti when all blanks are correct.

### 8. Essay / Descriptive Response (`essay`)
- **Teacher Config:** Writing prompt, optional reference image URL, word range (`min_words: 80, max_words: 100`), evaluation criteria list, points (default: 20).
- **Data Structure:** `question_text: string`, `image_url?: string`, `min_words: number`, `max_words: number`, `evaluation_criteria: string[]`, `points: number`.
- **Student UI:** Prominent reference image preview, word count target badge (`80–100 words`), live typing textarea, real-time word counter with green checkmark when threshold reached, and "Submit Response" button.
- **Validation:** Asynchronous AI Evaluation via `POST /api/course-studio/essay-evaluate` (Multimodal Gemini 2.5/2.0 Flash → OpenAI Vision → Heuristic Fallback).
- **Feedback:** Comprehensive AI rubric score card (Score / 100, Strengths, Areas for Improvement, Criteria breakdown).

---

## 8. ORDERING ACTIVITY

The Ordering Activity ([DraggableOrderingQuestion.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/DraggableOrderingQuestion.tsx)) is an interactive chronological story arranger:

- **Storage Format:** Canonical order is stored in `question.options` as an array of strings. The correct answer string is `canonicalItems.join('|||')`.
- **Initial Presentation:** Shuffled using a deterministic 10-pass Fisher-Yates algorithm (`shuffleItems`) that guarantees the initial presentation is scrambled and never matches the solved order by default.
- **Drag-and-Drop Implementation:**
  - **Desktop:** HTML5 Drag & Drop API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) with live visual "Drop Here" blue indicator lines.
  - **Mobile / Touch:** Native pointer/touch tracking (`onTouchStart`, `onTouchMove`, `onTouchEnd`) using `elementFromPoint` / `getBoundingClientRect` for smooth finger dragging.
  - **Keyboard / Button Fallback:** Dedicated accessible `▲` (Move Up) and `▼` (Move Down) buttons on each card for non-drag interactions.
- **Answer Checking:** Student arranges cards and clicks the primary `[ Check Order ]` button. Serializes sequence with `|||` delimiter and evaluates against `question.options`.
- **Capacity:** Supports 2 to 10 sentence cards per activity (standard: 4–6 sentences).
- **Feedback Display:**
  - If correct: Cards turn emerald with green check badges + confetti burst.
  - If incorrect: Cards turn soft rose. Directly beneath, an educational **Correct Chronological Order** reference list displays the complete canonical story timeline numbered 1 to N.

---

## 9. AI QUESTION WORKFLOW

```
Teacher Lesson Content (Text, Video Transcript, Image Description)
  │
  ▼
Question Blueprint Plan (QuestionPlanModal.tsx)
  │  Teacher selects desired question types, exact question counts,
  │  difficulty (Easy, Medium, Hard), and marks per question/activity.
  ▼
EdTechra Prompt Generator (buildAiQuestionPrompt in questionSchemaValidator.ts)
  │  Constructs a strict, comprehensive schema specification prompt (v1.0)
  │  containing exact TypeScript interfaces and few-shot JSON examples for all requested types.
  ▼
Generation Pathways:
  ├── Pathway A (External AI): Teacher copies generated prompt into ChatGPT / Claude / Gemini,
  │   receives compliant JSON, and pastes it into the Importer.
  └── Pathway B (Integrated AI): Studio sends prompt to backend /api/course-studio/ai/generate-questions.
  ▼
Strict Schema Validator (validateQuestionJson)
  │  Checks schema_version, validates question_sets array, enforces exact question counts,
  │  validates 4-option cloze blanks, checks ordering item arrays, detects duplicate types.
  ▼
Idempotent Importer (convertValidatedJsonToCourseQuestions)
  │  Deduplicates by (question_type + question_text), maps to CourseQuestion models,
  │  and replaces lesson questions without creating duplicate database records.
```

- **Connected AI Functionality:**
  - `POST /api/course-studio/ai/generate-questions` (Gemini API with OpenAI fallback).
  - `POST /api/course-studio/ai/build-lesson` (Lesson structure from raw text).
  - `POST /api/course-studio/ai/improve-content` (Grammar, tone, and readability polish).
  - `POST /api/course-studio/essay-evaluate` (Multimodal AI essay & image description rubric evaluation).
- **Manual vs Automated:** Both modes are fully supported. The Question Planner modal provides a "Copy Prompt" tab (for external LLMs) and a "Generate with AI" button (for direct API generation).
- **Fallback Behavior:** If Gemini API key is missing or fails, requests fall back to OpenAI (`gpt-4o-mini`). If both fail, deterministic heuristic engines handle evaluations.

---

## 10. AI QUESTION PROMPT GENERATION

The prompt builder (`buildAiQuestionPrompt`) generates a prompt that instructs the AI on schema compliance:

- **Lesson Text:** Sanitized source text injected under `SOURCE MATERIAL`.
- **Video Transcript:** Injected under `VIDEO TRANSCRIPT` if present on lesson blocks.
- **Image Description:** Injected under `IMAGE DESCRIPTION` if visual media exists.
- **Course & Lesson Metadata:** Injects Course Title, Unit Title, and Episode Title.
- **Blueprint Constraints:** Lists each requested question type with exact question count, difficulty, and target marks.
- **Few-Shot Examples:** Embeds schema templates for all 8 types.
- **Strict Formatting Directives:**
  - *"Return ONLY valid raw JSON."*
  - *"Do NOT wrap in markdown backticks."*
  - *"Ensure exactly 4 options per Cloze blank."*
  - *"Ensure Ordering questions contain array of sequential items."*

---

## 11. JSON IMPORT SYSTEM

The JSON Import engine is implemented in [QuestionPlanModal.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/QuestionPlanModal.tsx) and [questionSchemaValidator.ts](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/utils/questionSchemaValidator.ts):

- **Input Location:** JSON Import tab inside the Question Planner modal.
- **Validation Pipeline:**
  1. `JSON.parse` with try/catch syntax check.
  2. Strips any accidental markdown code fencing (` ```json ... ``` `).
  3. Verifies `schema_version: "1.0"`.
  4. Validates `question_sets` array: Checks for unsupported types, duplicate type sets, empty sets, and missing required fields per type.
  5. Cross-checks against the active Question Plan: Rejects imports if actual question counts or blank counts do not match the teacher's configured blueprint.
- **Duplicate Question Prevention:**
  - **Client-Side:** When importing, existing questions for the episode are replaced, and questions in the imported JSON are deduplicated by `(question_type + question_text)`.
  - **Server-Side:** `POST /api/course-studio/courses/:id/questions` executes an atomic `DELETE FROM course_questions WHERE episode_id = :id` followed by a deduplicated batch insert.

---

## 12. STUDENT QUESTION EXPERIENCE

The student question interface ([CourseContentRenderer.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/CourseContentRenderer.tsx)) provides:

- **Layout:** High-contrast question cards with question type badge, points pill (`+10 PTS`), and question index (`Question 1 of 5`).
- **One-Click Single-Attempt Lock:** Tapping an answer evaluates immediately and permanently locks the question to prevent guessing or retrying.
- **Immediate Feedback:**
  - Correct: Vibrant emerald card border, green check icon, sound chime, and celebratory confetti.
  - Incorrect: Soft rose border, red X icon, card shake animation, error sound, and clear explanation card revealing the correct answer.
- **Dark Mode Contrast:** All inputs, textareas, dropdowns, and option pills explicitly declare `#FFFFFF` or `#e2e8f0` typed text on dark backgrounds to prevent invisible text.
- **Persistent State:** Student answers and question attempt records are saved in `public.course_question_attempts` and re-hydrated on page load.

---

## 13. QUESTION FEEDBACK & GAMIFICATION

| Feature | Status | Implementation Details |
| :--- | :--- | :--- |
| **Web Audio Chimes** | `IMPLEMENTED` | Synthesized Web Audio API oscillators (`courseAudio.ts`) for selection, correct (`playCorrectSound`), incorrect (`playIncorrectSound`), and lesson completion (`playCompleteSound`). Mute toggle available. |
| **Confetti Bursts** | `IMPLEMENTED` | Contained multi-particle canvas confetti bursts (`courseConfetti.ts`) triggered at button coordinates upon correct answer. |
| **Points / Score Tracking** | `IMPLEMENTED` | Points awarded immediately upon correct evaluation (default 10 pts for MC/TF/Ordering, 20 pts for Cloze/Essay). Telemetry saved to `course_question_attempts`. |
| **Celebration Modal** | `IMPLEMENTED` | Encouraging pop-up modal (`LessonCompletionModal.tsx`) with sound, confetti, points badge (`+10 POINTS`), and progression routing. |
| **Course Progression %** | `IMPLEMENTED` | Real-time calculation of completed lessons vs total lessons displayed in header and roadmap. |
| **Gamified Badges & XP** | `PARTIALLY IMPLEMENTED` | Database tables `user_xp_history` and `topic_mastery` exist; Course Studio currently awards points and calculates mastery percentages. |

---

## 14. LESSON COMPLETION

- **Completion Trigger:** When a student finishes reading all blocks and answering all practice questions in an episode, clicking "Complete Lesson" triggers the completion engine.
- **Database Telemetry:**
  - Upserts record in `public.course_episode_progress` with `status: 'completed'`, `score`, `max_score`, `percentage`, and `completed_at`.
  - Updates `public.course_enrollments` with recalculated `progress_percent`, `completed_episodes_count`, and `accuracy_percent`.
  - Records a `course_learning_events` entry (`event_type: 'episode_completed'`).
- **Celebration Modal ([LessonCompletionModal.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/LessonCompletionModal.tsx)):**
  - **If Daily Lesson Release is ON:** Displays *"Congratulations, [Student Name]! You’ve completed today’s lesson. Excellent work! Your next lesson will be ready tomorrow."* → Button: `Continue to Roadmap →`.
  - **If Daily Lesson Release is OFF:** Displays *"Congratulations, [Student Name]! You’ve completed this lesson! Keep going — you’re making great progress."* → Button: `Continue Learning →`.

---

## 15. DAILY LESSON RELEASE / LOCKING

The Daily Lesson Release engine ([dailyReleaseEngine.ts](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/utils/dailyReleaseEngine.ts)) manages time-based lesson pacing:

- **Timezone Pacing:** Calculated using calendar days in the course's configured timezone (default: `Asia/Colombo` UTC+05:30).
- **Unlocking Rules:**
  - Day 1 (Lesson 1) is unlocked immediately upon enrollment.
  - Lesson $N$ unlocks on Day $N$ at 00:00:00 (midnight) in the course timezone.
  - Completing Day 1 early (e.g. at 9:00 AM) does **not** unlock Day 2 prematurely; Day 2 unlocks at the scheduled midnight.
- **Teacher Override:** Teachers can manually unlock any locked lesson immediately via the studio `[Unlock Now]` button (`POST /api/course-studio/courses/:id/episodes/:episodeId/unlock`).
- **Student Roadmap Component ([CourseRoadmap.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/CourseRoadmap.tsx)):**
  - Displays a vertical connected timeline of all lessons with 3 accessible states:
    1. `Completed` (`✓`): Green badge, labeled "Completed".
    2. `Available` (`▶`): Brand blue pulsing badge, labeled "Start" or "Continue".
    3. `Locked` (`🔒`): Slate badge, labeled "Opens tomorrow" or "Opens Day X".
  - Clicking a locked lesson triggers a non-blocking toast notification (*"Lesson X is locked. It will open tomorrow at midnight."*).

---

## 16. COURSE PREVIEW

- **Preview Route:** `/course-studio/:courseId/preview`.
- **Functionality:** Exact simulation of the student learning experience.
- **Features:**
  - Includes View Mode switcher: `Reading View` (blocks + questions) vs `Roadmap View` (progression timeline).
  - Theme Selector popover (10 light gradient presets + 1 dark theme).
  - Font scale controls (`A-` / `A+`).
  - Sound effect toggle (`Volume2` / `VolumeX`).
  - Interactive question evaluation with sound chimes and confetti bursts.
  - Completion modal test trigger.

---

## 17. THEMING & VISUAL SYSTEM

Defined in `src/utils/courseThemes.ts` and `src/utils/courseTextFormatting.ts`:

- **Design Philosophy:** Apple Books / Kindle editorial reading aesthetic with 14px body typography, 1.85 line-height, and soft organic gradient cards.
- **10 Light Gradient Presets:**
  1. `Morning Mist` (Ivory to pale sky blue - Default)
  2. `Aurora` (Soft blue to gentle lavender)
  3. `Peach Cloud` (Warm cream to soft peach)
  4. `Sage Garden` (Ivory to pale serene sage)
  5. `Lavender Paper` (Ivory to delicate lavender)
  6. `Ocean Breeze` (Pale cyan to clear soft blue)
  7. `Sunset Cream` (Warm cream to muted peach)
  8. `Rose Paper` (Ivory to pale rose)
  9. `Sky Glass` (Pure white to crystalline pale blue)
  10. `Sand & Sage` (Warm ivory to muted sage)
- **Dark Theme:** `Night Dark` (Deep midnight `#101722` with `#182232` cards and `#e2e8f0` typography).
- **Typography Scaling:** Three scale levels: `sm` (13px body), `md` (14px body - default), `lg` (16px body).
- **Responsive Breakpoints:** Fully responsive down to 320px mobile viewport with zero horizontal scroll overflow.

---

## 18. DATABASE

The database schema is managed via Supabase PostgreSQL migrations in `supabase/migrations/`:

| Table Name | Purpose | Key Columns | Relationships / Foreign Keys | RLS Policies |
| :--- | :--- | :--- | :--- | :--- |
| `public.courses` | Top-level course records owned by teachers. | `id`, `teacher_id`, `title`, `short_description`, `subject`, `grade_level`, `cover_image_url`, `cover_image_key`, `cover_aspect_ratio`, `course_type`, `status`, `daily_release_enabled`, `course_timezone`, `course_start_date` | `teacher_id` → `profiles.id` | Teachers manage own courses; Students select assigned published courses. |
| `public.course_units` | Units grouping lessons. | `id`, `course_id`, `title`, `description`, `order_index` | `course_id` → `courses.id` (ON DELETE CASCADE) | Cascade read for assigned students; full write for course teacher. |
| `public.course_episodes` | Lessons/Days inside units. | `id`, `unit_id`, `course_id`, `title`, `episode_type`, `order_index`, `position`, `release_day`, `is_manually_unlocked`, `estimated_minutes` | `unit_id` → `course_units.id`, `course_id` → `courses.id` | Cascade read for assigned students; full write for course teacher. |
| `public.course_blocks` | Content sections (text, media). | `id`, `episode_id`, `course_id`, `block_type`, `order_index`, `content` (JSONB) | `episode_id` → `course_episodes.id`, `course_id` → `courses.id` | Cascade read for assigned students; full write for course teacher. |
| `public.course_questions` | Practice activities. | `id`, `episode_id`, `course_id`, `question_text`, `question_type`, `options` (JSONB), `correct_answer`, `explanation`, `difficulty`, `points`, `order_index` | `episode_id` → `course_episodes.id`, `course_id` → `courses.id` | Cascade read for assigned students; full write for course teacher. |
| `public.course_media` | Asset registry for R2 uploads. | `id`, `teacher_id`, `course_id`, `storage_key`, `public_url`, `mime_type`, `width`, `height`, `optimized_size` | `teacher_id` → `profiles.id`, `course_id` → `courses.id` | Teachers view/manage own media records. |
| `public.course_classroom_assignments` | Multi-classroom course distribution. | `id`, `course_id`, `classroom_id`, `assigned_by`, `start_date`, `due_date`, `status`, `settings` (JSONB) | `course_id` → `courses.id`, `classroom_id` → `classrooms.id` | Teachers manage assignments; Classroom students view assigned courses. |
| `public.course_enrollments` | Student course enrollment & stats. | `id`, `course_id`, `classroom_id`, `classroom_assignment_id`, `student_id`, `status`, `progress_percent`, `mastery_percent`, `accuracy_percent`, `completed_episodes_count` | `classroom_assignment_id` → `course_classroom_assignments.id`, `student_id` → `profiles.id` | Students view own enrollments; Teachers view classroom students. |
| `public.course_episode_progress` | Episode-level completion telemetry. | `id`, `enrollment_id`, `student_id`, `course_id`, `classroom_id`, `episode_id`, `status`, `score`, `max_score`, `percentage`, `time_spent_seconds`, `completed_at` | `enrollment_id` → `course_enrollments.id`, `episode_id` → `course_episodes.id` | Students manage own progress; Teachers view classroom progress. |
| `public.course_question_attempts` | Question-level submission logs. | `id`, `enrollment_id`, `student_id`, `course_id`, `classroom_id`, `episode_id`, `question_id`, `student_answer`, `is_correct`, `points_awarded`, `answered_at` | `enrollment_id` → `course_enrollments.id`, `question_id` → `course_questions.id` | Students insert own attempts; Teachers query for classroom analytics. |
| `public.course_learning_events` | Granular audit trail for learning actions. | `id`, `student_id`, `course_id`, `classroom_id`, `episode_id`, `question_id`, `event_type`, `metadata` (JSONB), `created_at` | `student_id` → `profiles.id`, `course_id` → `courses.id` | Service role & authenticated students append events. |

---

## 19. STORAGE

- **Cloudflare R2 (Primary Media Storage):**
  - Used for course cover images, block illustrations, and OCR worksheets.
  - S3 API Client initialized in `server.mjs` with `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, and `CLOUDFLARE_R2_BUCKET_NAME`.
  - **Upload Flow:** Client compresses image to WebP in browser canvas (`optimizeImageForUpload`) $\rightarrow$ requests presigned upload URL via `POST /api/course-studio/presign-upload` $\rightarrow$ performs direct binary `PUT` to Cloudflare R2 $\rightarrow$ persists `public_url` and `storage_key`.
- **Supabase Storage:**
  - Used for user profile avatars and general platform static assets.
- **YouTube Embeds:**
  - Videos and Shorts are embedded directly via standard YouTube iframe parameters (`enablejsapi=1`, `rel=0`). No local video storage required.

---

## 20. API ENDPOINTS

All backend routes are registered in `server.mjs`:

| Route | Method | Purpose | Auth Required | Request Body / Params | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/course-studio/courses` | `GET` | List teacher's courses | Yes (Bearer JWT) | None | `{ success: true, courses: Course[] }` |
| `/api/course-studio/courses` | `POST` | Create new course | Yes | `{ title, subject, grade_level, course_type, cover_aspect_ratio, ... }` | `{ success: true, course: Course }` |
| `/api/course-studio/courses/:id` | `GET` | Get full course detail (units, episodes, blocks, questions, assignments) | Yes | `id` in params | `{ success: true, course: EnrichedCourse }` |
| `/api/course-studio/courses/:id` | `PUT` | Update course metadata | Yes | `{ title, short_description, subject, cover_aspect_ratio, daily_release_enabled, course_timezone, ... }` | `{ success: true, course: Course }` |
| `/api/course-studio/courses/:id` | `DELETE` | Delete course & cascade | Yes | `id` in params | `{ success: true, message: string }` |
| `/api/course-studio/courses/:id/duplicate` | `POST` | Duplicate complete course | Yes | `id` in params | `{ success: true, course: Course }` |
| `/api/course-studio/courses/:id/units` | `POST` | Create unit | Yes | `{ title, description, order_index }` | `{ success: true, unit: CourseUnit }` |
| `/api/course-studio/courses/:id/units/:unitId` | `PUT` | Update unit | Yes | `{ title, description, order_index }` | `{ success: true, unit: CourseUnit }` |
| `/api/course-studio/courses/:id/units/:unitId` | `DELETE` | Delete unit | Yes | `unitId` in params | `{ success: true, message: string }` |
| `/api/course-studio/courses/:id/episodes` | `POST` | Create episode / lesson | Yes | `{ unit_id, title, episode_type, order_index, estimated_minutes }` | `{ success: true, episode: CourseEpisode }` |
| `/api/course-studio/courses/:id/episodes/:episodeId` | `PUT` | Update episode | Yes | `{ title, episode_type, position, release_day, estimated_minutes, ... }` | `{ success: true, episode: CourseEpisode }` |
| `/api/course-studio/courses/:id/episodes/reorder` | `POST` | Batch persist lesson ordering | Yes | `{ unit_id, episode_ids: string[] }` | `{ success: true, message: string }` |
| `/api/course-studio/courses/:id/episodes/:episodeId/unlock` | `POST` | Teacher override unlock | Yes | `episodeId` in params | `{ success: true, episode: CourseEpisode }` |
| `/api/course-studio/courses/:id/episodes/:episodeId` | `DELETE` | Delete episode | Yes | `episodeId` in params | `{ success: true, message: string }` |
| `/api/course-studio/courses/:id/episodes/:episodeId/blocks` | `POST` | Sync/Save episode content blocks | Yes | `{ blocks: CourseBlock[] }` | `{ success: true, blocks: CourseBlock[] }` |
| `/api/course-studio/courses/:id/questions` | `POST` | Sync/Save episode questions | Yes | `{ episode_id, questions: CourseQuestion[] }` | `{ success: true, questions: CourseQuestion[] }` |
| `/api/course-studio/essay-evaluate` | `POST` | AI Multimodal Essay Evaluation | Yes | `{ question_text, student_response, image_url, min_words, max_words, evaluation_criteria }` | `{ success: true, evaluation: EssayEvaluationResult }` |
| `/api/course-studio/courses/:id/publish-and-assign` | `POST` | Publish course & assign to classrooms | Yes | `{ classroom_ids: string[], start_date, due_date, settings }` | `{ success: true, course: Course, assignments: [...] }` |
| `/api/course-studio/courses/:id/analytics` | `GET` | Cross-classroom course analytics | Yes | `id` in params | `{ success: true, analytics: CourseAnalyticsSummary }` |
| `/api/course-studio/presign-upload` | `POST` | Generate Cloudflare R2 presigned upload URL | Yes | `{ courseId, filename, contentType, size, isCover }` | `{ success: true, data: { uploadUrl, publicUrl, objectKey } }` |
| `/api/course-studio/ai/build-lesson` | `POST` | AI generate lesson structure from notes | Yes | `{ raw_material, course_title, unit_title, subject, grade_level }` | `{ success: true, data: AILessonGenerationResponse }` |
| `/api/course-studio/ai/generate-questions` | `POST` | AI generate questions from text | Yes | `{ content_text, question_types, question_count, difficulty }` | `{ success: true, data: AIQuestionGenerationResponse }` |
| `/api/course-studio/ai/improve-content` | `POST` | AI improve block text | Yes | `{ text, instruction }` | `{ success: true, data: { improved_text, summary_of_changes } }` |
| `/api/classes/:classroomId/courses` | `GET` | List assigned courses in classroom | Yes | `classroomId` in params | `{ success: true, courses: EnrichedAssignment[] }` |
| `/api/course-studio/student/progress` | `POST` | Record episode completion & calculate course % | Yes | `{ course_id, classroom_id, episode_id, score, max_score, time_spent_seconds }` | `{ success: true, enrollment: CourseEnrollment }` |
| `/api/course-studio/student/attempt` | `POST` | Record single question attempt | Yes | `{ course_id, classroom_id, episode_id, question_id, student_answer, is_correct, points_awarded }` | `{ success: true, attempt: Attempt, accuracy_percent: number }` |
| `/api/course-studio/student/attempts` | `GET` | Get previous question attempts | Yes | `course_id`, `classroom_id`, `episode_id` in query | `{ success: true, attempts: Attempt[] }` |

---

## 21. AUTHENTICATION & SECURITY

- **Auth Provider:** Supabase Auth (JWT bearer tokens).
- **Session Handling:** Managed via `AuthContext.tsx`. Sessions are stored in localStorage by Supabase client. On API requests, `getAuthHeader()` extracts `session.access_token` and sends `Authorization: Bearer <token>`.
- **Backend Verification:** `verifyAuthUser(req)` in `server.mjs` calls `serverSupabase.auth.getUser(token)` to validate the token cryptographically on every protected request.
- **Row-Level Security (RLS):** All 11 course tables have RLS enabled with explicit PostgreSQL policies guaranteeing that teachers can only write to their own courses and students can only read published courses assigned to their active classrooms.
- **Roles:** Handled via `public.profiles.role` (`'student' | 'teacher' | 'admin'`). Role escalations are protected via server procedures (`complete_user_onboarding`).

---

## 22. CURRENT BUGS & KNOWN PROBLEMS

1. **Duplicate Question Import (RESOLVED):** Previously, importing JSON question sets could append duplicates. Resolved via client-side deduplication in `QuestionPlanModal.tsx` and server-side atomic replacement in `POST /api/course-studio/courses/:id/questions`.
2. **Dark Mode Text Contrast (RESOLVED):** Fill in the blank inputs and textareas previously inherited dark text on dark cards. Resolved by enforcing explicit `#FFFFFF` / light text styling and visible carets across all interactive widgets.
3. **Autosave Interruption (RESOLVED):** Previously autosave triggered full re-renders that stole input focus. Resolved via non-blocking debounced (1500ms) background sync tracking signatures with zero DOM unmounting.
4. **Ordering Drag Jitter on Mobile Safari (MITIGATED):** Standard HTML5 drag-and-drop behaves inconsistently on iOS WebKit. Mitigated by adding dedicated pointer/touch event handlers and explicit accessible `▲`/`▼` reordering buttons on every item.
5. **Classroom Assignments Join Limit:** If a teacher assigns a course to a classroom with > 500 students, the enrollment upsert loop in `publish-and-assign` executes in a single batch without chunking. Recommended for future scaling: chunk enrollment inserts in batches of 100.

---

## 23. INCOMPLETE / PLACEHOLDER FEATURES

- **Audio Content Blocks (`audio`):** The schema supports `block_type: 'audio'`, but the UI does not yet render a dedicated audio recorder/uploader block in the lesson editor.
- **Sentence Builder Teacher UI:** The Question Planner generates Sentence Builder schemas and the student renderer supports it, but the Teacher Editor does not yet have a dedicated manual form builder for sentence builder tokens (teachers create it via AI import).
- **Classroom Live Quiz Course Integration:** Live Quiz (`/classes/live-quiz`) is currently a standalone realtime quiz game; converting a Course Studio episode directly into a live multiplayer game session is planned but not yet connected.

---

## 24. COMPLETE DATA FLOW

### Primary Authoring & Student Progression Flow:
```
[TEACHER]
  │
  ├─► Creates Course (Title, Subject, Cover Aspect Ratio 1:1 or 16:9)
  │     └─► Backend creates `courses` + `course_units` + `course_episodes`
  │
  ├─► Authors Lesson Content (CourseEditorPage.tsx)
  │     ├─► Text / Video / Image Blocks ──► Cloudflare R2 / `course_blocks`
  │     └─► Questions (QuestionPlanModal) ──► Strict Schema Validation ──► `course_questions`
  │
  ├─► Configures Progression Settings
  │     ├─► Open Access OR Daily Lesson Release (Timezone: Asia/Colombo)
  │     └─► Reorders Lessons using ↑/↓ ──► `course_episodes.position`
  │
  └─► Publishes & Assigns (CoursePublishModal.tsx)
        ├─► `courses.status` = 'published'
        ├─► `course_classroom_assignments` created
        └─► `course_enrollments` auto-provisioned for all active classroom students
              │
              ▼
[STUDENT]
  │
  ├─► Opens Classroom (`/classes/:id`) ──► Views Course Card (1:1 Square or 16:9 Banner)
  │
  ├─► Opens Student Course Player (`/classes/:id/courses/:courseId/learn`)
  │     ├─► Reads Course Content Blocks (10 Light Themes, Kindle/Apple Books Typography)
  │     ├─► Interacts with Practice Questions (MCQ, True/False, Cloze, Ordering, Essay)
  │     │     └─► 1-Click Evaluation ──► Web Audio Chime + Confetti ──► `course_question_attempts`
  │     │
  │     ├─► Completes Lesson
  │     │     ├─► `course_episode_progress` (Status: 'completed')
  │     │     ├─► `course_enrollments` (Recalculates progress %, mastery %)
  │     │     └─► Celebrates with `LessonCompletionModal`
  │     │
  │     └─► Navigates Roadmap (`CourseRoadmap.tsx`)
  │           ├─► Completed Lessons (✓ Green)
  │           ├─► Current Available Lesson (▶ Blue Pulse)
  │           └─► Future Days Locked (🔒 Midnight Unlock Schedule)
```

---

## 25. COMPONENT & CODE ARCHITECTURE

```
src/
├── components/
│   └── course-studio/
│       ├── CourseContentRenderer.tsx ...... Core student content & question renderer
│       ├── CourseRoadmap.tsx .............. Student progression timeline (Completed, Available, Locked)
│       ├── LessonCompletionModal.tsx ...... Gamified celebration modal (Daily Release ON vs OFF)
│       ├── DraggableOrderingQuestion.tsx .. Touch & pointer chronological story arranger
│       ├── ClozePassageQuestion.tsx ....... Inline multi-blank reading passage dropdowns
│       ├── EssayQuestion.tsx .............. Student writing editor with AI multimodal evaluation
│       ├── QuestionPlanModal.tsx .......... Question blueprint planner & strict JSON importer
│       ├── CoursePublishModal.tsx ......... Multi-classroom publishing & scheduling modal
│       ├── CreateCourseModal.tsx .......... Course creation modal with 1:1 vs 16:9 cover ratio
│       └── ThemeSelectorPopover.tsx ....... 10 light gradient presets + dark theme selector
│
├── pages/
│   ├── course-studio/
│   │   ├── CourseStudioDashboardPage.tsx .. Teacher course repository & card grid
│   │   ├── CourseEditorPage.tsx ........... Main studio lesson editor & outline manager
│   │   ├── CoursePreviewPage.tsx .......... Student simulation preview with theme & view toggles
│   │   └── CourseAnalyticsPage.tsx ........ Cross-classroom concept mastery & student intelligence
│   │
│   └── classes/
│       └── courses/
│           └── StudentCoursePlayerPage.tsx  Student classroom learning player & progress tracker
│
├── services/
│   └── courseStudioService.ts ............. Centralized API client for all course studio operations
│
├── types/
│   └── courseStudio.ts .................... Complete TypeScript interfaces for courses, blocks, questions, attempts
│
└── utils/
    ├── questionSchemaValidator.ts ......... EdTechra JSON Schema v1.0, AI Prompt Builder & Validator
    ├── dailyReleaseEngine.ts .............. Timezone-aware calendar-day release & roadmap calculator
    ├── courseThemes.ts .................... 10 light gradient theme presets & styling maps
    ├── courseTextFormatting.tsx ........... Editorial markdown & typography formatting parser
    ├── courseAudio.ts ..................... Synthesized Web Audio API sound generator
    ├── courseConfetti.ts .................. Contained canvas confetti particle burst engine
    └── imageOptimization.ts ............... Browser canvas WebP image compression utility
```

---

## 26. ENVIRONMENT VARIABLES

The following environment variables are required by the application (variable names only):

- **Database & Supabase:**
  - `VITE_SUPABASE_URL` (Frontend client)
  - `VITE_SUPABASE_ANON_KEY` (Frontend client)
  - `SUPABASE_URL` (Backend server)
  - `SUPABASE_SERVICE_ROLE_KEY` (Backend server administrative access)
- **Cloudflare R2 Media Storage:**
  - `CLOUDFLARE_R2_ACCOUNT_ID`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET_NAME`
  - `CLOUDFLARE_R2_PUBLIC_URL`
  - `CLOUDFLARE_R2_ENDPOINT`
- **AI Intelligence Services:**
  - `GEMINI_API_KEY` (Primary Google Gemini LLM & Multimodal Vision)
  - `OPENAI_API_KEY` (Secondary OpenAI fallback)
- **Server Configuration:**
  - `PORT` (Server listen port, default: 3000)
  - `NODE_ENV` (`development` | `production`)

---

## 27. WHAT IS THE APP TODAY?

**EdTechra Course Studio** is a full-stack digital learning and course authoring platform built for teachers and students. It enables educators to structure modular courses divided into units and lessons, assemble multimedia content sections (rich editorial text, Cloudflare R2-optimized WebP images, and YouTube video/shorts embeds), and design curriculum-aligned interactive practice exercises.

The platform features an advanced **AI Question Plan & Import engine** that generates structured schema v1.0 prompts for LLMs (Google Gemini / OpenAI / ChatGPT) and strictly validates imported JSON across 8 interactive question types—including Multiple Choice, True/False, Fill in the Blank, Matching, Sentence Builder, Draggable Chronological Ordering, Cloze Passages with 4-option dropdowns, and AI-evaluated Multimodal Essays.

For students, EdTechra provides a reading experience inspired by Apple Books and Kindle (with 10 light gradient themes, dark mode, and typography scaling) paired with immediate, gamified question feedback (Web Audio chimes, confetti bursts, and single-attempt score locking). Courses can be published to multiple classroom cohorts with automated **Daily Lesson Release** (unlocking one lesson per calendar day at midnight in `Asia/Colombo` timezone) and an interactive student **Roadmap** showing completed, available, and locked lessons.

---

## 28. CURRENT PRODUCT MODEL

- **Content Creators:** Teachers and instructors author courses within the Course Studio (`/course-studio`).
- **Content Consumers:** Students enrolled in classrooms access published courses via the Student Player (`/classes/:id/courses/:courseId/learn`).
- **Content Hierarchy:** Courses $\rightarrow$ Units $\rightarrow$ Lessons/Episodes $\rightarrow$ Content Blocks $\rightarrow$ Practice Questions.
- **Activity Creation:** Authors can add questions manually or utilize the AI Question Planner to generate structured JSON blueprints that are validated against schema v1.0.
- **AI Assistance:** AI accelerates lesson structure generation from raw notes, generates difficulty-calibrated question sets, polishes text readability, and grades open-ended student essays using multimodal vision rubrics.
- **Publishing & Pacing:** Courses are published directly to classroom rosters with optional Daily Lesson Release locking that schedules daily lesson availability.
- **Progress Tracking:** Student interactions are logged at the question attempt, episode progress, and course enrollment levels, providing teachers with cross-classroom concept mastery analytics.

---

## 29. IMPORTANT ARCHITECTURAL RISKS

1. **State Synchronization Between Outline & Editor:** The studio editor maintains local React state for `currentBlocks` and `currentQuestions`. Fast switching between lessons before the debounced autosave completes could lead to state collisions if not tracked via episode ID refs. (Currently mitigated by explicit `selectedEpisodeId` refs and immediate flush on navigation).
2. **Client-Side JSON Schema Rigidity:** If an external LLM produces minor syntax deviations (e.g. returning string numbers for points), strict validation will reject the import. (The validator handles type coercion where safe, but prompt fidelity remains essential).
3. **Database Migration Sync:** Adding new columns to PostgreSQL requires running corresponding Supabase SQL migrations before client features attempt write operations. (Handled via safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations).
4. **Large Classroom Enrollment Scaling:** Upserting hundreds of student enrollments synchronously in a single request during course publishing could experience HTTP latency. (Recommended: Implement background worker job queue for classes > 500 students).

---

## 30. RECOMMENDED SOURCE OF TRUTH

| Domain / Entity | Authoritative Source of Truth | Sync / Storage Strategy |
| :--- | :--- | :--- |
| **Course Metadata & Settings** | Supabase Database (`public.courses`) | Synchronous PUT API calls |
| **Lesson Hierarchy & Order** | Supabase Database (`public.course_episodes.order_index` & `position`) | Reorder endpoint + Immediate DB commit |
| **Lesson Content Blocks** | Supabase Database (`public.course_blocks`) | Debounced 1500ms non-blocking autosave |
| **Practice Questions** | Supabase Database (`public.course_questions`) | Debounced 1500ms non-blocking autosave / Atomic import replace |
| **Student Episode Progress** | Supabase Database (`public.course_episode_progress`) | Real-time POST on lesson completion |
| **Student Question Attempts** | Supabase Database (`public.course_question_attempts`) | Immediate 1-click POST evaluation |
| **Course Cover & Media** | Cloudflare R2 Object Storage | Presigned upload URL + S3 Object Keys |
| **Active Theme Preset** | LocalStorage / Client Component State | `localStorage.getItem('edtechra_course_theme')` |
| **Text Size Scaling** | Document DOM Attribute (`data-text-size`) + User Profile | `localStorage` + `profiles.text_size` |

---

## 31. FILE MAP

| Area | Important File(s) | Purpose |
| :--- | :--- | :--- |
| **Course Studio Editor** | [CourseEditorPage.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/pages/course-studio/CourseEditorPage.tsx) | Primary teacher studio editor, lesson outline, block authoring, reordering, and settings. |
| **Course Preview** | [CoursePreviewPage.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/pages/course-studio/CoursePreviewPage.tsx) | Student simulation preview with theme switcher, font scaler, and roadmap toggle. |
| **Student Player** | [StudentCoursePlayerPage.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/pages/classes/courses/StudentCoursePlayerPage.tsx) | Classroom student learning player with telemetry tracking and completion handling. |
| **Content & Question Renderer** | [CourseContentRenderer.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/CourseContentRenderer.tsx) | Core interactive practice engine with 1-click evaluation, sound chimes, and confetti. |
| **Student Roadmap** | [CourseRoadmap.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/CourseRoadmap.tsx) | Connected progression timeline displaying Completed, Available, and Locked lessons. |
| **Celebration Modal** | [LessonCompletionModal.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/LessonCompletionModal.tsx) | Encouraging pop-up modal with differentiated messaging for Daily Release ON vs OFF. |
| **Ordering Activity** | [DraggableOrderingQuestion.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/DraggableOrderingQuestion.tsx) | Touch & pointer draggable story arranger with stable shuffle and canonical feedback. |
| **Cloze Passage Question** | [ClozePassageQuestion.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/ClozePassageQuestion.tsx) | Reading passage with embedded 4-option dropdown chips and instant per-blank feedback. |
| **Essay Question** | [EssayQuestion.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/EssayQuestion.tsx) | Student writing interface with live word count and AI Multimodal rubric evaluation. |
| **Question Planner & Importer** | [QuestionPlanModal.tsx](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/components/course-studio/QuestionPlanModal.tsx) | Question blueprint builder, prompt generator, strict JSON validator, and importer. |
| **Schema & Validation** | [questionSchemaValidator.ts](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/utils/questionSchemaValidator.ts) | Schema v1.0 specifications, prompt generator, strict untrusted JSON validation engine. |
| **Daily Release Engine** | [dailyReleaseEngine.ts](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/utils/dailyReleaseEngine.ts) | Timezone-aware calendar-day release calculations and roadmap status derivation. |
| **Theming System** | [courseThemes.ts](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/utils/courseThemes.ts) | 10 light gradient presets + 1 night dark theme definition. |
| **API Client Service** | [courseStudioService.ts](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/src/services/courseStudioService.ts) | Frontend API client for all Course Studio CRUD, AI, and telemetry endpoints. |
| **Backend Express Server** | [server.mjs](file:///c:/Users/hecsb/OneDrive/Desktop/Edtechra%20Bitz%20APP/server.mjs) | Complete backend API routes, auth verification, database queries, and AI integrations. |
| **Database Migrations** | `supabase/migrations/` | 50+ SQL migration files defining courses, units, episodes, blocks, questions, and RLS. |

---

## 32. FINAL STATUS SUMMARY

### IMPLEMENTED
- Full Course Studio authoring interface (Units, Lessons, Content Blocks, Questions).
- 1:1 Square Cover and 16:9 Landscape Banner card format selector and previews.
- Lesson Up/Down (`↑`/`↓`) reordering with explicit position persistence.
- Daily Lesson Release engine with timezone awareness (`Asia/Colombo`) and midnight unlocking.
- Student Course Roadmap with 3 distinct accessible states (Completed, Available, Locked).
- Encouraging Lesson Completion Modal with differentiated Daily Release messaging.
- 8 Interactive Question Types (Multiple Choice, True/False, Fill in the Blank, Matching, Sentence Builder, Ordering, Cloze Passage, Essay).
- Draggable Chronological Story Ordering with pointer, touch, keyboard, and button controls.
- Cloze Passage with embedded 4-option dropdown chips and instant per-blank evaluation.
- Multimodal AI Essay Evaluation (Gemini primary, OpenAI fallback, deterministic heuristic).
- Non-blocking 1500ms debounced autosave with zero typing interruption.
- AI Question Planner and v1.0 schema prompt generator.
- Strict Untrusted JSON schema validation with duplicate rejection and count enforcement.
- Cloudflare R2 presigned uploads with client-side Canvas WebP optimization.
- 10 Light gradient theme presets + Night dark theme with high-contrast text styling.
- Real-time Web Audio API sound synthesis and contained canvas confetti effects.
- Multi-classroom publishing and automatic student enrollment.
- Cross-classroom concept mastery and analytics dashboard.

### PARTIALLY IMPLEMENTED
- Audio content blocks (schema supported; manual audio recording UI in editor pending).
- Gamified XP badges integration for Course Studio (points and accuracy logged; global badge award listener in development).

### BROKEN / NEEDS FIXING
- None currently observed. (All automated test suites passing 100%, build compiles with 0 errors).

### PLANNED / NOT IMPLEMENTED
- Real-time multiplayer classroom live-game mode directly from a Course Studio episode.
- Background asynchronous worker queue for publishing courses to classrooms with > 1,000 students.
