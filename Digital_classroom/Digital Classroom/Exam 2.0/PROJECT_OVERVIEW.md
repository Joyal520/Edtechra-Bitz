# Edtechra AI Exam Engine - Project Overview

This document provides a comprehensive technical overview of the **Edtechra AI Exam Engine** project. It outlines the architecture, file structure, state management, API routes, database layout, and best practices to help future AI agents and engineers onboard and maintain the codebase.

---

## 1. Project Architecture

The application is structured as a lightweight, full-stack JavaScript application with:
- **Backend**: A pure Node.js HTTP server (`server.mjs`) with zero frameworks (no Express, Koa, etc.). It manages static file serving, processes exam generation payloads, saves draft/published exams to a local filesystem database, grades exam attempts, and runs deterministic statistical analysis with server-side PDF generation.
- **Frontend**: A vanilla JavaScript Single Page Application (SPA) (`public/app.js`) that uses client-side state-driven rendering and pure CSS styling (`public/styles.css`).

---

## 2. File Directory Structure

```text
Exam 2.0/
├── data/                         # Local JSON database & logs
│   ├── [exam_id].json            # Saved/published exam records
│   └── exam_audit_logs.jsonl     # Append-only audit logs for actions
├── public/                       # Frontend static folder
│   ├── assets/                   # Logos and static media assets
│   ├── reports/                  # Generated PDF analysis reports (Served statically)
│   ├── app.js                    # Core frontend client logic, state, and rendering
│   ├── index.html                # Entry point container (<div id="app">)
│   └── styles.css                # Premium vanilla CSS styling system
├── package.json                  # Scripts & core dependencies (pdfkit)
├── server.mjs                    # HTTP server, API router, static file server, & OpenAI integration
├── score_analysis.mjs            # Score analysis calculations and PDFkit document compiler
└── PROJECT_OVERVIEW.md           # This project overview document
```

---

## 3. Frontend Architecture (`public/app.js`)

The frontend is a lightweight reactive shell built on a single global state store.

### Global State (`state`)
The app runs on a state object containing:
- `activeStage`: Currently active view (`"setup"`, `"structure"`, `"review"`, `"publish"`, `"results"`).
- `content`: Uploaded text/notes context used to ground AI generation.
- `sections`: List of question structure cards under construction (type, count, marks, difficulty).
- `generatedExam`: The full structured JSON object returned from the generator.
- `approved`: Flag indicating if the teacher has approved the AI-generated draft.
- `publish`: Release settings (classroom, date/time ranges, maximum attempts, password, randomized orders, duration timer overrides).
- `results`: Score analysis metrics, charts, and PDF download links.

### Rendering Loop
- **`render()`**: Overwrites the inner HTML of `#app` dynamically based on `state.activeStage`.
- **Focus Preservation**: Tracks the active element selector, caret range, and selection before rendering, restoring it immediately after to prevent typing interrupts.
- **`bindEvents()`**: Wires event delegation for click and input events. Re-triggers `render()` on state mutation.

### Live Student Countdown Timer
- When previewing an exam as a student, `startStudentTimer()` parses the exam duration string, initializes `state.studentTimeRemaining`, and decrements it every second.
- Updates the `.timer-badge` DOM element directly in an interval to avoid disrupting student input fields. It auto-submits the exam when the timer hits zero.

---

## 4. Backend Routing (`server.mjs` & `score_analysis.mjs`)

The backend is a Node.js `createServer()` block running on port `5173` (or port configured in `.env`).

### API Endpoints

#### 1. `GET /api/health`
- Verifies server health and checks if the `OPENAI_API_KEY` environment variable is configured.

#### 2. `POST /api/generate-exam`
- Receives content prompts and question parameters.
- If `OPENAI_API_KEY` is present, it uses `gpt-4.1-mini` with strict structured JSON output to build unique, content-grounded questions conforming to the schema.
- If offline, it uses `buildFallbackExam()` to return realistic sample mock questions.
- Runs `normalizeExam()` to clean up formatting, randomize option orders, sanitize matching column words, and ensure reading passage parameters are populated.

#### 3. `POST /api/grade-attempt`
- Grades objective questions (MCQs, True/False) deterministically.
- Marks long-form questions (Comprehension, Short Answer, Essays) as "hybrid" and assigns partial credit (70%), queuing them for teacher confirmation.

#### 4. `POST /api/save-exam`
- Saves or updates the exam schema inside `data/[exam_id].json`.

#### 5. `POST /api/publish-exam`
- Enforces teacher approval gate check. Updates exam status to `"published"`.

#### 6. `POST /api/score-analysis`
- Invokes `score_analysis.mjs` to calculate:
  - **Class Stats**: Average, median, high/low spread, pass/fail counts, and pass rates.
  - **Question Profiling**: Correct/incorrect attempts, accuracy rates, hardest and easiest questions.
  - **Topic Accuracy**: Groups accuracy by topics to find weakest and strongest topics.
  - **Difficulty Accuracy**: Groups performance by Easy, Medium, and Hard.
  - **Time Correlation**: Pearson correlation coefficient between time spent and exam scores.
  - **Rankings**: Percentiles and dense sequential leaderboard ranks.
  - **Outliers**: Identifies top performers, low performers, and at-risk students.
  - **PDF compilation**: Builds a beautiful 7-page vector-drawn document export in `public/reports/[exam_id]_[class_id].pdf` using `pdfkit`.

---

## 5. Local JSON Database Layout (`data/`)

Saved exams are written in JSON files:
```json
{
  "examId": "exam_abc123",
  "status": "published",
  "approved": true,
  "savedAt": "2026-06-09T14:18:21Z",
  "metadata": {
    "examId": "exam_abc123",
    "title": "Unit Test - AI Draft",
    "examType": "Unit Test",
    "difficulty": "Mixed",
    "duration": "60 Minutes",
    "totalMarks": 100,
    "gradingMode": "Hybrid Grading",
    "status": "draft"
  },
  "exam": {
    "sections": [
      {
        "sectionId": "sec_xyz",
        "title": "Multiple Choice Questions (MCQ)",
        "questionType": "Multiple Choice Questions (MCQ)",
        "instruction": "Choose the correct answer.",
        "totalMarks": 10,
        "questions": []
      }
    ]
  },
  "settings": {},
  "publishing": {}
}
```

---

## 6. Engineering & Extension Guidelines

When updating this repository, follow these best practices:
1. **Maintain Pure Node.js Standard**: Avoid adding server frameworks (like Express or Fastify) unless explicitly asked. Continue using raw Node.js standard modules (`node:http`, `node:fs/promises`, etc.).
2. **Chart Generation**: When extending PDF report page charts, draw them using vector layout lines/rects/paths inside `score_analysis.mjs`. For the frontend, render them as pure SVGs returned in the markup rather than importing heavy client-side chart libraries.
3. **Structured Focus Preservation**: If adding form elements in `app.js`, ensure you register appropriate `dataset` selectors (e.g. `data-bind`, `data-section`, `data-field`) to enable caret focus preservation inside `render()`.
4. **Deterministic Analytics**: Keep all score analytics strictly mathematical and rule-based. Avoid piping student records to an LLM for summary generation to ensure privacy, zero cost, and reproducibility.
