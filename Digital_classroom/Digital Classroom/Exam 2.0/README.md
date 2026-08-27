# Edtechra AI Exam Engine

Standalone teacher-first AI examination module for generating, reviewing, approving, publishing, and grading exams.

## Run

```powershell
npm.cmd start
```

The server reads `PORT` and `OPENAI_API_KEY` from `.env`. The app is available at `http://127.0.0.1:<PORT>`.

## Implemented Surface

- Exam setup wizard with pasted content, TXT upload extraction, exam type, difficulty, duration, and grading mode.
- Question structure builder with supported question types, counts, marks, optional difficulty overrides, and live total validation.
- AI generation endpoint that sends only server-side requests to OpenAI and requires structured JSON.
- AI review panel with edit, delete, duplicate, regenerate, student preview, and mandatory approval state.
- Save and publish endpoints with approval enforcement.
- Publishing settings for classroom, schedule, late submissions, answer visibility, leaderboard, randomization, attempts, and password protection.
- Student exam preview with timer, progress, navigator, autosave-style entry, submit, and demo grading.
- Results and leaderboard screen.

## API Routes

- `GET /api/health`
- `POST /api/generate-exam`
- `POST /api/save-exam`
- `POST /api/publish-exam`
- `POST /api/grade-attempt`

## Security Notes

- The OpenAI API key is never sent to the browser.
- Generation requests are validated server-side.
- AI requests are rate limited in-memory.
- Publishing rejects unapproved exams.
- AI, save, publish, and grading actions are audit logged under `data/exam_audit_logs.jsonl`.
- Student preview does not render answer keys.

## Persistence Mapping

The current standalone implementation writes exam records to `data/<examId>.json`. It is structured to map cleanly into these future tables:

- `exams`
- `exam_sections`
- `exam_questions`
- `exam_answers`
- `exam_attempts`
- `student_answers`
- `exam_results`
- `leaderboards`
- `exam_settings`
- `exam_audit_logs`

## File Extraction

TXT extraction works locally in the browser. PDF and DOCX upload controls are present and isolated for server parser integration when dependencies such as `pdf-parse` and `mammoth` are added.
